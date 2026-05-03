"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { ChevronUp, Hourglass, Pause, Play, Timer, X } from 'lucide-react';
import {
  ensurePomodoroAudioReady,
  type PomodoroPhase,
  PHASE_LABELS,
  formatTime,
  usePomodoroState,
} from '@/lib/pomodoro';

type PomodoroFloatingWidgetProps = {
  onOpenPomodoro: () => void;
};

type WidgetPosition = {
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  clickAction: null | (() => void);
};

type PhaseTheme = {
  accent: string;
  accentSoft: string;
  border: string;
  glow: string;
  progress: string;
  surface: string;
};

const POSITION_KEY = 'recall_pomodoro_widget_position';
const COLLAPSED_KEY = 'recall_pomodoro_widget_collapsed';
const DEFAULT_OFFSET = 16;
const EDGE_REVEAL_WIDTH = 54;
const EDGE_DOCKED_WIDTH = 156;
const EDGE_PROGRESS_TRACK_HEIGHT = 42;
const DRAG_THRESHOLD = 6;

const PHASE_THEMES: Record<PomodoroPhase, PhaseTheme> = {
  focus: {
    accent: '#F87171',
    accentSoft: 'rgba(248,113,113,0.78)',
    border: 'rgba(248,113,113,0.24)',
    glow: 'rgba(248,113,113,0.16)',
    progress: 'linear-gradient(180deg, rgba(252,165,165,0.96), rgba(239,68,68,0.82))',
    surface: 'rgba(34,18,20,0.9)',
  },
  shortBreak: {
    accent: '#55D99A',
    accentSoft: 'rgba(85,217,154,0.76)',
    border: 'rgba(85,217,154,0.22)',
    glow: 'rgba(16,185,129,0.14)',
    progress: 'linear-gradient(180deg, rgba(134,239,172,0.96), rgba(16,185,129,0.82))',
    surface: 'rgba(13,27,23,0.9)',
  },
  longBreak: {
    accent: '#F6C35B',
    accentSoft: 'rgba(246,195,91,0.78)',
    border: 'rgba(246,195,91,0.22)',
    glow: 'rgba(245,158,11,0.16)',
    progress: 'linear-gradient(180deg, rgba(253,224,71,0.98), rgba(245,158,11,0.84))',
    surface: 'rgba(35,24,10,0.9)',
  },
};

const FLASH_THEME: PhaseTheme = {
  accent: '#F5C64E',
  accentSoft: 'rgba(245,198,78,0.72)',
  border: 'rgba(251,191,36,0.24)',
  glow: 'rgba(251,191,36,0.14)',
  progress: 'linear-gradient(180deg, rgba(253,230,138,1), rgba(245,158,11,0.88))',
  surface: 'rgba(42,34,18,0.94)',
};

const readStoredPosition = (): WidgetPosition | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WidgetPosition;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const clampPosition = (position: WidgetPosition, width: number, height: number) => {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(DEFAULT_OFFSET, window.innerWidth - width - DEFAULT_OFFSET);
  const maxY = Math.max(DEFAULT_OFFSET, window.innerHeight - height - DEFAULT_OFFSET);
  return {
    x: Math.min(Math.max(DEFAULT_OFFSET, position.x), maxX),
    y: Math.min(Math.max(DEFAULT_OFFSET, position.y), maxY),
  };
};

const getDockedX = (x: number, width: number) => {
  if (typeof window === 'undefined') return x;
  const leftDistance = x;
  const rightDistance = window.innerWidth - (x + width);
  return leftDistance <= rightDistance
    ? DEFAULT_OFFSET
    : Math.max(DEFAULT_OFFSET, window.innerWidth - width - DEFAULT_OFFSET);
};

const getSurfaceTitle = (phaseLabel: string) => `点击回到番茄时钟，拖动可移动悬浮窗。当前阶段：${phaseLabel}`;

export default function PomodoroFloatingWidget({ onOpenPomodoro }: PomodoroFloatingWidgetProps) {
  const { isReady, state, toggleRunning, reset } = usePomodoroState();
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<null | WidgetPosition>(null);
  const [widgetWidth, setWidgetWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [isEdgeDocked, setIsEdgeDocked] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    clickAction: null,
  });
  const previousRemainingRef = useRef<number | null>(null);
  const previousPhaseRef = useRef<null | PomodoroPhase>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedCollapsed = window.localStorage.getItem(COLLAPSED_KEY);
    setCollapsed(storedCollapsed === '1');
    const storedPosition = readStoredPosition();
    setPosition(
      storedPosition ?? {
        x: window.innerWidth - 320 - DEFAULT_OFFSET,
        y: window.innerHeight - 120 - DEFAULT_OFFSET,
      },
    );
  }, []);

  useEffect(() => {
    if (state?.hasActiveSession) {
      setDismissed(false);
    }
  }, [state?.hasActiveSession]);

  useEffect(() => {
    if (typeof window === 'undefined' || !widgetRef.current || !state) return;
    const rect = widgetRef.current.getBoundingClientRect();
    setWidgetWidth(rect.width);
    const next = clampPosition(
      position ?? {
        x: window.innerWidth - rect.width - DEFAULT_OFFSET,
        y: window.innerHeight - rect.height - DEFAULT_OFFSET,
      },
      rect.width,
      rect.height,
    );

    const changed = !position || next.x !== position.x || next.y !== position.y;
    if (changed) setPosition(next);

    const handleResize = () => {
      if (!widgetRef.current) return;
      const currentRect = widgetRef.current.getBoundingClientRect();
      setWidgetWidth(currentRect.width);
      setPosition((prev) => {
        const fallback = prev ?? {
          x: window.innerWidth - currentRect.width - DEFAULT_OFFSET,
          y: window.innerHeight - currentRect.height - DEFAULT_OFFSET,
        };
        const clamped = clampPosition(fallback, currentRect.width, currentRect.height);
        return isEdgeDocked
          ? { ...clamped, x: getDockedX(clamped.x, currentRect.width) }
          : clamped;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, collapsed, state?.remaining, isEdgeDocked, state]);

  useEffect(() => {
    if (typeof window === 'undefined' || !position) return;
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    if (!state) return;
    const previousRemaining = previousRemainingRef.current;
    const previousPhase = previousPhaseRef.current;
    if (
      previousRemaining !== null &&
      previousRemaining > 0 &&
      previousPhase === 'focus' &&
      state.phase !== previousPhase &&
      !state.isRunning
    ) {
      setFlashActive(true);
      const timer = window.setTimeout(() => setFlashActive(false), 2200);
      previousRemainingRef.current = state.remaining;
      previousPhaseRef.current = state.phase;
      return () => window.clearTimeout(timer);
    }
    previousRemainingRef.current = state.remaining;
    previousPhaseRef.current = state.phase;
  }, [state]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!widgetRef.current) return;
      const rect = widgetRef.current.getBoundingClientRect();
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      if (!dragRef.current.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
        return;
      }

      dragRef.current.moved = true;
      const next = clampPosition(
        {
          x: dragRef.current.originX + deltaX,
          y: dragRef.current.originY + deltaY,
        },
        rect.width,
        rect.height,
      );
      setPosition(next);
      setIsEdgeDocked(false);
    };

    const stopDragging = () => {
      if (!dragRef.current.moved) {
        dragRef.current.clickAction?.();
        dragRef.current.clickAction = null;
        setIsDragging(false);
        return;
      }

      if (widgetRef.current && position) {
        const rect = widgetRef.current.getBoundingClientRect();
        setWidgetWidth(rect.width);
        const dockedX = getDockedX(position.x, rect.width);
        setPosition((prev) => (prev ? { ...prev, x: dockedX } : prev));
        setIsEdgeDocked(true);
      }

      dragRef.current.clickAction = null;
      setIsDragging(false);
    };

    const onMouseMove = (event: MouseEvent) => handleMove(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) handleMove(event.touches[0].clientX, event.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, position]);

  if (!isReady || !state || !state.hasActiveSession || dismissed || !position) return null;

  const phaseLabel = PHASE_LABELS[state.phase];
  const activeTheme = flashActive ? FLASH_THEME : PHASE_THEMES[state.phase];
  const isDockedLeft = typeof window !== 'undefined' ? position.x <= window.innerWidth / 2 : false;
  const isEdgePeekVisible = collapsed && isEdgeDocked;
  const isAnchoredToViewportEdge = typeof window !== 'undefined'
    ? position.x <= DEFAULT_OFFSET + 1 || position.x >= window.innerWidth - widgetWidth - DEFAULT_OFFSET - 1
    : false;
  const edgeProgressHeight = Math.max(8, Math.round((EDGE_PROGRESS_TRACK_HEIGHT * state.progress) / 100));

  const startDrag = (clientX: number, clientY: number, clickAction?: () => void) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
      clickAction: clickAction ?? null,
    };
    setIsDragging(true);
  };

  const bindInteractiveSurface = (clickAction?: () => void) => ({
    onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      startDrag(event.clientX, event.clientY, clickAction);
    },
    onTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();
      const touch = event.touches[0];
      if (touch) startDrag(touch.clientX, touch.clientY, clickAction);
    },
  });

  const handleSurfaceKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenPomodoro();
    }
  };

  const collapsedEdgeStyle = isEdgePeekVisible
    ? isDockedLeft
      ? { transform: `translateX(-${Math.max(0, widgetWidth - EDGE_REVEAL_WIDTH)}px)` }
      : { transform: `translateX(${Math.max(0, widgetWidth - EDGE_REVEAL_WIDTH)}px)` }
    : undefined;

  const renderEdgeProgressBar = () => (
    <div className="relative h-[42px] w-[4px] shrink-0 overflow-hidden rounded-full bg-white/10">
      <div
        className="absolute inset-x-0 bottom-0 rounded-full transition-all duration-300"
        style={{
          height: `${edgeProgressHeight}px`,
          background: activeTheme.progress,
          boxShadow: `0 0 6px ${activeTheme.glow}`,
        }}
      />
    </div>
  );

  return (
    <div
      ref={widgetRef}
      className={`fixed z-[65] select-none rounded-2xl border backdrop-blur-xl transition-[transform,opacity,box-shadow,border-color,background-color] duration-300 ${
        flashActive
          ? 'border-amber-300/45 bg-[rgba(42,34,18,0.94)] shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_10px_28px_rgba(0,0,0,0.20)]'
          : isEdgePeekVisible
            ? 'shadow-[0_12px_28px_rgba(0,0,0,0.22)] hover:translate-x-0'
            : 'border-[rgba(var(--theme-accent),0.22)] bg-[rgba(19,22,28,0.94)] shadow-[0_14px_30px_rgba(0,0,0,0.22)]'
      } ${
        isEdgePeekVisible
          ? 'w-[156px] overflow-hidden p-0'
          : collapsed
            ? 'w-auto p-2.5'
            : 'w-[min(88vw,320px)] p-3'
      }`}
      style={{
        left: position.x,
        top: position.y,
        ...(collapsedEdgeStyle ?? {}),
        ...(isEdgePeekVisible
          ? {
              borderColor: activeTheme.border,
              background: activeTheme.surface,
              boxShadow: `0 12px 24px rgba(0,0,0,0.20), 0 0 0 1px ${activeTheme.border}, 0 0 8px ${activeTheme.glow}`,
            }
          : null),
      }}
      onMouseEnter={() => {
        if (isEdgePeekVisible) setIsEdgeDocked(false);
      }}
      onMouseLeave={() => {
        if (collapsed && isAnchoredToViewportEdge) {
          setIsEdgeDocked(true);
        }
      }}
    >
      {isEdgePeekVisible ? (
        <div className={`flex ${isDockedLeft ? 'justify-end' : 'justify-start'}`}>
          <div
            {...bindInteractiveSurface(onOpenPomodoro)}
            className={`flex h-[72px] w-[54px] cursor-grab items-center gap-2 bg-[rgba(255,255,255,0.02)] px-2 active:cursor-grabbing ${
              isDockedLeft ? 'rounded-l-[18px] pl-2.5 pr-1.5' : 'rounded-r-[18px] pl-1.5 pr-2.5'
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={handleSurfaceKeyDown}
            aria-label="打开番茄时钟"
            title={getSurfaceTitle(phaseLabel)}
          >
            {!isDockedLeft && renderEdgeProgressBar()}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center">
              <Hourglass
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: activeTheme.accent, filter: `drop-shadow(0 0 3px ${activeTheme.glow})` }}
              />
              <div
                className="text-[10px] font-semibold tracking-[0.08em] text-[#F3F6FF]"
                style={{ textShadow: `0 0 4px ${activeTheme.glow}` }}
              >
                {formatTime(state.remaining)}
              </div>
            </div>
            {isDockedLeft && renderEdgeProgressBar()}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div
              {...bindInteractiveSurface(onOpenPomodoro)}
              className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
              role="button"
              tabIndex={0}
              onKeyDown={handleSurfaceKeyDown}
              aria-label="打开番茄时钟"
              title={getSurfaceTitle(phaseLabel)}
            >
              <div className="flex items-center gap-2 text-[11px] text-[#8FA1C8]">
                <Timer className="h-3.5 w-3.5" style={{ color: activeTheme.accent }} />
                {collapsed ? phaseLabel : '番茄时钟进行中'}
              </div>
              <div className={`${collapsed ? 'mt-0.5 text-sm' : 'mt-1 text-base'} font-semibold text-[#F3F6FF]`}>
                {formatTime(state.remaining)}
              </div>
              {!collapsed && (
                <div className="mt-0.5 text-xs text-[#7d8595]">
                  {phaseLabel} · 点击回到番茄时钟
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className="rounded-full border border-[var(--ui-border-soft)] p-1 text-[#8A94A7] hover:border-[#55607A] hover:text-white"
                title={collapsed ? '展开悬浮组件' : '收起成胶囊'}
                aria-label={collapsed ? '展开悬浮组件' : '收起成胶囊'}
              >
                <ChevronUp className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-full border border-[var(--ui-border-soft)] p-1 text-[#8A94A7] hover:border-[#55607A] hover:text-white"
                title="关闭悬浮组件"
                aria-label="关闭悬浮组件"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!collapsed && (
            <>
              <div
                {...bindInteractiveSurface(onOpenPomodoro)}
                className="mt-3 h-1.5 cursor-grab overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)] active:cursor-grabbing"
                role="button"
                tabIndex={0}
                onKeyDown={handleSurfaceKeyDown}
                aria-label="打开番茄时钟"
                title={getSurfaceTitle(phaseLabel)}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${state.progress}%`,
                    background: activeTheme.progress,
                    boxShadow: `0 0 6px ${activeTheme.glow}`,
                  }}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void ensurePomodoroAudioReady();
                    toggleRunning();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.12)] px-3 py-1.5 text-xs text-[#E7EEFF] hover:bg-[rgba(var(--theme-accent),0.18)]"
                >
                  {state.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {state.isRunning ? '暂停' : '继续'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setDismissed(true);
                  }}
                  className="rounded-full border border-[var(--ui-border-soft)] px-3 py-1.5 text-xs text-[#9AA3B5] hover:border-[#55607A] hover:text-white"
                >
                  重置
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

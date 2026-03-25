"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Timer, X, ChevronUp, GripHorizontal } from 'lucide-react';
import {
  PHASE_DURATIONS,
  PHASE_LABELS,
  POMODORO_STATE_EVENT,
  cycleOrder,
  formatTime,
  getResolvedPomodoroState,
  safelyReadPomodoroState,
  writePomodoroState,
} from '@/lib/pomodoro';

type PomodoroFloatingWidgetProps = {
  onOpenPomodoro: () => void;
};

type WidgetPosition = {
  x: number;
  y: number;
};

const POSITION_KEY = 'recall_pomodoro_widget_position';
const COLLAPSED_KEY = 'recall_pomodoro_widget_collapsed';
const DEFAULT_OFFSET = 16;
const EDGE_PEEK = 18;

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
  return leftDistance <= rightDistance ? DEFAULT_OFFSET : Math.max(DEFAULT_OFFSET, window.innerWidth - width - DEFAULT_OFFSET);
};

export default function PomodoroFloatingWidget({ onOpenPomodoro }: PomodoroFloatingWidgetProps) {
  const [tick, setTick] = useState(Date.now());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<WidgetPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEdgeDocked, setIsEdgeDocked] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
  const previousRemainingRef = useRef<number | null>(null);

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
    const sync = () => {
      setTick(Date.now());
      const base = safelyReadPomodoroState();
      const resolved = getResolvedPomodoroState(base, Date.now());
      if (resolved.hasActiveSession) {
        setDismissed(false);
      }
      if (
        resolved.phaseIndex !== base.phaseIndex ||
        resolved.remaining !== base.remaining ||
        resolved.isRunning !== base.isRunning
      ) {
        writePomodoroState({
          phaseIndex: resolved.phaseIndex,
          remaining: resolved.remaining,
          isRunning: resolved.isRunning,
          lastUpdated: Date.now(),
          sessionStartTime: resolved.sessionStartTime,
        });
      }
    };

    sync();
    const timer = window.setInterval(sync, 1000);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'recall_pomodoro_state') sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(POMODORO_STATE_EVENT, sync as EventListener);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(POMODORO_STATE_EVENT, sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
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
  }, [position, collapsed, tick, isEdgeDocked]);

  useEffect(() => {
    if (typeof window === 'undefined' || !position) return;
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const state = useMemo(() => {
    const base = safelyReadPomodoroState();
    return getResolvedPomodoroState(base, tick);
  }, [tick]);

  useEffect(() => {
    const previousRemaining = previousRemainingRef.current;
    if (previousRemaining !== null && previousRemaining > 0 && state.remaining === 0) {
      setFlashActive(true);
      const timer = window.setTimeout(() => setFlashActive(false), 2200);
      return () => window.clearTimeout(timer);
    }
    previousRemainingRef.current = state.remaining;
  }, [state.remaining]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!widgetRef.current) return;
      const rect = widgetRef.current.getBoundingClientRect();
      const next = clampPosition(
        {
          x: dragRef.current.originX + (clientX - dragRef.current.startX),
          y: dragRef.current.originY + (clientY - dragRef.current.startY),
        },
        rect.width,
        rect.height,
      );
      setPosition(next);
      setIsEdgeDocked(false);
    };

    const stopDragging = () => {
      if (widgetRef.current && position) {
        const rect = widgetRef.current.getBoundingClientRect();
        const dockedX = getDockedX(position.x, rect.width);
        setPosition((prev) => (prev ? { ...prev, x: dockedX } : prev));
        setIsEdgeDocked(true);
      }
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

  if (!state.hasActiveSession || dismissed || !position) return null;

  const toggleRunning = () => {
    const base = safelyReadPomodoroState();
    const resolved = getResolvedPomodoroState(base, Date.now());
    writePomodoroState({
      phaseIndex: resolved.phaseIndex,
      remaining: resolved.remaining,
      isRunning: !resolved.isRunning,
      lastUpdated: Date.now(),
      sessionStartTime:
        !resolved.isRunning && resolved.phase === 'focus'
          ? (resolved.sessionStartTime ?? Date.now())
          : resolved.sessionStartTime,
    });
    setTick(Date.now());
  };

  const resetTimer = () => {
    const phase = cycleOrder[state.phaseIndex] ?? 'focus';
    writePomodoroState({
      phaseIndex: state.phaseIndex,
      remaining: PHASE_DURATIONS[phase],
      isRunning: false,
      lastUpdated: Date.now(),
      sessionStartTime: null,
    });
    setTick(Date.now());
    setDismissed(true);
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: position.x,
      originY: position.y,
    };
    setIsDragging(true);
  };

  const collapsedEdgeStyle = collapsed && isEdgeDocked && widgetRef.current
    ? position.x <= window.innerWidth / 2
      ? { transform: `translateX(-${Math.max(0, widgetRef.current.getBoundingClientRect().width - EDGE_PEEK)}px)` }
      : { transform: `translateX(${Math.max(0, widgetRef.current.getBoundingClientRect().width - EDGE_PEEK)}px)` }
    : undefined;

  return (
    <div
      ref={widgetRef}
      className={`fixed z-[65] select-none rounded-2xl border backdrop-blur-xl transition-[transform,opacity,box-shadow,border-color,background-color] duration-300 ${
        flashActive
          ? 'border-amber-300/80 bg-[rgba(120,80,10,0.92)] shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_32px_rgba(251,191,36,0.35)]'
          : collapsed && isEdgeDocked
            ? 'border-[rgba(var(--theme-accent),0.18)] bg-[rgba(19,22,28,0.52)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] hover:bg-[rgba(19,22,28,0.82)] hover:border-[rgba(var(--theme-accent),0.28)] hover:translate-x-0'
            : 'border-[rgba(var(--theme-accent),0.26)] bg-[rgba(19,22,28,0.94)] shadow-[0_18px_40px_rgba(0,0,0,0.32)]'
      } ${collapsed ? 'w-auto p-2.5' : 'w-[min(88vw,320px)] p-3'}`}
      style={{ left: position.x, top: position.y, ...(collapsedEdgeStyle ?? {}) }}
      onMouseEnter={() => {
        if (collapsed && isEdgeDocked) setIsEdgeDocked(false);
      }}
      onMouseLeave={() => {
        if (collapsed) setIsEdgeDocked(true);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onMouseDown={(event) => {
            event.stopPropagation();
            startDrag(event.clientX, event.clientY);
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
            const touch = event.touches[0];
            if (touch) startDrag(touch.clientX, touch.clientY);
          }}
          className="shrink-0 rounded-full border border-[var(--ui-border-soft)] p-1.5 text-[#8A94A7] hover:text-white hover:border-[#55607A] cursor-grab active:cursor-grabbing"
          title="拖动悬浮组件"
        >
          <GripHorizontal className="w-3.5 h-3.5" />
        </button>

        <button type="button" onClick={onOpenPomodoro} className="min-w-0 text-left flex-1">
          <div className="flex items-center gap-2 text-[11px] text-[#8FA1C8]">
            <Timer className="w-3.5 h-3.5 text-blue-300" />
            {collapsed ? PHASE_LABELS[state.phase] : '番茄时钟进行中'}
          </div>
          <div className={`${collapsed ? 'mt-0.5 text-sm' : 'mt-1 text-base'} font-semibold text-[#F3F6FF]`}>{formatTime(state.remaining)}</div>
          {!collapsed && <div className="mt-0.5 text-xs text-[#7d8595]">{PHASE_LABELS[state.phase]} · 点击回到番茄时钟</div>}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-full border border-[var(--ui-border-soft)] p-1 text-[#8A94A7] hover:text-white hover:border-[#55607A]"
            title={collapsed ? '展开悬浮组件' : '收起成胶囊'}
          >
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full border border-[var(--ui-border-soft)] p-1 text-[#8A94A7] hover:text-white hover:border-[#55607A]"
            title="收起悬浮组件"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(92,123,250,0.9),rgba(110,231,255,0.85))] transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRunning}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.12)] px-3 py-1.5 text-xs text-[#E7EEFF] hover:bg-[rgba(var(--theme-accent),0.18)]"
            >
              {state.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {state.isRunning ? '暂停' : '继续'}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="rounded-full border border-[var(--ui-border-soft)] px-3 py-1.5 text-xs text-[#9AA3B5] hover:text-white hover:border-[#55607A]"
            >
              重置
            </button>
          </div>
        </>
      )}
    </div>
  );
}

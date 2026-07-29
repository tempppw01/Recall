import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Command,
  Flame,
  GripVertical,
  History,
  LayoutGrid,
  Package2,
  Settings,
  Smile,
  Timer,
  X,
} from 'lucide-react';
import { Countdown, Task } from '@/lib/store';
import SidebarItem from '@/app/components/sidebar/SidebarItem';

type SidebarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isToolsOpen: boolean;
  setIsToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilter: string;
  setActiveFilter: (value: string) => void;
  refreshTasks: () => void;
  refreshCountdowns: () => void;
  refreshHabits: () => void;
  tasks: Task[];
  agentItems: Array<{ id: string }>;
  hasCalendarTasks: boolean;
  countdowns: Countdown[];
  APP_VERSION: string;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  onOpenSettings: () => void;
};

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const COLLAPSED_WIDTH = 56;

type ToolItemKey =
  | 'todo'
  | 'calendar'
  | 'timeline'
  | 'review'
  | 'quadrant'
  | 'countdown'
  | 'habit'
  | 'items'
  | 'pomodoro';

type SidebarAction = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title?: string;
  active: boolean;
  iconColor?: string;
  accentRgb?: string;
  count?: number;
  badge?: number;
  onClick: () => void;
};

const sidebarAccentStyle = (accentRgb?: string) => ({
  '--sidebar-item-accent': accentRgb ?? 'var(--theme-accent)',
}) as React.CSSProperties;

const TOOL_ORDER_KEY = 'recall_sidebar_tool_order';
const DEFAULT_TOOL_ORDER: ToolItemKey[] = ['todo', 'calendar', 'timeline', 'review', 'quadrant', 'countdown', 'habit', 'items', 'pomodoro'];

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isToolsOpen,
  setIsToolsOpen,
  activeFilter,
  setActiveFilter,
  refreshTasks,
  refreshCountdowns,
  refreshHabits,
  tasks,
  agentItems,
  hasCalendarTasks,
  countdowns,
  APP_VERSION,
  sidebarWidth,
  setSidebarWidth,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  onOpenSettings,
}: SidebarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [toolOrder, setToolOrder] = useState<ToolItemKey[]>(DEFAULT_TOOL_ORDER);
  const [draggingToolKey, setDraggingToolKey] = useState<ToolItemKey | null>(null);
  const [hoveredRailIndex, setHoveredRailIndex] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isSmileMenuOpen, setIsSmileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const smileMenuRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setSidebarWidth]);

  useEffect(() => {
    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };
    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth);
    return () => window.removeEventListener('resize', syncViewportWidth);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(TOOL_ORDER_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ToolItemKey[];
      const valid = parsed.filter((key) => DEFAULT_TOOL_ORDER.includes(key));
      if (valid.length === DEFAULT_TOOL_ORDER.length) {
        setToolOrder(valid);
      }
    } catch (error) {
      console.error('Failed to read sidebar tool order', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOOL_ORDER_KEY, JSON.stringify(toolOrder));
  }, [toolOrder]);

  useEffect(() => {
    if (!isSmileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (smileMenuRef.current && target && !smileMenuRef.current.contains(target)) {
        setIsSmileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSmileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSmileMenuOpen]);

  const handleToolDrop = useCallback((targetKey: ToolItemKey) => {
    if (!draggingToolKey || draggingToolKey === targetKey) return;
    setToolOrder((previous) => {
      const from = previous.indexOf(draggingToolKey);
      const to = previous.indexOf(targetKey);
      if (from < 0 || to < 0) return previous;
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [draggingToolKey]);

  const isMobile = viewportWidth > 0 ? viewportWidth < 640 : true;
  const isRailLayout = viewportWidth >= 640 && viewportWidth < 1024;
  const isDesktopExpanded = viewportWidth >= 1024;

  useEffect(() => {
    setIsSmileMenuOpen(false);
  }, [isRailLayout, isDesktopExpanded, isSidebarOpen]);

  const changeFilter = useCallback((nextFilter: string, refresher?: () => void) => {
    setActiveFilter(nextFilter);
    refresher?.();
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, setActiveFilter, setIsSidebarOpen]);

  const activeTaskCount = useMemo(
    () => tasks.filter((task) => task.status !== 'completed').length,
    [tasks],
  );

  const handleOpenSettings = useCallback(() => {
    setIsSmileMenuOpen(false);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    onOpenSettings();
  }, [isMobile, onOpenSettings, setIsSidebarOpen]);

  const handleOpenStats = useCallback(() => {
    setIsSmileMenuOpen(false);
    changeFilter('stats');
  }, [changeFilter]);

  const toolConfig: Record<ToolItemKey, Omit<SidebarAction, 'key' | 'title' | 'badge'>> = {
    todo: {
      icon: CheckSquare,
      label: '待办',
      count: activeTaskCount,
      active: activeFilter === 'todo',
      onClick: () => changeFilter('todo', refreshTasks),
      iconColor: 'text-green-400',
      accentRgb: '34, 197, 94',
    },
    calendar: {
      icon: Calendar,
      label: '日历',
      count: hasCalendarTasks ? 1 : 0,
      active: activeFilter === 'calendar',
      onClick: () => changeFilter('calendar', refreshTasks),
      iconColor: 'text-cyan-400',
      accentRgb: '6, 182, 212',
    },
    timeline: {
      icon: History,
      label: '时间轴',
      count: 0,
      active: activeFilter === 'timeline',
      onClick: () => changeFilter('timeline', refreshTasks),
      iconColor: 'text-violet-400',
      accentRgb: '139, 92, 246',
    },
    review: {
      icon: ClipboardCheck,
      label: '检查',
      count: activeTaskCount,
      active: activeFilter === 'review',
      onClick: () => changeFilter('review', refreshTasks),
      iconColor: 'text-sky-400',
      accentRgb: '14, 165, 233',
    },
    quadrant: {
      icon: LayoutGrid,
      label: '四象限',
      count: 0,
      active: activeFilter === 'quadrant',
      onClick: () => changeFilter('quadrant', refreshTasks),
      iconColor: 'text-indigo-400',
      accentRgb: '99, 102, 241',
    },
    countdown: {
      icon: Timer,
      label: '倒数日',
      count: countdowns.length,
      active: activeFilter === 'countdown',
      onClick: () => changeFilter('countdown', refreshCountdowns),
      iconColor: 'text-pink-400',
      accentRgb: '236, 72, 153',
    },
    habit: {
      icon: Flame,
      label: '习惯打卡',
      count: 0,
      active: activeFilter === 'habit',
      onClick: () => changeFilter('habit', refreshHabits),
      iconColor: 'text-orange-400',
      accentRgb: '249, 115, 22',
    },
    items: {
      icon: Package2,
      label: '物品管理',
      count: 0,
      active: activeFilter === 'items',
      onClick: () => changeFilter('items'),
      iconColor: 'text-teal-400',
      accentRgb: '20, 184, 166',
    },
    pomodoro: {
      icon: Timer,
      label: '番茄时钟',
      count: 0,
      active: activeFilter === 'pomodoro',
      onClick: () => changeFilter('pomodoro', refreshTasks),
      iconColor: 'text-red-400',
      accentRgb: '248, 113, 113',
    },
  };

  const collapsedRailItems: SidebarAction[] = [
    {
      key: 'agent',
      icon: Command,
      label: 'AI 助手',
      title: 'AI 助手',
      active: activeFilter === 'agent' || activeFilter === 'chat',
      count: agentItems.length,
      iconColor: 'text-blue-400',
      accentRgb: '96, 165, 250',
      onClick: () => changeFilter('agent'),
    },
    ...toolOrder.map((key) => ({
      key,
      title: toolConfig[key].label,
      ...toolConfig[key],
    })),
  ];

const toolGroups: Array<{ title: string; keys: ToolItemKey[] }> = [
    {
      title: '执行',
      keys: ['todo', 'calendar', 'timeline', 'review', 'quadrant'],
    },
    {
      title: '节律',
      keys: ['countdown', 'habit', 'pomodoro'],
    },
    {
      title: '物品',
      keys: ['items'],
    },
  ];

  const resolvedSidebarWidth = isRailLayout ? COLLAPSED_WIDTH : isDesktopExpanded ? sidebarWidth : undefined;
  const toolGridColumnsClass = isDesktopExpanded && sidebarWidth >= 340 ? 'grid-cols-3' : 'grid-cols-2';
  const renderSmileMenu = (placement: 'rail' | 'sidebar') => {
    const isRail = placement === 'rail';

    return (
      <div
        ref={smileMenuRef}
        className={`relative ${isRail ? 'flex justify-center' : 'inline-flex shrink-0 self-start'}`}
      >
        <button
          type="button"
          onClick={() => setIsSmileMenuOpen((previous) => !previous)}
          aria-haspopup="menu"
          aria-expanded={isSmileMenuOpen}
          title="打开 Recall 工作台"
          aria-label="打开 Recall 工作台"
          className={`group relative inline-flex items-center justify-center overflow-hidden border text-[color:var(--ui-text-strong)] shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-all duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-[rgba(var(--theme-accent),0.34)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] ${
            isRail
              ? 'h-10 w-10 rounded-2xl border-[rgba(var(--theme-accent),0.18)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.18),rgba(var(--theme-grad-end),0.1))]'
              : 'h-11 w-11 rounded-[20px] border-[rgba(var(--theme-accent),0.2)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.16),rgba(var(--theme-grad-end),0.08))]'
          }`}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.24),transparent_68%)] opacity-80" />
          <Smile className={`${isRail ? 'h-[18px] w-[18px]' : 'h-5 w-5'} relative z-10 transition-transform duration-[var(--motion-base)] group-hover:scale-110`} />
        </button>

        {isSmileMenuOpen ? (
          <div
            role="menu"
            className={`absolute z-50 ${
              isRail
                ? 'left-full top-1/2 ml-2.5 w-56 -translate-y-1/2'
                : 'left-0 top-full mt-2.5 w-[min(78vw,248px)]'
            }`}
          >
            <div className="overflow-hidden rounded-[20px] border border-[color:var(--ui-border-strong)] bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(15,23,42,0.9))] p-2 text-[color:var(--ui-text-primary)] shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] text-[color:var(--ui-text-strong)]">
                  <Smile className="h-4 w-4" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">Recall</p>
                <span className="shrink-0 text-[10px] text-[color:var(--ui-text-muted)]">v{APP_VERSION}</span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  role="menuitem"
                  className="group/menu-item flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left transition-all hover:bg-white/[0.06]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(var(--theme-accent),0.12)] text-[color:rgb(var(--theme-accent))]">
                    <Settings className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">设置</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-faint)] transition-transform duration-[var(--motion-base)] group-hover/menu-item:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={handleOpenStats}
                  role="menuitem"
                  className={`group/menu-item flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left transition-all ${
                    activeFilter === 'stats'
                      ? 'bg-[rgba(var(--theme-accent),0.12)]'
                      : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-sky-400/10 text-sky-200">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">统计</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-faint)] transition-transform duration-[var(--motion-base)] group-hover/menu-item:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
  const getRailDockMetrics = useCallback((index: number, active: boolean) => {
    const baseScale = active ? 1.06 : 0.9;
    const baseIconScale = active ? 1.08 : 0.94;
    const baseTranslateX = active ? 2 : 0;
    const baseOpacity = active ? 1 : 0.82;

    if (hoveredRailIndex === null) {
      return {
        scale: baseScale,
        iconScale: baseIconScale,
        translateX: baseTranslateX,
        opacity: baseOpacity,
      };
    }

    const distance = Math.abs(hoveredRailIndex - index);

    if (distance === 0) {
      return {
        scale: Math.max(baseScale, 1.18),
        iconScale: Math.max(baseIconScale, 1.14),
        translateX: 4,
        opacity: 1,
      };
    }

    if (distance === 1) {
      return {
        scale: Math.max(baseScale, 1.04),
        iconScale: Math.max(baseIconScale, 1.05),
        translateX: 2,
        opacity: active ? 1 : 0.96,
      };
    }

    if (distance === 2) {
      return {
        scale: Math.max(baseScale, 0.97),
        iconScale: Math.max(baseIconScale, 0.99),
        translateX: 1,
        opacity: active ? 0.98 : 0.88,
      };
    }

    return {
      scale: baseScale,
      iconScale: baseIconScale,
      translateX: baseTranslateX,
      opacity: baseOpacity,
    };
  }, [hoveredRailIndex]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`
          recall-sidebar theme-native-surface sidebar-shell fixed inset-y-0 left-0 z-40 flex flex-col overflow-visible
          border-r border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-1)] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.18)]
          ${isSidebarOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}
          sm:relative sm:translate-x-0 sm:opacity-100 sm:pointer-events-auto sm:shadow-none
        `}
        style={{
          width: resolvedSidebarWidth ? `${resolvedSidebarWidth}px` : '74vw',
          maxWidth: resolvedSidebarWidth ? `${resolvedSidebarWidth}px` : '280px',
          transition: isDragging ? 'none' : 'width var(--motion-base) var(--ease-standard), transform var(--motion-slow) var(--ease-emphasis)',
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[rgba(var(--theme-accent),0.26)] to-transparent opacity-45" />
        <div className="pointer-events-none absolute -left-16 top-14 h-44 w-44 rounded-full bg-[rgba(var(--theme-accent),0.045)] blur-3xl" />
        {isRailLayout ? (
          <div className="relative z-10 hidden h-full flex-col sm:flex">
            <div className="border-b border-[color:var(--ui-border-soft)] px-2 py-3">
              {renderSmileMenu('rail')}
            </div>
            <div className="hidden border-b border-[color:var(--ui-border-soft)] px-2 py-2.5">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-secondary)] transition-colors hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
                title="展开侧边栏"
                aria-label="展开侧边栏"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <nav
              className="flex-1 space-y-1 overflow-y-auto py-3"
              onMouseLeave={() => setHoveredRailIndex(null)}
            >
              {collapsedRailItems.map((item, index) => {
                const Icon = item.icon;
                const dock = getRailDockMetrics(index, item.active);
                const isHovered = hoveredRailIndex === index;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredRailIndex(index)}
                    onFocus={() => setHoveredRailIndex(index)}
                    onBlur={() => setHoveredRailIndex(null)}
                    aria-current={item.active ? 'page' : undefined}
                    className="group/rail relative mx-1.5 flex h-[54px] w-[calc(100%-0.75rem)] items-center justify-center rounded-[18px] transition-[transform,opacity] duration-[var(--motion-base)]"
                    style={{
                      ...sidebarAccentStyle(item.accentRgb),
                      opacity: dock.opacity,
                    }}
                    title={item.title ?? item.label}
                    aria-label={item.title ?? item.label}
                  >
                    {item.active ? (
                      <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[rgba(var(--sidebar-item-accent),0.82)] shadow-[0_0_18px_rgba(var(--sidebar-item-accent),0.35)]" />
                    ) : null}
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center rounded-[16px] border will-change-transform transition-[transform,border-color,background-color,box-shadow] duration-[var(--motion-slow)] ${
                        item.active
                          ? 'border-[rgba(var(--sidebar-item-accent),0.34)] bg-[linear-gradient(180deg,rgba(var(--sidebar-item-accent),0.18),rgba(var(--sidebar-item-accent),0.08))] shadow-[0_16px_28px_rgba(0,0,0,0.18)]'
                          : isHovered
                            ? 'border-[rgba(var(--sidebar-item-accent),0.24)] bg-[rgba(255,255,255,0.06)] shadow-[0_14px_26px_rgba(0,0,0,0.16)]'
                            : 'border-[color:var(--ui-border-soft)]/65 bg-[color:var(--ui-card-bg)]/68 shadow-[0_10px_18px_rgba(0,0,0,0.10)]'
                      }`}
                      style={{
                        transform: `translate3d(${dock.translateX}px, 0, 0) scale(${dock.scale})`,
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 rounded-[16px] bg-[radial-gradient(circle_at_50%_18%,rgba(var(--sidebar-item-accent),0.18),transparent_70%)] opacity-0 transition-opacity duration-[var(--motion-base)]"
                        style={{ opacity: item.active || isHovered ? 1 : 0 }}
                      />
                      <span
                        className="relative inline-flex items-center justify-center transition-transform duration-[var(--motion-base)]"
                        style={{ transform: `scale(${dock.iconScale})` }}
                      >
                        <Icon
                          className={`h-5 w-5 transition-colors duration-[var(--motion-base)] ${
                            item.active
                              ? item.iconColor ?? 'text-[color:var(--ui-text-strong)]'
                              : isHovered
                                ? item.iconColor ?? 'text-[color:var(--ui-text-strong)]'
                                : 'text-[color:var(--ui-text-faint)]'
                          }`}
                        />
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

          </div>
        ) : (
          <>
            <div className="mobile-scroll safe-scroll-with-footer relative z-10 [--footer-safe-height:0.75rem] flex-1 overflow-y-auto overscroll-contain">
              <div className="mb-1.5 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      {renderSmileMenu('sidebar')}
                      <div className="min-w-0 pt-1">
                        <div className="inline-flex max-w-full items-start gap-1.5">
                          <h1 className="truncate text-[20px] font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)]">
                            Recall
                          </h1>
                          <span className="mt-0.5 shrink-0 rounded-full border border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.1)] px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-[0.02em] text-[color:var(--ui-text-muted)]">
                            v{APP_VERSION}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-secondary)] shadow-[0_8px_20px_rgba(0,0,0,0.14)] transition-all hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] active:scale-95 sm:hidden"
                      title="关闭菜单"
                      aria-label="关闭菜单"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="hidden"
                      title="折叠侧边栏"
                      aria-label="折叠侧边栏"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <nav className="sidebar-nav space-y-1.5 px-2.5 pb-4">
                <div className="sidebar-section rounded-[18px] p-1">
                  <SidebarItem
                    icon={Command}
                    label="AI 助手"
                    count={agentItems.length}
                    active={activeFilter === 'agent' || activeFilter === 'chat'}
                    onClick={() => changeFilter('agent')}
                    accentRgb="96, 165, 250"
                  />
                </div>

                <div className="sidebar-section rounded-[18px] p-1">
                  <button
                    type="button"
                    onClick={() => setIsToolsOpen((previous) => !previous)}
                    className="sidebar-section-toggle flex w-full items-center justify-between rounded-[14px] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-secondary)]"
                    aria-expanded={isToolsOpen}
                    aria-label="切换功能导航"
                  >
                    <span>功能导航</span>
                    {isToolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {isToolsOpen && (
                    <div className="space-y-1 px-1 pb-1">
                      {toolGroups.map((group) => {
                        const groupKeys = toolOrder.filter((key) => group.keys.includes(key));
                        if (groupKeys.length === 0) return null;

                        return (
                          <div key={group.title} className="rounded-[16px] px-0.5 py-1">
                            <div className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ui-text-faint)]">
                              {group.title}
                            </div>
                            <div className={`grid ${toolGridColumnsClass} gap-1`}>
                              {groupKeys.map((key) => {
                                const item = toolConfig[key];
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={key}
                                    onClick={item.onClick}
                                    style={sidebarAccentStyle(item.accentRgb)}
                                    className={`group/sidebar-tool sidebar-nav-item relative flex min-h-[40px] w-full items-center gap-1.5 overflow-hidden rounded-[17px] border px-1.5 py-1.5 text-left transition-all ${
                                      item.active
                                        ? 'is-active border-[rgba(var(--sidebar-item-accent),0.28)] bg-[rgba(var(--sidebar-item-accent),0.12)] text-[color:var(--ui-text-strong)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]'
                                        : 'border-transparent bg-transparent text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                                    } ${draggingToolKey === key ? 'opacity-60' : ''}`}
                                    title={item.label}
                                    aria-label={item.label}
                                    draggable={isDesktopExpanded}
                                    onDragStart={isDesktopExpanded ? () => setDraggingToolKey(key) : undefined}
                                    onDragOver={isDesktopExpanded ? (event) => event.preventDefault() : undefined}
                                    onDrop={isDesktopExpanded ? () => handleToolDrop(key) : undefined}
                                    onDragEnd={isDesktopExpanded ? () => setDraggingToolKey(null) : undefined}
                                  >
                                    <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-all ${
                                      item.active
                                        ? 'border-[rgba(var(--sidebar-item-accent),0.28)] bg-[rgba(var(--sidebar-item-accent),0.12)]'
                                        : 'border-[color:var(--ui-border-soft)]/70 bg-[color:var(--ui-card-bg)]/60 group-hover/sidebar-tool:border-[color:var(--ui-border-strong)] group-hover/sidebar-tool:bg-[color:var(--ui-card-hover-bg)]'
                                    }`}>
                                      <Icon
                                        className={`h-3.5 w-3.5 transition-colors ${
                                          item.active
                                            ? item.iconColor ?? 'text-[color:var(--ui-text-strong)]'
                                            : 'text-[color:var(--ui-text-faint)] group-hover/sidebar-tool:text-[color:var(--ui-text-secondary)]'
                                        }`}
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className={`truncate text-[12px] font-semibold leading-tight ${
                                        item.active ? 'text-[color:var(--ui-text-strong)]' : 'text-[color:var(--ui-text-primary)]'
                                      }`}>
                                        {item.label}
                                      </div>
                                    </div>

                                    {item.count ? (
                                      <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                                        item.active ? 'bg-[rgba(var(--sidebar-item-accent),0.12)] text-[color:var(--ui-text-secondary)]' : 'bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-muted)]'
                                      }`}>
                                        {item.count > 99 ? '99+' : item.count}
                                      </span>
                                    ) : null}
                                    {isDesktopExpanded ? <GripVertical className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-[color:var(--ui-text-faint)] opacity-0 transition-opacity group-hover/sidebar-tool:opacity-100" /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </div>

          </>
        )}

        {isDesktopExpanded && (
          <div
            className="group absolute right-0 top-0 hidden h-full w-1 cursor-col-resize lg:flex"
            onMouseDown={handleMouseDown}
          >
            <div className={`h-full w-full transition-colors ${isDragging ? 'bg-[rgb(var(--theme-accent))]' : 'bg-transparent group-hover:bg-white/10'}`} />
            <div className={`absolute right-0 top-1/2 flex h-8 w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded bg-[color:var(--ui-surface-2)] transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <GripVertical className="h-3 w-3 text-[color:var(--ui-text-faint)]" />
            </div>
          </div>
        )}
      </aside>

      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </>
  );
};

export default Sidebar;

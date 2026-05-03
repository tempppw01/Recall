import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
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
  Inbox,
  LayoutGrid,
  Package2,
  Sun,
  Timer,
} from 'lucide-react';
import { Countdown, Task } from '@/lib/store';
import SidebarItem from '@/app/components/sidebar/SidebarItem';

type SidebarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isQuickAccessOpen: boolean;
  setIsQuickAccessOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  DEFAULT_TIMEZONE_OFFSET: number;
  formatDateKeyByOffset: (date: Date, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  getTimezoneOffset: (task: Task) => number;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
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
  | 'pomodoro'
  | 'completed';

type SidebarAction = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title?: string;
  active: boolean;
  iconColor?: string;
  count?: number;
  badge?: number;
  onClick: () => void;
};

const TOOL_ORDER_KEY = 'recall_sidebar_tool_order';
const DEFAULT_TOOL_ORDER: ToolItemKey[] = ['todo', 'calendar', 'timeline', 'review', 'quadrant', 'countdown', 'habit', 'items', 'pomodoro', 'completed'];

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isQuickAccessOpen,
  setIsQuickAccessOpen,
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
  DEFAULT_TIMEZONE_OFFSET,
  formatDateKeyByOffset,
  formatZonedDate,
  getTimezoneOffset,
  sidebarWidth,
  setSidebarWidth,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: SidebarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [toolOrder, setToolOrder] = useState<ToolItemKey[]>(DEFAULT_TOOL_ORDER);
  const [draggingToolKey, setDraggingToolKey] = useState<ToolItemKey | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

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
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
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

  const changeFilter = useCallback((nextFilter: string, refresher?: () => void) => {
    setActiveFilter(nextFilter);
    refresher?.();
    setIsSidebarOpen(false);
  }, [setActiveFilter, setIsSidebarOpen]);

  const activeTaskCount = useMemo(
    () => tasks.filter((task) => task.status !== 'completed').length,
    [tasks],
  );

  const todayTaskCount = useMemo(() => {
    const todayKey = formatDateKeyByOffset(new Date(), DEFAULT_TIMEZONE_OFFSET);
    return tasks.filter((task) => {
      if (task.status === 'completed' || !task.dueDate) return false;
      return formatZonedDate(task.dueDate, getTimezoneOffset(task)) === todayKey;
    }).length;
  }, [DEFAULT_TIMEZONE_OFFSET, formatDateKeyByOffset, formatZonedDate, getTimezoneOffset, tasks]);

  const next7TaskCount = useMemo(() => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks.filter((task) => {
      if (task.status === 'completed' || !task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= now && taskDate <= next7Days;
    }).length;
  }, [tasks]);

  const toolConfig: Record<ToolItemKey, Omit<SidebarAction, 'key' | 'title' | 'badge'>> = {
    todo: {
      icon: CheckSquare,
      label: '待办',
      count: activeTaskCount,
      active: activeFilter === 'todo',
      onClick: () => changeFilter('todo', refreshTasks),
      iconColor: 'text-green-400',
    },
    calendar: {
      icon: Calendar,
      label: '日历',
      count: hasCalendarTasks ? 1 : 0,
      active: activeFilter === 'calendar',
      onClick: () => changeFilter('calendar', refreshTasks),
      iconColor: 'text-cyan-400',
    },
    timeline: {
      icon: History,
      label: '时间轴',
      count: 0,
      active: activeFilter === 'timeline',
      onClick: () => changeFilter('timeline', refreshTasks),
      iconColor: 'text-violet-400',
    },
    review: {
      icon: ClipboardCheck,
      label: '检查',
      count: activeTaskCount,
      active: activeFilter === 'review',
      onClick: () => changeFilter('review', refreshTasks),
      iconColor: 'text-sky-400',
    },
    quadrant: {
      icon: LayoutGrid,
      label: '四象限',
      count: 0,
      active: activeFilter === 'quadrant',
      onClick: () => changeFilter('quadrant', refreshTasks),
      iconColor: 'text-indigo-400',
    },
    countdown: {
      icon: Timer,
      label: '倒数日',
      count: countdowns.length,
      active: activeFilter === 'countdown',
      onClick: () => changeFilter('countdown', refreshCountdowns),
      iconColor: 'text-pink-400',
    },
    habit: {
      icon: Flame,
      label: '习惯打卡',
      count: 0,
      active: activeFilter === 'habit',
      onClick: () => changeFilter('habit', refreshHabits),
      iconColor: 'text-orange-400',
    },
    items: {
      icon: Package2,
      label: '物品管理',
      count: 0,
      active: activeFilter === 'items',
      onClick: () => changeFilter('items'),
      iconColor: 'text-teal-400',
    },
    pomodoro: {
      icon: Timer,
      label: '番茄时钟',
      count: 0,
      active: activeFilter === 'pomodoro',
      onClick: () => changeFilter('pomodoro', refreshTasks),
      iconColor: 'text-red-400',
    },
    completed: {
      icon: CheckCircle2,
      label: '已完成',
      count: 0,
      active: activeFilter === 'completed',
      onClick: () => changeFilter('completed'),
      iconColor: 'text-emerald-400',
    },
  };

  const quickAccessItems: SidebarAction[] = [
    {
      key: 'inbox',
      icon: Inbox,
      label: '收件箱',
      title: '收件箱',
      active: activeFilter === 'inbox',
      iconColor: 'text-blue-400',
      badge: activeTaskCount,
      onClick: () => changeFilter('inbox', refreshTasks),
    },
    {
      key: 'today',
      icon: Sun,
      label: '今日',
      title: '今日',
      active: activeFilter === 'today',
      iconColor: 'text-yellow-400',
      badge: todayTaskCount,
      onClick: () => changeFilter('today', refreshTasks),
    },
    {
      key: 'next7',
      icon: Calendar,
      label: '未来 7 天',
      title: '未来 7 天',
      active: activeFilter === 'next7',
      iconColor: 'text-purple-400',
      badge: next7TaskCount,
      onClick: () => changeFilter('next7', refreshTasks),
    },
  ];

  const collapsedRailItems: SidebarAction[] = [
    {
      key: 'agent',
      icon: Command,
      label: 'AI 助手',
      title: 'AI 助手',
      active: activeFilter === 'agent',
      count: agentItems.length,
      iconColor: 'text-blue-400',
      onClick: () => changeFilter('agent'),
    },
    ...quickAccessItems,
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
    {
      title: '归档',
      keys: ['completed'],
    },
  ];

  const pcWidth = isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;
  const toolGridColumnsClass = isDesktop && pcWidth >= 340 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`
          theme-native-surface sidebar-shell fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden
          border-r border-[color:var(--ui-border-soft)] bg-[var(--ui-surface-1)] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.18)]
          ${isSidebarOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}
          lg:relative lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto lg:shadow-none
        `}
        style={{
          width: isDesktop ? `${pcWidth}px` : '74vw',
          maxWidth: isDesktop ? `${pcWidth}px` : '280px',
          transition: isDragging ? 'none' : 'width var(--motion-base) var(--ease-standard), transform var(--motion-slow) var(--ease-emphasis)',
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[rgba(var(--theme-accent),0.52)] to-transparent opacity-70" />
        <div className="pointer-events-none absolute -left-16 top-14 h-44 w-44 rounded-full bg-[rgba(var(--theme-accent),0.12)] blur-3xl" />
        {isSidebarCollapsed ? (
          <div className="relative z-10 hidden h-full flex-col lg:flex">
            <div className="border-b border-[color:var(--ui-border-soft)] px-2 py-2.5">
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

            <nav className="flex-1 space-y-1.5 overflow-y-auto py-3">
              {collapsedRailItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    className={`mx-2 flex w-[calc(100%-1rem)] justify-center rounded-2xl border px-0 py-2.5 transition-all ${
                      item.active
                        ? 'border-[rgba(var(--theme-accent),0.3)] bg-[rgba(var(--theme-accent),0.14)] text-[color:var(--ui-text-strong)] shadow-[0_12px_30px_rgba(0,0,0,0.14)]'
                        : 'border-transparent bg-transparent text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                    }`}
                    title={item.title ?? item.label}
                    aria-label={item.title ?? item.label}
                  >
                    <Icon className={`h-5 w-5 ${item.iconColor ?? ''}`} />
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-[color:var(--ui-border-soft)] bg-[var(--ui-footer-bg)] px-2 py-2.5 text-center">
              <div className="text-[10px] text-[color:var(--ui-text-faint)]">v{APP_VERSION}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="mobile-scroll safe-scroll-with-footer relative z-10 [--footer-safe-height:0.75rem] flex-1 overflow-y-auto overscroll-contain">
              <div className="mb-1.5 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[20px] font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)]">
                      Recall
                    </h1>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="hidden h-8 w-8 items-center justify-center rounded-xl border border-transparent text-[color:var(--ui-text-muted)] transition-colors hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] lg:flex"
                      title="折叠侧边栏"
                      aria-label="折叠侧边栏"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <nav className="sidebar-nav space-y-2 px-2.5 pb-4">
                <div className="sidebar-section rounded-[24px] p-1.5">
                  <SidebarItem
                    icon={Command}
                    label="AI 助手"
                    count={agentItems.length}
                    active={activeFilter === 'agent'}
                    onClick={() => changeFilter('agent')}
                  />
                </div>

                <div className="sidebar-section rounded-[24px] p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsQuickAccessOpen((previous) => !previous)}
                    className="sidebar-section-toggle flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-secondary)]"
                    aria-expanded={isQuickAccessOpen}
                    aria-label="切换快捷入口"
                  >
                    <span>快捷入口</span>
                    {isQuickAccessOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {isQuickAccessOpen && (
                    <div className="space-y-1">
                      {quickAccessItems.map((item) => (
                        <SidebarItem
                          key={item.key}
                          icon={item.icon}
                          label={item.label}
                          active={item.active}
                          onClick={item.onClick}
                          iconColor={item.iconColor}
                          badge={item.badge}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="sidebar-section rounded-[26px] p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsToolsOpen((previous) => !previous)}
                    className="sidebar-section-toggle flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-secondary)]"
                    aria-expanded={isToolsOpen}
                    aria-label="切换功能导航"
                  >
                    <span>功能导航</span>
                    {isToolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {isToolsOpen && (
                    <div className="space-y-2 px-1 pb-1">
                      {toolGroups.map((group) => {
                        const groupKeys = toolOrder.filter((key) => group.keys.includes(key));
                        if (groupKeys.length === 0) return null;

                        return (
                          <div key={group.title} className="rounded-[20px] px-1 py-1.5">
                            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-text-faint)]">
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
                                    className={`group/sidebar-tool sidebar-nav-item relative flex min-h-[40px] w-full items-center gap-1.5 overflow-hidden rounded-[17px] border px-1.5 py-1.5 text-left transition-all ${
                                      item.active
                                        ? 'is-active border-[rgba(var(--theme-accent),0.26)] bg-[rgba(var(--theme-accent),0.13)] text-[color:var(--ui-text-strong)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]'
                                        : 'border-transparent bg-transparent text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                                    } ${draggingToolKey === key ? 'opacity-60' : ''}`}
                                    title={item.label}
                                    aria-label={item.label}
                                    draggable={isDesktop}
                                    onDragStart={isDesktop ? () => setDraggingToolKey(key) : undefined}
                                    onDragOver={isDesktop ? (event) => event.preventDefault() : undefined}
                                    onDrop={isDesktop ? () => handleToolDrop(key) : undefined}
                                    onDragEnd={isDesktop ? () => setDraggingToolKey(null) : undefined}
                                  >
                                    <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-all ${
                                      item.active
                                        ? 'border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)]'
                                        : 'border-[color:var(--ui-border-soft)]/70 bg-[color:var(--ui-card-bg)]/60 group-hover/sidebar-tool:border-[color:var(--ui-border-strong)] group-hover/sidebar-tool:bg-[color:var(--ui-card-hover-bg)]'
                                    }`}>
                                      <Icon className={`h-3.5 w-3.5 ${item.iconColor ?? ''}`} />
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
                                        item.active ? 'bg-[rgba(var(--theme-accent),0.12)] text-[color:var(--ui-text-secondary)]' : 'bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-muted)]'
                                      }`}>
                                        {item.count > 99 ? '99+' : item.count}
                                      </span>
                                    ) : null}
                                    {isDesktop ? <GripVertical className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-[color:var(--ui-text-faint)] opacity-0 transition-opacity group-hover/sidebar-tool:opacity-100" /> : null}
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

            <div className="relative z-10 shrink-0 border-t border-[color:var(--ui-border-soft)] bg-[var(--ui-footer-bg)] px-4 py-3">
              <div className="text-[10px] text-[color:var(--ui-text-faint)]">v{APP_VERSION}</div>
            </div>
          </>
        )}

        {!isSidebarCollapsed && (
          <div
            className="group absolute right-0 top-0 hidden h-full w-1 cursor-col-resize lg:flex"
            onMouseDown={handleMouseDown}
          >
            <div className={`h-full w-full transition-colors ${isDragging ? 'bg-blue-500' : 'bg-transparent group-hover:bg-white/10'}`} />
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

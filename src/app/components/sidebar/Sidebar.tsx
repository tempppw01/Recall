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
  Flag,
  GripVertical,
  History,
  Inbox,
  List,
  LayoutGrid,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Smile,
  Sun,
  Tag,
  Target,
  Timer,
  CheckCircle2,
  Bell,
  HelpCircle,
  X,
} from 'lucide-react';
import { Countdown, Task } from '@/lib/store';
import SidebarItem from '@/app/components/sidebar/SidebarItem';
import { isAssignedToMe } from '@/app/hooks/useTaskFilters';

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
  listItems?: string[];
  tagItems?: string[];
  activeCategory?: string | null;
  activeTag?: string | null;
  onSelectCategory?: (value: string | null) => void;
  onSelectTag?: (value: string | null) => void;
  onAddList?: () => void;
  onRenameList?: (value: string) => void;
  onDeleteList?: (value: string) => void;
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

const SecondaryNavItem = ({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
  onEdit,
  onDelete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <div className={`group/secondary flex items-center rounded-lg transition-colors ${active ? 'bg-[rgba(var(--theme-accent),0.12)]' : 'hover:bg-[color:var(--ui-card-hover-bg)]'}`}>
    <button type="button" onClick={onClick} className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] ${active ? 'text-[color:var(--ui-text-strong)]' : 'text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[rgb(var(--theme-accent))]' : 'text-[color:var(--ui-text-muted)]'}`} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 ? <span className="shrink-0 text-[10px] tabular-nums text-[color:var(--ui-text-muted)]">{count > 99 ? '99+' : count}</span> : null}
    </button>
    {onEdit ? <button type="button" onClick={onEdit} className="mr-1 hidden rounded p-1 text-[color:var(--ui-text-faint)] hover:text-[color:var(--ui-text-strong)] group-hover/secondary:block" aria-label={`重命名${label}`}>✎</button> : null}
    {onDelete ? <button type="button" onClick={onDelete} className="mr-1 hidden rounded p-1 text-[color:var(--ui-text-faint)] hover:text-rose-400 group-hover/secondary:block" aria-label={`删除${label}`}>×</button> : null}
  </div>
);

const TOOL_ORDER_KEY = 'recall_sidebar_tool_order';
const DEFAULT_TOOL_ORDER: ToolItemKey[] = ['todo', 'calendar', 'timeline', 'review', 'quadrant', 'countdown', 'habit', 'pomodoro'];

/** 滴答清单风格的导航行：纯文字 + 右侧计数，选中时为深灰圆角底。 */
const PlainNavItem = ({
  label,
  count,
  active = false,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-[7px] text-left text-[13px] transition-colors ${
      active
        ? 'bg-[color:var(--recall-selected-bg)] text-[color:var(--recall-text)]'
        : 'text-[color:var(--recall-text-secondary)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]'
    }`}
  >
    {icon ? <span className="shrink-0 text-[color:var(--recall-text-muted)]">{icon}</span> : null}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {typeof count === 'number' ? (
      <span className={`shrink-0 text-[12px] tabular-nums ${active ? 'text-[color:var(--recall-text-secondary)]' : 'text-[color:var(--recall-text-muted)]'}`}>
        {count > 99 ? '99+' : count}
      </span>
    ) : null}
  </button>
);

/** 清单分组标题，折叠时显示 `>` 前缀，展开时显示 `v`。 */
const ListGroupHeader = ({
  label,
  count,
  expanded,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <div className="group/list flex items-center gap-1 rounded-[6px] px-1.5 py-[6px] transition-colors hover:bg-[color:var(--recall-hover-bg)]">
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 text-[color:var(--recall-text-muted)] transition-colors hover:text-[color:var(--recall-text)]"
      aria-label={expanded ? `折叠清单 ${label}` : `展开清单 ${label}`}
      aria-expanded={expanded}
    >
      {expanded ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5" />
      )}
    </button>
    <button
      type="button"
      onClick={onSelect}
      className="min-w-0 flex-1 truncate text-left text-[13px] text-[color:var(--recall-text-secondary)] transition-colors hover:text-[color:var(--recall-text)]"
    >
      {label}
    </button>
    <span className="shrink-0 text-[12px] tabular-nums text-[color:var(--recall-text-muted)]">{count > 99 ? '99+' : count}</span>
    {onEdit ? (
      <button
        type="button"
        onClick={onEdit}
        className="hidden rounded p-0.5 text-[color:var(--recall-text-muted)] hover:text-[color:var(--recall-text)] group-hover/list:block"
        aria-label={`重命名${label}`}
      >
        <Pencil className="h-3 w-3" />
      </button>
    ) : null}
    {onDelete ? (
      <button
        type="button"
        onClick={onDelete}
        className="hidden rounded p-0.5 text-[color:var(--recall-text-muted)] hover:text-rose-400 group-hover/list:block"
        aria-label={`删除${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    ) : null}
  </div>
);

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
  listItems = [],
  tagItems = [],
  activeCategory = null,
  activeTag = null,
  onSelectCategory,
  onSelectTag,
  onAddList,
  onRenameList,
  onDeleteList,
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
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
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
  // TickTick keeps the primary icon dock and the list navigator together on
  // tablet widths. Collapsing to a single icon rail here made Recall lose
  // the task context at the exact viewport where the reference app remains usable.
  const isRailLayout = viewportWidth >= 640;
  const isDesktopExpanded = viewportWidth >= 1280;

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

  // 列表导航上的计数，对齐滴答清单的「今天 / 明天 / 最近 7 天 / 收集箱」语义。
  const navCounts = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfTomorrow = new Date(endOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const endOfNext7 = new Date(endOfToday);
    endOfNext7.setDate(endOfNext7.getDate() + 7);

    const pending = tasks.filter((task) => task.status !== 'completed' && task.status !== 'abandoned');
    const dueIn = (task: Task, from: number, to: number) => {
      if (!task.dueDate) return false;
      const time = new Date(task.dueDate).getTime();
      return Number.isFinite(time) && time >= from && time < to;
    };

    return {
      today: pending.filter((task) => dueIn(task, startOfToday.getTime(), endOfToday.getTime())).length,
      tomorrow: pending.filter((task) => dueIn(task, endOfToday.getTime(), endOfTomorrow.getTime())).length,
      next7: pending.filter((task) => dueIn(task, startOfToday.getTime(), endOfNext7.getTime())).length,
      inbox: pending.filter((task) => !task.category).length,
      assigned: pending.filter((task) => isAssignedToMe(task)).length,
      abandoned: tasks.filter((task) => task.status === 'abandoned').length,
    };
  }, [tasks]);
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

  // 图标栏顺序对齐滴答清单：清单、日历、四象限、习惯、倒数日、搜索、专注与 AI。
  const tickTickRailItems: SidebarAction[] = [
    {
      key: 'todo',
      icon: CheckSquare,
      label: '清单',
      title: '清单',
      active: activeFilter === 'todo' || activeFilter === 'inbox',
      onClick: () => changeFilter('todo', refreshTasks),
    },
    {
      key: 'calendar',
      icon: Calendar,
      label: '日历',
      title: '日历',
      active: activeFilter === 'calendar',
      onClick: () => changeFilter('calendar', refreshTasks),
    },
    {
      key: 'quadrant',
      icon: LayoutGrid,
      label: '四象限',
      title: '四象限',
      active: activeFilter === 'quadrant',
      onClick: () => changeFilter('quadrant', refreshTasks),
    },
    {
      key: 'habit',
      icon: Flame,
      label: '习惯',
      title: '习惯',
      active: activeFilter === 'habit',
      onClick: () => changeFilter('habit', refreshHabits),
    },
    {
      key: 'countdown',
      icon: Flag,
      label: '倒数日',
      title: '倒数日',
      active: activeFilter === 'countdown',
      onClick: () => changeFilter('countdown', refreshCountdowns),
    },
    {
      key: 'search',
      icon: Search,
      label: '搜索',
      title: '搜索',
      active: activeFilter === 'search',
      onClick: () => changeFilter('search'),
    },
    {
      key: 'pomodoro',
      icon: Target,
      label: '专注',
      title: '专注',
      active: activeFilter === 'pomodoro',
      onClick: () => changeFilter('pomodoro'),
    },
    {
      key: 'agent',
      icon: Sparkles,
      label: 'AI 助手',
      title: 'AI 助手',
      active: activeFilter === 'agent' || activeFilter === 'chat',
      onClick: () => changeFilter('agent'),
    },
  ];

  const collapsedRailItems: SidebarAction[] = tickTickRailItems;

const toolGroups: Array<{ title: string; keys: ToolItemKey[] }> = [
    {
      title: '执行',
      keys: ['todo', 'calendar', 'timeline', 'review', 'quadrant'],
    },
    {
      title: '节律',
      keys: ['countdown', 'habit', 'pomodoro'],
    },
  ];

  const resolvedSidebarWidth = isRailLayout ? 248 : isDesktopExpanded ? sidebarWidth : undefined;
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
          className={`sidebar-brand-button group relative inline-flex items-center justify-center overflow-hidden border text-[color:var(--ui-text-strong)] shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-all duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-[rgba(var(--theme-accent),0.34)] hover:shadow-[0_12px_24px_rgba(15,23,42,0.16)] ${
            isRail
              ? 'h-8 w-8 rounded-full border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,#3a3a3a,#2b2b2b)] shadow-none hover:translate-y-0'
              : 'h-11 w-11 rounded-[20px] border-[rgba(var(--theme-accent),0.2)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.16),rgba(var(--theme-grad-end),0.08))]'
          }`}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.24),transparent_68%)] opacity-80" />
          <Smile className={`${isRail ? 'h-4 w-4' : 'h-5 w-5'} relative z-10 transition-transform duration-[var(--motion-base)] group-hover:scale-110`} />
          {isRail ? (
            <span className="absolute -bottom-0.5 -right-0.5 z-20 h-2.5 w-2.5 rounded-full border-2 border-[#1a1a1a] bg-[#f5a623]" />
          ) : null}
        </button>

        {isSmileMenuOpen ? (
          <div
            role="menu"
            className={`absolute z-50 ${
              isRail
                ? 'left-full top-1/2 ml-2.5 w-56 -translate-y-1/2'
                : 'left-0 top-full mt-2.5 w-[min(78vw,216px)]'
            }`}
          >
            <div className="sidebar-brand-menu overflow-hidden rounded-[14px] border p-1.5 text-[color:var(--ui-text-primary)] shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="sidebar-brand-menu-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-[color:var(--ui-text-strong)]">
                  <Smile className="h-4 w-4" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">Recall</p>
                <span className="shrink-0 text-[10px] text-[color:var(--ui-text-muted)]">v{APP_VERSION}</span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  role="menuitem"
                  className="sidebar-brand-menu-item group/menu-item flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-all"
                >
                  <span className="sidebar-brand-menu-item-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[color:rgb(var(--theme-accent))]">
                    <Settings className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--ui-text-primary)]">设置</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-faint)] transition-transform duration-[var(--motion-base)] group-hover/menu-item:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={handleOpenStats}
                  role="menuitem"
                  className={`sidebar-brand-menu-item group/menu-item flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-all ${
                    activeFilter === 'stats'
                      ? 'bg-[rgba(var(--theme-accent),0.12)]'
                      : ''
                  }`}
                >
                  <span className="sidebar-brand-menu-item-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sky-500">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--ui-text-primary)]">统计</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-faint)] transition-transform duration-[var(--motion-base)] group-hover/menu-item:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
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
          <div className="relative z-10 hidden h-full flex-row sm:flex">
            <div className="recall-primary-rail flex w-[48px] shrink-0 flex-col items-center border-r border-[color:var(--recall-divider)] bg-[color:var(--recall-primary-rail-bg)]">
              <div className="flex w-full items-center justify-center pb-1 pt-3">
                {renderSmileMenu('rail')}
              </div>
              <nav
                className="recall-rail-nav flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-1 py-1.5"
                onMouseLeave={() => setHoveredRailIndex(null)}
              >
                {tickTickRailItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      onMouseEnter={() => setHoveredRailIndex(collapsedRailItems.indexOf(item))}
                      aria-current={item.active ? 'page' : undefined}
                      className={`recall-rail-item group/rail relative flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors duration-[var(--motion-fast)] ${
                        item.active
                          ? 'bg-[color:var(--recall-rail-selected-bg)] text-[color:var(--recall-rail-selected-text)]'
                          : 'text-[color:var(--recall-text-muted)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]'
                      }`}
                      title={item.title ?? item.label}
                      aria-label={item.title ?? item.label}
                    >
                      <Icon className="h-[19px] w-[19px]" />
                      <span className="sidebar-rail-tooltip pointer-events-none absolute left-full top-1/2 z-50 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="flex w-full flex-col items-center gap-0.5 pb-2 pt-1.5">
                <button
                  type="button"
                  onClick={refreshTasks}
                  className="group/rail relative flex h-9 w-9 items-center justify-center rounded-[8px] text-[color:var(--recall-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]"
                  title="刷新任务"
                  aria-label="刷新任务"
                >
                  <RefreshCw className="h-[18px] w-[18px]" />
                  <span className="sidebar-rail-tooltip pointer-events-none absolute left-full top-1/2 z-50 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg">刷新</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeFilter('today', refreshTasks)}
                  className="group/rail relative flex h-9 w-9 items-center justify-center rounded-[8px] text-[color:var(--recall-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]"
                  title="到期提醒"
                  aria-label="到期提醒"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="sidebar-rail-tooltip pointer-events-none absolute left-full top-1/2 z-50 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg">到期提醒</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSmileMenuOpen((previous) => !previous)}
                  className="group/rail relative flex h-9 w-9 items-center justify-center rounded-[8px] text-[color:var(--recall-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]"
                  title="帮助与设置"
                  aria-label="帮助与设置"
                >
                  <HelpCircle className="h-[18px] w-[18px]" />
                  <span className="sidebar-rail-tooltip pointer-events-none absolute left-full top-1/2 z-50 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg">帮助与设置</span>
                </button>
              </div>
            </div>

            <div className="recall-secondary-pane flex min-w-0 flex-1 flex-col overflow-hidden bg-[color:var(--ui-surface-1)]">
              <nav className="mobile-scroll flex-1 overflow-y-auto px-2 py-3" aria-label="任务清单">
                <div className="space-y-px">
                  <PlainNavItem
                    label="今天"
                    count={navCounts.today}
                    active={activeFilter === 'today'}
                    onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('today', refreshTasks); }}
                  />
                  <PlainNavItem
                    label="明天"
                    count={navCounts.tomorrow}
                    active={activeFilter === 'tomorrow'}
                    onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('tomorrow', refreshTasks); }}
                  />
                  <PlainNavItem
                    label="最近 7 天"
                    count={navCounts.next7}
                    active={activeFilter === 'next7'}
                    onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('next7', refreshTasks); }}
                  />
                  <PlainNavItem
                    label="指派给我"
                    active={activeFilter === 'assigned'}
                    onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('assigned', refreshTasks); }}
                  />
                  <PlainNavItem
                    label="收集箱"
                    count={navCounts.inbox}
                    active={activeFilter === 'inbox'}
                    onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('inbox', refreshTasks); }}
                  />
                </div>

                <div className="my-3 h-px bg-[color:var(--recall-divider)]" />

                <div className="flex items-center justify-between px-1.5 pb-1">
                  <span className="text-[12px] font-medium text-[color:var(--recall-text-muted)]">清单</span>
                  <button
                    type="button"
                    onClick={onAddList}
                    className="rounded p-0.5 text-[color:var(--recall-text-muted)] transition-colors hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]"
                    title="新建清单"
                    aria-label="新建清单"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-px">
                  {listItems.map((name) => (
                    <ListGroupHeader
                      key={name}
                      label={name}
                      count={tasks.filter((task) => task.status !== 'completed' && task.category === name).length}
                      expanded={expandedLists.has(name)}
                      onToggle={() => {
                        setExpandedLists((previous) => {
                          const next = new Set(previous);
                          if (next.has(name)) next.delete(name);
                          else next.add(name);
                          return next;
                        });
                      }}
                      onSelect={() => { onSelectCategory?.(name); onSelectTag?.(null); changeFilter('category', refreshTasks); }}
                      onEdit={onRenameList ? () => onRenameList(name) : undefined}
                      onDelete={onDeleteList ? () => onDeleteList(name) : undefined}
                    />
                  ))}
                  {listItems.length === 0 ? (
                    <p className="px-1.5 py-1.5 text-[12px] text-[color:var(--recall-text-muted)]">还没有清单，点击 + 新建</p>
                  ) : null}
                </div>

                <div className="my-3 h-px bg-[color:var(--recall-divider)]" />

                <div className="px-1.5 pb-1.5 text-[12px] font-medium text-[color:var(--recall-text-muted)]">过滤器</div>
                <div className="rounded-[6px] bg-[color:var(--recall-hover-bg)] px-2.5 py-2 text-[12px] leading-relaxed text-[color:var(--recall-text-muted)]">
                  使用优先级、标签等条件筛选任务
                </div>

                <div className="mt-3 px-1.5 pb-1.5 text-[12px] font-medium text-[color:var(--recall-text-muted)]">标签</div>
                <div className="rounded-[6px] bg-[color:var(--recall-hover-bg)] px-2.5 py-2 text-[12px] leading-relaxed text-[color:var(--recall-text-muted)]">
                  {tagItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tagItems.slice(0, 12).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => { onSelectTag?.(name); onSelectCategory?.(null); changeFilter('tag', refreshTasks); }}
                          className={`rounded-[4px] px-1.5 py-0.5 text-[11px] transition-colors ${
                            activeFilter === 'tag' && activeTag === name
                              ? 'bg-[color:var(--recall-selected-bg)] text-[color:var(--recall-text)]'
                              : 'text-[color:var(--recall-text-secondary)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)]'
                          }`}
                        >
                          #{name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    '为任务添加标签后会显示在这里'
                  )}
                </div>

                <div className="my-3 h-px bg-[color:var(--recall-divider)]" />

                <PlainNavItem
                  label="已放弃"
                  count={navCounts.abandoned}
                  active={activeFilter === 'abandoned'}
                  icon={<X className="h-3.5 w-3.5" />}
                  onClick={() => { onSelectCategory?.(null); onSelectTag?.(null); changeFilter('abandoned', refreshTasks); }}
                />
              </nav>
            </div>
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

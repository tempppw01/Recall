import React, { useMemo, useState } from 'react';
import type { Task } from '@/lib/store';

type TimelinePanelProps = {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onToggleTaskStatus: (taskId: string) => void;
  defaultTimezoneOffset: number;
  getTimezoneOffset: (task: Task) => number;
  formatZonedDateTime: (iso: string, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  isTaskOverdue: (task: Task) => boolean;
};

type TimelineStatusFilter = 'all' | 'completed' | 'todo' | 'overdue';

type TimelineStatus = 'completed' | 'overdue' | 'in_progress' | 'todo';

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateKeyByOffset = (date: Date, offsetMinutes: number) => {
  const zoned = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

const getAnchorIso = (task: Task) => task.dueDate || task.updatedAt || task.createdAt;

const getWeekStart = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const getMonthStart = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(1);
  return copy;
};

const buildRecentDayKeys = (days: number, offsetMinutes: number) => {
  const today = new Date();
  const todayKey = formatDateKeyByOffset(today, offsetMinutes);
  const [y, m, d] = todayKey.split('-').map((v) => parseInt(v, 10));
  const end = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  const result: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(formatDateKeyByOffset(day, offsetMinutes));
  }
  return result;
};

const getTopCategoryLabel = (tasks: Task[]) => {
  const counts = new Map<string, number>();
  tasks.forEach((task) => {
    const key = task.category?.trim() || '未分类';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  if (counts.size === 0) return '—';
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
};

const getTimelineStatus = (task: Task, isOverdue: boolean): TimelineStatus => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue) return 'overdue';
  if (task.status === 'in_progress') return 'in_progress';
  return 'todo';
};

const compareByFocus = (a: Task, b: Task) => {
  const aIso = getAnchorIso(a);
  const bIso = getAnchorIso(b);
  return new Date(aIso).getTime() - new Date(bIso).getTime();
};

const statusBadge: Record<TimelineStatus, {
  label: string;
  className: string;
  dotClassName: string;
  railClassName: string;
}> = {
  completed: {
    label: '完成',
    className: 'border-emerald-400/28 bg-emerald-500/12 text-emerald-200',
    dotClassName: 'bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.12)]',
    railClassName: 'from-emerald-400 via-teal-300 to-transparent',
  },
  overdue: {
    label: '逾期',
    className: 'border-rose-400/30 bg-rose-500/12 text-rose-200',
    dotClassName: 'bg-rose-400 shadow-[0_0_0_5px_rgba(251,113,133,0.12)]',
    railClassName: 'from-rose-400 via-orange-300 to-transparent',
  },
  in_progress: {
    label: '进行中',
    className: 'border-amber-400/30 bg-amber-500/12 text-amber-200',
    dotClassName: 'bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.12)]',
    railClassName: 'from-amber-400 via-yellow-300 to-transparent',
  },
  todo: {
    label: '待处理',
    className: 'border-sky-400/28 bg-sky-500/12 text-sky-200',
    dotClassName: 'bg-sky-400 shadow-[0_0_0_5px_rgba(56,189,248,0.12)]',
    railClassName: 'from-sky-400 via-cyan-300 to-transparent',
  },
};

const statusFilterOptions: Array<{ key: TimelineStatusFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待处理' },
  { key: 'overdue', label: '逾期' },
  { key: 'completed', label: '完成' },
];

const parseDateKeyAsUtc = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value));
  return Date.UTC(year, month - 1, day);
};

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return `${year} 年 ${month} 月`;
};

export default function TimelinePanel(props: TimelinePanelProps) {
  const {
    tasks,
    onSelectTask,
    onToggleTaskStatus,
    defaultTimezoneOffset,
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    isTaskOverdue,
  } = props;

  const [statusFilter, setStatusFilter] = useState<TimelineStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const todayKey = useMemo(
    () => formatDateKeyByOffset(new Date(), defaultTimezoneOffset),
    [defaultTimezoneOffset],
  );

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      if (task?.category) set.add(task.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [tasks]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      (task?.tags || []).forEach((tag) => {
        const text = String(tag || '').trim();
        if (text) set.add(text);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [tasks]);

  const scopedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task) return false;

      if (categoryFilter && (task.category || '') !== categoryFilter) {
        return false;
      }

      if (tagFilter) {
        const tags = (task.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean);
        if (!tags.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [tasks, categoryFilter, tagFilter]);

  const statusCounts = useMemo(() => {
    const overdue = scopedTasks.filter((task) => task.status !== 'completed' && Boolean(task.dueDate) && isTaskOverdue(task));
    return {
      all: scopedTasks.length,
      completed: scopedTasks.filter((task) => task.status === 'completed').length,
      overdue: overdue.length,
      todo: scopedTasks.filter((task) => task.status !== 'completed' && !overdue.some((item) => item.id === task.id)).length,
    };
  }, [scopedTasks, isTaskOverdue]);

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((task) => {
      if (statusFilter === 'all') return true;

      const overdue = task.status !== 'completed' && Boolean(task.dueDate) && isTaskOverdue(task);

      if (statusFilter === 'completed') return task.status === 'completed';
      if (statusFilter === 'overdue') return overdue;
      if (statusFilter === 'todo') return task.status !== 'completed' && !overdue;

      return true;
    });
  }, [scopedTasks, statusFilter, isTaskOverdue]);

  const groups = useMemo(() => {
    const items = filteredTasks
      .slice()
      .sort((a, b) => {
        const aIso = getAnchorIso(a);
        const bIso = getAnchorIso(b);
        return new Date(bIso).getTime() - new Date(aIso).getTime();
      });

    const map = new Map<string, Task[]>();
    items.forEach((task) => {
      const anchorIso = getAnchorIso(task);
      const offset = task.dueDate
        ? getTimezoneOffset(task)
        : (task.timezoneOffset ?? defaultTimezoneOffset);
      const key = formatDateKeyByOffset(new Date(anchorIso), offset);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });

    return Array.from(map.entries()).map(([dateKey, list]) => ({
      dateKey,
      monthKey: dateKey.slice(0, 7),
      list,
    }));
  }, [filteredTasks, defaultTimezoneOffset, getTimezoneOffset]);

  const summary = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const monthStart = getMonthStart(now);

    const classifyWindow = (start: Date) => {
      const inWindow = tasks.filter((task) => {
        const anchor = new Date(getAnchorIso(task));
        return anchor >= start && anchor <= now;
      });
      const completed = inWindow.filter((task) => task.status === 'completed');
      const completionRate = inWindow.length > 0 ? Math.round((completed.length / inWindow.length) * 100) : 0;

      return {
        total: inWindow.length,
        completed: completed.length,
        completionRate,
        topCategory: getTopCategoryLabel(completed.length > 0 ? completed : inWindow),
      };
    };

    return {
      week: classifyWindow(weekStart),
      month: classifyWindow(monthStart),
    };
  }, [tasks]);

  const heatmap = useMemo(() => {
    const offsetMinutes = defaultTimezoneOffset;
    const keys = buildRecentDayKeys(21, offsetMinutes);
    const counts = new Map<string, number>();

    tasks.forEach((task) => {
      if (task.status !== 'completed') return;
      const iso = task.updatedAt || task.dueDate || task.createdAt;
      if (!iso) return;
      const key = formatDateKeyByOffset(new Date(iso), offsetMinutes);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const days = keys.map((dateKey) => ({
      dateKey,
      count: counts.get(dateKey) || 0,
    }));

    const max = days.reduce((acc, day) => Math.max(acc, day.count), 0);

    const levelOf = (count: number) => {
      if (count <= 0) return 0;
      if (max <= 1) return 4;
      const ratio = count / max;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    };

    return { days, max, levelOf };
  }, [tasks, defaultTimezoneOffset]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, { monthKey: string; days: typeof groups }>();
    groups.forEach((group) => {
      const monthKey = group.monthKey;
      if (!map.has(monthKey)) map.set(monthKey, { monthKey, days: [] as any });
      map.get(monthKey)!.days.push(group);
    });
    return Array.from(map.values());
  }, [groups]);

  const focus = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'completed');
    const overdue = openTasks
      .filter((task) => Boolean(task.dueDate) && isTaskOverdue(task))
      .sort(compareByFocus);
    const dueToday = openTasks
      .filter((task) => {
        if (!task.dueDate) return false;
        const key = formatDateKeyByOffset(new Date(task.dueDate), getTimezoneOffset(task));
        return key === todayKey;
      })
      .sort(compareByFocus);
    const inProgress = openTasks
      .filter((task) => task.status === 'in_progress')
      .sort(compareByFocus);
    const pool = overdue.length > 0
      ? overdue
      : dueToday.length > 0
        ? dueToday
        : inProgress.length > 0
          ? inProgress
          : openTasks.slice().sort(compareByFocus);

    if (overdue.length > 0) {
      return {
        title: `先处理 ${overdue.length} 个逾期`,
        helper: '别先翻历史，先把它们完成、改期或删除。',
        actionLabel: '只看逾期',
        actionFilter: 'overdue' as TimelineStatusFilter,
        tasks: pool.slice(0, 3),
        tone: 'rose',
      };
    }

    if (dueToday.length > 0) {
      return {
        title: `今天还有 ${dueToday.length} 个要推进`,
        helper: '先看今天相关任务，再决定是否回顾更久以前。',
        actionLabel: '看待处理',
        actionFilter: 'todo' as TimelineStatusFilter,
        tasks: pool.slice(0, 3),
        tone: 'sky',
      };
    }

    if (inProgress.length > 0) {
      return {
        title: `继续推进 ${inProgress.length} 个进行中`,
        helper: '从未完成的上下文接着走，不用重新找线索。',
        actionLabel: '看待处理',
        actionFilter: 'todo' as TimelineStatusFilter,
        tasks: pool.slice(0, 3),
        tone: 'amber',
      };
    }

    return {
      title: openTasks.length > 0 ? '从最早的待办开始' : '时间线很干净',
      helper: openTasks.length > 0 ? '没有明显逾期，按时间顺序挑一件推进。' : '没有待处理任务，可以轻松回顾完成记录。',
      actionLabel: openTasks.length > 0 ? '看待处理' : '看完成',
      actionFilter: openTasks.length > 0 ? 'todo' as TimelineStatusFilter : 'completed' as TimelineStatusFilter,
      tasks: pool.slice(0, 3),
      tone: 'emerald',
    };
  }, [tasks, isTaskOverdue, getTimezoneOffset, todayKey]);

  const rhythmItems = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'completed');
    const overdue = openTasks.filter((task) => Boolean(task.dueDate) && isTaskOverdue(task)).length;
    const dueToday = openTasks.filter((task) => {
      if (!task.dueDate) return false;
      return formatDateKeyByOffset(new Date(task.dueDate), getTimezoneOffset(task)) === todayKey;
    }).length;
    const inProgress = openTasks.filter((task) => task.status === 'in_progress').length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    return [
      { label: '逾期', value: overdue, helper: '先清理', filter: 'overdue' as TimelineStatusFilter },
      { label: '今天', value: dueToday, helper: '当前焦点', filter: 'todo' as TimelineStatusFilter },
      { label: '进行中', value: inProgress, helper: '接着推进', filter: 'todo' as TimelineStatusFilter },
      { label: '完成', value: completed, helper: '回顾沉淀', filter: 'completed' as TimelineStatusFilter },
    ];
  }, [tasks, isTaskOverdue, getTimezoneOffset, todayKey]);

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter((task) => task.status === 'completed').length / tasks.length) * 100)
    : 0;

  const getDateLabel = (dateKey: string) => {
    const diff = Math.round((parseDateKeyAsUtc(dateKey) - parseDateKeyAsUtc(todayKey)) / (24 * 60 * 60 * 1000));
    if (diff === 0) return '今天';
    if (diff === -1) return '昨天';
    if (diff === 1) return '明天';
    return dateKey;
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const renderTaskCard = (task: Task, index: number) => {
    const offset = task.dueDate
      ? getTimezoneOffset(task)
      : (task.timezoneOffset ?? defaultTimezoneOffset);
    const dueLabel = task.dueDate
      ? formatZonedDateTime(task.dueDate, offset)
      : undefined;
    const anchorIso = getAnchorIso(task);
    const createdLabel = formatZonedDate(anchorIso, offset);
    const overdue = task.status !== 'completed' && Boolean(task.dueDate) && isTaskOverdue(task);
    const timelineStatus = getTimelineStatus(task, overdue);
    const badge = statusBadge[timelineStatus];
    const isExpanded = expandedIds.has(task.id);
    const shouldFold = task.title.length >= 68 || task.title.includes('\n');
    const completedSubtasks = task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
    const subtaskTotal = task.subtasks?.length ?? 0;

    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectTask(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectTask(task);
          }
        }}
        className="group app-micro-card relative overflow-hidden rounded-[20px] p-3 text-left transition-all duration-[var(--motion-slow)] hover:-translate-y-0.5 hover:border-[rgba(var(--theme-accent),0.24)] hover:bg-[color:var(--ui-card-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--theme-accent),0.32)] motion-enter"
        style={{ animationDelay: `${Math.min(index * 28, 180)}ms` }}
      >
        <div className={`absolute inset-y-4 left-0 w-[3px] rounded-full bg-gradient-to-b ${badge.railClassName}`} />
        <div className="relative flex items-start gap-3 pl-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleTaskStatus(task.id);
            }}
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--motion-base)] ${
              task.status === 'completed'
                ? 'border-emerald-400/55 bg-emerald-500/16 text-emerald-200 group-hover:scale-105'
                : 'border-[color:var(--ui-border-strong)] bg-[color:var(--ui-input-bg)] text-[color:var(--ui-text-muted)] hover:border-sky-400/55 hover:bg-sky-500/12 hover:text-sky-100 hover:scale-105'
            }`}
            aria-label={task.status === 'completed' ? '取消完成任务' : '完成任务'}
          >
            {task.status === 'completed' ? '✓' : ''}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                {badge.label}
              </span>
              {task.category ? (
                <span className="inline-flex max-w-[9rem] truncate rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2 py-0.5 text-[10px] text-[color:var(--ui-text-secondary)]">
                  {task.category}
                </span>
              ) : null}
            </div>

            <div
              className={`mt-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] ${
                task.status === 'completed'
                  ? 'text-[color:var(--ui-text-faint)] line-through'
                  : 'text-[color:var(--ui-text-strong)]'
              } ${!isExpanded && shouldFold ? 'line-clamp-2' : ''}`}
            >
              {task.title}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--ui-text-muted)]">
              <span>{dueLabel ? `截止 ${dueLabel}` : `记录 ${createdLabel}`}</span>
              {subtaskTotal > 0 ? <span>子任务 {completedSubtasks}/{subtaskTotal}</span> : null}
              {(task.tags?.length ?? 0) > 0 ? (
                <span className="min-w-0 truncate">
                  {task.tags
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((tag) => `#${tag}`)
                    .join(' ')}
                </span>
              ) : null}
            </div>

            {shouldFold ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(task.id);
                }}
                className="mt-2 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-[rgba(var(--theme-accent),0.35)] hover:text-[color:var(--ui-text-strong)]"
              >
                {isExpanded ? '收起' : '展开'}
              </button>
            ) : null}
          </div>

          <span className="mt-1 text-[13px] text-[color:var(--ui-text-faint)] transition-transform group-hover:translate-x-0.5">›</span>
        </div>
      </div>
    );
  };

  return (
    <div className="theme-native-surface app-page-stack flex min-h-0 flex-col px-2 pb-4 sm:px-5 sm:pb-6">
      <section className="timeline-focus-orb app-hero-compact motion-enter relative overflow-hidden border border-[rgba(var(--theme-accent),0.18)] bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.10),rgba(var(--theme-grad-end),0.045),rgba(255,255,255,0.012))] shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
        <div className="relative z-10 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--theme-accent),0.26)] bg-[rgba(var(--theme-accent),0.09)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--ui-text-secondary)]">
              <span className="timeline-pulse-dot h-1.5 w-1.5 rounded-full bg-[rgba(var(--theme-accent),0.95)]" />
              现在先看这里
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)] sm:text-2xl">
              {focus.title}
            </h2>
            <p className="app-clamp-2 mt-1.5 max-w-2xl text-xs leading-5 text-[color:var(--ui-text-secondary)] sm:text-sm">
              {focus.helper}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter(focus.actionFilter)}
                className="motion-card motion-press rounded-2xl border border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.15)] px-3.5 py-2 text-sm font-medium text-[color:var(--ui-text-strong)] hover:bg-[rgba(var(--theme-accent),0.22)]"
              >
                {focus.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('');
                  setTagFilter('');
                }}
                className="motion-card motion-press rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/70 px-3.5 py-2 text-sm text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]"
              >
                回到全部时间线
              </button>
            </div>

            {focus.tasks.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {focus.tasks.map((task, index) => (
                  <button
                    key={`focus-${task.id}`}
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="motion-enter motion-card app-micro-card min-w-0 rounded-[18px] px-3 py-2 text-left"
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <span className="block truncate text-xs font-semibold text-[color:var(--ui-text-strong)]">{task.title}</span>
                    <span className="mt-1 block text-[10px] text-[color:var(--ui-text-muted)]">
                      {task.dueDate ? formatZonedDateTime(task.dueDate, getTimezoneOffset(task)) : '未设时间'}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="app-section-quiet rounded-[22px] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] text-[color:var(--ui-text-muted)]">总体完成率</div>
                <div className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ui-text-strong)]">{completionRate}%</div>
              </div>
              <div className="text-right text-[11px] text-[color:var(--ui-text-muted)]">
                <div>本周 {summary.week.completed}/{summary.week.total}</div>
                <div>本月 {summary.month.completed}/{summary.month.total}</div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)]">
              <div
                className="timeline-progress-sweep h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--theme-grad-start),0.86),rgba(var(--theme-accent),0.74),rgba(var(--theme-grad-end),0.82))]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {heatmap.days.map((day, index) => {
                const level = heatmap.levelOf(day.count);
                const opacity = level === 0 ? 'opacity-30' : level === 1 ? 'opacity-45' : level === 2 ? 'opacity-62' : level === 3 ? 'opacity-80' : 'opacity-100';
                return (
                  <span
                    key={day.dateKey}
                    title={`${day.dateKey}：${day.count} 完成`}
                    className={`timeline-density-cell h-5 flex-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(var(--theme-accent),0.45)] ${opacity}`}
                    style={{ animationDelay: `${index * 22}ms` }}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-[color:var(--ui-text-muted)]">近 21 天完成密度 · 峰值 {heatmap.max}/天</div>
          </div>
        </div>
      </section>

      <section className="motion-enter grid gap-2 sm:grid-cols-4">
        {rhythmItems.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setStatusFilter(item.filter)}
            className="motion-card motion-press app-micro-card group relative overflow-hidden rounded-[18px] p-2.5 text-left transition-all hover:border-[rgba(var(--theme-accent),0.24)] hover:bg-[color:var(--ui-card-hover-bg)]"
            style={{ animationDelay: `${index * 42}ms` }}
          >
            <span className="timeline-card-sheen absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative block text-[11px] text-[color:var(--ui-text-muted)]">{item.helper}</span>
            <span className="relative mt-1 flex items-end justify-between gap-2">
              <span className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{item.label}</span>
              <span className="text-2xl font-semibold tracking-[-0.06em] text-[color:var(--ui-text-strong)]">{item.value}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="app-toolbar motion-enter flex flex-col gap-2 rounded-[22px] p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {statusFilterOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                statusFilter === item.key
                  ? 'border-[rgba(var(--theme-accent),0.46)] bg-[rgba(var(--theme-accent),0.16)] text-[color:var(--ui-text-strong)] shadow-[0_0_0_4px_rgba(var(--theme-accent),0.08)]'
                  : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] text-[color:var(--ui-text-secondary)] hover:border-[rgba(var(--theme-accent),0.28)] hover:text-[color:var(--ui-text-strong)]'
              }`}
            >
              {item.label} {statusCounts[item.key]}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="min-w-0 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-1.5 text-xs text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[rgba(var(--theme-accent),0.28)]"
            aria-label="按列表筛选"
          >
            <option value="">全部列表</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="min-w-0 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-1.5 text-xs text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[rgba(var(--theme-accent),0.28)]"
            aria-label="按标签筛选"
          >
            <option value="">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>

          {(categoryFilter || tagFilter || statusFilter !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('');
                setTagFilter('');
              }}
              className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-1.5 text-xs text-[color:var(--ui-text-secondary)] transition-colors hover:border-[rgba(var(--theme-accent),0.28)] hover:text-[color:var(--ui-text-strong)]"
            >
              清除
            </button>
          ) : null}
        </div>
      </section>

      {monthGroups.length === 0 ? (
        <section className="motion-enter flex min-h-[18rem] flex-col items-center justify-center rounded-[28px] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/40 px-6 text-center">
          <div className="text-base font-semibold text-[color:var(--ui-text-strong)]">没有符合筛选的时间记录</div>
          <div className="mt-2 text-sm text-[color:var(--ui-text-secondary)]">换个筛选条件，或回到全部时间线看看。</div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('');
              setTagFilter('');
            }}
            className="mt-4 rounded-2xl border border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.12)] px-4 py-2 text-sm text-[color:var(--ui-text-strong)]"
          >
            显示全部
          </button>
        </section>
      ) : (
        <section className="timeline-flow-line relative grid gap-4 pl-3 sm:pl-5">
          {monthGroups.map((month, monthIndex) => (
            <div key={month.monthKey} className="motion-enter relative" style={{ animationDelay: `${Math.min(monthIndex * 60, 180)}ms` }}>
              <div className="sticky top-2 z-10 mb-2 inline-flex rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)]/88 px-3 py-1.5 text-xs font-semibold text-[color:var(--ui-text-strong)] shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                {formatMonthLabel(month.monthKey)}
              </div>

              <div className="grid gap-3">
                {month.days.map((day) => (
                  <div key={day.dateKey} className="app-section-quiet relative rounded-[22px] p-2.5 sm:p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="timeline-pulse-dot h-2 w-2 rounded-full bg-[rgba(var(--theme-accent),0.88)]" />
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{getDateLabel(day.dateKey)}</div>
                          <div className="text-[11px] text-[color:var(--ui-text-muted)]">{day.dateKey}</div>
                        </div>
                      </div>
                      <div className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                        {day.list.length} 项
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {day.list.map((task, index) => renderTaskCard(task, index))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

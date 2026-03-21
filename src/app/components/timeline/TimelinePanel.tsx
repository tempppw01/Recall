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

type TimelineStatusBadge = {
  label: string;
  className: string;
  dotClassName: string;
  railClassName: string;
};

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
  // normalize to start-of-day in the selected offset
  const todayKey = formatDateKeyByOffset(today, offsetMinutes);
  const [y, m, d] = todayKey.split('-').map((v) => parseInt(v, 10));
  // Create a UTC date matching the offset-zone day start
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

const statusBadge: Record<TimelineStatus, { label: string; className: string; railClassName: string }> = {
  completed: {
    label: '已完成',
    className: 'text-green-100 bg-green-500/14 border-green-400/28 shadow-[0_8px_20px_rgba(34,197,94,0.12)]',
    railClassName: 'from-green-400/80 via-green-300/24 to-transparent',
  },
  overdue: {
    label: '已逾期',
    className: 'text-red-100 bg-red-500/14 border-red-400/28 shadow-[0_8px_20px_rgba(248,113,113,0.12)]',
    railClassName: 'from-red-400/85 via-red-300/24 to-transparent',
  },
  in_progress: {
    label: '进行中',
    className: 'text-amber-100 bg-amber-500/14 border-amber-400/28 shadow-[0_8px_20px_rgba(251,191,36,0.10)]',
    railClassName: 'from-amber-400/80 via-amber-300/22 to-transparent',
  },
  todo: {
    label: '未完成',
    className: 'text-blue-100 bg-blue-500/12 border-blue-400/24 shadow-[0_8px_20px_rgba(96,165,250,0.10)]',
    railClassName: 'from-blue-400/80 via-cyan-300/20 to-transparent',
  },
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


  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t?.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [tasks]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      (t?.tags || []).forEach((tag) => {
        const text = String(tag || '').trim();
        if (text) set.add(text);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task) return false;

      if (categoryFilter && (task.category || '') !== categoryFilter) {
        return false;
      }

      if (tagFilter) {
        const tags = (task.tags || []).map((t) => String(t || '').trim()).filter(Boolean);
        if (!tags.includes(tagFilter)) return false;
      }

      if (statusFilter === 'all') return true;

      const overdue = task.status !== 'completed' && Boolean(task.dueDate) && isTaskOverdue(task);

      if (statusFilter === 'completed') return task.status === 'completed';
      if (statusFilter === 'overdue') return overdue;
      // 未完成：不含已完成，且把过期单独分出去
      if (statusFilter === 'todo') return task.status !== 'completed' && !overdue;

      return true;
    });
  }, [tasks, categoryFilter, tagFilter, statusFilter, isTaskOverdue]);

  const todayKey = useMemo(
    () => formatDateKeyByOffset(new Date(), defaultTimezoneOffset),
    [defaultTimezoneOffset],
  );

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
      const inWindow = filteredTasks.filter((task) => {
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
  }, [filteredTasks]);

  const heatmap = useMemo(() => {
    const offsetMinutes = defaultTimezoneOffset;
    const keys = buildRecentDayKeys(28, offsetMinutes);
    const counts = new Map<string, number>();

    filteredTasks.forEach((task) => {
      if (task.status !== 'completed') return;
      const iso = task.updatedAt || task.dueDate || task.createdAt;
      if (!iso) return;
      const key = formatDateKeyByOffset(new Date(iso), offsetMinutes);
      if (!counts.has(key)) counts.set(key, 0);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const days = keys.map((dateKey) => ({
      dateKey,
      count: counts.get(dateKey) || 0,
    }));

    const max = days.reduce((acc, d) => Math.max(acc, d.count), 0);

    const levelOf = (count: number) => {
      if (count <= 0) return 0;
      if (max <= 1) return 4;
      const ratio = count / max;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    };

    return {
      days,
      max,
      levelOf,
    };
  }, [filteredTasks, defaultTimezoneOffset]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, { monthKey: string; days: typeof groups }>();
    groups.forEach((group) => {
      const monthKey = group.monthKey;
      if (!map.has(monthKey)) map.set(monthKey, { monthKey, days: [] as any });
      map.get(monthKey)!.days.push(group);
    });
    return Array.from(map.values());
  }, [groups]);

  const toggleExpanded = (taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <div className="stack-gap flex flex-col px-3 sm:px-6 pb-4 sm:pb-6">
      <div className="glass-panel motion-enter rounded-[32px] border-[color:var(--ui-border-strong)] p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-start">
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">时间轴概览</div>
            <div className="text-xs text-[#777777] mt-1">
              从时间维度查看任务推进节奏，快速找到完成、未完成和逾期事项。
            </div>
          </div>
          <span className="text-[10px] text-[#7d8595] rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 bg-[rgba(0,0,0,0.18)]">按时间查看</span>
        </div>


      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: 'week', label: '本周总结', data: summary.week },
          { key: 'month', label: '本月总结', data: summary.month },
        ].map((item) => (
          <div key={item.key} className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F3F6FF]">{item.label}</div>
                <div className="text-[11px] text-[#6F7890] mt-1">
                  完成 {item.data.completed} / {item.data.total} · 完成率 {item.data.completionRate}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tracking-tight text-[#F3F6FF]">{item.data.completionRate}%</div>
                <div className="text-[10px] text-[#666666]">Top：{item.data.topCategory}</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#111111] overflow-hidden border border-[#262626]">
              <div
                className="h-full rounded-full transition-all duration-[calc(var(--motion-slow)+200ms)] bg-[linear-gradient(90deg,rgba(var(--theme-grad-start),0.75),rgba(var(--theme-accent),0.65),rgba(var(--theme-grad-end),0.75))]"
                style={{ width: `${item.data.completionRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4 transition-[box-shadow,border-color,background-color] duration-[var(--motion-slow)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#F3F6FF]">完成密度</div>
            <div className="text-[11px] text-[#6F7890] mt-1">近 28 天（按 completed 任务的 updatedAt 统计）</div>
          </div>
          <div className="text-[11px] text-[#666666]">峰值：{heatmap.max}/天</div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {heatmap.days.map((d) => {
            const level = heatmap.levelOf(d.count);
            const bg =
              level === 0
                ? 'bg-[#121212]'
                : level === 1
                  ? 'bg-[rgba(var(--theme-accent),0.12)]'
                  : level === 2
                    ? 'bg-[rgba(var(--theme-accent),0.22)]'
                    : level === 3
                      ? 'bg-[rgba(var(--theme-accent-soft),0.30)]'
                      : 'bg-[rgba(var(--theme-grad-end),0.35)]';

            return (
              <div
                key={d.dateKey}
                title={`${d.dateKey}：${d.count} 完成`}
                className={`h-3.5 rounded-[5px] border border-[#262626] ${bg}`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-[#666666]">
          <span>更淡 → 更密</span>
          <span>0 / · / ·· / ··· / ····</span>
        </div>
      </div>

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'completed', label: '已完成' },
                { key: 'todo', label: '未完成' },
                { key: 'overdue', label: '已过期' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`text-xs px-3 py-1.5 rounded-full border motion-card motion-press ui-state-hover ui-state-press ${
                  statusFilter === item.key
                    ? 'border-blue-400/60 bg-blue-500/15 text-blue-200 shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                    : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#7C8499] hover:text-[#E1E8FF] hover:border-[#5A6690] hover:shadow-[0_10px_20px_rgba(0,0,0,0.18)] active:bg-[#252A33]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[rgba(0,0,0,0.18)] border border-[color:var(--ui-border-soft)] rounded-2xl px-3 py-1.5 text-xs text-[#CCCCCC] hover:border-[#4A5572] focus:border-[rgba(var(--theme-accent),0.45)] focus:outline-none"
              aria-label="按列表筛选"
            >
              <option value="">全部列表</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="bg-[rgba(0,0,0,0.18)] border border-[color:var(--ui-border-soft)] rounded-2xl px-3 py-1.5 text-xs text-[#CCCCCC] hover:border-[#4A5572] focus:border-[rgba(var(--theme-accent),0.45)] focus:outline-none"
              aria-label="按标签筛选"
            >
              <option value="">全部标签</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>

            {(categoryFilter || tagFilter || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('');
                  setTagFilter('');
                }}
                className="text-xs px-3 py-1.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#888888] hover:text-[#F0F4FF] hover:border-[#5A6690] motion-card motion-press ui-state-hover ui-state-press"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-[#666666]">
          当前展示：{filteredTasks.length} / {tasks.length} 项
        </div>
      </div>
      </div>

      {monthGroups.length === 0 ? (
        <div className="glass-panel-soft border border-dashed border-[color:var(--ui-border-soft)] rounded-[28px] p-4 text-xs text-[#7b8496]">
          暂无可展示的任务。
        </div>
      ) : (
        <div className="grid gap-4">
          {monthGroups.map((month) => (
            <div
              key={month.monthKey}
              className="glass-panel motion-enter motion-card rounded-[30px] border-[color:var(--ui-border-strong)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">{month.monthKey}</div>
                <div className="text-[11px] text-[#666666]">
                  {month.days.reduce((acc, d) => acc + d.list.length, 0)} 项
                </div>
              </div>

              <div className="mt-3 columns-1 gap-3 xl:columns-2">
                {month.days.map((day) => (
                  <div
                    key={day.dateKey}
                    className="mb-3 break-inside-avoid rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(23,25,31,0.98),rgba(18,20,26,0.98))] p-3.5 scroll-mt-24 motion-enter shadow-[0_12px_28px_rgba(0,0,0,0.14)]"
                  >
                    <div className="flex items-center justify-between -mx-1 px-3 py-2 rounded-2xl bg-[rgba(17,19,24,0.86)] backdrop-blur border border-[rgba(255,255,255,0.04)] xl:sticky xl:top-0 xl:z-10">
                      <div className="text-xs font-semibold text-[#DDDDDD]">
                        {day.dateKey}
                      </div>
                      <div className="text-[11px] text-[#666666]">{day.list.length} 项</div>
                    </div>

                    <div className="mt-3 grid gap-2.5 relative before:absolute before:left-2.5 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-[rgba(var(--theme-grad-start),0.55)] before:via-[rgba(255,255,255,0.08)] before:to-transparent before:content-['']">
                      {day.dateKey === todayKey ? (
                        <div className="text-[11px] text-[#A4B1C8] px-2.5 py-1 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)]">
                          今天
                        </div>
                      ) : null}
                      {day.list.map((task) => {
                        const offset = task.dueDate
                          ? getTimezoneOffset(task)
                          : (task.timezoneOffset ?? defaultTimezoneOffset);
                        const dueLabel = task.dueDate
                          ? formatZonedDateTime(task.dueDate, offset)
                          : undefined;
                        const anchorIso = getAnchorIso(task);
                        const createdLabel = formatZonedDate(anchorIso, offset);
                        const overdue =
                          task.status !== 'completed' && Boolean(task.dueDate) && isTaskOverdue(task);
                        const timelineStatus = getTimelineStatus(task, overdue);
                        const badge = statusBadge[timelineStatus];
                        const isExpanded = expandedIds.has(task.id);
                        const shouldFold = task.title.length >= 80 || task.title.includes('\n');

                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => onSelectTask(task)}
                            className={`group w-full text-left rounded-[26px] border motion-enter motion-card motion-press p-0.5 relative overflow-hidden transition-[transform,box-shadow,border-color,background-color] duration-[var(--motion-slow)] ${isExpanded ? 'border-[rgba(var(--theme-accent),0.34)] bg-[rgba(var(--theme-accent),0.08)] shadow-[0_18px_42px_rgba(0,0,0,0.26)]' : 'border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:border-[rgba(var(--theme-accent),0.28)] hover:bg-[rgba(255,255,255,0.055)] hover:shadow-[0_16px_34px_rgba(0,0,0,0.24)] hover:-translate-y-0.5'}`}
                            style={{ animationDelay: `${Math.min(160, (day.list.indexOf(task) % 6) * 30)}ms` }}
                          >
                            <div className={`pointer-events-none absolute inset-y-3 left-0.5 w-[3px] rounded-full bg-gradient-to-b ${badge.railClassName}`} />
                            <div className="relative rounded-[24px] bg-[linear-gradient(180deg,rgba(17,19,24,0.96),rgba(12,14,19,0.98))] px-4 py-3.5 sm:px-4.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onToggleTaskStatus(task.id);
                                      }}
                                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--motion-base)] ${
                                        task.status === 'completed'
                                          ? 'border-green-400/70 bg-green-500/18 text-green-100 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]'
                                          : 'border-[#4A4A4A] text-[#8FA0C2] hover:border-blue-400/60 hover:bg-blue-500/12 hover:text-blue-100'
                                      }`}
                                      aria-label={task.status === 'completed' ? '取消完成任务' : '完成任务'}
                                    >
                                      {task.status === 'completed' ? '✓' : '○'}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full border ${badge.className}`}>
                                          {badge.label}
                                        </span>
                                        {task.category ? (
                                          <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                                            {task.category}
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className={`mt-2 grid transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out ${isExpanded || !shouldFold ? 'grid-rows-[1fr]' : 'grid-rows-[0.34fr]'}`}>
                                        <div
                                          className={`overflow-hidden text-[13px] sm:text-[13.5px] font-medium leading-5 break-words ${
                                            task.status === 'completed'
                                              ? 'line-through text-[#707789]'
                                              : 'text-[#F3F6FF]'
                                          } ${!isExpanded && shouldFold ? 'line-clamp-2' : ''}`}
                                        >
                                          {task.title}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[11px] text-[#96A0B5]">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${overdue ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#C0C9DB]'}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${overdue ? 'bg-red-300' : 'bg-blue-300/80'}`} />
                                      {dueLabel ? `截止 ${dueLabel}` : `创建 ${createdLabel}`}
                                    </span>
                                    {(task.subtasks?.length ?? 0) > 0 ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
                                        子任务 {task.subtasks?.filter((s) => s.completed).length}/{task.subtasks?.length}
                                      </span>
                                    ) : null}
                                  </div>

                                  {(task.tags?.length ?? 0) > 0 ? (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                      {task.tags
                                        .filter(Boolean)
                                        .slice(0, 4)
                                        .map((t) => (
                                          <span
                                            key={String(t)}
                                            className="text-[10px] rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] px-2 py-1 text-[#7D89A3]"
                                          >
                                            #{t}
                                          </span>
                                        ))}
                                    </div>
                                  ) : null}

                                  {shouldFold && (
                                    <div className="mt-3">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleExpanded(task.id);
                                        }}
                                        className="text-[11px] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-[#8F98B0] hover:text-[#E7ECFB] hover:border-[rgba(var(--theme-accent),0.35)] motion-card motion-press"
                                      >
                                        {isExpanded ? '收起详情' : '展开详情'}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className={`shrink-0 text-[11px] text-[#616B7F] transition-all duration-[var(--motion-base)] ${isExpanded ? 'translate-x-0.5 text-[#A9B6D1]' : 'group-hover:translate-x-0.5 group-hover:text-[#9FB1D4]'}`}>›</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

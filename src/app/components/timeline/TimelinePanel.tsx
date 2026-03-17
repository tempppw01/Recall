import React, { useMemo, useState } from 'react';
import type { Task } from '@/lib/store';

type TimelinePanelProps = {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
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

const getTimelineStatus = (task: Task, isOverdue: boolean): TimelineStatus => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue) return 'overdue';
  if (task.status === 'in_progress') return 'in_progress';
  return 'todo';
};

const statusBadge: Record<TimelineStatus, { label: string; icon: string; className: string; dotClassName: string }> = {
  completed: {
    label: '已完成',
    icon: '✅',
    className: 'text-green-200 bg-green-500/12 border-green-500/25',
    dotClassName: 'bg-green-400',
  },
  overdue: {
    label: '已过期',
    icon: '⏰',
    className: 'text-red-200 bg-red-500/12 border-red-500/25',
    dotClassName: 'bg-red-400',
  },
  in_progress: {
    label: '进行中',
    icon: '🟠',
    className: 'text-amber-200 bg-amber-500/12 border-amber-500/25',
    dotClassName: 'bg-amber-400',
  },
  todo: {
    label: '未完成',
    icon: '⭕',
    className: 'text-blue-200 bg-blue-500/10 border-blue-500/25',
    dotClassName: 'bg-blue-400',
  },
};

export default function TimelinePanel(props: TimelinePanelProps) {
  const {
    tasks,
    onSelectTask,
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
    <div className="stack-gap flex flex-col">
      <div className="glass-panel rounded-[28px] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#DDDDDD]">时间轴</div>
            <div className="text-xs text-[#777777] mt-1">
              按时间回顾任务：已完成 / 未完成 / 过期（原型）
            </div>
          </div>
          <span className="text-[10px] text-[#616161]">Timeline</span>
        </div>
        <div className="mt-4 text-xs text-[#777777]">
          数据：复用现有 Task（不引入新模型）。点击卡片可查看详情。
        </div>


      <div className="glass-panel-soft rounded-2xl p-3 sm:p-4">
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
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === item.key
                    ? 'border-blue-400/60 bg-blue-500/15 text-blue-200'
                    : 'border-[#333333] text-[#7C8499] hover:text-[#CDD7F3] hover:border-[#4A5572]'
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
              className="bg-[#111111] border border-[#333333] rounded-xl px-3 py-1.5 text-xs text-[#CCCCCC]"
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
              className="bg-[#111111] border border-[#333333] rounded-xl px-3 py-1.5 text-xs text-[#CCCCCC]"
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
                className="text-xs px-3 py-1.5 rounded-xl border border-[#333333] text-[#888888] hover:text-[#DDDDDD]"
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
        <div className="bg-[#1F1F1F] border border-dashed border-[#2C2C2C] rounded-2xl p-4 text-xs text-[#666666]">
          暂无可展示的任务。
        </div>
      ) : (
        <div className="grid gap-4">
          {monthGroups.map((month) => (
            <div
              key={month.monthKey}
              className="bg-[#1B1B1B] border border-[#2C2C2C] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#DDDDDD]">{month.monthKey}</div>
                <div className="text-[11px] text-[#666666]">
                  {month.days.reduce((acc, d) => acc + d.list.length, 0)} 项
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                {month.days.map((day) => (
                  <div
                    key={day.dateKey}
                    className="rounded-2xl border border-[#262626] bg-[#171717] p-3 scroll-mt-24"
                  >
                    <div className="flex items-center justify-between sticky top-0 z-10 -mx-3 px-3 py-2 rounded-2xl bg-[#171717]/90 backdrop-blur border-b border-[#232323]">
                      <div className="text-xs font-semibold text-[#DDDDDD]">
                        {day.dateKey}
                      </div>
                      <div className="text-[11px] text-[#666666]">{day.list.length} 项</div>
                    </div>

                    <div className="mt-2 grid gap-2 relative before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-[#3A4A7A] before:via-[#2D2D2D] before:to-transparent before:content-['']">
                      {day.dateKey === todayKey ? (
                        <div className="text-[11px] text-[#7C8499] px-2 py-1 rounded-xl border border-[#2C2C2C] bg-[#1B1B1B]">
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
                            className="w-full text-left rounded-2xl border border-[#2A2A2A] bg-[#1F1F1F] hover:bg-[#232323] hover:border-[#3A3A3A] transition-colors p-3 relative pl-6 animate-[fadeInUp_240ms_ease-out]"
                            style={{ animationDelay: `${Math.min(160, (day.list.indexOf(task) % 6) * 30)}ms` }}
                          >
                            <span
                              className={`absolute left-[11px] top-5 inline-flex h-2.5 w-2.5 rounded-full ring-4 ring-[#171717] ${badge.dotClassName}`}
                            />
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex h-2 w-2 rounded-full ${badge.dotClassName}`} />
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.className}`}
                                  >
                                    <span className="mr-1">{badge.icon}</span>
                                    {badge.label}
                                  </span>
                                  {task.category ? (
                                    <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                      {task.category}
                                    </span>
                                  ) : null}
                                </div>

                                <div
                                  className={`mt-2 overflow-hidden text-[13px] leading-5 break-words transition-all duration-300 ease-out ${
                                    task.status === 'completed'
                                      ? 'line-through text-[#666666]'
                                      : 'text-[#EEEEEE]'
                                  } ${!isExpanded && shouldFold ? 'line-clamp-2 max-h-10' : 'max-h-40'}`}
                                >
                                  {task.title}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#666666]">
                                  {dueLabel ? <span>截止：{dueLabel}</span> : <span>创建：{createdLabel}</span>}
                                  {(task.subtasks?.length ?? 0) > 0 ? (
                                    <span>
                                      子任务：{task.subtasks?.filter((s) => s.completed).length}/
                                      {task.subtasks?.length}
                                    </span>
                                  ) : null}
                                  {(task.tags?.length ?? 0) > 0 ? (
                                    <span className="truncate">
                                      标签：
                                      {task.tags
                                        .filter(Boolean)
                                        .slice(0, 4)
                                        .map((t) => `#${t}`)
                                        .join(' ')}
                                    </span>
                                  ) : null}
                                </div>

                                {shouldFold && (
                                  <div className="mt-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleExpanded(task.id);
                                      }}
                                      className="text-[11px] text-[#888888] hover:text-[#DDDDDD]"
                                    >
                                      {isExpanded ? '收起' : '展开'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 text-[11px] text-[#555555]">›</div>
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

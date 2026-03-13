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

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateKeyByOffset = (date: Date, offsetMinutes: number) => {
  const zoned = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

const getAnchorIso = (task: Task) => task.dueDate || task.updatedAt || task.createdAt;

const getTimelineStatus = (task: Task, isOverdue: boolean) => {
  if (task.status === 'completed') return 'completed';
  if (isOverdue) return 'overdue';
  if (task.status === 'in_progress') return 'in_progress';
  return 'todo';
};

const statusBadge: Record<string, { label: string; className: string; dotClassName: string }> = {
  completed: {
    label: '已完成',
    className: 'text-green-200 bg-green-500/10 border-green-500/20',
    dotClassName: 'bg-green-400',
  },
  overdue: {
    label: '已过期',
    className: 'text-red-200 bg-red-500/10 border-red-500/20',
    dotClassName: 'bg-red-400',
  },
  in_progress: {
    label: '进行中',
    className: 'text-amber-200 bg-amber-500/10 border-amber-500/20',
    dotClassName: 'bg-amber-400',
  },
  todo: {
    label: '未完成',
    className: 'text-blue-200 bg-blue-500/10 border-blue-500/20',
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

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const items = tasks
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
  }, [tasks, defaultTimezoneOffset, getTimezoneOffset]);

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
                    className="rounded-2xl border border-[#262626] bg-[#171717] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-[#BBBBBB]">{day.dateKey}</div>
                      <div className="text-[11px] text-[#555555]">{day.list.length} 项</div>
                    </div>

                    <div className="mt-2 grid gap-2">
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
                            className="w-full text-left rounded-2xl border border-[#2A2A2A] bg-[#1F1F1F] hover:bg-[#232323] transition-colors p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex h-2 w-2 rounded-full ${badge.dotClassName}`} />
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                  {task.category ? (
                                    <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                      {task.category}
                                    </span>
                                  ) : null}
                                </div>

                                <div
                                  className={`mt-2 text-[13px] leading-5 break-words ${
                                    task.status === 'completed'
                                      ? 'line-through text-[#666666]'
                                      : 'text-[#EEEEEE]'
                                  } ${!isExpanded && shouldFold ? 'line-clamp-2' : ''}`}
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

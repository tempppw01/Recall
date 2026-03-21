import React, { useMemo, useState } from 'react';
import type { Task } from '@/lib/store';
import { CheckCircle2, Clock3, Eye, Layers3, ArrowRight } from 'lucide-react';

type ReviewPanelProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onToggleTaskStatus: (taskId: string) => void;
  defaultTimezoneOffset: number;
  getTimezoneOffset: (task: Task) => number;
  formatZonedDateTime: (iso: string, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  isTaskOverdue: (task: Task) => boolean;
};

type ReviewBucketKey = 'all' | 'overdue' | 'today' | 'upcoming' | 'someday';

const bucketMeta: Record<Exclude<ReviewBucketKey, 'all'>, { label: string; description: string }> = {
  overdue: { label: '需要立刻检查', description: '已经逾期，优先确认是否继续、改期或完成。' },
  today: { label: '今天要过一遍', description: '今天要看的任务，避免今天结束前遗忘。' },
  upcoming: { label: '接下来 7 天', description: '提前看一遍，把快到期的事情先理顺。' },
  someday: { label: '最近无明确日期', description: '没有明确截止，但应该定期回头扫一眼。' },
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export default function ReviewPanel(props: ReviewPanelProps) {
  const {
    tasks,
    selectedTask,
    onSelectTask,
    onToggleTaskStatus,
    defaultTimezoneOffset,
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    isTaskOverdue,
  } = props;

  const [activeBucket, setActiveBucket] = useState<ReviewBucketKey>('all');

  const reviewGroups = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const nextWeek = addDays(today, 7);

    const activeTasks = tasks.filter((task) => task.status !== 'completed');

    const groups: Record<Exclude<ReviewBucketKey, 'all'>, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      someday: [],
    };

    activeTasks.forEach((task) => {
      if (task.dueDate && isTaskOverdue(task)) {
        groups.overdue.push(task);
        return;
      }

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        const dueDay = startOfLocalDay(due);
        if (dueDay.getTime() === today.getTime()) {
          groups.today.push(task);
          return;
        }
        if (dueDay > today && dueDay <= nextWeek) {
          groups.upcoming.push(task);
          return;
        }
      }

      groups.someday.push(task);
    });

    Object.values(groups).forEach((list) => {
      list.sort((a, b) => {
        const aTime = new Date(a.dueDate || a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.dueDate || b.updatedAt || b.createdAt).getTime();
        return aTime - bTime;
      });
    });

    return groups;
  }, [tasks, isTaskOverdue]);

  const reviewCounts = {
    all: Object.values(reviewGroups).reduce((sum, list) => sum + list.length, 0),
    overdue: reviewGroups.overdue.length,
    today: reviewGroups.today.length,
    upcoming: reviewGroups.upcoming.length,
    someday: reviewGroups.someday.length,
  };

  const reviewList = activeBucket === 'all'
    ? ([...reviewGroups.overdue, ...reviewGroups.today, ...reviewGroups.upcoming, ...reviewGroups.someday])
    : reviewGroups[activeBucket];

  const focusTask = selectedTask && selectedTask.status !== 'completed'
    ? selectedTask
    : reviewList[0] || null;

  return (
    <div className="stack-gap flex flex-col px-3 sm:px-6 pb-4 sm:pb-6">
      <div className="glass-panel motion-enter rounded-[32px] border-[color:var(--ui-border-strong)] p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-start">
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">Review / 检查</div>
            <div className="mt-1 text-xs text-[#7d8595]">
              把任务从“堆着没动”变成“逐项过一遍”。先看逾期，再看今天和接下来 7 天。
            </div>
          </div>
          <span className="text-[10px] text-[#7d8595] rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 bg-[rgba(0,0,0,0.18)]">
            0.0.3 首版骨架
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: 'overdue', label: '需立刻检查', value: reviewCounts.overdue, icon: Clock3, tone: 'text-red-200 bg-red-500/10 border-red-500/20' },
          { key: 'today', label: '今天要过', value: reviewCounts.today, icon: Eye, tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' },
          { key: 'upcoming', label: '未来 7 天', value: reviewCounts.upcoming, icon: Layers3, tone: 'text-blue-200 bg-blue-500/10 border-blue-500/20' },
          { key: 'all', label: '待检查总数', value: reviewCounts.all, icon: CheckCircle2, tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#F3F6FF]">{item.value}</div>
                </div>
                <div className={`rounded-2xl border px-2.5 py-2 ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'all', label: '全部待检查' },
              { key: 'overdue', label: '逾期' },
              { key: 'today', label: '今天' },
              { key: 'upcoming', label: '未来 7 天' },
              { key: 'someday', label: '无明确日期' },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveBucket(item.key)}
                className={`text-xs px-3 py-1.5 rounded-full border motion-card motion-press ui-state-hover ui-state-press ${
                  activeBucket === item.key
                    ? 'border-blue-400/60 bg-blue-500/15 text-blue-200 shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                    : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#7C8499] hover:text-[#E1E8FF] hover:border-[#5A6690]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-[#7d8595]">
            当前展示：{reviewList.length} 项
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start">
        <div className="glass-panel motion-enter rounded-[30px] border-[color:var(--ui-border-strong)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">
                {activeBucket === 'all' ? '待检查列表' : bucketMeta[activeBucket].label}
              </div>
              <div className="mt-1 text-xs text-[#7d8595]">
                {activeBucket === 'all' ? '按逾期、今天、未来 7 天、无明确日期的顺序检查。' : bucketMeta[activeBucket].description}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {reviewList.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-sm text-[#7d8595]">
                这一组目前没有需要检查的任务。
              </div>
            ) : (
              reviewList.map((task) => {
                const offset = task.dueDate
                  ? getTimezoneOffset(task)
                  : (task.timezoneOffset ?? defaultTimezoneOffset);
                const dueLabel = task.dueDate
                  ? formatZonedDateTime(task.dueDate, offset)
                  : formatZonedDate(task.updatedAt || task.createdAt, offset);
                const overdue = task.dueDate ? isTaskOverdue(task) : false;
                const isFocus = focusTask?.id === task.id;

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className={`w-full text-left rounded-[24px] border p-3.5 transition-all ${
                      isFocus
                        ? 'border-[rgba(var(--theme-accent),0.36)] bg-[rgba(var(--theme-accent),0.09)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
                        : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[color:var(--ui-border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${
                            overdue
                              ? 'text-red-200 bg-red-500/12 border-red-500/25'
                              : task.dueDate
                              ? 'text-blue-200 bg-blue-500/12 border-blue-500/25'
                              : 'text-[#C7CFDF] bg-[rgba(255,255,255,0.04)] border-[color:var(--ui-border-soft)]'
                          }`}>
                            {overdue ? '逾期待处理' : task.dueDate ? '有日期' : '待整理'}
                          </span>
                          {task.category ? (
                            <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                              {task.category}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[14px] font-medium leading-6 text-[#F3F6FF] break-words">
                          {task.title}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#7d8595]">
                          <span>{task.dueDate ? `截止：${dueLabel}` : `最近更新：${dueLabel}`}</span>
                          {(task.tags?.length ?? 0) > 0 ? (
                            <span>{task.tags?.filter(Boolean).slice(0, 4).map((tag) => `#${tag}`).join(' ')}</span>
                          ) : null}
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 text-[#697386] transition-transform ${isFocus ? 'translate-x-0.5' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel motion-enter rounded-[30px] border-[color:var(--ui-border-strong)] p-4 xl:sticky xl:top-4">
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">检查详情</div>
            <div className="mt-1 text-xs text-[#7d8595]">这里是 Review 工作流里的右侧详情区，后续可扩展为检查记录、跳过、批量处理、回到上下文等动作。</div>
          </div>

          {focusTask ? (
            <div className="mt-4 space-y-3">
              <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">当前焦点</div>
                <div className="mt-2 text-[15px] font-medium leading-6 text-[#F3F6FF]">{focusTask.title}</div>
                <div className="mt-2 space-y-1 text-xs text-[#7d8595]">
                  <div>状态：{focusTask.status === 'in_progress' ? '进行中' : '待处理'}</div>
                  <div>列表：{focusTask.category || '未分类'}</div>
                  <div>
                    时间：
                    {focusTask.dueDate
                      ? formatZonedDateTime(focusTask.dueDate, getTimezoneOffset(focusTask))
                      : formatZonedDate(focusTask.updatedAt || focusTask.createdAt, focusTask.timezoneOffset ?? defaultTimezoneOffset)}
                  </div>
                </div>
              </div>

              {(focusTask.subtasks?.length ?? 0) > 0 ? (
                <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">子任务进度</div>
                  <div className="mt-2 space-y-2 text-sm text-[#D8DEEF]">
                    {focusTask.subtasks?.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${subtask.completed ? 'bg-emerald-400' : 'bg-[#63708A]'}`} />
                        <span className={subtask.completed ? 'line-through text-[#707789]' : 'text-[#D8DEEF]'}>{subtask.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggleTaskStatus(focusTask.id)}
                  className="btn btn-primary btn-md rounded-2xl"
                >
                  标记完成
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTask(focusTask)}
                  className="btn btn-secondary btn-md rounded-2xl"
                >
                  查看原任务
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-sm text-[#7d8595]">
              选中一项后，这里会显示它的检查详情。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import type { Task } from '@/lib/store';
import { CheckCircle2, Clock3, Eye, Layers3, ArrowRight, CalendarClock, SkipForward, ExternalLink, Hourglass } from 'lucide-react';

type ReviewPanelProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onQuickSetDuePreset: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight') => void;
  onUpdateTaskDueDate: (taskId: string, dueDate?: string, timezoneOffset?: number) => void;
  onOpenTaskContext: (task: Task) => void;
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
const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReviewPanel(props: ReviewPanelProps) {
  const {
    tasks,
    selectedTask,
    onSelectTask,
    onToggleTaskStatus,
    onQuickSetDuePreset,
    onUpdateTaskDueDate,
    onOpenTaskContext,
    defaultTimezoneOffset,
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    isTaskOverdue,
  } = props;

  const [activeBucket, setActiveBucket] = useState<ReviewBucketKey>('all');
  const [customDate, setCustomDate] = useState('');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(selectedTask?.id ?? null);
  const [lastActionText, setLastActionText] = useState('');

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

  const fallbackFocusTask = selectedTask && selectedTask.status !== 'completed'
    ? selectedTask
    : reviewList[0] || null;

  const focusTask = reviewList.find((task) => task.id === focusedTaskId) || fallbackFocusTask;

  const focusIndex = focusTask ? reviewList.findIndex((task) => task.id === focusTask.id) : -1;
  const reviewedCount = focusIndex >= 0 ? focusIndex : 0;
  const remainingCount = focusIndex >= 0 ? Math.max(reviewList.length - focusIndex - 1, 0) : reviewList.length;
  const progressPercent = reviewList.length > 0 ? Math.max(6, Math.round(((reviewedCount + (focusTask ? 1 : 0)) / reviewList.length) * 100)) : 0;

  useEffect(() => {
    if (selectedTask?.id) {
      setFocusedTaskId(selectedTask.id);
    }
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!reviewList.length) {
      setFocusedTaskId(null);
      return;
    }
    if (!focusTask) {
      setFocusedTaskId(reviewList[0].id);
      return;
    }
    if (!reviewList.some((task) => task.id === focusTask.id)) {
      setFocusedTaskId(reviewList[0].id);
    }
  }, [reviewList, focusTask]);

  const moveFocusToNext = (taskId: string) => {
    const currentIndex = reviewList.findIndex((task) => task.id === taskId);
    if (currentIndex === -1) {
      setFocusedTaskId(reviewList[0]?.id ?? null);
      return;
    }
    const nextTask = reviewList[currentIndex + 1] || reviewList[currentIndex - 1] || null;
    setFocusedTaskId(nextTask?.id ?? null);
    if (nextTask) onSelectTask(nextTask);
  };

  const handleCustomReschedule = () => {
    if (!focusTask || !customDate) return;
    const offset = focusTask.timezoneOffset ?? defaultTimezoneOffset;
    onUpdateTaskDueDate(focusTask.id, `${customDate}T09:00:00.000Z`, offset);
    setLastActionText(`已把「${focusTask.title}」改到 ${customDate}`);
    setCustomDate('');
    moveFocusToNext(focusTask.id);
  };

  const handleComplete = () => {
    if (!focusTask) return;
    const title = focusTask.title;
    onToggleTaskStatus(focusTask.id);
    setLastActionText(`已完成「${title}」，继续下一项`);
    moveFocusToNext(focusTask.id);
  };

  const handlePreset = (preset: 'today' | 'tomorrow' | 'tonight', text: string) => {
    if (!focusTask) return;
    const title = focusTask.title;
    onQuickSetDuePreset(focusTask.id, preset);
    setLastActionText(`已将「${title}」${text}`);
    moveFocusToNext(focusTask.id);
  };

  const handleOpenContext = () => {
    if (!focusTask) return;
    onOpenTaskContext(focusTask);
    setLastActionText(`已回到「${focusTask.title}」的原任务上下文`);
  };

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
            0.0.3 工作流第二轮
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

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">检查进度</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#DCE3F4]">
              <span>当前：{focusTask ? `第 ${focusIndex + 1} 项` : '本组已清空'}</span>
              <span>本组共 {reviewList.length} 项</span>
              <span>剩余 {remainingCount} 项</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(92,123,250,0.9),rgba(110,231,255,0.85))] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3 text-xs text-[#7d8595]">
            {focusTask
              ? `建议保持连续处理，不要频繁切组。先把当前这组扫完，再切下一组。`
              : '这一组已经扫完了，可以切去下一组继续。'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] xl:items-start">
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
                    onClick={() => {
                      setFocusedTaskId(task.id);
                      onSelectTask(task);
                    }}
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
            <div className="mt-1 text-xs text-[#7d8595]">做完当前判断后，会自动推进到下一项，尽量保持 Review 的节奏不断掉。</div>
          </div>

          {focusTask ? (
            <div className="mt-4 space-y-3">
              {lastActionText ? (
                <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-xs text-emerald-100">
                  {lastActionText}
                </div>
              ) : null}

              <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">当前焦点</div>
                <div className="mt-2 text-[15px] font-medium leading-6 text-[#F3F6FF]">{focusTask.title}</div>
                <div className="mt-2 space-y-1 text-xs text-[#7d8595]">
                  <div>状态：{focusTask.status === 'in_progress' ? '进行中' : '待处理'}</div>
                  <div>列表：{focusTask.category || '未分类'}</div>
                  <div>进度：当前第 {focusIndex + 1} 项 / 本组共 {reviewList.length} 项</div>
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

              <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5 space-y-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">快速处理</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="btn btn-primary btn-md rounded-2xl"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    标记完成
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenContext}
                    className="btn btn-secondary btn-md rounded-2xl"
                  >
                    <ExternalLink className="h-4 w-4" />
                    回到原任务
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('tomorrow', '跳到明天再看')}
                    className="btn btn-secondary btn-md rounded-2xl"
                  >
                    <SkipForward className="h-4 w-4" />
                    跳过到明天
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('tonight', '安排到今晚再看')}
                    className="btn btn-secondary btn-md rounded-2xl"
                  >
                    <CalendarClock className="h-4 w-4" />
                    今晚再看
                  </button>
                </div>
              </div>

              <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5 space-y-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">改期 / 稍后再看</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreset('today', '重新拉回到今天')}
                    className="btn btn-secondary btn-sm rounded-2xl"
                  >
                    改到今天
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('tomorrow', '稍后到明天处理')}
                    className="btn btn-secondary btn-sm rounded-2xl"
                  >
                    稍后再看
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                    min={toDateInput(new Date())}
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-sm text-[#E8ECF8] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCustomReschedule}
                    disabled={!customDate}
                    className="btn btn-secondary btn-md rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Hourglass className="h-4 w-4" />
                    应用
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-sm text-[#7d8595]">
              当前分组已经检查完了，可以切到下一组继续扫。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Calendar, CalendarDays, Flag, Pin, PinOff, Plus, Sunrise, Sunset } from 'lucide-react';
import { Task } from '@/lib/store';

type TaskQuickActionsProps = {
  task: Task;
  onSetDuePreset: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => void;
  onClearDueDate: (taskId: string) => void;
  onSetPriority: (taskId: string, priority: number) => void;
  onTogglePinned: (task: Task) => void;
  onStartAddSubtask?: () => void;
};

/**
 * 任务详情快捷栏：将高频操作前置，减少滚动和跨区操作。
 */
export default function TaskQuickActions({
  task,
  onSetDuePreset,
  onClearDueDate,
  onSetPriority,
  onTogglePinned,
  onStartAddSubtask,
}: TaskQuickActionsProps) {
  const actionButtonClassName =
    'inline-flex h-7 items-center gap-1 rounded-xl border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-2 text-[11px] leading-none text-[color:var(--ui-text-secondary)] transition-colors hover:border-[rgba(var(--theme-accent),0.3)] hover:text-[color:var(--ui-text-strong)]';

  return (
    <div className="mb-4 space-y-2.5 rounded-[22px] border border-[color:var(--ui-border-strong)] bg-[var(--ui-card-bg)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.10)] sm:mb-5 sm:rounded-[26px] sm:p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">快捷修改</div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onSetDuePreset(task.id, 'today')} className={actionButtonClassName}>
          <Sunrise className="w-3 h-3" /> 今天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tomorrow')} className={actionButtonClassName}>
          <Sunset className="w-3 h-3" /> 明天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tonight')} className={actionButtonClassName}>
          <Calendar className="w-3 h-3" /> 今晚
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'nextWeek')} className={actionButtonClassName}>
          <CalendarDays className="w-3 h-3" /> 下周
        </button>
        <button onClick={() => onClearDueDate(task.id)} className={actionButtonClassName}>
          清除日期
        </button>
        <button
          onClick={() => onStartAddSubtask?.()}
          className={actionButtonClassName}
        >
          <Plus className="w-3 h-3" /> 新增子任务
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[2, 1, 0].map((level) => (
          <button
            key={level}
            onClick={() => onSetPriority(task.id, level)}
            className={`${actionButtonClassName} ${
              task.priority === level
                ? 'border-blue-400 text-white bg-blue-500/10'
                : ''
            }`}
          >
            <Flag className={`w-3 h-3 ${level === 2 ? 'text-red-400' : level === 1 ? 'text-yellow-400' : 'text-emerald-400'}`} />
            {level === 2 ? '高优先级' : level === 1 ? '中优先级' : '低优先级'}
          </button>
        ))}

        <button
          onClick={() => onTogglePinned(task)}
          className={actionButtonClassName}
        >
          {task.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          {task.pinned ? '取消置顶' : '置顶'}
        </button>
      </div>
    </div>
  );
}

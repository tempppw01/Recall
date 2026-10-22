import { Calendar, CalendarX, Flag, ListPlus, Moon, Pin, PinOff, Sunrise, Sunset } from 'lucide-react';
import { Task } from '@/lib/store';

type TaskQuickActionsProps = {
  task: Task;
  onSetDuePreset: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => void;
  onClearDueDate: (taskId: string) => void;
  onSetPriority: (taskId: string, priority: number) => void;
  onTogglePinned: (task: Task) => void;
  onStartAddSubtask?: () => void;
};

export default function TaskQuickActions({
  task,
  onSetDuePreset,
  onClearDueDate,
  onSetPriority,
  onTogglePinned,
  onStartAddSubtask,
}: TaskQuickActionsProps) {
  const actionButtonClassName =
    'inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-md border border-transparent bg-transparent px-2 text-[11px] leading-none text-[color:var(--ui-text-secondary)] transition-colors hover:border-[color:var(--recall-divider)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--ui-text-strong)]';

  return (
    <div className="mb-4 flex flex-wrap gap-1 sm:mb-5">
        <button onClick={() => onSetDuePreset(task.id, 'today')} className={actionButtonClassName}>
          <Sunrise className="h-3.5 w-3.5 text-amber-400" /> 今天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tomorrow')} className={actionButtonClassName}>
          <Sunset className="h-3.5 w-3.5 text-orange-400" /> 明天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tonight')} className={actionButtonClassName}>
          <Moon className="h-3.5 w-3.5 text-indigo-300" /> 今晚
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'nextWeek')} className={actionButtonClassName}>
          <Calendar className="h-3.5 w-3.5 text-sky-400" /> 下周
        </button>
        <button onClick={() => onClearDueDate(task.id)} className={actionButtonClassName}>
          <CalendarX className="h-3.5 w-3.5 text-rose-400" /> 清日期
        </button>
        <button
          onClick={() => onStartAddSubtask?.()}
          className={actionButtonClassName}
        >
          <ListPlus className="h-3.5 w-3.5 text-emerald-400" /> 子任务
        </button>

        {[2, 1, 0].map((level) => (
          <button
            key={level}
            onClick={() => onSetPriority(task.id, level)}
            className={`${actionButtonClassName} ${
              task.priority === level
                ? 'border-[rgba(var(--theme-accent),0.55)] bg-[rgba(var(--theme-accent),0.1)] text-[color:var(--ui-text-strong)]'
                : ''
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${level === 2 ? 'text-red-400' : level === 1 ? 'text-yellow-400' : 'text-emerald-400'}`} />
            {level === 2 ? '高优先级' : level === 1 ? '中优先级' : '低优先级'}
          </button>
        ))}

        <button
          onClick={() => onTogglePinned(task)}
          className={actionButtonClassName}
        >
          {task.pinned ? <PinOff className="h-3.5 w-3.5 text-violet-300" /> : <Pin className="h-3.5 w-3.5 text-violet-300" />}
          {task.pinned ? '取消置顶' : '置顶'}
        </button>
    </div>
  );
}

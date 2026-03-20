import { Calendar, Flag, Pin, PinOff, Sunrise, Sunset } from 'lucide-react';
import { Task } from '@/lib/store';

type TaskQuickActionsProps = {
  task: Task;
  onSetDuePreset: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight') => void;
  onClearDueDate: (taskId: string) => void;
  onSetPriority: (taskId: string, priority: number) => void;
  onTogglePinned: (task: Task) => void;
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
}: TaskQuickActionsProps) {
  return (
    <div className="mb-5 rounded-[28px] border border-[color:var(--ui-border-strong)] bg-[linear-gradient(180deg,rgba(28,31,38,0.96),rgba(22,24,30,0.98))] p-4 space-y-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8A8A8A]">快捷修改</div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSetDuePreset(task.id, 'today')} className="btn btn-secondary btn-sm rounded-2xl inline-flex items-center gap-1">
          <Sunrise className="w-3 h-3" /> 今天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tomorrow')} className="btn btn-secondary btn-sm rounded-2xl inline-flex items-center gap-1">
          <Sunset className="w-3 h-3" /> 明天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tonight')} className="btn btn-secondary btn-sm rounded-2xl inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" /> 今晚
        </button>
        <button onClick={() => onClearDueDate(task.id)} className="btn btn-ghost btn-sm rounded-2xl">
          清除日期
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[2, 1, 0].map((level) => (
          <button
            key={level}
            onClick={() => onSetPriority(task.id, level)}
            className={`btn btn-sm rounded-2xl inline-flex items-center gap-1 ${
              task.priority === level
                ? 'border-blue-400 text-white bg-blue-500/10'
                : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#AAAAAA] hover:border-[#666666] hover:text-white'
            }`}
          >
            <Flag className={`w-3 h-3 ${level === 2 ? 'text-red-400' : level === 1 ? 'text-yellow-400' : 'text-emerald-400'}`} />
            {level === 2 ? '高优先级' : level === 1 ? '中优先级' : '低优先级'}
          </button>
        ))}

        <button
          onClick={() => onTogglePinned(task)}
          className="btn btn-ghost btn-sm rounded-2xl inline-flex items-center gap-1"
        >
          {task.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          {task.pinned ? '取消置顶' : '置顶'}
        </button>
      </div>
    </div>
  );
}

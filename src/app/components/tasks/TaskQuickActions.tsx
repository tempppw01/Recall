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
    <div className="mb-5 rounded-2xl border border-[#333333] bg-gradient-to-br from-[#232A36] via-[#1F1F1F] to-[#1F2230] p-3 space-y-3">
      <div className="text-[11px] text-[#8A8A8A]">快捷修改</div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSetDuePreset(task.id, 'today')} className="px-2.5 py-1 text-xs rounded-lg border border-[#3A3A3A] text-[#CCCCCC] hover:border-blue-400 hover:text-white inline-flex items-center gap-1">
          <Sunrise className="w-3 h-3" /> 今天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tomorrow')} className="px-2.5 py-1 text-xs rounded-lg border border-[#3A3A3A] text-[#CCCCCC] hover:border-blue-400 hover:text-white inline-flex items-center gap-1">
          <Sunset className="w-3 h-3" /> 明天
        </button>
        <button onClick={() => onSetDuePreset(task.id, 'tonight')} className="px-2.5 py-1 text-xs rounded-lg border border-[#3A3A3A] text-[#CCCCCC] hover:border-blue-400 hover:text-white inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" /> 今晚
        </button>
        <button onClick={() => onClearDueDate(task.id)} className="px-2.5 py-1 text-xs rounded-lg border border-[#3A3A3A] text-[#AAAAAA] hover:border-[#666666] hover:text-white">
          清除日期
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[2, 1, 0].map((level) => (
          <button
            key={level}
            onClick={() => onSetPriority(task.id, level)}
            className={`px-2.5 py-1 text-xs rounded-lg border inline-flex items-center gap-1 ${
              task.priority === level
                ? 'border-blue-400 text-white bg-blue-500/10'
                : 'border-[#3A3A3A] text-[#AAAAAA] hover:border-[#666666] hover:text-white'
            }`}
          >
            <Flag className={`w-3 h-3 ${level === 2 ? 'text-red-400' : level === 1 ? 'text-yellow-400' : 'text-emerald-400'}`} />
            {level === 2 ? '高优先级' : level === 1 ? '中优先级' : '低优先级'}
          </button>
        ))}

        <button
          onClick={() => onTogglePinned(task)}
          className="px-2.5 py-1 text-xs rounded-lg border border-[#3A3A3A] text-[#AAAAAA] hover:border-[#666666] hover:text-white inline-flex items-center gap-1"
        >
          {task.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          {task.pinned ? '取消置顶' : '置顶'}
        </button>
      </div>
    </div>
  );
}

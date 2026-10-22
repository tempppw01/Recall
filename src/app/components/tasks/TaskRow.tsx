import React from 'react';
import { Bell, CheckCircle2, Repeat2 } from 'lucide-react';
import type { Task } from '@/lib/store';
import { formatTickDueLabel } from '@/app/components/tasks/tickFormat';

/**
 * 滴答清单风格的列表行：扁平方块勾选框 + 标题 + 右侧到期日标签。
 * 勾选框描边颜色编码优先级（低=蓝 / 中=橙 / 高=红）。
 */
export type TaskRowProps = {
  task: Task;
  selected?: boolean;
  onClick?: () => void;
  onToggle: (taskId: string) => void;
  onTitleClick?: () => void;
  getTimezoneOffset: (task: Task) => number;
  multiSelectEnabled?: boolean;
  isChecked?: boolean;
  onToggleSelect?: (taskId: string) => void;
};

const PRIORITY_CHECKBOX_COLOR = ['var(--recall-text-muted)', '#f0a30a', '#e05252'];

export const TaskRow = ({
  task,
  selected,
  onClick,
  onToggle,
  onTitleClick,
  getTimezoneOffset,
  multiSelectEnabled,
  isChecked,
  onToggleSelect,
}: TaskRowProps) => {
  const isCompleted = task.status === 'completed';
  const isAbandoned = task.status === 'abandoned';
  const dueLabel = formatTickDueLabel(task.dueDate, getTimezoneOffset(task));
  const checkboxColor = PRIORITY_CHECKBOX_COLOR[Math.min(Math.max(task.priority ?? 0, 0), 2)];

  return (
    <div
      data-task-drag-select-id={multiSelectEnabled ? task.id : undefined}
      className={`recall-task-row group flex items-center gap-2.5 border-b border-[color:var(--recall-divider)] px-3 py-2 transition-colors ${
        selected ? 'bg-[color:var(--recall-selected-bg)]' : 'hover:bg-[color:var(--recall-hover-bg)]'
      }`}
      onClick={onClick}
    >
      {multiSelectEnabled ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect?.(task.id);
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            isChecked
              ? 'border-[color:rgb(var(--theme-accent))] bg-[color:rgb(var(--theme-accent))] text-white'
              : 'border-[color:var(--recall-text-muted)] text-transparent'
          }`}
          aria-label={isChecked ? '取消选择任务' : '选择任务'}
        >
          <CheckCircle2 className="h-3 w-3" />
        </button>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(task.id);
          }}
          style={isCompleted ? undefined : { borderColor: checkboxColor }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${
            isCompleted ? 'border-[color:rgb(var(--theme-accent))] bg-[color:rgb(var(--theme-accent))] text-white' : 'bg-transparent'
          }`}
          aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
        >
          {isCompleted && <CheckCircle2 className="h-3 w-3 animate-[pop-in_280ms_ease-out]" />}
        </button>
      )}

      <div className="min-w-0 flex-1">
        {onTitleClick ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTitleClick();
            }}
            className={`block max-w-full truncate text-left text-[14px] font-normal tracking-[0] ${
              isCompleted
                ? 'text-[color:var(--recall-text-muted)] line-through'
                : isAbandoned
                  ? 'text-[color:var(--recall-text-muted)]'
                  : 'text-[color:var(--recall-text)]'
            }`}
            title={task.title}
          >
            {task.title}
          </button>
        ) : (
          <span
            className={`block max-w-full truncate text-[14px] font-normal tracking-[0] ${
              isCompleted
                ? 'text-[color:var(--recall-text-muted)] line-through'
                : isAbandoned
                  ? 'text-[color:var(--recall-text-muted)]'
                  : 'text-[color:var(--recall-text)]'
            }`}
            title={task.title}
          >
            {task.title}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {task.repeat && task.repeat.type !== 'none' && (
          <Repeat2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--recall-text-muted)]" aria-label="重复任务" />
        )}
        {task.reminderAt && (
          <Bell className="h-3.5 w-3.5 shrink-0 text-[color:var(--recall-text-muted)]" aria-label="已设置提醒" />
        )}
        {dueLabel && !isCompleted && (
          <span
            className={`whitespace-nowrap text-[12px] font-normal leading-none ${
              dueLabel.tone === 'late' ? 'text-[color:var(--recall-danger)]' : 'text-[color:var(--recall-due)]'
            }`}
          >
            {dueLabel.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskRow;

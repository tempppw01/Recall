import React, { useEffect, useRef, useState, TouchEvent as ReactTouchEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Flag,
  Pin,
  Trash2,
} from 'lucide-react';
import type { Subtask, Task, TaskRepeatRule } from '@/lib/store';

/**
 * 任务卡片：支持滑动删除、拖拽、子任务展开、时间编辑。
 * 仅负责 UI 与交互，依赖外部注入的工具函数。
 */
export type TaskItemHelpers = {
  getTimezoneOffset: (task: Task) => number;
  formatZonedDateTime: (iso: string, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  formatZonedTime: (iso: string, offsetMinutes: number) => string;
  buildDueDateIso: (dateText: string, timeText: string, offsetMinutes: number) => string | undefined;
  getTimezoneLabel: (offsetMinutes: number) => string;
  getPriorityColor: (priority: number) => string;
  getPriorityLabel: (priority: number) => string;
  formatRepeatLabel: (rule?: TaskRepeatRule) => string;
  isTaskOverdue: (task: Task) => boolean;
};

export type TaskItemProps = {
  task: Task;
  selected?: boolean;
  dragEnabled?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onTitleClick?: () => void;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onUpdateDueDate?: (taskId: string, dueDate?: string, timezoneOffset?: number) => void;
  onDragStart?: (taskId: string) => void;
  onDragOver?: (taskId: string) => void;
  onDrop?: (taskId: string) => void;
  onDragEnd?: () => void;
  onCopyTitle?: (task: Task) => void;
  onCopyContent?: (task: Task) => void;
  onTogglePinned?: (task: Task) => void;
  multiSelectEnabled?: boolean;
  isChecked?: boolean;
  onToggleSelect?: (taskId: string) => void;
  helpers: TaskItemHelpers;
};

const TaskItem = ({
  task,
  selected,
  onClick,
  onToggle,
  onDelete,
  onToggleSubtask,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  onDragEnd,
  onTitleClick,
  onUpdateDueDate,
  onCopyTitle,
  onCopyContent,
  onTogglePinned,
  multiSelectEnabled,
  isChecked,
  onToggleSelect,
  dragEnabled = true,
  helpers,
}: TaskItemProps) => {
  const {
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    formatZonedTime,
    buildDueDateIso,
    getTimezoneLabel,
    getPriorityColor,
    getPriorityLabel,
    formatRepeatLabel,
    isTaskOverdue,
  } = helpers;
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalRef = useRef<boolean | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [isDueEditorOpen, setIsDueEditorOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [editorDate, setEditorDate] = useState('');
  const [editorTime, setEditorTime] = useState('09:00');
  const maxOffset = 84;
  const timezoneOffset = getTimezoneOffset(task);
  const canDrag = Boolean(onDragStart) && dragEnabled;
  const subtaskTotal = task.subtasks?.length ?? 0;
  const completedSubtasks = subtaskTotal
    ? (task.subtasks ?? []).filter((subtask: Subtask) => subtask.completed).length
    : 0;
  const subtaskProgress = subtaskTotal > 0
    ? Math.round((completedSubtasks / subtaskTotal) * 100)
    : 0;
  const hasSubtasks = subtaskTotal > 0;
  const dueLabel = task.dueDate
    ? formatZonedDateTime(task.dueDate, timezoneOffset)
    : '未设时间';
  const dueTextColor = task.dueDate
    ? (isTaskOverdue(task) ? 'text-red-400' : 'text-[#888888]')
    : 'text-[#666666]';

  useEffect(() => {
    setOffsetX(0);
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalRef.current = null;
  }, [task.id]);

  useEffect(() => {
    setIsSubtasksOpen(false);
    setIsDueEditorOpen(false);
  }, [task.id]);

  useEffect(() => {
    if (!isDueEditorOpen) return;
    const baseIso = task.dueDate ?? new Date().toISOString();
    setEditorDate(formatZonedDate(baseIso, timezoneOffset));
    setEditorTime(task.dueDate ? formatZonedTime(task.dueDate, timezoneOffset) : '09:00');
  }, [isDueEditorOpen, task.dueDate, timezoneOffset, formatZonedDate, formatZonedTime]);

  const applyDueDate = (nextDate: string, nextTime: string) => {
    if (!onUpdateDueDate) return;
    const nextIso = buildDueDateIso(nextDate, nextTime, timezoneOffset);
    onUpdateDueDate(task.id, nextIso, timezoneOffset);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    startXRef.current = event.touches[0].clientX;
    startYRef.current = event.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsPointerDragging(false);
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (!isHorizontalRef.current) {
      setIsPointerDragging(true);
      return;
    }

    if (Math.abs(deltaX) > 4) {
      setIsPointerDragging(true);
    }

    if (deltaX >= 0) {
      setOffsetX(0);
      setIsSwiping(true);
      return;
    }
    setIsSwiping(true);
    setOffsetX(Math.max(-maxOffset, deltaX));
  };

  const handleTouchEnd = () => {
    if (isHorizontalRef.current) {
      const shouldOpen = Math.abs(offsetX) > maxOffset / 2;
      setOffsetX(shouldOpen ? -maxOffset : 0);
    }
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalRef.current = null;
  };

  const handleClick = () => {
    if (isPointerDragging) return;
    if (offsetX !== 0) {
      setOffsetX(0);
      return;
    }
    if (multiSelectEnabled && onToggleSelect) {
      onToggleSelect(task.id);
      return;
    }
    onClick?.();
  };

  const handleDragStart = (event: any) => {
    if (!canDrag) return;
    setIsPointerDragging(true);
    event.dataTransfer?.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.(task.id);
  };

  const handleDragEnd = () => {
    setIsPointerDragging(false);
    onDragEnd?.();
  };

  const showDelete = offsetX < -4 || isSwiping;

  return (
    <div
      className={`relative rounded-2xl ${isDragging ? 'ring-2 ring-blue-500/60 scale-[0.98]' : ''}`}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(task.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(task.id);
      }}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className={`absolute inset-y-0 right-0 w-[84px] bg-red-600 flex items-center justify-center transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            setOffsetX(0);
            onDelete?.(task.id);
          }}
          className="text-sm font-semibold text-white"
        >
          删除
        </button>
      </div>
      <div
        onClick={handleClick}
        className={`group relative p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all border border-transparent bg-[#1F1F1F] hover:bg-[#232323] ${
          selected ? 'bg-[#2C2C2C]' : 'hover:bg-[#222222]'
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 180ms ease',
        }}
      >
        {subtaskTotal > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-blue-500/20 rounded-l-2xl"
            style={{ width: `${subtaskProgress}%` }}
          />
        )}
        <div className="relative z-10 flex items-start gap-3 w-full">
          {multiSelectEnabled && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect?.(task.id);
              }}
              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isChecked
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-[#555555] text-transparent hover:border-[#888888]'
              }`}
              aria-label={isChecked ? '取消选择任务' : '选择任务'}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggle(task.id);
            }}
            className={`mt-0.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border transition-colors ${
              task.status === 'completed'
                ? 'bg-[#5E5E5E] border-[#5E5E5E] text-white'
                : 'border-[#555555] hover:border-[#888888]'
            }`}
          >
            {task.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-[pop-in_280ms_ease-out]" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap justify-between items-start gap-2">
              {task.pinned && (
                <span className="text-[10px] text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded">置顶</span>
              )}
              {onTitleClick ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTitleClick?.();
                  }}
                  className={`text-left text-[13px] sm:text-sm leading-snug ${
                    task.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#EEEEEE]'
                  }`}
                  title="点击编辑标题"
                >
                  {task.title}
                </button>
              ) : (
                <p
                  className={`text-[13px] sm:text-sm leading-snug ${
                    task.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#EEEEEE]'
                  }`}
                >
                  {task.title}
                </p>
              )}
              {hasSubtasks && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsSubtasksOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-1 text-[10px] sm:text-xs text-[#666666] px-2 py-1 sm:py-0.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] hover:text-[#CCCCCC]"
                  aria-label={isSubtasksOpen ? '收起子任务' : '展开子任务'}
                >
                  <span>子任务 {completedSubtasks}/{subtaskTotal}</span>
                  {isSubtasksOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
              {canDrag && (
                <button
                  type="button"
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs text-[#666666] px-2 py-1 sm:py-0.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] cursor-grab active:cursor-grabbing touch-none shrink-0"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onTouchStart={(event) => {
                    event.stopPropagation();
                  }}
                  title="拖动排序"
                >
                  拖动排序
                </button>
              )}
              {(task as any).similarity !== undefined && (task as any).similarity > 0.7 && (
                <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded ml-2 whitespace-nowrap">
                  {Math.round((task as any).similarity * 100)}%
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[10px] flex items-center gap-0.5 ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3 fill-current" />
                {getPriorityLabel(task.priority)}
              </span>
              {task.repeat && task.repeat.type !== 'none' && (
                <span className="text-[10px] text-purple-300 bg-purple-500/10 px-1.5 rounded">
                  {formatRepeatLabel(task.repeat)}
                </span>
              )}
              {task.category && (
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 rounded">
                  {task.category}
                </span>
              )}
              {task.dueDate && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsDueEditorOpen((prev) => !prev);
                    }}
                    className={`text-[10px] flex items-center gap-1 ${dueTextColor} hover:text-[#DDDDDD]`}
                    title="点击编辑时间"
                  >
                    <Calendar className="w-3 h-3" />
                    {dueLabel}
                    <span className="text-[#666666]">({getTimezoneLabel(timezoneOffset)})</span>
                  </button>
                  {isDueEditorOpen && (
                    <div
                      className="absolute z-20 mt-2 rounded-lg border border-[#333333] bg-[#1A1A1A] p-2 shadow-lg"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editorDate}
                          onChange={(event) => {
                            const nextDate = event.target.value;
                            setEditorDate(nextDate);
                            applyDueDate(nextDate, editorTime);
                          }}
                          className="bg-[#111111] border border-[#333333] rounded px-2 py-1 text-[11px] text-[#CCCCCC]"
                        />
                        <input
                          type="time"
                          value={editorTime}
                          onChange={(event) => {
                            const nextTime = event.target.value;
                            setEditorTime(nextTime);
                            applyDueDate(editorDate, nextTime);
                          }}
                          className="bg-[#111111] border border-[#333333] rounded px-2 py-1 text-[11px] text-[#CCCCCC]"
                        />
                        <button
                          type="button"
                          onClick={() => setIsDueEditorOpen(false)}
                          className="px-2 py-1 text-[10px] rounded border border-[#333333] text-[#CCCCCC] hover:border-[#555555]"
                        >
                          完成
                        </button>
                      </div>
                      <div className="mt-1 text-[10px] text-[#666666]">
                        时区：{getTimezoneLabel(timezoneOffset)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {task.tags?.map((tag: string) => (
                <span key={tag} className="text-[10px] text-[#666666]">#{tag}</span>
              ))}
            </div>
            {hasSubtasks && isSubtasksOpen && (
              <div className="mt-2 space-y-1 border-l border-[#2A2A2A] pl-4">
                {task.subtasks.map((subtask: Subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-[11px] sm:text-xs">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleSubtask?.(task.id, subtask.id);
                      }}
                      className="shrink-0"
                      aria-label={subtask.completed ? '取消完成子任务' : '完成子任务'}
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#555555]" />
                      )}
                    </button>
                    <span className={subtask.completed ? 'line-through text-[#666666]' : 'text-[#BBBBBB]'}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-[#333333] bg-[#1F1F1F] shadow-2xl overflow-hidden"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                onCopyTitle?.(task);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>复制标题</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                onCopyContent?.(task);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>复制完整内容</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                onTogglePinned?.(task);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{task.pinned ? '取消置顶' : '置顶'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                onDelete?.(task.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#2A2A2A]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TaskItem;

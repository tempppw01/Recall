import React, { useEffect, useRef, useState, TouchEvent as ReactTouchEvent } from 'react';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Flag,
  Pin,
  Trash2,
  Bell,
  Sunrise,
  Sunset,
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
  onQuickSetPriority?: (taskId: string, priority: number) => void;
  onQuickSetDuePreset?: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => void;
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
  onQuickSetPriority,
  onQuickSetDuePreset,
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
  const dueEditorRef = useRef<HTMLDivElement | null>(null);
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
  const isCompleted = task.status === 'completed';
  const dueLabel = task.dueDate
    ? formatZonedDateTime(task.dueDate, timezoneOffset)
    : '未设时间';
  const dueTextColor = task.dueDate
    ? (isTaskOverdue(task) ? 'text-red-400' : 'text-[color:var(--ui-text-secondary)]')
    : 'text-[color:var(--ui-text-faint)]';
  const visibleTags = (task.tags ?? []).slice(0, 2);
  const hiddenTagCount = Math.max(0, (task.tags ?? []).length - visibleTags.length);

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

  useEffect(() => {
    if (!isDueEditorOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (dueEditorRef.current && target && !dueEditorRef.current.contains(target)) {
        setIsDueEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isDueEditorOpen]);

  const applyDueDate = (nextDate: string, nextTime: string) => {
    if (!onUpdateDueDate) return;
    const nextIso = buildDueDateIso(nextDate, nextTime, timezoneOffset);
    onUpdateDueDate(task.id, nextIso, timezoneOffset);
  };

  const applyPreset = (preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => {
    onQuickSetDuePreset?.(task.id, preset);
    setIsDueEditorOpen(false);
  };

  const clearDueDate = () => {
    onUpdateDueDate?.(task.id, undefined, timezoneOffset);
    setIsDueEditorOpen(false);
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
      className={`relative rounded-[24px] ${isDueEditorOpen ? 'z-40' : ''} ${isDragging ? 'ring-2 ring-[rgba(var(--theme-accent),0.55)] scale-[0.98]' : ''}`}
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
        className={`group relative overflow-visible p-2.5 sm:p-3 rounded-[24px] cursor-pointer motion-card motion-press motion-glow ui-state-hover ui-state-press border ${
          selected
            ? 'ui-state-selected border-[rgba(var(--theme-accent),0.42)] bg-[rgba(var(--theme-accent),0.14)] shadow-[0_0_0_1px_rgba(var(--theme-accent),0.10),0_14px_34px_rgba(0,0,0,0.24)]'
            : isCompleted
              ? 'border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] shadow-[0_8px_22px_rgba(15,23,42,0.08)]'
              : 'border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] hover:bg-[var(--ui-card-hover-bg)] hover:border-[rgba(var(--theme-accent),0.24)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] active:bg-[var(--state-active-bg)]'
        } ${isSubtasksOpen ? 'shadow-[0_16px_36px_rgba(0,0,0,0.24)]' : ''}`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {subtaskTotal > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-2xl bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.2),rgba(var(--theme-grad-end),0.14))] transition-all duration-[var(--motion-slow)]"
            style={{ width: `${subtaskProgress}%` }}
          />
        )}
        <div className="relative z-10 flex items-start gap-2.5 w-full">
          {multiSelectEnabled && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect?.(task.id);
              }}
              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isChecked
                  ? 'bg-[rgba(var(--theme-accent),0.95)] border-[rgba(var(--theme-accent),0.95)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.14)]'
                  : 'border-[color:var(--ui-border-strong)] text-transparent hover:border-[rgba(var(--theme-accent),0.45)]'
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
            className={`mt-0.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
              task.status === 'completed'
                ? 'bg-[rgba(var(--theme-accent),0.9)] border-[rgba(var(--theme-accent),0.9)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.12)]'
                : 'border-[color:var(--ui-border-strong)] hover:border-[rgba(var(--theme-accent),0.55)] hover:bg-[rgba(var(--theme-accent),0.08)]'
            }`}
          >
            {task.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-[pop-in_280ms_ease-out]" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2 min-w-0 flex-1 flex-wrap">
                {hasSubtasks && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsSubtasksOpen((prev) => !prev);
                    }}
                    className={`mt-0.5 shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border bg-[var(--ui-card-bg)] motion-press ${isSubtasksOpen ? 'text-[color:var(--ui-text-strong)] border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.10)]' : 'text-[color:var(--ui-text-muted)] border-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-text-strong)]'}`}
                    aria-label={isSubtasksOpen ? '收起子任务' : '展开子任务'}
                  >
                    {isSubtasksOpen ? (
                      <ChevronUp className="w-3 h-3 transition-transform duration-[var(--motion-base)]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 transition-transform duration-[var(--motion-base)]" />
                    )}
                    <span>子任务 {completedSubtasks}/{subtaskTotal}</span>
                  </button>
                )}
                {task.pinned && (
                  <span className="text-[10px] text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full shrink-0">置顶</span>
                )}
                {onTitleClick ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTitleClick?.();
                    }}
                    className={`text-left text-[13px] font-medium leading-snug min-w-0 ${
                      task.status === 'completed' ? 'text-[color:var(--ui-text-faint)] line-through' : 'text-[color:var(--ui-text-strong)]'
                    }`}
                    title="点击编辑标题"
                  >
                    {task.title}
                  </button>
                ) : (
                  <p
                    className={`text-[13px] font-medium leading-snug min-w-0 ${
                      task.status === 'completed' ? 'text-[color:var(--ui-text-faint)] line-through' : 'text-[color:var(--ui-text-strong)]'
                    }`}
                  >
                    {task.title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canDrag && (
                  <button
                    type="button"
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    className={`transition-opacity text-[10px] text-[color:var(--ui-text-muted)] px-1.5 py-0.5 rounded-full border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] cursor-grab active:cursor-grabbing touch-none hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--theme-accent),0.35)] ${selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
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
                  <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {Math.round((task as any).similarity * 100)}%
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-1.5 py-0.5 text-[10px] ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3 fill-current" />
                {getPriorityLabel(task.priority)}
              </span>
              {task.repeat && task.repeat.type !== 'none' && (
                <span className="text-[10px] text-purple-200 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                  {formatRepeatLabel(task.repeat)}
                </span>
              )}
              {task.category && (
                <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                  {task.category}
                </span>
              )}
              <div className="relative" ref={dueEditorRef}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDueEditorOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-1.5 py-0.5 text-[10px] ${dueTextColor} hover:text-[color:var(--ui-text-strong)]`}
                  title="点击编辑时间"
                >
                  <Calendar className="w-3 h-3" />
                  {dueLabel}
                </button>
                {isDueEditorOpen && (
                  <div
                    className="absolute left-0 top-full z-20 mt-2 w-[260px] rounded-2xl border border-[var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A8A]">快捷设置时间</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyPreset('today')}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-border-soft)] px-2 py-1 text-[11px] text-[color:var(--ui-text-primary)] hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[var(--state-hover-bg)]"
                      >
                        <Sunrise className="w-3 h-3" /> 今天
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('tomorrow')}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-border-soft)] px-2 py-1 text-[11px] text-[color:var(--ui-text-primary)] hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[var(--state-hover-bg)]"
                      >
                        <Sunset className="w-3 h-3" /> 明天
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('nextWeek')}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-border-soft)] px-2 py-1 text-[11px] text-[color:var(--ui-text-primary)] hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[var(--state-hover-bg)]"
                      >
                        <CalendarDays className="w-3 h-3" /> 下周一
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('tonight')}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-border-soft)] px-2 py-1 text-[11px] text-[color:var(--ui-text-primary)] hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[var(--state-hover-bg)]"
                      >
                        <Bell className="w-3 h-3" /> 今晚
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <input
                        type="date"
                        value={editorDate}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setEditorDate(nextDate);
                          applyDueDate(nextDate, editorTime);
                        }}
                        title="选择日期"
                        className="w-full rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-input-bg)] px-3 py-2 text-[12px] text-[color:var(--ui-text-primary)]"
                      />
                      <input
                        type="time"
                        value={editorTime}
                        onChange={(event) => {
                          const nextTime = event.target.value;
                          setEditorTime(nextTime);
                          applyDueDate(editorDate, nextTime);
                        }}
                        title="选择时间"
                        className="w-full rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-input-bg)] px-3 py-2 text-[12px] text-[color:var(--ui-text-primary)]"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[color:var(--ui-text-muted)]">时区：{getTimezoneLabel(timezoneOffset)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={clearDueDate}
                          className="px-2 py-1 text-[10px] rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)]"
                        >
                          清除
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDueEditorOpen(false)}
                          className="px-2 py-1 text-[10px] rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-primary)] hover:border-[rgba(var(--theme-accent),0.3)]"
                        >
                          完成
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {visibleTags.map((tag: string) => (
                <span key={tag} className="text-[10px] text-[color:var(--ui-text-muted)] rounded-full border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-1.5 py-0.5">#{tag}</span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="text-[10px] text-[color:var(--ui-text-muted)] rounded-full border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-1.5 py-0.5">+{hiddenTagCount}</span>
              )}
              <div
                className={`mt-2 flex min-h-[24px] flex-wrap items-center gap-1.5 border-t pt-1.5 transition-[opacity,border-color] duration-[var(--motion-base)] overflow-hidden ${
                  selected
                    ? 'opacity-100 border-[rgba(255,255,255,0.04)]'
                    : 'pointer-events-none opacity-0 border-transparent sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-hover:border-[rgba(255,255,255,0.04)]'
                }`}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
              >
                {onQuickSetPriority && (
                  <>
                    {[2, 1, 0].map((level) => (
                      <button
                        key={`priority-${level}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onQuickSetPriority(task.id, level);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                          task.priority === level
                            ? 'border-blue-400/60 bg-blue-500/15 text-blue-200'
                            : 'border-[var(--ui-border-soft)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)]'
                        }`}
                        title="快捷修改优先级"
                      >
                        {level === 2 ? '高' : level === 1 ? '中' : '低'}
                      </button>
                    ))}
                  </>
                )}
                {onQuickSetDuePreset && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickSetDuePreset(task.id, 'today');
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)]"
                      title="快捷设置时间：今天 09:00"
                    >
                      今天
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickSetDuePreset(task.id, 'tomorrow');
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)]"
                      title="快捷设置时间：明天 09:00"
                    >
                      明天
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickSetDuePreset(task.id, 'nextWeek');
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)]"
                      title="快捷设置时间：下周一 09:00"
                    >
                      下周
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickSetDuePreset(task.id, 'tonight');
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--ui-border-soft)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)] hover:border-[rgba(var(--theme-accent),0.3)] flex items-center gap-1"
                      title="快捷设置时间：今晚 20:00"
                    >
                      <Bell className="w-3 h-3" />
                      今晚
                    </button>
                  </>
                )}
              </div>
            </div>
            {hasSubtasks && (
              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-[var(--motion-slow)] ease-out ${isSubtasksOpen ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-3">
                {(task.subtasks ?? []).map((subtask: Subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 rounded-xl bg-[rgba(255,255,255,0.02)] px-2 py-1.5 text-[10px] sm:text-[11px]">
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
                        <Circle className="w-3.5 h-3.5 text-[#666f80]" />
                      )}
                    </button>
                    <span className={subtask.completed ? 'line-through text-[color:var(--ui-text-faint)]' : 'text-[color:var(--ui-text-primary)]'}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div
            className="fixed z-50 min-w-[180px] rounded-[22px] border border-[var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)] backdrop-blur-xl shadow-[0_22px_48px_rgba(15,23,42,0.18)] overflow-hidden"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                onCopyTitle?.(task);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-[color:var(--ui-text-primary)] hover:bg-[var(--state-hover-bg)]"
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
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-[color:var(--ui-text-primary)] hover:bg-[var(--state-hover-bg)]"
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
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-[color:var(--ui-text-primary)] hover:bg-[var(--state-hover-bg)]"
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
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-300 hover:bg-[rgba(239,68,68,0.08)]"
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

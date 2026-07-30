import { CalendarDays, CalendarRange, CheckCircle2, Clock3, Eye, EyeOff, Inbox, ListTodo, Plus, Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SelectOption = { value: string; label: string };
type TaskScope = 'todo' | 'inbox' | 'today' | 'next7';
type TaskScopeOption = {
  value: TaskScope;
  label: string;
  count: number;
  hint: string;
};

type ListComposerPanelProps = {
  totalTasks: number;
  completionRate: number;
  procrastinationIndex: number;
  completedTasks: number;
  showCompletedTasks: boolean;
  loading: boolean;
  input: string;
  showQuickAdd?: boolean;
  isBatchMode: boolean;
  selectedCount: number;
  taskSortMode: string;
  taskGroupMode: string;
  taskScope?: TaskScope;
  taskScopeOptions?: TaskScopeOption[];
  sortOptions: SelectOption[];
  groupOptions: SelectOption[];
  setInput: (value: string) => void;
  onMagicSubmit: () => void;
  onBatchComplete: () => void;
  onBatchDelete: () => void;
  onBatchClear: () => void;
  onToggleShowCompleted: () => void;
  onClearCompleted: () => void;
  onTaskSortModeChange: (mode: string) => void;
  onTaskGroupModeChange: (mode: string) => void;
  onTaskScopeChange?: (scope: TaskScope) => void;
};

const TASK_PLACEHOLDERS = [
  '今晚 9 点整理明天会议材料 #工作',
  '周五前预约牙医，顺手把报告发给小王',
  '买猫粮和咖啡豆，回家路上顺手完成',
  '明早 8:30 复盘本周计划，标记优先级',
  '给妈妈回电话，备注一下体检时间',
  '把新功能验收清单补完 #Recall',
];

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

const TASK_SCOPE_ICONS: Record<TaskScope, typeof CheckCircle2> = {
  todo: ListTodo,
  inbox: Inbox,
  today: CalendarDays,
  next7: CalendarRange,
};

const MetricProgressPill = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: 'success' | 'risk';
}) => {
  const percent = clampPercent(value);
  const isRisk = tone === 'risk';
  const barClassName = isRisk
    ? 'from-rose-400 via-orange-400 to-amber-300'
    : 'from-emerald-400 via-teal-400 to-sky-400';
  const iconClassName = isRisk
    ? 'border-rose-400/25 bg-rose-400/10 text-rose-400'
    : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400';

  return (
    <div className="app-micro-card min-w-0 rounded-2xl px-2 py-1.5 lg:min-w-[132px] lg:px-2.5 lg:py-1.5">
      <div className="flex items-center gap-1.5 lg:gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border lg:h-7 lg:w-7 ${iconClassName}`}>
          <Icon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10px] font-medium text-[color:var(--ui-text-secondary)] lg:text-[11px]">{label}</span>
            <span className="text-xs font-semibold tabular-nums text-[color:var(--ui-text-strong)] lg:text-[13px]">{percent}%</span>
          </div>
          <div
            className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--ui-hover-bg)] lg:mt-1.5 lg:h-1.5"
            role="progressbar"
            aria-label={`${label} ${percent}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barClassName} transition-[width] duration-500 ease-out`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 列表视图下的输入与批量工具区：
 * - 统计信息
 * - 快速新增任务
 * - 批量动作 + 排序分组选项
 */
export default function ListComposerPanel({
  totalTasks,
  completionRate,
  procrastinationIndex,
  completedTasks,
  showCompletedTasks,
  loading,
  input,
  showQuickAdd = true,
  isBatchMode,
  selectedCount,
  taskSortMode,
  taskGroupMode,
  taskScope,
  taskScopeOptions,
  sortOptions,
  groupOptions,
  setInput,
  onMagicSubmit,
  onBatchComplete,
  onBatchDelete,
  onBatchClear,
  onToggleShowCompleted,
  onClearCompleted,
  onTaskSortModeChange,
  onTaskGroupModeChange,
  onTaskScopeChange,
}: ListComposerPanelProps) {
  const [randomPlaceholder, setRandomPlaceholder] = useState(TASK_PLACEHOLDERS[0]);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const index = Math.floor(Math.random() * TASK_PLACEHOLDERS.length);
    setRandomPlaceholder(TASK_PLACEHOLDERS[index]);
  }, []);

  const submitComposer = () => {
    if (!input.trim() || loading) return;
    onMagicSubmit();
  };
  const shouldShowTaskScopes = Boolean(taskScope && taskScopeOptions?.length && onTaskScopeChange);

  return (
    <>
    <div className="recall-composer theme-native-surface px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="app-toolbar rounded-[20px] px-2.5 py-2 lg:rounded-[22px] lg:px-3 lg:py-2.5">
        {shouldShowTaskScopes && (
          <div className="recall-scope-tabs mb-2 grid grid-cols-2 gap-1.5 rounded-[16px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/35 p-1 sm:flex sm:items-center">
            {taskScopeOptions?.map((option) => {
              const active = option.value === taskScope;
              const ScopeIcon = TASK_SCOPE_ICONS[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTaskScopeChange?.(option.value)}
                  title={option.hint}
                  aria-pressed={active}
                  className={`group/scope flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-[14px] px-2.5 py-1.5 text-left text-[11px] transition-all sm:px-3 ${
                    active
                      ? 'bg-[rgba(var(--theme-accent),0.15)] text-[color:var(--ui-text-strong)] shadow-[inset_0_0_0_1px_rgba(var(--theme-accent),0.22)]'
                      : 'text-[color:var(--ui-text-secondary)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <ScopeIcon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        active ? 'text-[color:var(--ui-text-strong)]' : 'text-[color:var(--ui-text-muted)] group-hover/scope:text-[color:var(--ui-text-secondary)]'
                      }`}
                    />
                    <span className="truncate font-semibold">{option.label}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active
                      ? 'bg-[rgba(var(--theme-accent),0.18)] text-[color:var(--ui-text-strong)]'
                      : 'bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] group-hover/scope:text-[color:var(--ui-text-secondary)]'
                  }`}>
                    {option.count > 99 ? '99+' : option.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {showQuickAdd && (
          <div className="recall-quick-add mb-2 flex items-center gap-2 rounded-[12px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 py-2 sm:px-3">
            <Plus className="h-4 w-4 shrink-0 text-[color:var(--ui-text-muted)]" aria-hidden="true" />
            <input
              ref={quickInputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitComposer();
                }
              }}
              placeholder={randomPlaceholder}
              className="min-w-0 flex-1 border-none bg-transparent px-1 py-1 text-sm text-[color:var(--ui-text-strong)] outline-none placeholder:text-[color:var(--ui-text-muted)]"
              disabled={loading}
              aria-label="快速添加任务"
            />
            <button
              type="button"
              onClick={submitComposer}
              disabled={!input.trim() || loading}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(var(--theme-accent),0.16)] text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[rgba(var(--theme-accent),0.26)] hover:text-[color:var(--ui-text-strong)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={loading ? '正在创建任务' : '创建任务'}
              title={loading ? '正在创建任务' : '创建任务'}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
            <kbd className="hidden rounded-md border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--ui-text-muted)] sm:inline-flex">Enter</kbd>
          </div>
        )}

        <div className="recall-composer-controls grid gap-2 text-xs text-[color:var(--ui-text-secondary)] lg:flex lg:flex-wrap lg:items-center lg:gap-2.5">
          {totalTasks > 0 && (
            <div className="recall-composer-metrics grid min-w-0 grid-cols-2 gap-2 lg:flex lg:flex-1 lg:flex-wrap lg:items-center">
              <MetricProgressPill
                icon={CheckCircle2}
                label="完成率"
                value={completionRate}
                tone="success"
              />
              <MetricProgressPill
                icon={Clock3}
                label="拖延指数"
                value={procrastinationIndex}
                tone="risk"
              />
              <span className="hidden rounded-full border border-[color:var(--ui-border-soft)] px-2 py-1 text-[10px] text-[color:var(--ui-text-muted)] lg:inline-flex">
                实时 · {totalTasks} 项
              </span>
            </div>
          )}

          {isBatchMode && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-transparent px-2 py-1 lg:w-auto">
              <span className="px-1 text-[11px] text-[color:var(--ui-text-secondary)]">已选 {selectedCount}</span>
              <button
                type="button"
                onClick={onBatchComplete}
                disabled={selectedCount === 0}
                className="rounded-full px-2 py-0.5 text-[11px] text-blue-300 transition-colors hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                完成
              </button>
              <button
                type="button"
                onClick={onBatchDelete}
                disabled={selectedCount === 0}
                className="rounded-full px-2 py-0.5 text-[11px] text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                删除
              </button>
              <button
                type="button"
                onClick={onBatchClear}
                disabled={selectedCount === 0}
                className="rounded-full px-2 py-0.5 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                清空
              </button>
            </div>
          )}

          <div className="recall-composer-actions grid min-w-0 grid-cols-2 gap-2 lg:ml-auto lg:flex lg:flex-wrap lg:items-center">
            {completedTasks > 0 ? (
              <button
                type="button"
                onClick={onToggleShowCompleted}
                className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors lg:px-3 lg:text-[12px] ${
                  showCompletedTasks
                    ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
                    : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] text-[color:var(--ui-text-primary)] hover:border-[color:var(--ui-border-strong)]'
                }`}
                title={showCompletedTasks ? '隐藏已完成任务' : '显示已完成任务'}
                aria-pressed={showCompletedTasks}
              >
                {showCompletedTasks ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span className="truncate">{showCompletedTasks ? '隐藏已完成' : '显示已完成'}</span>
                <span className="rounded-full bg-[rgba(var(--theme-accent),0.10)] px-1.5 py-0.5 text-[10px] tabular-nums">
                  {completedTasks > 99 ? '99+' : completedTasks}
                </span>
              </button>
            ) : null}

            {showCompletedTasks && completedTasks > 0 ? (
              <button
                type="button"
                onClick={onClearCompleted}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/15 hover:text-rose-200 lg:px-3 lg:text-[12px]"
                title="清空已完成任务"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="truncate">清空已完成</span>
              </button>
            ) : null}

            <label htmlFor="task-sort-mode" className="sr-only">排序</label>
            <select
              id="task-sort-mode"
              value={taskSortMode}
              onChange={(event) => onTaskSortModeChange(event.target.value)}
              className="min-w-0 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 py-1.5 text-[11px] text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-[rgba(var(--theme-accent),0.55)] lg:px-3 lg:text-[12px]"
              aria-label="排序方式"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  排序：{option.label}
                </option>
              ))}
            </select>

            <label htmlFor="task-group-mode" className="sr-only">分组</label>
            <select
              id="task-group-mode"
              value={taskGroupMode}
              onChange={(event) => onTaskGroupModeChange(event.target.value)}
              className="min-w-0 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 py-1.5 text-[11px] text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-[rgba(var(--theme-accent),0.55)] lg:px-3 lg:text-[12px]"
              aria-label="分组方式"
            >
              {groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  分组：{option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {taskSortMode === 'manual' && taskGroupMode !== 'none' ? (
          <div className="mt-2 px-1 text-[11px] text-[color:var(--ui-text-muted)]">分组中暂不支持拖动排序</div>
        ) : null}
      </div>
    </div>
    </>
  );
}

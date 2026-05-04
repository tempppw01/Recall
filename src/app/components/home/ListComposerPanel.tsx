import { Plus, Send, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';

type SelectOption = { value: string; label: string };

type ListComposerPanelProps = {
  totalTasks: number;
  completionRate: number;
  procrastinationIndex: number;
  loading: boolean;
  input: string;
  showQuickAdd?: boolean;
  isBatchMode: boolean;
  selectedCount: number;
  taskSortMode: string;
  taskGroupMode: string;
  sortOptions: SelectOption[];
  groupOptions: SelectOption[];
  setInput: (value: string) => void;
  onMagicSubmit: () => void;
  onBatchComplete: () => void;
  onBatchDelete: () => void;
  onBatchClear: () => void;
  onTaskSortModeChange: (mode: string) => void;
  onTaskGroupModeChange: (mode: string) => void;
};

const TASK_PLACEHOLDERS = [
  '今晚 9 点整理明天会议材料 #工作',
  '周五前预约牙医，顺手把报告发给小王',
  '买猫粮和咖啡豆，回家路上顺手完成',
  '明早 8:30 复盘本周计划，标记优先级',
  '给妈妈回电话，备注一下体检时间',
  '把新功能验收清单补完 #Recall',
];

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
  loading,
  input,
  showQuickAdd = true,
  isBatchMode,
  selectedCount,
  taskSortMode,
  taskGroupMode,
  sortOptions,
  groupOptions,
  setInput,
  onMagicSubmit,
  onBatchComplete,
  onBatchDelete,
  onBatchClear,
  onTaskSortModeChange,
  onTaskGroupModeChange,
}: ListComposerPanelProps) {
  const [randomPlaceholder, setRandomPlaceholder] = useState(TASK_PLACEHOLDERS[0]);
  const [isMetaPanelOpen, setIsMetaPanelOpen] = useState(false);

  useEffect(() => {
    const index = Math.floor(Math.random() * TASK_PLACEHOLDERS.length);
    setRandomPlaceholder(TASK_PLACEHOLDERS[index]);
  }, []);

  const appendInputToken = (token: string) => {
    const nextInput = `${input.trim()}${input.trim() ? ' ' : ''}${token}`.trim();
    setInput(nextInput);
  };

  return (
    <div className="theme-native-surface px-3 sm:px-6 pt-4 sm:pt-5">
      <div className="glass-panel rounded-[30px] border-[color:var(--ui-border-strong)] px-3.5 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[color:var(--ui-text-secondary)]">
          {totalTasks > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-2.5 py-1">
                完成率 <span className="text-[color:var(--ui-text-strong)]">{completionRate}%</span>
              </span>
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-2.5 py-1">
                拖延 <span className="text-[color:var(--ui-text-strong)]">{procrastinationIndex}%</span>
              </span>
            </div>
          )}

          {isBatchMode && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-2 py-1">
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

          <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-auto">
            <label htmlFor="task-sort-mode" className="sr-only">排序</label>
            <select
              id="task-sort-mode"
              value={taskSortMode}
              onChange={(event) => onTaskSortModeChange(event.target.value)}
              className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-1.5 text-[12px] text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-[rgba(var(--theme-accent),0.55)]"
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
              className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-1.5 text-[12px] text-[color:var(--ui-text-primary)] outline-none transition-colors hover:border-[color:var(--ui-border-strong)] focus:border-[rgba(var(--theme-accent),0.55)]"
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

        {showQuickAdd && (
          <div className="group relative mt-3">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[rgba(var(--theme-grad-start),0.16)] via-[rgba(var(--theme-accent),0.08)] to-[rgba(var(--theme-grad-end),0.16)] blur-xl opacity-70 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 rounded-[26px] border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-card-bg)] px-3.5 py-2.5 transition-all focus-within:border-[rgba(var(--theme-accent),0.36)] focus-within:bg-[color:var(--ui-card-hover-bg)] sm:px-4">
              {loading ? (
                <div className="skeleton skeleton-shimmer h-9 w-9 shrink-0 rounded-xl" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)]">
                  <Plus className="h-[18px] w-[18px] text-blue-300" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onMagicSubmit()}
                  placeholder={randomPlaceholder}
                  className="min-w-[12rem] flex-1 border-none bg-transparent text-sm text-[color:var(--ui-text-strong)] outline-none placeholder:text-[color:var(--ui-text-muted)]"
                  disabled={loading}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsMetaPanelOpen((previous) => !previous);
                    }}
                    className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2.5 text-[11px] text-[color:var(--ui-text-muted)] transition-colors hover:border-[rgba(var(--theme-accent),0.32)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
                    aria-expanded={isMetaPanelOpen}
                    aria-label="打开任务属性快捷项"
                    title="备注 / 日期 / 优先级 / 标签"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    备注 / 日期 / 优先级 / 标签
                  </button>

                  {isMetaPanelOpen && (
                    <div
                      className="absolute right-0 top-full z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)] p-2.5 shadow-[0_18px_38px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          ['高', '高优先级'],
                          ['中', '中优先级'],
                          ['低', '低优先级'],
                          ['标签', '#Recall'],
                          ['今天', '今天'],
                          ['明天', '明天'],
                          ['今晚', '今晚'],
                          ['备注', '备注：'],
                        ].map(([label, token]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              appendInputToken(token);
                              setIsMetaPanelOpen(false);
                            }}
                            className="h-7 rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-2 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {input && (
                <button onClick={onMagicSubmit} className="btn btn-primary btn-md rounded-2xl shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {taskSortMode === 'manual' && taskGroupMode !== 'none' && (
          <div className="mt-2 px-1 text-[11px] text-[color:var(--ui-text-muted)]">手动排序在分组时不可拖动</div>
        )}
      </div>
    </div>
  );
}

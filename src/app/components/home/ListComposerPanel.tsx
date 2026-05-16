import { Plus, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const [isQuickComposerOpen, setIsQuickComposerOpen] = useState(false);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const index = Math.floor(Math.random() * TASK_PLACEHOLDERS.length);
    setRandomPlaceholder(TASK_PLACEHOLDERS[index]);
  }, []);

  useEffect(() => {
    if (!isQuickComposerOpen) return;

    const focusTimer = window.setTimeout(() => {
      quickInputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isQuickComposerOpen]);

  const appendInputToken = (token: string) => {
    const nextInput = `${input.trim()}${input.trim() ? ' ' : ''}${token}`.trim();
    setInput(nextInput);
  };

  const submitComposer = () => {
    if (!input.trim() || loading) return;
    onMagicSubmit();
  };

  return (
    <>
    <div className="theme-native-surface px-3 sm:px-6 pt-4 sm:pt-5">
      <div className="rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 sm:px-3.5 sm:py-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[color:var(--ui-text-secondary)]">
          {totalTasks > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-transparent px-2.5 py-1">
                完成率 <span className="text-[color:var(--ui-text-strong)]">{completionRate}%</span>
              </span>
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-transparent px-2.5 py-1">
                拖延 <span className="text-[color:var(--ui-text-strong)]">{procrastinationIndex}%</span>
              </span>
            </div>
          )}

          {isBatchMode && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-transparent px-2 py-1">
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

        {taskSortMode === 'manual' && taskGroupMode !== 'none' ? (
          <div className="mt-2 px-1 text-[11px] text-[color:var(--ui-text-muted)]">分组中暂不支持拖动排序</div>
        ) : null}
      </div>
    </div>
    {showQuickAdd && (
      <>
        {isQuickComposerOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[55] cursor-default bg-transparent"
            aria-label="关闭快速创建任务"
            onClick={() => setIsQuickComposerOpen(false)}
          />
        )}

        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:right-6">
          {isQuickComposerOpen && (
            <div
              className="motion-modal-surface w-[min(30rem,calc(100vw-2rem))] rounded-[24px] border border-[rgba(var(--theme-accent-soft),0.18)] bg-[color:var(--ui-modal-bg)] p-3 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <div className="text-sm font-semibold text-[color:var(--ui-text-strong)]">快速创建</div>
                <button
                  type="button"
                  onClick={() => setIsQuickComposerOpen(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
                  aria-label="收起快速创建任务"
                  title="收起"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] p-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={quickInputRef}
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        submitComposer();
                      }
                    }}
                    placeholder={randomPlaceholder}
                    className="min-w-0 flex-1 border-none bg-transparent px-2 py-2 text-sm text-[color:var(--ui-text-strong)] outline-none placeholder:text-[color:var(--ui-text-muted)]"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={submitComposer}
                    disabled={!input.trim() || loading}
                    className="btn btn-primary h-10 w-10 shrink-0 rounded-2xl p-0 shadow-[0_10px_24px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={loading ? '正在创建任务' : '创建任务'}
                    title={loading ? '正在创建任务' : '创建任务'}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[rgba(255,255,255,0.05)] pt-2">
                  {[
                    ['高', '高优先级'],
                    ['中', '中优先级'],
                    ['低', '低优先级'],
                    ['#标签', '#Recall'],
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
                        quickInputRef.current?.focus();
                      }}
                      className="h-7 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-2.5 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-[rgba(var(--theme-accent),0.3)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsQuickComposerOpen((previous) => !previous)}
            className={`motion-card motion-press surface-sheen inline-flex h-14 w-14 items-center justify-center rounded-[22px] border border-[rgba(var(--theme-accent),0.34)] bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.92),rgba(var(--theme-grad-end),0.82))] text-white shadow-[0_18px_42px_rgba(var(--theme-accent),0.26)] transition-transform hover:scale-[1.03] ${
              isQuickComposerOpen ? 'rotate-45' : ''
            }`}
            aria-label={isQuickComposerOpen ? '收起快速创建任务' : '展开快速创建任务'}
            title={isQuickComposerOpen ? '收起快速创建任务' : '新建任务'}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </>
    )}
    </>
  );
}

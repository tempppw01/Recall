import { Plus, Send } from 'lucide-react';

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
  return (
    <div className="px-3 sm:px-6 pt-4 sm:pt-5">
      <div className="glass-panel rounded-[30px] px-4 py-4 sm:px-5 sm:py-5 space-y-4 border-[color:var(--ui-border-strong)]">
        {totalTasks > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs text-[#777777]">
            <span className="glass-card px-2.5 py-1 rounded-full">
              完成率：<span className="text-[#F1F1F1]">{completionRate}%</span>
            </span>
            <span className="glass-card px-2.5 py-1 rounded-full">
              拖延指数：<span className="text-[#F1F1F1]">{procrastinationIndex}%</span>
            </span>
            <span className="text-[#5E5E5E]">别担心，它只是提醒你别太完美。</span>
          </div>
        )}

        {showQuickAdd && (
          <div className="relative group">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[rgba(var(--theme-grad-start),0.16)] via-[rgba(var(--theme-accent),0.08)] to-[rgba(var(--theme-grad-end),0.16)] blur-xl opacity-70 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative glass-panel-soft flex items-start gap-3 rounded-[28px] border-[color:var(--ui-border-strong)] px-4 sm:px-5 py-3.5 sm:py-4 focus-within:border-[rgba(var(--theme-accent),0.28)] transition-all">
              {loading ? (
                <div className="skeleton skeleton-shimmer rounded-xl h-9 w-9 shrink-0" />
              ) : (
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)]">
                  <Plus className="w-5 h-5 text-blue-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#6d7483]">创建任务</div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onMagicSubmit()}
                  placeholder="写下任务标题…（例如：明天提醒我给小王打电话 #工作）"
                  className="mt-1.5 flex-1 w-full bg-transparent border-none outline-none text-sm text-[#ECECEC] placeholder-[#666666]"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#7d8595]">
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2 py-1">备注</span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2 py-1">日期</span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2 py-1">优先级</span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2 py-1">标签</span>
                </div>
              </div>
              {input && (
                <button onClick={onMagicSubmit} className="btn btn-primary btn-md mt-1 rounded-2xl self-center shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#666666] pt-1">
          {isBatchMode && (
            <div className="glass-card flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
              <span className="text-[11px] text-[#A0A0A0]">已选 {selectedCount}</span>
              <button
                type="button"
                onClick={onBatchComplete}
                disabled={selectedCount === 0}
                className="px-2.5 py-1 text-[11px] rounded-xl border border-blue-500/50 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                批量完成
              </button>
              <button
                type="button"
                onClick={onBatchDelete}
                disabled={selectedCount === 0}
                className="px-2.5 py-1 text-[11px] rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                批量删除
              </button>
              <button
                type="button"
                onClick={onBatchClear}
                disabled={selectedCount === 0}
                className="px-2.5 py-1 text-[11px] rounded-xl border border-[#3A3F4B]/50 text-[#A0A0A0] hover:text-white hover:border-[#555D6D] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清空选择
              </button>
            </div>
          )}

          <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="task-sort-mode" className="text-[11px] uppercase text-[#6F6F6F]">排序</label>
              <select
                id="task-sort-mode"
                value={taskSortMode}
                onChange={(event) => onTaskSortModeChange(event.target.value)}
                className="bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-lg px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="task-group-mode" className="text-[11px] uppercase text-[#6F6F6F]">分组</label>
              <select
                id="task-group-mode"
                value={taskGroupMode}
                onChange={(event) => onTaskGroupModeChange(event.target.value)}
                className="bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-lg px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
              >
                {groupOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {taskSortMode === 'manual' && taskGroupMode !== 'none' && (
            <span className="text-[11px] text-[#5B5B5B]">手动排序在分组时不可拖动</span>
          )}
        </div>
      </div>
    </div>
  );
}

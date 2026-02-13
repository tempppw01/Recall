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
 * - 批量动作 + 排序分组
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
    <div className="px-3 sm:px-6 py-4 sm:py-5">
      {/* 紧凑统计条：不占空间，仅在有任务时展示 */}
      {totalTasks > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-[#777777]">
          <span className="px-2 py-1 rounded-full bg-[#1F1F1F] border border-[#2B2B2B]">
            完成率：<span className="text-[#DDDDDD]">{completionRate}%</span>
          </span>
          <span className="px-2 py-1 rounded-full bg-[#1F1F1F] border border-[#2B2B2B]">
            拖延指数：<span className="text-[#DDDDDD]">{procrastinationIndex}%</span>
          </span>
          <span className="text-[#555555]">别担心，它只是提醒你别太完美。</span>
        </div>
      )}

      {showQuickAdd && (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3 bg-[#262626] border border-[#333333] rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm focus-within:border-[#444444] focus-within:ring-1 focus-within:ring-[#444444] transition-all">
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#444444] border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5 text-blue-500" />
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onMagicSubmit()}
              placeholder="新增任务…（例如：明天提醒我给小王打电话 #工作）"
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder-[#555555]"
              disabled={loading}
            />
            {input && (
              <button onClick={onMagicSubmit} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
        {isBatchMode && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#888888]">已选 {selectedCount}</span>
            <button
              type="button"
              onClick={onBatchComplete}
              disabled={selectedCount === 0}
              className="px-2.5 py-1 text-[11px] rounded border border-blue-500 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              批量完成
            </button>
            <button
              type="button"
              onClick={onBatchDelete}
              disabled={selectedCount === 0}
              className="px-2.5 py-1 text-[11px] rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              批量删除
            </button>
            <button
              type="button"
              onClick={onBatchClear}
              disabled={selectedCount === 0}
              className="px-2.5 py-1 text-[11px] rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空选择
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="task-sort-mode" className="text-[11px] uppercase text-[#666666]">排序</label>
          <select
            id="task-sort-mode"
            value={taskSortMode}
            onChange={(event) => onTaskSortModeChange(event.target.value)}
            className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="task-group-mode" className="text-[11px] uppercase text-[#666666]">分组</label>
          <select
            id="task-group-mode"
            value={taskGroupMode}
            onChange={(event) => onTaskGroupModeChange(event.target.value)}
            className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
          >
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {taskSortMode === 'manual' && taskGroupMode !== 'none' && (
          <span className="text-[11px] text-[#555555]">手动排序在分组时不可拖动</span>
        )}
      </div>
    </div>
  );
}

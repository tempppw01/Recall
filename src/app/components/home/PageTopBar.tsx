import { Cloud, Flame, Inbox, Loader2, Menu, Monitor, Moon, Sun, Terminal } from 'lucide-react';

type ThemePreference = 'system' | 'light' | 'dark';

type PageTopBarProps = {
  activeFilter: string;
  headerTitle: string;
  isListView: boolean;
  isBatchMode: boolean;
  completedTasks: number;
  isSyncingNow: boolean;
  themePreference: ThemePreference;
  onOpenSidebar: () => void;
  onToggleBatchMode: () => void;
  onSync: () => void;
  onClearCompleted: () => void;
  onOpenLogs: () => void;
  onToggleTheme: () => void;
};

/**
 * 页面顶部操作栏：只负责全局入口和状态按钮，保持 page.tsx 结构更清晰。
 */
export default function PageTopBar({
  activeFilter,
  headerTitle,
  isListView,
  isBatchMode,
  completedTasks,
  isSyncingNow,
  themePreference,
  onOpenSidebar,
  onToggleBatchMode,
  onSync,
  onClearCompleted,
  onOpenLogs,
  onToggleTheme,
}: PageTopBarProps) {
  return (
    <header className="h-12 sm:h-14 border-b border-[#333333] flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur">
      <div className="flex items-center gap-4">
        <button onClick={onOpenSidebar} className="lg:hidden p-1 -ml-1 text-[#888888] hover:text-[#CCCCCC]">
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0">
          {activeFilter === 'inbox' && <Inbox className="w-5 h-5 text-blue-500" />}
          {activeFilter === 'today' && <Sun className="w-5 h-5 text-yellow-500" />}
          {activeFilter === 'habit' && <Flame className="w-5 h-5 text-orange-400" />}
          <span className="truncate">{headerTitle}</span>
        </h2>
      </div>

      <div className="mobile-toolbar flex items-center gap-3 sm:gap-4 text-[#666666]">
        {isListView && (
          <button
            onClick={onToggleBatchMode}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              isBatchMode
                ? 'border-blue-400 text-blue-200 bg-blue-500/10'
                : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
            }`}
            title={isBatchMode ? '退出批量模式' : '批量选择'}
          >
            {isBatchMode ? '退出批量' : '批量'}
          </button>
        )}

        <button
          onClick={onSync}
          className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
          title={isSyncingNow ? '同步中…' : '云同步（异步队列）'}
          disabled={isSyncingNow}
        >
          {isSyncingNow ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-400" />
          ) : (
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {activeFilter === 'completed' && completedTasks > 0 && (
          <button
            onClick={onClearCompleted}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
            title="清除已完成"
          >
            清除已完成
          </button>
        )}

        <button
          onClick={onOpenLogs}
          className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
          title="运行日志"
        >
          <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
          title={
            themePreference === 'system'
              ? '主题模式：跟随设备（点击切换）'
              : themePreference === 'light'
                ? '主题模式：日间（点击切换）'
                : '主题模式：夜间（点击切换）'
          }
        >
          {themePreference === 'system' ? (
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : themePreference === 'light' ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>
    </header>
  );
}

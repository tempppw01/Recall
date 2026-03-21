import { Cloud, Flame, Inbox, Loader2, Menu, Monitor, Moon, Sun, Terminal } from 'lucide-react';

const iconButtonClassName = 'btn btn-ghost h-10 w-10 rounded-2xl border-[color:var(--ui-border-soft)] p-0 text-[#9aa3b2] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed';
const actionButtonClassName = 'btn btn-secondary btn-sm rounded-2xl border text-xs';

type ThemePreference = 'system' | 'light' | 'dark';

type PageTopBarProps = {
  activeFilter: string;
  headerTitle: string;
  headerSubtitle?: string;
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
  headerSubtitle,
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
    <header className="sticky top-0 z-20 sticky-glass bg-[rgba(15,17,22,0.68)] backdrop-blur-2xl shadow-[0_14px_36px_rgba(0,0,0,0.14)]">
      <div className="mx-2 mt-3 rounded-[28px] glass-panel px-3.5 py-3.5 sm:mx-4 sm:px-5 lg:mx-6 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <button onClick={onOpenSidebar} className={`lg:hidden -ml-1 mt-0.5 ${iconButtonClassName}`}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-[1.05rem] font-semibold tracking-tight flex items-center gap-2.5 min-w-0 text-[#f3f6ff]">
                {activeFilter === 'inbox' && <Inbox className="w-5 h-5 text-blue-400" />}
                {activeFilter === 'today' && <Sun className="w-5 h-5 text-yellow-400" />}
                {activeFilter === 'habit' && <Flame className="w-5 h-5 text-orange-400" />}
                <span className="truncate">{headerTitle}</span>
              </h2>
              {headerSubtitle && (
                <p className="mt-1 text-xs text-[#8f99ad] truncate">{headerSubtitle}</p>
              )}
            </div>
          </div>

          <div className="mobile-toolbar flex items-center gap-2 sm:gap-3 text-[#667085] shrink-0">
            {isListView && (
              <button
                onClick={onToggleBatchMode}
                className={`${actionButtonClassName} ${
                  isBatchMode
                    ? 'border-blue-400/60 text-blue-100 bg-blue-500/12 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                    : 'border-[#3A3F4B]/50 text-[#9A9A9A] hover:text-white hover:border-[#555D6D] hover:bg-[#23262E]'
                }`}
                title={isBatchMode ? '退出批量模式' : '批量选择'}
              >
                {isBatchMode ? '退出批量' : '批量'}
              </button>
            )}

            <button
              onClick={onSync}
              className={iconButtonClassName}
              title={isSyncingNow ? '同步中…' : '云同步（异步队列）'}
              disabled={isSyncingNow}
            >
              {isSyncingNow ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-400" />
              ) : (
                <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {isSyncingNow && (
              <div className="skeleton skeleton-shimmer hidden sm:flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-300" />
                同步队列处理中
              </div>
            )}

            {activeFilter === 'completed' && completedTasks > 0 && (
              <button
                onClick={onClearCompleted}
                className={`${actionButtonClassName} text-xs sm:text-sm border-red-500/35 text-red-300 hover:bg-red-500/10`}
                title="清除已完成"
              >
                清除已完成
              </button>
            )}

            <button
              onClick={onOpenLogs}
              className={iconButtonClassName}
              title="运行日志"
            >
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={onToggleTheme}
              className={iconButtonClassName}
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
        </div>
      </div>
    </header>
  );
}

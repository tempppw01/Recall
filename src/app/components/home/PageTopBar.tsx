import { Cloud, Flame, Inbox, Info, Loader2, Menu, Monitor, Moon, Settings, Sun, Terminal } from 'lucide-react';

const iconButtonClassName =
  'btn btn-ghost motion-card surface-sheen h-10 w-10 rounded-2xl border-[color:var(--ui-border-soft)] p-0 text-[color:var(--ui-icon-muted)] hover:text-[color:var(--ui-text-strong)] disabled:cursor-not-allowed disabled:opacity-50';
const actionButtonClassName = 'btn btn-secondary btn-sm motion-card surface-sheen rounded-2xl border text-xs';
const utilityGroupClassName =
  'ml-1 flex items-center gap-1.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-1.5 py-1';

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
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenLogs: () => void;
  onToggleTheme: () => void;
};

const getThemeToggleLabel = (themePreference: ThemePreference) => {
  if (themePreference === 'system') return '当前主题：跟随系统，点击切换';
  if (themePreference === 'light') return '当前主题：浅色，点击切换';
  return '当前主题：深色，点击切换';
};

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
  onOpenSettings,
  onOpenAbout,
  onOpenLogs,
  onToggleTheme,
}: PageTopBarProps) {
  return (
    <header className="theme-native-surface sticky top-0 z-20 sticky-glass bg-[var(--ui-header-bg)] backdrop-blur-2xl">
      <div className="mx-2 mt-3 rounded-[28px] glass-panel surface-sheen surface-pulse px-3.5 py-3.5 sm:mx-4 sm:px-5 lg:mx-6 lg:px-6">
        <div className="flex min-h-10 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={onOpenSidebar}
              className={`lg:hidden -ml-1 ${iconButtonClassName}`}
              aria-label="打开导航"
              title="打开导航"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="min-w-0">
              <h2 className="flex min-w-0 items-center gap-2.5 text-base font-semibold tracking-tight text-[color:var(--ui-text-strong)] sm:text-[1.05rem]">
                {activeFilter === 'inbox' && <Inbox className="h-5 w-5 text-blue-400" />}
                {activeFilter === 'today' && <Sun className="h-5 w-5 text-yellow-400" />}
                {activeFilter === 'habit' && <Flame className="h-5 w-5 text-orange-400" />}
                <span className="truncate">{headerTitle}</span>
              </h2>
              {headerSubtitle && (
                <p className="mt-1 truncate text-xs text-[color:var(--ui-text-secondary)]">{headerSubtitle}</p>
              )}
            </div>
          </div>

          <div className="mobile-toolbar flex shrink-0 items-center gap-2 text-[color:var(--ui-icon-muted)] sm:gap-3">
            {isListView && (
              <button
                onClick={onToggleBatchMode}
                className={`${actionButtonClassName} ${
                  isBatchMode
                    ? 'border-blue-400/60 bg-blue-500/12 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                    : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                }`}
                title={isBatchMode ? '退出批量模式' : '批量选择'}
              >
                {isBatchMode ? '退出批量' : '批量'}
              </button>
            )}

            <button
              onClick={onSync}
              className={iconButtonClassName}
              title={isSyncingNow ? '正在同步' : '执行同步'}
              aria-label={isSyncingNow ? '正在同步' : '执行同步'}
              disabled={isSyncingNow}
            >
              {isSyncingNow ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400 sm:h-5 sm:w-5" />
              ) : (
                <Cloud className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            {isSyncingNow && (
              <div className="skeleton skeleton-shimmer hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-blue-100 sm:flex">
                <span className="icon-halo float-bob h-2 w-2 rounded-full bg-blue-300" />
                同步队列处理中
              </div>
            )}

            {activeFilter === 'completed' && completedTasks > 0 && (
              <button
                onClick={onClearCompleted}
                className={`${actionButtonClassName} border-red-500/35 text-xs text-red-300 hover:bg-red-500/10 sm:text-sm`}
                title="清空已完成"
              >
                清空已完成
              </button>
            )}

            <button
              onClick={onOpenLogs}
              className={iconButtonClassName}
              title="运行日志"
              aria-label="打开运行日志"
            >
              <Terminal className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={onToggleTheme}
              className={iconButtonClassName}
              title={getThemeToggleLabel(themePreference)}
              aria-label={getThemeToggleLabel(themePreference)}
            >
              {themePreference === 'system' ? (
                <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : themePreference === 'light' ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            <div className={utilityGroupClassName}>
              <button
                onClick={onOpenSettings}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-9 sm:px-3 sm:text-xs"
                title="打开设置"
                aria-label="打开设置面板"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">设置</span>
              </button>

              <button
                onClick={onOpenAbout}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-9 sm:px-3 sm:text-xs"
                title="关于 Recall"
                aria-label="打开关于 Recall"
              >
                <Info className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">关于</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

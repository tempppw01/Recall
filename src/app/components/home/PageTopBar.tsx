import { Cloud, Flame, Inbox, Info, Loader2, Menu, Monitor, Moon, Settings, Sun, Terminal } from 'lucide-react';

const iconButtonClassName =
  'btn btn-ghost motion-card surface-sheen h-9 w-9 rounded-xl border-[color:var(--ui-border-soft)] p-0 text-[color:var(--ui-icon-muted)] hover:text-[color:var(--ui-text-strong)] disabled:cursor-not-allowed disabled:opacity-50';
const actionButtonClassName = 'btn btn-secondary btn-sm motion-card surface-sheen h-8 shrink-0 rounded-xl border px-2.5 text-[11px] sm:h-9';
const utilityGroupClassName =
  'flex shrink-0 items-center gap-1 rounded-xl border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-1 py-0.5 sm:ml-1';

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
    <header className="theme-native-surface topbar-shell sticky top-0 z-20 sticky-glass backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1680px] px-3 sm:px-6 lg:px-7 xl:px-8 2xl:px-10">
        <div className="topbar-panel topbar-ribbon px-2.5 py-2.5 sm:px-3.5 sm:py-3 lg:px-4">
          <div className="flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex w-full min-w-0 items-center gap-2.5 sm:flex-1 sm:gap-3">
              <button
                onClick={onOpenSidebar}
                className={`-ml-0.5 min-h-10 min-w-10 shrink-0 bg-[color:var(--ui-card-bg)] shadow-[0_6px_16px_rgba(0,0,0,0.12)] sm:hidden ${iconButtonClassName}`}
                aria-label="打开导航"
                title="打开导航"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-[color:var(--ui-text-strong)] sm:text-base">
                  {activeFilter === 'inbox' && <Inbox className="h-[18px] w-[18px] shrink-0 text-blue-400" />}
                  {activeFilter === 'today' && <Sun className="h-[18px] w-[18px] shrink-0 text-yellow-400" />}
                  {activeFilter === 'habit' && <Flame className="h-[18px] w-[18px] shrink-0 text-orange-400" />}
                  <span className="truncate">{headerTitle}</span>
                </h2>
                {headerSubtitle ? (
                  <p className="mt-1 hidden max-w-3xl truncate text-[11px] text-[color:var(--ui-text-muted)] sm:block">
                    {headerSubtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mobile-toolbar -mx-0.5 flex w-[calc(100%+0.25rem)] shrink-0 items-center gap-1 overflow-x-auto px-0.5 pb-0.5 text-[color:var(--ui-icon-muted)] sm:mx-0 sm:w-auto sm:justify-end sm:gap-1.5 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-2">
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
                className={`shrink-0 ${iconButtonClassName}`}
                title={isSyncingNow ? '正在同步' : '执行同步'}
                aria-label={isSyncingNow ? '正在同步' : '执行同步'}
                disabled={isSyncingNow}
              >
                {isSyncingNow ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                ) : (
                  <Cloud className="h-4 w-4" />
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
                className={`shrink-0 ${iconButtonClassName}`}
                title="运行日志"
                aria-label="打开运行日志"
              >
                <Terminal className="h-4 w-4" />
              </button>

              <button
                onClick={onToggleTheme}
                className={`shrink-0 ${iconButtonClassName}`}
                title={getThemeToggleLabel(themePreference)}
                aria-label={getThemeToggleLabel(themePreference)}
              >
                {themePreference === 'system' ? (
                  <Monitor className="h-4 w-4" />
                ) : themePreference === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <div className={utilityGroupClassName}>
                <button
                  onClick={onOpenSettings}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-8 sm:px-2.5 sm:text-xs"
                  title="打开设置"
                  aria-label="打开设置面板"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">设置</span>
                </button>

                <button
                  onClick={onOpenAbout}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-8 sm:px-2.5 sm:text-xs"
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
      </div>
    </header>
  );
}

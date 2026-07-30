import { CheckSquare, Cloud, Flame, Info, Loader2, Menu, Monitor, Moon, Settings, Sun, Terminal } from 'lucide-react';

const iconButtonClassName =
  'btn btn-ghost motion-card h-8 w-8 rounded-lg border-[color:var(--ui-border-soft)] bg-transparent p-0 text-[color:var(--ui-icon-muted)] hover:text-[color:var(--ui-text-strong)] disabled:cursor-not-allowed disabled:opacity-50';
const actionButtonClassName = 'btn btn-secondary btn-sm motion-card h-8 shrink-0 rounded-lg border text-[11px]';
const utilityGroupClassName =
  'flex shrink-0 items-center gap-0.5 sm:ml-1';

type ThemePreference = 'system' | 'light' | 'dark';

type PageTopBarProps = {
  activeFilter: string;
  headerTitle: string;
  headerSubtitle?: string;
  isListView: boolean;
  isBatchMode: boolean;
  isSyncingNow: boolean;
  themePreference: ThemePreference;
  onOpenSidebar: () => void;
  onToggleBatchMode: () => void;
  onSync: () => void;
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
  isSyncingNow,
  themePreference,
  onOpenSidebar,
  onToggleBatchMode,
  onSync,
  onOpenSettings,
  onOpenAbout,
  onOpenLogs,
  onToggleTheme,
}: PageTopBarProps) {
  return (
    <header className="recall-topbar theme-native-surface topbar-shell sticky top-0 z-20 sticky-glass backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1680px] px-3 sm:px-6 lg:px-7 xl:px-8 2xl:px-10">
        <div className="topbar-panel px-2 py-1.5 sm:px-3 sm:py-2 lg:px-3.5">
          <div className="flex min-h-7 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <button
                onClick={onOpenSidebar}
                className={`-ml-0.5 min-h-9 min-w-9 shrink-0 bg-transparent shadow-none lg:hidden ${iconButtonClassName}`}
                aria-label="打开导航"
                title="打开导航"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <h2
                  className="flex min-w-0 items-center gap-2 text-[14px] font-semibold tracking-tight text-[color:var(--ui-text-strong)] sm:text-[15px]"
                  title={headerSubtitle ?? headerTitle}
                >
                  {activeFilter === 'habit' && <Flame className="h-[18px] w-[18px] shrink-0 text-orange-400" />}
                  <span className="truncate">{headerTitle}</span>
                </h2>
                {headerSubtitle && headerSubtitle !== headerTitle && (
                  <span className="hidden truncate text-xs text-[color:var(--ui-text-muted)] xl:inline">{headerSubtitle}</span>
                )}
              </div>
            </div>

            <div className="mobile-toolbar flex min-w-0 shrink-0 items-center justify-end gap-0.5 overflow-hidden text-[color:var(--ui-icon-muted)] sm:w-auto sm:gap-1 sm:overflow-visible lg:gap-1.5">
              {isListView && (
                <button
                  onClick={onToggleBatchMode}
                  className={`${actionButtonClassName} w-8 justify-center px-0 lg:w-auto lg:px-2.5 ${
                    isBatchMode
                      ? 'border-blue-400/60 bg-blue-500/12 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                      : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
                  }`}
                  title={isBatchMode ? '退出批量模式' : '批量选择'}
                  aria-label={isBatchMode ? '退出批量模式' : '批量选择'}
                >
                  <CheckSquare className="h-4 w-4 lg:hidden" />
                  <span className="hidden lg:inline">{isBatchMode ? '退出批量' : '批量'}</span>
                </button>
              )}

              <button
                onClick={onSync}
                className={`${actionButtonClassName} hidden w-auto items-center justify-center gap-1.5 px-2.5 text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] sm:inline-flex`}
                title={isSyncingNow ? '正在同步' : '执行同步'}
                aria-label={isSyncingNow ? '正在同步' : '执行同步'}
                disabled={isSyncingNow}
              >
                {isSyncingNow ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">{isSyncingNow ? '同步中' : '同步'}</span>
              </button>

              {isSyncingNow && (
                <div className="skeleton skeleton-shimmer hidden items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-blue-100 md:flex">
                  <span className="icon-halo float-bob h-2 w-2 rounded-full bg-blue-300" />
                  同步队列处理中
                </div>
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
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-8 sm:px-2 sm:text-xs"
                  title="打开设置"
                  aria-label="打开设置面板"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">设置</span>
                </button>

                <button
                  onClick={onOpenAbout}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] sm:h-8 sm:px-2 sm:text-xs"
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

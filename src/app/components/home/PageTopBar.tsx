import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  CheckSquare,
  Cloud,
  Flame,
  Info,
  ListTodo,
  Loader2,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  Settings,
  Sun,
  Terminal,
} from 'lucide-react';

type ThemePreference = 'system' | 'light' | 'dark';
type OpenMenu = 'sort' | 'group' | 'actions' | null;

type PageTopBarProps = {
  activeFilter: string;
  headerTitle: string;
  isListView: boolean;
  isBatchMode: boolean;
  isSyncingNow: boolean;
  themePreference: ThemePreference;
  taskSortMode: string;
  taskGroupMode: string;
  sortOptions: { value: string; label: string }[];
  groupOptions: { value: string; label: string }[];
  onOpenSidebar: () => void;
  onToggleBatchMode: () => void;
  onSync: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenLogs: () => void;
  onToggleTheme: () => void;
  onTaskSortModeChange: (mode: string) => void;
  onTaskGroupModeChange: (mode: string) => void;
};

const iconButtonClassName =
  'btn btn-ghost motion-card flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-transparent bg-transparent p-0 text-[color:var(--recall-text-secondary)] hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)] disabled:cursor-not-allowed disabled:opacity-50';
const menuPanelClassName =
  'absolute right-0 top-full z-40 mt-1.5 min-w-40 rounded-lg border border-[color:var(--recall-divider)] bg-[color:var(--recall-panel-bg)] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.28)]';
const menuItemClassName =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-[color:var(--recall-text-secondary)] transition-colors hover:bg-[color:var(--recall-hover-bg)] hover:text-[color:var(--recall-text)] disabled:cursor-not-allowed disabled:opacity-50';

const getThemeToggleLabel = (themePreference: ThemePreference) => {
  if (themePreference === 'system') return '主题：跟随系统';
  if (themePreference === 'light') return '主题：浅色';
  return '主题：深色';
};

export default function PageTopBar({
  activeFilter,
  headerTitle,
  isListView,
  isBatchMode,
  isSyncingNow,
  themePreference,
  taskSortMode,
  taskGroupMode,
  sortOptions,
  groupOptions,
  onOpenSidebar,
  onToggleBatchMode,
  onSync,
  onOpenSettings,
  onOpenAbout,
  onOpenLogs,
  onToggleTheme,
  onTaskSortModeChange,
  onTaskGroupModeChange,
}: PageTopBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !toolbarRef.current?.contains(target)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  return (
    <header className="recall-topbar theme-native-surface topbar-shell sticky top-0 z-20">
      <div className="mx-auto w-full max-w-[1680px] px-3 sm:px-6 lg:px-7 xl:px-8 2xl:px-10">
        <div className="topbar-panel px-2 py-3 sm:px-3 lg:px-3.5">
          <div className="flex min-h-9 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <button
                onClick={onOpenSidebar}
                className={`${iconButtonClassName} -ml-0.5 lg:hidden`}
                aria-label="打开导航"
                title="打开导航"
              >
                <Menu className="h-5 w-5" />
              </button>
              {activeFilter === 'habit' ? (
                <Flame className="h-5 w-5 shrink-0 text-orange-400" />
              ) : (
                <ListTodo className="h-5 w-5 shrink-0 text-[color:var(--recall-text-muted)]" />
              )}
              <h2
                className="min-w-0 truncate font-sans text-[17px] font-semibold tracking-[0] text-[color:var(--recall-text)] sm:text-[18px]"
                title={headerTitle}
              >
                {headerTitle}
              </h2>
            </div>

            <div ref={toolbarRef} className="flex min-w-0 shrink-0 items-center gap-0.5">
              {isListView && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleMenu('sort')}
                      className={iconButtonClassName}
                      title="排序方式"
                      aria-label="排序方式"
                      aria-expanded={openMenu === 'sort'}
                    >
                      <ArrowDownUp className="h-4 w-4" />
                    </button>
                    {openMenu === 'sort' && (
                      <div className={menuPanelClassName}>
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onTaskSortModeChange(option.value);
                              setOpenMenu(null);
                            }}
                            className={`${menuItemClassName} ${
                              taskSortMode === option.value
                                ? 'bg-[color:var(--recall-selected-bg)] text-[color:var(--recall-text)]'
                                : ''
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleMenu('group')}
                      className={iconButtonClassName}
                      title="分组方式"
                      aria-label="分组方式"
                      aria-expanded={openMenu === 'group'}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenu === 'group' && (
                      <div className={menuPanelClassName}>
                        {groupOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onTaskGroupModeChange(option.value);
                              setOpenMenu(null);
                            }}
                            className={`${menuItemClassName} ${
                              taskGroupMode === option.value
                                ? 'bg-[color:var(--recall-selected-bg)] text-[color:var(--recall-text)]'
                                : ''
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('actions')}
                  className={iconButtonClassName}
                  title="更多操作"
                  aria-label="更多操作"
                  aria-expanded={openMenu === 'actions'}
                >
                  {isSyncingNow ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </button>
                {openMenu === 'actions' && (
                  <div className={`${menuPanelClassName} w-44`}>
                    {isListView && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleBatchMode();
                          setOpenMenu(null);
                        }}
                        className={`${menuItemClassName} ${
                          isBatchMode
                            ? 'bg-[color:var(--recall-selected-bg)] text-[color:var(--recall-text)]'
                            : ''
                        }`}
                      >
                        <CheckSquare className="h-4 w-4" />
                        {isBatchMode ? '退出批量模式' : '批量选择'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onSync();
                        setOpenMenu(null);
                      }}
                      className={menuItemClassName}
                      disabled={isSyncingNow}
                    >
                      {isSyncingNow ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Cloud className="h-4 w-4" />
                      )}
                      {isSyncingNow ? '正在同步' : '立即同步'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenLogs();
                        setOpenMenu(null);
                      }}
                      className={menuItemClassName}
                    >
                      <Terminal className="h-4 w-4" />
                      运行日志
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleTheme();
                        setOpenMenu(null);
                      }}
                      className={menuItemClassName}
                    >
                      {themePreference === 'system' ? (
                        <Monitor className="h-4 w-4" />
                      ) : themePreference === 'light' ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                      {getThemeToggleLabel(themePreference)}
                    </button>
                    <div className="my-1 h-px bg-[color:var(--recall-divider)]" />
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        setOpenMenu(null);
                      }}
                      className={menuItemClassName}
                    >
                      <Settings className="h-4 w-4" />
                      设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAbout();
                        setOpenMenu(null);
                      }}
                      className={menuItemClassName}
                    >
                      <Info className="h-4 w-4" />
                      关于 Recall
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

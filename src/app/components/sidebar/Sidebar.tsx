import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Command,
  Flame,
  GripVertical,
  Hash,
  Inbox,
  LayoutGrid,
  Plus,
  Sun,
  Tag as TagIcon,
  Timer,
  X,
} from 'lucide-react';
import { Countdown, Task } from '@/lib/store';
import SidebarItem from '@/app/components/sidebar/SidebarItem';
import EditableSidebarItem from '@/app/components/sidebar/EditableSidebarItem';

/**
 * 主侧边栏：包含入口、快捷入口、功能、列表、标签等区块。
 * PC端支持拖拽调整宽度和折叠功能。
 */
type SidebarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showAppMenu: boolean;
  setShowAppMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAbout: React.Dispatch<React.SetStateAction<boolean>>;
  isQuickAccessOpen: boolean;
  setIsQuickAccessOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isToolsOpen: boolean;
  setIsToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isListsOpen: boolean;
  setIsListsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTagsOpen: boolean;
  setIsTagsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilter: string;
  setActiveFilter: (value: string) => void;
  refreshTasks: () => void;
  refreshCountdowns: () => void;
  refreshHabits: () => void;
  tasks: Task[];
  agentItems: Array<{ id: string }>;
  hasCalendarTasks: boolean;
  countdowns: Countdown[];
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  listItems: string[];
  renameListItem: (oldName: string, nextName: string) => void;
  removeListItem: (name: string) => void;
  isAddingList: boolean;
  setIsAddingList: React.Dispatch<React.SetStateAction<boolean>>;
  newListName: string;
  setNewListName: React.Dispatch<React.SetStateAction<string>>;
  addListItem: () => void;
  tagUsageMap: Record<string, number>;
  activeTag: string;
  setActiveTag: (value: string) => void;
  APP_VERSION: string;
  DEFAULT_TIMEZONE_OFFSET: number;
  formatDateKeyByOffset: (date: Date, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  getTimezoneOffset: (task: Task) => number;
  // PC端侧边栏宽度和折叠状态
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
};

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const COLLAPSED_WIDTH = 56;

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  showAppMenu,
  setShowAppMenu,
  setShowSettings,
  setShowAbout,
  isQuickAccessOpen,
  setIsQuickAccessOpen,
  isToolsOpen,
  setIsToolsOpen,
  isListsOpen,
  setIsListsOpen,
  isTagsOpen,
  setIsTagsOpen,
  activeFilter,
  setActiveFilter,
  refreshTasks,
  refreshCountdowns,
  refreshHabits,
  tasks,
  agentItems,
  hasCalendarTasks,
  countdowns,
  activeCategory,
  setActiveCategory,
  listItems,
  renameListItem,
  removeListItem,
  isAddingList,
  setIsAddingList,
  newListName,
  setNewListName,
  addListItem,
  tagUsageMap,
  activeTag,
  setActiveTag,
  APP_VERSION,
  DEFAULT_TIMEZONE_OFFSET,
  formatDateKeyByOffset,
  formatZonedDate,
  getTimezoneOffset,
  sidebarWidth,
  setSidebarWidth,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: SidebarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // 处理拖拽调整宽度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setSidebarWidth]);

  // 计算PC端实际宽度
  const pcWidth = isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

  // 检测是否为PC端（lg断点 = 1024px）
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-40 bg-[#222222] border-r border-[#333333] flex flex-col shadow-2xl overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none
        `}
        style={{
          // 移动端使用固定宽度，PC端使用动态宽度
          width: isDesktop ? `${pcWidth}px` : '78vw',
          maxWidth: isDesktop ? `${pcWidth}px` : '300px',
          transition: isDragging ? 'none' : 'width 0.2s ease-in-out, transform 0.3s ease-in-out',
        }}
      >

        {/* 折叠状态下的简化视图 */}
        {isSidebarCollapsed ? (
          <div className="hidden lg:flex flex-col h-full">
            {/* 展开按钮 */}
            <div className="p-2 flex justify-center border-b border-[#333333]">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-10 h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] flex items-center justify-center text-[#888888] hover:text-[#CCCCCC] transition-colors"
                title="展开侧边栏"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* 折叠状态下的图标导航 */}
            <nav className="flex-1 py-2 space-y-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('agent');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'agent' ? 'text-blue-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="AI 助手"
              >
                <Command className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('inbox');
                  refreshTasks();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'inbox' ? 'text-blue-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="收件箱"
              >
                <Inbox className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('today');
                  refreshTasks();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'today' ? 'text-yellow-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="今日"
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('calendar');
                  refreshTasks();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'calendar' ? 'text-cyan-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="日历"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('quadrant');
                  refreshTasks();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'quadrant' ? 'text-indigo-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="四象限"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('countdown');
                  refreshCountdowns();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'countdown' ? 'text-pink-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="倒数日"
              >
                <Timer className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('habit');
                  refreshHabits();
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'habit' ? 'text-orange-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="习惯打卡"
              >
                <Flame className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('completed');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex justify-center py-2 ${activeFilter === 'completed' ? 'text-emerald-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}
                title="已完成"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </nav>
            {/* 版本号 */}
            <div className="px-2 py-2 border-t border-[#333333] bg-[#222222]/50 text-center">
              <div className="text-[10px] text-[#555555]">v{APP_VERSION}</div>
            </div>
          </div>
        ) : (
          <>
            {/* 展开状态下的完整视图 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-3 py-2.5 flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowAppMenu((prev) => !prev);
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                      aria-label="打开应用菜单"
                    >
                      <img
                        src="https://disk.shuaihong.fun/f/VPCq/home.png"
                        alt="Recall"
                        className="w-6 h-6 rounded-full"
                      />
                    </button>
                    {showAppMenu && (
                      <div
                        className="absolute left-0 top-10 w-40 rounded-xl border border-[#333333] bg-[#1F1F1F] shadow-2xl z-50 overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowAppMenu(false);
                            setShowSettings(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
                        >
                          设置
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAppMenu(false);
                            setShowAbout(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
                        >
                          关于
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold leading-tight">Recall</h1>
                    <p className="text-[11px] text-[#6A6A6A] leading-tight">待办</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* PC端折叠按钮 */}
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="hidden lg:flex w-8 h-8 rounded-lg hover:bg-[#2A2A2A] items-center justify-center text-[#666666] hover:text-[#CCCCCC] transition-colors"
                    title="折叠侧边栏"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {/* 移动端关闭按钮 */}
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#666666]" title="关闭侧边栏" aria-label="关闭侧边栏">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <nav className="px-2 space-y-1">
                <SidebarItem
                  icon={Command}
                  label="AI 助手"
                  count={agentItems.length}
                  active={activeFilter === 'agent'}
                  onClick={() => {
                    setActiveFilter('agent');
                    setIsSidebarOpen(false);
                  }}
                />

                <button
                  type="button"
                  onClick={() => setIsQuickAccessOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
                >
                  <span>快捷入口</span>
                  {isQuickAccessOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isQuickAccessOpen && (
                  <div className="space-y-1">
                    <SidebarItem
                      icon={Inbox}
                      label="收件箱"
                      active={activeFilter === 'inbox'}
                      onClick={() => {
                        setActiveFilter('inbox');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-blue-400"
                      badge={tasks.filter((t) => t.status !== 'completed').length}
                    />
                    <SidebarItem
                      icon={Sun}
                      label="今日"
                      active={activeFilter === 'today'}
                      onClick={() => {
                        setActiveFilter('today');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-yellow-400"
                      badge={tasks.filter((t) => {
                        if (t.status === 'completed' || !t.dueDate) return false;
                        const todayKey = formatDateKeyByOffset(new Date(), DEFAULT_TIMEZONE_OFFSET);
                        const taskKey = formatZonedDate(t.dueDate, getTimezoneOffset(t));
                        return taskKey === todayKey;
                      }).length}
                    />
                    <SidebarItem
                      icon={Calendar}
                      label="未来 7 天"
                      active={activeFilter === 'next7'}
                      onClick={() => {
                        setActiveFilter('next7');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-purple-400"
                      badge={tasks.filter((t) => {
                        if (t.status === 'completed' || !t.dueDate) return false;
                        const taskDate = new Date(t.dueDate);
                        const today = new Date();
                        const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return taskDate >= today && taskDate <= next7Days;
                      }).length}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsToolsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
                >
                  <span>功能</span>
                  {isToolsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isToolsOpen && (
                  <div className="space-y-1">
                    <SidebarItem
                      icon={CheckSquare}
                      label="待办"
                      count={tasks.filter((t) => t.status !== 'completed').length}
                      active={activeFilter === 'todo'}
                      onClick={() => {
                        setActiveFilter('todo');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-green-400"
                    />
                    <SidebarItem
                      icon={Calendar}
                      label="日历"
                      count={hasCalendarTasks ? 0 : 0}
                      active={activeFilter === 'calendar'}
                      onClick={() => {
                        setActiveFilter('calendar');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-cyan-400"
                    />
                    <SidebarItem
                      icon={LayoutGrid}
                      label="四象限"
                      count={0}
                      active={activeFilter === 'quadrant'}
                      onClick={() => {
                        setActiveFilter('quadrant');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-indigo-400"
                    />
                    <SidebarItem
                      icon={Timer}
                      label="倒数日"
                      count={countdowns.length}
                      active={activeFilter === 'countdown'}
                      onClick={() => {
                        setActiveFilter('countdown');
                        refreshCountdowns();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-pink-400"
                    />
                    <SidebarItem
                      icon={Flame}
                      label="习惯打卡"
                      count={0}
                      active={activeFilter === 'habit'}
                      onClick={() => {
                        setActiveFilter('habit');
                        refreshHabits();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-orange-400"
                    />
                    <SidebarItem
                      icon={Timer}
                      label="番茄时钟"
                      count={0}
                      active={activeFilter === 'pomodoro'}
                      onClick={() => {
                        setActiveFilter('pomodoro');
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-red-400"
                    />
                    <SidebarItem
                      icon={CheckCircle2}
                      label="已完成"
                      count={0}
                      active={activeFilter === 'completed'}
                      onClick={() => {
                        setActiveFilter('completed');
                        setIsSidebarOpen(false);
                      }}
                      iconColor="text-emerald-400"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsListsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
                >
                  <span>列表</span>
                  {isListsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isListsOpen && (
                  <div className="space-y-1">
                    {listItems.map((item) => (
                      <EditableSidebarItem
                        key={item}
                        icon={Hash}
                        label={item}
                        count={tasks.filter((task) => task.category === item && task.status !== 'completed').length}
                        active={activeFilter === 'category' && activeCategory === item}
                        onClick={() => {
                          setActiveFilter('category');
                          setActiveCategory(item);
                          refreshTasks();
                          setIsSidebarOpen(false);
                        }}
                        onEdit={() => renameListItem(item, prompt('重命名列表', item) || item)}
                        onDelete={() => removeListItem(item)}
                      />
                    ))}
                    {isAddingList ? (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addListItem()}
                          placeholder="列表名称"
                          className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button onClick={addListItem} className="text-blue-400 text-sm">添加</button>
                        <button
                          onClick={() => {
                            setIsAddingList(false);
                            setNewListName('');
                          }}
                          className="text-[#666666] text-sm"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingList(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#666666] hover:text-[#AAAAAA]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>新建列表</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsTagsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
                >
                  <span>标签</span>
                  {isTagsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isTagsOpen && (
                  <div className="space-y-1">
                    {Object.entries(tagUsageMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([tag, count]) => (
                        <SidebarItem
                          key={tag}
                          icon={TagIcon}
                          label={tag}
                          count={count}
                          active={activeFilter === 'tag' && activeTag === tag}
                          onClick={() => {
                            setActiveFilter('tag');
                            setActiveTag(tag);
                            refreshTasks();
                            setIsSidebarOpen(false);
                          }}
                        />
                      ))}
                    {Object.keys(tagUsageMap).length === 0 && (
                      <p className="px-3 py-2 text-xs text-[#555555]">暂无标签</p>
                    )}
                  </div>
                )}
              </nav>
            </div>
            <div className="px-4 py-2 border-t border-[#333333] bg-[#222222]/50">
              <div className="text-[10px] text-[#555555]">v{APP_VERSION}</div>
            </div>
          </>
        )}

        {/* PC端拖拽调整宽度的手柄 */}
        {!isSidebarCollapsed && (
          <div
            className="hidden lg:flex absolute top-0 right-0 w-1 h-full cursor-col-resize group"
            onMouseDown={handleMouseDown}
          >
            <div className={`w-full h-full transition-colors ${isDragging ? 'bg-blue-500' : 'bg-transparent group-hover:bg-[#444444]'}`} />
            {/* 拖拽时显示的视觉提示 */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-4 h-8 rounded bg-[#333333] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'opacity-100 bg-blue-500' : ''}`}>
              <GripVertical className="w-3 h-3 text-[#888888]" />
            </div>
          </div>
        )}
      </aside>

      {/* 移动端遮罩层 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 拖拽时的全局遮罩，防止选中文本 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </>
  );
};

export default Sidebar;

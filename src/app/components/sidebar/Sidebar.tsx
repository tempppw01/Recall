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
  activeCategory: string | null;
  setActiveCategory: (value: string | null) => void;
  listItems: string[];
  renameListItem: (oldName: string, nextName: string) => void;
  removeListItem: (name: string) => void;
  isAddingList: boolean;
  setIsAddingList: React.Dispatch<React.SetStateAction<boolean>>;
  newListName: string;
  setNewListName: React.Dispatch<React.SetStateAction<string>>;
  addListItem: () => void;
  tagUsageMap: Record<string, number>;
  activeTag: string | null;
  setActiveTag: (value: string | null) => void;
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

type ToolItemKey = 'todo' | 'calendar' | 'quadrant' | 'countdown' | 'habit' | 'pomodoro' | 'completed';

const TOOL_ORDER_KEY = 'recall_sidebar_tool_order';
const DEFAULT_TOOL_ORDER: ToolItemKey[] = ['todo', 'calendar', 'quadrant', 'countdown', 'habit', 'pomodoro', 'completed'];

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
  const [toolOrder, setToolOrder] = useState<ToolItemKey[]>(DEFAULT_TOOL_ORDER);
  const [draggingToolKey, setDraggingToolKey] = useState<ToolItemKey | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

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

  const pcWidth = isSidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(TOOL_ORDER_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ToolItemKey[];
      const valid = parsed.filter((key) => DEFAULT_TOOL_ORDER.includes(key));
      if (valid.length === DEFAULT_TOOL_ORDER.length) {
        setToolOrder(valid);
      }
    } catch (error) {
      console.error('Failed to read sidebar tool order', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOOL_ORDER_KEY, JSON.stringify(toolOrder));
  }, [toolOrder]);

  const handleToolDrop = (targetKey: ToolItemKey) => {
    if (!draggingToolKey || draggingToolKey === targetKey) return;
    setToolOrder((prev) => {
      const from = prev.indexOf(draggingToolKey);
      const to = prev.indexOf(targetKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toolConfig: Record<ToolItemKey, { icon: React.ComponentType<{ className?: string }>; label: string; count: number; active: boolean; onClick: () => void; iconColor: string }> = {
    todo: {
      icon: CheckSquare,
      label: '待办',
      count: tasks.filter((t) => t.status !== 'completed').length,
      active: activeFilter === 'todo',
      onClick: () => {
        setActiveFilter('todo');
        refreshTasks();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-green-400',
    },
    calendar: {
      icon: Calendar,
      label: '日历',
      count: 0,
      active: activeFilter === 'calendar',
      onClick: () => {
        setActiveFilter('calendar');
        refreshTasks();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-cyan-400',
    },
    quadrant: {
      icon: LayoutGrid,
      label: '四象限',
      count: 0,
      active: activeFilter === 'quadrant',
      onClick: () => {
        setActiveFilter('quadrant');
        refreshTasks();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-indigo-400',
    },
    countdown: {
      icon: Timer,
      label: '倒数日',
      count: countdowns.length,
      active: activeFilter === 'countdown',
      onClick: () => {
        setActiveFilter('countdown');
        refreshCountdowns();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-pink-400',
    },
    habit: {
      icon: Flame,
      label: '习惯打卡',
      count: 0,
      active: activeFilter === 'habit',
      onClick: () => {
        setActiveFilter('habit');
        refreshHabits();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-orange-400',
    },
    pomodoro: {
      icon: Timer,
      label: '番茄时钟',
      count: 0,
      active: activeFilter === 'pomodoro',
      onClick: () => {
        setActiveFilter('pomodoro');
        refreshTasks();
        setIsSidebarOpen(false);
      },
      iconColor: 'text-red-400',
    },
    completed: {
      icon: CheckCircle2,
      label: '已完成',
      count: 0,
      active: activeFilter === 'completed',
      onClick: () => {
        setActiveFilter('completed');
        setIsSidebarOpen(false);
      },
      iconColor: 'text-emerald-400',
    },
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))]
          bg-[#171717]/82 border-r border-white/8 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.28)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none
        `}
        style={{
          width: isDesktop ? `${pcWidth}px` : '78vw',
          maxWidth: isDesktop ? `${pcWidth}px` : '300px',
          transition: isDragging ? 'none' : 'width 0.2s ease-in-out, transform 0.3s ease-in-out',
        }}
      >
        {isSidebarCollapsed ? (
          <div className="hidden lg:flex flex-col h-full glass-panel-soft">
            <div className="p-2.5 flex justify-center border-b border-white/8">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-10 h-10 rounded-xl glass-card hover:bg-white/6 flex items-center justify-center text-[#9A9A9A] hover:text-[#E5E5E5] transition-colors"
                title="展开侧边栏"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 space-y-1.5 overflow-y-auto">
              {[
                { key: 'agent', icon: Command, color: activeFilter === 'agent' ? 'text-blue-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('agent'); setIsSidebarOpen(false); }, title: 'AI 助手' },
                { key: 'inbox', icon: Inbox, color: activeFilter === 'inbox' ? 'text-blue-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('inbox'); refreshTasks(); setIsSidebarOpen(false); }, title: '收件箱' },
                { key: 'today', icon: Sun, color: activeFilter === 'today' ? 'text-yellow-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('today'); refreshTasks(); setIsSidebarOpen(false); }, title: '今日' },
                { key: 'calendar', icon: Calendar, color: activeFilter === 'calendar' ? 'text-cyan-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('calendar'); refreshTasks(); setIsSidebarOpen(false); }, title: '日历' },
                { key: 'quadrant', icon: LayoutGrid, color: activeFilter === 'quadrant' ? 'text-indigo-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('quadrant'); refreshTasks(); setIsSidebarOpen(false); }, title: '四象限' },
                { key: 'countdown', icon: Timer, color: activeFilter === 'countdown' ? 'text-pink-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('countdown'); refreshCountdowns(); setIsSidebarOpen(false); }, title: '倒数日' },
                { key: 'habit', icon: Flame, color: activeFilter === 'habit' ? 'text-orange-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('habit'); refreshHabits(); setIsSidebarOpen(false); }, title: '习惯打卡' },
                { key: 'completed', icon: CheckCircle2, color: activeFilter === 'completed' ? 'text-emerald-400' : 'text-[#8B8B8B]', action: () => { setActiveFilter('completed'); setIsSidebarOpen(false); }, title: '已完成' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  className={`mx-2 w-[calc(100%-1rem)] flex justify-center py-2.5 rounded-xl hover:bg-white/5 transition-colors ${item.color}`}
                  title={item.title}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              ))}
            </nav>
            <div className="px-2 py-2.5 border-t border-white/8 bg-white/[0.02] text-center">
              <div className="text-[10px] text-[#616161]">v{APP_VERSION}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-3 py-3 flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowAppMenu((prev) => !prev);
                      }}
                      className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
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
                        className="absolute left-0 top-11 w-44 rounded-2xl border border-white/8 bg-[#191919]/96 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.3)] z-50 overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowAppMenu(false);
                            setShowSettings(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[#DDDDDD] hover:bg-white/5"
                        >
                          设置
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAppMenu(false);
                            setShowAbout(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[#DDDDDD] hover:bg-white/5"
                        >
                          关于
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold leading-tight text-[#F0F0F0]">Recall</h1>
                    <p className="text-[11px] text-[#747474] leading-tight">待办与回顾</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="hidden lg:flex w-8 h-8 rounded-xl hover:bg-white/5 items-center justify-center text-[#707070] hover:text-[#D6D6D6] transition-colors"
                    title="折叠侧边栏"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#707070]" title="关闭侧边栏" aria-label="关闭侧边栏">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <nav className="px-2.5 space-y-2.5 pb-4">
                <div className="glass-card rounded-2xl p-1.5">
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
                </div>

                <div className="glass-card rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsQuickAccessOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 pt-2 pb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-[0.16em] hover:text-[#888888]"
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
                </div>

                <div className="glass-card rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsToolsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 pt-2 pb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-[0.16em] hover:text-[#888888]"
                  >
                    <span>功能</span>
                    {isToolsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isToolsOpen && (
                    <div className="space-y-1">
                      {toolOrder.map((key) => {
                        const item = toolConfig[key];
                        return (
                          <SidebarItem
                            key={key}
                            icon={item.icon}
                            label={item.label}
                            count={item.count}
                            active={item.active}
                            onClick={item.onClick}
                            iconColor={item.iconColor}
                            draggable
                            onDragStart={() => setDraggingToolKey(key)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleToolDrop(key)}
                            onDragEnd={() => setDraggingToolKey(null)}
                            className={draggingToolKey === key ? 'opacity-60 border border-white/12 rounded-xl' : ''}
                            rightSlot={<GripVertical className="w-3.5 h-3.5 text-[#5C5C5C]" />}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsListsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 pt-2 pb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-[0.16em] hover:text-[#888888]"
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
                            className="flex-1 bg-[#1A1A1A]/85 border border-white/8 rounded-lg px-2 py-1.5 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button onClick={addListItem} className="text-blue-400 text-sm">添加</button>
                          <button
                            onClick={() => {
                              setIsAddingList(false);
                              setNewListName('');
                            }}
                            className="text-[#777777] text-sm"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingList(true)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#777777] hover:text-[#B3B3B3]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>新建列表</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setIsTagsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 pt-2 pb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-[0.16em] hover:text-[#888888]"
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
                        <p className="px-3 py-2 text-xs text-[#5E5E5E]">暂无标签</p>
                      )}
                    </div>
                  )}
                </div>
              </nav>
            </div>
            <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
              <div className="text-[10px] text-[#5F5F5F]">v{APP_VERSION}</div>
            </div>
          </>
        )}

        {!isSidebarCollapsed && (
          <div
            className="hidden lg:flex absolute top-0 right-0 w-1 h-full cursor-col-resize group"
            onMouseDown={handleMouseDown}
          >
            <div className={`w-full h-full transition-colors ${isDragging ? 'bg-blue-500' : 'bg-transparent group-hover:bg-white/10'}`} />
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-4 h-8 rounded bg-[#2A2A2A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'opacity-100 bg-blue-500' : ''}`}>
              <GripVertical className="w-3 h-3 text-[#888888]" />
            </div>
          </div>
        )}
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </>
  );
};

export default Sidebar;

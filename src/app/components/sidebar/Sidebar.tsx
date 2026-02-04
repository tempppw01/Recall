import React from 'react';
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Command,
  Flame,
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
};

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
}: SidebarProps) => (
  <>
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-[78vw] max-w-[300px] bg-[#222222] border-r border-[#333333] transition-transform duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-[240px] lg:shadow-none
      `}
    >
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
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
              <h1 className="text-sm font-semibold">Recall AI（轻量不轻浮）</h1>
              <p className="text-xs text-[#666666]">轻量 AI 待办｜不拖延搭子</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#666666]">
            <X className="w-5 h-5" />
          </button>
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
    </aside>

    {isSidebarOpen && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 lg:hidden"
        onClick={() => setIsSidebarOpen(false)}
      />
    )}
  </>
);

export default Sidebar;

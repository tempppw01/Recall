"use client";

import { useState, useEffect, useRef, TouchEvent as ReactTouchEvent } from 'react';
import { taskStore, habitStore, countdownStore, Task, Subtask, RepeatType, TaskRepeatRule, Habit, Countdown } from '@/lib/store';
import PomodoroTimer from '@/app/components/PomodoroTimer';
import {
  Command, Send, Plus,
  Calendar, Inbox, Sun, Star, Trash2,
  Menu, X, CheckCircle2, Circle,
  Flag, Tag as TagIcon, Hash, ChevronLeft, ChevronRight,
  CheckSquare, LayoutGrid, Timer, Flame, Pencil, Moon, Wand2, ChevronDown, ChevronUp, Terminal, Settings
} from 'lucide-react';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_MODEL_LIST = ['gemini-2.5-flash-lite', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gpt-5.2'];
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_FALLBACK_TIMEOUT_SEC = 8;
const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';
const APP_VERSION = '0.7beta';
const APP_VERSION_KEY = 'recall_app_version';
const LISTS_KEY = 'recall_lists';
const WALLPAPER_KEY = 'recall_wallpaper_url';
const WEBDAV_URL_KEY = 'recall_webdav_url';
const WEBDAV_PATH_KEY = 'recall_webdav_path';
const WEBDAV_USERNAME_KEY = 'recall_webdav_username';
const WEBDAV_PASSWORD_KEY = 'recall_webdav_password';
const DEFAULT_TIMEZONE_OFFSET = 480;
const TIMEZONE_OPTIONS = [
  { label: 'UTC-12', offsetMinutes: -720 },
  { label: 'UTC-8 (PST)', offsetMinutes: -480 },
  { label: 'UTC-5 (EST)', offsetMinutes: -300 },
  { label: 'UTC+0 (UTC)', offsetMinutes: 0 },
  { label: 'UTC+1 (CET)', offsetMinutes: 60 },
  { label: 'UTC+8 (中国标准时间)', offsetMinutes: 480 },
  { label: 'UTC+9 (JST)', offsetMinutes: 540 },
  { label: 'UTC+10 (AEST)', offsetMinutes: 600 },
  { label: 'UTC+12', offsetMinutes: 720 },
  { label: 'UTC+14', offsetMinutes: 840 },
];
const PRIORITY_LABELS = ['低', '中', '高'];
const CATEGORY_OPTIONS = ['工作', '生活', '健康', '学习', '家庭', '财务', '社交'];
const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '自定义间隔' },
];
const REPEAT_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const FILTER_LABELS: Record<string, string> = {
  todo: '待办',
  calendar: '日历',
  quadrant: '四象限',
  countdown: '倒数日',
  habit: '习惯打卡',
  agent: 'AI 助手',
  search: '搜索',
  pomodoro: '番茄时钟',
  category: '列表',
  tag: '标签',
  inbox: '收件箱',
  today: '今日',
  next7: '未来7天',
  completed: '已完成',
};
const WEEKDAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};
const PERIOD_DEFAULT_HOUR: Record<string, number> = {
  上午: 9,
  中午: 12,
  下午: 15,
  晚上: 20,
  今晚: 20,
  早上: 9,
  凌晨: 0,
};
const HOLIDAY_MAP: Record<string, (year: number) => Date> = {
  元旦: (year) => new Date(year, 0, 1),
  春节: (year) => new Date(year, 1, 1),
  清明: (year) => new Date(year, 3, 4),
  劳动节: (year) => new Date(year, 4, 1),
  端午: (year) => new Date(year, 5, 10),
  中秋: (year) => new Date(year, 8, 17),
  国庆: (year) => new Date(year, 9, 1),
};
const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];
const LUNAR_FESTIVALS = [
  '春节', '元宵节', '清明节', '端午节', '七夕', '中元节',
  '中秋节', '重阳节', '腊八节', '小年', '除夕', '元旦',
];

const extractCalendarNote = (data: Record<string, any>) => {
  const direct = data?.['农历节日'] || data?.['节日'] || data?.['节气'] || data?.['节日名称'];
  if (direct) return String(direct);
  const text = Object.values(data || {}).join(' ');
  const term = SOLAR_TERMS.find((item) => text.includes(item));
  if (term) return term;
  const festival = LUNAR_FESTIVALS.find((item) => text.includes(item));
  if (festival) return festival;
  return '';
};

const parseModelList = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const pad2 = (value: number) => String(value).padStart(2, '0');

const getTimezoneOffset = (task?: Task) => task?.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;

const getZonedDate = (iso: string, offsetMinutes: number) =>
  new Date(new Date(iso).getTime() + offsetMinutes * 60 * 1000);

const formatDateKeyByOffset = (date: Date, offsetMinutes: number) => {
  const zoned = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

const formatZonedDate = (iso: string, offsetMinutes: number) => {
  const zoned = getZonedDate(iso, offsetMinutes);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

const formatZonedTime = (iso: string, offsetMinutes: number) => {
  const zoned = getZonedDate(iso, offsetMinutes);
  return `${pad2(zoned.getUTCHours())}:${pad2(zoned.getUTCMinutes())}`;
};

const formatZonedDateTime = (iso: string, offsetMinutes: number) =>
  `${formatZonedDate(iso, offsetMinutes)} ${formatZonedTime(iso, offsetMinutes)}`;

const buildDueDateIso = (dateText: string, timeText: string, offsetMinutes: number) => {
  if (!dateText) return undefined;
  const [year, month, day] = dateText.split('-').map(Number);
  const [hours, minutes] = (timeText || '00:00').split(':').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
};

const getTimezoneLabel = (offsetMinutes: number) => {
  const match = TIMEZONE_OPTIONS.find((option) => option.offsetMinutes === offsetMinutes);
  if (match) return match.label;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${pad2(hours)}:${pad2(minutes)}`;
};

const getPriorityColor = (priority: number) => {
  if (priority === 2) return 'text-red-400';
  if (priority === 1) return 'text-yellow-400';
  return 'text-emerald-400';
};

const getPriorityLabel = (priority: number) => PRIORITY_LABELS[priority] || PRIORITY_LABELS[0];

type TaskSortMode = 'priority' | 'dueDate' | 'createdAt' | 'title' | 'manual';
type TaskGroupMode = 'none' | 'category' | 'priority' | 'dueDate';
type TaskGroup = { key: string; label: string; items: Task[] };

const TASK_SORT_OPTIONS: { value: TaskSortMode; label: string }[] = [
  { value: 'priority', label: '优先级' },
  { value: 'dueDate', label: '截止日期' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
  { value: 'manual', label: '手动排序' },
];

const TASK_GROUP_OPTIONS: { value: TaskGroupMode; label: string }[] = [
  { value: 'none', label: '不分组' },
  { value: 'category', label: '按分类' },
  { value: 'priority', label: '按优先级' },
  { value: 'dueDate', label: '按日期' },
];

const NO_CATEGORY_LABEL = '未分类';
const NO_DUE_DATE_LABEL = '未设日期';

const sortTasks = (items: Task[], mode: TaskSortMode) => {
  if (mode === 'manual') return items;
  const next = [...items];
  const getCreatedAt = (task: Task) => new Date(task.createdAt ?? 0).getTime();
  const getDueTime = (task: Task) => (task.dueDate ? new Date(task.dueDate).getTime() : Infinity);

  next.sort((a, b) => {
    switch (mode) {
      case 'dueDate': {
        const aTime = getDueTime(a);
        const bTime = getDueTime(b);
        if (aTime !== bTime) return aTime - bTime;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return getCreatedAt(b) - getCreatedAt(a);
      }
      case 'createdAt': {
        const aTime = getCreatedAt(a);
        const bTime = getCreatedAt(b);
        if (aTime !== bTime) return bTime - aTime;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return getDueTime(a) - getDueTime(b);
      }
      case 'title': {
        const titleResult = a.title.localeCompare(b.title, 'zh-CN');
        if (titleResult !== 0) return titleResult;
        return getCreatedAt(b) - getCreatedAt(a);
      }
      case 'priority':
      default: {
        if (b.priority !== a.priority) return b.priority - a.priority;
        const aTime = getDueTime(a);
        const bTime = getDueTime(b);
        if (aTime !== bTime) return aTime - bTime;
        return getCreatedAt(b) - getCreatedAt(a);
      }
    }
  });
  return next;
};

const getTaskGroupKey = (task: Task, mode: TaskGroupMode) => {
  switch (mode) {
    case 'category':
      return task.category?.trim() || NO_CATEGORY_LABEL;
    case 'priority':
      return String(task.priority ?? 0);
    case 'dueDate':
      return task.dueDate
        ? formatZonedDate(task.dueDate, getTimezoneOffset(task))
        : NO_DUE_DATE_LABEL;
    default:
      return 'all';
  }
};

const getTaskGroupLabel = (mode: TaskGroupMode, key: string) => {
  if (mode === 'priority') return getPriorityLabel(Number(key));
  return key;
};

const compareGroupKeys = (mode: TaskGroupMode, a: string, b: string) => {
  switch (mode) {
    case 'priority':
      return Number(b) - Number(a);
    case 'dueDate':
      if (a === NO_DUE_DATE_LABEL && b === NO_DUE_DATE_LABEL) return 0;
      if (a === NO_DUE_DATE_LABEL) return 1;
      if (b === NO_DUE_DATE_LABEL) return -1;
      return a.localeCompare(b);
    case 'category':
      if (a === NO_CATEGORY_LABEL && b === NO_CATEGORY_LABEL) return 0;
      if (a === NO_CATEGORY_LABEL) return 1;
      if (b === NO_CATEGORY_LABEL) return -1;
      return a.localeCompare(b, 'zh-CN');
    default:
      return 0;
  }
};

const groupTasks = (items: Task[], mode: TaskGroupMode): TaskGroup[] => {
  if (mode === 'none') {
    return [{ key: 'all', label: '全部', items }];
  }
  const map = new Map<string, Task[]>();
  items.forEach((task) => {
    const key = getTaskGroupKey(task, mode);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(task);
  });
  const keys = Array.from(map.keys()).sort((a, b) => compareGroupKeys(mode, a, b));
  return keys.map((key) => ({
    key,
    label: getTaskGroupLabel(mode, key),
    items: map.get(key) ?? [],
  }));
};

type AgentItem = {
  id: string;
  title: string;
  dueDate?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  subtasks?: { title?: string }[];
};

type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const isTaskOverdue = (task: Task) => {
  if (!task.dueDate) return false;
  if (task.status === 'completed') return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

const normalizeAgentDueDate = (value?: string) => {
  if (!value) {
    return { normalized: undefined, isValid: false, isProvided: false };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { normalized: undefined, isValid: false, isProvided: true };
  }
  const now = new Date();
  const min = new Date(now);
  min.setDate(min.getDate() - 1);
  min.setHours(0, 0, 0, 0);
  const max = new Date(now);
  max.setFullYear(max.getFullYear() + 2);
  if (parsed < min || parsed > max) {
    return { normalized: undefined, isValid: false, isProvided: true };
  }
  return { normalized: parsed.toISOString(), isValid: true, isProvided: true };
};

const classifyCategory = (input: string) => {
  const text = input.toLowerCase();
  const rules: Record<string, string[]> = {
    工作: ['工作', '客户', '项目', '会议', '需求', '汇报', '报告', '同事', '合同', '岗位', '绩效', '加班'],
    学习: ['学习', '课程', '作业', '复习', '考试', '读书', '练习', '题', '笔记', '培训'],
    健康: ['健身', '运动', '跑步', '瑜伽', '饮食', '体检', '睡眠', '药', '恢复', '步数'],
    家庭: ['家人', '孩子', '父母', '家务', '亲戚', '育儿', '家庭', '看娃'],
    财务: ['报销', '预算', '账单', '发票', '理财', '投资', '缴费', '工资', '税', '贷款'],
    社交: ['聚会', '朋友', '社交', '邀请', '约', '聊天', '沟通', '拜访'],
  };
  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some((word) => text.includes(word))) {
      return category;
    }
  }
  return '生活';
};

const evaluatePriority = (dueDate?: string, subtaskCount = 0, nowMs?: number) => {
  const now = nowMs ?? Date.now();
  if (dueDate) {
    const due = new Date(dueDate).getTime();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 2;
    if (diffDays <= 3) return 1;
  }
  if (subtaskCount >= 5) return 2;
  if (subtaskCount >= 3) return 1;
  return 0;
};

const fetchServerTime = async () => {
  try {
    const res = await fetch('/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'time' }),
    });
    if (!res.ok) {
      throw new Error('time fetch failed');
    }
    const data = await res.json();
    if (data?.serverTime) {
      const parsed = new Date(data.serverTime);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to fetch server time', error);
  }
  return new Date();
};

const createId = () => Math.random().toString(36).substring(2, 9);

const getDefaultRepeatRule = (type: RepeatType, task: Task): TaskRepeatRule => {
  const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
  switch (type) {
    case 'daily':
      return { type: 'daily' };
    case 'weekly':
      return { type: 'weekly', weekdays: [baseDate.getDay()] };
    case 'monthly':
      return { type: 'monthly', monthDay: baseDate.getDate() };
    case 'custom':
      return { type: 'custom', interval: 1 };
    default:
      return { type: 'none' };
  }
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const getTodayKey = () => formatDateKey(new Date());

const getRecentDays = (count: number) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => formatDateKey(addDays(today, -count + 1 + index)));
};

const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const buildWeekDays = (start: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      dateKey: formatDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });

const buildWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  return `${formatDateKey(start)} ~ ${formatDateKey(end)}`;
};

const getNextRepeatDate = (task: Task): Date | null => {
  const rule = task.repeat;
  if (!rule || rule.type === 'none') return null;
  const base = task.dueDate ? new Date(task.dueDate) : new Date();

  switch (rule.type) {
    case 'daily':
      return addDays(base, 1);
    case 'weekly': {
      const weekdays = rule.weekdays?.length ? rule.weekdays : [base.getDay()];
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = (base.getDay() + offset) % 7;
        if (weekdays.includes(candidate)) {
          return addDays(base, offset);
        }
      }
      return addDays(base, 7);
    }
    case 'monthly': {
      const targetDay = rule.monthDay ?? base.getDate();
      const year = base.getFullYear();
      const nextMonthIndex = base.getMonth() + 1;
      const daysInNextMonth = new Date(year, nextMonthIndex + 1, 0).getDate();
      const safeDay = Math.min(targetDay, daysInNextMonth);
      const next = new Date(year, nextMonthIndex, safeDay);
      next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
      return next;
    }
    case 'custom': {
      const interval = Math.max(1, rule.interval ?? 1);
      return addDays(base, interval);
    }
    default:
      return null;
  }
};

// ---------------------------
// Components
// ---------------------------

const SidebarItem = ({ icon: Icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm transition-colors ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
  </button>
);

const EditableSidebarItem = ({ icon: Icon, label, count, active, onClick, onEdit }: any) => (
  <div
    onClick={onClick}
    className={`group w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm transition-colors cursor-pointer ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const ListSidebarItem = ({ icon: Icon, label, count, active, onClick, onEdit, onAddTask }: any) => (
  <div
    onClick={onClick}
    className={`group w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm transition-colors cursor-pointer ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddTask?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
        aria-label={`在${label}中新建任务`}
      >
        <Plus className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
        aria-label={`编辑${label}`}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const TaskItem = ({
  task,
  selected,
  onClick,
  onToggle,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  onDragEnd,
  dragEnabled = true,
}: any) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalRef = useRef<boolean | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const maxOffset = 84;
  const canDrag = Boolean(onDragStart) && dragEnabled;
  const subtaskTotal = task.subtasks?.length ?? 0;
  const completedSubtasks = subtaskTotal
    ? task.subtasks.filter((subtask: Subtask) => subtask.completed).length
    : 0;
  const subtaskProgress = subtaskTotal > 0
    ? Math.round((completedSubtasks / subtaskTotal) * 100)
    : 0;

  useEffect(() => {
    setOffsetX(0);
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalRef.current = null;
  }, [task.id]);

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    startXRef.current = event.touches[0].clientX;
    startYRef.current = event.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsPointerDragging(false);
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (!isHorizontalRef.current) {
      setIsPointerDragging(true);
      return;
    }

    if (Math.abs(deltaX) > 4) {
      setIsPointerDragging(true);
    }

    if (deltaX >= 0) {
      setOffsetX(0);
      setIsSwiping(true);
      return;
    }
    setIsSwiping(true);
    setOffsetX(Math.max(-maxOffset, deltaX));
  };

  const handleTouchEnd = () => {
    if (isHorizontalRef.current) {
      const shouldOpen = Math.abs(offsetX) > maxOffset / 2;
      setOffsetX(shouldOpen ? -maxOffset : 0);
    }
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalRef.current = null;
  };

  const handleClick = () => {
    if (isPointerDragging) return;
    if (offsetX !== 0) {
      setOffsetX(0);
      return;
    }
    onClick?.();
  };

  const handleDragStart = (event: any) => {
    if (!canDrag) return;
    setIsPointerDragging(true);
    event.dataTransfer?.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.(task.id);
  };

  const handleDragEnd = () => {
    setIsPointerDragging(false);
    onDragEnd?.();
  };

  const showDelete = offsetX < -4 || isSwiping;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${isDragging ? 'ring-2 ring-blue-500/60 scale-[0.98]' : ''}`}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(task.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(task.id);
      }}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className={`absolute inset-y-0 right-0 w-[84px] bg-red-600 flex items-center justify-center transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            setOffsetX(0);
            onDelete?.(task.id);
          }}
          className="text-sm font-semibold text-white"
        >
          删除
        </button>
      </div>
      <div
        onClick={handleClick}
        className={`group relative p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all border border-transparent bg-[#1F1F1F] hover:bg-[#232323] ${
          selected ? 'bg-[#2C2C2C]' : 'hover:bg-[#222222]'
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 180ms ease',
        }}
      >
        {subtaskTotal > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-blue-500/20"
            style={{ width: `${subtaskProgress}%` }}
          />
        )}
        <div className="relative z-10 flex items-start gap-3 w-full">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            className={`mt-0.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border transition-colors ${
              task.status === 'completed' 
                ? 'bg-[#5E5E5E] border-[#5E5E5E] text-white' 
                : 'border-[#555555] hover:border-[#888888]'
            }`}
          >
            {task.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-[pop-in_280ms_ease-out]" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <p className={`text-[13px] sm:text-sm leading-snug ${
                task.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#EEEEEE]'
              }`}>
                {task.title}
              </p>
              {canDrag && (
                <button
                  type="button"
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs text-[#666666] px-2 py-1 sm:py-0.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] cursor-grab active:cursor-grabbing touch-none shrink-0"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onTouchStart={(event) => {
                    event.stopPropagation();
                  }}
                  title="拖动排序"
                >
                  拖动排序
                </button>
              )}
              {(task as any).similarity !== undefined && (task as any).similarity > 0.7 && (
                <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded ml-2 whitespace-nowrap">
                  {Math.round((task as any).similarity * 100)}%
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[10px] flex items-center gap-0.5 ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3 fill-current" />
                {getPriorityLabel(task.priority)}
              </span>
              {task.category && (
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 rounded">
                  {task.category}
                </span>
              )}
              {subtaskTotal > 0 ? (
                <span className="text-[10px] text-[#666666]">
                  {completedSubtasks}/{subtaskTotal} 已完成
                </span>
              ) : null}
              {task.dueDate && (
                <span
                  className={`text-[10px] flex items-center gap-1 ${
                    isTaskOverdue(task) ? 'text-red-400' : 'text-[#888888]'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  {formatZonedDateTime(task.dueDate, getTimezoneOffset(task))}
                  <span className="text-[#666666]">({getTimezoneLabel(getTimezoneOffset(task))})</span>
                </span>
              )}
              {task.tags?.map((tag: string) => (
                <span key={tag} className="text-[10px] text-[#666666]">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------
// Main Layout
// ---------------------------

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [dragOverSubtaskId, setDragOverSubtaskId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [modelListText, setModelListText] = useState(DEFAULT_MODEL_LIST.join('\n'));
  const [chatModel, setChatModel] = useState(DEFAULT_MODEL_LIST[0]);
  const [embeddingModel, setEmbeddingModel] = useState(DEFAULT_EMBEDDING_MODEL);
  const [fallbackTimeoutSec, setFallbackTimeoutSec] = useState(DEFAULT_FALLBACK_TIMEOUT_SEC);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState('inbox'); // inbox, today, next7, completed, calendar, agent
  const [taskSortMode, setTaskSortMode] = useState<TaskSortMode>('priority');
  const [taskGroupMode, setTaskGroupMode] = useState<TaskGroupMode>('none');
  const [webdavUrl, setWebdavUrl] = useState(DEFAULT_WEBDAV_URL);
  const [webdavPath, setWebdavPath] = useState(DEFAULT_WEBDAV_PATH);
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [showCountdownForm, setShowCountdownForm] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isTodoOpen, setIsTodoOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isListsOpen, setIsListsOpen] = useState(true);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarNotes, setCalendarNotes] = useState<Record<string, string>>({});
  const [calendarNoteLoading, setCalendarNoteLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekDays, setWeekDays] = useState(() => buildWeekDays(weekStart));
  const [weekLabel, setWeekLabel] = useState(() => buildWeekLabel(weekStart));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [listItems, setListItems] = useState<string[]>([]);
  const [tagItems, setTagItems] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [logs, setLogs] = useState<
    {
      id: string;
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
      detail?: string;
      timestamp: string;
    }[]
  >([]);
  // AI 一键整理状态
  const [isOrganizing, setIsOrganizing] = useState(false);
  // todo-agent 聊天状态
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentItems, setAgentItems] = useState<AgentItem[]>([]);
  const [addedAgentItemIds, setAddedAgentItemIds] = useState<Set<string>>(new Set());
  const [agentError, setAgentError] = useState<string | null>(null);
  const repeatRule = selectedTask?.repeat ?? ({ type: 'none' } as TaskRepeatRule);
  const recommendedPriority = selectedTask
    ? evaluatePriority(selectedTask.dueDate, selectedTask.subtasks?.length ?? 0)
    : 0;
  const selectedTimezoneOffset = getTimezoneOffset(selectedTask ?? undefined);
  const selectedDateValue = selectedTask?.dueDate
    ? formatZonedDate(selectedTask.dueDate, selectedTimezoneOffset)
    : '';
  const selectedTimeValue = selectedTask?.dueDate
    ? formatZonedTime(selectedTask.dueDate, selectedTimezoneOffset)
    : '09:00';

  const pushLog = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    detail?: string,
  ) => {
    const entry = {
      id: createId(),
      level,
      message,
      detail,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 200));
  };

  const persistSettings = (next: {
    apiKey: string;
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    embeddingModel: string;
    fallbackTimeoutSec: number;
    wallpaperUrl: string;
    webdavUrl: string;
    webdavPath: string;
    webdavUsername: string;
    webdavPassword: string;
  }) => {
    localStorage.setItem('recall_api_key', next.apiKey);
    localStorage.setItem('recall_api_base_url', next.apiBaseUrl);
    localStorage.setItem('recall_model_list', next.modelListText);
    localStorage.setItem('recall_chat_model', next.chatModel);
    localStorage.setItem('recall_embedding_model', next.embeddingModel);
    localStorage.setItem('recall_fallback_timeout_sec', String(next.fallbackTimeoutSec));
    localStorage.setItem(WALLPAPER_KEY, next.wallpaperUrl);
    localStorage.setItem(WEBDAV_URL_KEY, next.webdavUrl);
    localStorage.setItem(WEBDAV_PATH_KEY, next.webdavPath);
    localStorage.setItem(WEBDAV_USERNAME_KEY, next.webdavUsername);
    localStorage.setItem(WEBDAV_PASSWORD_KEY, next.webdavPassword);
  };

  // Load Initial Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedVersion = localStorage.getItem(APP_VERSION_KEY);
      if (cachedVersion !== APP_VERSION) {
        localStorage.clear();
        localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      }
      const storedKey = localStorage.getItem('recall_api_key');
      const storedBaseUrl = localStorage.getItem('recall_api_base_url');
      const storedModelList = localStorage.getItem('recall_model_list');
      const storedChatModel = localStorage.getItem('recall_chat_model');
      const storedEmbeddingModel = localStorage.getItem('recall_embedding_model');
      const storedFallbackTimeout = localStorage.getItem('recall_fallback_timeout_sec');
      const storedWallpaper = localStorage.getItem(WALLPAPER_KEY);
      const storedWebdavUrl = localStorage.getItem(WEBDAV_URL_KEY);
      const storedWebdavPath = localStorage.getItem(WEBDAV_PATH_KEY);
      const storedWebdavUsername = localStorage.getItem(WEBDAV_USERNAME_KEY);
      const storedWebdavPassword = localStorage.getItem(WEBDAV_PASSWORD_KEY);

      if (storedKey) {
        setApiKey(storedKey);
      }
      if (storedBaseUrl) setApiBaseUrl(storedBaseUrl);
      if (storedModelList) setModelListText(storedModelList);
      if (storedChatModel) setChatModel(storedChatModel);
      if (storedEmbeddingModel) setEmbeddingModel(storedEmbeddingModel);
      if (storedFallbackTimeout) {
        const parsed = Number(storedFallbackTimeout);
        if (Number.isFinite(parsed) && parsed > 0) {
          setFallbackTimeoutSec(parsed);
        }
      }
      if (storedWallpaper) {
        setWallpaperUrl(storedWallpaper);
      }
      if (storedWebdavUrl) setWebdavUrl(storedWebdavUrl);
      if (storedWebdavPath) setWebdavPath(storedWebdavPath);
      if (storedWebdavUsername) setWebdavUsername(storedWebdavUsername);
      if (storedWebdavPassword) setWebdavPassword(storedWebdavPassword);

      const storedTheme = localStorage.getItem('recall_theme');
      if (storedTheme === 'light') {
        setThemeMode('light');
        setIsSystemTheme(false);
      } else if (storedTheme === 'dark') {
        setThemeMode('dark');
        setIsSystemTheme(false);
      } else if (typeof window !== 'undefined') {
        const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
        setThemeMode(systemPrefersDark ? 'dark' : 'light');
        setIsSystemTheme(true);
      }

      refreshTasks();
      refreshHabits();
      refreshCountdowns();

      if (!storedKey) {
        const inputKey = window.prompt('未检测到 AI 令牌，可输入以启用完整功能（可跳过）');
        if (inputKey && inputKey.trim()) {
          const normalizedKey = inputKey.trim();
          setApiKey(normalizedKey);
          localStorage.setItem('recall_api_key', normalizedKey);
        }
      }
    }
  }, []);

  useEffect(() => {
    pushLog('info', '应用已启动', '数据存储：浏览器 localStorage');
  }, []);

  useEffect(() => {
    if (calendarView === 'week') {
      const start = getWeekStart(new Date());
      setWeekStart(start);
      setWeekDays(buildWeekDays(start));
      setWeekLabel(buildWeekLabel(start));
    }
  }, [calendarView]);

  useEffect(() => {
    const fetchNotes = async () => {
      setCalendarNoteLoading(true);
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth() + 1;
      const daysInCurrentMonth = new Date(year, month, 0).getDate();
      const entries: [string, string][] = [];

      for (let day = 1; day <= daysInCurrentMonth; day += 1) {
        const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
        try {
          const res = await fetch(`/api/countdowns/calendar?year=${year}&month=${month}&day=${day}`);
          if (!res.ok) continue;
          const data = await res.json();
          const note = extractCalendarNote(data);
          if (note) {
            entries.push([dateKey, note]);
          }
        } catch (error) {
          continue;
        }
      }

      setCalendarNotes((prev) => {
        const next = { ...prev };
        for (const [key, note] of entries) {
          next[key] = note;
        }
        return next;
      });
      setCalendarNoteLoading(false);
    };

    fetchNotes();
  }, [calendarMonth]);


  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (themeMode === 'light') {
      body.classList.add('theme-light');
    } else {
      body.classList.remove('theme-light');
    }
    if (typeof window !== 'undefined') {
      if (isSystemTheme) {
        localStorage.removeItem('recall_theme');
      } else {
        localStorage.setItem('recall_theme', themeMode);
      }
    }
  }, [themeMode, isSystemTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isSystemTheme) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (isDark: boolean) => {
      setThemeMode(isDark ? 'dark' : 'light');
    };
    applySystemTheme(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches);
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [isSystemTheme]);

  useEffect(() => {
    setNewSubtaskTitle('');
  }, [selectedTask?.id]);

  useEffect(() => {
    setNewTagInput('');
  }, [selectedTask?.id]);

  useEffect(() => {
    const nextTags = Array.from(
      new Set(tasks.flatMap((task) => (task.tags || []).filter(Boolean)))
    );
    setTagItems(nextTags);
    if (activeTag && !nextTags.includes(activeTag)) {
      setActiveTag(null);
    }
  }, [tasks, activeTag]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (isSidebarOpen) {
      const previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      return () => {
        body.style.overflow = previousOverflow;
      };
    }
    body.style.overflow = '';
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!showAppMenu) return;
    const handleClose = () => setShowAppMenu(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showAppMenu]);

  const refreshTasks = () => {
    const all = taskStore.getAll();
    setTasks(all);
  };

  const refreshHabits = () => {
    const all = habitStore.getAll();
    setHabits(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const refreshCountdowns = () => {
    const all = countdownStore.getAll();
    const sorted = [...all].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
    setCountdowns(sorted);
  };

  const createHabit = () => {
    const title = newHabitTitle.trim();
    if (!title) return;
    const habit: Habit = {
      id: createId(),
      title,
      createdAt: new Date().toISOString(),
      logs: [],
    };
    const next = [...habits, habit];
    habitStore.replaceAll(next);
    setHabits(next);
    setNewHabitTitle('');
  };

  const resetCountdownForm = () => {
    setCountdownTitle('');
    setCountdownDate('');
    setEditingCountdown(null);
  };

  const openCountdownForm = (item?: Countdown) => {
    if (item) {
      setEditingCountdown(item);
      setCountdownTitle(item.title);
      setCountdownDate(item.targetDate.split('T')[0]);
    } else {
      resetCountdownForm();
    }
    setShowCountdownForm(true);
  };

  const saveCountdown = () => {
    const title = countdownTitle.trim();
    if (!title || !countdownDate) return;
    if (editingCountdown) {
      countdownStore.update({
        ...editingCountdown,
        title,
        targetDate: countdownDate,
      });
    } else {
      countdownStore.add({
        id: createId(),
        title,
        targetDate: countdownDate,
        pinned: false,
        createdAt: new Date().toISOString(),
      });
    }
    refreshCountdowns();
    setShowCountdownForm(false);
    resetCountdownForm();
  };

  const toggleCountdownPinned = (item: Countdown) => {
    countdownStore.update({ ...item, pinned: !item.pinned });
    refreshCountdowns();
  };

  const removeCountdown = (itemId: string) => {
    countdownStore.remove(itemId);
    refreshCountdowns();
    if (editingCountdown?.id === itemId) {
      resetCountdownForm();
    }
  };

  const getCountdownDays = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const toggleHabitToday = (habitId: string) => {
    const today = getTodayKey();
    const next = habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const hasLogged = habit.logs.some((log) => log.date === today);
      if (hasLogged) return habit;
      return { ...habit, logs: [...habit.logs, { date: today }] };
    });
    habitStore.replaceAll(next);
    setHabits(next);
  };

  const getHabitStreak = (habit: Habit) => {
    const logSet = new Set(habit.logs.map((log) => log.date));
    let streak = 0;
    let cursor = new Date();
    while (logSet.has(formatDateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  };

  const renameCategory = (oldName: string) => {
    if (typeof window === 'undefined') return;
    const nextName = window.prompt('重命名列表', oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    setListItems((prev) => prev.map((item) => (item === oldName ? nextName : item)));
    taskStore.getAll().forEach((task) => {
      if (task.category === oldName) {
        taskStore.update({ ...task, category: nextName });
      }
    });
    if (activeCategory === oldName) {
      setActiveCategory(nextName);
    }
    refreshTasks();
  };

  const renameTag = (oldName: string) => {
    if (typeof window === 'undefined') return;
    const nextName = window.prompt('重命名标签', oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    taskStore.getAll().forEach((task) => {
      if (!task.tags?.length) return;
      if (task.tags.includes(oldName)) {
        const updatedTags = task.tags.map((tag) => (tag === oldName ? nextName : tag));
        taskStore.update({ ...task, tags: updatedTags });
      }
    });
    if (activeTag === oldName) {
      setActiveTag(nextName);
    }
    refreshTasks();
  };

  // Filter Logic
  const filteredTasks = tasks
    .filter((t) => {
      if (activeFilter === 'agent') return true;
      if (activeFilter === 'completed') return t.status === 'completed';
      if (t.status === 'completed') return false; // Hide completed in other views

      if (activeFilter === 'today') {
        if (!t.dueDate) return false;
        const todayKey = formatDateKeyByOffset(new Date(), DEFAULT_TIMEZONE_OFFSET);
        const taskKey = formatZonedDate(t.dueDate, getTimezoneOffset(t));
        return taskKey === todayKey;
      }

      if (activeFilter === 'category') {
        return activeCategory ? t.category === activeCategory : true;
      }

      if (activeFilter === 'tag') {
        return activeTag ? (t.tags || []).includes(activeTag) : true;
      }

      return true; // Default (todo/inbox/other views use full list for now)
    });
  const sortedTasks = sortTasks(filteredTasks, taskSortMode);
  const groupedTasks = groupTasks(sortedTasks, taskGroupMode);

  // 统计：完成率 & 拖延指数（仅用于概览展示）
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeDueTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate);
  const overdueTasks = activeDueTasks.filter((task) => isTaskOverdue(task)).length;
  const procrastinationIndex = activeDueTasks.length > 0
    ? Math.round((overdueTasks / activeDueTasks.length) * 100)
    : 0;

  const normalizeTimeoutSec = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_FALLBACK_TIMEOUT_SEC;
    return Math.round(numeric);
  };

  const createTaskFromAgentItem = (item: AgentItem) => {
    // 优化：不再请求服务器时间，直接使用本地时间，避免点击“加入”时的网络延迟卡顿
    const now = new Date();
    const title = item.title?.trim() || 'Untitled';
    const category = item.category && CATEGORY_OPTIONS.includes(item.category)
      ? item.category
      : classifyCategory(title);
    const priority = typeof item.priority === 'number'
      ? item.priority
      : evaluatePriority(item.dueDate, item.subtasks?.length || 0, now.getTime());
    const task: Task = {
      id: createId(),
      title,
      dueDate: item.dueDate || undefined,
      timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
      priority,
      category,
      status: 'todo',
      tags: Array.isArray(item.tags) ? item.tags : [],
      subtasks: Array.isArray(item.subtasks)
        ? item.subtasks
            .map((subtask) => ({
              id: createId(),
              title: subtask.title?.trim() || '',
              completed: false,
            }))
            .filter((subtask) => subtask.title.length > 0)
        : [],
      createdAt: now.toISOString(),
    };
    return task;
  };

  const handleAgentSend = async () => {
    const content = agentInput.trim();
    if (!content || agentLoading) return;
    pushLog('info', 'todo-agent 请求发送', content);
    setAgentLoading(true);
    setAgentMessages((prev) => [...prev, { role: 'user', content }]);

    try {
      setAgentError(null);
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'todo-agent',
          input: content,
          ...(apiKey ? { apiKey } : {}),
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
          chatModel: chatModel?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'todo-agent request failed');
      }
      const replyText = typeof data?.reply === 'string' && data.reply.trim().length > 0
        ? data.reply.trim()
        : '已整理成待办清单，点一下即可加入。';
      const nextItems: AgentItem[] = Array.isArray(data?.items)
        ? data.items.map((item: AgentItem) => ({
            ...item,
            id: item.id || createId(),
            title: item.title?.trim() || 'Untitled',
          }))
        : [];
      setAgentMessages((prev) => [...prev, { role: 'assistant', content: replyText }]);
      setAgentItems(nextItems);
      setAddedAgentItemIds(new Set());
      pushLog('success', 'todo-agent 返回成功', `建议待办 ${nextItems.length} 条`);
    } catch (error) {
      console.error(error);
      const message = (error as any)?.message || 'AI 助手无响应，请稍后重试';
      setAgentError(message);
      setAgentMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '我这边没连上服务，稍后再试试？' },
      ]);
      pushLog('error', 'todo-agent 请求失败', String(message));
    } finally {
      setAgentInput('');
      setAgentLoading(false);
    }
  };

  const handleAddAgentItem = (item: AgentItem) => {
    if (addedAgentItemIds.has(item.id)) return;
    const task = createTaskFromAgentItem(item);
    setAddedAgentItemIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setTasks((prev) => {
      if (prev.some((existing) => existing.id === task.id)) return prev;
      return [task, ...prev];
    });

    const persistTask = () => {
      taskStore.add(task);
      refreshTasks();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(persistTask, { timeout: 800 });
    } else {
      setTimeout(persistTask, 0);
    }
  };

  const handleAddAllAgentItems = () => {
    const pendingItems = agentItems.filter((item) => !addedAgentItemIds.has(item.id));
    if (pendingItems.length === 0) return;
    const newTasks = pendingItems.map((item) => createTaskFromAgentItem(item));

    setAddedAgentItemIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((item) => next.add(item.id));
      return next;
    });
    setTasks((prev) => {
      const existingIds = new Set(prev.map((task) => task.id));
      const uniqueTasks = newTasks.filter((task) => !existingIds.has(task.id));
      return [...uniqueTasks, ...prev];
    });

    const persistTasks = () => {
      newTasks.forEach((task) => taskStore.add(task));
      refreshTasks();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(persistTasks, { timeout: 1200 });
    } else {
      setTimeout(persistTasks, 0);
    }
  };

  // 触发 AI 整理：发送当前任务给后端并覆盖本地任务
  const handleOrganizeTasks = async () => {
    if (isOrganizing) return;
    if (!tasks.length) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('将把当前任务发送给 AI 并覆盖本地任务，是否继续？')
      : false;
    if (!confirmed) return;

    pushLog('info', 'AI 整理开始', `任务数量 ${tasks.length}`);
    setIsOrganizing(true);

    try {
      const payloadTasks = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ?? null,
        priority: task.priority,
        category: task.category,
        tags: task.tags,
        subtasks: (task.subtasks || []).map((subtask) => ({ title: subtask.title })),
      }));

      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'organize',
          input: { tasks: payloadTasks },
          ...(apiKey ? { apiKey } : {}),
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
          chatModel: chatModel?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Organize request failed');
      }

      const updatedTasks = Array.isArray(data?.tasks) ? data.tasks : [];
      const originIndex = new Map(tasks.map((task) => [task.id, task]));
      const nextTasks: Task[] = updatedTasks.map((task: any) => {
        const original = originIndex.get(task.id);
        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate || undefined,
          timezoneOffset: task.timezoneOffset ?? original?.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET,
          priority: typeof task.priority === 'number' ? task.priority : 0,
          category: task.category || original?.category,
          tags: Array.isArray(task.tags) ? task.tags : [],
          status: original?.status || 'todo',
          repeat: original?.repeat,
          embedding: original?.embedding,
          createdAt: original?.createdAt || new Date().toISOString(),
          subtasks: Array.isArray(task.subtasks)
            ? task.subtasks.map((subtask: any) => ({
                id: Math.random().toString(36).substring(2, 9),
                title: subtask.title,
                completed: false,
              }))
            : [],
        };
      });

      // 覆盖本地存储并刷新任务列表
      taskStore.replaceAll(nextTasks);
      setTasks(nextTasks);

      // 同步更新侧边栏分类与标签列表
      const nextCategories = Array.from(new Set(nextTasks.map((task) => task.category).filter(Boolean))) as string[];
      const nextTags = Array.from(new Set(nextTasks.flatMap((task) => task.tags || [])));
      if (nextCategories.length) setListItems(nextCategories);
      if (nextTags.length) setTagItems(nextTags);
      pushLog('success', 'AI 整理完成', `输出任务 ${nextTasks.length} 条`);
    } catch (error) {
      console.error(error);
      if (typeof window !== 'undefined') {
        window.alert('AI 整理失败，请稍后重试');
      }
      pushLog('error', 'AI 整理失败', String((error as Error)?.message || error));
    } finally {
      setIsOrganizing(false);
    }
  };

  const buildExportPayload = () => ({
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: taskStore.getAll(),
      habits: habitStore.getAll(),
      countdowns: countdownStore.getAll(),
    },
  });

  const buildSyncPayload = () => ({
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: taskStore.getAll(),
      habits: habitStore.getAll(),
      countdowns: countdownStore.getAll(),
    },
    settings: {
      apiBaseUrl,
      modelListText,
      chatModel,
      embeddingModel,
      fallbackTimeoutSec,
      wallpaperUrl,
      themeMode,
      isSystemTheme,
      webdavUrl,
      webdavPath,
    },
    secrets: {
      apiKey,
      webdavUsername,
      webdavPassword,
    },
  });

  const applySyncedSettings = (payload: any) => {
    const settings = payload?.settings ?? {};
    const secrets = payload?.secrets ?? {};

    const nextApiBaseUrl = settings.apiBaseUrl || DEFAULT_BASE_URL;
    const nextModelListText = settings.modelListText || DEFAULT_MODEL_LIST.join('\n');
    const nextChatModel = settings.chatModel || DEFAULT_MODEL_LIST[0];
    const nextEmbeddingModel = settings.embeddingModel || DEFAULT_EMBEDDING_MODEL;
    const nextFallback = Number.isFinite(Number(settings.fallbackTimeoutSec))
      ? Number(settings.fallbackTimeoutSec)
      : DEFAULT_FALLBACK_TIMEOUT_SEC;
    const nextWallpaper = typeof settings.wallpaperUrl === 'string' ? settings.wallpaperUrl : '';
    const nextThemeMode = settings.themeMode === 'light' ? 'light' : 'dark';
    const nextIsSystemTheme = settings.isSystemTheme === true;

    setApiBaseUrl(nextApiBaseUrl);
    setModelListText(nextModelListText);
    setChatModel(nextChatModel);
    setEmbeddingModel(nextEmbeddingModel);
    setFallbackTimeoutSec(nextFallback);
    setWallpaperUrl(nextWallpaper);
    setThemeMode(nextThemeMode);
    setIsSystemTheme(nextIsSystemTheme);

    const nextWebdavUrl = typeof settings.webdavUrl === 'string' && settings.webdavUrl.trim().length > 0
      ? settings.webdavUrl
      : webdavUrl;
    const nextWebdavPath = typeof settings.webdavPath === 'string' && settings.webdavPath.trim().length > 0
      ? settings.webdavPath
      : webdavPath;
    const nextApiKey = typeof secrets.apiKey === 'string' ? secrets.apiKey : apiKey;
    const nextWebdavUsername = typeof secrets.webdavUsername === 'string' ? secrets.webdavUsername : webdavUsername;
    const nextWebdavPassword = typeof secrets.webdavPassword === 'string' ? secrets.webdavPassword : webdavPassword;

    setApiKey(nextApiKey);
    setWebdavUrl(nextWebdavUrl);
    setWebdavPath(nextWebdavPath);
    setWebdavUsername(nextWebdavUsername);
    setWebdavPassword(nextWebdavPassword);

    if (typeof window !== 'undefined') {
      if (nextIsSystemTheme) {
        localStorage.removeItem('recall_theme');
      } else {
        localStorage.setItem('recall_theme', nextThemeMode);
      }
    }

    persistSettings({
      apiKey: nextApiKey,
      apiBaseUrl: nextApiBaseUrl,
      modelListText: nextModelListText,
      chatModel: nextChatModel,
      embeddingModel: nextEmbeddingModel,
      fallbackTimeoutSec: nextFallback,
      wallpaperUrl: nextWallpaper,
      webdavUrl: nextWebdavUrl,
      webdavPath: nextWebdavPath,
      webdavUsername: nextWebdavUsername,
      webdavPassword: nextWebdavPassword,
    });
  };

  const handleWebdavSync = async (action: 'push' | 'pull') => {
    if (syncStatus === 'syncing') return;
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      pushLog('warning', 'WebDAV 配置不完整', '请填写地址、用户名和密码');
      setShowSettings(true);
      return;
    }

    setSyncStatus('syncing');
    pushLog('info', action === 'push' ? 'WebDAV 上传中' : 'WebDAV 同步中');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          url: webdavUrl,
          username: webdavUsername,
          password: webdavPassword,
          path: webdavPath,
          ...(action === 'push' ? { payload: buildSyncPayload() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'WebDAV sync failed');
      }

      if (action === 'pull') {
        const remotePayload = data?.data;
        if (remotePayload) {
          applyImportedData(remotePayload);
          applySyncedSettings(remotePayload);
          pushLog('success', 'WebDAV 同步完成', `导入任务 ${remotePayload?.data?.tasks?.length ?? 0} 条`);
        } else {
          pushLog('warning', 'WebDAV 同步失败', '未读取到远端数据');
        }
      } else {
        pushLog('success', 'WebDAV 上传完成');
      }
    } catch (error) {
      console.error(error);
      pushLog('error', 'WebDAV 同步失败', String((error as Error)?.message || error));
    } finally {
      setSyncStatus('idle');
    }
  };

  const triggerDownload = (filename: string, content: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    try {
      const payload = buildExportPayload();
      triggerDownload(`recall-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
      pushLog('success', '数据导出成功', `任务 ${payload.data.tasks.length} 条`);
    } catch (error) {
      console.error(error);
      pushLog('error', '数据导出失败', String((error as Error)?.message || error));
      if (typeof window !== 'undefined') {
        window.alert('数据导出失败，请稍后重试');
      }
    }
  };

  const normalizeImportList = <T extends { id: string }>(items: T[] | undefined) =>
    Array.isArray(items) ? items.filter((item) => item && item.id) : [];

  const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
    const merged = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => {
      merged.set(item.id, item);
    });
    return Array.from(merged.values());
  };

  const applyImportedData = (payload: any) => {
    const tasksImport = normalizeImportList<Task>(payload?.data?.tasks ?? payload?.tasks);
    const habitsImport = normalizeImportList<Habit>(payload?.data?.habits ?? payload?.habits);
    const countdownsImport = normalizeImportList<Countdown>(payload?.data?.countdowns ?? payload?.countdowns);

    const nextTasks = importMode === 'overwrite'
      ? tasksImport
      : mergeById(taskStore.getAll(), tasksImport);
    const nextHabits = importMode === 'overwrite'
      ? habitsImport
      : mergeById(habitStore.getAll(), habitsImport);
    const nextCountdowns = importMode === 'overwrite'
      ? countdownsImport
      : mergeById(countdownStore.getAll(), countdownsImport);

    taskStore.replaceAll(nextTasks);
    habitStore.replaceAll(nextHabits);
    countdownStore.replaceAll(nextCountdowns);

    setTasks(nextTasks);
    setHabits(nextHabits);
    setCountdowns(nextCountdowns);

    const nextCategories = Array.from(new Set(nextTasks.map((task) => task.category).filter(Boolean))) as string[];
    const nextTags = Array.from(new Set(nextTasks.flatMap((task) => task.tags || [])));
    setListItems(nextCategories);
    setTagItems(nextTags);
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      applyImportedData(parsed);
      pushLog('success', '数据导入成功', `来源文件：${file.name}`);
    } catch (error) {
      console.error(error);
      pushLog('error', '数据导入失败', String((error as Error)?.message || error));
      if (typeof window !== 'undefined') {
        window.alert('数据导入失败，请检查文件格式');
      }
    } finally {
      event.target.value = '';
    }
  };

  const openImportPicker = () => {
    importInputRef.current?.click();
  };

  const parseChineseWeekdayInput = (raw: string, baseNow = new Date()) => {
    const match = raw.match(
      /(下周|本周)?(周|星期)([一二三四五六日天])\s*(上午|下午|晚上|中午)?\s*(\d{1,2})?(?:[:：点](\d{1,2}))?(?:分)?/,
    );
    if (!match) {
      return { text: raw };
    }

    const [, weekPrefix, , weekdayCn, period, hourText, minuteText] = match;
    const targetWeekday = WEEKDAY_MAP[weekdayCn];
    const now = new Date(baseNow);
    const currentWeekday = now.getDay();
    let diff = (targetWeekday - currentWeekday + 7) % 7;

    if (weekPrefix === '下周') {
      diff += 7;
    } else if (!weekPrefix && diff === 0) {
      diff = 7;
    }

    let hours = 0;
    let minutes = 0;
    if (hourText) {
      hours = Number(hourText);
      minutes = minuteText ? Number(minuteText) : 0;
      if ((period === '下午' || period === '晚上') && hours < 12) {
        hours += 12;
      } else if (period === '中午' && hours < 11) {
        hours += 12;
      }
    } else if (period) {
      hours = PERIOD_DEFAULT_HOUR[period] ?? 9;
    }

    const date = new Date(now);
    date.setDate(now.getDate() + diff);
    date.setHours(hours, minutes, 0, 0);
    const cleaned = raw.replace(match[0], ' ').replace(/\s+/g, ' ').trim();

    return { dueDate: date.toISOString(), text: cleaned };
  };

  const parseRelativeDayInput = (raw: string, baseNow = new Date()) => {
    const match = raw.match(/(下个月(?:初|底)?|下月(?:初|底)?|大后天|后天|今天|明天|今晚|明早|明天早上|明天上午|明天中午|明天下午|明天晚上|下下周([一二三四五六日天])?|月底|月末)/);
    if (!match) return { text: raw };

    const now = new Date(baseNow);
    let base = new Date(now);
    const keyword = match[1];

    if (keyword === '月底' || keyword === '月末') {
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      end.setHours(9, 0, 0, 0);
      base = end;
    } else if (keyword.startsWith('下个月') || keyword.startsWith('下月')) {
      const targetMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      if (keyword.includes('底')) {
        const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
        end.setHours(9, 0, 0, 0);
        base = end;
      } else {
        const day = keyword.includes('初') ? 1 : 1;
        base = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day, 9, 0, 0, 0);
      }
    } else if (keyword.includes('今天') || keyword.includes('今晚')) {
      base = new Date(now);
    } else if (keyword.includes('明天')) {
      base.setDate(base.getDate() + 1);
    } else if (keyword.includes('后天')) {
      base.setDate(base.getDate() + 2);
    } else if (keyword.includes('大后天')) {
      base.setDate(base.getDate() + 3);
    } else if (keyword.startsWith('下下周')) {
      const weekdayMatch = raw.match(/下下周([一二三四五六日天])/);
      if (weekdayMatch) {
        const weekday = WEEKDAY_MAP[weekdayMatch[1]];
        const current = base.getDay();
        let diff = (weekday - current + 7) % 7;
        diff += 14;
        base.setDate(base.getDate() + diff);
      } else {
        base.setDate(base.getDate() + 14);
      }
    }

    if (keyword !== '月底' && keyword !== '月末') {
      const periodMatch = raw.match(/(凌晨|早上|上午|中午|下午|晚上|今晚|明早)/);
      const defaultHour = periodMatch ? PERIOD_DEFAULT_HOUR[periodMatch[1]] : 9;
      base.setHours(defaultHour, 0, 0, 0);
    }

    const cleaned = raw.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
    return { dueDate: base.toISOString(), text: cleaned };
  };

  const parseTimeRangeInput = (raw: string) => {
    const match = raw.match(/(\d{1,2})(?:[:：点](\d{1,2}))?\s*(?:到|\-|~)\s*(\d{1,2})(?:[:：点](\d{1,2}))?/);
    if (!match) return { text: raw };
    const [, startHour, startMin, endHour, endMin] = match;
    const cleaned = raw.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
    return {
      timeRange: {
        startHour: Number(startHour),
        startMinute: startMin ? Number(startMin) : 0,
        endHour: Number(endHour),
        endMinute: endMin ? Number(endMin) : 0,
      },
      text: cleaned,
    };
  };

  const parseFuzzyPeriodOnly = (raw: string, baseNow = new Date()) => {
    const periodMatch = raw.match(/(凌晨|早上|上午|中午|下午|晚上|今晚|明早)/);
    if (!periodMatch) return { text: raw };
    const cleaned = raw.replace(periodMatch[0], ' ').replace(/\s+/g, ' ').trim();
    const defaultHour = PERIOD_DEFAULT_HOUR[periodMatch[1]] ?? 9;
    const base = new Date(baseNow);
    base.setHours(defaultHour, 0, 0, 0);
    return { dueDate: base.toISOString(), text: cleaned };
  };

  const parseHolidayInput = (raw: string, baseNow = new Date()) => {
    const match = raw.match(/(元旦|春节|清明|劳动节|端午|中秋|国庆)/);
    if (!match) return { text: raw };
    const now = new Date(baseNow);
    const year = now.getFullYear();
    const holiday = HOLIDAY_MAP[match[1]];
    const date = holiday ? holiday(year) : null;
    if (!date) return { text: raw };
    if (date.getTime() < now.getTime()) {
      date.setFullYear(year + 1);
    }
    const cleaned = raw.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
    date.setHours(9, 0, 0, 0);
    return { dueDate: date.toISOString(), text: cleaned };
  };

  const parseLocalTaskInput = (raw: string, baseNow = new Date()) => {
    const tagMatches = Array.from(raw.matchAll(/#([^\s#]+)/g));
    const tags = tagMatches.map((match) => match[1]);
    let title = raw.replace(/#([^\s#]+)/g, '').trim();
    let dueDate: string | undefined;

    // 匹配日期格式 YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    // 允许日期出现在字符串的任何位置，但要求日期前后是边界（空格或字符串首尾）
    const dateMatch = title.match(/(?:^|\s)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s|$)/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const normalizedMonth = String(month).padStart(2, '0');
      const normalizedDay = String(day).padStart(2, '0');
      dueDate = `${year}-${normalizedMonth}-${normalizedDay}T00:00:00.000Z`;
      // 移除匹配到的日期字符串，注意要处理可能捕获的前后空格，这里直接用匹配到的原文替换
      title = title.replace(dateMatch[0], ' ').trim();
    }

    if (!dueDate) {
      const weekdayParsed = parseChineseWeekdayInput(title, baseNow);
      if (weekdayParsed.dueDate) {
        dueDate = weekdayParsed.dueDate;
        title = weekdayParsed.text || title;
      }
    }

    if (!dueDate) {
      const relativeParsed = parseRelativeDayInput(title, baseNow);
      if (relativeParsed.dueDate) {
        dueDate = relativeParsed.dueDate;
        title = relativeParsed.text || title;
      }
    }

    const timeRangeParsed = parseTimeRangeInput(title);
    if (timeRangeParsed.timeRange) {
      title = timeRangeParsed.text || title;
      if (!dueDate) {
        const base = new Date(baseNow);
        base.setHours(timeRangeParsed.timeRange.startHour, timeRangeParsed.timeRange.startMinute, 0, 0);
        dueDate = base.toISOString();
      } else {
        const base = new Date(dueDate);
        base.setHours(timeRangeParsed.timeRange.startHour, timeRangeParsed.timeRange.startMinute, 0, 0);
        dueDate = base.toISOString();
      }
    }

    if (!dueDate) {
      const holidayParsed = parseHolidayInput(title, baseNow);
      if (holidayParsed.dueDate) {
        dueDate = holidayParsed.dueDate;
        title = holidayParsed.text || title;
      }
    }

    if (!dueDate) {
      const fuzzyParsed = parseFuzzyPeriodOnly(title, baseNow);
      if (fuzzyParsed.dueDate) {
        dueDate = fuzzyParsed.dueDate;
        title = fuzzyParsed.text || title;
      }
    }

    if (!dueDate) {
      // 匹配 "today" 或 "tomorrow"，要求前后是边界
      // 中文 "今天"、"明天" 不需要边界
      if (title.includes('今天') || /(?:^|\s)today(?:\s|$)/i.test(title)) {
        dueDate = new Date(baseNow).toISOString().split('T')[0] + 'T00:00:00.000Z';
        title = title.replace(/今天/g, ' ').replace(/(?:^|\s)today(?:\s|$)/ig, ' ').trim();
      } else if (title.includes('明天') || /(?:^|\s)tomorrow(?:\s|$)/i.test(title)) {
        const date = new Date(baseNow);
        date.setDate(date.getDate() + 1);
        dueDate = date.toISOString().split('T')[0] + 'T00:00:00.000Z';
        title = title.replace(/明天/g, ' ').replace(/(?:^|\s)tomorrow(?:\s|$)/ig, ' ').trim();
      }
    }

    title = title.replace(/提醒我|帮我提醒|请提醒/g, ' ').replace(/\s+/g, ' ').trim();

    if (!title) title = 'Untitled';

    return { title, tags, dueDate };
  };

  const createLocalTaskFromInput = async (raw: string) => {
    // 优化：直接使用本地时间，提高响应速度
    const now = new Date();
    const parsed = parseLocalTaskInput(raw, now);
    const category = classifyCategory(raw);
    const priority = evaluatePriority(parsed.dueDate, 0, now.getTime());
    const task: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: parsed.title,
      dueDate: parsed.dueDate,
      timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
      priority,
      category,
      status: 'todo',
      tags: parsed.tags,
      subtasks: [],
      createdAt: now.toISOString(),
    };
    taskStore.add(task);
    refreshTasks();
    setInput('');
  };

  const handleMagicInput = async () => {
    if (!input.trim()) return;

    const rawInput = input.trim();
    setLoading(true);

    const isSearch = rawInput.toLowerCase().startsWith('recall') || rawInput.includes('?');
    const payload = {
      input: rawInput,
      mode: isSearch ? 'search' : 'create',
      ...(apiKey ? { apiKey } : {}),
      apiBaseUrl: apiBaseUrl?.trim() || undefined,
      chatModel: chatModel?.trim() || undefined,
      embeddingModel: embeddingModel?.trim() || undefined,
    };

    const controller = new AbortController();
    const timeoutSec = normalizeTimeoutSec(fallbackTimeoutSec);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!isSearch) {
      timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);
    }

    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      if (isSearch && data.embedding) {
        const results = taskStore.search(data.embedding);
        setTasks(results);
        setActiveFilter('search');
      } else if (!isSearch && data.task) {
        const recommendedPriority = evaluatePriority(data.task?.dueDate, data.task?.subtasks?.length ?? 0);
        const taskWithEmbedding = {
          ...data.task,
          priority: typeof data.task?.priority === 'number' ? data.task.priority : recommendedPriority,
          timezoneOffset: data.task?.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET,
          embedding: data.embedding,
        };
        taskStore.add(taskWithEmbedding);
        refreshTasks();
        setInput('');
      } else if (!isSearch) {
        await createLocalTaskFromInput(rawInput);
      } else {
        throw new Error('Missing embedding');
      }
    } catch (e) {
      console.error(e);
      if (isSearch) {
        alert('Failed. Check API Key.');
        if (!apiKey) setShowSettings(true);
      } else {
        await createLocalTaskFromInput(rawInput);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const updateTask = (updatedTask: Task) => {
    taskStore.update(updatedTask);
    refreshTasks();
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
    if (editingTaskId === updatedTask.id) {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  };

  const removeTask = (taskId: string) => {
    taskStore.remove(taskId);
    refreshTasks();
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const clearCompletedTasks = () => {
    const remaining = taskStore.getAll().filter((task) => task.status !== 'completed');
    taskStore.replaceAll(remaining);
    setTasks(remaining);
    if (selectedTask?.status === 'completed') {
      setSelectedTask(null);
    }
    const nextCategories = Array.from(new Set(remaining.map((task) => task.category).filter(Boolean))) as string[];
    const nextTags = Array.from(new Set(remaining.flatMap((task) => task.tags || [])));
    setListItems(nextCategories);
    setTagItems(nextTags);
  };

  const toggleStatus = (id: string) => {
    const all = taskStore.getAll();
    const target = all.find(t => t.id === id);
    if (target) {
      const isCompleting = target.status !== 'completed';
      const updated: Task = { ...target, status: isCompleting ? 'completed' : 'todo' };
      let nextTask: Task | null = null;
      if (isCompleting) {
        const nextDate = getNextRepeatDate(target);
        if (nextDate) {
          nextTask = {
            ...target,
            id: createId(),
            status: 'todo',
            dueDate: nextDate.toISOString(),
            createdAt: new Date().toISOString(),
            subtasks: (target.subtasks || []).map((subtask) => ({
              ...subtask,
              id: createId(),
              completed: false,
            })),
          };
        }
      }
      updateTask(updated);
      if (nextTask) {
        taskStore.add(nextTask);
        refreshTasks();
      }
    }
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleTaskDragOver = (taskId: string) => {
    if (dragOverTaskId === taskId) return;
    setDragOverTaskId(taskId);
  };

  const handleTaskDrop = (taskId: string) => {
    if (!draggingTaskId) return;
    reorderTasks(draggingTaskId, taskId);
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  const handleWeekChange = (offset: number) => {
    const nextStart = addDays(weekStart, offset * 7);
    setWeekStart(nextStart);
    setWeekDays(buildWeekDays(nextStart));
    setWeekLabel(buildWeekLabel(nextStart));
    setSelectedCalendarDate(null);
  };

  const reorderTasks = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = taskStore.getAll();
    const sourceIndex = current.findIndex((task) => task.id === sourceId);
    const targetIndex = current.findIndex((task) => task.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const next = [...current];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    taskStore.replaceAll(next);
    setTasks(next);
  };

  const reorderSubtasks = (taskId: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const all = taskStore.getAll();
    const target = all.find((task) => task.id === taskId);
    if (!target || !target.subtasks) return;
    const sourceIndex = target.subtasks.findIndex((subtask) => subtask.id === sourceId);
    const targetIndex = target.subtasks.findIndex((subtask) => subtask.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const nextSubtasks = [...target.subtasks];
    const [moved] = nextSubtasks.splice(sourceIndex, 1);
    nextSubtasks.splice(targetIndex, 0, moved);
    const updatedTask = { ...target, subtasks: nextSubtasks };
    taskStore.update(updatedTask);
    setTasks((prev) => prev.map((item) => (item.id === taskId ? updatedTask : item)));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }
  };

  const handleSubtaskDragStart = (subtaskId: string) => {
    setDraggingSubtaskId(subtaskId);
  };

  const handleSubtaskDragOver = (subtaskId: string) => {
    if (dragOverSubtaskId === subtaskId) return;
    setDragOverSubtaskId(subtaskId);
  };

  const handleSubtaskDrop = (subtaskId: string) => {
    if (!selectedTask || !draggingSubtaskId) return;
    reorderSubtasks(selectedTask.id, draggingSubtaskId, subtaskId);
    setDraggingSubtaskId(null);
    setDragOverSubtaskId(null);
  };


  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const all = taskStore.getAll();
    const target = all.find((task) => task.id === taskId);
    if (!target) return;
    const updatedSubtasks = (target.subtasks || []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
    );
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((subtask) => subtask.completed);
    const nextStatus = allCompleted
      ? 'completed'
      : target.status === 'completed'
      ? 'todo'
      : target.status;
    updateTask({ ...target, subtasks: updatedSubtasks, status: nextStatus });
  };

  const addSubtask = () => {
    if (!selectedTask) return;
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const nextSubtasks = [
      ...(selectedTask.subtasks || []),
      { id: Math.random().toString(36).substring(2, 9), title, completed: false },
    ];
    const nextStatus = selectedTask.status === 'completed' ? 'todo' : selectedTask.status;
    updateTask({ ...selectedTask, subtasks: nextSubtasks, status: nextStatus });
    setNewSubtaskTitle('');
  };

  const addTagToTask = () => {
    if (!selectedTask) return;
    const tag = newTagInput.trim();
    if (!tag) return;
    const nextTags = Array.from(new Set([...(selectedTask.tags || []), tag]));
    updateTask({ ...selectedTask, tags: nextTags });
    setNewTagInput('');
  };

  const removeTagFromTask = (tag: string) => {
    if (!selectedTask) return;
    const nextTags = (selectedTask.tags || []).filter((item) => item !== tag);
    updateTask({ ...selectedTask, tags: nextTags });
  };

  const updatePriority = (priority: number) => {
    if (!selectedTask) return;
    updateTask({ ...selectedTask, priority });
  };

  const updateRepeat = (rule: TaskRepeatRule) => {
    if (!selectedTask) return;
    updateTask({ ...selectedTask, repeat: rule.type === 'none' ? undefined : rule });
  };

  const toggleRepeatWeekday = (weekday: number) => {
    if (!selectedTask) return;
    const current = repeatRule.weekdays ?? [];
    const next = current.includes(weekday)
      ? current.filter((day) => day !== weekday)
      : [...current, weekday];
    updateRepeat({ ...repeatRule, type: 'weekly', weekdays: next });
  };

  const urgencyThresholdMs = 24 * 60 * 60 * 1000;
  const isUrgentTask = (task: Task) => {
    if (!task.dueDate) return false;
    const dueMs = new Date(task.dueDate).getTime();
    return isTaskOverdue(task) || dueMs - Date.now() <= urgencyThresholdMs;
  };
  const isImportantTask = (task: Task) => task.priority >= 1;
  const quadrantSourceTasks = tasks.filter((task) => task.status !== 'completed');
  const quadrantGroups = [
    {
      key: 'important-urgent',
      title: '重要且紧急',
      description: '高优先级 & 即将到期',
      items: quadrantSourceTasks.filter((task) => isImportantTask(task) && isUrgentTask(task)),
    },
    {
      key: 'important-not-urgent',
      title: '重要不紧急',
      description: '高优先级 & 可规划',
      items: quadrantSourceTasks.filter((task) => isImportantTask(task) && !isUrgentTask(task)),
    },
    {
      key: 'not-important-urgent',
      title: '紧急不重要',
      description: '低优先级 & 需处理',
      items: quadrantSourceTasks.filter((task) => !isImportantTask(task) && isUrgentTask(task)),
    },
    {
      key: 'not-important-not-urgent',
      title: '不重要不紧急',
      description: '低优先级 & 可搁置',
      items: quadrantSourceTasks.filter((task) => !isImportantTask(task) && !isUrgentTask(task)),
    },
  ];

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.dueDate) {
      const key = formatZonedDate(task.dueDate, getTimezoneOffset(task));
      acc[key] = acc[key] ? [...acc[key], task] : [task];
    }
    return acc;
  }, {});

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const leadingEmpty = monthStart.getDay();
  const monthLabel = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: leadingEmpty }, () => null),
    ...Array.from({ length: daysInMonth }, (_, idx) => idx + 1),
  ];
  const todayKey = formatDateKeyByOffset(new Date(), DEFAULT_TIMEZONE_OFFSET);
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const effectiveCalendarDate = selectedCalendarDate || todayKey;
  const selectedCalendarTasks = tasksByDate[effectiveCalendarDate] || [];
  const selectedCalendarDateObject = parseDateKey(effectiveCalendarDate);
  const selectedCalendarLabel = formatDateKey(selectedCalendarDateObject);
  const dayTasks = selectedCalendarTasks
    .slice()
    .sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return aTime - bTime;
    });
  const agendaTasks = tasks
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());
  const handleMonthChange = (offset: number) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1));
  };
  const headerTitle = activeFilter === 'category'
    ? (activeCategory ?? FILTER_LABELS.category)
    : activeFilter === 'tag'
    ? (activeTag ? `#${activeTag}` : FILTER_LABELS.tag)
    : (FILTER_LABELS[activeFilter] ?? '待办');
  const isListView = !['pomodoro', 'calendar', 'countdown', 'quadrant', 'habit', 'agent'].includes(activeFilter);
  const isManualSortEnabled = taskSortMode === 'manual' && taskGroupMode === 'none';
  const categoryButtons = Array.from(new Set([...CATEGORY_OPTIONS, ...listItems]));
  const hasCalendarTasks = Object.values(tasksByDate).some((list) => list.length > 0);
  const tagUsageMap = tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.status === 'completed') return acc;
    (task.tags || []).forEach((tag) => {
      if (!tag) return;
      acc[tag] = (acc[tag] ?? 0) + 1;
    });
    return acc;
  }, {});
  const normalizedTagSearch = tagSearch.trim().toLowerCase();
  const visibleTagItems = tagItems.filter((item) => {
    const count = tagUsageMap[item] ?? 0;
    const matches = normalizedTagSearch
      ? item.toLowerCase().includes(normalizedTagSearch)
      : true;
    return (count > 0 || activeTag === item) && matches;
  });
  const showAgentBulkAdd = agentItems.length > 1
    || agentItems.some((item) => (item.subtasks?.length ?? 0) > 0);

  return (
    <div
      className="flex h-[100dvh] min-h-[100dvh] bg-[#1A1A1A] text-[#EEEEEE] overflow-hidden font-sans relative safe-area-top"
      style={
        wallpaperUrl
          ? {
              backgroundImage: `url(${wallpaperUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    >
      
      {/* 1. Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[78vw] max-w-[300px] bg-[#222222] border-r border-[#333333] transition-transform duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-[240px] lg:shadow-none
      `}>
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
                    src="/icon.svg"
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
                <h1 className="text-sm font-semibold">Recall AI</h1>
                <p className="text-xs text-[#666666]">轻量 AI 待办</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#666666]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-2 space-y-1">
            <SidebarItem 
              icon={Command} label="AI 助手" count={agentItems.length} 
              active={activeFilter === 'agent'} 
              onClick={() => { setActiveFilter('agent'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={CheckSquare} label="待办" count={tasks.filter(t => t.status !== 'completed').length} 
              active={activeFilter === 'todo'} 
              onClick={() => { setActiveFilter('todo'); refreshTasks(); setIsSidebarOpen(false); }} 
            />
            <button
              type="button"
              onClick={() => setIsToolsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
            >
              <span>功能</span>
              {isToolsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {isToolsOpen && (
              <div className="space-y-1">
                <SidebarItem 
                  icon={Calendar} label="日历" count={hasCalendarTasks ? 0 : 0} 
                  active={activeFilter === 'calendar'} 
                  onClick={() => { setActiveFilter('calendar'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={LayoutGrid} label="四象限" count={0} 
                  active={activeFilter === 'quadrant'} 
                  onClick={() => { setActiveFilter('quadrant'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Timer} label="倒数日" count={countdowns.length} 
                  active={activeFilter === 'countdown'} 
                  onClick={() => { setActiveFilter('countdown'); refreshCountdowns(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Flame} label="习惯打卡" count={0} 
                  active={activeFilter === 'habit'} 
                  onClick={() => { setActiveFilter('habit'); refreshHabits(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Timer} label="番茄时钟" count={0} 
                  active={activeFilter === 'pomodoro'} 
                  onClick={() => { setActiveFilter('pomodoro'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsQuickAccessOpen((prev) => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
            >
              <span>快捷入口</span>
              {isQuickAccessOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {isQuickAccessOpen && (
              <div className="space-y-1">
                <SidebarItem 
                  icon={Inbox} label="收件箱" count={tasks.filter(t => t.status !== 'completed').length} 
                  active={activeFilter === 'inbox'} 
                  onClick={() => { setActiveFilter('inbox'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Sun} label="今日" count={0} 
                  active={activeFilter === 'today'} 
                  onClick={() => { setActiveFilter('today'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Calendar} label="未来 7 天" count={0} 
                  active={activeFilter === 'next7'} 
                  onClick={() => { setActiveFilter('next7'); refreshTasks(); setIsSidebarOpen(false); }} 
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsListsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
            >
              <span>列表</span>
              {isListsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {isListsOpen && (
              <div className="space-y-1">
                {listItems.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#555555]">暂无列表</div>
                ) : (
                  listItems.map((item) => (
                    <EditableSidebarItem
                      key={item}
                      icon={Hash}
                      label={item}
                      count={tasks.filter((task) => task.category === item && task.status !== 'completed').length}
                      active={activeFilter === 'category' && activeCategory === item}
                      onClick={() => {
                        setActiveFilter('category');
                        setActiveCategory(item);
                        setActiveTag(null);
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      onEdit={() => renameCategory(item)}
                    />
                  ))
                )}
              </div>
            )}
          
            <button
              type="button"
              onClick={() => setIsTagsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider hover:text-[#777777]"
            >
              <span>标签</span>
              {isTagsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {isTagsOpen && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  placeholder="搜索标签"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-xs text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                />
                {visibleTagItems.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#555555]">
                    {tagItems.length === 0 ? '暂无标签' : '暂无可用标签'}
                  </div>
                ) : (
                  visibleTagItems.map((item) => (
                    <EditableSidebarItem
                      key={item}
                      icon={TagIcon}
                      label={item}
                      count={tagUsageMap[item] ?? 0}
                      active={activeFilter === 'tag' && activeTag === item}
                      onClick={() => {
                        setActiveFilter('tag');
                        setActiveTag(item);
                        setActiveCategory(null);
                        refreshTasks();
                        setIsSidebarOpen(false);
                      }}
                      onEdit={() => renameTag(item)}
                    />
                  ))
                )}
              </div>
            )}
          </nav>

          <div className="p-2 border-t border-[#333333] mt-3">
            <SidebarItem 
              icon={CheckCircle2} 
              label="已完成" 
              onClick={() => { setActiveFilter('completed'); setIsSidebarOpen(false); }} 
              active={activeFilter === 'completed'} 
            />
          </div>
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

      {/* 2. Main Task List */}
      <section className={`flex-1 flex-col min-w-0 bg-[#1A1A1A] ${selectedTask ? 'hidden lg:flex' : 'flex'}`}>
        <header className="h-12 sm:h-14 border-b border-[#333333] flex items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 -ml-1 text-[#888888] hover:text-[#CCCCCC]"
            >
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
            {activeFilter === 'completed' && completedTasks > 0 && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && !window.confirm('确认清除所有已完成任务？')) {
                    return;
                  }
                  clearCompletedTasks();
                }}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                title="清除已完成"
              >
                清除已完成
              </button>
            )}
            <button
              onClick={() => setShowLogs(true)}
              className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
              title="运行日志"
            >
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleOrganizeTasks}
              disabled={isOrganizing}
              className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC] disabled:opacity-50 disabled:cursor-not-allowed"
              title="一键整理"
            >
              <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                setIsSystemTheme(false);
                setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
              }}
              className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
              title={themeMode === 'light' ? '切换夜间模式' : '切换日间模式'}
            >
              {themeMode === 'light' ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </header>

        {isListView && (
          <div className="px-3 sm:px-6 py-3 sm:py-4">
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
                  onKeyDown={(e) => e.key === 'Enter' && handleMagicInput()}
                  placeholder="新增任务…（例如：明天提醒我给小王打电话 #工作）"
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder-[#555555]"
                  disabled={loading}
                />
                {input && (
                  <button
                    onClick={handleMagicInput}
                    className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
              <div className="flex items-center gap-2">
                <label htmlFor="task-sort-mode" className="text-[11px] uppercase text-[#666666]">排序</label>
                <select
                  id="task-sort-mode"
                  value={taskSortMode}
                  onChange={(event) => setTaskSortMode(event.target.value as TaskSortMode)}
                  className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                >
                  {TASK_SORT_OPTIONS.map((option) => (
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
                  onChange={(event) => setTaskGroupMode(event.target.value as TaskGroupMode)}
                  className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-[12px] text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                >
                  {TASK_GROUP_OPTIONS.map((option) => (
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
        )}

        <div className={`flex-1 overflow-y-auto mobile-scroll px-3 sm:px-6 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-10 ${
          ['calendar', 'quadrant', 'countdown', 'habit', 'agent', 'pomodoro'].includes(activeFilter) ? 'pt-3 sm:pt-4' : ''
        }`}>
          {activeFilter === 'calendar' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <button
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      calendarView === 'month'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                    onClick={() => setCalendarView('month')}
                  >
                    月视图
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      calendarView === 'week'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                    onClick={() => setCalendarView('week')}
                  >
                    周视图
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      calendarView === 'day'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                    onClick={() => setCalendarView('day')}
                  >
                    日视图
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      calendarView === 'agenda'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                    onClick={() => setCalendarView('agenda')}
                  >
                    日程视图
                  </button>
                </div>
                <div className="text-[11px] text-[#666666]">
                  {calendarView === 'month'
                    ? '按月总览'
                    : calendarView === 'week'
                    ? '按周聚焦'
                    : calendarView === 'day'
                    ? '当日任务'
                    : '近期日程'}
                </div>
              </div>

              {calendarView === 'week' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#DDDDDD]">
                      {weekLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleWeekChange(-1)}
                        className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]"
                        title="上一周"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleWeekChange(1)}
                        className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]"
                        title="下一周"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {weekDays.map((day, index) => {
                      const dayTasks = tasksByDate[day.dateKey] || [];
                      const sortedTasks = [...dayTasks].sort((a, b) => {
                        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                        return aTime - bTime;
                      });
                      return (
                        <div key={day.dateKey} className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-[#DDDDDD]">{day.label}</div>
                              <div className="text-[11px] text-[#777777]">周{weekdayLabels[index]}</div>
                            </div>
                            {day.dateKey === todayKey && (
                              <span className="text-[10px] text-blue-300">今天</span>
                            )}
                          </div>
                          {sortedTasks.length === 0 ? (
                            <div className="text-xs text-[#555555]">暂无任务</div>
                          ) : (
                            <div className="space-y-2">
                              {sortedTasks.map((task) => {
                                const startTime = task.dueDate
                                  ? formatZonedTime(task.dueDate, getTimezoneOffset(task))
                                  : '未设时间';
                                return (
                                  <button
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="w-full text-left bg-[#1F1F1F] border border-[#2C2C2C] hover:border-[#444444] rounded-lg p-2 transition-colors"
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-[#999999]">
                                      <span>{startTime}</span>
                                      <span className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                        <Flag className="w-3 h-3" />
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    </div>
                                    <div className={`text-sm mt-1 ${task.status === 'completed' ? 'line-through text-[#666666]' : 'text-[#EEEEEE]'}`}>
                                      {task.title}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : calendarView === 'day' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#DDDDDD]">{selectedCalendarLabel}</div>
                    {calendarNotes[selectedCalendarLabel] && (
                      <span className="text-[11px] text-blue-300">
                        {calendarNotes[selectedCalendarLabel]}
                      </span>
                    )}
                  </div>
                  {dayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-[#444444]">
                      <Calendar className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">这一天没有任务</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          selected={selectedTask?.id === task.id}
                          onClick={() => setSelectedTask(task)}
                          onToggle={toggleStatus}
                          onDelete={removeTask}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : calendarView === 'agenda' ? (
                <div className="space-y-4">
                  {agendaTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-[#444444]">
                      <Calendar className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">暂无日程</p>
                    </div>
                  ) : (
                    agendaTasks.map((task) => {
                      const dateKey = task.dueDate ? formatZonedDate(task.dueDate, getTimezoneOffset(task)) : '';
                      const timeLabel = task.dueDate
                        ? formatZonedTime(task.dueDate, getTimezoneOffset(task))
                        : '未设时间';
                      return (
                        <div key={task.id} className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-3">
                          <div className="flex items-center justify-between text-[11px] text-[#777777]">
                            <span>{dateKey}</span>
                            <span>{timeLabel}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <div className="text-sm text-[#EEEEEE]">{task.title}</div>
                              {task.category && (
                                <div className="text-[10px] text-indigo-300 mt-1">{task.category}</div>
                              )}
                            </div>
                            <button
                              onClick={() => setSelectedTask(task)}
                              className="text-xs text-blue-300 hover:text-blue-200"
                            >
                              查看
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => handleMonthChange(-1)}
                        className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]"
                        title="上个月"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-sm font-semibold text-[#DDDDDD]">{monthLabel}</div>
                      <button
                        onClick={() => handleMonthChange(1)}
                        className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]"
                        title="下个月"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 text-[11px] text-[#666666] mb-2">
                      {weekdayLabels.map((label) => (
                        <div key={label} className="text-center">{label}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {calendarDays.map((day, idx) => {
                        if (!day) {
                          return <div key={`empty-${idx}`} className="h-9" />;
                        }
                        const dateKey = `${monthLabel}-${String(day).padStart(2, '0')}`;
                        const note = calendarNotes[dateKey];
                        const isToday = dateKey === todayKey;
                        const isSelected = dateKey === effectiveCalendarDate;
                        const hasTasks = (tasksByDate[dateKey] || []).length > 0;
                        return (
                          <button
                            key={dateKey}
                            onClick={() => setSelectedCalendarDate(dateKey)}
                            className={`relative h-12 rounded-lg flex flex-col items-center justify-center text-xs transition-colors border ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                : 'border-transparent hover:bg-[#2A2A2A]'
                            } ${isToday ? 'text-blue-300' : 'text-[#CCCCCC]'}`}
                          >
                            <span className="leading-none">{day}</span>
                            {note && (
                              <span className="absolute top-1 right-1 text-[9px] text-blue-300">
                                {note}
                              </span>
                            )}
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full ${hasTasks ? 'bg-blue-400' : 'bg-transparent'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#DDDDDD]">
                        {selectedCalendarDate ? `${selectedCalendarDate} 任务` : `今天 (${todayKey}) 任务`}
                      </h3>
                      {selectedCalendarDate && (
                        <button
                          onClick={() => setSelectedCalendarDate(null)}
                          className="text-xs text-[#888888] hover:text-[#CCCCCC]"
                        >
                          返回今天
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {selectedCalendarTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-[#444444]">
                          <Calendar className="w-12 h-12 mb-3 opacity-20" />
                          <p className="text-sm">这一天没有任务</p>
                        </div>
                      ) : (
                        selectedCalendarTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            selected={selectedTask?.id === task.id}
                            onClick={() => setSelectedTask(task)}
                            onToggle={toggleStatus}
                            onDelete={removeTask}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeFilter === 'countdown' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#DDDDDD]">倒数日</h3>
                  <p className="text-xs text-[#666666] mt-1">置顶优先，按到期日期排序</p>
                </div>
                <button
                  onClick={() => openCountdownForm()}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                >
                  新建倒数日
                </button>
              </div>

              {countdowns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#444444]">
                  <Timer className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">还没有倒数日</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {countdowns.map((item) => {
                    const diff = getCountdownDays(item.targetDate);
                    const isPast = diff < 0;
                    const displayDays = Math.abs(diff);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-[#EEEEEE]">{item.title}</h4>
                              {item.pinned && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">置顶</span>
                              )}
                            </div>
                            <p className="text-xs text-[#777777] mt-1">目标日期：{item.targetDate}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-semibold ${isPast ? 'text-red-400' : 'text-blue-400'}`}>
                              {displayDays}
                            </p>
                            <p className="text-[11px] text-[#666666]">{isPast ? '已过期天数' : '天后'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleCountdownPinned(item)}
                            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                              item.pinned
                                ? 'border-yellow-500 text-yellow-300 bg-yellow-500/10'
                                : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                            }`}
                          >
                            {item.pinned ? '取消置顶' : '置顶'}
                          </button>
                          <button
                            onClick={() => openCountdownForm(item)}
                            className="px-2.5 py-1 text-xs rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => removeCountdown(item.id)}
                            className="px-2.5 py-1 text-xs rounded border border-red-500/40 text-red-300 hover:bg-red-500/10"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeFilter === 'quadrant' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quadrantGroups.map((group) => (
                <div key={group.key} className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#DDDDDD]">{group.title}</h3>
                    <p className="text-xs text-[#666666] mt-1">{group.description}</p>
                    <p className="text-[11px] text-[#555555] mt-1">{group.items.length} 项</p>
                  </div>
                  <div className="space-y-2">
                    {group.items.length === 0 ? (
                      <div className="text-xs text-[#444444]">暂无任务</div>
                    ) : (
                      group.items.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          selected={selectedTask?.id === task.id}
                          onClick={() => setSelectedTask(task)}
                          onToggle={toggleStatus}
                          onDelete={removeTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : activeFilter === 'pomodoro' ? (
            <PomodoroTimer />
          ) : activeFilter === 'agent' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <div className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#DDDDDD]">AI 助手</h3>
                      <p className="text-xs text-[#666666] mt-1">把计划丢给我，我负责拆碎再拼好 😎</p>
                    </div>
                    <span className="text-[11px] text-[#555555]">todo-agent</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-dashed border-[#333333] bg-[#1B1B1B] px-3 py-2 text-xs text-[#777777]">
                      小提示：别怕大目标，我负责把它切成一口一口的“薯片任务”。
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                      {agentMessages.length === 0 ? (
                        <div className="text-sm text-[#555555]">先告诉我：想完成什么事情？</div>
                      ) : (
                        agentMessages.map((message, idx) => (
                          <div
                            key={`${message.role}-${idx}`}
                            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                              message.role === 'user'
                                ? 'bg-blue-600/20 text-blue-100 ml-auto'
                                : 'bg-[#2A2A2A] text-[#DDDDDD]'
                            }`}
                          >
                            {message.content}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAgentSend()}
                        placeholder="例如：帮我规划本周的工作安排"
                        className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-3 text-sm text-[#CCCCCC] leading-6 focus:outline-none focus:border-blue-500"
                        disabled={agentLoading}
                      />
                      <button
                        onClick={handleAgentSend}
                        disabled={agentLoading || !agentInput.trim()}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                      >
                        {agentLoading ? '整理中…' : '发送'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#CCCCCC]">建议待办</h4>
                  {showAgentBulkAdd && (
                    <button
                      onClick={handleAddAllAgentItems}
                      disabled={agentItems.length === 0 || addedAgentItemIds.size === agentItems.length}
                      className="text-xs px-3 py-1 rounded-lg border border-blue-500 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      一键全部添加
                    </button>
                  )}
                </div>
                {agentItems.length === 0 ? (
                  <div className="bg-[#1F1F1F] border border-dashed border-[#2C2C2C] rounded-2xl p-4 text-xs text-[#666666]">
                    右侧会出现我整理的清单，放心，它不会咬你。
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {agentItems.map((item) => (
                      <div key={item.id} className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#EEEEEE]">{item.title}</p>
                            {item.dueDate && (
                              <p className="text-xs text-[#777777] mt-1">
                                日期：{formatZonedDateTime(item.dueDate, DEFAULT_TIMEZONE_OFFSET)} ({getTimezoneLabel(DEFAULT_TIMEZONE_OFFSET)})
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddAgentItem(item)}
                            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                              addedAgentItemIds.has(item.id)
                                ? 'border-[#333333] text-[#666666]'
                                : 'border-blue-500 text-blue-200 hover:bg-blue-500/10'
                            }`}
                          >
                            {addedAgentItemIds.has(item.id) ? '已添加' : '加入待办'}
                          </button>
                        </div>
                        {item.subtasks?.length ? (
                          <ul className="mt-3 space-y-1 text-xs text-[#777777] list-disc list-inside">
                            {item.subtasks.map((subtask, index) => (
                              <li key={`${item.id}-subtask-${index}`}>{subtask.title}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeFilter === 'habit' ? (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#DDDDDD]">创建新习惯</h3>
                    <p className="text-xs text-[#666666] mt-1">像签到一样，坚持每日打卡</p>
                  </div>
                  <div className="text-[11px] text-[#555555]">今天 {getTodayKey().slice(5)}</div>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    type="text"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createHabit()}
                    placeholder="例如：学英语"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2.5 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={createHabit}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
                  >
                    创建习惯
                  </button>
                </div>
              </div>

              {habits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-[#444444]">
                  <Flame className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">还没有习惯，先创建一个吧</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {habits.map((habit) => {
                    const today = getTodayKey();
                    const hasToday = habit.logs.some((log) => log.date === today);
                    const streak = getHabitStreak(habit);
                    const recentDays = getRecentDays(7);
                    const logSet = new Set(habit.logs.map((log) => log.date));
                    return (
                      <div key={habit.id} className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-300 text-sm font-semibold">
                              {habit.title.slice(0, 1)}
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-[#EEEEEE]">{habit.title}</h4>
                              <p className="text-xs text-[#666666] mt-1">连续 {streak} 天</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleHabitToday(habit.id)}
                            disabled={hasToday}
                            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border transition-colors ${
                              hasToday
                                ? 'border-[#444444] text-[#777777] bg-[#2A2A2A]'
                                : 'border-blue-500 text-blue-200 hover:bg-blue-500/10'
                            }`}
                          >
                            {hasToday ? '已打卡' : '今日打卡'}
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-2 sm:gap-3">
                          {recentDays.map((day) => (
                            <div key={day} className="flex flex-col items-center gap-1">
                              <div
                                className={`w-4 h-4 rounded-full border ${
                                  logSet.has(day)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-[#444444]'
                                }`}
                              />
                              <span className="text-[10px] text-[#666666]">{day.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[#444444]">
                  <Inbox className="w-16 h-16 mb-4 opacity-20" />
                  {/* 空状态：加入一点幽默元素 */}
                  <p className="text-sm">暂无任务，今天可以安心摸鱼 😎</p>
                  <p className="text-xs text-[#555555] mt-2">要不要来点新任务，让我也有点存在感？</p>
                </div>
              ) : (
                groupedTasks.map((group) => (
                  <div key={group.key} className="space-y-1">
                    {taskGroupMode !== 'none' && (
                      <div className="flex items-center justify-between px-1 pt-3 pb-1 text-[11px] text-[#666666]">
                        <span className="font-semibold text-[#AAAAAA]">{group.label}</span>
                        <span>{group.items.length} 项</span>
                      </div>
                    )}
                    {group.items.map(task => (
                      <div key={task.id} className="space-y-1">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-2 bg-[#1F1F1F] border border-[#333333] rounded-2xl px-3 py-2.5">
                            <input
                              value={editingTaskTitle}
                              onChange={(e) => setEditingTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const title = editingTaskTitle.trim();
                                  if (title) {
                                    updateTask({ ...task, title });
                                  }
                                }
                                if (e.key === 'Escape') {
                                  setEditingTaskId(null);
                                  setEditingTaskTitle('');
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-transparent outline-none text-sm text-[#EEEEEE]"
                              placeholder="编辑任务标题"
                            />
                            <button
                              className="text-xs text-blue-400 hover:text-blue-300"
                              onClick={() => {
                                const title = editingTaskTitle.trim();
                                if (title) {
                                  updateTask({ ...task, title });
                                }
                              }}
                            >
                              保存
                            </button>
                            <button
                              className="text-xs text-[#888888] hover:text-[#CCCCCC]"
                              onClick={() => {
                                setEditingTaskId(null);
                                setEditingTaskTitle('');
                              }}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <TaskItem
                            task={task}
                            selected={selectedTask?.id === task.id}
                            onClick={() => setSelectedTask(task)}
                            onToggle={toggleStatus}
                            onDelete={removeTask}
                            onDragStart={isManualSortEnabled ? handleTaskDragStart : undefined}
                            onDragOver={isManualSortEnabled ? handleTaskDragOver : undefined}
                            onDrop={isManualSortEnabled ? handleTaskDrop : undefined}
                            isDragging={isManualSortEnabled && draggingTaskId === task.id}
                            onDragEnd={isManualSortEnabled ? () => setDraggingTaskId(null) : undefined}
                            dragEnabled={isManualSortEnabled}
                          />
                        )}
                        {editingTaskId !== task.id && (
                          <div className="flex items-center gap-2 text-[11px] text-[#555555] px-1">
                            <button
                              className="hover:text-[#CCCCCC]"
                              onClick={() => {
                                setEditingTaskId(task.id);
                                setEditingTaskTitle(task.title);
                              }}
                            >
                              编辑标题
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. Detail Sidebar (Right) */}
      {selectedTask && (
        <aside className="fixed inset-y-0 right-0 z-50 lg:z-10 w-full sm:w-[360px] lg:relative lg:w-[320px] bg-[#222222] border-l border-[#333333] flex flex-col animate-in slide-in-from-right duration-200 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="h-12 sm:h-14 border-b border-[#333333] flex items-center justify-between px-3 sm:px-4 shrink-0">
            <button
              onClick={() => setSelectedTask(null)}
              className="lg:hidden text-[#666666] hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              返回
            </button>
            <div className="flex items-center gap-2 text-[#666666]">
              <span className="text-xs">创建于 {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
            </div>
            <button onClick={() => setSelectedTask(null)} className="text-[#666666] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto mobile-scroll pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-start gap-3 mb-6">
              <button 
                onClick={() => toggleStatus(selectedTask.id)}
                className={`mt-1 w-5 h-5 rounded flex items-center justify-center border ${
                  selectedTask.status === 'completed' 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-[#555555]'
                }`}
              >
                {selectedTask.status === 'completed' && (
                  <CheckCircle2 className="w-3.5 h-3.5 animate-[pop-in_280ms_ease-out]" />
                )}
              </button>
              <h3 className={`text-xl font-semibold leading-snug ${
                selectedTask.status === 'completed' ? 'line-through text-[#666666]' : ''
              }`}>
                {selectedTask.title}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#555555] uppercase">
                  日期
                  {isTaskOverdue(selectedTask) && (
                    <span className="text-[11px] text-red-400">已逾期</span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] pointer-events-none" />
                    <input 
                      type="date"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-9 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                      value={selectedDateValue}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        const nextIso = buildDueDateIso(nextDate, selectedTimeValue, selectedTimezoneOffset);
                        updateTask({
                          ...selectedTask,
                          dueDate: nextIso,
                          timezoneOffset: selectedTimezoneOffset,
                        });
                      }}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                      value={selectedTimeValue}
                      onChange={(e) => {
                        const nextTime = e.target.value;
                        const nextIso = buildDueDateIso(selectedDateValue, nextTime, selectedTimezoneOffset);
                        updateTask({
                          ...selectedTask,
                          dueDate: nextIso,
                          timezoneOffset: selectedTimezoneOffset,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <select
                      value={selectedTimezoneOffset}
                      onChange={(e) => {
                        const nextOffset = Number(e.target.value);
                        const nextIso = selectedDateValue
                          ? buildDueDateIso(selectedDateValue, selectedTimeValue, nextOffset)
                          : undefined;
                        updateTask({
                          ...selectedTask,
                          dueDate: nextIso,
                          timezoneOffset: nextOffset,
                        });
                      }}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                    >
                      {TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.offsetMinutes} value={option.offsetMinutes}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#666666] flex items-center">
                    当前时区：{getTimezoneLabel(selectedTimezoneOffset)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">优先级</label>
                <div className="text-[11px] text-[#666666]">
                  推荐：{getPriorityLabel(recommendedPriority)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2].map((level) => (
                    <button
                      key={level}
                      onClick={() => updatePriority(level)}
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${
                        selectedTask.priority === level
                          ? 'bg-[#333333] border-[#555555] text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      <Flag
                        className={`w-3 h-3 ${
                          level === 2 ? 'text-red-500' : level === 1 ? 'text-yellow-500' : 'text-emerald-400'
                        }`}
                      />
                      {PRIORITY_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">分类</label>
                <div className="flex flex-wrap gap-2">
                  {categoryButtons.map((category) => (
                    <button
                      key={category}
                      onClick={() => updateTask({ ...selectedTask, category })}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        selectedTask.category === category
                          ? 'bg-indigo-500/20 border-indigo-400 text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">标签</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.tags?.length ? selectedTask.tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTagFromTask(tag)}
                      className="text-xs bg-[#333333] px-2 py-1 rounded text-[#CCCCCC] hover:bg-[#3A3A3A]"
                      title="点击移除标签"
                    >
                      #{tag}
                    </button>
                  )) : <span className="text-sm text-[#666666]">暂无标签</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTagToTask()}
                    placeholder="添加标签（回车确认）"
                    className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={addTagToTask}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#555555] uppercase">重复</label>
                <div className="grid grid-cols-2 gap-2">
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateRepeat(getDefaultRepeatRule(option.value, selectedTask))}
                      className={`px-2 py-1 rounded border text-xs transition-colors text-center ${
                        repeatRule.type === option.value
                          ? 'bg-blue-500/20 border-blue-400 text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {repeatRule.type === 'weekly' && (
                  <div className="flex flex-wrap gap-2">
                    {REPEAT_WEEKDAYS.map((label, index) => {
                      const active = repeatRule.weekdays?.includes(index) ?? false;
                      return (
                        <button
                          key={label}
                          onClick={() => toggleRepeatWeekday(index)}
                          className={`w-8 h-8 rounded-full text-xs border transition-colors ${
                            active
                              ? 'bg-blue-500/20 border-blue-400 text-white'
                              : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {repeatRule.type === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#777777]">每月</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={repeatRule.monthDay ?? 1}
                      onChange={(event) =>
                        updateRepeat({
                          ...repeatRule,
                          type: 'monthly',
                          monthDay: Math.min(31, Math.max(1, Number(event.target.value) || 1)),
                        })
                      }
                      className="w-16 bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-[#777777]">日</span>
                  </div>
                )}

                {repeatRule.type === 'custom' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#777777]">每隔</span>
                    <input
                      type="number"
                      min={1}
                      value={repeatRule.interval ?? 1}
                      onChange={(event) =>
                        updateRepeat({
                          ...repeatRule,
                          type: 'custom',
                          interval: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                      className="w-16 bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-[#777777]">天</span>
                  </div>
                )}
              </div>

              {/* 子任务管理 */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#555555] uppercase">子任务</label>
                <div className="flex items-center gap-2 text-xs text-[#666666]">
                  <span>
                    {(selectedTask.subtasks || []).filter((subtask) => subtask.completed).length}
                    /{(selectedTask.subtasks || []).length} 已完成
                  </span>
                </div>
                <div className="space-y-2">
                  {(selectedTask.subtasks || []).length === 0 ? (
                    <p className="text-sm text-[#666666]">暂无子任务</p>
                  ) : (
                    (selectedTask.subtasks || []).map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            subtask.completed ? 'bg-blue-500 border-blue-500' : 'border-[#555555]'
                          }`}
                        >
                          {subtask.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`text-sm ${subtask.completed ? 'line-through text-[#666666]' : 'text-[#CCCCCC]'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                    placeholder="新增子任务"
                    className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={addSubtask}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-[#333333] text-xs text-center text-[#444444]">
            ID: {selectedTask.id}
          </div>
        </aside>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-3 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
          <div
            className="absolute inset-0"
            onClick={() => setShowSettings(false)}
          />
          <div
            className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base sm:text-lg font-semibold mb-3">设置</h2>
            <div className="space-y-3 sm:space-y-4 text-sm">
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI 接口地址</label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI API 密钥</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">模型列表 (逗号或换行分隔)</label>
                <textarea
                  value={modelListText}
                  onChange={(e) => setModelListText(e.target.value)}
                  placeholder={DEFAULT_MODEL_LIST.join('\n')}
                  rows={4}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">对话模型</label>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                >
                  {parseModelList(modelListText).map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">Embedding 模型</label>
                <input
                  type="text"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  placeholder={DEFAULT_EMBEDDING_MODEL}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">创建超时转本地（秒）</label>
                <input
                  type="number"
                  min={1}
                  value={fallbackTimeoutSec}
                  onChange={(e) => setFallbackTimeoutSec(Number(e.target.value))}
                  placeholder={String(DEFAULT_FALLBACK_TIMEOUT_SEC)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] sm:text-xs text-[#555555] mt-1">超时将直接本地创建，避免无法新增（可自由设置）</p>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">壁纸图片 URL</label>
                <input
                  type="text"
                  value={wallpaperUrl}
                  onChange={(e) => setWallpaperUrl(e.target.value)}
                  placeholder="https://example.com/wallpaper.jpg"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] sm:text-xs text-[#555555] mt-1">输入 Web 图片链接，保存后全局背景生效（留空可清除）。</p>
              </div>
              <div className="pt-3 border-t border-[#333333]">
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">数据导入导出</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-3 py-2 text-[13px] sm:text-sm bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#CCCCCC] hover:border-[#555555] hover:text-white"
                  >
                    导出 JSON
                  </button>
                  <button
                    type="button"
                    onClick={openImportPicker}
                    className="px-3 py-2 text-[13px] sm:text-sm bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#CCCCCC] hover:border-[#555555] hover:text-white"
                  >
                    导入 JSON
                  </button>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">导入方式</label>
                  <div className="flex gap-2 text-[12px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`px-3 py-1.5 rounded border transition-colors ${
                        importMode === 'merge'
                          ? 'bg-blue-500/20 border-blue-400 text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      合并
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('overwrite')}
                      className={`px-3 py-1.5 rounded border transition-colors ${
                        importMode === 'overwrite'
                          ? 'bg-blue-500/20 border-blue-400 text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      覆盖
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#555555] mt-2">合并会保留现有数据，覆盖将以导入文件为准。</p>
                </div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#333333]">
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">WebDAV 同步</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">服务地址</label>
                    <input
                      type="text"
                      value={webdavUrl}
                      onChange={(e) => setWebdavUrl(e.target.value)}
                      placeholder={DEFAULT_WEBDAV_URL}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">远端文件路径</label>
                    <input
                      type="text"
                      value={webdavPath}
                      onChange={(e) => setWebdavPath(e.target.value)}
                      placeholder={DEFAULT_WEBDAV_PATH}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">用户名</label>
                    <input
                      type="text"
                      value={webdavUsername}
                      onChange={(e) => setWebdavUsername(e.target.value)}
                      placeholder="WebDAV 用户名"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">密码</label>
                    <input
                      type="password"
                      value={webdavPassword}
                      onChange={(e) => setWebdavPassword(e.target.value)}
                      placeholder="WebDAV 密码"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleWebdavSync('push')}
                      disabled={syncStatus === 'syncing'}
                      className="px-3 py-2 text-[13px] sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                    >
                      {syncStatus === 'syncing' ? '同步中…' : '上传到 WebDAV'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWebdavSync('pull')}
                      disabled={syncStatus === 'syncing'}
                      className="px-3 py-2 text-[13px] sm:text-sm bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#CCCCCC] hover:border-[#555555] hover:text-white disabled:opacity-50"
                    >
                      {syncStatus === 'syncing' ? '同步中…' : '从 WebDAV 拉取'}
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#555555]">
                    提示：同步会包含任务、习惯、倒数日及 AI 设置与密钥。
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-2 text-[13px] sm:text-sm text-[#AAAAAA] hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const normalizedTimeout = normalizeTimeoutSec(fallbackTimeoutSec);
                    setFallbackTimeoutSec(normalizedTimeout);
                    persistSettings({
                      apiKey,
                      apiBaseUrl: apiBaseUrl || DEFAULT_BASE_URL,
                      modelListText,
                      chatModel,
                      embeddingModel,
                      fallbackTimeoutSec: normalizedTimeout,
                      wallpaperUrl,
                      webdavUrl,
                      webdavPath,
                      webdavUsername,
                      webdavPassword,
                    });
                    setShowSettings(false);
                  }}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-[13px] sm:text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCountdownForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            className="absolute inset-0"
            onClick={() => {
              setShowCountdownForm(false);
              resetCountdownForm();
            }}
          />
          <div
            className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-sm rounded-xl border border-[#333333] shadow-2xl p-5 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">{editingCountdown ? '编辑倒数日' : '新建倒数日'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase text-[#888888] mb-2">标题</label>
                <input
                  type="text"
                  value={countdownTitle}
                  onChange={(event) => setCountdownTitle(event.target.value)}
                  placeholder="例如：毕业典礼"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase text-[#888888] mb-2">目标日期</label>
                <input
                  type="date"
                  value={countdownDate}
                  onChange={(event) => setCountdownDate(event.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCountdownForm(false);
                    resetCountdownForm();
                  }}
                  className="px-3 py-2 text-sm text-[#AAAAAA] hover:text-white"
                >
                  取消
                </button>
                <button
                  onClick={saveCountdown}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showLogs && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onClick={() => setShowLogs(false)}
        >
          <div
            className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-5 sm:p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">运行日志</h2>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-[#888888] hover:text-[#CCCCCC]"
              >
                关闭
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#777777] mb-4">
              <div>数据存储：浏览器 localStorage</div>
              <div>数据库：未配置</div>
              <div>AI 接口：{apiBaseUrl || DEFAULT_BASE_URL}</div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase text-[#666666]">最近日志</span>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-[#888888] hover:text-[#CCCCCC]"
              >
                清空
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto mobile-scroll space-y-2 pr-1">
              {logs.length === 0 ? (
                <div className="text-sm text-[#555555]">暂无日志</div>
              ) : (
                logs.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#333333] rounded-lg px-3 py-2 bg-[#1F1F1F]"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#666666]">
                      <span>{item.timestamp}</span>
                      <span
                        className={
                          item.level === 'error'
                            ? 'text-red-400'
                            : item.level === 'warning'
                            ? 'text-yellow-400'
                            : item.level === 'success'
                            ? 'text-emerald-400'
                            : 'text-blue-400'
                        }
                      >
                        {item.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-[#DDDDDD] mt-1">{item.message}</div>
                    {item.detail && (
                      <div className="text-xs text-[#777777] mt-1 whitespace-pre-wrap">{item.detail}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-sm rounded-xl border border-[#333333] shadow-2xl p-5 sm:p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">关于 Recall</h2>
                <p className="text-xs text-[#777777] mt-1">轻量 AI 待办助手</p>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="text-xs text-[#888888] hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="mt-4 text-sm text-[#CCCCCC] space-y-2">
              <p>版本：v{APP_VERSION}</p>
      <p>项目主页：<a className="text-blue-300 hover:text-blue-200" href="https://github.com/tempppw01/Recall" target="_blank" rel="noopener noreferrer">https://github.com/tempppw01/Recall</a></p>
              <p>作者联系：微信 Ethan_BravoEcho</p>
              <p className="text-xs text-[#666666]">感谢使用 Recall，祝你高效又轻松 ✨</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { taskStore, Task, Subtask } from '@/lib/store';
import {
  Settings, Command, Send, Search, Plus,
  Calendar, Inbox, Sun, Star, Trash2,
  Menu, X, CheckCircle2, Circle, MoreVertical,
  AlignLeft, Flag, Tag as TagIcon, Hash, ChevronLeft, ChevronRight,
  CheckSquare, LayoutGrid, Timer, Flame
} from 'lucide-react';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_MODEL_LIST = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gpt-5.2'];
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_FALLBACK_TIMEOUT_SEC = 8;
const PRIORITY_LABELS = ['低', '中', '高'];
const CATEGORY_OPTIONS = ['工作', '生活', '健康', '学习', '家庭', '财务', '社交'];
const FILTER_LABELS: Record<string, string> = {
  todo: '待办',
  calendar: '日历',
  quadrant: '四象限',
  countdown: '倒数日',
  habit: '习惯打卡',
  search: '搜索',
  pomodoro: '番茄时钟',
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

const parseModelList = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getPriorityColor = (priority: number) => {
  if (priority === 2) return 'text-red-400';
  if (priority === 1) return 'text-yellow-400';
  return 'text-emerald-400';
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

const evaluatePriority = (dueDate?: string, subtaskCount = 0) => {
  if (dueDate) {
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 2;
    if (diffDays <= 3) return 1;
  }
  if (subtaskCount >= 5) return 2;
  if (subtaskCount >= 3) return 1;
  return 0;
};

// ---------------------------
// Components
// ---------------------------

const SidebarItem = ({ icon: Icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
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

const TaskItem = ({ task, selected, onClick, onToggle }: any) => (
  <div 
    onClick={onClick}
    className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border-b border-[#222222] ${
      selected ? 'bg-[#2C2C2C]' : 'hover:bg-[#222222]'
    }`}
  >
    <button 
      onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
        task.status === 'completed' 
          ? 'bg-[#5E5E5E] border-[#5E5E5E] text-white' 
          : 'border-[#555555] hover:border-[#888888]'
      }`}
    >
      {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
    </button>
    
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start">
        <p className={`text-sm leading-snug ${
          task.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#EEEEEE]'
        }`}>
          {task.title}
        </p>
        {(task as any).similarity !== undefined && (task as any).similarity > 0.7 && (
          <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded ml-2 whitespace-nowrap">
            {Math.round((task as any).similarity * 100)}%
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`text-[10px] flex items-center gap-0.5 ${getPriorityColor(task.priority)}`}>
          <Flag className="w-3 h-3 fill-current" />
          {PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[0]}
        </span>
        {task.category && (
          <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 rounded">
            {task.category}
          </span>
        )}
        {task.subtasks?.length ? (
          <span className="text-[10px] text-[#666666]">
            {task.subtasks.filter((subtask: Subtask) => subtask.completed).length}/{task.subtasks.length} 子任务
          </span>
        ) : null}
        {task.dueDate && (
          <span className="text-[10px] text-[#888888] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {task.dueDate.split('T')[0]}
          </span>
        )}
        {task.tags?.map((tag: string) => (
          <span key={tag} className="text-[10px] text-[#666666]">#{tag}</span>
        ))}
      </div>
    </div>
  </div>
);

// ---------------------------
// Main Layout
// ---------------------------

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [modelListText, setModelListText] = useState(DEFAULT_MODEL_LIST.join('\n'));
  const [chatModel, setChatModel] = useState(DEFAULT_MODEL_LIST[0]);
  const [embeddingModel, setEmbeddingModel] = useState(DEFAULT_EMBEDDING_MODEL);
  const [fallbackTimeoutSec, setFallbackTimeoutSec] = useState(DEFAULT_FALLBACK_TIMEOUT_SEC);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState('inbox'); // inbox, today, next7, completed, search, calendar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const persistSettings = (next: {
    apiKey: string;
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    embeddingModel: string;
    fallbackTimeoutSec: number;
  }) => {
    localStorage.setItem('recall_api_key', next.apiKey);
    localStorage.setItem('recall_api_base_url', next.apiBaseUrl);
    localStorage.setItem('recall_model_list', next.modelListText);
    localStorage.setItem('recall_chat_model', next.chatModel);
    localStorage.setItem('recall_embedding_model', next.embeddingModel);
    localStorage.setItem('recall_fallback_timeout_sec', String(next.fallbackTimeoutSec));
  };

  // Load Initial Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('recall_api_key');
      const storedBaseUrl = localStorage.getItem('recall_api_base_url');
      const storedModelList = localStorage.getItem('recall_model_list');
      const storedChatModel = localStorage.getItem('recall_chat_model');
      const storedEmbeddingModel = localStorage.getItem('recall_embedding_model');
      const storedFallbackTimeout = localStorage.getItem('recall_fallback_timeout_sec');

      if (storedKey) setApiKey(storedKey);
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

      refreshTasks();
    }
  }, []);

  useEffect(() => {
    setNewSubtaskTitle('');
  }, [selectedTask?.id]);

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

  const refreshTasks = () => {
    const all = taskStore.getAll();
    setTasks(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'search') return true;
    if (activeFilter === 'completed') return t.status === 'completed';
    if (t.status === 'completed') return false; // Hide completed in other views
    
    if (activeFilter === 'today') {
      if (!t.dueDate) return false;
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate.split('T')[0] === today;
    }
    return true; // Default (todo/inbox/other views use full list for now)
  });

  const normalizeTimeoutSec = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_FALLBACK_TIMEOUT_SEC;
    return Math.round(numeric);
  };

  const parseChineseWeekdayInput = (raw: string) => {
    const match = raw.match(
      /(下周|本周)?(周|星期)([一二三四五六日天])\s*(上午|下午|晚上|中午)?\s*(\d{1,2})?(?:[:：点](\d{1,2}))?(?:分)?/,
    );
    if (!match) {
      return { text: raw };
    }

    const [, weekPrefix, , weekdayCn, period, hourText, minuteText] = match;
    const targetWeekday = WEEKDAY_MAP[weekdayCn];
    const now = new Date();
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

  const parseRelativeDayInput = (raw: string) => {
    const match = raw.match(/(大后天|后天|今天|明天|今晚|明早|明天早上|明天上午|明天中午|明天下午|明天晚上|下下周([一二三四五六日天])?|月底|月末)/);
    if (!match) return { text: raw };

    const now = new Date();
    let base = new Date(now);
    const keyword = match[1];

    if (keyword === '月底' || keyword === '月末') {
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      end.setHours(9, 0, 0, 0);
      base = end;
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

  const parseFuzzyPeriodOnly = (raw: string) => {
    const periodMatch = raw.match(/(凌晨|早上|上午|中午|下午|晚上|今晚|明早)/);
    if (!periodMatch) return { text: raw };
    const cleaned = raw.replace(periodMatch[0], ' ').replace(/\s+/g, ' ').trim();
    const defaultHour = PERIOD_DEFAULT_HOUR[periodMatch[1]] ?? 9;
    const base = new Date();
    base.setHours(defaultHour, 0, 0, 0);
    return { dueDate: base.toISOString(), text: cleaned };
  };

  const parseHolidayInput = (raw: string) => {
    const match = raw.match(/(元旦|春节|清明|劳动节|端午|中秋|国庆)/);
    if (!match) return { text: raw };
    const now = new Date();
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

  const parseLocalTaskInput = (raw: string) => {
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
      const weekdayParsed = parseChineseWeekdayInput(title);
      if (weekdayParsed.dueDate) {
        dueDate = weekdayParsed.dueDate;
        title = weekdayParsed.text || title;
      }
    }

    if (!dueDate) {
      const relativeParsed = parseRelativeDayInput(title);
      if (relativeParsed.dueDate) {
        dueDate = relativeParsed.dueDate;
        title = relativeParsed.text || title;
      }
    }

    const timeRangeParsed = parseTimeRangeInput(title);
    if (timeRangeParsed.timeRange) {
      title = timeRangeParsed.text || title;
      if (!dueDate) {
        const base = new Date();
        base.setHours(timeRangeParsed.timeRange.startHour, timeRangeParsed.timeRange.startMinute, 0, 0);
        dueDate = base.toISOString();
      } else {
        const base = new Date(dueDate);
        base.setHours(timeRangeParsed.timeRange.startHour, timeRangeParsed.timeRange.startMinute, 0, 0);
        dueDate = base.toISOString();
      }
    }

    if (!dueDate) {
      const holidayParsed = parseHolidayInput(title);
      if (holidayParsed.dueDate) {
        dueDate = holidayParsed.dueDate;
        title = holidayParsed.text || title;
      }
    }

    if (!dueDate) {
      const fuzzyParsed = parseFuzzyPeriodOnly(title);
      if (fuzzyParsed.dueDate) {
        dueDate = fuzzyParsed.dueDate;
        title = fuzzyParsed.text || title;
      }
    }

    if (!dueDate) {
      // 匹配 "today" 或 "tomorrow"，要求前后是边界
      // 中文 "今天"、"明天" 不需要边界
      if (title.includes('今天') || /(?:^|\s)today(?:\s|$)/i.test(title)) {
        dueDate = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
        title = title.replace(/今天/g, ' ').replace(/(?:^|\s)today(?:\s|$)/ig, ' ').trim();
      } else if (title.includes('明天') || /(?:^|\s)tomorrow(?:\s|$)/i.test(title)) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        dueDate = date.toISOString().split('T')[0] + 'T00:00:00.000Z';
        title = title.replace(/明天/g, ' ').replace(/(?:^|\s)tomorrow(?:\s|$)/ig, ' ').trim();
      }
    }

    title = title.replace(/提醒我|帮我提醒|请提醒/g, ' ').replace(/\s+/g, ' ').trim();

    if (!title) title = 'Untitled';

    return { title, tags, dueDate };
  };

  const createLocalTaskFromInput = (raw: string) => {
    const parsed = parseLocalTaskInput(raw);
    const category = classifyCategory(raw);
    const priority = evaluatePriority(parsed.dueDate, 0);
    const task: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: parsed.title,
      dueDate: parsed.dueDate,
      priority,
      category,
      status: 'todo',
      tags: parsed.tags,
      subtasks: [],
      createdAt: new Date().toISOString(),
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
        const taskWithEmbedding = { ...data.task, embedding: data.embedding };
        taskStore.add(taskWithEmbedding);
        refreshTasks();
        setInput('');
      } else if (!isSearch) {
        createLocalTaskFromInput(rawInput);
      } else {
        throw new Error('Missing embedding');
      }
    } catch (e) {
      console.error(e);
      if (isSearch) {
        alert('Failed. Check API Key.');
        if (!apiKey) setShowSettings(true);
      } else {
        createLocalTaskFromInput(rawInput);
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
  };

  const toggleStatus = (id: string) => {
    const all = taskStore.getAll();
    const target = all.find(t => t.id === id);
    if (target) {
      const updated: Task = { ...target, status: target.status === 'completed' ? 'todo' : 'completed' };
      updateTask(updated);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);

    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          mode: 'search',
          ...(apiKey ? { apiKey } : {}),
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
          embeddingModel: embeddingModel?.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      if (data.embedding) {
        const results = taskStore.search(data.embedding);
        setTasks(results);
        setActiveFilter('search');
        setShowSearch(false);
        setSelectedTask(null);
      }
    } catch (e) {
      console.error(e);
      const fallback = taskStore.getAll().filter((task) => {
        const keyword = query.toLowerCase();
        return (
          task.title.toLowerCase().includes(keyword) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(keyword))
        );
      });
      setTasks(fallback);
      setActiveFilter('search');
      setShowSearch(false);
      setSelectedTask(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const all = taskStore.getAll();
    const target = all.find((task) => task.id === taskId);
    if (!target) return;
    const updatedSubtasks = (target.subtasks || []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
    );
    updateTask({ ...target, subtasks: updatedSubtasks });
  };

  const addSubtask = () => {
    if (!selectedTask) return;
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const nextSubtasks = [
      ...(selectedTask.subtasks || []),
      { id: Math.random().toString(36).substring(2, 9), title, completed: false },
    ];
    updateTask({ ...selectedTask, subtasks: nextSubtasks });
    setNewSubtaskTitle('');
  };

  const updatePriority = (priority: number) => {
    if (!selectedTask) return;
    updateTask({ ...selectedTask, priority });
  };

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.dueDate) {
      const key = task.dueDate.split('T')[0];
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
  const todayKey = new Date().toISOString().split('T')[0];
  const selectedCalendarTasks = selectedCalendarDate ? (tasksByDate[selectedCalendarDate] || []) : [];

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-[#EEEEEE] overflow-hidden font-sans relative">
      
      {/* 1. Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[78vw] max-w-[300px] bg-[#222222] border-r border-[#333333] transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-[240px] lg:shadow-none
      `}>
        <div className="p-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              R
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

        <nav className="flex-1 px-2 space-y-1">
          <SidebarItem 
            icon={CheckSquare} label="待办" count={tasks.filter(t => t.status !== 'completed').length} 
            active={activeFilter === 'todo'} 
            onClick={() => { setActiveFilter('todo'); refreshTasks(); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Calendar} label="日历" count={0} 
            active={activeFilter === 'calendar'} 
            onClick={() => { setActiveFilter('calendar'); refreshTasks(); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={LayoutGrid} label="四象限" count={0} 
            active={activeFilter === 'quadrant'} 
            onClick={() => { setActiveFilter('quadrant'); refreshTasks(); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Timer} label="倒数日" count={0} 
            active={activeFilter === 'countdown'} 
            onClick={() => { setActiveFilter('countdown'); refreshTasks(); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Flame} label="习惯打卡" count={0} 
            active={activeFilter === 'habit'} 
            onClick={() => { setActiveFilter('habit'); refreshTasks(); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Search} label="搜索" count={0} 
            active={activeFilter === 'search'} 
            onClick={() => { setActiveFilter('search'); setShowSearch(true); }} 
          />
          <SidebarItem 
            icon={Timer} label="番茄时钟" count={0} 
            active={activeFilter === 'pomodoro'} 
            onClick={() => { setActiveFilter('pomodoro'); refreshTasks(); setIsSidebarOpen(false); }} 
          />

          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider">
            快捷入口
          </div>
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
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider">
            列表
          </div>
          <SidebarItem icon={Hash} label="工作" count={0} />
          <SidebarItem icon={Hash} label="个人" count={0} />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-[#555555] uppercase tracking-wider">
            标签
          </div>
          <SidebarItem icon={TagIcon} label="购物" count={0} />
        </nav>

        <div className="p-2 border-t border-[#333333]">
          <SidebarItem 
            icon={CheckCircle2} 
            label="已完成" 
            onClick={() => { setActiveFilter('completed'); setIsSidebarOpen(false); }} 
            active={activeFilter === 'completed'} 
          />
          <SidebarItem icon={Settings} label="设置" onClick={() => setShowSettings(true)} />
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
        <header className="h-14 border-b border-[#333333] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 -ml-1 text-[#888888] hover:text-[#CCCCCC]"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {activeFilter === 'inbox' && <Inbox className="w-5 h-5 text-blue-500" />}
              {activeFilter === 'today' && <Sun className="w-5 h-5 text-yellow-500" />}
              {activeFilter === 'search' && <Search className="w-5 h-5 text-purple-500" />}
              {FILTER_LABELS[activeFilter] ?? '待办'}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[#666666]">
            <AlignLeft
              onClick={() => setShowSearch(true)}
              className="w-5 h-5 cursor-pointer hover:text-[#AAAAAA]"
            />
            <MoreVertical
              onClick={() => setShowSettings(true)}
              className="w-5 h-5 cursor-pointer hover:text-[#AAAAAA]"
            />
          </div>
        </header>

        <div className="px-6 py-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 bg-[#262626] border border-[#333333] rounded-lg px-4 py-3 shadow-sm focus-within:border-[#444444] focus-within:ring-1 focus-within:ring-[#444444] transition-all">
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
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="space-y-1">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#444444]">
                <Inbox className="w-16 h-16 mb-4 opacity-20" />
                <p>暂无任务</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  selected={selectedTask?.id === task.id}
                  onClick={() => setSelectedTask(task)}
                  onToggle={toggleStatus}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. Detail Sidebar (Right) */}
      {selectedTask && (
        <aside className="fixed inset-y-0 right-0 z-50 lg:z-10 w-full sm:w-[350px] lg:relative lg:w-[300px] bg-[#222222] border-l border-[#333333] flex flex-col animate-in slide-in-from-right duration-200">
          <div className="h-14 border-b border-[#333333] flex items-center justify-between px-4 shrink-0">
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
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3 mb-6">
              <button 
                onClick={() => toggleStatus(selectedTask.id)}
                className={`mt-1 w-5 h-5 rounded flex items-center justify-center border ${
                  selectedTask.status === 'completed' 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-[#555555]'
                }`}
              >
                {selectedTask.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <h3 className={`text-xl font-semibold leading-snug ${
                selectedTask.status === 'completed' ? 'line-through text-[#666666]' : ''
              }`}>
                {selectedTask.title}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">日期</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] pointer-events-none" />
                    <input 
                      type="date"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-9 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
                      value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const date = val ? val + 'T00:00:00.000Z' : undefined;
                        updateTask({ ...selectedTask, dueDate: date });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase">优先级</label>
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
                  {CATEGORY_OPTIONS.map((category) => (
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
                    <span key={tag} className="text-xs bg-[#333333] px-2 py-1 rounded text-[#CCCCCC]">
                      #{tag}
                    </span>
                  )) : <span className="text-sm text-[#666666]">暂无标签</span>}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">设置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI 接口地址</label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI API 密钥</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">模型列表 (逗号或换行分隔)</label>
                <textarea
                  value={modelListText}
                  onChange={(e) => setModelListText(e.target.value)}
                  placeholder={DEFAULT_MODEL_LIST.join('\n')}
                  rows={4}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">对话模型</label>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                >
                  {parseModelList(modelListText).map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">Embedding 模型</label>
                <input
                  type="text"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  placeholder={DEFAULT_EMBEDDING_MODEL}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-2 uppercase">创建超时转本地（秒）</label>
                <input
                  type="number"
                  min={1}
                  value={fallbackTimeoutSec}
                  onChange={(e) => setFallbackTimeoutSec(Number(e.target.value))}
                  placeholder={String(DEFAULT_FALLBACK_TIMEOUT_SEC)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-[#555555] mt-1">超时将直接本地创建，避免无法新增（可自由设置）</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm text-[#AAAAAA] hover:text-white transition-colors"
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
                    });
                    setShowSettings(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#262626] w-full max-w-sm rounded-xl border border-[#333333] shadow-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">搜索任务</h2>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入关键词搜索任务"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="px-4 py-2 text-sm text-[#AAAAAA] hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchLoading ? '搜索中...' : '搜索'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-3 right-4 text-xs text-[#555555]">v0.5.1</div>
    </div>
  );
}

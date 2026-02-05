"use client";

import { useState, useEffect, useRef } from 'react';
import { taskStore, habitStore, countdownStore, Task, Subtask, Attachment, RepeatType, TaskRepeatRule, Habit, Countdown } from '@/lib/store';
import PomodoroTimer from '@/app/components/PomodoroTimer';
import Sidebar from '@/app/components/sidebar/Sidebar';
import SettingsModal from '@/app/components/settings/SettingsModal';
import TaskItem from '@/app/components/tasks/TaskItem';
import {
  Command, Send, Plus,
  Calendar, Inbox, Sun, Star, Trash2,
  Menu, X, CheckCircle2,
  Flag, Tag as TagIcon, Hash, ChevronLeft, ChevronRight,
  CheckSquare, LayoutGrid, Timer, Flame, Moon, Terminal, Settings, Cloud, Loader2,
  ImagePlus, Monitor, Paperclip, Upload,
} from 'lucide-react';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_MODEL_LIST = ['gemini-2.5-flash-lite'];
const DEFAULT_FALLBACK_TIMEOUT_SEC = 2;
const DEFAULT_SESSION_ID_KEY = 'recall_session_id';
const BING_WALLPAPER_API = '/api/bing-wallpaper';
const DEFAULT_REDIS_DB = 0;
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';
const APP_VERSION = '0.9beta';
const APP_VERSION_KEY = 'recall_app_version';
const LISTS_KEY = 'recall_lists';
const WEBDAV_URL_KEY = 'recall_webdav_url';
const WEBDAV_PATH_KEY = 'recall_webdav_path';
const WEBDAV_USERNAME_KEY = 'recall_webdav_username';
const WEBDAV_PASSWORD_KEY = 'recall_webdav_password';
const WEBDAV_AUTO_SYNC_KEY = 'recall_webdav_auto_sync';
const WEBDAV_AUTO_SYNC_INTERVAL_KEY = 'recall_webdav_auto_sync_interval';
const PG_HOST_KEY = 'recall_pg_host';
const PG_PORT_KEY = 'recall_pg_port';
const PG_DATABASE_KEY = 'recall_pg_database';
const PG_USERNAME_KEY = 'recall_pg_username';
const PG_PASSWORD_KEY = 'recall_pg_password';
const REDIS_HOST_KEY = 'recall_redis_host';
const REDIS_PORT_KEY = 'recall_redis_port';
const REDIS_DB_KEY = 'recall_redis_db';
const REDIS_PASSWORD_KEY = 'recall_redis_password';
const SYNC_NAMESPACE_KEY = 'recall_sync_namespace';
const LAST_LOCAL_CHANGE_KEY = 'recall_last_local_change';
const CALENDAR_SUBSCRIPTION_KEY = 'recall_calendar_subscription';
const DELETED_COUNTDOWNS_KEY = 'recall_deleted_countdowns';
const DELETED_HABITS_KEY = 'recall_deleted_habits';
const COUNTDOWN_DISPLAY_MODE_KEY = 'recall_countdown_display_mode';
const AI_RETENTION_KEY = 'recall_ai_retention';
const SIDEBAR_WIDTH_KEY = 'recall_sidebar_width';
const SIDEBAR_COLLAPSED_KEY = 'recall_sidebar_collapsed';
const DEFAULT_AUTO_SYNC_INTERVAL_MIN = 30;
const DEFAULT_SYNC_NAMESPACE = 'recall-default';
const AUTO_SYNC_INTERVAL_OPTIONS = [5, 15, 30, 60, 120];
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
  todo: '待办（别拖）',
  calendar: '日历（时间魔法）',
  quadrant: '四象限（老板最爱）',
  countdown: '倒数日（小期待）',
  habit: '习惯打卡（今天也行）',
  agent: 'AI 助手（碎碎念）',
  search: '搜索（翻旧账）',
  pomodoro: '番茄时钟（先冲一会）',
  category: '列表（小分组）',
  tag: '标签（贴一贴）',
  inbox: '收件箱（兜底区）',
  today: '今日（别摸鱼）',
  next7: '未来7天（未雨绸缪）',
  completed: '已完成（功德+1）',
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

const normalizeLunarDate = (raw?: string) => {
  if (!raw) return '';
  const text = String(raw);
  const cleaned = text.replace(/农历/g, '').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split('年');
  const lunarPart = parts.length > 1 ? parts[1] : cleaned;
  return lunarPart.replace(/[()（）（）]/g, '').replace(/\s+/g, '').trim();
};

const extractCalendarNote = (data: Record<string, any>) => {
  const direct = data?.['农历节日'] || data?.['节日'] || data?.['节气'] || data?.['节日名称'];
  if (direct) return String(direct);
  const lunar = normalizeLunarDate(data?.['农历日期']);
  if (lunar) return lunar;
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

const formatCountdownDate = (dateText: string) => {
  const [year, month, day] = dateText.split('-');
  if (!year || !month || !day) return dateText;
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
};

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

const formatRepeatLabel = (rule?: TaskRepeatRule) => {
  if (!rule || rule.type === 'none') return '';
  switch (rule.type) {
    case 'daily':
      return '重复·每天';
    case 'weekly': {
      const weekdays = rule.weekdays?.length
        ? rule.weekdays.map((day) => REPEAT_WEEKDAYS[day]).join('')
        : '';
      return weekdays ? `重复·每周${weekdays}` : '重复·每周';
    }
    case 'monthly':
      return `重复·每月${rule.monthDay ?? 1}日`;
    case 'custom':
      return `重复·每${rule.interval ?? 1}天`;
    default:
      return '重复';
  }
};

type TaskSortMode = 'priority' | 'dueDate' | 'createdAt' | 'title' | 'manual';
type TaskGroupMode = 'none' | 'category' | 'priority' | 'dueDate';
type TaskGroup = { key: string; label: string; items: Task[] };

const QUADRANT_COLLAPSE_LIMIT = 6;

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

type CountdownAgentItem = {
  id: string;
  title: string;
  targetDate?: string;
};

type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ImageAttachment = {
  id: string;
  file: File;
  dataUrl: string;
};

type CountdownDisplayMode = 'days' | 'date';

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

const readImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read image failed'));
    reader.readAsDataURL(file);
  });

const filterImageFiles = (files: File[]) =>
  files.filter((file) => file.type.startsWith('image/'));

const readDeletedMap = (key: string): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch (error) {
    console.error(`Failed to read deleted map for ${key}`, error);
    return {};
  }
};

const persistDeletedMap = (key: string, next: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.error(`Failed to write deleted map for ${key}`, error);
  }
};

const markDeleted = (key: string, id: string, deletedAt = new Date().toISOString()) => {
  const current = readDeletedMap(key);
  const existing = current[id];
  const incomingMs = new Date(deletedAt).getTime();
  const existingMs = existing ? new Date(existing).getTime() : 0;
  if (!existing || incomingMs > existingMs) {
    current[id] = deletedAt;
    persistDeletedMap(key, current);
  }
  return current;
};

const normalizeDeletedMap = (value: any): Record<string, string> => {
  if (Array.isArray(value)) {
    const now = new Date().toISOString();
    return value.reduce<Record<string, string>>((acc, id) => {
      if (typeof id === 'string') acc[id] = now;
      return acc;
    }, {});
  }
  if (value && typeof value === 'object') {
    const next: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([id, time]) => {
      if (typeof id === 'string' && typeof time === 'string') {
        next[id] = time;
      }
    });
    return next;
  }
  return {};
};

const mergeDeletedMap = (current: Record<string, string>, incoming: Record<string, string>) => {
  const next = { ...current };
  Object.entries(incoming).forEach(([id, time]) => {
    const incomingMs = new Date(time).getTime();
    const existingMs = next[id] ? new Date(next[id]).getTime() : 0;
    if (Number.isNaN(incomingMs)) return;
    if (!next[id] || incomingMs > existingMs) {
      next[id] = time;
    }
  });
  return next;
};

const filterByDeletions = <T extends { id: string; updatedAt?: string; createdAt: string }>(
  items: T[],
  deletedMap: Record<string, string>
) => {
  const nextDeleted = { ...deletedMap };
  const filtered = items.filter((item) => {
    const deletedAt = deletedMap[item.id];
    if (!deletedAt) return true;
    const deletedMs = new Date(deletedAt).getTime();
    const updatedMs = item.updatedAt
      ? new Date(item.updatedAt).getTime()
      : new Date(item.createdAt).getTime();
    if (updatedMs > deletedMs) {
      delete nextDeleted[item.id];
      return true;
    }
    return false;
  });
  return { filtered, nextDeleted };
};

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
  const [fallbackTimeoutSec, setFallbackTimeoutSec] = useState(DEFAULT_FALLBACK_TIMEOUT_SEC);
  const [sessionId, setSessionId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState('inbox'); // inbox, today, next7, completed, calendar, agent
  const [taskSortMode, setTaskSortMode] = useState<TaskSortMode>('dueDate');
  const [taskGroupMode, setTaskGroupMode] = useState<TaskGroupMode>('dueDate');
  const [webdavUrl, setWebdavUrl] = useState(DEFAULT_WEBDAV_URL);
  const [webdavPath, setWebdavPath] = useState(DEFAULT_WEBDAV_PATH);
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('');
  const [pgDatabase, setPgDatabase] = useState('');
  const [pgUsername, setPgUsername] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [redisHost, setRedisHost] = useState('');
  const [redisPort, setRedisPort] = useState(String(DEFAULT_REDIS_PORT));
  const [redisDb, setRedisDb] = useState(String(DEFAULT_REDIS_DB));
  const [redisPassword, setRedisPassword] = useState('');
  const [syncNamespace, setSyncNamespace] = useState(DEFAULT_SYNC_NAMESPACE);
  const [calendarSubscription, setCalendarSubscription] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(DEFAULT_AUTO_SYNC_INTERVAL_MIN);
  const [countdownDisplayMode, setCountdownDisplayMode] = useState<CountdownDisplayMode>('days');
  const [aiRetentionDays, setAiRetentionDays] = useState(1);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240); // PC端侧边栏宽度（像素）
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // PC端侧边栏是否折叠
  const [habits, setHabits] = useState<Habit[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [showCountdownForm, setShowCountdownForm] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isTodoOpen, setIsTodoOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isListsOpen, setIsListsOpen] = useState(true);
  const [expandedQuadrants, setExpandedQuadrants] = useState<Record<string, boolean>>({});
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [showCompletedInCalendar, setShowCompletedInCalendar] = useState(false);
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [listItems, setListItems] = useState<string[]>([]);
  const [tagItems, setTagItems] = useState<string[]>([]);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [bingWallpaperUrl, setBingWallpaperUrl] = useState('');
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [logs, setLogs] = useState<
    {
      id: string;
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
      detail?: string;
      timestamp: string;
    }[]
  >([]);
  // todo-agent 聊天状态
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentImages, setAgentImages] = useState<ImageAttachment[]>([]);
  const agentImageInputRef = useRef<HTMLInputElement | null>(null);
  const [agentItems, setAgentItems] = useState<AgentItem[]>([]);
  const [addedAgentItemIds, setAddedAgentItemIds] = useState<Set<string>>(new Set());
  const [agentError, setAgentError] = useState<string | null>(null);
  // 倒数日 AI 聊天状态
  const [countdownAgentMessages, setCountdownAgentMessages] = useState<AgentMessage[]>([]);
  const [countdownAgentInput, setCountdownAgentInput] = useState('');
  const [countdownAgentLoading, setCountdownAgentLoading] = useState(false);
  const [countdownAgentItems, setCountdownAgentItems] = useState<CountdownAgentItem[]>([]);
  const [addedCountdownAgentItemIds, setAddedCountdownAgentItemIds] = useState<Set<string>>(new Set());
  const [countdownAgentError, setCountdownAgentError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
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
  const themePreference: 'light' | 'dark' | 'system' = isSystemTheme ? 'system' : themeMode;
  const taskItemHelpers = {
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    formatZonedTime,
    buildDueDateIso,
    getTimezoneLabel,
    getPriorityColor,
    getPriorityLabel,
    formatRepeatLabel,
    isTaskOverdue,
  };

  const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  };

  const setThemePreference = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'system') {
      setIsSystemTheme(true);
      setThemeMode(getSystemTheme());
      return;
    }
    setIsSystemTheme(false);
    setThemeMode(mode);
  };

  const handleThemeToggle = () => {
    const nextMode = themePreference === 'system'
      ? 'light'
      : themePreference === 'light'
      ? 'dark'
      : 'system';
    setThemePreference(nextMode);
  };

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

  const pollSyncJob = async (jobId: string, timeoutMs = 60_000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const syncParams = new URLSearchParams({ jobId });
      if (redisHost) syncParams.set('redisHost', redisHost);
      if (redisPort) syncParams.set('redisPort', redisPort);
      if (redisDb) syncParams.set('redisDb', redisDb);
      if (redisPassword) syncParams.set('redisPassword', redisPassword);
      const res = await fetch(`/api/sync?${syncParams.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '同步状态获取失败');
      }
      if (data.status === 'done') {
        return data.result;
      }
      if (data.status === 'failed') {
        throw new Error(data?.error || '同步失败');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('同步超时');
  };

  const persistSettings = (next: {
    apiKey: string;
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    fallbackTimeoutSec: number;
    webdavUrl: string;
    webdavPath: string;
    webdavUsername: string;
    webdavPassword: string;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;
    countdownDisplayMode: CountdownDisplayMode;
    aiRetentionDays: number;
    pgHost: string;
    pgPort: string;
    pgDatabase: string;
    pgUsername: string;
    pgPassword: string;
    redisHost: string;
    redisPort: string;
    redisDb: string;
    redisPassword: string;
    syncNamespace: string;
    calendarSubscription: string;
  }) => {
    localStorage.setItem('recall_api_key', next.apiKey);
    localStorage.setItem('recall_api_base_url', next.apiBaseUrl);
    localStorage.setItem('recall_model_list', next.modelListText);
    localStorage.setItem('recall_chat_model', next.chatModel);
    localStorage.setItem('recall_fallback_timeout_sec', String(next.fallbackTimeoutSec));
    localStorage.setItem(WEBDAV_URL_KEY, next.webdavUrl);
    localStorage.setItem(WEBDAV_PATH_KEY, next.webdavPath);
    localStorage.setItem(WEBDAV_USERNAME_KEY, next.webdavUsername);
    localStorage.setItem(WEBDAV_PASSWORD_KEY, next.webdavPassword);
    localStorage.setItem(WEBDAV_AUTO_SYNC_KEY, String(next.autoSyncEnabled));
    localStorage.setItem(WEBDAV_AUTO_SYNC_INTERVAL_KEY, String(next.autoSyncInterval));
    localStorage.setItem(COUNTDOWN_DISPLAY_MODE_KEY, next.countdownDisplayMode);
    localStorage.setItem(AI_RETENTION_KEY, String(next.aiRetentionDays));
    localStorage.setItem(PG_HOST_KEY, next.pgHost);
    localStorage.setItem(PG_PORT_KEY, next.pgPort);
    localStorage.setItem(PG_DATABASE_KEY, next.pgDatabase);
    localStorage.setItem(PG_USERNAME_KEY, next.pgUsername);
    localStorage.setItem(PG_PASSWORD_KEY, next.pgPassword);
    localStorage.setItem(REDIS_HOST_KEY, next.redisHost);
    localStorage.setItem(REDIS_PORT_KEY, next.redisPort);
    localStorage.setItem(REDIS_DB_KEY, next.redisDb);
    localStorage.setItem(REDIS_PASSWORD_KEY, next.redisPassword);
    localStorage.setItem(SYNC_NAMESPACE_KEY, next.syncNamespace);
    localStorage.setItem(CALENDAR_SUBSCRIPTION_KEY, next.calendarSubscription);
    localStorage.setItem(LAST_LOCAL_CHANGE_KEY, new Date().toISOString());
  };

  const getLastLocalChange = () => {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem(LAST_LOCAL_CHANGE_KEY) ?? new Date().toISOString();
  };

  const refreshNotificationPermission = () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    setNotificationPermission(Notification.permission);
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined') return;
    if (!notificationSupported) {
      pushLog('warning', '浏览器不支持通知');
      return;
    }
    if (!isSecureContext) {
      pushLog('warning', '当前环境非安全上下文', '请使用 https 或 localhost');
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        pushLog('success', '通知权限已授权');
      } else if (result === 'denied') {
        pushLog('warning', '通知权限被拒绝');
      } else {
        pushLog('info', '通知权限未授权');
      }
    } catch (error) {
      pushLog('error', '通知权限请求失败', String((error as Error)?.message || error));
    }
  };

  const sendTestNotification = async () => {
    if (typeof window === 'undefined') return;
    if (!notificationSupported) return;
    refreshNotificationPermission();
    if (Notification.permission !== 'granted') {
      pushLog('warning', '通知权限未授权', '请先点击“申请权限”');
      return;
    }

    const payload = {
      title: 'Recall 通知测试',
      body: '这是来自 Recall 的测试通知。',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'recall-test',
      data: { url: '/' },
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration?.showNotification) {
          await registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            tag: payload.tag,
            data: payload.data,
          });
          pushLog('success', '通知已发送', '通过 Service Worker 通道');
          return;
        }
        if (registration?.active) {
          registration.active.postMessage({ type: 'SHOW_NOTIFICATION', payload });
          pushLog('success', '通知已发送', '通过 Service Worker 消息通道');
          return;
        }
      }

      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data,
      });
      pushLog('success', '通知已发送', '使用浏览器通知 API');
    } catch (error) {
      pushLog('error', '通知发送失败', String((error as Error)?.message || error));
    }
  };

  const normalizeModelListText = (models: string[]) => {
    const unique = Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
    return unique.join('\n');
  };

  const fetchModelList = async () => {
    setIsFetchingModels(true);
    setModelFetchError(null);
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey?.trim() || undefined,
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '模型列表拉取失败');
      }
      const models = Array.isArray(data?.models) ? data.models : [];
      if (models.length === 0) {
        throw new Error('未返回可用模型');
      }
      const nextModelListText = normalizeModelListText(models);
      setModelListText(nextModelListText);
      const nextModels = parseModelList(nextModelListText);
      if (nextModels.length > 0 && !nextModels.includes(chatModel)) {
        setChatModel(nextModels[0]);
      }
      pushLog('success', '模型列表已更新', `共 ${models.length} 个`);
    } catch (error) {
      const message = (error as Error)?.message || '模型列表拉取失败';
      setModelFetchError(message);
      pushLog('error', '模型列表拉取失败', message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Load Initial Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedVersion = localStorage.getItem(APP_VERSION_KEY);
      if (cachedVersion !== APP_VERSION) {
        try {
          // 升级版本时仅清理业务数据，保留用户配置与同步信息，避免升级后丢失设置
          const keysToPreserve = new Set([
            APP_VERSION_KEY,
            'recall_api_key',
            'recall_api_base_url',
            'recall_model_list',
            'recall_chat_model',
            'recall_fallback_timeout_sec',
            DEFAULT_SESSION_ID_KEY,
            WEBDAV_URL_KEY,
            WEBDAV_PATH_KEY,
            WEBDAV_USERNAME_KEY,
            WEBDAV_PASSWORD_KEY,
            WEBDAV_AUTO_SYNC_KEY,
            WEBDAV_AUTO_SYNC_INTERVAL_KEY,
            COUNTDOWN_DISPLAY_MODE_KEY,
            PG_HOST_KEY,
            PG_PORT_KEY,
            PG_DATABASE_KEY,
            PG_USERNAME_KEY,
            PG_PASSWORD_KEY,
            REDIS_HOST_KEY,
            REDIS_PORT_KEY,
            REDIS_DB_KEY,
            REDIS_PASSWORD_KEY,
            SYNC_NAMESPACE_KEY,
            CALENDAR_SUBSCRIPTION_KEY,
            LAST_LOCAL_CHANGE_KEY,
            'recall_theme',
            SIDEBAR_WIDTH_KEY,
            SIDEBAR_COLLAPSED_KEY,
          ]);
          const preservedEntries = Object.keys(localStorage)
            .filter((key) => keysToPreserve.has(key))
            .map((key) => [key, localStorage.getItem(key)] as const);
          localStorage.clear();
          preservedEntries.forEach(([key, value]) => {
            if (value !== null) localStorage.setItem(key, value);
          });
          localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
        } catch (error) {
          console.error('Failed to migrate localStorage version', error);
        }
      }
      const storedKey = localStorage.getItem('recall_api_key');
      const storedBaseUrl = localStorage.getItem('recall_api_base_url');
      const storedModelList = localStorage.getItem('recall_model_list');
      const storedChatModel = localStorage.getItem('recall_chat_model');
      const storedFallbackTimeout = localStorage.getItem('recall_fallback_timeout_sec');
      const storedSessionId = localStorage.getItem(DEFAULT_SESSION_ID_KEY);
      const storedWebdavUrl = localStorage.getItem(WEBDAV_URL_KEY);
      const storedWebdavPath = localStorage.getItem(WEBDAV_PATH_KEY);
      const storedWebdavUsername = localStorage.getItem(WEBDAV_USERNAME_KEY);
      const storedWebdavPassword = localStorage.getItem(WEBDAV_PASSWORD_KEY);
      const storedAutoSyncEnabled = localStorage.getItem(WEBDAV_AUTO_SYNC_KEY);
      const storedAutoSyncInterval = localStorage.getItem(WEBDAV_AUTO_SYNC_INTERVAL_KEY);
      const storedCountdownDisplayMode = localStorage.getItem(COUNTDOWN_DISPLAY_MODE_KEY);
      const storedAiRetentionDays = localStorage.getItem(AI_RETENTION_KEY);
      const storedPgHost = localStorage.getItem(PG_HOST_KEY);
      const storedPgPort = localStorage.getItem(PG_PORT_KEY);
      const storedPgDatabase = localStorage.getItem(PG_DATABASE_KEY);
      const storedPgUsername = localStorage.getItem(PG_USERNAME_KEY);
      const storedPgPassword = localStorage.getItem(PG_PASSWORD_KEY);
      const storedRedisHost = localStorage.getItem(REDIS_HOST_KEY);
      const storedRedisPort = localStorage.getItem(REDIS_PORT_KEY);
      const storedRedisDb = localStorage.getItem(REDIS_DB_KEY);
      const storedRedisPassword = localStorage.getItem(REDIS_PASSWORD_KEY);
      const storedCalendarSubscription = localStorage.getItem(CALENDAR_SUBSCRIPTION_KEY);
      const storedSyncNamespace = localStorage.getItem(SYNC_NAMESPACE_KEY);

      if (storedKey) {
        setApiKey(storedKey);
      }
      if (storedBaseUrl) setApiBaseUrl(storedBaseUrl);
      if (storedModelList) setModelListText(storedModelList);
      if (storedChatModel) setChatModel(storedChatModel);
      if (storedFallbackTimeout) {
        const parsed = Number(storedFallbackTimeout);
        if (Number.isFinite(parsed) && parsed > 0) {
          setFallbackTimeoutSec(parsed);
        }
      }
      if (storedSessionId) {
        setSessionId(storedSessionId);
      } else {
        const newSessionId = createId();
        setSessionId(newSessionId);
        localStorage.setItem(DEFAULT_SESSION_ID_KEY, newSessionId);
      }
      if (storedWebdavUrl) setWebdavUrl(storedWebdavUrl);
      if (storedWebdavPath) setWebdavPath(storedWebdavPath);
      if (storedWebdavUsername) setWebdavUsername(storedWebdavUsername);
      if (storedWebdavPassword) setWebdavPassword(storedWebdavPassword);
      if (storedAutoSyncEnabled) {
        setAutoSyncEnabled(storedAutoSyncEnabled === 'true');
      }
      if (storedAutoSyncInterval) {
        const parsedInterval = Number(storedAutoSyncInterval);
        if (Number.isFinite(parsedInterval) && parsedInterval > 0) {
          setAutoSyncInterval(parsedInterval);
        }
      }
      if (storedPgHost) setPgHost(storedPgHost);
      if (storedPgPort) setPgPort(storedPgPort);
      if (storedPgDatabase) setPgDatabase(storedPgDatabase);
      if (storedPgUsername) setPgUsername(storedPgUsername);
      if (storedPgPassword) setPgPassword(storedPgPassword);
      if (storedRedisHost) setRedisHost(storedRedisHost);
      if (storedRedisPort) setRedisPort(storedRedisPort);
      if (storedRedisDb) setRedisDb(storedRedisDb);
      if (storedRedisPassword) setRedisPassword(storedRedisPassword);
      if (storedCalendarSubscription) setCalendarSubscription(storedCalendarSubscription);
      if (storedSyncNamespace) setSyncNamespace(storedSyncNamespace);
      if (storedCountdownDisplayMode === 'date') {
        setCountdownDisplayMode('date');
      } else {
        setCountdownDisplayMode('days');
      }
      if (storedAiRetentionDays) {
        const parsed = Number(storedAiRetentionDays);
        if (Number.isFinite(parsed)) {
          setAiRetentionDays(Math.max(1, Math.min(3, parsed)));
        }
      }

      // 读取侧边栏设置
      const storedSidebarWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (storedSidebarWidth) {
        const parsed = Number(storedSidebarWidth);
        if (Number.isFinite(parsed) && parsed >= 180 && parsed <= 480) {
          setSidebarWidth(parsed);
        }
      }
      const storedSidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (storedSidebarCollapsed === 'true') {
        setIsSidebarCollapsed(true);
      }

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

      const loadBingWallpaper = async () => {
        try {
          const response = await fetch(BING_WALLPAPER_API);
          if (!response.ok) return;
          const data = await response.json();
          if (data?.url) {
            setBingWallpaperUrl(data.url);
          }
        } catch (error) {
          console.error('Failed to fetch Bing wallpaper', error);
        }
      };

      loadBingWallpaper();

      if (!storedKey) {
        const inputKey = window.prompt('未检测到 AI 令牌，可输入以启用完整功能（可跳过）');
        if (inputKey && inputKey.trim()) {
          const normalizedKey = inputKey.trim();
          setApiKey(normalizedKey);
          localStorage.setItem('recall_api_key', normalizedKey);
        }
      }
      setSettingsLoaded(true);
    }
  }, []);

  // 注意：apiKey 的持久化已移至 persistSettings 函数中统一处理
  // 避免在用户编辑设置时意外丢失密钥

  // PG 数据加载逻辑
  useEffect(() => {
    if (!pgHost || !settingsLoaded) return;
    
    const loadFromPg = async () => {
      try {
        const headers = {
          'x-pg-host': pgHost,
          'x-pg-port': pgPort || '5432',
          'x-pg-database': pgDatabase,
          'x-pg-username': pgUsername,
          'x-pg-password': pgPassword,
        };
        
        const [tasksRes, habitsRes, countdownsRes] = await Promise.all([
          fetch('/api/tasks', { headers }),
          fetch('/api/habits', { headers }),
          fetch('/api/countdowns', { headers }),
        ]);

        // 定义简单的合并函数：以 updatedAt 为准，若远程较新则覆盖
        const mergeData = <T extends { id: string; updatedAt?: string; createdAt?: string }>(local: T[], remote: T[]) => {
          const map = new Map<string, T>();
          // 先放入本地数据
          local.forEach(item => map.set(item.id, item));
          
          let hasChange = false;
          // 合并远程数据
          remote.forEach(item => {
            const existing = map.get(item.id);
            if (!existing) {
              map.set(item.id, item);
              hasChange = true;
            } else {
              const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              const remoteTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
              if (remoteTime > localTime) {
                map.set(item.id, item);
                hasChange = true;
              }
            }
          });
          return { merged: Array.from(map.values()), hasChange };
        };

        // 处理 Tasks
        if (tasksRes.ok) {
          const remoteTasks = await tasksRes.json();
          if (Array.isArray(remoteTasks)) {
            const localTasks = taskStore.getAll();
            if (remoteTasks.length === 0 && localTasks.length > 0) {
              // 场景：PG 为空，本地有数据 -> 触发初次上传
              pushLog('info', 'PG 数据库为空', '正在上传本地数据...');
              // 异步逐个上传，避免阻塞 UI
              Promise.all(localTasks.map(t => 
                fetch('/api/tasks', { method: 'POST', headers, body: JSON.stringify(t) })
              )).then(() => pushLog('success', '本地数据已上传至 PG')).catch(e => pushLog('error', '上传失败', String(e)));
            } else {
              const { merged, hasChange } = mergeData(localTasks, remoteTasks);
              if (hasChange || localTasks.length !== merged.length) {
                taskStore.replaceAll(merged);
                setTasks(merged);
              }
            }
          }
        }

        // 处理 Habits
        if (habitsRes.ok) {
          const remoteHabits = await habitsRes.json();
          if (Array.isArray(remoteHabits)) {
            const localHabits = habitStore.getAll();
            if (remoteHabits.length === 0 && localHabits.length > 0) {
              Promise.all(localHabits.map(h => 
                fetch('/api/habits', { method: 'POST', headers, body: JSON.stringify(h) })
              ));
            } else {
              const { merged } = mergeData(localHabits, remoteHabits);
              habitStore.replaceAll(merged);
              setHabits(merged);
            }
          }
        }

        // 处理 Countdowns
        if (countdownsRes.ok) {
          const remoteCountdowns = await countdownsRes.json();
          if (Array.isArray(remoteCountdowns)) {
            const localCountdowns = countdownStore.getAll();
            if (remoteCountdowns.length === 0 && localCountdowns.length > 0) {
              Promise.all(localCountdowns.map(c => 
                fetch('/api/countdowns', { method: 'POST', headers, body: JSON.stringify(c) })
              ));
            } else {
              const { merged } = mergeData(localCountdowns, remoteCountdowns);
              countdownStore.replaceAll(merged);
              setCountdowns(merged);
            }
          }
        }
        pushLog('success', '已连接 PG 数据库', `Host: ${pgHost}`);
      } catch (error) {
        console.error('Failed to load from PG', error);
        pushLog('error', 'PG 连接/加载失败', String(error));
      }
    };

    loadFromPg();
  }, [pgHost, pgPort, pgDatabase, pgUsername, pgPassword, settingsLoaded]);

  useEffect(() => {
    pushLog('info', '应用已启动', pgHost ? `数据存储：PG (${pgHost})` : '数据存储：浏览器 localStorage');
  }, [pgHost]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supportNotification = 'Notification' in window;
    setNotificationSupported(supportNotification);
    setServiceWorkerSupported('serviceWorker' in navigator);
    setIsSecureContext(window.isSecureContext);
    if (supportNotification) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
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
    if (selectedTask) {
      setSelectedTask(null);
    }
    if (editingTaskId) {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  }, [activeFilter, activeCategory, activeTag]);

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
    const deletedMap = readDeletedMap(DELETED_HABITS_KEY);
    const { filtered, nextDeleted } = filterByDeletions(all, deletedMap);
    if (Object.keys(deletedMap).length !== Object.keys(nextDeleted).length) {
      persistDeletedMap(DELETED_HABITS_KEY, nextDeleted);
    }
    setHabits(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const refreshCountdowns = () => {
    const all = countdownStore.getAll();
    const deletedMap = readDeletedMap(DELETED_COUNTDOWNS_KEY);
    const { filtered, nextDeleted } = filterByDeletions(all, deletedMap);
    if (Object.keys(deletedMap).length !== Object.keys(nextDeleted).length) {
      persistDeletedMap(DELETED_COUNTDOWNS_KEY, nextDeleted);
    }
    const sorted = [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
    setCountdowns(sorted);
  };

  const createHabit = () => {
    const title = newHabitTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const habit: Habit = {
      id: createId(),
      title,
      createdAt: now,
      updatedAt: now,
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
    const now = new Date().toISOString();
    if (editingCountdown) {
      countdownStore.update({
        ...editingCountdown,
        title,
        targetDate: countdownDate,
        updatedAt: now,
      });
    } else {
      countdownStore.add({
        id: createId(),
        title,
        targetDate: countdownDate,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    refreshCountdowns();
    setShowCountdownForm(false);
    resetCountdownForm();
  };

  const toggleCountdownPinned = (item: Countdown) => {
    countdownStore.update({ ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() });
    refreshCountdowns();
  };

  const removeCountdown = (itemId: string) => {
    countdownStore.remove(itemId);
    markDeleted(DELETED_COUNTDOWNS_KEY, itemId);
    refreshCountdowns();
    // PG 同步
    syncToPg('countdowns', 'DELETE', { id: itemId });
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
      return { ...habit, logs: [...habit.logs, { date: today }], updatedAt: new Date().toISOString() };
    });
    habitStore.replaceAll(next);
    setHabits(next);
  };

  const removeHabit = (habitId: string) => {
    habitStore.remove(habitId);
    markDeleted(DELETED_HABITS_KEY, habitId);
    refreshHabits();
    // PG 同步
    syncToPg('habits', 'DELETE', { id: habitId });
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
        taskStore.update({ ...task, category: nextName, updatedAt: new Date().toISOString() });
      }
    });
    if (activeCategory === oldName) {
      setActiveCategory(nextName);
    }
    refreshTasks();
  };

  const renameListItem = (oldName: string, nextName: string) => {
    if (!nextName || nextName === oldName) return;
    setListItems((prev) => prev.map((item) => (item === oldName ? nextName : item)));
    taskStore.getAll().forEach((task) => {
      if (task.category === oldName) {
        taskStore.update({ ...task, category: nextName, updatedAt: new Date().toISOString() });
      }
    });
    if (activeCategory === oldName) {
      setActiveCategory(nextName);
    }
    refreshTasks();
  };

  const removeListItem = (name: string) => {
    if (!name) return;
    setListItems((prev) => prev.filter((item) => item !== name));
    taskStore.getAll().forEach((task) => {
      if (task.category === name) {
        taskStore.update({ ...task, category: '', updatedAt: new Date().toISOString() });
      }
    });
    if (activeCategory === name) {
      setActiveCategory('');
    }
    refreshTasks();
  };

  const addListItem = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    if (listItems.includes(trimmed)) {
      setNewListName('');
      setIsAddingList(false);
      return;
    }
    setListItems((prev) => [...prev, trimmed]);
    setNewListName('');
    setIsAddingList(false);
  };

  const renameTag = (oldName: string) => {
    if (typeof window === 'undefined') return;
    const nextName = window.prompt('重命名标签', oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    taskStore.getAll().forEach((task) => {
      if (!task.tags?.length) return;
      if (task.tags.includes(oldName)) {
        const updatedTags = task.tags.map((tag) => (tag === oldName ? nextName : tag));
        taskStore.update({ ...task, tags: updatedTags, updatedAt: new Date().toISOString() });
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
      updatedAt: now.toISOString(),
    };
    return task;
  };

  const addAgentImages = async (files: File[]) => {
    const imageFiles = filterImageFiles(files);
    if (imageFiles.length === 0) return;
    const remainingSlots = Math.max(0, 6 - agentImages.length);
    const selected = imageFiles.slice(0, remainingSlots);
    if (selected.length === 0) return;
    const attachments = await Promise.all(
      selected.map(async (file) => ({
        id: createId(),
        file,
        dataUrl: await readImageAsDataUrl(file),
      })),
    );
    setAgentImages((prev) => [...prev, ...attachments]);
  };

  const handleAgentImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    await addAgentImages(files);
    event.target.value = '';
  };

  const handleAgentPaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const files = Array.from(event.clipboardData.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    await addAgentImages(files);
  };

  const removeAgentImage = (id: string) => {
    setAgentImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleAgentSend = async () => {
    const content = agentInput.trim();
    if (!content && agentImages.length === 0) return;
    pushLog('info', 'todo-agent 请求发送', content);
    setAgentLoading(true);
    if (content) {
      setAgentMessages((prev) => [...prev, { role: 'user', content }]);
    } else {
      setAgentMessages((prev) => [...prev, { role: 'user', content: '发送了一张图片' }]);
    }

    try {
      setAgentError(null);
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'todo-agent',
          input: content,
          images: agentImages.map((image) => image.dataUrl),
          ...(apiKey ? { apiKey } : {}),
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
          chatModel: chatModel?.trim() || undefined,
          sessionId,
          retentionDays: aiRetentionDays,
          redisConfig: {
            host: redisHost,
            port: redisPort,
            db: redisDb,
            password: redisPassword,
          },
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
      // 不要添加 assistant 消息，而是让错误提示显示出来
      pushLog('error', 'todo-agent 请求失败', String(message));
    } finally {
      // 保持 input 不变以便重试，或者清空？用户通常希望保留以便修改
      // 这里我们不清空 agentInput 如果失败了
      if (!agentError) {
        setAgentInput('');
        setAgentImages([]);
      }
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

  const buildCountdownFromAgentItem = (item: CountdownAgentItem) => {
    const title = item.title?.trim() || '未命名倒数日';
    const targetDate = item.targetDate?.trim();
    if (!targetDate) return null;
    const now = new Date().toISOString();
    const countdown: Countdown = {
      id: createId(),
      title,
      targetDate,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    return countdown;
  };

  const handleCountdownAgentSend = async () => {
    const content = countdownAgentInput.trim();
    if (!content || countdownAgentLoading) return;
    pushLog('info', 'countdown-agent 请求发送', content);
    setCountdownAgentLoading(true);
    setCountdownAgentMessages((prev) => [...prev, { role: 'user', content }]);

    try {
      setCountdownAgentError(null);
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'countdown-agent',
          input: content,
          ...(apiKey ? { apiKey } : {}),
          apiBaseUrl: apiBaseUrl?.trim() || undefined,
          chatModel: chatModel?.trim() || undefined,
          sessionId,
          retentionDays: aiRetentionDays,
          redisConfig: {
            host: redisHost,
            port: redisPort,
            db: redisDb,
            password: redisPassword,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'countdown-agent request failed');
      }
      const replyText = typeof data?.reply === 'string' && data.reply.trim().length > 0
        ? data.reply.trim()
        : '已识别倒数日内容，点击即可加入。';
      const nextItems: CountdownAgentItem[] = Array.isArray(data?.items)
        ? data.items.map((item: CountdownAgentItem) => ({
            ...item,
            id: item.id || createId(),
            title: item.title?.trim() || '未命名倒数日',
          }))
        : [];
      setCountdownAgentMessages((prev) => [...prev, { role: 'assistant', content: replyText }]);
      setCountdownAgentItems(nextItems);
      setAddedCountdownAgentItemIds(new Set());
      pushLog('success', 'countdown-agent 返回成功', `建议倒数日 ${nextItems.length} 条`);
    } catch (error) {
      console.error(error);
      const message = (error as any)?.message || '倒数日助手无响应，请稍后重试';
      setCountdownAgentError(message);
      setCountdownAgentMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '我这边没连上服务，稍后再试试？' },
      ]);
      pushLog('error', 'countdown-agent 请求失败', String(message));
    } finally {
      setCountdownAgentInput('');
      setCountdownAgentLoading(false);
    }
  };

  const handleAddCountdownAgentItem = (item: CountdownAgentItem) => {
    if (addedCountdownAgentItemIds.has(item.id)) return;
    const countdown = buildCountdownFromAgentItem(item);
    if (!countdown) {
      const message = '该建议未识别到日期，请补充具体日期。';
      setCountdownAgentError(message);
      pushLog('warning', '倒数日缺少日期', item.title || '未命名倒数日');
      return;
    }
    setAddedCountdownAgentItemIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    countdownStore.add(countdown);
    refreshCountdowns();
  };

  const handleAddAllCountdownAgentItems = () => {
    const pendingItems = countdownAgentItems.filter((item) => !addedCountdownAgentItemIds.has(item.id));
    if (pendingItems.length === 0) return;
    const validItems = pendingItems
      .map((item) => ({ item, countdown: buildCountdownFromAgentItem(item) }))
      .filter((entry) => Boolean(entry.countdown));
    if (validItems.length === 0) {
      setCountdownAgentError('当前建议缺少日期，无法批量添加。');
      return;
    }

    setAddedCountdownAgentItemIds((prev) => {
      const next = new Set(prev);
      validItems.forEach(({ item }) => next.add(item.id));
      return next;
    });

    validItems.forEach(({ countdown }) => {
      if (countdown) countdownStore.add(countdown);
    });
    refreshCountdowns();
  };


  const buildExportPayload = () => ({
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: taskStore.getAll(),
      habits: habitStore.getAll(),
      countdowns: countdownStore.getAll(),
    },
    deletions: {
      countdowns: readDeletedMap(DELETED_COUNTDOWNS_KEY),
      habits: readDeletedMap(DELETED_HABITS_KEY),
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
    deletions: {
      countdowns: readDeletedMap(DELETED_COUNTDOWNS_KEY),
      habits: readDeletedMap(DELETED_HABITS_KEY),
    },
    settings: {
      apiBaseUrl,
      modelListText,
      chatModel,
      fallbackTimeoutSec,
      syncNamespace,
      autoSyncEnabled,
      autoSyncInterval,
      countdownDisplayMode,
      aiRetentionDays,
      pgHost,
      pgPort,
      pgDatabase,
      pgUsername,
      redisHost,
      redisPort,
      redisDb,
      calendarSubscription,
    },
    secrets: {
      apiKey,
      pgPassword,
      redisPassword,
    },
  });

  const applySyncedSettings = (payload: any) => {
    const settings = payload?.settings ?? {};
    const secrets = payload?.secrets ?? {};

    const nextApiBaseUrl = settings.apiBaseUrl || DEFAULT_BASE_URL;
    const nextModelListText = settings.modelListText || DEFAULT_MODEL_LIST.join('\n');
    const nextChatModel = settings.chatModel || DEFAULT_MODEL_LIST[0];
    const nextFallback = Number.isFinite(Number(settings.fallbackTimeoutSec))
      ? Number(settings.fallbackTimeoutSec)
      : DEFAULT_FALLBACK_TIMEOUT_SEC;
    const nextAutoSyncEnabled = settings.autoSyncEnabled === true;
    const nextAutoSyncInterval = Number(settings.autoSyncInterval) || DEFAULT_AUTO_SYNC_INTERVAL_MIN;
    const nextCountdownDisplayMode = settings.countdownDisplayMode === 'date' ? 'date' : 'days';
    const nextAiRetentionDays = Math.max(1, Math.min(3, Number(settings.aiRetentionDays) || 1));

    setApiBaseUrl(nextApiBaseUrl);
    setModelListText(nextModelListText);
    setChatModel(nextChatModel);
    setFallbackTimeoutSec(nextFallback);
    setAutoSyncEnabled(nextAutoSyncEnabled);
    setAutoSyncInterval(nextAutoSyncInterval);
    setCountdownDisplayMode(nextCountdownDisplayMode);
    setAiRetentionDays(nextAiRetentionDays);

    const nextApiKey = typeof secrets.apiKey === 'string' ? secrets.apiKey : apiKey;
    const nextPgHost = typeof settings.pgHost === 'string' ? settings.pgHost : pgHost;
    const nextPgPort = typeof settings.pgPort === 'string' ? settings.pgPort : pgPort;
    const nextPgDatabase = typeof settings.pgDatabase === 'string' ? settings.pgDatabase : pgDatabase;
    const nextPgUsername = typeof settings.pgUsername === 'string' ? settings.pgUsername : pgUsername;
    const nextPgPassword = typeof secrets.pgPassword === 'string' ? secrets.pgPassword : pgPassword;
    const nextRedisHost = typeof settings.redisHost === 'string' ? settings.redisHost : redisHost;
    const nextRedisPort = typeof settings.redisPort === 'string' ? settings.redisPort : redisPort;
    const nextRedisDb = typeof settings.redisDb === 'string' ? settings.redisDb : redisDb;
    const nextRedisPassword = typeof secrets.redisPassword === 'string' ? secrets.redisPassword : redisPassword;
    const nextCalendarSubscription = typeof settings.calendarSubscription === 'string'
      ? settings.calendarSubscription
      : calendarSubscription;
    const nextSyncNamespace = typeof settings.syncNamespace === 'string' && settings.syncNamespace.trim().length > 0
      ? settings.syncNamespace
      : syncNamespace;

    setApiKey(nextApiKey);
    setPgHost(nextPgHost);
    setPgPort(nextPgPort);
    setPgDatabase(nextPgDatabase);
    setPgUsername(nextPgUsername);
    setPgPassword(nextPgPassword);
    setRedisHost(nextRedisHost);
    setRedisPort(nextRedisPort);
    setRedisDb(nextRedisDb);
    setRedisPassword(nextRedisPassword);
    setCalendarSubscription(nextCalendarSubscription);
    setSyncNamespace(nextSyncNamespace);

    persistSettings({
      apiKey: nextApiKey,
      apiBaseUrl: nextApiBaseUrl,
      modelListText: nextModelListText,
      chatModel: nextChatModel,
      fallbackTimeoutSec: nextFallback,
      webdavUrl,
      webdavPath,
      webdavUsername,
      webdavPassword,
      autoSyncEnabled: nextAutoSyncEnabled,
      autoSyncInterval: nextAutoSyncInterval,
      countdownDisplayMode: nextCountdownDisplayMode,
      aiRetentionDays: nextAiRetentionDays,
      pgHost: nextPgHost,
      pgPort: nextPgPort,
      pgDatabase: nextPgDatabase,
      pgUsername: nextPgUsername,
      pgPassword: nextPgPassword,
      redisHost: nextRedisHost,
      redisPort: nextRedisPort,
      redisDb: nextRedisDb,
      redisPassword: nextRedisPassword,
      syncNamespace: nextSyncNamespace,
      calendarSubscription: nextCalendarSubscription,
    });
  };

  const handleWebdavSync = async (action: 'push' | 'pull' | 'sync', options?: { silent?: boolean }) => {
    if (syncStatus === 'syncing') return;
    if (!redisHost) {
      if (!options?.silent) {
        pushLog('warning', 'Redis 配置不完整', '请填写 Redis Host 以开启云同步');
        setShowSettings(true);
      }
      return;
    }

    setSyncStatus('syncing');
    setIsSyncingNow(true);
    if (!options?.silent) {
      const label = action === 'push' ? '云同步上传中' : action === 'pull' ? '云同步拉取中' : '云同步合并中';
      pushLog('info', label);
    }

    try {
      const executeRequest = async (requestAction: 'push' | 'pull' | 'sync') => {
        const lastLocalChange = getLastLocalChange();
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: requestAction,
            namespace: syncNamespace,
            redisConfig: {
              host: redisHost,
              port: redisPort,
              db: redisDb,
              password: redisPassword,
            },
            ...(requestAction !== 'pull'
              ? { payload: { data: buildSyncPayload(), meta: { lastLocalChange } } }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '云同步失败');
        }
        if (!data?.jobId) {
          throw new Error('同步任务缺失');
        }
        const result = await pollSyncJob(data.jobId);
        return { ok: true, result };
      };

      if (action === 'pull') {
        const data = await executeRequest('pull');
        const remotePayload = data?.result?.data;
        if (remotePayload) {
          applyImportedData(remotePayload, 'merge');
          applySyncedSettings(remotePayload);
          if (!options?.silent) {
            pushLog('success', '云同步完成', `导入任务 ${remotePayload?.data?.tasks?.length ?? 0} 条`);
          }
        } else if (!options?.silent) {
          pushLog('warning', '云同步失败', '未读取到远端数据');
        }
      } else if (action === 'push') {
        await executeRequest('push');
        if (!options?.silent) {
          pushLog('success', '云同步上传完成');
        }
      } else {
        const data = await executeRequest('sync');
        const remotePayload = data?.result?.data;
        if (remotePayload) {
          applyImportedData(remotePayload, 'merge');
          applySyncedSettings(remotePayload);
          const remoteLastChange = data?.result?.meta?.lastLocalChange;
          const localLastChange = getLastLocalChange();
          if (remoteLastChange && localLastChange) {
            const remoteMs = new Date(remoteLastChange).getTime();
            const localMs = new Date(localLastChange).getTime();
            if (remoteMs > localMs && !options?.silent) {
              pushLog('info', '检测到远端更新，已合并', remoteLastChange);
            }
          }
        } else if (!options?.silent) {
          pushLog('warning', '云同步失败', '未读取到远端数据');
        }
        if (!options?.silent) {
          pushLog('success', '云同步完成', '已完成服务端合并');
        }
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        pushLog('error', '云同步失败', String((error as Error)?.message || error));
      }
    } finally {
      setSyncStatus('idle');
      setIsSyncingNow(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!autoSyncEnabled) return;
    if (!redisHost) return;
    const intervalMs = Math.max(1, autoSyncInterval) * 60 * 1000;
    const timer = window.setInterval(() => {
      handleWebdavSync('sync', { silent: true });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autoSyncEnabled, autoSyncInterval, redisHost]);

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

  const ensureUpdatedAt = <T extends { updatedAt?: string; createdAt?: string }>(items: T[]) =>
    items.map((item) => ({
      ...item,
      updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
    }));

  const mergeById = <T extends { id: string; updatedAt?: string }>(current: T[], incoming: T[]) => {
    const merged = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => {
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
        return;
      }
      const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const incomingUpdated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      merged.set(item.id, incomingUpdated >= existingUpdated ? item : existing);
    });
    return Array.from(merged.values());
  };

  const applyImportedData = (payload: any, mode: 'merge' | 'overwrite' = importMode) => {
    const tasksImport = ensureUpdatedAt(normalizeImportList<Task>(payload?.data?.tasks ?? payload?.tasks));
    const habitsImport = ensureUpdatedAt(normalizeImportList<Habit>(payload?.data?.habits ?? payload?.habits));
    const countdownsImport = ensureUpdatedAt(normalizeImportList<Countdown>(payload?.data?.countdowns ?? payload?.countdowns));
    const currentTasks = ensureUpdatedAt(taskStore.getAll());
    const currentHabits = ensureUpdatedAt(habitStore.getAll());
    const currentCountdowns = ensureUpdatedAt(countdownStore.getAll());

    const nextTasks = mode === 'overwrite'
      ? tasksImport
      : mergeById(currentTasks, tasksImport);
    const nextHabits = mode === 'overwrite'
      ? habitsImport
      : mergeById(currentHabits, habitsImport);
    const nextCountdowns = mode === 'overwrite'
      ? countdownsImport
      : mergeById(currentCountdowns, countdownsImport);

    // Deletions: Countdowns
    const localDeletedCountdowns = readDeletedMap(DELETED_COUNTDOWNS_KEY);
    const incomingDeletedCountdowns = normalizeDeletedMap(
      payload?.deletions?.countdowns ?? payload?.deletedCountdowns,
    );
    const mergedDeletedCountdowns = mergeDeletedMap(localDeletedCountdowns, incomingDeletedCountdowns);
    const { filtered: filteredCountdowns, nextDeleted: nextDeletedCountdowns } =
      filterByDeletions(nextCountdowns, mergedDeletedCountdowns);

    // Deletions: Habits
    const localDeletedHabits = readDeletedMap(DELETED_HABITS_KEY);
    const incomingDeletedHabits = normalizeDeletedMap(
      payload?.deletions?.habits ?? payload?.deletedHabits,
    );
    const mergedDeletedHabits = mergeDeletedMap(localDeletedHabits, incomingDeletedHabits);
    const { filtered: filteredHabits, nextDeleted: nextDeletedHabits } =
      filterByDeletions(nextHabits, mergedDeletedHabits);

    taskStore.replaceAll(nextTasks);
    habitStore.replaceAll(filteredHabits);
    countdownStore.replaceAll(filteredCountdowns);
    
    persistDeletedMap(DELETED_COUNTDOWNS_KEY, nextDeletedCountdowns);
    persistDeletedMap(DELETED_HABITS_KEY, nextDeletedHabits);

    setTasks(nextTasks);
    setHabits(filteredHabits);
    setCountdowns(filteredCountdowns);

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

  const createLocalTaskFromInput = async (raw: string, overrideCategory?: string | null) => {
    // 优化：直接使用本地时间，提高响应速度
    const now = new Date();
    const parsed = parseLocalTaskInput(raw, now);
    const category = overrideCategory ?? classifyCategory(raw);
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
      updatedAt: now.toISOString(),
    };
    taskStore.add(task);
    refreshTasks();
    
    // 异步同步到 PG
    syncToPg('tasks', 'POST', task);

    setInput('');
  };

  const handleMagicInput = async () => {
    if (!input.trim()) return;

    const rawInput = input.trim();
    setLoading(true);

    const isSearch = rawInput.toLowerCase().startsWith('recall') || rawInput.includes('?');
    const forcedCategory = activeFilter === 'category' ? activeCategory : null;
    const payload = {
      input: rawInput,
      mode: isSearch ? 'search' : 'create',
      ...(apiKey ? { apiKey } : {}),
      apiBaseUrl: apiBaseUrl?.trim() || undefined,
      chatModel: chatModel?.trim() || undefined,
      sessionId,
      redisConfig: {
        host: redisHost,
        port: redisPort,
        db: redisDb,
        password: redisPassword,
      },
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

      if (isSearch) {
        // Search mode is deprecated/removed with embedding removal
        // fallback to local creation or just alert
        alert('Search is no longer supported.');
      } else if (data.task) {
        const recommendedPriority = evaluatePriority(data.task?.dueDate, data.task?.subtasks?.length ?? 0);
        const taskToAdd = {
          ...data.task,
          priority: typeof data.task?.priority === 'number' ? data.task.priority : recommendedPriority,
          timezoneOffset: data.task?.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET,
          category: forcedCategory ?? data.task?.category ?? classifyCategory(rawInput),
        };
        taskStore.add(taskToAdd);
        refreshTasks();
        setInput('');
      } else {
        await createLocalTaskFromInput(rawInput, forcedCategory);
      }
    } catch (e) {
      console.error(e);
      if (isSearch) {
        alert('Failed. Check API Key.');
        if (!apiKey) setShowSettings(true);
      } else {
        await createLocalTaskFromInput(rawInput, forcedCategory);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const syncToPg = async (type: 'tasks' | 'habits' | 'countdowns', method: 'POST' | 'PUT' | 'DELETE', data: any) => {
    if (!pgHost) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-pg-host': pgHost,
        'x-pg-port': pgPort || '5432',
        'x-pg-database': pgDatabase,
        'x-pg-username': pgUsername,
        'x-pg-password': pgPassword,
      };
      
      // 构建 URL，如果是 PUT/DELETE 可能需要 ID
      let url = `/api/${type}`;
      if ((method === 'PUT' || method === 'DELETE') && data.id) {
        url = `/api/${type}/${data.id}`;
      }

      await fetch(url, {
        method,
        headers,
        body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
      });
    } catch (error) {
      console.error(`Failed to sync ${type} to PG`, error);
      pushLog('error', 'PG 同步失败', String(error));
    }
  };

  const updateTask = (updatedTask: Task) => {
    const now = new Date().toISOString();
    const nextTask = { ...updatedTask, updatedAt: now };
    taskStore.update(nextTask);
    refreshTasks();
    
    // 异步同步到 PG
    syncToPg('tasks', 'PUT', nextTask);

    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(nextTask);
    }
    if (editingTaskId === updatedTask.id) {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  };

  const updateTaskDueDate = (taskId: string, dueDate?: string, timezoneOffset?: number) => {
    const target = taskStore.getAll().find((task) => task.id === taskId);
    if (!target) return;
    updateTask({
      ...target,
      dueDate,
      timezoneOffset: timezoneOffset ?? target.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET,
      updatedAt: new Date().toISOString(),
    });
  };

  const commitEditingTitle = (task: Task, fallbackTitle?: string) => {
    const title = editingTaskTitle.trim() || (fallbackTitle ?? '').trim();
    if (!title) {
      setEditingTaskId(null);
      setEditingTaskTitle('');
      return;
    }
    if (title !== task.title) {
      updateTask({ ...task, title, updatedAt: new Date().toISOString() });
    } else {
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  };

  const removeTask = (taskId: string) => {
    taskStore.remove(taskId);
    refreshTasks();
    
    // 异步同步到 PG
    syncToPg('tasks', 'DELETE', { id: taskId });

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
      updateTask({ ...updated, updatedAt: new Date().toISOString() });
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
    taskStore.replaceAll(next.map((item) => ({
      ...item,
      updatedAt: item.updatedAt ?? item.createdAt,
    })));
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
    taskStore.update({ ...updatedTask, updatedAt: new Date().toISOString() });
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
    updateTask({ ...target, subtasks: updatedSubtasks, status: nextStatus, updatedAt: new Date().toISOString() });
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
    updateTask({ ...selectedTask, subtasks: nextSubtasks, status: nextStatus, updatedAt: new Date().toISOString() });
    setNewSubtaskTitle('');
  };

  const addTagToTask = () => {
    if (!selectedTask) return;
    const tag = newTagInput.trim();
    if (!tag) return;
    const nextTags = Array.from(new Set([...(selectedTask.tags || []), tag]));
    updateTask({ ...selectedTask, tags: nextTags, updatedAt: new Date().toISOString() });
    setNewTagInput('');
  };

  const removeTagFromTask = (tag: string) => {
    if (!selectedTask) return;
    const nextTags = (selectedTask.tags || []).filter((item) => item !== tag);
    updateTask({ ...selectedTask, tags: nextTags, updatedAt: new Date().toISOString() });
  };

  const updatePriority = (priority: number) => {
    if (!selectedTask) return;
    updateTask({ ...selectedTask, priority, updatedAt: new Date().toISOString() });
  };

  const updateRepeat = (rule: TaskRepeatRule) => {
    if (!selectedTask) return;
    updateTask({ ...selectedTask, repeat: rule.type === 'none' ? undefined : rule, updatedAt: new Date().toISOString() });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask || !event.target.files?.length) return;
    const file = event.target.files[0];
    
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      alert('请先在设置中配置 WebDAV 信息');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('webdavUrl', webdavUrl);
    formData.append('username', webdavUsername);
    formData.append('password', webdavPassword);

    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '上传失败');
      }

      const attachment: Attachment = {
        id: createId(),
        url: data.url,
        filename: data.filename,
        size: data.size,
        type: data.type,
        createdAt: new Date().toISOString(),
      };

      const nextAttachments = [...(selectedTask.attachments || []), attachment];
      updateTask({ ...selectedTask, attachments: nextAttachments, updatedAt: new Date().toISOString() });
      pushLog('success', '附件上传成功', file.name);
    } catch (error) {
      console.error(error);
      alert(`上传失败: ${(error as Error).message}`);
      pushLog('error', '附件上传失败', String(error));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId: string) => {
    if (!selectedTask) return;
    const nextAttachments = (selectedTask.attachments || []).filter(a => a.id !== attachmentId);
    updateTask({ ...selectedTask, attachments: nextAttachments, updatedAt: new Date().toISOString() });
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

  const toggleQuadrantExpanded = (key: string) => {
    setExpandedQuadrants((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const calendarSourceTasks = showCompletedInCalendar
    ? tasks
    : tasks.filter((task) => task.status !== 'completed');
  const tasksByDate = calendarSourceTasks.reduce<Record<string, Task[]>>((acc, task) => {
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
  const dayRowHeight = 36;
  const dayTasksByHour: Task[][] = Array.from({ length: 24 }, () => []);
  dayTasks.forEach((task) => {
    if (!task.dueDate) return;
    const zoned = getZonedDate(task.dueDate, getTimezoneOffset(task));
    const hour = zoned.getUTCHours();
    if (hour >= 0 && hour < 24) {
      dayTasksByHour[hour].push(task);
    }
  });
  dayTasksByHour.forEach((bucket) => {
    bucket.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return aTime - bTime;
    });
  });
  const nowKey = formatDateKeyByOffset(now, DEFAULT_TIMEZONE_OFFSET);
  const showNowLine = effectiveCalendarDate === nowKey;
  const nowZoned = getZonedDate(now.toISOString(), DEFAULT_TIMEZONE_OFFSET);
  const nowMinutes = nowZoned.getUTCHours() * 60 + nowZoned.getUTCMinutes();
  const nowLineTop = (nowMinutes / 60) * dayRowHeight;
  const nowLabel = `${pad2(nowZoned.getUTCHours())}:${pad2(nowZoned.getUTCMinutes())}`;
  const agendaTasks = calendarSourceTasks
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
  const showCountdownAgentBulkAdd = countdownAgentItems.length > 1;

  return (
    <div
      className="flex h-[100dvh] min-h-[100dvh] bg-[#1A1A1A] text-[#EEEEEE] overflow-hidden font-sans relative safe-area-top"
      style={
        bingWallpaperUrl
          ? {
              backgroundImage: `url(${bingWallpaperUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    >
      
      {/* 1. Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showAppMenu={showAppMenu}
        setShowAppMenu={setShowAppMenu}
        setShowSettings={setShowSettings}
        setShowAbout={setShowAbout}
        isQuickAccessOpen={isQuickAccessOpen}
        setIsQuickAccessOpen={setIsQuickAccessOpen}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        isListsOpen={isListsOpen}
        setIsListsOpen={setIsListsOpen}
        isTagsOpen={isTagsOpen}
        setIsTagsOpen={setIsTagsOpen}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        refreshTasks={refreshTasks}
        refreshCountdowns={refreshCountdowns}
        refreshHabits={refreshHabits}
        tasks={tasks}
        agentItems={agentItems}
        hasCalendarTasks={hasCalendarTasks}
        countdowns={countdowns}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        listItems={listItems}
        renameListItem={renameListItem}
        removeListItem={removeListItem}
        isAddingList={isAddingList}
        setIsAddingList={setIsAddingList}
        newListName={newListName}
        setNewListName={setNewListName}
        addListItem={addListItem}
        tagUsageMap={tagUsageMap}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        APP_VERSION={APP_VERSION}
        DEFAULT_TIMEZONE_OFFSET={DEFAULT_TIMEZONE_OFFSET}
        formatDateKeyByOffset={formatDateKeyByOffset}
        formatZonedDate={formatZonedDate}
        getTimezoneOffset={getTimezoneOffset}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={(width) => {
          setSidebarWidth(width);
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
        }}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={(collapsed) => {
          setIsSidebarCollapsed(collapsed);
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
        }}
      />

      {/* 2. Main Task List */}
      <section
        className={`flex-1 flex-col min-w-0 bg-[#1A1A1A] overflow-y-auto mobile-scroll ${
          selectedTask ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <header className="h-12 sm:h-14 border-b border-[#333333] flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur">
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
            <button
              onClick={() => handleWebdavSync('sync')}
              className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
              title={isSyncingNow ? '同步中…' : '云同步（异步队列）'}
              disabled={isSyncingNow}
            >
              {isSyncingNow ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-400" />
              ) : (
                <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
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
              onClick={handleThemeToggle}
              className="p-2 sm:p-1 rounded hover:bg-[#2A2A2A] text-[#888888] hover:text-[#CCCCCC]"
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

        <div className={`flex-1 px-3 sm:px-6 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-10 ${
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCompletedInCalendar((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg border text-[11px] transition-colors border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]"
                    title={showCompletedInCalendar ? '隐藏已完成任务' : '显示已完成任务'}
                  >
                    {showCompletedInCalendar ? '隐藏已完成' : '显示已完成'}
                  </button>
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
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                    <div className="flex flex-col text-[10px] text-[#666666]">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div
                          key={hour}
                          className="h-9 flex items-start justify-end pr-2 border-b border-[#2A2A2A] last:border-b-0"
                        >
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                    {dayTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[12rem] text-[#444444]">
                        <Calendar className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">这一天没有任务</p>
                      </div>
                    ) : (
                      <div className="relative border border-[#2A2A2A] rounded-xl overflow-hidden">
                        {showNowLine && (
                          <div
                            className="absolute left-0 right-0 z-10 pointer-events-none"
                            style={{ top: `${nowLineTop}px` }}
                          >
                            <div className="relative flex items-center">
                              <span className="absolute -left-2.5 -top-2.5 w-3 h-3 rounded-full bg-red-400 shadow" />
                              <div className="h-[2px] w-full bg-red-400/80" />
                              <span className="ml-2 text-[10px] text-red-300 bg-[#1A1A1A] px-1.5 py-0.5 rounded">
                                {nowLabel}
                              </span>
                            </div>
                          </div>
                        )}
                        {dayTasksByHour.map((hourTasks, hour) => (
                          <div
                            key={hour}
                            className="min-h-[36px] border-b border-[#2A2A2A] last:border-b-0 px-2 py-1"
                          >
                            {hourTasks.length === 0 ? (
                              <div className="text-[10px] text-[#333333]">&nbsp;</div>
                            ) : (
                              <div className="space-y-2">
                                {hourTasks.map((task) => (
                                  <TaskItem
                                    key={task.id}
                                    task={task}
                                    selected={selectedTask?.id === task.id}
                                    onClick={() => setSelectedTask(task)}
                                    onToggle={toggleStatus}
                                    onDelete={removeTask}
                                    onToggleSubtask={toggleSubtask}
                                    onUpdateDueDate={updateTaskDueDate}
                                    helpers={taskItemHelpers}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                              <span className="absolute top-1 left-1 text-[9px] text-blue-300 leading-none">
                                {note}
                              </span>
                            )}
                            <span
                              className={`absolute top-1 right-1 w-2 h-2 rounded-full ${hasTasks ? 'bg-blue-400' : 'bg-transparent'}`}
                            />
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
                            onToggleSubtask={toggleSubtask}
                            onUpdateDueDate={updateTaskDueDate}
                            helpers={taskItemHelpers}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeFilter === 'countdown' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                  <h3 className="text-base font-semibold text-[#DDDDDD]">倒数日（离快乐又近一天）</h3>
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
                              {countdownDisplayMode === 'date' ? (
                                <>
                                  <p className={`text-sm font-semibold ${isPast ? 'text-red-300' : 'text-blue-200'}`}>
                                    {formatCountdownDate(item.targetDate)}
                                  </p>
                                  <p className="text-[11px] text-[#666666]">
                                    {isPast ? `已过去 ${displayDays} 天` : `还有 ${displayDays} 天`}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className={`text-2xl font-semibold ${isPast ? 'text-red-400' : 'text-blue-400'}`}>
                                    {displayDays}
                                  </p>
                                  <p className="text-[11px] text-[#666666]">{isPast ? '已过期天数' : '天后'}</p>
                                </>
                              )}
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

              <div className="space-y-3">
                <div className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                    <h3 className="text-base font-semibold text-[#DDDDDD]">倒数日 AI 助手（记性外包处）</h3>
                      <p className="text-xs text-[#666666] mt-1">一句话识别重要日期，我来帮你记</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-[#555555]">countdown-agent</span>
                      {redisHost && (
                        <div className="flex items-center gap-1 text-[10px] text-[#666666]">
                          <span>记忆:</span>
                          <select
                            value={aiRetentionDays}
                            onChange={(e) => setAiRetentionDays(Number(e.target.value))}
                            className="bg-[#1A1A1A] border border-[#333333] rounded px-1 py-0.5 focus:outline-none"
                          >
                            <option value={1}>1天</option>
                            <option value={2}>2天</option>
                            <option value={3}>3天</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-dashed border-[#333333] bg-[#1B1B1B] px-3 py-2 text-xs text-[#777777]">
                      小提示：可以说“孩子生日是 9 月 9 日”或“距离项目发布还有两周”。
                    </div>
                    <div className="max-h-[32vh] overflow-y-auto space-y-2 pr-1">
                      {countdownAgentMessages.length === 0 ? (
                        <div className="text-sm text-[#555555]">告诉我：你想倒数的日子是什么？</div>
                      ) : (
                        countdownAgentMessages.map((message, idx) => (
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
                    {countdownAgentError && (
                      <div className="flex items-center justify-between text-xs text-red-300 bg-red-500/10 p-2 rounded-lg">
                        <span>{countdownAgentError}</span>
                        <button
                          onClick={handleCountdownAgentSend}
                          disabled={countdownAgentLoading}
                          className="text-red-200 underline hover:text-white"
                        >
                          重试
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={countdownAgentInput}
                        onChange={(e) => setCountdownAgentInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCountdownAgentSend()}
                        placeholder="例如：10 月 1 日去旅行"
                        className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-3 text-sm text-[#CCCCCC] leading-6 focus:outline-none focus:border-blue-500"
                        disabled={countdownAgentLoading}
                      />
                      <button
                        onClick={handleCountdownAgentSend}
                        disabled={countdownAgentLoading || !countdownAgentInput.trim()}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                      >
                        {countdownAgentLoading ? '识别中…' : '发送'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#CCCCCC]">建议倒数日（我猜你在想）</h4>
                  {showCountdownAgentBulkAdd && (
                    <button
                      onClick={handleAddAllCountdownAgentItems}
                      disabled={countdownAgentItems.length === 0 || addedCountdownAgentItemIds.size === countdownAgentItems.length}
                      className="text-xs px-3 py-1 rounded-lg border border-blue-500 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      一键全部添加
                    </button>
                  )}
                </div>
                {countdownAgentItems.length === 0 ? (
                  <div className="bg-[#1F1F1F] border border-dashed border-[#2C2C2C] rounded-2xl p-4 text-xs text-[#666666]">
                    识别结果会在这里展示，选中即可加入倒数日列表。
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {countdownAgentItems.map((item) => {
                      const isAdded = addedCountdownAgentItemIds.has(item.id);
                      const hasDate = Boolean(item.targetDate);
                      return (
                        <div key={item.id} className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#EEEEEE]">{item.title}</p>
                              <p className="text-xs text-[#777777] mt-1">
                                日期：{item.targetDate ? item.targetDate : '未识别日期'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAddCountdownAgentItem(item)}
                              disabled={isAdded || !hasDate}
                              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                                isAdded
                                  ? 'border-[#333333] text-[#666666]'
                                  : hasDate
                                  ? 'border-blue-500 text-blue-200 hover:bg-blue-500/10'
                                  : 'border-[#333333] text-[#555555]'
                              }`}
                            >
                              {isAdded ? '已添加' : hasDate ? '加入倒数日' : '缺日期'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeFilter === 'quadrant' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quadrantGroups.map((group) => {
                const isExpanded = expandedQuadrants[group.key] ?? false;
                const shouldCollapse = group.items.length > QUADRANT_COLLAPSE_LIMIT;
                const visibleItems = shouldCollapse && !isExpanded
                  ? group.items.slice(0, QUADRANT_COLLAPSE_LIMIT)
                  : group.items;
                const hiddenCount = group.items.length - visibleItems.length;

                return (
                  <div key={group.key} className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#DDDDDD]">{group.title}</h3>
                        <p className="text-xs text-[#666666] mt-1">{group.description}</p>
                        <p className="text-[11px] text-[#555555] mt-1">{group.items.length} 项</p>
                      </div>
                      {shouldCollapse && (
                        <button
                          type="button"
                          onClick={() => toggleQuadrantExpanded(group.key)}
                          className="flex items-center gap-1 text-[11px] text-[#888888] px-2 py-1 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] hover:text-[#DDDDDD]"
                        >
                          {isExpanded ? '收起' : `展开 ${hiddenCount} 项`}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {visibleItems.length === 0 ? (
                        <div className="text-xs text-[#444444]">暂无任务</div>
                      ) : (
                        visibleItems.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            selected={selectedTask?.id === task.id}
                            onClick={() => setSelectedTask(task)}
                            onToggle={toggleStatus}
                            onDelete={removeTask}
                            onToggleSubtask={toggleSubtask}
                            onUpdateDueDate={updateTaskDueDate}
                            helpers={taskItemHelpers}
                          />
                        ))
                      )}
                      {shouldCollapse && !isExpanded && hiddenCount > 0 && (
                        <div className="text-[11px] text-[#555555]">已折叠 {hiddenCount} 项</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeFilter === 'pomodoro' ? (
            <PomodoroTimer />
          ) : activeFilter === 'agent' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <div className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#DDDDDD]">AI 助手（碎碎念整理师）</h3>
                      <p className="text-xs text-[#666666] mt-1">把计划丢给我，我负责拆碎再拼好 😎</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-[#555555]">todo-agent</span>
                      <div className="flex items-center gap-2">
                        {redisHost && (
                          <div className="flex items-center gap-1 text-[10px] text-[#666666]">
                            <span>记忆:</span>
                            <select
                              value={aiRetentionDays}
                              onChange={(e) => setAiRetentionDays(Number(e.target.value))}
                              className="bg-[#1A1A1A] border border-[#333333] rounded px-1 py-0.5 focus:outline-none"
                            >
                              <option value={1}>1天</option>
                              <option value={2}>2天</option>
                              <option value={3}>3天</option>
                            </select>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <select
                            value={chatModel}
                            onChange={(e) => setChatModel(e.target.value)}
                            className="bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC] focus:outline-none max-w-[100px] truncate"
                            title="切换模型"
                          >
                            {parseModelList(modelListText).map((model) => (
                              <option key={model} value={model}>{model}</option>
                            ))}
                          </select>
                          <button
                            onClick={fetchModelList}
                            disabled={isFetchingModels}
                            className="p-1 rounded border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] disabled:opacity-50"
                            title="拉取模型列表"
                          >
                            <Cloud className={`w-3 h-3 ${isFetchingModels ? 'animate-bounce' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
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
                      {agentError && (
                        <div className="flex items-center justify-between text-xs text-red-300 bg-red-500/10 p-2 rounded-lg">
                          <span>{agentError}</span>
                          <button
                            onClick={handleAgentSend}
                            disabled={agentLoading}
                            className="text-red-200 underline hover:text-white"
                          >
                            重试
                          </button>
                        </div>
                      )}
                    </div>
                    {agentImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {agentImages.map((image) => (
                          <div
                            key={image.id}
                            className="relative w-16 h-16 rounded-lg border border-[#333333] overflow-hidden"
                          >
                            <img
                              src={image.dataUrl}
                              alt={image.file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeAgentImage(image.id)}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                              title="移除"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={agentImageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAgentImageChange}
                        className="hidden"
                      />
                      <input
                        type="text"
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onPaste={handleAgentPaste}
                        placeholder="例如：帮我规划本周的工作安排"
                        className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-3 text-sm text-[#CCCCCC] leading-6 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => agentImageInputRef.current?.click()}
                        className="p-2 rounded-lg border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]"
                        title="上传图片"
                      >
                        <ImagePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleAgentSend}
                        disabled={!agentInput.trim() && agentImages.length === 0}
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
                  <h4 className="text-sm font-semibold text-[#CCCCCC]">建议待办（切成薯片）</h4>
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
                    <h3 className="text-sm font-semibold text-[#DDDDDD]">创建新习惯（今天开新坑）</h3>
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
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                            <button
                              onClick={() => removeHabit(habit.id)}
                              className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                            >
                              删除
                            </button>
                          </div>
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
                              onBlur={() => commitEditingTitle(task, task.title)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitEditingTitle(task, task.title);
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
                          </div>
                        ) : (
                          <TaskItem
                            task={task}
                            selected={selectedTask?.id === task.id}
                            onClick={() => setSelectedTask(task)}
                            onToggle={toggleStatus}
                            onDelete={removeTask}
                            onUpdateDueDate={updateTaskDueDate}
                            onDragStart={isManualSortEnabled ? handleTaskDragStart : undefined}
                            onDragOver={isManualSortEnabled ? handleTaskDragOver : undefined}
                            onDrop={isManualSortEnabled ? handleTaskDrop : undefined}
                            isDragging={isManualSortEnabled && draggingTaskId === task.id}
                            onDragEnd={isManualSortEnabled ? () => setDraggingTaskId(null) : undefined}
                            dragEnabled={isManualSortEnabled}
                            onTitleClick={() => {
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                            }}
                            onToggleSubtask={toggleSubtask}
                            helpers={taskItemHelpers}
                          />
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
                <label className="text-xs font-semibold text-[#555555] uppercase">附件</label>
                <div className="space-y-2">
                  {(selectedTask.attachments || []).map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 truncate"
                        >
                          {att.filename}
                        </a>
                        <span className="text-[10px] text-[#555555] shrink-0">
                          ({Math.round(att.size / 1024)}KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="text-[#666666] hover:text-[#CCCCCC]"
                        title="删除附件"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-[#1F1F1F] border border-[#333333] rounded text-[#CCCCCC] hover:border-[#555555] hover:text-white disabled:opacity-50"
                    >
                      {isUploading ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#555555] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {isUploading ? '上传中...' : '上传附件 (WebDAV)'}
                    </button>
                    {!webdavUrl && (
                      <span className="text-[10px] text-yellow-500">需配置 WebDAV</span>
                    )}
                  </div>
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

            </div>
          </div>
          
          <div className="p-4 border-t border-[#333333] text-xs text-center text-[#444444]">
            ID: {selectedTask.id}
          </div>
        </aside>
      )}

      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        apiBaseUrl={apiBaseUrl}
        setApiBaseUrl={setApiBaseUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        modelListText={modelListText}
        setModelListText={setModelListText}
        DEFAULT_BASE_URL={DEFAULT_BASE_URL}
        DEFAULT_MODEL_LIST={DEFAULT_MODEL_LIST}
        parseModelList={parseModelList}
        fetchModelList={fetchModelList}
        isFetchingModels={isFetchingModels}
        modelFetchError={modelFetchError}
        chatModel={chatModel}
        setChatModel={setChatModel}
        fallbackTimeoutSec={fallbackTimeoutSec}
        setFallbackTimeoutSec={setFallbackTimeoutSec}
        DEFAULT_FALLBACK_TIMEOUT_SEC={DEFAULT_FALLBACK_TIMEOUT_SEC}
        countdownDisplayMode={countdownDisplayMode}
        setCountdownDisplayMode={setCountdownDisplayMode}
        notificationSupported={notificationSupported}
        isSecureContext={isSecureContext}
        notificationPermission={notificationPermission}
        serviceWorkerSupported={serviceWorkerSupported}
        requestNotificationPermission={requestNotificationPermission}
        sendTestNotification={sendTestNotification}
        BING_WALLPAPER_API={BING_WALLPAPER_API}
        isApiSettingsOpen={isApiSettingsOpen}
        setIsApiSettingsOpen={setIsApiSettingsOpen}
        pgHost={pgHost}
        pgPort={pgPort}
        pgDatabase={pgDatabase}
        pgUsername={pgUsername}
        pgPassword={pgPassword}
        setPgHost={setPgHost}
        setPgPort={setPgPort}
        setPgDatabase={setPgDatabase}
        setPgUsername={setPgUsername}
        setPgPassword={setPgPassword}
        redisHost={redisHost}
        redisPort={redisPort}
        redisDb={redisDb}
        redisPassword={redisPassword}
        setRedisHost={setRedisHost}
        setRedisPort={setRedisPort}
        setRedisDb={setRedisDb}
        setRedisPassword={setRedisPassword}
        syncNamespace={syncNamespace}
        setSyncNamespace={setSyncNamespace}
        DEFAULT_SYNC_NAMESPACE={DEFAULT_SYNC_NAMESPACE}
        autoSyncEnabled={autoSyncEnabled}
        setAutoSyncEnabled={setAutoSyncEnabled}
        autoSyncInterval={autoSyncInterval}
        setAutoSyncInterval={setAutoSyncInterval}
        AUTO_SYNC_INTERVAL_OPTIONS={AUTO_SYNC_INTERVAL_OPTIONS}
        calendarSubscription={calendarSubscription}
        setCalendarSubscription={setCalendarSubscription}
        webdavUrl={webdavUrl}
        setWebdavUrl={setWebdavUrl}
        webdavUsername={webdavUsername}
        setWebdavUsername={setWebdavUsername}
        webdavPassword={webdavPassword}
        setWebdavPassword={setWebdavPassword}
        DEFAULT_WEBDAV_URL={DEFAULT_WEBDAV_URL}
        handleExportData={handleExportData}
        openImportPicker={openImportPicker}
        importMode={importMode}
        setImportMode={setImportMode}
        importInputRef={importInputRef}
        handleImportData={handleImportData}
        normalizeTimeoutSec={normalizeTimeoutSec}
        persistSettings={persistSettings}
        webdavPath={webdavPath}
        aiRetentionDays={aiRetentionDays}
      />

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
              <h2 className="text-base sm:text-lg font-semibold">运行日志（系统碎碎念）</h2>
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
                <h2 className="text-base sm:text-lg font-semibold">关于 Recall（幕后花絮）</h2>
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
              <p className="text-xs text-[#666666]">版权所有 © Recall Team</p>
              <p className="text-xs text-[#666666]">感谢使用 Recall，祝你高效又轻松 ✨</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

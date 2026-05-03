"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useThemeSettings } from '@/app/hooks/useThemeSettings';
import { useSyncManager } from '@/app/hooks/useSyncManager';
import { useAppVersionMigration } from '@/app/hooks/useAppVersionMigration';
import { usePgBootstrapSync } from '@/app/hooks/usePgBootstrapSync';
import { usePgMirrorSync } from '@/app/hooks/usePgMirrorSync';
import { APP_VERSION, APP_VERSION_STORAGE_KEY } from '@/app/config/appVersion';
import { buildExportPayload as buildExportPayloadData, buildSyncPayload as buildSyncPayloadData } from '@/app/services/syncPayload';
import { normalizeImportList, ensureUpdatedAt, mergeById } from '@/app/services/importMerge';
import { resolveSyncedSettings } from '@/app/services/syncedSettings';
import { readDeletedMap, markDeleted, normalizeDeletedMap, mergeDeletedMap, filterByDeletions, persistDeletedMap } from '@/app/services/deletions';
import { useTaskFilters } from '@/app/hooks/useTaskFilters';
import { extractPhoneNumbers, buildTelHref } from '@/app/utils/phone';
import type {
  AgentDecision,
  AgentItem,
  AgentTaskChanges,
  AgentMessage,
  AiAssistantMode,
  CountdownAgentItem,
  CountdownDisplayMode,
  HabitAgentItem,
  ImageAttachment,
  ManageAgentFilter,
  ManageAgentMessage,
  StatusFeedback,
  TaskGroup,
  TaskGroupMode,
  TaskSortMode,
  UserMemory,
  WeatherCity,
  WeatherForecast,
  FutureTaskBucketKey,
} from '@/app/homeTypes';
import {
  addDays,
  buildDueDateIso,
  buildReminderAt,
  buildWeekDays,
  buildWeekLabel,
  createId,
  DEFAULT_TIMEZONE_OFFSET,
  evaluatePriority,
  fetchServerTime,
  filterImageFiles,
  formatDateKey,
  formatDateKeyByOffset,
  formatZonedDate,
  formatZonedDateTime,
  formatZonedTime,
  getDefaultRepeatRule,
  getNextRepeatDate,
  getRecentDays,
  getTimezoneOffset,
  getZonedDate,
  getTodayKey,
  getWeekStart,
  isTaskDueToday,
  isTaskDueWithinDays,
  isTaskOverdue,
  normalizeAgentDueDate,
  parseDateKey,
  parseModelList,
  readImageAsDataUrl,
  sortTasks,
} from '@/app/homeUtils';
import { taskStore, habitStore, countdownStore, itemStore, Task, Subtask, Attachment, RepeatType, TaskRepeatRule, Habit, Countdown, Item } from '@/lib/store';
import PomodoroTimer from '@/app/components/PomodoroTimer';
import PomodoroFloatingWidget from '@/app/components/PomodoroFloatingWidget';
import PomodoroAudioController from '@/app/components/PomodoroAudioController';
import Sidebar from '@/app/components/sidebar/Sidebar';
import SettingsModal from '@/app/components/settings/SettingsModal';
import TaskItem from '@/app/components/tasks/TaskItem';
import TaskQuickActions from '@/app/components/tasks/TaskQuickActions';
import PageTopBar from '@/app/components/home/PageTopBar';
import AmbientBackdrop from '@/app/components/home/AmbientBackdrop';
import ListComposerPanel from '@/app/components/home/ListComposerPanel';
import CalendarTopPanel from '@/app/components/calendar/CalendarTopPanel';
import CalendarMonthGrid from '@/app/components/calendar/CalendarMonthGrid';
import TimelinePanel from '@/app/components/timeline/TimelinePanel';
import ReviewPanel from '@/app/components/review/ReviewPanel';
import ItemsPanel from '@/app/components/items/ItemsPanel';
import LogsModal from '@/app/components/logs/LogsModal';
import AboutModal from '@/app/components/about/AboutModal';
import CountdownFormModal from '@/app/components/countdown/CountdownFormModal';
import {
  Command,
  Calendar, Inbox, Sun, Star, Trash2,
  X, CheckCircle2,
  Flag, Tag as TagIcon, Hash, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  CheckSquare, LayoutGrid, Timer, Flame, Settings, Cloud, CloudSun, CloudRain, CloudFog, CloudSnow,
  ImagePlus, Monitor, Paperclip, Upload,
  Phone,
  Info,
  AlertTriangle,
  XCircle,
  Eraser,
  Brain,
  Pencil,
  Plus,
  Save,
} from 'lucide-react';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_MODEL_LIST = ['deepseek-v4-flash'];
const LEGACY_DEFAULT_MODEL_LIST = ['gemini-2.5-flash-lite'];
const DEFAULT_FALLBACK_TIMEOUT_SEC = 2;
const DEFAULT_SESSION_ID_KEY = 'recall_session_id';
const DEFAULT_REDIS_DB = 0;
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';
const DEFAULT_TASK_SEED_KEY = 'recall_default_tasks_seeded';
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
const CALENDAR_CITY_KEY = 'recall_calendar_city';
const DELETED_TASKS_KEY = 'recall_deleted_tasks';
const DELETED_COUNTDOWNS_KEY = 'recall_deleted_countdowns';
const DELETED_HABITS_KEY = 'recall_deleted_habits';
const DELETED_ITEMS_KEY = 'recall_deleted_items';
const COUNTDOWN_DISPLAY_MODE_KEY = 'recall_countdown_display_mode';
const AI_RETENTION_KEY = 'recall_ai_retention';
const SIDEBAR_WIDTH_KEY = 'recall_sidebar_width';
const SIDEBAR_COLLAPSED_KEY = 'recall_sidebar_collapsed';
const ACTIVE_FILTER_KEY = 'recall_active_filter';
const QUICK_ACCESS_OPEN_KEY = 'recall_quick_access_open';
const AGENT_MESSAGES_KEY = 'recall_agent_messages';
const MANAGE_AGENT_MESSAGES_KEY = 'recall_manage_agent_messages';
const USER_MEMORIES_KEY = 'recall_user_memories';
const DEFAULT_AUTO_SYNC_INTERVAL_MIN = 30;
const DEFAULT_SYNC_NAMESPACE = 'recall-default';
const AUTO_SYNC_INTERVAL_OPTIONS = [5, 15, 30, 60, 120];
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
  next7: '未来 7 天',
  completed: '已完成',
  review: '检查',
  items: '物品管理',
};
const ACTIVE_FILTER_VALUES = new Set([
  'todo',
  'calendar',
  'quadrant',
  'countdown',
  'habit',
  'agent',
  'search',
  'pomodoro',
  'category',
  'tag',
  'inbox',
  'today',
  'next7',
  'completed',
  'review',
  'items',
  'timeline',
]);
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

const AgentThinkingBubble = ({ label, accent = 'cyan' }: { label: string; accent?: 'cyan' | 'violet' }) => {
  const accentClass = accent === 'violet'
    ? 'border-violet-400/20 bg-[color:var(--ui-card-bg)] text-violet-200'
    : 'border-cyan-400/20 bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-primary)]';

  const dotClass = accent === 'violet' ? 'bg-violet-300/85' : 'bg-cyan-300/85';

  return (
    <div className="flex justify-start">
      <div className={`max-w-[86%] rounded-2xl border px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${accentClass}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className={`h-2 w-2 rounded-full ${dotClass} animate-pulse`} />
            <span className={`h-2 w-2 rounded-full ${dotClass} animate-pulse [animation-delay:160ms]`} />
            <span className={`h-2 w-2 rounded-full ${dotClass} animate-pulse [animation-delay:320ms]`} />
          </div>
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="mt-0.5 text-[11px] text-[color:var(--ui-text-secondary)]">正在组织回复，你可以稍等一下。</div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatCountdownDate = (dateText: string) => {
  const [year, month, day] = dateText.split('-');
  if (!year || !month || !day) return dateText;
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`;
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

const normalizeUserMemories = (raw: unknown): UserMemory[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((item) => {
      const candidate = item as Partial<UserMemory> | null | undefined;
      const content = typeof candidate?.content === 'string' ? candidate.content.trim() : '';
      if (!content) return null;
      const normalizedContent = content.slice(0, 240);
      const dedupeKey = normalizedContent.toLowerCase();
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      const nowIso = new Date().toISOString();
      return {
        id: typeof candidate?.id === 'string' && candidate.id.trim() ? candidate.id.trim() : createId(),
        content: normalizedContent,
        createdAt: typeof candidate?.createdAt === 'string' && candidate.createdAt.trim() ? candidate.createdAt.trim() : nowIso,
        updatedAt: typeof candidate?.updatedAt === 'string' && candidate.updatedAt.trim() ? candidate.updatedAt.trim() : nowIso,
      } as UserMemory;
    })
    .filter(Boolean)
    .slice(0, 30) as UserMemory[];
};


const getWeatherSummary = (weatherCode?: number) => {
  if (weatherCode === undefined || weatherCode === null) {
    return { label: '天气未知', Icon: Cloud };
  }
  if (weatherCode === 0) return { label: '晴朗', Icon: Sun };
  if ([1, 2, 3].includes(weatherCode)) return { label: '多云', Icon: CloudSun };
  if ([45, 48].includes(weatherCode)) return { label: '有雾', Icon: CloudFog };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(weatherCode)) return { label: '降雨', Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return { label: '降雪', Icon: CloudSnow };
  if ([95, 96, 99].includes(weatherCode)) return { label: '雷暴', Icon: CloudRain };
  return { label: '天气变化', Icon: Cloud };
};

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

const FUTURE_TASK_BUCKET_META: Record<FutureTaskBucketKey, { label: string; summary: string; tone: string; chipTone: string }> = {
  overdue: {
    label: '需要立刻处理',
    summary: '已逾期，优先清掉。',
    tone: 'border-rose-500/25 bg-rose-500/8',
    chipTone: 'text-rose-200 border-rose-500/30 bg-rose-500/10',
  },
  today: {
    label: '今天要动',
    summary: '今天内该推进的任务。',
    tone: 'border-amber-500/25 bg-amber-500/8',
    chipTone: 'text-amber-100 border-amber-500/30 bg-amber-500/10',
  },
  upcoming: {
    label: '即将到来',
    summary: '未来 7 天内，值得提前准备。',
    tone: 'border-sky-500/25 bg-sky-500/8',
    chipTone: 'text-sky-100 border-sky-500/30 bg-sky-500/10',
  },
  future: {
    label: '更远计划',
    summary: '已经排上，但不是眼前要做。',
    tone: 'border-violet-500/22 bg-violet-500/8',
    chipTone: 'text-violet-100 border-violet-500/28 bg-violet-500/10',
  },
  someday: {
    label: '未设日期',
    summary: '暂时先收着，等你安排。',
    tone: 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)]',
    chipTone: 'text-[#B7C0D8] border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)]',
  },
  completed: {
    label: '已完成',
    summary: '已经收尾的任务。',
    tone: 'border-emerald-500/20 bg-emerald-500/8',
    chipTone: 'text-emerald-100 border-emerald-500/25 bg-emerald-500/10',
  },
};

const getFutureTaskBucket = (
  task: Task,
  now: Date,
): FutureTaskBucketKey => {
  if (task.status === 'completed') return 'completed';
  if (!task.dueDate) return 'someday';
  if (isTaskOverdue(task)) return 'overdue';
  if (isTaskDueToday(task, now)) return 'today';
  if (isTaskDueWithinDays(task, now, 7)) return 'upcoming';
  return 'future';
};

const groupTasksByFutureSignal = (
  items: Task[],
  now: Date,
): TaskGroup[] => {
  const bucketOrder: FutureTaskBucketKey[] = ['overdue', 'today', 'upcoming', 'future', 'someday', 'completed'];
  const map = new Map<FutureTaskBucketKey, Task[]>();

  items.forEach((task) => {
    const bucket = getFutureTaskBucket(task, now);
    if (!map.has(bucket)) {
      map.set(bucket, []);
    }
    map.get(bucket)?.push(task);
  });

  return bucketOrder
    .filter((bucket) => (map.get(bucket)?.length ?? 0) > 0)
    .map((bucket) => ({
      key: bucket,
      label: FUTURE_TASK_BUCKET_META[bucket].label,
      items: map.get(bucket) ?? [],
    }));
};

const summarizeFutureTaskGroups = (groups: TaskGroup[]) => {
  const summary = {
    overdue: 0,
    today: 0,
    upcoming: 0,
    future: 0,
  };

  groups.forEach((group) => {
    if (group.key === 'overdue' || group.key === 'today' || group.key === 'upcoming' || group.key === 'future') {
      summary[group.key] = group.items.length;
    }
  });

  return summary;
};

const parseHabitFrequencyToRepeat = (frequency?: string, dueDate?: string): TaskRepeatRule | undefined => {
  const text = frequency?.trim();
  if (!text) return { type: 'daily' };

  if (/(每天|每日|天天|按天)/.test(text)) {
    return { type: 'daily' };
  }

  if (/每周/.test(text)) {
    const weekdays: number[] = [];
    const weekdayMap: Record<string, number> = {
      日: 0,
      天: 0,
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
    };
    const regex = /周([日天一二三四五六])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const mapped = weekdayMap[match[1]];
      if (typeof mapped === 'number' && !weekdays.includes(mapped)) {
        weekdays.push(mapped);
      }
    }
    if (weekdays.length > 0) {
      return { type: 'weekly', weekdays };
    }
    const baseDate = dueDate ? new Date(dueDate) : new Date();
    return { type: 'weekly', weekdays: [baseDate.getDay()] };
  }

  if (/每月/.test(text)) {
    const dayMatch = text.match(/每月\s*(\d{1,2})\s*[号日]?/);
    if (dayMatch) {
      const monthDay = Math.min(31, Math.max(1, Number(dayMatch[1]) || 1));
      return { type: 'monthly', monthDay };
    }
    const baseDate = dueDate ? new Date(dueDate) : new Date();
    return { type: 'monthly', monthDay: baseDate.getDate() };
  }

  const customMatch = text.match(/每\s*(\d+)\s*天/);
  if (customMatch) {
    return { type: 'custom', interval: Math.max(1, Number(customMatch[1]) || 1) };
  }

  return { type: 'daily' };
};






// 管理助手筛选：全部/只看未完成/只看今日/只看逾期
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

// ---------------------------
// Main Layout
// ---------------------------


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

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverQuadrantKey, setDragOverQuadrantKey] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
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
  const [activeFilter, setActiveFilter] = useState('agent'); // inbox, today, next7, completed, calendar, agent
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

  const resolveActionableDetail = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    detail?: string,
  ) => {
    if (detail && detail.trim()) return detail.trim();
    if (level === 'error') {
      if (message.includes('同步')) return '建议：先检查同步配置，再点击「重试同步」。';
      if (message.includes('AI') || message.includes('agent')) return '建议：检查 AI Key 与模型配置后重试。';
      if (message.includes('导入') || message.includes('导出')) return '建议：确认文件格式与权限后重试。';
      return '建议：打开运行日志查看详情后再重试。';
    }
    if (level === 'warning') return '建议：根据提示调整设置，然后再继续操作。';
    if (level === 'success') return '完成了，可以继续下一步。';
    return '状态已更新。';
  };

  const pushLog = useCallback((
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    detail?: string,
    options?: { silentFeedback?: boolean },
  ) => {
    const actionableDetail = resolveActionableDetail(level, message, detail);
    const entry = {
      id: createId(),
      level,
      message,
      detail: actionableDetail,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 200));
    if (!options?.silentFeedback) {
      setStatusFeedback({
        id: entry.id,
        level,
        message,
        detail: actionableDetail,
      });
    }
  }, []);

  const refreshTasks = useCallback(() => {
    const all = taskStore.getAll();
    const deletedMap = readDeletedMap(DELETED_TASKS_KEY);
    const { filtered, nextDeleted } = filterByDeletions(all, deletedMap);
    if (Object.keys(deletedMap).length !== Object.keys(nextDeleted).length) {
      persistDeletedMap(DELETED_TASKS_KEY, nextDeleted);
    }
    setTasks(filtered);
  }, []);

  const refreshItems = useCallback(() => {
    const all = itemStore.getAll();
    const deletedMap = readDeletedMap(DELETED_ITEMS_KEY);
    const { filtered, nextDeleted } = filterByDeletions(all, deletedMap);
    if (Object.keys(deletedMap).length !== Object.keys(nextDeleted).length) {
      persistDeletedMap(DELETED_ITEMS_KEY, nextDeleted);
    }
    setItems(filtered);
  }, []);

  const { syncToPg } = usePgMirrorSync({
    enabled: Boolean(pgHost),
    config: {
      pgHost,
      pgPort,
      pgDatabase,
      pgUsername,
      pgPassword,
    },
    pushLog,
  });
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


  const syncManager = useSyncManager({
    redisHost,
    redisPort: Number(redisPort) || DEFAULT_REDIS_PORT,
    redisDb: Number(redisDb) || DEFAULT_REDIS_DB,
    redisPassword,
    syncNamespace,
    autoSyncEnabled,
    autoSyncIntervalMin: autoSyncInterval,
    buildSyncPayload: () => buildSyncPayload(),
    getLastLocalChange: () => getLastLocalChange(),
    applyImportedData: (payload, mode) => applyImportedData(payload, mode),
    applySyncedSettings: (payload) => applySyncedSettings(payload),
    pushLog,
    onNeedSettings: () => setShowSettings(true),
  });
  const { syncStatus, isSyncingNow } = syncManager;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240); // PC端侧边栏宽度（像素）
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // PC端侧边栏是否折叠
  const [habits, setHabits] = useState<Habit[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showCountdownForm, setShowCountdownForm] = useState(false);
  const [showClearCompletedConfirm, setShowClearCompletedConfirm] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemCategoryInput, setItemCategoryInput] = useState('');
  const [itemLocationInput, setItemLocationInput] = useState('');
  const [itemQuantityInput, setItemQuantityInput] = useState('1');
  const [itemTagsInput, setItemTagsInput] = useState('');
  const [itemNoteInput, setItemNoteInput] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isTodoOpen, setIsTodoOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isListsOpen, setIsListsOpen] = useState(true);
  const [expandedQuadrants, setExpandedQuadrants] = useState<Record<string, boolean>>({});
  const [lastRemovedTask, setLastRemovedTask] = useState<Task | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [showCompletedInCalendar, setShowCompletedInCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarNotes, setCalendarNotes] = useState<Record<string, string>>({});
  const [calendarNoteLoading, setCalendarNoteLoading] = useState(false);
  const [calendarCityInput, setCalendarCityInput] = useState('');
  const [calendarCity, setCalendarCity] = useState<WeatherCity | null>(null);
  const [weatherCities, setWeatherCities] = useState<WeatherCity[]>([]);
  const [weatherCitySearchMessage, setWeatherCitySearchMessage] = useState('');
  const suppressWeatherCitySearchRef = useRef(false);
  const weatherCitySearchAliveRef = useRef(0);
  const [weatherForecastHint, setWeatherForecastHint] = useState('');
  const [isSearchingWeatherCity, setIsSearchingWeatherCity] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isLocatingWeatherCity, setIsLocatingWeatherCity] = useState(false);
  const [weatherLocateError, setWeatherLocateError] = useState<string>('');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekDays, setWeekDays] = useState(() => buildWeekDays(weekStart));
  const [weekLabel, setWeekLabel] = useState(() => buildWeekLabel(weekStart));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtaskQuickInputRef = useRef<HTMLInputElement | null>(null);
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
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [taskUndoSnapshot, setTaskUndoSnapshot] = useState<Task[] | null>(null);
  const [taskUndoLabel, setTaskUndoLabel] = useState('');
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
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback | null>(null);
  useEffect(() => {
    if (!statusFeedback) return;
    const timeoutMs = statusFeedback.level === 'error' || statusFeedback.level === 'warning' ? 6400 : 4200;
    const timer = window.setTimeout(() => {
      setStatusFeedback((prev) => (prev?.id === statusFeedback.id ? null : prev));
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [statusFeedback]);
  // todo-agent 聊天状态
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [aiAssistantMode, setAiAssistantMode] = useState<AiAssistantMode>('record');
  const [manageAgentFilter, setManageAgentFilter] = useState<ManageAgentFilter>('all');

  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentImages, setAgentImages] = useState<ImageAttachment[]>([]);
  const agentImageInputRef = useRef<HTMLInputElement | null>(null);
  const agentAbortControllerRef = useRef<AbortController | null>(null);
  const userMemoryPersistReadyRef = useRef(false);
  const [agentItems, setAgentItems] = useState<AgentItem[]>([]);
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [appliedAgentDecisionIds, setAppliedAgentDecisionIds] = useState<Set<string>>(new Set());
  const [agentGuidance, setAgentGuidance] = useState<string[]>([]);
  const [addedAgentItemIds, setAddedAgentItemIds] = useState<Set<string>>(new Set());
  const [agentError, setAgentError] = useState<string | null>(null);
  const [userMemories, setUserMemories] = useState<UserMemory[]>([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState('');
  const [manageAgentInput, setManageAgentInput] = useState('');
  const [manageAgentMessages, setManageAgentMessages] = useState<ManageAgentMessage[]>([]);
  const [manageAgentLoading, setManageAgentLoading] = useState(false);
  const [manageAgentError, setManageAgentError] = useState<string | null>(null);
  const [manageRecommendations, setManageRecommendations] = useState<Array<{ id: string; title: string; reason?: string; suggestedPriority?: number; suggestedPinned?: boolean; suggestedDuePreset?: 'today' | 'tomorrow' | 'tonight' }>>([]);
  const [manageRecActions, setManageRecActions] = useState<Record<string, { pin?: boolean; priority?: number; dueDate?: string }>>({});

  const applyManageActionToTask = (task: Task, action: { pin?: boolean; priority?: number; dueDate?: string }) => {
    const next: Task = { ...task };
    if (typeof action.pin === 'boolean') next.pinned = action.pin;
    if (typeof action.priority === 'number') next.priority = action.priority;
    if (typeof action.dueDate === 'string') next.dueDate = action.dueDate;
    return next;
  };

  // 倒数日 AI 聊天状态
  const [countdownAgentMessages, setCountdownAgentMessages] = useState<AgentMessage[]>([]);
  const [countdownAgentInput, setCountdownAgentInput] = useState('');
  const [countdownAgentLoading, setCountdownAgentLoading] = useState(false);
  const [countdownAgentItems, setCountdownAgentItems] = useState<CountdownAgentItem[]>([]);
  const [addedCountdownAgentItemIds, setAddedCountdownAgentItemIds] = useState<Set<string>>(new Set());
  const [countdownAgentError, setCountdownAgentError] = useState<string | null>(null);
  const [habitAgentInput, setHabitAgentInput] = useState('');
  const [habitAgentLoading, setHabitAgentLoading] = useState(false);
  const [habitAgentItems, setHabitAgentItems] = useState<HabitAgentItem[]>([]);
  const [addedHabitAgentItemIds, setAddedHabitAgentItemIds] = useState<Set<string>>(new Set());
  const [habitAgentError, setHabitAgentError] = useState<string | null>(null);
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
  const selectedReminderPreset = selectedTask?.reminderPreset ?? 'none';
  const selectedReminderDateValue = selectedTask?.reminderAt
    ? formatZonedDate(selectedTask.reminderAt, selectedTimezoneOffset)
    : selectedDateValue;
  const selectedReminderTimeValue = selectedTask?.reminderAt
    ? formatZonedTime(selectedTask.reminderAt, selectedTimezoneOffset)
    : '09:00';

  const selectedTaskPhoneNumbers = selectedTask ? extractPhoneNumbers(selectedTask.title) : [];
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

  const {
    themeMode,
    isSystemTheme,
    themePreference,
    accentTheme,
    gradientTheme,
    setThemePreference,
    setAccentTheme,
    setGradientTheme,
    handleThemeToggle,
  } = useThemeSettings();

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
    themePreference: 'light' | 'dark' | 'system';
    accentTheme: 'blue' | 'violet' | 'emerald' | 'rose';
    gradientTheme: 'aurora' | 'sunset' | 'ocean' | 'mono';
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
    if (next.themePreference === 'system') {
      localStorage.removeItem('recall_theme');
    } else {
      localStorage.setItem('recall_theme', next.themePreference);
    }
    localStorage.setItem('recall_theme_accent', next.accentTheme);
    localStorage.setItem('recall_theme_gradient', next.gradientTheme);
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

  const dispatchNotification = async (payload: {
    title: string;
    body: string;
    icon: string;
    badge: string;
    tag: string;
    data?: Record<string, any>;
  }) => {
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
        return;
      }
      if (registration?.active) {
        registration.active.postMessage({ type: 'SHOW_NOTIFICATION', payload });
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
      await dispatchNotification(payload);
      pushLog('success', '通知已发送', '测试通知已触发');
    } catch (error) {
      pushLog('error', '通知发送失败', String((error as Error)?.message || error));
    }
  };

  const normalizeModelListText = (models: string[]) => {
    const unique = Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
    return unique.join('\n');
  };

  const fetchModelList = async () => {
    if (!apiKey?.trim()) {
      setModelFetchError('请先填写 API 密钥');
      return;
    }
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
      const cachedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
      if (cachedVersion !== APP_VERSION) {
        try {
          // 升级版本时仅清理业务数据，保留用户配置与同步信息，避免升级后丢失设置
          const keysToPreserve = new Set([
            APP_VERSION_STORAGE_KEY,
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
            CALENDAR_CITY_KEY,
            LAST_LOCAL_CHANGE_KEY,
            'recall_theme',
            SIDEBAR_WIDTH_KEY,
            SIDEBAR_COLLAPSED_KEY,
            ACTIVE_FILTER_KEY,
            QUICK_ACCESS_OPEN_KEY,
            USER_MEMORIES_KEY,
          ]);
          const preservedEntries = Object.keys(localStorage)
            .filter((key) => keysToPreserve.has(key))
            .map((key) => [key, localStorage.getItem(key)] as const);
          localStorage.clear();
          preservedEntries.forEach(([key, value]) => {
            if (value !== null) localStorage.setItem(key, value);
          });
          localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
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
      const storedCalendarCity = localStorage.getItem(CALENDAR_CITY_KEY);
      const storedUserMemories = localStorage.getItem(USER_MEMORIES_KEY);

      if (storedKey) {
        setApiKey(storedKey);
      }
      if (storedBaseUrl) setApiBaseUrl(storedBaseUrl);
      const legacyModelListText = LEGACY_DEFAULT_MODEL_LIST.join('\n');
      const nextDefaultModelListText = DEFAULT_MODEL_LIST.join('\n');
      const shouldMigrateModelList =
        !storedModelList || storedModelList.trim() === legacyModelListText;
      const shouldMigrateChatModel =
        !storedChatModel || storedChatModel.trim() === LEGACY_DEFAULT_MODEL_LIST[0];

      if (shouldMigrateModelList) {
        setModelListText(nextDefaultModelListText);
        localStorage.setItem('recall_model_list', nextDefaultModelListText);
      } else if (storedModelList) {
        setModelListText(storedModelList);
      }

      if (shouldMigrateChatModel) {
        setChatModel(DEFAULT_MODEL_LIST[0]);
        localStorage.setItem('recall_chat_model', DEFAULT_MODEL_LIST[0]);
      } else if (storedChatModel) {
        setChatModel(storedChatModel);
      }
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
      if (storedCalendarCity) {
        try {
          const parsed = JSON.parse(storedCalendarCity) as WeatherCity;
          if (parsed?.name && Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) {
            setCalendarCity(parsed);
            setCalendarCityInput([parsed.name, parsed.admin1, parsed.country].filter(Boolean).join(' · '));
          }
        } catch (error) {
          console.error('Invalid calendar city cache', error);
        }
      }
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

      const storedActiveFilter = localStorage.getItem(ACTIVE_FILTER_KEY);
      if (storedActiveFilter && ACTIVE_FILTER_VALUES.has(storedActiveFilter)) {
        setActiveFilter(storedActiveFilter);
      }
      const storedQuickAccessOpen = localStorage.getItem(QUICK_ACCESS_OPEN_KEY);
      if (storedQuickAccessOpen === 'true') setIsQuickAccessOpen(true);
      if (storedQuickAccessOpen === 'false') setIsQuickAccessOpen(false);

      const storedAgentMessages = localStorage.getItem(AGENT_MESSAGES_KEY);
      if (storedAgentMessages) {
        try {
          const parsed = JSON.parse(storedAgentMessages) as AgentMessage[];
          if (Array.isArray(parsed)) {
            setAgentMessages(
              parsed
                .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .slice(-80),
            );
          }
        } catch (error) {
          console.error('Invalid agent messages cache', error);
        }
      }

      const storedManageAgentMessages = localStorage.getItem(MANAGE_AGENT_MESSAGES_KEY);
      if (storedManageAgentMessages) {
        try {
          const parsed = JSON.parse(storedManageAgentMessages) as ManageAgentMessage[];
          if (Array.isArray(parsed)) {
            setManageAgentMessages(
              parsed
                .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .slice(-80),
            );
          }
        } catch (error) {
          console.error('Invalid manage-agent messages cache', error);
        }
      }
      if (storedUserMemories) {
        try {
          setUserMemories(normalizeUserMemories(JSON.parse(storedUserMemories)));
        } catch (error) {
          console.error('Invalid user memories cache', error);
        }
      }

      refreshTasks();
      refreshHabits();
      refreshCountdowns();
      refreshItems();

      const seedDefaultTasks = () => {
        if (typeof window === 'undefined') return;
        const seeded = localStorage.getItem(DEFAULT_TASK_SEED_KEY);
        const existingTasks = taskStore.getAll();
        if (seeded || existingTasks.length > 0) return;
        const now = new Date();
        const seedTitles = [
          '欢迎使用 Recall：先点左侧切换到「今日」看看',
          '试试输入：明天下午 3 点提醒我开会',
          '给任务加上 #标签 或 @列表，快速分类',
          '完成后点小圆圈 ✅，感受一下流程',
        ];
        const seededTasks: Task[] = seedTitles.map((title, index) => {
          const category = classifyCategory(title);
          return {
            id: createId(),
            title,
            dueDate: index === 0
              ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
              : undefined,
            timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
            priority: evaluatePriority(index === 0 ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined, 0, now.getTime()),
            category,
            status: 'todo',
            tags: [],
            pinned: index === 0,
            subtasks: [],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
        });
        seededTasks.forEach((task) => taskStore.add(task));
        localStorage.setItem(DEFAULT_TASK_SEED_KEY, 'true');
        refreshTasks();
      };

      seedDefaultTasks();

      setSettingsLoaded(true);
    }
  }, [refreshItems, refreshTasks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AGENT_MESSAGES_KEY, JSON.stringify(agentMessages.slice(-80)));
  }, [agentMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MANAGE_AGENT_MESSAGES_KEY, JSON.stringify(manageAgentMessages.slice(-80)));
  }, [manageAgentMessages]);

  useEffect(() => {
    if (typeof window === 'undefined' || !settingsLoaded) return;
    if (!userMemoryPersistReadyRef.current) {
      userMemoryPersistReadyRef.current = true;
      return;
    }
    localStorage.setItem(USER_MEMORIES_KEY, JSON.stringify(userMemories.slice(0, 30)));
    localStorage.setItem(LAST_LOCAL_CHANGE_KEY, new Date().toISOString());
  }, [settingsLoaded, userMemories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ACTIVE_FILTER_VALUES.has(activeFilter)) return;
    localStorage.setItem(ACTIVE_FILTER_KEY, activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUICK_ACCESS_OPEN_KEY, String(isQuickAccessOpen));
  }, [isQuickAccessOpen]);

  const clearCurrentAiContext = () => {
    if (typeof window !== 'undefined' && !window.confirm('确认清除当前 AI 助手上下文吗？这不会删除任务数据。')) {
      return;
    }

    const nextSessionId = createId();
    setSessionId(nextSessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEFAULT_SESSION_ID_KEY, nextSessionId);
    }

    if (aiAssistantMode === 'record') {
      setAgentMessages([]);
      setAgentInput('');
      setAgentImages([]);
      setAgentItems([]);
      setAgentGuidance([]);
      setAddedAgentItemIds(new Set());
      setAgentError(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AGENT_MESSAGES_KEY);
      }
      pushLog('success', '已清除记录助手上下文');
      return;
    }

    setManageAgentMessages([]);
    setManageAgentInput('');
    setManageAgentError(null);
    setManageRecommendations([]);
    setManageRecActions({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MANAGE_AGENT_MESSAGES_KEY);
    }
    pushLog('success', '已清除管理助手上下文');
  };

  // 注意：apiKey 的持久化已移至 persistSettings 函数中统一处理
  // 避免在用户编辑设置时意外丢失密钥

  // PG 数据加载逻辑
  usePgBootstrapSync({
    enabled: Boolean(pgHost) && settingsLoaded,
    pgHost,
    pgPort,
    pgDatabase,
    pgUsername,
    pgPassword,
    pushLog,
    taskStore,
    habitStore,
    countdownStore,
    itemStore,
    setTasks,
    setHabits,
    setCountdowns,
    setItems,
  });


  useEffect(() => {
    pushLog('info', '应用已启动', pgHost ? `数据存储：PG (${pgHost})` : '数据存储：浏览器 localStorage');
  }, [pgHost, pushLog]);

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
    if (typeof window === 'undefined') return;
    if (!notificationSupported) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const timerIds: number[] = [];
    const nowMs = Date.now();

    tasks.forEach((task) => {
      if (task.status === 'completed') return;
      if (!task.reminderAt) return;
      const reminderMs = new Date(task.reminderAt).getTime();
      if (!Number.isFinite(reminderMs) || reminderMs <= nowMs) return;
      const delay = reminderMs - nowMs;
      if (delay > 2_147_000_000) return;

      const timerId = window.setTimeout(async () => {
        const latest = taskStore.getAll().find((item) => item.id === task.id);
        if (!latest || latest.status === 'completed' || !latest.reminderAt) return;
        if (Math.abs(new Date(latest.reminderAt).getTime() - reminderMs) > 1_000) return;

        try {
          await dispatchNotification({
            title: 'Recall 任务提醒',
            body: latest.title,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: `recall-reminder-${latest.id}`,
            data: { taskId: latest.id, url: '/' },
          });
          pushLog('info', '提醒已触发', latest.title);
        } catch (error) {
          pushLog('error', '任务提醒失败', String((error as Error)?.message || error));
        }
      }, delay);

      timerIds.push(timerId);
    });

    return () => {
      timerIds.forEach((id) => window.clearTimeout(id));
    };
  }, [tasks, notificationSupported, pushLog]);

  useEffect(() => {
    if (calendarView === 'week') {
      const start = getWeekStart(new Date());
      setWeekStart(start);
      setWeekDays(buildWeekDays(start));
      setWeekLabel(buildWeekLabel(start));
    }
    setWeatherCities([]);
    setIsSearchingWeatherCity(false);
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




  // clearWeatherCitySearchStateOnLeave: 避免切换到其他页面后残留候选框/提示。
  useEffect(() => {
    if (activeFilter === 'calendar') return;
    setWeatherCities([]);
    setWeatherCitySearchMessage('');
    setWeatherForecastHint('');
    setIsSearchingWeatherCity(false);
  }, [activeFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!calendarCity) {
      localStorage.removeItem(CALENDAR_CITY_KEY);
      return;
    }
    localStorage.setItem(CALENDAR_CITY_KEY, JSON.stringify(calendarCity));
  }, [calendarCity]);

  useEffect(() => {
    if (activeFilter !== 'calendar') return;

    const normalizeCityText = (value: string) =>
      value
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[·•\-_,，。]/g, '');

    const keyword = calendarCityInput.trim();
    const keywordNormalized = normalizeCityText(keyword);
    const selectedCityLabel = calendarCity
      ? [calendarCity.name, calendarCity.admin1, calendarCity.country].filter(Boolean).join(' · ')
      : '';
    const selectedCityLabelNormalized = normalizeCityText(selectedCityLabel);

    if (keyword.length < 2) {
      setWeatherCities([]);
      setWeatherCitySearchMessage('');
      setIsSearchingWeatherCity(false);
      return;
    }

    // 输入框和已选城市一致：不需要再展示候选项，也不显示“未找到”类提示。
    if (selectedCityLabelNormalized && keywordNormalized === selectedCityLabelNormalized) {
      // 保持输入框与已选城市标签一致（避免用户输入不同分隔符/空格导致视觉不一致）。
      if (selectedCityLabel && keyword.trim() != selectedCityLabel) {
        setCalendarCityInput(selectedCityLabel);
      }
      setWeatherCities([]);
      setWeatherCitySearchMessage('');
      setIsSearchingWeatherCity(false);
      return;
    }

    const dedupeClientCities = (cities: WeatherCity[]) => {
      const seenName = new Set<string>();
      const seenCoord = new Set<string>();

      const round3 = (num: number) => Math.round(num * 1000) / 1000;

      return cities.filter((city) => {
        const nameKey = normalizeCityText([city.name, city.admin1, city.country].filter(Boolean).join('|'));
        const lat = Number(city.latitude);
        const lon = Number(city.longitude);
        const coordKey = Number.isFinite(lat) && Number.isFinite(lon)
          ? `${round3(lat)},${round3(lon)}`
          : '';

        if (coordKey && seenCoord.has(coordKey)) return false;
        if (nameKey && seenName.has(nameKey)) return false;

        if (coordKey) seenCoord.add(coordKey);
        if (nameKey) seenName.add(nameKey);
        return true;
      });
    };

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      // 如果刚刚是“选择城市”导致输入框回填，跳过一次搜索，避免重复候选回弹。
      if (suppressWeatherCitySearchRef.current) {
        suppressWeatherCitySearchRef.current = false;
        setIsSearchingWeatherCity(false);
        setWeatherCities([]);
        setWeatherCitySearchMessage('');
        return;
      }

      setIsSearchingWeatherCity(true);
      setWeatherCities([]);
      setWeatherCitySearchMessage('');

      const requestId = (weatherCitySearchAliveRef.current += 1);
      try {
        const res = await fetch(`/api/weather/search?q=${encodeURIComponent(keyword)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('weather city search failed');
        }
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const dedupedResults = dedupeClientCities(results);
        // 忽略过期请求（例如用户已选择城市/切换关键词后，旧请求才返回）
        if (requestId !== weatherCitySearchAliveRef.current) return;
        setWeatherCities(dedupedResults);
        setWeatherCitySearchMessage(dedupedResults.length === 0 ? '未找到匹配城市，请换个关键词试试' : '');
        
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;
        if (requestId !== weatherCitySearchAliveRef.current) return;
        setWeatherCities([]);
        setWeatherCitySearchMessage('城市搜索服务暂时不可用');
        
      } finally {
        if (requestId === weatherCitySearchAliveRef.current) {
          setIsSearchingWeatherCity(false);
        }
      }
    }, 260);

    return () => {
      controller.abort();
      // 让所有未返回的请求失效，避免晚到的响应污染 UI。
      weatherCitySearchAliveRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [calendarCityInput, activeFilter, calendarCity]);



  const handleLocateWeatherCity = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setWeatherLocateError('当前设备不支持定位功能');
      setWeatherCitySearchMessage('');
      return;
    }

    setIsLocatingWeatherCity(true);
    setWeatherLocateError('');
    setWeatherCitySearchMessage('正在定位当前位置…');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const res = await fetch(`/api/weather/reverse?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      const city = data?.city;
      if (!res.ok || !city) {
        throw new Error(data?.error || '定位城市解析失败');
      }

      const selectedCity = {
        id: city.id || `geo:${lat},${lon}`,
        name: city.name || '当前位置',
        admin1: city.admin1,
        country: city.country,
        latitude: Number(city.latitude),
        longitude: Number(city.longitude),
        timezone: city.timezone,
      } as WeatherCity;

      setCalendarCity(selectedCity);
      const label = [selectedCity.name, selectedCity.admin1, selectedCity.country].filter(Boolean).join(' · ');
      suppressWeatherCitySearchRef.current = true;
      setCalendarCityInput(label);
      setWeatherCities([]);
      setWeatherLocateError('');
      setWeatherCitySearchMessage('已定位到当前位置');
    } catch (error: any) {
      const code = error?.code;
      let message = '定位失败，请稍后重试';
      if (code === 1) {
        message = '定位权限被拒绝，请在浏览器中允许定位后重试';
      } else if (code === 2) {
        message = '无法获取位置信息，请检查定位服务后重试';
      } else if (code === 3) {
        message = '定位超时，请检查网络/GPS 后重试';
      } else if (String(error?.message || '').includes('解析')) {
        message = '定位成功但城市解析失败，请重试或手动搜索';
      }
      setWeatherLocateError(message);
      setWeatherCitySearchMessage('');
    } finally {
      setIsLocatingWeatherCity(false);
    }
  };

  useEffect(() => {
    if (!calendarCity) {
      setWeatherForecast(null);
      setWeatherLoading(false);
      setWeatherForecastHint('');
      return;
    }

    const targetDate = selectedCalendarDate || formatDateKeyByOffset(new Date(), DEFAULT_TIMEZONE_OFFSET);
    const controller = new AbortController();

    const fetchForecast = async () => {
      setWeatherForecast(null);
      setWeatherLoading(true);
      setWeatherForecastHint('');
      try {
        const res = await fetch(
          `/api/weather/forecast?lat=${calendarCity.latitude}&lon=${calendarCity.longitude}&date=${targetDate}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setWeatherForecast(null);
          setWeatherForecastHint('天气接口请求失败');
          return;
        }
        const data = await res.json();
        setWeatherForecast(data);
        if (typeof data?.warning === 'string') {
          setWeatherForecastHint(data.warning);
        }
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;
        setWeatherForecast(null);
        setWeatherForecastHint('天气服务连接受限');
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    };

    fetchForecast();

    return () => {
      controller.abort();
    };
  }, [calendarCity, selectedCalendarDate]);

  useEffect(() => {
    setNewSubtaskTitle('');
  }, [selectedTask?.id]);

  useEffect(() => {
    setNewTagInput('');
  }, [selectedTask?.id]);

  useEffect(() => {
    setSelectedTask(null);
    setEditingTaskId(null);
    setEditingTaskTitle('');
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

  const snapshotTasksForUndo = (label: string) => {
    setTaskUndoSnapshot(taskStore.getAll().map((task) => ({
      ...task,
      tags: task.tags ? [...task.tags] : [],
      subtasks: task.subtasks ? task.subtasks.map((subtask) => ({ ...subtask })) : [],
      attachments: task.attachments ? task.attachments.map((attachment) => ({ ...attachment })) : [],
      repeat: task.repeat ? { ...task.repeat, weekdays: task.repeat.weekdays ? [...task.repeat.weekdays] : undefined } : undefined,
    })));
    setTaskUndoLabel(label);
  };

  const restoreTaskSnapshot = () => {
    if (!taskUndoSnapshot) return;
    taskStore.replaceAll(taskUndoSnapshot);
    refreshTasks();
    if (selectedTask) {
      const restoredSelected = taskUndoSnapshot.find((task) => task.id === selectedTask.id) ?? null;
      setSelectedTask(restoredSelected);
    }
    setTaskUndoSnapshot(null);
    setTaskUndoLabel('');
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

  const createHabit = (titleOverride?: string) => {
    const title = (titleOverride ?? newHabitTitle).trim();
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
  const filterNow = new Date();

  const { filteredTasks, overdueCount, activeDueCount } = useTaskFilters({
    tasks,
    activeFilter,
    activeCategory,
    activeTag,
    now: filterNow,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
  });

  const activeDueTasks = activeDueCount;
  const overdueTasks = overdueCount;
  const procrastinationIndex = activeDueTasks > 0
    ? Math.round((overdueTasks / activeDueTasks) * 100)
    : 0;

  const sortedTasks = sortTasks(filteredTasks, taskSortMode);
  const groupedTasks = groupTasks(sortedTasks, taskGroupMode);
  const futureAwareGroupedTasks = groupTasksByFutureSignal(sortedTasks, filterNow);
  const futureTaskSummary = summarizeFutureTaskGroups(futureAwareGroupedTasks);

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const deriveItemStatusFromQuantity = (quantity: number): Item['status'] => {
  if (quantity <= 0) return 'missing';
  if (quantity <= 2) return 'low_stock';
  return 'normal';
};

const applyCompletedItemAction = (item: Item, action: string) => {
  const safeQuantity = Math.max(0, Number(item.quantity) || 0);

  if (action === 'restock') {
    const nextQuantity = Math.max(safeQuantity, 3);
    return {
      quantity: nextQuantity,
      status: deriveItemStatusFromQuantity(nextQuantity),
    };
  }

  if (action === 'buy') {
    const nextQuantity = safeQuantity + 1;
    return {
      quantity: nextQuantity,
      status: deriveItemStatusFromQuantity(nextQuantity),
    };
  }

  if (action === 'put_back') {
    return {
      quantity: safeQuantity,
      status: item.status === 'missing' ? deriveItemStatusFromQuantity(Math.max(safeQuantity, 1)) : item.status,
    };
  }

  return {
    quantity: safeQuantity,
    status: item.status,
  };
};

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
      pinned: false,
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

  const applyAgentTaskChanges = (task: Task, changes?: AgentTaskChanges) => {
    if (!changes) return task;
    const next: Task = { ...task };

    if (typeof changes.title === 'string' && changes.title.trim().length > 0) {
      next.title = changes.title.trim();
    }
    if (changes.dueDate === null) {
      next.dueDate = undefined;
      next.reminderAt = undefined;
      next.reminderPreset = 'none';
    } else if (typeof changes.dueDate === 'string' && changes.dueDate.trim().length > 0) {
      next.dueDate = changes.dueDate;
    }
    if (typeof changes.priority === 'number') {
      next.priority = changes.priority;
    }
    if (changes.category === null) {
      next.category = undefined;
    } else if (typeof changes.category === 'string' && changes.category.trim().length > 0) {
      next.category = changes.category.trim();
    }
    if (Array.isArray(changes.tags)) {
      next.tags = changes.tags.filter(Boolean);
    }
    if (Array.isArray(changes.subtasks)) {
      const existingSubtasksByTitle = new Map(
        (task.subtasks ?? []).map((subtask) => [subtask.title.trim().toLowerCase(), subtask]),
      );
      next.subtasks = changes.subtasks
        .map((subtask) => {
          const title = subtask.title?.trim() || '';
          const existing = existingSubtasksByTitle.get(title.toLowerCase());
          return {
            id: existing?.id ?? createId(),
            title,
            completed: existing?.completed ?? false,
          };
        })
        .filter((subtask) => subtask.title.length > 0);
    }
    if (changes.repeat === null) {
      next.repeat = undefined;
    } else if (changes.repeat) {
      next.repeat = changes.repeat;
    }
    if (changes.status === 'todo' || changes.status === 'in_progress' || changes.status === 'completed') {
      next.status = changes.status;
    }
    if (typeof changes.pinned === 'boolean') {
      next.pinned = changes.pinned;
    }

    return next;
  };

  const describeAgentTaskChanges = (changes?: AgentTaskChanges) => {
    if (!changes) return [];
    const entries: string[] = [];
    if (typeof changes.title === 'string' && changes.title.trim()) entries.push(`标题改为“${changes.title.trim()}”`);
    if (changes.dueDate === null) entries.push('清空日期');
    else if (typeof changes.dueDate === 'string' && changes.dueDate.trim()) entries.push('更新日期');
    if (typeof changes.priority === 'number') entries.push(`优先级设为${['低', '中', '高'][changes.priority] || changes.priority}`);
    if (changes.category === null) entries.push('清空分类');
    else if (typeof changes.category === 'string' && changes.category.trim()) entries.push(`分类改为${changes.category.trim()}`);
    if (Array.isArray(changes.tags)) entries.push(`标签更新为 ${changes.tags.join('、') || '空'}`);
    if (Array.isArray(changes.subtasks)) entries.push(`子任务改为 ${changes.subtasks.length} 项`);
    if (changes.repeat === null) entries.push('取消重复');
    else if (changes.repeat) entries.push('更新重复规则');
    if (changes.status === 'todo' || changes.status === 'in_progress' || changes.status === 'completed') {
      entries.push(`状态改为${changes.status === 'completed' ? '已完成' : changes.status === 'in_progress' ? '进行中' : '待处理'}`);
    }
    if (typeof changes.pinned === 'boolean') entries.push(changes.pinned ? '设为置顶' : '取消置顶');
    return entries;
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

  const handleCancelAgentSend = () => {
    const controller = agentAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
    agentAbortControllerRef.current = null;
  };

  const buildTaskSummaryForTodoAgent = () => {
    const nowMs = Date.now();
    const normalizedInput = agentInput.trim().toLowerCase();
    const scoreTask = (task: Task) => {
      let score = 0;
      const title = task.title.toLowerCase();
      if (normalizedInput) {
        if (title.includes(normalizedInput) || normalizedInput.includes(title)) score += 60;
        normalizedInput.split(/\s+/).filter(Boolean).forEach((token) => {
          if (title.includes(token)) score += 8;
        });
      }
      if (task.status === 'in_progress') score += 30;
      if (task.status === 'todo') score += 10;
      if (task.pinned) score += 12;
      score += (typeof task.priority === 'number' ? task.priority : 0) * 10;
      if (task.dueDate) {
        const diff = new Date(task.dueDate).getTime() - nowMs;
        if (diff <= 0) score += 25;
        else if (diff <= 24 * 60 * 60 * 1000) score += 15;
        else if (diff <= 3 * 24 * 60 * 60 * 1000) score += 8;
      }
      if (task.updatedAt) {
        const updatedMs = new Date(task.updatedAt).getTime();
        if (Number.isFinite(updatedMs) && nowMs - updatedMs <= 7 * 24 * 60 * 60 * 1000) {
          score += 6;
        }
      }
      return score;
    };

    return [...tasks]
      .sort((a, b) => scoreTask(b) - scoreTask(a))
      .slice(0, 80)
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate || null,
        priority: typeof task.priority === 'number' ? task.priority : 0,
        category: task.category || '',
        tags: Array.isArray(task.tags) ? task.tags : [],
        pinned: Boolean(task.pinned),
        updatedAt: task.updatedAt || task.createdAt,
        subtaskCompleted: (task.subtasks || []).filter((subtask) => subtask.completed).length,
        subtaskTotal: task.subtasks?.length ?? 0,
        subtasks: (task.subtasks || []).map((subtask) => subtask.title).filter(Boolean).slice(0, 8),
      }));
  };

  const buildUserMemorySummaryForAgent = () => userMemories
    .filter((memory) => memory.content.trim().length > 0)
    .slice(0, 30)
    .map((memory) => ({
      id: memory.id,
      content: memory.content,
      updatedAt: memory.updatedAt,
    }));

  const addUserMemory = () => {
    const content = memoryInput.trim();
    if (!content) return;
    const nowIso = new Date().toISOString();
    setUserMemories((prev) => normalizeUserMemories([
      { id: createId(), content, createdAt: nowIso, updatedAt: nowIso },
      ...prev,
    ]));
    setMemoryInput('');
  };

  const startEditUserMemory = (memory: UserMemory) => {
    setEditingMemoryId(memory.id);
    setEditingMemoryContent(memory.content);
  };

  const saveUserMemoryEdit = () => {
    if (!editingMemoryId) return;
    const content = editingMemoryContent.trim();
    if (!content) {
      setEditingMemoryId(null);
      setEditingMemoryContent('');
      return;
    }
    const nowIso = new Date().toISOString();
    setUserMemories((prev) => normalizeUserMemories(prev.map((memory) => (
      memory.id === editingMemoryId
        ? { ...memory, content, updatedAt: nowIso }
        : memory
    ))));
    setEditingMemoryId(null);
    setEditingMemoryContent('');
  };

  const removeUserMemory = (memoryId: string) => {
    setUserMemories((prev) => prev.filter((memory) => memory.id !== memoryId));
    if (editingMemoryId === memoryId) {
      setEditingMemoryId(null);
      setEditingMemoryContent('');
    }
  };

  const handleAgentSend = async () => {
    if (agentLoading) return;
    const content = agentInput.trim();
    const imagePayload = agentImages.map((image) => image.dataUrl);
    const draftImages = [...agentImages];
    if (agentLoading || (!content && imagePayload.length === 0)) return;

    setAgentInput('');
    setAgentImages([]);
    pushLog('info', 'todo-agent 请求发送', content, { silentFeedback: true });
    setAgentLoading(true);
    const controller = new AbortController();
    agentAbortControllerRef.current = controller;
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
        signal: controller.signal,
        body: JSON.stringify({
          mode: 'todo-agent',
          input: content,
          images: imagePayload,
          tasks: buildTaskSummaryForTodoAgent(),
          memories: buildUserMemorySummaryForAgent(),
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
        : '我先对照了当前计划，已经整理好建议。';
      const nextDecisions: AgentDecision[] = Array.isArray(data?.decisions)
        ? data.decisions
            .map((decision: AgentDecision) => {
              const nextItem = decision.item
                ? {
                    ...decision.item,
                    id: decision.item.id || createId(),
                    title: decision.item.title?.trim() || 'Untitled',
                  }
                : undefined;
              return {
                ...decision,
                id: decision.id || createId(),
                taskTitle: decision.taskTitle?.trim() || undefined,
                reason: decision.reason?.trim() || undefined,
                blockedByTaskIds: Array.isArray(decision.blockedByTaskIds) ? decision.blockedByTaskIds : [],
                blockedByTaskTitles: Array.isArray(decision.blockedByTaskTitles) ? decision.blockedByTaskTitles : [],
                item: nextItem,
              };
            })
            .filter((decision: AgentDecision) => ['create', 'update', 'delete', 'reuse', 'skip', 'blocked'].includes(decision.type))
        : [];
      const createDecisionItems = nextDecisions
        .filter((decision) => decision.type === 'create' && decision.item)
        .map((decision) => decision.item as AgentItem);
      const nextItems: AgentItem[] = createDecisionItems.length > 0
        ? createDecisionItems
        : Array.isArray(data?.items)
          ? data.items.map((item: AgentItem) => ({
              ...item,
              id: item.id || createId(),
              title: item.title?.trim() || 'Untitled',
            }))
          : [];
      const nextGuidance: string[] = Array.isArray(data?.guidance)
        ? data.guidance
            .map((tip: string) => (typeof tip === 'string' ? tip.trim() : ''))
            .filter((tip: string) => tip.length > 0)
            .slice(0, 4)
        : [];
      setAgentMessages((prev) => [...prev, { role: 'assistant', content: replyText }]);
      setAgentDecisions(nextDecisions);
      setAgentItems(nextItems);
      setAgentGuidance(nextGuidance);
      setAddedAgentItemIds(new Set());
      setAppliedAgentDecisionIds(new Set());
      pushLog('success', 'todo-agent 返回成功', `新增 ${nextItems.length} 条，计划判断 ${nextDecisions.length} 条`, { silentFeedback: true });
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        if (content) setAgentInput(content);
        if (draftImages.length > 0) setAgentImages(draftImages);
        setAgentError(null);
        setAgentGuidance([]);
        pushLog('info', 'todo-agent 已停止', '已取消本次整理，你可以继续修改后再发送', { silentFeedback: true });
        return;
      }
      console.error(error);
      const message = (error as any)?.message || 'AI 助手无响应，请稍后重试';
      if (content) setAgentInput(content);
      if (draftImages.length > 0) setAgentImages(draftImages);
      setAgentError(message);
      setAgentGuidance([]);
      setAgentDecisions([]);
      setAgentItems([]);
      setAppliedAgentDecisionIds(new Set());
      // 不要添加 assistant 消息，而是让错误提示显示出来
      pushLog('error', 'todo-agent 请求失败', String(message), { silentFeedback: true });
    } finally {
      if (agentAbortControllerRef.current === controller) {
        agentAbortControllerRef.current = null;
      }
      setAgentLoading(false);
    }
  };



  const buildTaskSummaryForManageAgent = () => {
    // 仅传必要字段 + 做筛选/截断，避免 prompt 过长。
    const now = new Date();
    const todayKey = formatDateKey(now);

    const filtered = tasks.filter((t) => {
      if (manageAgentFilter === 'all') return true;
      if (manageAgentFilter === 'todo') return t.status !== 'completed';
      if (manageAgentFilter === 'today') {
        if (!t.dueDate) return false;
        const dueKey = formatZonedDate(t.dueDate, getTimezoneOffset(t));
        return dueKey === todayKey;
      }
      if (manageAgentFilter === 'overdue') {
        return t.status !== 'completed' && Boolean(t.dueDate) && isTaskOverdue(t);
      }
      return true;
    });

    // 给一个上限，避免任务很多时 token 爆炸。
    const MAX_TASKS = 120;
    const slice = filtered.slice(0, MAX_TASKS);

    return slice.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate || null,
      priority: typeof t.priority === 'number' ? t.priority : 0,
      category: t.category || '',
      tags: Array.isArray(t.tags) ? t.tags : [],
    }));
  };

  const handleManageAgentSend = async () => {
    if (manageAgentLoading) return;
    const content = manageAgentInput.trim();
    if (manageAgentLoading || !content) return;

    setManageAgentInput('');
    setManageAgentLoading(true);
    setManageAgentError(null);
    setManageAgentMessages((prev) => [...prev, { role: 'user', content }]);

    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'manage-agent',
          input: content,
          tasks: buildTaskSummaryForManageAgent(),
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
        throw new Error(data?.error || 'manage-agent request failed');
      }
      const replyText = typeof data?.reply === 'string' ? data.reply : '已生成建议。';
      setManageAgentMessages((prev) => [...prev, { role: 'assistant', content: replyText }]);
      const recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
      setManageRecommendations(
        recs.map((r: any) => {
          const task = tasks.find((t) => t.id === String(r.id || ''));
          const suggestedPriority = typeof r.suggestedPriority === 'number'
            ? r.suggestedPriority
            : (() => {
                if (!task) return 1;
                if (task.status === 'completed') return 0;
                if (task.dueDate && isTaskOverdue(task)) return 2;
                return typeof task.priority === 'number' ? task.priority : 1;
              })();
          return {
            id: String(r.id || ''),
            title: String(r.title || ''),
            reason: typeof r.reason === 'string' ? r.reason : undefined,
            suggestedPriority,
            suggestedPinned: typeof r.suggestedPinned === 'boolean' ? r.suggestedPinned : undefined,
            suggestedDuePreset: r.suggestedDuePreset === 'today' || r.suggestedDuePreset === 'tomorrow' || r.suggestedDuePreset === 'tonight' ? r.suggestedDuePreset : undefined,
          };
        }),
      );
    } catch (error) {
      const message = (error as any)?.message || 'AI 管理助手无响应，请稍后重试';
      setManageAgentInput(content);
      setManageAgentError(message);
    } finally {
      setManageAgentLoading(false);
    }
  };
  const handleAddAgentItem = (item: AgentItem, decisionId?: string) => {
    if (addedAgentItemIds.has(item.id)) return;
    const task = createTaskFromAgentItem(item);
    setAddedAgentItemIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    if (decisionId) {
      setAppliedAgentDecisionIds((prev) => {
        const next = new Set(prev);
        next.add(decisionId);
        return next;
      });
    }
    taskStore.add(task);
    refreshTasks();
    syncToPg('tasks', 'POST', task);
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
    setAppliedAgentDecisionIds((prev) => {
      const next = new Set(prev);
      agentDecisions
        .filter((decision) => decision.type === 'create' && decision.item && pendingItems.some((item) => item.id === decision.item?.id))
        .forEach((decision) => next.add(decision.id));
      return next;
    });
    newTasks.forEach((task) => {
      taskStore.add(task);
      syncToPg('tasks', 'POST', task);
    });
    refreshTasks();
  };

  const handleApplyAgentDecision = (decision: AgentDecision) => {
    if (appliedAgentDecisionIds.has(decision.id)) return;

    if (decision.type === 'create' && decision.item) {
      handleAddAgentItem(decision.item, decision.id);
      return;
    }

    if (!decision.taskId) return;
    const target = taskStore.getAll().find((task) => task.id === decision.taskId);
    if (!target) return;

    if (decision.type === 'update') {
      updateTask(applyAgentTaskChanges(target, decision.changes));
      setAppliedAgentDecisionIds((prev) => {
        const next = new Set(prev);
        next.add(decision.id);
        return next;
      });
      return;
    }

    if (decision.type === 'delete') {
      snapshotTasksForUndo(`恢复任务：${target.title}`);
      removeTask(target.id);
      setAppliedAgentDecisionIds((prev) => {
        const next = new Set(prev);
        next.add(decision.id);
        return next;
      });
    }
  };

  const createHabitAndCheckTaskFromAgentItem = (item: HabitAgentItem) => {
    const nowIso = new Date().toISOString();
    const habit: Habit = {
      id: createId(),
      title: item.title?.trim() || '未命名习惯',
      createdAt: nowIso,
      updatedAt: nowIso,
      logs: [],
    };

    const category = item.category && CATEGORY_OPTIONS.includes(item.category)
      ? item.category
      : classifyCategory(habit.title);
    const priority = typeof item.priority === 'number'
      ? item.priority
      : evaluatePriority(item.checkInDueDate, 0, Date.now());
    const dueDate = item.checkInDueDate || undefined;
    const reminderAt = dueDate
      ? buildReminderAt(dueDate, DEFAULT_TIMEZONE_OFFSET, 'custom', dueDate)
      : undefined;
    const reasonTag = item.reason ? item.reason.replace(/\s+/g, '').slice(0, 8) : '';
    const frequencyTag = item.frequency ? item.frequency.replace(/\s+/g, '').slice(0, 8) : '';
    const tags = ['习惯打卡', reasonTag, frequencyTag].filter(Boolean);
    const repeat = parseHabitFrequencyToRepeat(item.frequency, dueDate);

    const task: Task = {
      id: createId(),
      title: `检查打卡：${habit.title}`,
      dueDate,
      timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
      priority,
      category,
      status: 'todo',
      tags,
      subtasks: [],
      pinned: false,
      reminderPreset: dueDate ? 'custom' : 'none',
      reminderAt,
      repeat,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { habit, task };
  };

  const handleHabitAgentSend = async () => {
    const content = habitAgentInput.trim();
    if (!content || habitAgentLoading) return;
    if (!apiKey.trim()) {
      createHabit(content);
      setHabitAgentInput('');
      setHabitAgentError(null);
      pushLog('info', 'habit-agent 自动降级', '未配置 AI Key，已直接创建习惯');
      return;
    }

    setHabitAgentLoading(true);
    pushLog('info', 'habit-agent 请求发送', content, { silentFeedback: true });
    try {
      setHabitAgentError(null);
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'habit-agent',
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
        throw new Error(data?.error || 'habit-agent request failed');
      }
      const nextItems: HabitAgentItem[] = Array.isArray(data?.items)
        ? data.items.map((item: HabitAgentItem) => ({
            ...item,
            id: item.id || createId(),
            title: item.title?.trim() || '未命名习惯',
          }))
        : [];
      setHabitAgentItems(nextItems);
      setAddedHabitAgentItemIds(new Set());
      setHabitAgentInput('');
      pushLog('success', 'habit-agent 返回成功', `建议习惯 ${nextItems.length} 条`, { silentFeedback: true });
    } catch (error) {
      const message = (error as any)?.message || '习惯助手无响应，请稍后重试';
      setHabitAgentError(message);
      pushLog('error', 'habit-agent 请求失败', String(message), { silentFeedback: true });
    } finally {
      setHabitAgentLoading(false);
    }
  };

  const handleAddHabitAgentItem = (item: HabitAgentItem) => {
    if (addedHabitAgentItemIds.has(item.id)) return;
    const { habit, task } = createHabitAndCheckTaskFromAgentItem(item);
    setAddedHabitAgentItemIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    habitStore.add(habit);
    taskStore.add(task);
    refreshHabits();
    refreshTasks();
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
    pushLog('info', 'countdown-agent 请求发送', content, { silentFeedback: true });
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
      pushLog('success', 'countdown-agent 返回成功', `建议倒数日 ${nextItems.length} 条`, { silentFeedback: true });
    } catch (error) {
      console.error(error);
      const message = (error as any)?.message || '倒数日助手无响应，请稍后重试';
      setCountdownAgentError(message);
      setCountdownAgentMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '我这边没连上服务，稍后再试试？' },
      ]);
      pushLog('error', 'countdown-agent 请求失败', String(message), { silentFeedback: true });
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


  const buildExportPayload = () => buildExportPayloadData({
    appVersion: APP_VERSION,
    tasks: taskStore.getAll(),
    habits: habitStore.getAll(),
    countdowns: countdownStore.getAll(),
    items: itemStore.getAll(),
    deletedTasks: readDeletedMap(DELETED_TASKS_KEY),
    deletedCountdowns: readDeletedMap(DELETED_COUNTDOWNS_KEY),
    deletedHabits: readDeletedMap(DELETED_HABITS_KEY),
    deletedItems: readDeletedMap(DELETED_ITEMS_KEY),
  });

  const buildSyncPayload = () => buildSyncPayloadData({
    appVersion: APP_VERSION,
    tasks: taskStore.getAll(),
    habits: habitStore.getAll(),
    countdowns: countdownStore.getAll(),
    items: itemStore.getAll(),
    deletedTasks: readDeletedMap(DELETED_TASKS_KEY),
    deletedCountdowns: readDeletedMap(DELETED_COUNTDOWNS_KEY),
    deletedHabits: readDeletedMap(DELETED_HABITS_KEY),
    deletedItems: readDeletedMap(DELETED_ITEMS_KEY),
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
      userMemories,
    },
    secrets: {
      apiKey,
      pgPassword,
      redisPassword,
    },
  });

  const applySyncedSettings = (payload: any) => {
    const {
      nextApiBaseUrl,
      nextModelListText,
      nextChatModel,
      nextFallback,
      nextAutoSyncEnabled,
      nextAutoSyncInterval,
      nextCountdownDisplayMode,
      nextAiRetentionDays,
      nextApiKey,
      nextPgHost,
      nextPgPort,
      nextPgDatabase,
      nextPgUsername,
      nextPgPassword,
      nextRedisHost,
      nextRedisPort,
      nextRedisDb,
      nextRedisPassword,
      nextCalendarSubscription,
      nextSyncNamespace,
    } = resolveSyncedSettings({
      payload,
      current: {
        apiBaseUrl,
        modelListText,
        chatModel,
        fallbackTimeoutSec,
        autoSyncEnabled,
        autoSyncInterval,
        countdownDisplayMode,
        aiRetentionDays,
        apiKey,
        pgHost,
        pgPort,
        pgDatabase,
        pgUsername,
        pgPassword,
        redisHost,
        redisPort,
        redisDb,
        redisPassword,
        calendarSubscription,
        syncNamespace,
      },
      defaults: {
        defaultApiBaseUrl: DEFAULT_BASE_URL,
        defaultModelListText: DEFAULT_MODEL_LIST.join('\n'),
        defaultChatModel: DEFAULT_MODEL_LIST[0],
        defaultFallbackTimeoutSec: DEFAULT_FALLBACK_TIMEOUT_SEC,
        defaultAutoSyncIntervalMin: DEFAULT_AUTO_SYNC_INTERVAL_MIN,
      },
    });

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
    if (Array.isArray(payload?.settings?.userMemories)) {
      setUserMemories(normalizeUserMemories(payload.settings.userMemories));
    }

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
      countdownDisplayMode: nextCountdownDisplayMode as CountdownDisplayMode,
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
      themePreference,
      accentTheme,
      gradientTheme,
    });
  };

  const handleWebdavSync = async (action: 'push' | 'pull' | 'sync', options?: { silent?: boolean }) => {
    await syncManager.handleSync(action, options);
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

  const applyImportedData = (payload: any, mode: 'merge' | 'overwrite' = importMode) => {
    const tasksImport = ensureUpdatedAt(normalizeImportList<Task>(payload?.data?.tasks ?? payload?.tasks));
    const habitsImport = ensureUpdatedAt(normalizeImportList<Habit>(payload?.data?.habits ?? payload?.habits));
    const countdownsImport = ensureUpdatedAt(normalizeImportList<Countdown>(payload?.data?.countdowns ?? payload?.countdowns));
    const itemsImport = ensureUpdatedAt(normalizeImportList<Item>(payload?.data?.items ?? payload?.items));
    const currentTasks = ensureUpdatedAt(taskStore.getAll());
    const currentHabits = ensureUpdatedAt(habitStore.getAll());
    const currentCountdowns = ensureUpdatedAt(countdownStore.getAll());
    const currentItems = ensureUpdatedAt(itemStore.getAll());

    const nextTasks = mode === 'overwrite'
      ? tasksImport
      : mergeById(currentTasks, tasksImport);
    const nextHabits = mode === 'overwrite'
      ? habitsImport
      : mergeById(currentHabits, habitsImport);
    const nextCountdowns = mode === 'overwrite'
      ? countdownsImport
      : mergeById(currentCountdowns, countdownsImport);
    const nextItems = mode === 'overwrite'
      ? itemsImport
      : mergeById(currentItems, itemsImport);

    // Deletions: Tasks
    const localDeletedTasks = readDeletedMap(DELETED_TASKS_KEY);
    const incomingDeletedTasks = normalizeDeletedMap(
      payload?.deletions?.tasks ?? payload?.deletedTasks,
    );
    const mergedDeletedTasks = mergeDeletedMap(localDeletedTasks, incomingDeletedTasks);
    const { filtered: filteredTasks, nextDeleted: nextDeletedTasks } =
      filterByDeletions(nextTasks, mergedDeletedTasks);

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

    // Deletions: Items
    const localDeletedItems = readDeletedMap(DELETED_ITEMS_KEY);
    const incomingDeletedItems = normalizeDeletedMap(
      payload?.deletions?.items ?? payload?.deletedItems,
    );
    const mergedDeletedItems = mergeDeletedMap(localDeletedItems, incomingDeletedItems);
    const { filtered: filteredItems, nextDeleted: nextDeletedItems } =
      filterByDeletions(nextItems, mergedDeletedItems);

    taskStore.replaceAll(filteredTasks);
    habitStore.replaceAll(filteredHabits);
    countdownStore.replaceAll(filteredCountdowns);
    itemStore.replaceAll(filteredItems);
    
    persistDeletedMap(DELETED_TASKS_KEY, nextDeletedTasks);
    persistDeletedMap(DELETED_COUNTDOWNS_KEY, nextDeletedCountdowns);
    persistDeletedMap(DELETED_HABITS_KEY, nextDeletedHabits);
    persistDeletedMap(DELETED_ITEMS_KEY, nextDeletedItems);

    setTasks(filteredTasks);
    setHabits(filteredHabits);
    setCountdowns(filteredCountdowns);
    setItems(filteredItems);

    const nextCategories = Array.from(new Set(filteredTasks.map((task) => task.category).filter(Boolean))) as string[];
    const nextTags = Array.from(new Set(filteredTasks.flatMap((task) => task.tags || [])));
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

  const createLocalTaskFromInput = useCallback(async (raw: string, overrideCategory?: string | null) => {
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
      pinned: false,
      subtasks: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    taskStore.add(task);
    refreshTasks();
    
    // 异步同步到 PG
    syncToPg('tasks', 'POST', task);

    setInput('');
  }, [refreshTasks, syncToPg]);

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
          pinned: Boolean(data.task?.pinned),
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

  const toggleTaskPinned = (task: Task) => {
    updateTask({ ...task, pinned: !task.pinned });
  };

  const formatTaskContent = (task: Task) => {
    const lines = [task.title];
    if (task.subtasks?.length) {
      lines.push(...task.subtasks.map((subtask) => `- ${subtask.completed ? '[x]' : '[ ]'} ${subtask.title}`));
    }
    return lines.join('\n');
  };

  const copyTaskTitle = async (task: Task) => {
    try {
      await navigator.clipboard.writeText(task.title);
    } catch (error) {
      console.error('Failed to copy title', error);
    }
  };

  const copyTaskContent = useCallback(async (task: Task) => {
    try {
      await navigator.clipboard.writeText(formatTaskContent(task));
    } catch (error) {
      console.error('Failed to copy content', error);
    }
  }, []);

  const isEditableShortcutTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  };

  const toggleTaskSelected = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev as Set<string>);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const clearBatchSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const exitBatchMode = () => {
    setIsBatchMode(false);
    clearBatchSelection();
  };

  const batchCompleteTasks = () => {
    const ids = Array.from(selectedTaskIds as Set<string>);
    if (ids.length === 0) return;
    ids.forEach((id) => toggleStatus(id));
    exitBatchMode();
  };

  const batchDeleteTasks = () => {
    const ids = Array.from(selectedTaskIds as Set<string>);
    if (ids.length === 0) return;
    ids.forEach((id) => removeTask(id));
    exitBatchMode();
  };

  const updateTaskDueDate = (taskId: string, dueDate?: string, timezoneOffset?: number) => {
    const target = taskStore.getAll().find((task) => task.id === taskId);
    if (!target) return;
    const nextTimezoneOffset = timezoneOffset ?? target.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
    const nextReminderPreset = dueDate ? (target.reminderPreset ?? '9am') : 'none';
    const nextReminderAt = buildReminderAt(dueDate, nextTimezoneOffset, nextReminderPreset, target.reminderAt);
    updateTask({
      ...target,
      dueDate,
      timezoneOffset: nextTimezoneOffset,
      reminderPreset: nextReminderPreset,
      reminderAt: nextReminderAt,
      updatedAt: new Date().toISOString(),
    });
  };

  const quickSetPriority = (taskId: string, priority: number) => {
    const target = taskStore.getAll().find((task) => task.id === taskId);
    if (!target) return;
    updateTask({ ...target, priority, updatedAt: new Date().toISOString() });
  };

  const quickSetDuePreset = (taskId: string, preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => {
    const target = taskStore.getAll().find((task) => task.id === taskId);
    if (!target) return;
    const timezoneOffset = target.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
    const baseNow = new Date();
    const nextWeekMonday = (() => {
      const zonedNow = new Date(baseNow.getTime() + timezoneOffset * 60 * 1000);
      const day = zonedNow.getUTCDay();
      const daysUntilNextMonday = day === 0 ? 8 : 8 - day;
      return new Date(baseNow.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);
    })();
    const dateText =
      preset === 'tomorrow'
        ? formatDateKeyByOffset(new Date(baseNow.getTime() + 24 * 60 * 60 * 1000), timezoneOffset)
        : preset === 'nextWeek'
          ? formatDateKeyByOffset(nextWeekMonday, timezoneOffset)
          : formatDateKeyByOffset(baseNow, timezoneOffset);
    const timeText = preset === 'tonight' ? '20:00' : '09:00';
    const dueDate = buildDueDateIso(dateText, timeText, timezoneOffset);
    const reminderPreset: 'none' | '9am' | 'custom' = preset === 'tonight' ? 'custom' : '9am';
    const reminderAt = buildReminderAt(dueDate, timezoneOffset, reminderPreset, dueDate);
    updateTask({
      ...target,
      dueDate,
      timezoneOffset,
      reminderPreset,
      reminderAt,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleQuadrantExpanded = (quadrantKey: string) => {
    setExpandedQuadrants((prev) => ({
      ...prev,
      [quadrantKey]: !prev[quadrantKey],
    }));
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
    const removedTask = taskStore.getAll().find((task) => task.id === taskId);
    taskStore.remove(taskId);
    markDeleted(DELETED_TASKS_KEY, taskId);
    refreshTasks();
    setLastRemovedTask(removedTask ?? null);
    
    // 异步同步到 PG
    syncToPg('tasks', 'DELETE', { id: taskId });

    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const restoreLastRemovedTask = useCallback(() => {
    if (!lastRemovedTask) return;
    const restoredTask = { ...lastRemovedTask, updatedAt: new Date().toISOString() };
    const deletedMap = readDeletedMap(DELETED_TASKS_KEY);
    if (deletedMap[restoredTask.id]) {
      const nextDeletedMap = { ...deletedMap };
      delete nextDeletedMap[restoredTask.id];
      persistDeletedMap(DELETED_TASKS_KEY, nextDeletedMap);
    }
    taskStore.add(restoredTask);
    refreshTasks();
    syncToPg('tasks', 'POST', restoredTask);
    setSelectedTask(restoredTask);
    setLastRemovedTask(null);
  }, [lastRemovedTask, refreshTasks, syncToPg]);

  useEffect(() => {
    const handleGlobalKeydown = async (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      const editable = isEditableShortcutTarget(event.target);

      if (event.key === 'Escape') {
        if (editingTaskId) {
          setEditingTaskId(null);
          setEditingTaskTitle('');
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (showLogs) {
          setShowLogs(false);
          return;
        }
        if (selectedTask) {
          setSelectedTask(null);
          return;
        }
      }

      if (!modifier) return;

      const key = event.key.toLowerCase();

      if (key === 'c' && selectedTask && !editable) {
        event.preventDefault();
        await copyTaskContent(selectedTask);
        return;
      }

      if (key === 'v' && !editable) {
        event.preventDefault();
        try {
          const text = await navigator.clipboard.readText();
          if (text.trim()) {
            await createLocalTaskFromInput(text.trim(), activeFilter === 'category' ? activeCategory : null);
          }
        } catch (error) {
          console.error('Failed to paste task from clipboard', error);
        }
        return;
      }

      if (key === 'z' && !editable) {
        event.preventDefault();
        if (lastRemovedTask) {
          restoreLastRemovedTask();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [
    activeCategory,
    activeFilter,
    copyTaskContent,
    createLocalTaskFromInput,
    editingTaskId,
    lastRemovedTask,
    restoreLastRemovedTask,
    selectedTask,
    showLogs,
    showSettings,
  ]);

  const clearCompletedTasks = () => {
    snapshotTasksForUndo('恢复已清除的已完成任务');
    const completedIds = taskStore.getAll().filter((task) => task.status === 'completed').map((task) => task.id);
    completedIds.forEach((taskId) => markDeleted(DELETED_TASKS_KEY, taskId));
    const remaining = taskStore.getAll().filter((task) => task.status !== 'completed');
    taskStore.replaceAll(remaining);
    setTasks(remaining);
    if (selectedTask?.status === 'completed') {
      setSelectedTask(null);
    }
    completedIds.forEach((taskId) => syncToPg('tasks', 'DELETE', { id: taskId }));
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
        const itemIdTag = (target.tags || []).find((tag) => tag.startsWith('item:'));
        const itemActionTag = (target.tags || []).find((tag) => tag.startsWith('item-action:'));
        if (itemIdTag && itemActionTag) {
          const itemId = itemIdTag.slice('item:'.length);
          const itemAction = itemActionTag.slice('item-action:'.length);
          const linkedItem = itemStore.getAll().find((entry) => entry.id === itemId);
          if (linkedItem) {
            const statusLabelMap: Record<Item['status'], string> = {
              normal: '正常',
              low_stock: '库存低',
              need_restock: '待补货',
              missing: '缺失',
            };
            const nextItem = applyCompletedItemAction(linkedItem, itemAction);
            itemStore.update({
              ...linkedItem,
              quantity: nextItem.quantity,
              status: nextItem.status,
              updatedAt: new Date().toISOString(),
            });
            refreshItems();
            pushLog(
              'success',
              '已同步物品状态',
              `${linkedItem.name}：${statusLabelMap[linkedItem.status]} → ${statusLabelMap[nextItem.status]}，数量 ${linkedItem.quantity} → ${nextItem.quantity}`,
            );
          }
        }
        const nextDate = getNextRepeatDate(target);
        if (nextDate) {
          nextTask = {
            ...target,
            id: createId(),
            status: 'todo',
            pinned: false,
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
    requestAnimationFrame(() => {
      subtaskQuickInputRef.current?.focus();
    });
  };

  const focusSubtaskQuickInput = () => {
    requestAnimationFrame(() => {
      subtaskQuickInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      subtaskQuickInputRef.current?.focus();
    });
  };

  const isTypingTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    const tagName = element.tagName;
    return element.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
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
      summary: '先救火，优先清掉会立刻产生影响的事项。',
      tone: 'text-red-200 bg-red-500/10 border-red-500/20',
      items: quadrantSourceTasks.filter((task) => isImportantTask(task) && isUrgentTask(task)),
    },
    {
      key: 'important-not-urgent',
      title: '重要不紧急',
      description: '高优先级 & 可规划',
      summary: '这里最值得排进日程，是长期价值区。',
      tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20',
      items: quadrantSourceTasks.filter((task) => isImportantTask(task) && !isUrgentTask(task)),
    },
    {
      key: 'not-important-urgent',
      title: '紧急不重要',
      description: '低优先级 & 需处理',
      summary: '能快处理就别堆着，避免它们持续打断主线。',
      tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20',
      items: quadrantSourceTasks.filter((task) => !isImportantTask(task) && isUrgentTask(task)),
    },
    {
      key: 'not-important-not-urgent',
      title: '不重要不紧急',
      description: '低优先级 & 可搁置',
      summary: '保留观察，必要时再清理、归档或延后。',
      tone: 'text-sky-200 bg-sky-500/10 border-sky-500/20',
      items: quadrantSourceTasks.filter((task) => !isImportantTask(task) && !isUrgentTask(task)),
    },
  ];
  const quadrantTaskCount = quadrantSourceTasks.length;
  const quadrantImportantCount = quadrantGroups[0].items.length + quadrantGroups[1].items.length;
  const quadrantUrgentCount = quadrantGroups[0].items.length + quadrantGroups[2].items.length;
  const quadrantFocusGroup = [...quadrantGroups].sort((a, b) => b.items.length - a.items.length)[0];

  const moveTaskToQuadrant = (taskId: string, quadrantKey: string) => {
    const target = taskStore.getAll().find((task) => task.id === taskId);
    if (!target) return;

    const nextPriority = quadrantKey === 'important-urgent' || quadrantKey === 'important-not-urgent' ? 2 : 0;
    const timezoneOffset = target.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
    let nextDueDate = target.dueDate;

    if (quadrantKey === 'important-urgent' || quadrantKey === 'not-important-urgent') {
      if (!nextDueDate || !isUrgentTask(target)) {
        nextDueDate = buildDueDateIso(formatDateKeyByOffset(new Date(), timezoneOffset), '18:00', timezoneOffset);
      }
    } else if (quadrantKey === 'important-not-urgent' || quadrantKey === 'not-important-not-urgent') {
      if (nextDueDate && isUrgentTask(target)) {
        nextDueDate = undefined;
      }
    }

    updateTask({
      ...target,
      priority: nextPriority,
      dueDate: nextDueDate,
      timezoneOffset,
      updatedAt: new Date().toISOString(),
    });
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
  const weatherSummary = getWeatherSummary(weatherForecast?.weatherCode);
  const SelectedWeatherIcon = weatherSummary.Icon;
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
  const nowHour = nowZoned.getUTCHours();
  const nowMinutes = nowHour * 60 + nowZoned.getUTCMinutes();

  const hoursWithTasks = dayTasksByHour
    .map((bucket, hour) => (bucket.length > 0 ? hour : -1))
    .filter((hour) => hour >= 0);

  const defaultStartHour = 8;
  const defaultEndHour = 22;

  let visibleStartHour = hoursWithTasks.length > 0
    ? Math.max(0, Math.min(...hoursWithTasks) - 1)
    : defaultStartHour;
  let visibleEndHour = hoursWithTasks.length > 0
    ? Math.min(23, Math.max(...hoursWithTasks) + 1)
    : defaultEndHour;

  if (showNowLine) {
    visibleStartHour = Math.min(visibleStartHour, Math.max(0, nowHour - 1));
    visibleEndHour = Math.max(visibleEndHour, Math.min(23, nowHour + 1));
  }

  const minimumWindowHours = 8;
  const currentWindowHours = visibleEndHour - visibleStartHour + 1;
  if (currentWindowHours < minimumWindowHours) {
    const deficit = minimumWindowHours - currentWindowHours;
    const expandBefore = Math.floor(deficit / 2);
    const expandAfter = deficit - expandBefore;
    visibleStartHour = Math.max(0, visibleStartHour - expandBefore);
    visibleEndHour = Math.min(23, visibleEndHour + expandAfter);
    if (visibleEndHour - visibleStartHour + 1 < minimumWindowHours) {
      if (visibleStartHour === 0) {
        visibleEndHour = Math.min(23, minimumWindowHours - 1);
      } else if (visibleEndHour === 23) {
        visibleStartHour = Math.max(0, 24 - minimumWindowHours);
      }
    }
  }

  const dayVisibleHours = Array.from(
    { length: visibleEndHour - visibleStartHour + 1 },
    (_, idx) => visibleStartHour + idx,
  );

  const nowLineTop = ((nowMinutes - visibleStartHour * 60) / 60) * dayRowHeight;
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
    : activeFilter === 'timeline'
    ? '时间轴'
    : activeFilter === 'review'
    ? '检查'
    : activeFilter === 'items'
    ? '物品管理'
    : (FILTER_LABELS[activeFilter] ?? '待办');
  const headerSubtitle = activeFilter === 'timeline'
    ? '按时间回顾任务进展，查看完成、未完成和逾期事项'
    : activeFilter === 'calendar'
    ? '按日期查看任务安排，支持周视图、月视图和日程视图'
    : activeFilter === 'review'
    ? '按检查视角逐项回看任务，先处理该决定、该改期、该完成的事'
    : activeFilter === 'quadrant'
    ? '按轻重缓急拆分任务，先做真正重要的事'
    : activeFilter === 'countdown'
    ? '把重要日子放在眼前，提醒自己持续推进'
    : activeFilter === 'habit'
    ? '追踪长期习惯，把重复的小事慢慢养成'
    : activeFilter === 'items'
    ? '记录物品位置、库存状态和补货提醒'
    : activeFilter === 'pomodoro'
    ? '用专注与休息节奏推进当前任务'
    : activeFilter === 'agent'
    ? ''
    : activeFilter === 'completed'
    ? '查看已经完成的事项，顺手清理历史任务'
    : activeFilter === 'category'
    ? '按列表查看当前任务，聚焦同一类事情'
    : activeFilter === 'tag'
    ? '按标签聚合同类任务，方便快速筛选和处理'
    : '集中处理当前任务，减少拖延，往前推进';
  const isListView = !['pomodoro', 'calendar', 'countdown', 'quadrant', 'habit', 'agent', 'review', 'items'].includes(activeFilter);
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
  const agentCreateDecisions = agentDecisions.filter((decision) => decision.type === 'create' && decision.item);
  const agentUpdateDecisions = agentDecisions.filter((decision) => decision.type === 'update');
  const agentDeleteDecisions = agentDecisions.filter((decision) => decision.type === 'delete');
  const agentReuseDecisions = agentDecisions.filter((decision) => decision.type === 'reuse');
  const agentSkipDecisions = agentDecisions.filter((decision) => decision.type === 'skip');
  const agentBlockedDecisions = agentDecisions.filter((decision) => decision.type === 'blocked');
  const createDecisionReasonMap = new Map(
    agentCreateDecisions
      .filter((decision) => decision.item?.id)
      .map((decision) => [decision.item!.id, decision.reason] as const),
  );
  const createDecisionIdMap = new Map(
    agentCreateDecisions
      .filter((decision) => decision.item?.id)
      .map((decision) => [decision.item!.id, decision.id] as const),
  );
  const showAgentBulkAdd = agentItems.length > 1
    || agentItems.some((item) => (item.subtasks?.length ?? 0) > 0);
  const showCountdownAgentBulkAdd = countdownAgentItems.length > 1;
  const hasApiKey = apiKey.trim().length > 0;

  return (
    <div className="theme-native-root theme-native-surface flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-[var(--ui-surface-0)] font-sans text-[color:var(--ui-text-primary)] relative safe-area-top">
      <AmbientBackdrop />

      {statusFeedback && (
        <div className="fixed top-[calc(0.7rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,720px)] px-2 sm:px-0">
          <div className={`status-feedback motion-modal-surface px-3 py-2.5 sm:px-4 sm:py-3 ${
            statusFeedback.level === 'error'
              ? 'status-feedback-error'
              : statusFeedback.level === 'warning'
                ? 'status-feedback-warning'
                : statusFeedback.level === 'success'
                  ? 'status-feedback-success'
                  : 'status-feedback-info'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {statusFeedback.level === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : statusFeedback.level === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : statusFeedback.level === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Info className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[color:var(--ui-text-strong)]">{statusFeedback.message}</div>
                {statusFeedback.detail && (
                  <div className="mt-0.5 text-xs text-[color:var(--ui-text-primary)]">{statusFeedback.detail}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLogs(true)}
                  className="ui-chip text-[11px] rounded-md px-2 py-1 ui-state-hover ui-state-press"
                >
                  查看日志
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFeedback(null)}
                  className="rounded-md p-1 text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] ui-state-hover ui-state-press"
                  aria-label="关闭状态提示"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isQuickAccessOpen={isQuickAccessOpen}
        setIsQuickAccessOpen={setIsQuickAccessOpen}
        isToolsOpen={isToolsOpen}
        setIsToolsOpen={setIsToolsOpen}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        refreshTasks={refreshTasks}
        refreshCountdowns={refreshCountdowns}
        refreshHabits={refreshHabits}
        tasks={tasks}
        agentItems={agentItems}
        hasCalendarTasks={hasCalendarTasks}
        countdowns={countdowns}
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
        className={`theme-native-surface relative flex-1 flex-col min-w-0 overflow-y-auto mobile-scroll bg-[linear-gradient(180deg,var(--ui-surface-0),var(--ui-surface-1),var(--ui-surface-0))] transition-[margin,width,filter] duration-[var(--motion-base)] ease-[var(--ease-standard)] lg:ml-0 lg:w-auto ${
          isSidebarOpen ? 'ml-[min(74vw,280px)] w-[calc(100%_-_min(74vw,_280px))]' : ''
        } ${
          selectedTask ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* 顶部栏组件：统一管理页面入口按钮与状态动作。 */}
        <PageTopBar
          activeFilter={activeFilter}
          headerTitle={headerTitle}
          headerSubtitle={headerSubtitle}
          isListView={isListView}
          isBatchMode={isBatchMode}
          completedTasks={completedTasks}
          isSyncingNow={isSyncingNow}
          themePreference={themePreference}
          onOpenSidebar={() => setIsSidebarOpen((previous) => !previous)}
          onToggleBatchMode={() => {
            if (isBatchMode) {
              exitBatchMode();
            } else {
              setIsBatchMode(true);
            }
          }}
          onSync={() => handleWebdavSync('sync')}
          onClearCompleted={() => setShowClearCompletedConfirm(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAbout={() => setShowAbout(true)}
          onOpenLogs={() => setShowLogs(true)}
          onToggleTheme={handleThemeToggle}
        />

        {/* 列表工具组件：聚合输入框、批量操作、排序和分组选项。 */}
        {isListView && (
          <ListComposerPanel
            totalTasks={totalTasks}
            completionRate={completionRate}
            procrastinationIndex={procrastinationIndex}
            loading={loading}
            input={input}
            isBatchMode={isBatchMode}
            selectedCount={selectedTaskIds.size}
            taskSortMode={taskSortMode}
            taskGroupMode={taskGroupMode}
            sortOptions={TASK_SORT_OPTIONS}
            groupOptions={TASK_GROUP_OPTIONS}
            showQuickAdd={activeFilter !== 'completed'}
            setInput={setInput}
            onMagicSubmit={handleMagicInput}
            onBatchComplete={batchCompleteTasks}
            onBatchDelete={batchDeleteTasks}
            onBatchClear={clearBatchSelection}
            onTaskSortModeChange={(mode) => setTaskSortMode(mode as TaskSortMode)}
            onTaskGroupModeChange={(mode) => setTaskGroupMode(mode as TaskGroupMode)}
          />
        )}

        <div className={`relative flex-1 w-full max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-7 xl:px-8 2xl:px-10 ${
          activeFilter === 'agent'
            ? 'pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4'
            : 'pb-[calc(2.25rem+env(safe-area-inset-bottom))] sm:pb-10'
        } ${
          activeFilter === 'agent'
            ? 'pt-2 sm:pt-3'
            : ['calendar', 'quadrant', 'countdown', 'habit', 'pomodoro', 'items'].includes(activeFilter)
              ? 'pt-5 sm:pt-6'
              : 'pt-4 sm:pt-5'
        }`}>
          {activeFilter === 'calendar' ? (
            <div className="stack-gap flex flex-col">
              <CalendarTopPanel
                calendarView={calendarView}
                showCompletedInCalendar={showCompletedInCalendar}
                calendarCityInput={calendarCityInput}
                isSearchingWeatherCity={isSearchingWeatherCity}
                weatherCities={weatherCities}
                weatherCitySearchMessage={weatherCitySearchMessage}
                selectedCalendarLabel={selectedCalendarLabel}
                cityLabel={calendarCity ? [calendarCity.name, calendarCity.admin1, calendarCity.country].filter(Boolean).join(' · ') : '请先搜索并选择城市'}
                weatherLoading={weatherLoading}
                weatherSummaryLabel={calendarCity ? (weatherForecast?.weatherText || weatherSummary.label) : '请先选择城市'}
                weatherTemperatureText={calendarCity && typeof weatherForecast?.tempMin === 'number' && typeof weatherForecast?.tempMax === 'number' ? `${Math.round(weatherForecast.tempMin)}° ~ ${Math.round(weatherForecast.tempMax)}°` : '--'}
                weatherHintText={weatherForecastHint}
                weatherIcon={<SelectedWeatherIcon className="w-5 h-5 text-blue-300" />}
                onViewChange={(view) => {
                  setCalendarView(view);
                  setWeatherCities([]);
                  setWeatherCitySearchMessage('');
                  setWeatherLocateError('');
                }}
                onToggleCompleted={() => setShowCompletedInCalendar((prev) => !prev)}
                locateErrorMessage={weatherLocateError}
                onLocateCity={handleLocateWeatherCity}
                onRetryLocate={handleLocateWeatherCity}
                onCityInputFocus={() => {
                  const keyword = calendarCityInput.trim();
                  // 聚焦但没有有效输入时，确保候选/提示不残留。
                  if (keyword.length < 2) {
                    setWeatherCities([]);
                    setWeatherCitySearchMessage('');
                    setIsSearchingWeatherCity(false);
                  }
                }}
                onCityInputBlur={() => {
                  const normalizeCityText = (value: string) =>
                    value
                      .toLowerCase()
                      .replace(/\s+/g, '')
                      .replace(/[·•\-_,，。]/g, '');

                  const keyword = calendarCityInput.trim();
                  const selectedLabel = calendarCity
                    ? [calendarCity.name, calendarCity.admin1, calendarCity.country]
                        .filter(Boolean)
                        .join(' · ')
                    : '';

                  // 失焦时不保留“无结果/不可用”提示，避免遮挡或误导。
                  // 如果当前输入本身就是已选城市，也应确保候选框完全关闭。
                  if (
                    keyword.length < 2 ||
                    (selectedLabel && normalizeCityText(keyword) === normalizeCityText(selectedLabel))
                  ) {
                    setWeatherCities([]);
                    setWeatherCitySearchMessage('');
                    setIsSearchingWeatherCity(false);
                  }
                }}
                onCityInputChange={(value) => {
                  setCalendarCityInput(value);
                  // 当用户开始编辑城市关键词时，清空当前已选城市，避免输入框/候选列表/天气卡片三者状态不一致。
                  if (calendarCity) {
                    const normalizeCityText = (text: string) =>
                      text
                        .toLowerCase()
                        .replace(/\s+/g, '')
                        .replace(/[·•\-_,，。]/g, '');

                    const selectedLabel = [calendarCity.name, calendarCity.admin1, calendarCity.country].filter(Boolean).join(' · ');
                    if (normalizeCityText(value.trim()) !== normalizeCityText(selectedLabel)) {
                      setCalendarCity(null);
                      setWeatherForecast(null);
                      setWeatherLoading(false);
                      setWeatherForecastHint('');
                      setWeatherCities([]);
                      setWeatherCitySearchMessage('');
                      setIsSearchingWeatherCity(false);
                    }
                  }
                }}
                onSelectCity={(city) => {
                  setCalendarCity(city);
                  setCalendarCityInput([city.name, city.admin1, city.country].filter(Boolean).join(' · '));
                  // 先进入 loading，避免旧的天气状态在下一次 effect 触发前短暂残留。
                  setWeatherForecast(null);
                  setWeatherLoading(true);
                  setWeatherForecastHint('');
                  setWeatherLocateError('');
                  setWeatherCities([]);
                  setWeatherCitySearchMessage('');
                }}
              />

              {calendarView === 'week' ? (
                <div className="glass-panel rounded-[28px] p-4 sm:p-5 space-y-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {weekDays.map((day, index) => {
                      const dayTasks = tasksByDate[day.dateKey] || [];
                      const sortedTasks = [...dayTasks].sort((a, b) => {
                        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                        return aTime - bTime;
                      });
                      const isToday = day.dateKey === todayKey;
                      return (
                        <div
                          key={day.dateKey}
                          className={`rounded-[24px] p-3.5 space-y-3.5 border ${
                            isToday
                              ? 'bg-blue-500/10 border-blue-400/45 shadow-[0_12px_28px_rgba(59,130,246,0.14)]'
                              : 'glass-panel-soft border-[#3A3F4B]/45'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className={`text-sm font-semibold ${isToday ? 'text-blue-100' : 'text-[#DDDDDD]'}`}>{day.label}</div>
                              <div className={`text-[11px] ${isToday ? 'text-blue-200/80' : 'text-[#777777]'}`}>周{weekdayLabels[index]}</div>
                            </div>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/18 border border-blue-400/35 text-[10px] text-blue-100">今天</span>
                            )}
                          </div>
                          {sortedTasks.length === 0 ? (
                            <div className="text-xs text-[#555555]">暂无任务</div>
                          ) : (
                            <div className="space-y-2.5">
                              {sortedTasks.map((task) => {
                                const startTime = task.dueDate
                                  ? formatZonedTime(task.dueDate, getTimezoneOffset(task))
                                  : '未设时间';
                                return (
                                  <button
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="w-full text-left bg-[#20232B]/84 border border-[#3A3F4B]/45 hover:border-[#5E6778] rounded-2xl px-3 py-2.5 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-[#9A9A9A]">
                                      <span className="shrink-0">{startTime}</span>
                                      <span className={`shrink-0 flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                        <Flag className="w-3 h-3" />
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    </div>
                                    <div className={`text-[13px] leading-5 mt-1.5 break-words line-clamp-2 ${task.status === 'completed' ? 'line-through text-[#666666]' : 'text-[#EEEEEE]'}`}>
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
                <div className="glass-panel rounded-[28px] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#DDDDDD]">{selectedCalendarLabel}</div>
                    {calendarNotes[effectiveCalendarDate] && (
                      <span className="text-[11px] text-blue-300">
                        {calendarNotes[effectiveCalendarDate]}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#666666]">
                    显示时段：{pad2(visibleStartHour)}:00 - {pad2(Math.min(23, visibleEndHour + 1))}:00
                  </div>
                  <div className="max-h-[62vh] overflow-y-auto pr-1 rounded-[24px]">
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                      <div className="flex flex-col text-[10px] text-[#666666]">
                        {dayVisibleHours.map((hour) => (
                          <div
                            key={hour}
                            className="h-9 flex items-start justify-end pr-2 border-b border-[#3A3F4B]/45 last:border-b-0"
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
                        <div className="relative border border-[#3A3F4B]/45 rounded-[24px] overflow-hidden bg-[#1E2128]/78">
                          {showNowLine && nowLineTop >= 0 && nowLineTop <= dayVisibleHours.length * dayRowHeight && (
                            <div
                              className="absolute left-0 right-0 z-10 pointer-events-none"
                              style={{ top: `${nowLineTop}px` }}
                            >
                              <div className="relative flex items-center">
                                <span className="absolute -left-2.5 -top-2.5 w-3 h-3 rounded-full bg-red-400 shadow" />
                                <div className="h-[2px] w-full bg-red-400/80" />
                                <span className="ml-2 rounded bg-[var(--ui-surface-0)] px-1.5 py-0.5 text-[10px] text-red-300">
                                  {nowLabel}
                                </span>
                              </div>
                            </div>
                          )}
                          {dayVisibleHours.map((hour) => {
                            const hourTasks = dayTasksByHour[hour] || [];
                            return (
                              <div
                                key={hour}
                                className="min-h-[36px] border-b border-[#3A3F4B]/45 last:border-b-0 px-2.5 py-1.5"
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
                                        onCopyTitle={copyTaskTitle}
                                        onCopyContent={copyTaskContent}
                                        onTogglePinned={toggleTaskPinned}
                                        onQuickSetPriority={quickSetPriority}
                                        onQuickSetDuePreset={quickSetDuePreset}
                                        multiSelectEnabled={isBatchMode}
                                        isChecked={selectedTaskIds.has(task.id)}
                                        onToggleSelect={toggleTaskSelected}
                                        helpers={taskItemHelpers}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : calendarView === 'agenda' ? (
                <div className="glass-panel rounded-[28px] p-4 sm:p-5 space-y-4">
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
                        <div key={task.id} className="glass-panel-soft rounded-[24px] p-3.5">
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
                  <CalendarMonthGrid
                    monthLabel={monthLabel}
                    weekdayLabels={weekdayLabels}
                    calendarDays={calendarDays}
                    effectiveCalendarDate={effectiveCalendarDate}
                    todayKey={todayKey}
                    calendarNotes={calendarNotes}
                    tasksByDate={tasksByDate as Record<string, { id: string }[]>}
                    onMonthChange={handleMonthChange}
                    onSelectDate={setSelectedCalendarDate}
                  />

                  <div className="space-y-3 rounded-[24px] border border-[#3A3F4B]/45 bg-[#1E2128]/78 p-4 sm:p-5">
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
                            onCopyTitle={copyTaskTitle}
                            onCopyContent={copyTaskContent}
                            onTogglePinned={toggleTaskPinned}
                            onQuickSetPriority={quickSetPriority}
                            onQuickSetDuePreset={quickSetDuePreset}
                            multiSelectEnabled={isBatchMode}
                            isChecked={selectedTaskIds.has(task.id)}
                            onToggleSelect={toggleTaskSelected}
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
                <div className="flex items-center justify-end">
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
                          className="bg-[#20242C] border border-[#343C4C] rounded-2xl px-4 py-4 sm:px-5 sm:py-4 flex flex-col gap-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-semibold text-[#EEEEEE] leading-snug">{item.title}</h4>
                                {item.pinned && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">置顶</span>
                                )}
                              </div>
                              <p className="text-xs text-[#8A93A6] mt-1.5">目标日期：{item.targetDate}</p>
                            </div>
                            <div className="text-right shrink-0 min-w-[72px]">
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
                          <div className="flex flex-wrap gap-2 pt-1">
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
                    <h3 className="text-base font-semibold text-[#DDDDDD]">倒数日 AI 助手</h3>
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
                            className="ui-input rounded px-1 py-0.5"
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
                        className="ui-input flex-1 rounded-lg px-3 py-3 text-sm leading-6"
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
          ) : activeFilter === 'timeline' ? (
            <TimelinePanel
              tasks={tasks}
              onSelectTask={(task) => setSelectedTask(task)}
              onToggleTaskStatus={toggleStatus}
              defaultTimezoneOffset={DEFAULT_TIMEZONE_OFFSET}
              getTimezoneOffset={(task) => getTimezoneOffset(task)}
              formatZonedDateTime={formatZonedDateTime}
              formatZonedDate={formatZonedDate}
              isTaskOverdue={isTaskOverdue}
            />
          ) : activeFilter === 'review' ? (
            <ReviewPanel
              tasks={tasks}
              selectedTask={selectedTask}
              onSelectTask={(task) => setSelectedTask(task)}
              onToggleTaskStatus={toggleStatus}
              onQuickSetDuePreset={quickSetDuePreset}
              onUpdateTaskDueDate={updateTaskDueDate}
              onOpenTaskContext={(task) => setSelectedTask(task)}
              defaultTimezoneOffset={DEFAULT_TIMEZONE_OFFSET}
              getTimezoneOffset={(task) => getTimezoneOffset(task)}
              formatZonedDateTime={formatZonedDateTime}
              formatZonedDate={formatZonedDate}
              isTaskOverdue={isTaskOverdue}
            />
          ) : activeFilter === 'quadrant' ? (
            <div className="stack-gap flex flex-col px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="glass-panel motion-enter rounded-[28px] border-[color:var(--ui-border-strong)] p-4 sm:p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#DCE3F4]">
                      <span>未完成任务 {quadrantTaskCount} 项</span>
                      <span>重要任务 {quadrantImportantCount} 项</span>
                      <span>紧急任务 {quadrantUrgentCount} 项</span>
                    </div>
                    <div className="mt-2 text-xs text-[#7d8595]">
                      {quadrantTaskCount > 0
                        ? `当前最拥挤的是「${quadrantFocusGroup?.title ?? '四象限'}」，共 ${quadrantFocusGroup?.items.length ?? 0} 项，适合优先清一波。`
                        : '四个象限都很干净，新的任务会按优先级和截止时间自动落位。'}
                    </div>
                  </div>
                  <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-3 py-2 text-[11px] leading-5 text-[#9AA3B7] lg:max-w-[420px]">
                    拖动任务即可微调象限；重要看优先级，紧急看是否逾期或 24 小时内到期，不改变原有业务规则。
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {quadrantGroups.map((group) => {
                  const isExpanded = expandedQuadrants[group.key] ?? false;
                  const shouldCollapse = group.items.length > QUADRANT_COLLAPSE_LIMIT;
                  const visibleItems = shouldCollapse && !isExpanded
                    ? group.items.slice(0, QUADRANT_COLLAPSE_LIMIT)
                    : group.items;
                  const hiddenCount = group.items.length - visibleItems.length;
                  const isDragTarget = dragOverQuadrantKey === group.key;

                  return (
                    <div
                      key={group.key}
                      className={`glass-panel motion-enter rounded-[30px] border p-4 sm:p-4 flex flex-col gap-3 transition-[border-color,box-shadow,transform,background-color] duration-[var(--motion-base)] ${
                        isDragTarget
                          ? 'border-[rgba(var(--theme-accent),0.6)] shadow-[0_0_0_1px_rgba(var(--theme-accent),0.24),0_22px_44px_rgba(0,0,0,0.28)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.12),rgba(24,24,24,0.76))]'
                          : 'border-[color:var(--ui-border-strong)] hover:border-[rgba(var(--theme-accent),0.24)]'
                      }`}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragOverQuadrantKey(group.key);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragOverQuadrantKey !== group.key) {
                          setDragOverQuadrantKey(group.key);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverQuadrantKey === group.key) {
                          setDragOverQuadrantKey(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOverQuadrantKey(null);
                        const taskId = event.dataTransfer.getData('text/plain');
                        if (taskId) moveTaskToQuadrant(taskId, group.key);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-semibold text-[#F3F6FF]">{group.title}</h3>
                            <span className={`rounded-full border px-2 py-1 text-[10px] ${group.tone}`}>{group.items.length} 项</span>
                          </div>
                          <p className="mt-1 text-xs text-[#9AA3B7]">{group.description}</p>
                          <p className="mt-1 text-[11px] text-[#6F788B]">{isDragTarget ? '松手即可把任务放到这里' : group.summary}</p>
                        </div>
                        {shouldCollapse && (
                          <button
                            type="button"
                            onClick={() => toggleQuadrantExpanded(group.key)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#AAB3C6] px-2.5 py-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] hover:text-[#F3F6FF] hover:border-[rgba(var(--theme-accent),0.28)]"
                          >
                            {isExpanded ? '收起长列表' : `展开剩余 ${hiddenCount} 项`}
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="glass-panel-soft rounded-[24px] border border-[color:var(--ui-border-soft)] p-3 space-y-2.5 min-h-[172px] transition-[border-color,background-color] duration-[var(--motion-base)]">
                        {visibleItems.length === 0 ? (
                          <div className={`rounded-[20px] border border-dashed px-4 py-8 text-center text-xs ${
                            isDragTarget
                              ? 'border-[rgba(var(--theme-accent),0.45)] bg-[rgba(var(--theme-accent),0.08)] text-[#DCE6FF]'
                              : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#7d8595]'
                          }`}>
                            {isDragTarget
                              ? '把任务放到这里，它会按当前象限规则自动更新优先级 / 截止时间。'
                              : '这里暂时没有任务，适合先把同类事项拖进来再一起处理。'}
                          </div>
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
                              onCopyTitle={copyTaskTitle}
                              onCopyContent={copyTaskContent}
                              onTogglePinned={toggleTaskPinned}
                              onQuickSetPriority={quickSetPriority}
                              onQuickSetDuePreset={quickSetDuePreset}
                              onDragStart={() => {
                                setDraggingTaskId(task.id);
                                setDragOverQuadrantKey(null);
                              }}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDragOverQuadrantKey(null);
                              }}
                              dragEnabled
                              multiSelectEnabled={isBatchMode}
                              isChecked={selectedTaskIds.has(task.id)}
                              onToggleSelect={toggleTaskSelected}
                              helpers={taskItemHelpers}
                            />
                          ))
                        )}
                        {shouldCollapse && !isExpanded && hiddenCount > 0 && (
                          <div className="text-[11px] text-[#7d8595] px-1">已先展示前 {visibleItems.length} 项，剩余 {hiddenCount} 项可展开查看。</div>
                        )}
                        {shouldCollapse && isExpanded && hiddenCount > 0 && (
                          <div className="text-[11px] text-[#7d8595] px-1">当前已展开完整列表，处理完后可以收起，保持四象限更清爽。</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeFilter === 'pomodoro' ? (
            <PomodoroTimer />
          ) : activeFilter === 'agent' ? (
            <div className="theme-native-surface h-[calc(100dvh-8rem)] min-h-[420px]">
              <div className="h-full rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(135deg,rgba(var(--theme-grad-start),0.14),rgba(var(--theme-grad-end),0.07),rgba(var(--theme-accent),0.10))] p-[1px] shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
                <div className="h-full rounded-[27px] p-4 flex flex-col bg-[linear-gradient(180deg,var(--ui-surface-1),var(--ui-surface-0))] shadow-[0_0_0_1px_rgba(59,130,246,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] p-1">
                      <button
                        type="button"
                        onClick={() => setAiAssistantMode('record')}
                        className={`px-3 py-1 text-[11px] rounded-full transition-colors ${aiAssistantMode === 'record' ? 'bg-blue-600 text-white' : 'text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}
                      >
                        记录助手
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiAssistantMode('manage')}
                        className={`px-3 py-1 text-[11px] rounded-full transition-colors ${aiAssistantMode === 'manage' ? 'bg-violet-600 text-white' : 'text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}
                      >
                        管理助手
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowMemoryPanel((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                          showMemoryPanel
                            ? 'border-cyan-400/40 bg-cyan-500/10 text-[color:var(--ui-text-strong)]'
                            : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] hover:border-[color:var(--ui-border-strong)]'
                        }`}
                        title="打开长期记忆"
                        aria-label="打开长期记忆"
                      >
                        <Brain className="h-3.5 w-3.5" />
                        <span>{userMemories.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearCurrentAiContext}
                        className="p-1.5 rounded-lg border border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] hover:border-[color:var(--ui-border-strong)]"
                        title="清除当前 AI 上下文"
                        aria-label="清除当前 AI 上下文"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {redisHost && (
                        <div className="flex items-center gap-1 text-[10px] text-[color:var(--ui-text-muted)]">
                          <span>记忆:</span>
                          <select
                            value={aiRetentionDays}
                            onChange={(e) => setAiRetentionDays(Number(e.target.value))}
                            className="rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-1 py-0.5 text-[color:var(--ui-text-primary)] focus:outline-none"
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
                          className="max-w-[100px] truncate rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--ui-text-primary)] focus:outline-none"
                          title="切换模型"
                        >
                          {parseModelList(modelListText).map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                        <button
                          onClick={fetchModelList}
                          disabled={isFetchingModels}
                          className="rounded border border-[color:var(--ui-border-soft)] p-1 text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)] hover:border-[color:var(--ui-border-strong)] disabled:opacity-50"
                          title="拉取模型列表"
                        >
                          <Cloud className={`w-3 h-3 ${isFetchingModels ? 'animate-bounce' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {showMemoryPanel && (
                  <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--ui-text-strong)]">
                        <Brain className="h-3.5 w-3.5" />
                        <span>长期记忆</span>
                      </div>
                      <span className="text-[10px] text-[color:var(--ui-text-muted)]">随记录助手请求使用</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={memoryInput}
                        onChange={(event) => setMemoryInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') addUserMemory();
                        }}
                        placeholder="例如：我在东莞工作，通勤常从肇庆出发"
                        maxLength={240}
                        className="ui-input min-w-0 flex-1 rounded-lg px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={addUserMemory}
                        disabled={!memoryInput.trim()}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 text-[color:var(--ui-text-strong)] hover:bg-cyan-400/10 disabled:opacity-45"
                        title="添加记忆"
                        aria-label="添加记忆"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
                      {userMemories.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-cyan-300/20 px-3 py-2 text-xs text-[color:var(--ui-text-muted)]">
                          暂无长期记忆
                        </div>
                      ) : (
                        userMemories.map((memory) => {
                          const editing = editingMemoryId === memory.id;
                          return (
                            <div key={memory.id} className="rounded-lg border border-cyan-300/15 bg-[color:var(--ui-card-bg)] px-3 py-2">
                              {editing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingMemoryContent}
                                    onChange={(event) => setEditingMemoryContent(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') saveUserMemoryEdit();
                                      if (event.key === 'Escape') {
                                        setEditingMemoryId(null);
                                        setEditingMemoryContent('');
                                      }
                                    }}
                                    maxLength={240}
                                    className="ui-input min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={saveUserMemoryEdit}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 text-[color:var(--ui-text-strong)] hover:bg-cyan-400/10"
                                    title="保存记忆"
                                    aria-label="保存记忆"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMemoryId(null);
                                      setEditingMemoryContent('');
                                    }}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]"
                                    title="取消编辑"
                                    aria-label="取消编辑"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 text-xs leading-5 text-[color:var(--ui-text-primary)]">{memory.content}</div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditUserMemory(memory)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/20 text-[color:var(--ui-text-secondary)] hover:bg-cyan-400/10 hover:text-[color:var(--ui-text-strong)]"
                                      title="编辑记忆"
                                      aria-label="编辑记忆"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeUserMemory(memory.id)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300/25 text-[color:var(--ui-text-secondary)] hover:bg-rose-400/10 hover:text-rose-400"
                                      title="删除记忆"
                                      aria-label="删除记忆"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {aiAssistantMode === 'record' ? (
                    <>
                      {hasApiKey && agentLoading && agentMessages.length === 0 && (
                        <div className="space-y-2">
                          <div className="skeleton skeleton-shimmer rounded-lg h-10" />
                          <div className="skeleton skeleton-shimmer rounded-lg h-16" />
                          <div className="skeleton skeleton-shimmer rounded-lg h-12" />
                        </div>
                      )}

                      {!hasApiKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(true);
                            setIsApiSettingsOpen(true);
                          }}
                          className="w-full text-left rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 hover:border-amber-300/60 hover:bg-amber-500/15 transition-colors"
                          title="未配置 AI Key，点击前往设置"
                        >
                          <div className="text-sm text-amber-200 font-medium">未检测到 AI Key，AI 助手暂不可用</div>
                          <div className="text-xs text-amber-100/80 mt-1">点击这里前往设置页面填写 Key</div>
                        </button>
                      ) : agentMessages.length === 0 ? (
                        <div className="rounded-lg border border-[rgba(var(--theme-accent),0.16)] bg-[color:var(--ui-card-bg)] px-3 py-2 text-sm text-[color:var(--ui-text-primary)]">先告诉我：想完成什么事情？</div>
                      ) : (
                        <>
                          {agentMessages.map((message, idx) => (
                            <div
                              key={`${message.role}-${idx}`}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                  message.role === 'user'
                                    ? 'bg-[rgba(var(--theme-accent),0.14)] border border-[rgba(var(--theme-accent),0.28)] text-[color:var(--ui-text-strong)]'
                                    : 'border border-cyan-500/20 bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-primary)]'
                                }`}
                              >
                                {message.content}
                              </div>
                            </div>
                          ))}
                          {hasApiKey && agentLoading && (
                            <AgentThinkingBubble label="正在整理你的想法…" accent="cyan" />
                          )}
                        </>
                      )}

                      {hasApiKey && agentError && (
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

                      <div className="space-y-3 border-t border-[color:var(--ui-border-soft)] pt-2">
                        {agentGuidance.length > 0 && (
                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-[color:var(--ui-text-primary)] space-y-1">
                            <div className="font-medium text-[color:var(--ui-text-strong)]">行动拆解建议</div>
                            <ul className="list-disc list-inside space-y-1">
                              {agentGuidance.map((tip, idx) => (
                                <li key={`tip-${idx}`}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[color:var(--ui-text-primary)]">计划对照结果</h4>
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
                        {agentDecisions.length === 0 && agentItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[color:var(--ui-card-bg)] p-4 text-xs text-[color:var(--ui-text-secondary)]">
                            我会先对照现有计划，再把新增、复用和阻塞建议显示在这里。
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {agentItems.length > 0 && (
                              <div className="space-y-3">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">建议新增 {agentItems.length} 条</div>
                                {agentItems.map((item) => (
                                  <div key={item.id} className="rounded-2xl border border-violet-500/20 bg-[color:var(--ui-card-bg)] p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.06)]">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{item.title}</p>
                                        {item.dueDate && (
                                          <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                            日期：{formatZonedDateTime(item.dueDate, DEFAULT_TIMEZONE_OFFSET)} ({getTimezoneLabel(DEFAULT_TIMEZONE_OFFSET)})
                                          </p>
                                        )}
                                        {createDecisionReasonMap.get(item.id) && (
                                          <p className="mt-2 text-xs text-[color:var(--ui-text-secondary)]">
                                            原因：{createDecisionReasonMap.get(item.id)}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleAddAgentItem(item, createDecisionIdMap.get(item.id))}
                                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                                          addedAgentItemIds.has(item.id)
                                            ? 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
                                            : 'border-blue-500 text-blue-200 hover:bg-blue-500/10'
                                        }`}
                                      >
                                        {addedAgentItemIds.has(item.id) ? '已添加' : '加入待办'}
                                      </button>
                                    </div>
                                    {item.subtasks?.length ? (
                                      <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-[color:var(--ui-text-muted)]">
                                        {item.subtasks.map((subtask, index) => (
                                          <li key={`${item.id}-subtask-${index}`}>{subtask.title}</li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                            {agentUpdateDecisions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">建议修改现有任务 {agentUpdateDecisions.length} 条</div>
                                {agentUpdateDecisions.map((decision) => {
                                  const changeLines = describeAgentTaskChanges(decision.changes);
                                  const applied = appliedAgentDecisionIds.has(decision.id);
                                  return (
                                    <div key={decision.id} className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-[color:var(--ui-text-strong)]">{decision.taskTitle || '现有任务'}</div>
                                          {decision.reason && <div className="mt-1 text-xs text-[color:var(--ui-text-primary)]">{decision.reason}</div>}
                                          {changeLines.length > 0 && (
                                            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[color:var(--ui-text-secondary)]">
                                              {changeLines.map((line, index) => (
                                                <li key={`${decision.id}-change-${index}`}>{line}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleApplyAgentDecision(decision)}
                                          disabled={applied}
                                          className={`shrink-0 rounded-lg border px-3 py-1 text-xs transition-colors ${
                                            applied
                                              ? 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
                                              : 'border-amber-300/40 text-amber-100 hover:bg-amber-400/10'
                                          }`}
                                        >
                                          {applied ? '已修改' : '应用修改'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {agentDeleteDecisions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">建议删除任务 {agentDeleteDecisions.length} 条</div>
                                {agentDeleteDecisions.map((decision) => {
                                  const applied = appliedAgentDecisionIds.has(decision.id);
                                  return (
                                    <div key={decision.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-medium text-[color:var(--ui-text-strong)]">{decision.taskTitle || '现有任务'}</div>
                                          {decision.reason && <div className="mt-1 text-xs text-[color:var(--ui-text-primary)]">{decision.reason}</div>}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleApplyAgentDecision(decision)}
                                          disabled={applied}
                                          className={`shrink-0 rounded-lg border px-3 py-1 text-xs transition-colors ${
                                            applied
                                              ? 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
                                              : 'border-rose-300/40 text-rose-100 hover:bg-rose-400/10'
                                          }`}
                                        >
                                          {applied ? '已删除' : '删除待办'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {agentReuseDecisions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">已有任务可继续推进 {agentReuseDecisions.length} 条</div>
                                {agentReuseDecisions.map((decision) => (
                                  <div key={decision.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-[color:var(--ui-text-primary)]">
                                    <div className="font-medium text-[color:var(--ui-text-strong)]">{decision.taskTitle || '现有任务'}</div>
                                    {decision.reason && <div className="mt-1 text-[color:var(--ui-text-primary)]">{decision.reason}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {agentBlockedDecisions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">存在前置依赖 {agentBlockedDecisions.length} 条</div>
                                {agentBlockedDecisions.map((decision) => (
                                  <div key={decision.id} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-[color:var(--ui-text-primary)]">
                                    <div className="font-medium text-[color:var(--ui-text-strong)]">{decision.taskTitle || decision.item?.title || '待处理事项'}</div>
                                    {decision.reason && <div className="mt-1 text-[color:var(--ui-text-primary)]">{decision.reason}</div>}
                                    {decision.blockedByTaskTitles && decision.blockedByTaskTitles.length > 0 && (
                                      <div className="mt-1 text-[color:var(--ui-text-secondary)]">依赖：{decision.blockedByTaskTitles.join('、')}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {agentSkipDecisions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-[color:var(--ui-text-strong)]">已跳过重复或已完成项 {agentSkipDecisions.length} 条</div>
                                {agentSkipDecisions.map((decision) => (
                                  <div key={decision.id} className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] p-3 text-xs text-[color:var(--ui-text-secondary)]">
                                    <div className="font-medium text-[color:var(--ui-text-primary)]">{decision.taskTitle || '现有事项'}</div>
                                    {decision.reason && <div className="mt-1">{decision.reason}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-[rgba(var(--theme-accent),0.16)] bg-[color:var(--ui-card-bg)] px-3 py-2 text-[11px] text-[color:var(--ui-text-primary)]">
                        管理助手可以读取你当前的任务列表，并给出优先级/推荐/下一步建议。
                      </div>


                      <div className="mt-2 inline-flex flex-wrap gap-2">

                        <button

                          type="button"

                          onClick={() => setManageAgentFilter('all')}

                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${manageAgentFilter === 'all' ? 'bg-[rgba(var(--theme-accent),0.14)] border-[#3B82F6]/40 text-[color:var(--ui-text-strong)]' : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}

                        >

                          全部

                        </button>

                        <button

                          type="button"

                          onClick={() => setManageAgentFilter('todo')}

                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${manageAgentFilter === 'todo' ? 'bg-[rgba(var(--theme-accent),0.14)] border-[#3B82F6]/40 text-[color:var(--ui-text-strong)]' : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}

                        >

                          未完成

                        </button>

                        <button

                          type="button"

                          onClick={() => setManageAgentFilter('today')}

                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${manageAgentFilter === 'today' ? 'bg-[rgba(var(--theme-accent),0.14)] border-[#3B82F6]/40 text-[color:var(--ui-text-strong)]' : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}

                        >

                          今日

                        </button>

                        <button

                          type="button"

                          onClick={() => setManageAgentFilter('overdue')}

                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${manageAgentFilter === 'overdue' ? 'bg-[#2B3448] border-[#F43F5E]/40 text-[#FFD1DC]' : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'}`}

                        >

                          逾期

                        </button>

                      </div>


                      {manageAgentLoading && manageAgentMessages.length === 0 ? (
                        <div className="space-y-2">
                          <div className="skeleton skeleton-shimmer rounded-lg h-10" />
                          <div className="skeleton skeleton-shimmer rounded-lg h-12" />
                        </div>
                      ) : manageAgentMessages.length === 0 ? (
                        <div className="rounded-lg border border-[rgba(var(--theme-accent),0.16)] bg-[color:var(--ui-card-bg)] px-3 py-2 text-sm text-[color:var(--ui-text-primary)]">先告诉我：你想怎么管理这些任务？例如“帮我挑出今天最该做的 5 个”。</div>
                      ) : (
                        <>
                          {manageAgentMessages.map((message, idx) => (
                            <div
                              key={`${message.role}-${idx}`}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                  message.role === 'user'
                                    ? 'bg-[rgba(var(--theme-accent),0.14)] border border-[rgba(var(--theme-accent),0.28)] text-[color:var(--ui-text-strong)]'
                                    : 'border border-cyan-500/20 bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-primary)]'
                                }`}
                              >
                                {message.content}
                              </div>
                            </div>
                          ))}
                          {manageAgentLoading && (
                            <AgentThinkingBubble label="正在分析你的任务列表…" accent="violet" />
                          )}
                        </>
                      )}

                      {manageAgentError && (
                        <div className="text-xs text-red-300 bg-red-500/10 p-2 rounded-lg">{manageAgentError}</div>
                      )}

                      {manageRecommendations.length > 0 && (
                        <div className="space-y-2 border-t border-[color:var(--ui-border-soft)] pt-2">
                          <div className="text-sm font-semibold text-[color:var(--ui-text-primary)]">推荐</div>
                          <div className="grid gap-2">
                            {manageRecommendations.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  const target = tasks.find((t) => t.id === r.id);
                                  if (target) setSelectedTask(target);
                                }}
                                className="w-full rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] p-3 text-left transition-colors hover:bg-[color:var(--ui-card-hover-bg)]"
                              >
                                <div className="text-sm font-medium text-[color:var(--ui-text-strong)]">{r.title}</div>
                                {r.reason && <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{r.reason}</div>}

                                {(typeof r.suggestedPinned === 'boolean' ||
                                  typeof r.suggestedPriority === 'number' ||
                                  (r.suggestedDuePreset === 'today' || r.suggestedDuePreset === 'tomorrow' || r.suggestedDuePreset === 'tonight')) && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {typeof r.suggestedPinned === 'boolean' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const target = taskStore.getAll().find((t) => t.id === r.id);
                                          if (!target) return;

                                          setManageRecActions((prev) => ({
                                            ...prev,
                                            [r.id]: { ...(prev[r.id] ?? {}), pin: r.suggestedPinned },
                                          }));
                                          updateTask(applyManageActionToTask(target, { pin: r.suggestedPinned }));
                                          setManageRecommendations((prev) => prev.filter((item) => item.id !== r.id));
                                          pushLog('success', `已${r.suggestedPinned ? '置顶' : '取消置顶'}：${r.title}`);
                                        }}
                                        className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text-strong)]"
                                      >
                                        {r.suggestedPinned ? '一键置顶' : '一键取消置顶'}
                                      </button>
                                    )}

                                    {typeof r.suggestedPriority === 'number' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const suggestedPriority = r.suggestedPriority;
                                          if (typeof suggestedPriority !== 'number') return;
                                          setManageRecActions((prev) => ({
                                            ...prev,
                                            [r.id]: { ...(prev[r.id] ?? {}), priority: suggestedPriority },
                                          }));
                                          quickSetPriority(r.id, suggestedPriority);
                                          setManageRecommendations((prev) => prev.filter((item) => item.id !== r.id));
                                          pushLog('success', `已更新优先级：${r.title}`);
                                        }}
                                        className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text-strong)]"
                                      >
                                        一键设为{getPriorityLabel(r.suggestedPriority)}
                                      </button>
                                    )}

                                    {(r.suggestedDuePreset === 'today' || r.suggestedDuePreset === 'tomorrow' || r.suggestedDuePreset === 'tonight') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const duePreset = r.suggestedDuePreset;
                                          if (duePreset !== 'today' && duePreset !== 'tomorrow' && duePreset !== 'tonight') return;
                                          const target = taskStore.getAll().find((t) => t.id === r.id);
                                          if (!target) return;

                                          const timezoneOffset = target.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
                                          const baseNow = new Date();
                                          const dateText =
                                            duePreset === 'tomorrow'
                                              ? formatDateKeyByOffset(new Date(baseNow.getTime() + 24 * 60 * 60 * 1000), timezoneOffset)
                                              : formatDateKeyByOffset(baseNow, timezoneOffset);
                                          const timeText = duePreset === 'tonight' ? '20:00' : '09:00';
                                          const dueDate = buildDueDateIso(dateText, timeText, timezoneOffset);

                                          setManageRecActions((prev) => ({
                                            ...prev,
                                            [r.id]: { ...(prev[r.id] ?? {}), dueDate },
                                          }));
                                          quickSetDuePreset(r.id, duePreset);
                                          setManageRecommendations((prev) => prev.filter((item) => item.id !== r.id));
                                          pushLog('success', `已更新日期：${r.title}`);
                                        }}
                                        className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text-strong)]"
                                      >
                                        一键设为{r.suggestedDuePreset === 'today' ? '今天' : r.suggestedDuePreset === 'tomorrow' ? '明天' : '今晚'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {aiAssistantMode === 'record' && agentImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agentImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--ui-border-soft)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

                <div className="mt-2 flex items-center gap-2">
                  {aiAssistantMode === 'record' ? (
                    <>
                      <input
                        ref={agentImageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAgentImageChange}
                        className="hidden"
                        disabled={!hasApiKey || agentLoading}
                      />
                      <input
                        type="text"
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onPaste={handleAgentPaste}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleAgentSend();
                          }
                        }}
                        placeholder={hasApiKey ? '例如：帮我规划本周的工作安排' : '请先在设置中填写 AI Key'}
                        className="flex-1 rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-3 text-sm leading-6 text-[color:var(--ui-text-primary)] focus:border-violet-400 focus:outline-none disabled:opacity-60"
                        disabled={!hasApiKey || agentLoading}
                      />
                      <button
                        type="button"
                        onClick={() => agentImageInputRef.current?.click()}
                        className="rounded-lg border border-[color:var(--ui-border-soft)] p-2 text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text-strong)] disabled:opacity-50"
                        title="上传图片"
                        disabled={!hasApiKey || agentLoading}
                      >
                        <ImagePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={agentLoading ? handleCancelAgentSend : handleAgentSend}
                        disabled={agentLoading ? false : (!agentInput.trim() && agentImages.length === 0)}
                        className={`px-3 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                          agentLoading
                            ? 'bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400'
                            : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500'
                        }`}
                      >
                        {agentLoading ? '停止整理' : '发送'}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={manageAgentInput}
                        onChange={(e) => setManageAgentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleManageAgentSend();
                          }
                        }}
                        placeholder={hasApiKey ? '例如：从我的任务里推荐今天最该做的 5 个' : '请先在设置中填写 AI Key'}
                        className="flex-1 rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-3 text-sm leading-6 text-[color:var(--ui-text-primary)] focus:border-violet-400 focus:outline-none disabled:opacity-60"
                        disabled={!hasApiKey || manageAgentLoading}
                      />
                      <button
                        onClick={handleManageAgentSend}
                        disabled={!hasApiKey || manageAgentLoading || !manageAgentInput.trim()}
                        className="px-3 py-2 text-sm bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg hover:from-violet-500 hover:to-blue-500 disabled:opacity-50"
                      >
                        {manageAgentLoading ? '分析中…' : '发送'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          ) : activeFilter === 'items' ? (
            <ItemsPanel
              items={items
                .filter((item) => {
                  const keyword = itemSearch.trim().toLowerCase();
                  const matchesKeyword = !keyword || [item.name, item.category, item.location, item.note, ...(item.tags || [])]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(keyword));
                  const matchesStatus = itemStatusFilter === 'all' || item.status === itemStatusFilter;
                  return matchesKeyword && matchesStatus;
                })
                .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())}
              itemNameInput={itemNameInput}
              setItemNameInput={setItemNameInput}
              itemCategoryInput={itemCategoryInput}
              setItemCategoryInput={setItemCategoryInput}
              itemLocationInput={itemLocationInput}
              setItemLocationInput={setItemLocationInput}
              itemQuantityInput={itemQuantityInput}
              setItemQuantityInput={setItemQuantityInput}
              itemTagsInput={itemTagsInput}
              setItemTagsInput={setItemTagsInput}
              itemNoteInput={itemNoteInput}
              setItemNoteInput={setItemNoteInput}
              itemSearch={itemSearch}
              setItemSearch={setItemSearch}
              itemStatusFilter={itemStatusFilter}
              setItemStatusFilter={setItemStatusFilter}
              editingItemId={editingItemId}
              onCancelItemForm={() => {
                setEditingItemId(null);
                setItemNameInput('');
                setItemCategoryInput('');
                setItemLocationInput('');
                setItemQuantityInput('1');
                setItemTagsInput('');
                setItemNoteInput('');
              }}
              onCreateItem={() => {
                const name = itemNameInput.trim();
                if (!name) {
                  pushLog('warning', '请先填写物品名称');
                  return;
                }
                const quantity = Math.max(0, Number(itemQuantityInput) || 0);
                const nowIso = new Date().toISOString();
                const nextPayload = {
                  name,
                  category: itemCategoryInput.trim() || undefined,
                  location: itemLocationInput.trim() || undefined,
                  quantity,
                  status: deriveItemStatusFromQuantity(quantity),
                  tags: itemTagsInput.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
                  note: itemNoteInput.trim() || undefined,
                  updatedAt: nowIso,
                };
                if (editingItemId) {
                  const current = itemStore.getAll().find((entry) => entry.id === editingItemId);
                  if (!current) return;
                  itemStore.update({ ...current, ...nextPayload });
                } else {
                  itemStore.add({
                    id: createId(),
                    ...nextPayload,
                    createdAt: nowIso,
                  });
                }
                refreshItems();
                setEditingItemId(null);
                setItemNameInput('');
                setItemCategoryInput('');
                setItemLocationInput('');
                setItemQuantityInput('1');
                setItemTagsInput('');
                setItemNoteInput('');
                pushLog('success', editingItemId ? '已更新物品' : '已添加物品', `物品：${name}`);
              }}
              onEditItem={(item) => {
                setEditingItemId(item.id);
                setItemNameInput(item.name);
                setItemCategoryInput(item.category || '');
                setItemLocationInput(item.location || '');
                setItemQuantityInput(String(item.quantity));
                setItemTagsInput((item.tags || []).join(', '));
                setItemNoteInput(item.note || '');
              }}
              onUpdateItemStatus={(id, status) => {
                const current = itemStore.getAll().find((entry) => entry.id === id);
                if (!current) return;
                itemStore.update({ ...current, status, updatedAt: new Date().toISOString() });
                refreshItems();
                pushLog('success', '物品状态已更新');
              }}
              onDeleteItem={(id) => {
                const current = itemStore.getAll().find((entry) => entry.id === id);
                if (!current) return;
                markDeleted(DELETED_ITEMS_KEY, id);
                itemStore.remove(id);
                refreshItems();
                pushLog('success', '已删除物品', current.name);
              }}
              onCreateItemTask={(item, action) => {
                const actionLabel = action === 'restock' ? '补货' : action === 'buy' ? '购买' : '归位';
                const prefix = action === 'restock' ? '补货' : action === 'buy' ? '购买' : '把';
                const title = action === 'put_back'
                  ? `${prefix}${item.name}放回${item.location || '指定位置'}`
                  : `${prefix}${item.name}`;
                const detailParts = [
                  item.category ? `分类：${item.category}` : '',
                  item.location ? `位置：${item.location}` : '',
                  typeof item.quantity === 'number' ? `当前数量：${item.quantity}` : '',
                  item.note ? `备注：${item.note}` : '',
                ].filter(Boolean);
                const task: Task = {
                  id: createId(),
                  title,
                  timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
                  priority: action === 'buy' ? 2 : action === 'restock' ? 1 : 0,
                  category: item.category || '物品管理',
                  status: 'todo',
                  tags: Array.from(new Set(['物品管理', actionLabel, `item:${item.id}`, `item-action:${action}`, ...(item.tags || [])])),
                  pinned: false,
                  subtasks: detailParts.length > 0 ? detailParts.map((part) => ({ id: createId(), title: part, completed: false })) : [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                taskStore.add(task);
                refreshTasks();
                pushLog('success', `已创建${actionLabel}任务`, title);
              }}
            />
          ) : activeFilter === 'habit' ? (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-[#202020] border border-[#2C2C2C] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-[#666666]">
                    {hasApiKey ? '有 AI 时自动拆解，无 AI 时直接创建习惯' : '当前按直接创建模式工作'}
                  </div>
                  <div className="text-[11px] text-[#555555]">今天 {getTodayKey().slice(5)}</div>
                </div>

                <div className="mt-3 rounded-xl border border-[#2E3750] bg-[#1A2236] p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-[#8FA1C8]">
                      同一个输入框：有 AI 就拆解，无 AI 自动创建
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-200">
                      {hasApiKey ? 'habit-agent' : 'fallback'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={habitAgentInput}
                      onChange={(e) => setHabitAgentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleHabitAgentSend();
                        }
                      }}
                      placeholder={hasApiKey ? '例如：我想学习英语' : '例如：学英语（将直接创建习惯）'}
                      className="flex-1 bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#E2E8FF] focus:outline-none focus:border-blue-400 disabled:opacity-60"
                      disabled={habitAgentLoading}
                    />
                    <button
                      onClick={handleHabitAgentSend}
                      disabled={!habitAgentInput.trim() || habitAgentLoading}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {habitAgentLoading ? '拆解中…' : hasApiKey ? 'AI 拆解' : '创建习惯'}
                    </button>
                  </div>

                  {habitAgentError && (
                    <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      {habitAgentError}
                    </div>
                  )}

                  {habitAgentItems.length > 0 && (
                    <div className="space-y-2">
                      {habitAgentItems.map((item) => {
                        const isAdded = addedHabitAgentItemIds.has(item.id);
                        return (
                          <div key={item.id} className="rounded-lg border border-[#334155] bg-[#0F172A] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm text-[#E2E8F0] font-medium">{item.title}</div>
                                <div className="text-xs text-[#94A3B8] mt-1">
                                  {item.frequency ? `频率：${item.frequency} · ` : ''}
                                  {item.checkInDueDate ? `检查时间：${formatZonedDateTime(item.checkInDueDate, DEFAULT_TIMEZONE_OFFSET)}` : '检查时间：今晚 20:00'}
                                </div>
                                {item.reason && <div className="text-xs text-[#7DD3FC] mt-1">拆解说明：{item.reason}</div>}
                              </div>
                              <button
                                onClick={() => handleAddHabitAgentItem(item)}
                                disabled={isAdded}
                                className={`text-xs px-3 py-1 rounded border transition-colors ${
                                  isAdded
                                    ? 'border-[#374151] text-[#6B7280]'
                                    : 'border-blue-500 text-blue-200 hover:bg-blue-500/10'
                                }`}
                              >
                                {isAdded ? '已添加' : '加入习惯+检查任务'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                          {recentDays.map((day) => {
                            const checked = logSet.has(day);
                            return (
                              <div key={day} className="flex flex-col items-center gap-1">
                                {checked ? (
                                  <div className="w-5 h-5 rounded-full border border-orange-400/60 bg-gradient-to-b from-orange-400/25 to-amber-500/25 flex items-center justify-center shadow-[0_0_10px_rgba(251,146,60,0.35)]">
                                    <Flame className="w-3.5 h-3.5 text-orange-300" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-[#444444]" />
                                )}
                                <span className="text-[10px] text-[#666666]">{day.slice(5)}</span>
                              </div>
                            );
                          })}
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
                  <p className="text-sm">暂无任务，今天可以安心休息一下</p>
                  <p className="text-xs text-[#555555] mt-2">要不要来点新任务，让我也有点存在感？</p>
                </div>
              ) : (
                <>
                  {activeFilter !== 'completed' && (
                    <div className="theme-native-surface glass-panel-soft rounded-2xl border border-[color:var(--ui-border-soft)] px-3 py-3 sm:px-4 sm:py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#8EA3FF]">时间感知</div>
                          <div className="text-sm font-semibold text-[color:var(--ui-text-strong)]">未来任务不再埋在列表里</div>
                          <div className="text-xs text-[color:var(--ui-text-secondary)]">先看今天和即将到来，再决定要不要提前处理更远的计划。</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          {futureTaskSummary.overdue > 0 && <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-100">逾期 {futureTaskSummary.overdue}</span>}
                          {futureTaskSummary.today > 0 && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">今天 {futureTaskSummary.today}</span>}
                          {futureTaskSummary.upcoming > 0 && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-100">即将到来 {futureTaskSummary.upcoming}</span>}
                          {futureTaskSummary.future > 0 && <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-violet-100">更远计划 {futureTaskSummary.future}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {(taskGroupMode === 'dueDate' || activeFilter === 'inbox' || activeFilter === 'all' || activeFilter === 'today' || activeFilter === 'next7')
                    ? futureAwareGroupedTasks.map((group) => {
                        const meta = FUTURE_TASK_BUCKET_META[group.key as FutureTaskBucketKey];
                        return (
                          <div key={group.key} className="space-y-2">
                            <div className="flex px-1">
                              <div className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 ${meta.tone}`}>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold leading-tight text-[#EEF2FF]">{group.label}</div>
                                  <div className="truncate text-xs leading-tight text-[#8F9BB3]">{meta.summary}</div>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${meta.chipTone}`}>{group.items.length} 项</span>
                              </div>
                            </div>
                            <div className="space-y-1">
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
                                      onCopyTitle={copyTaskTitle}
                                      onCopyContent={copyTaskContent}
                                      onTogglePinned={toggleTaskPinned}
                                      onQuickSetPriority={quickSetPriority}
                                      onQuickSetDuePreset={quickSetDuePreset}
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
                                      multiSelectEnabled={isBatchMode}
                                      isChecked={selectedTaskIds.has(task.id)}
                                      onToggleSelect={toggleTaskSelected}
                                      helpers={taskItemHelpers}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    : groupedTasks.map((group) => (
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
                                  onCopyTitle={copyTaskTitle}
                                  onCopyContent={copyTaskContent}
                                  onTogglePinned={toggleTaskPinned}
                                  onQuickSetPriority={quickSetPriority}
                                  onQuickSetDuePreset={quickSetDuePreset}
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
                                  multiSelectEnabled={isBatchMode}
                                  isChecked={selectedTaskIds.has(task.id)}
                                  onToggleSelect={toggleTaskSelected}
                                  helpers={taskItemHelpers}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. Detail Sidebar (Right) */}
      {selectedTask && (
        <aside className="fixed inset-y-0 right-0 z-50 lg:z-10 w-full sm:w-[360px] lg:relative lg:w-[380px] xl:w-[440px] 2xl:w-[480px] bg-[#222222] border-l border-[#333333] flex flex-col motion-drawer-surface">
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
          
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto mobile-scroll safe-scroll-with-footer [--footer-safe-height:1rem]">
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
              <div className="min-w-0 flex-1">
                <h3 className={`text-xl font-semibold leading-snug break-words ${
                  selectedTask.status === 'completed' ? 'line-through text-[#666666]' : ''
                }`}>
                  {selectedTask.title}
                </h3>
                {selectedTaskPhoneNumbers.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {selectedTaskPhoneNumbers.map((phone) => (
                      <a
                        key={phone.normalized}
                        href={buildTelHref(phone)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-blue-400/30 bg-blue-500/12 text-blue-100 hover:bg-blue-500/18 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        拨打 {phone.raw}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <TaskQuickActions
              task={selectedTask}
              onSetDuePreset={quickSetDuePreset}
              onClearDueDate={(taskId) => updateTaskDueDate(taskId, undefined)}
              onSetPriority={quickSetPriority}
              onTogglePinned={toggleTaskPinned}
              onStartAddSubtask={focusSubtaskQuickInput}
            />

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
                <div className="space-y-2 rounded-2xl border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] p-2.5 sm:p-3">
                  {(selectedTask.subtasks || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.015)] px-3 py-3 text-sm text-[#666666]">
                      还没有子任务，下面可以直接快速补一条
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedTask.subtasks || []).map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 rounded-xl bg-[rgba(255,255,255,0.02)] px-2.5 py-2 transition-colors hover:bg-[rgba(255,255,255,0.04)]">
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
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-[rgba(var(--theme-accent),0.2)] bg-[rgba(var(--theme-accent),0.06)] px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-[#8EA3FF]">＋</span>
                      <input
                        ref={subtaskQuickInputRef}
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        placeholder="快速添加子任务，回车连续录入"
                        className="flex-1 bg-transparent text-sm text-[#CCCCCC] placeholder:text-[#6B7280] focus:outline-none"
                      />
                      <button
                        onClick={addSubtask}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                      >
                        添加
                      </button>
                    </div>
                  </div>
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
                      className="ui-input w-full rounded px-9 py-2 text-sm"
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
                      className="ui-input w-full rounded px-3 py-2 text-sm"
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
                      className="ui-select w-full rounded px-3 py-2 text-sm"
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
                <label className="text-xs font-semibold text-[#555555] uppercase">提醒</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (!selectedTask) return;
                      updateTask({ ...selectedTask, reminderPreset: 'none', reminderAt: undefined });
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedReminderPreset === 'none'
                        ? 'bg-[#333333] border-[#555555] text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    不提醒
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedTask) return;
                      const reminderAt = buildReminderAt(selectedTask.dueDate, selectedTimezoneOffset, '9am');
                      updateTask({ ...selectedTask, reminderPreset: '9am', reminderAt });
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedReminderPreset === '9am'
                        ? 'bg-[#333333] border-[#555555] text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    当天 9 点
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedTask) return;
                      const reminderAt = buildDueDateIso(selectedReminderDateValue, selectedReminderTimeValue, selectedTimezoneOffset);
                      updateTask({ ...selectedTask, reminderPreset: 'custom', reminderAt });
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedReminderPreset === 'custom'
                        ? 'bg-[#333333] border-[#555555] text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    指定时间
                  </button>
                </div>
                {selectedReminderPreset === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="ui-input w-full rounded px-3 py-2 text-sm"
                      value={selectedReminderDateValue}
                      onChange={(e) => {
                        if (!selectedTask) return;
                        const nextDate = e.target.value;
                        const nextReminderAt = buildDueDateIso(nextDate, selectedReminderTimeValue, selectedTimezoneOffset);
                        updateTask({ ...selectedTask, reminderPreset: 'custom', reminderAt: nextReminderAt });
                      }}
                    />
                    <input
                      type="time"
                      className="ui-input w-full rounded px-3 py-2 text-sm"
                      value={selectedReminderTimeValue}
                      onChange={(e) => {
                        if (!selectedTask) return;
                        const nextTime = e.target.value;
                        const nextReminderAt = buildDueDateIso(selectedReminderDateValue, nextTime, selectedTimezoneOffset);
                        updateTask({ ...selectedTask, reminderPreset: 'custom', reminderAt: nextReminderAt });
                      }}
                    />
                  </div>
                )}
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
                    className="ui-input flex-1 rounded px-3 py-2 text-sm"
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
                    <div key={att.id} className="ui-hint-panel flex items-center justify-between rounded px-3 py-2">
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
                      className="ui-input w-16 rounded px-2 py-1 text-xs"
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
                      className="ui-input w-16 rounded px-2 py-1 text-xs"
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
        themePreference={themePreference}
        setThemePreference={setThemePreference}
        accentTheme={accentTheme}
        setAccentTheme={setAccentTheme}
        gradientTheme={gradientTheme}
        setGradientTheme={setGradientTheme}
        notificationSupported={notificationSupported}
        isSecureContext={isSecureContext}
        notificationPermission={notificationPermission}
        serviceWorkerSupported={serviceWorkerSupported}
        requestNotificationPermission={requestNotificationPermission}
        sendTestNotification={sendTestNotification}
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

      <CountdownFormModal
        show={showCountdownForm}
        editingCountdown={Boolean(editingCountdown)}
        countdownDate={countdownDate}
        setCountdownDate={setCountdownDate}
        onClose={() => {
          setShowCountdownForm(false);
          resetCountdownForm();
        }}
        onSave={saveCountdown}
      />

      <LogsModal
        show={showLogs}
        onClose={() => setShowLogs(false)}
        logs={logs}
        onClear={() => setLogs([])}
        apiBaseUrl={apiBaseUrl}
        defaultBaseUrl={DEFAULT_BASE_URL}
      />

      {false && showClearCompletedConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-modal-overlay"
          onClick={() => setShowClearCompletedConfirm(false)}
        >
          <div
            className="mobile-modal mobile-modal-body glass-panel motion-modal-surface w-full max-w-md rounded-[32px] border border-[var(--ui-border-strong)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] p-5 sm:p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#F3F6FF]">清除已完成</h2>
                <p className="mt-1 text-xs text-[#7d8595]">已完成任务会从当前列表移除，这一步无法撤销。</p>
              </div>
              <button
                onClick={() => setShowClearCompletedConfirm(false)}
                className="text-xs text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1"
              >
                关闭
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-amber-500/20 bg-amber-500/8 px-3.5 py-3 text-sm text-[#D8DEEF]">
              确认清除所有已完成任务？
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearCompletedConfirm(false)}
                className="text-sm text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-4 py-2"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCompletedTasks();
                  setShowClearCompletedConfirm(false);
                }}
                className="text-sm text-white rounded-full border border-red-400/35 bg-red-500/18 px-4 py-2 hover:bg-red-500/24 ui-state-hover ui-state-press"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearCompletedConfirm && (
        <div className="ui-modal-backdrop z-[60] motion-modal-overlay" onClick={() => setShowClearCompletedConfirm(false)}>
          <div
            className="theme-native-surface ui-modal-surface mobile-modal mobile-modal-body motion-modal-surface w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="ui-modal-title">清空已完成</h2>
                <p className="ui-modal-subtitle">已完成任务会从当前列表移除，这一步无法撤销。</p>
              </div>
              <button
                onClick={() => setShowClearCompletedConfirm(false)}
                className="ui-modal-close"
                aria-label="关闭确认弹窗"
              >
                关闭
              </button>
            </div>

            <div className="ui-panel-muted mt-4 border-amber-500/20 bg-amber-500/8 px-3.5 py-3 text-sm text-[color:var(--ui-text-primary)]">
              确认清空所有已完成任务？
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearCompletedConfirm(false)}
                className="ui-modal-close px-4 py-2 text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCompletedTasks();
                  setShowClearCompletedConfirm(false);
                }}
                className="ui-state-hover ui-state-press rounded-full border border-red-400/35 bg-red-500/18 px-4 py-2 text-sm text-white hover:bg-red-500/24"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      <AboutModal
        show={showAbout}
        onClose={() => setShowAbout(false)}
        appVersion={APP_VERSION}
      />

      <PomodoroAudioController />
      <PomodoroFloatingWidget onOpenPomodoro={() => setActiveFilter('pomodoro')} />

    </div>
  );
}

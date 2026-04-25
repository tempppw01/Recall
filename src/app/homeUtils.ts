import type { RepeatType, Task, TaskRepeatRule } from '@/lib/store';
import type { TaskSortMode } from '@/app/homeTypes';

export const DEFAULT_TIMEZONE_OFFSET = 480;

export const parseModelList = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const pad2 = (value: number) => String(value).padStart(2, '0');

export const getTimezoneOffset = (task?: Task) => task?.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;

export const getZonedDate = (iso: string, offsetMinutes: number) =>
  new Date(new Date(iso).getTime() + offsetMinutes * 60 * 1000);

export const formatDateKeyByOffset = (date: Date, offsetMinutes: number) => {
  const zoned = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

export const formatZonedDate = (iso: string, offsetMinutes: number) => {
  const zoned = getZonedDate(iso, offsetMinutes);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
};

export const formatZonedTime = (iso: string, offsetMinutes: number) => {
  const zoned = getZonedDate(iso, offsetMinutes);
  return `${pad2(zoned.getUTCHours())}:${pad2(zoned.getUTCMinutes())}`;
};

export const formatZonedDateTime = (iso: string, offsetMinutes: number) =>
  `${formatZonedDate(iso, offsetMinutes)} ${formatZonedTime(iso, offsetMinutes)}`;

export const buildDueDateIso = (dateText: string, timeText: string, offsetMinutes: number) => {
  if (!dateText) return undefined;
  const [year, month, day] = dateText.split('-').map(Number);
  const [hours, minutes] = (timeText || '00:00').split(':').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
};

export const buildReminderAt = (
  dueDate: string | undefined,
  timezoneOffset: number,
  preset: 'none' | '9am' | 'custom',
  customReminderAt?: string,
) => {
  if (preset === 'none') return undefined;
  if (preset === 'custom') return customReminderAt ?? dueDate;
  if (!dueDate) return undefined;
  const dueDateText = formatZonedDate(dueDate, timezoneOffset);
  return buildDueDateIso(dueDateText, '09:00', timezoneOffset);
};

export const sortTasks = (items: Task[], mode: TaskSortMode) => {
  if (mode === 'manual') return items;

  const next = [...items];
  const getCreatedAt = (task: Task) => new Date(task.createdAt ?? 0).getTime();
  const getDueTime = (task: Task) => (task.dueDate ? new Date(task.dueDate).getTime() : Infinity);

  next.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

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

export const isTaskOverdue = (task: Task) => {
  if (!task.dueDate) return false;
  if (task.status === 'completed') return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

export const isTaskDueToday = (task: Task, now: Date) => {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
};

export const isTaskDueWithinDays = (task: Task, now: Date, days: number) => {
  if (!task.dueDate) return false;
  const dueMs = new Date(task.dueDate).getTime();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, days));
  end.setHours(23, 59, 59, 999);
  return dueMs >= start.getTime() && dueMs <= end.getTime();
};

export const normalizeAgentDueDate = (value?: string) => {
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

export const evaluatePriority = (dueDate?: string, subtaskCount = 0, nowMs?: number) => {
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

export const fetchServerTime = async () => {
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

export const createId = () => Math.random().toString(36).substring(2, 9);

export const readImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read image failed'));
    reader.readAsDataURL(file);
  });

export const filterImageFiles = (files: File[]) =>
  files.filter((file) => file.type.startsWith('image/'));

export const getDefaultRepeatRule = (type: RepeatType, task: Task): TaskRepeatRule => {
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

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const getTodayKey = () => formatDateKey(new Date());

export const getRecentDays = (count: number) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => formatDateKey(addDays(today, -count + 1 + index)));
};

export const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const buildWeekDays = (start: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      dateKey: formatDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });

export const buildWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  return `${formatDateKey(start)} ~ ${formatDateKey(end)}`;
};

export const getNextRepeatDate = (task: Task): Date | null => {
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

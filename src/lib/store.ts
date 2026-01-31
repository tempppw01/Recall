export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  timezoneOffset?: number;
  priority: number;
  category?: string;
  status: 'todo' | 'in_progress' | 'completed';
  tags: string[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
  repeat?: TaskRepeatRule;
  createdAt: string;
  updatedAt?: string;
  sortOrder?: number;
}

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskRepeatRule {
  type: RepeatType;
  interval?: number;
  weekdays?: number[];
  monthDay?: number;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface HabitLog {
  date: string;
}

export interface Habit {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  logs: HabitLog[];
}

export interface Countdown {
  id: string;
  title: string;
  targetDate: string;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PomodoroRecord {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

type StoreKey = 'recall_tasks' | 'recall_habits' | 'recall_countdowns' | 'recall_pomodoro_records';
const LAST_LOCAL_CHANGE_KEY = 'recall_last_local_change';

// PG 配置 Key
const PG_HOST_KEY = 'recall_pg_host';
const PG_PORT_KEY = 'recall_pg_port';
const PG_DATABASE_KEY = 'recall_pg_database';
const PG_USERNAME_KEY = 'recall_pg_username';
const PG_PASSWORD_KEY = 'recall_pg_password';

const getPgHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const host = localStorage.getItem(PG_HOST_KEY);
  const port = localStorage.getItem(PG_PORT_KEY);
  const database = localStorage.getItem(PG_DATABASE_KEY);
  const username = localStorage.getItem(PG_USERNAME_KEY);
  const password = localStorage.getItem(PG_PASSWORD_KEY);
  if (!host || !database || !username) return {};
  return {
    'x-pg-host': host,
    'x-pg-port': port || '5432',
    'x-pg-database': database,
    'x-pg-username': username,
    'x-pg-password': password || '',
  };
};

const syncToPg = async (endpoint: string, method: string, payload: any) => {
  const headers = getPgHeaders();
  if (Object.keys(headers).length === 0) return; // 未配置 PG，仅本地
  try {
    await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('PG Sync Failed', error);
  }
};

const safelyRead = <T>(key: StoreKey, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.error(`Failed to read ${key}`, error);
    return fallback;
  }
};

const safelyWrite = (key: StoreKey, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem(LAST_LOCAL_CHANGE_KEY, new Date().toISOString());
  } catch (error) {
    console.error(`Failed to write ${key}`, error);
  }
};

const createStore = <T extends { id: string }>(key: StoreKey, apiEndpoint?: string) => {
  const getAll = (): T[] => safelyRead<T[]>(key, []);
  const replaceAll = (items: T[]) => safelyWrite(key, items);
  const add = (item: T) => {
    const current = getAll();
    replaceAll([item, ...current]);
    if (apiEndpoint) syncToPg(apiEndpoint, 'POST', item);
  };
  const update = (item: T) => {
    const current = getAll();
    const next = current.map((existing) => (existing.id === item.id ? item : existing));
    replaceAll(next);
    if (apiEndpoint) syncToPg(`${apiEndpoint}/${item.id}`, 'PUT', item);
  };
  const remove = (id: string) => {
    const current = getAll();
    replaceAll(current.filter((item) => item.id !== id));
    if (apiEndpoint) syncToPg(`${apiEndpoint}/${id}`, 'DELETE', {});
  };
  return { getAll, replaceAll, add, update, remove };
};

export const taskStore = createStore<Task>('recall_tasks', '/api/tasks');

export const habitStore = createStore<Habit>('recall_habits', '/api/habits');

export const countdownStore = createStore<Countdown>('recall_countdowns', '/api/countdowns');

export const pomodoroStore = createStore<PomodoroRecord>('recall_pomodoro_records');

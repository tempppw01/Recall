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

type StoreKey = 'recall_tasks' | 'recall_habits' | 'recall_countdowns';
const LAST_LOCAL_CHANGE_KEY = 'recall_last_local_change';

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

const createStore = <T extends { id: string }>(key: StoreKey) => {
  const getAll = (): T[] => safelyRead<T[]>(key, []);
  const replaceAll = (items: T[]) => safelyWrite(key, items);
  const add = (item: T) => {
    const current = getAll();
    replaceAll([item, ...current]);
  };
  const update = (item: T) => {
    const current = getAll();
    const next = current.map((existing) => (existing.id === item.id ? item : existing));
    replaceAll(next);
  };
  const remove = (id: string) => {
    const current = getAll();
    replaceAll(current.filter((item) => item.id !== id));
  };
  return { getAll, replaceAll, add, update, remove };
};

export const taskStore = createStore<Task>('recall_tasks');

export const habitStore = createStore<Habit>('recall_habits');

export const countdownStore = createStore<Countdown>('recall_countdowns');

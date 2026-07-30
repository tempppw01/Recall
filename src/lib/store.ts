/**
 * 本地数据存储模块（LocalStorage 缓存 + 服务端数据库持久化）
 *
 * 本模块定义了应用的核心数据模型（Task、Habit、Countdown、Pomodoro），
 * 并提供基于 localStorage 的即时缓存与服务端数据库持久化。
 * LocalStorage 只作为离线缓存；初始化 MySQL 或 SQLite 后，服务端数据库是事实来源。
 */

import { isOnboardingTask } from '@/lib/onboardingTasks';

// ─── 数据模型定义 ───────────────────────────────────────────

/** 任务 */
export interface Task {
  id: string;
  title: string;
  /** 截止日期（ISO 8601 格式） */
  dueDate?: string;
  /** 创建时的时区偏移（分钟），用于跨时区场景 */
  timezoneOffset?: number;
  /** 优先级，数值越大优先级越高 */
  priority: number;
  /** 分类标签 */
  category?: string;
  /** 任务状态 */
  status: 'todo' | 'in_progress' | 'completed';
  /** 自定义标签列表 */
  tags: string[];
  /** 子任务列表 */
  subtasks?: Subtask[];
  /** 附件列表 */
  attachments?: Attachment[];
  /** 重复规则 */
  repeat?: TaskRepeatRule;
  /** 是否置顶 */
  pinned?: boolean;
  /** 提醒时间（ISO 8601） */
  reminderAt?: string;
  /** 提醒模式 */
  reminderPreset?: 'none' | '9am' | 'custom';
  /** 系统或 AI 来源标记，用于避免同步新手引导等临时任务 */
  source?: 'manual' | 'ai' | 'system' | 'onboarding' | string;
  systemType?: string;
  createdAt: string;
  updatedAt?: string;
  /** 手动排序序号 */
  sortOrder?: number;
}

/** 重复类型枚举 */
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

/** 任务重复规则 */
export interface TaskRepeatRule {
  type: RepeatType;
  /** 重复间隔（如每 2 天、每 3 周） */
  interval?: number;
  /** 每周的哪几天（0=周日, 1=周一, ...） */
  weekdays?: number[];
  /** 每月的第几天 */
  monthDay?: number;
}

/** 附件 */
export interface Attachment {
  id: string;
  /** 文件访问 URL */
  url: string;
  filename: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  type: string;
  createdAt: string;
}

/** 子任务 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/** 习惯打卡记录 */
export interface HabitLog {
  /** 打卡日期（YYYY-MM-DD） */
  date: string;
}

/** 习惯 */
export interface Habit {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  /** 历史打卡记录 */
  logs: HabitLog[];
}

/** 倒计时事件 */
export interface Countdown {
  id: string;
  title: string;
  /** 目标日期（ISO 8601 格式） */
  targetDate: string;
  /** 是否置顶 */
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** 番茄钟记录 */
export interface PomodoroRecord {
  id: string;
  startTime: string;
  endTime: string;
  /** 持续时长（分钟） */
  durationMinutes: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: 'preference' | 'task' | 'habit' | 'profile' | 'note';
  source: 'manual' | 'ai' | 'system';
  createdAt: string;
  updatedAt: string;
}

// ─── localStorage Key 定义 ──────────────────────────────────

/** 各数据类型在 localStorage 中的存储键 */
type StoreKey =
  | 'recall_tasks'
  | 'recall_habits'
  | 'recall_countdowns'
  | 'recall_pomodoro_records'
  | 'recall_knowledge_base';

/** 记录最后一次本地数据变更的时间戳，用于同步冲突判断 */
const LAST_LOCAL_CHANGE_KEY = 'recall_last_local_change';

const syncToDatabase = async (endpoint: string, method: string, payload: unknown) => {
  if (endpoint.startsWith('/api/tasks') && isOnboardingTask(payload as object | null | undefined)) return;
  try {
    await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Database sync failed', error);
  }
};

// ─── localStorage 安全读写工具 ──────────────────────────────

/**
 * 安全地从 localStorage 读取并解析 JSON 数据
 * SSR 环境下（window 不存在）返回 fallback
 */
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

/**
 * 安全地将数据序列化后写入 localStorage
 * 同时更新 lastLocalChange 时间戳，供同步模块判断冲突
 */
const safelyWrite = (key: StoreKey, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem(LAST_LOCAL_CHANGE_KEY, new Date().toISOString());
  } catch (error) {
    console.error(`Failed to write ${key}`, error);
  }
};

// ─── 通用 Store 工厂 ───────────────────────────────────────

/**
 * 创建一个基于 localStorage 的泛型 CRUD Store
 *
 * 提供 getAll / replaceAll / add / update / remove 五个操作，
 * 写操作在本地持久化的同时，若配置了 apiEndpoint 则异步同步到服务端数据库。
 *
 * @param key - localStorage 存储键
 * @param apiEndpoint - 可选的 API 路由前缀，用于服务端数据库同步
 */
const createStore = <T extends { id: string }>(key: StoreKey, apiEndpoint?: string) => {
  /** 获取所有记录 */
  const getAll = (): T[] => safelyRead<T[]>(key, []);

  /** 替换全部记录；默认把差异写入服务端数据库。 */
  const replaceAll = (items: T[], options?: { sync?: boolean }) => {
    const previous = getAll();
    safelyWrite(key, items);
    if (!apiEndpoint || options?.sync === false) return;

    const nextIds = new Set(items.map((item) => item.id));
    const previousIds = new Set(previous.map((item) => item.id));
    void Promise.all([
      ...items.map((item) => syncToDatabase(
        previousIds.has(item.id) ? `${apiEndpoint}/${item.id}` : apiEndpoint,
        previousIds.has(item.id) ? 'PUT' : 'POST',
        item,
      )),
      ...previous
        .filter((item) => !nextIds.has(item.id))
        .map((item) => syncToDatabase(`${apiEndpoint}/${item.id}`, 'DELETE', {})),
    ]);
  };

  /** 新增一条记录（插入到列表头部） */
  const add = (item: T) => {
    const current = getAll();
    replaceAll([item, ...current]);
  };

  /** 更新一条记录（按 id 匹配替换） */
  const update = (item: T) => {
    const current = getAll();
    const next = current.map((existing) => (existing.id === item.id ? item : existing));
    replaceAll(next);
  };

  /** 删除一条记录（按 id 过滤） */
  const remove = (id: string) => {
    const current = getAll();
    replaceAll(current.filter((item) => item.id !== id));
  };

  return { getAll, replaceAll, add, update, remove };
};

// ─── 导出各业务 Store 实例 ──────────────────────────────────

/** 任务 Store，同步到 /api/tasks */
export const taskStore = createStore<Task>('recall_tasks', '/api/tasks');

/** 习惯 Store，同步到 /api/habits */
export const habitStore = createStore<Habit>('recall_habits', '/api/habits');

/** 倒计时 Store，同步到 /api/countdowns */
export const countdownStore = createStore<Countdown>('recall_countdowns', '/api/countdowns');

/** 番茄钟 Store，仅本地存储（无远端同步） */
export const pomodoroStore = createStore<PomodoroRecord>('recall_pomodoro_records');
export const knowledgeStore = createStore<KnowledgeEntry>('recall_knowledge_base');

/**
 * 首次进入服务端数据库时加载远端数据；远端为空而浏览器有旧数据时，先完成一次迁移。
 */
export const hydrateStoresFromDatabase = async () => {
  const collections = [
    { endpoint: '/api/tasks', store: taskStore },
    { endpoint: '/api/habits', store: habitStore },
    { endpoint: '/api/countdowns', store: countdownStore },
  ] as const;

  const results = await Promise.all(collections.map(async ({ endpoint, store }) => {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${endpoint} request failed: ${response.status}`);
    const payload = await response.json();
    const remoteItems = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    const localItems = store.getAll();
    if (remoteItems.length === 0 && localItems.length > 0) {
      await Promise.all(localItems.map((item) => syncToDatabase(endpoint, 'POST', item)));
      return localItems;
    }
    store.replaceAll(remoteItems, { sync: false });
    return remoteItems;
  }));

  return {
    tasks: results[0] as Task[],
    habits: results[1] as Habit[],
    countdowns: results[2] as Countdown[],
  };
};

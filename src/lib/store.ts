/**
 * 本地数据存储模块（LocalStorage + 可选 PG 同步）
 *
 * 本模块定义了应用的核心数据模型（Task、Habit、Countdown、Pomodoro），
 * 并提供基于 localStorage 的 CRUD 操作。当用户配置了 PostgreSQL 连接后，
 * 写操作会同时异步同步到远端数据库。
 */

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

// ─── localStorage Key 定义 ──────────────────────────────────

/** 各数据类型在 localStorage 中的存储键 */
type StoreKey = 'recall_tasks' | 'recall_habits' | 'recall_countdowns' | 'recall_pomodoro_records';

/** 记录最后一次本地数据变更的时间戳，用于同步冲突判断 */
const LAST_LOCAL_CHANGE_KEY = 'recall_last_local_change';

// ─── PostgreSQL 动态连接配置（存储在 localStorage） ──────────

const PG_HOST_KEY = 'recall_pg_host';
const PG_PORT_KEY = 'recall_pg_port';
const PG_DATABASE_KEY = 'recall_pg_database';
const PG_USERNAME_KEY = 'recall_pg_username';
const PG_PASSWORD_KEY = 'recall_pg_password';

/**
 * 从 localStorage 读取 PG 配置，构造自定义请求头
 * 这些请求头会被 API 路由解析，用于动态连接用户指定的数据库
 *
 * @returns 包含 x-pg-* 请求头的对象，未配置时返回空对象
 */
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

/**
 * 将本地数据变更异步同步到 PostgreSQL
 * 如果用户未配置 PG 连接，则静默跳过（仅保留本地数据）
 *
 * @param endpoint - API 路由路径（如 /api/tasks）
 * @param method - HTTP 方法（POST / PUT / DELETE）
 * @param payload - 请求体数据
 */
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
 * 写操作在本地持久化的同时，若配置了 apiEndpoint 则异步同步到 PG。
 *
 * @param key - localStorage 存储键
 * @param apiEndpoint - 可选的 API 路由前缀，用于 PG 同步
 */
const createStore = <T extends { id: string }>(key: StoreKey, apiEndpoint?: string) => {
  /** 获取所有记录 */
  const getAll = (): T[] => safelyRead<T[]>(key, []);

  /** 替换全部记录（用于批量导入/同步） */
  const replaceAll = (items: T[]) => safelyWrite(key, items);

  /** 新增一条记录（插入到列表头部） */
  const add = (item: T) => {
    const current = getAll();
    replaceAll([item, ...current]);
    if (apiEndpoint) syncToPg(apiEndpoint, 'POST', item);
  };

  /** 更新一条记录（按 id 匹配替换） */
  const update = (item: T) => {
    const current = getAll();
    const next = current.map((existing) => (existing.id === item.id ? item : existing));
    replaceAll(next);
    if (apiEndpoint) syncToPg(`${apiEndpoint}/${item.id}`, 'PUT', item);
  };

  /** 删除一条记录（按 id 过滤） */
  const remove = (id: string) => {
    const current = getAll();
    replaceAll(current.filter((item) => item.id !== id));
    if (apiEndpoint) syncToPg(`${apiEndpoint}/${id}`, 'DELETE', {});
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

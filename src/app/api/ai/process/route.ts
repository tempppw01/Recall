/**
 * AI 处理 API 路由（核心 AI 功能入口）
 *
 * POST /api/ai/process - 统一的 AI 处理端点，通过 mode 参数区分功能：
 *
 * - mode='time'           → 返回网络校准时间
 * - mode='organize'       → 一键整理已有任务列表（保留 id）
 * - mode='todo-agent'     → 聊天式待办助手（支持图片输入、知识库）
 * - mode='manage-agent'   → 管理助手（基于当前任务列表给出推荐/排序建议）
 * - mode='countdown-agent' → 倒数日识别助手
 * - 默认（Magic Input）    → 单条文本智能拆解为任务
 *
 * 特性：
 * - 支持多 API 端点自动故障转移
 * - 基于 Redis / 内存的会话上下文记忆
 * - 中文相对时间解析（基于网络校准时间）
 * - 自动分类、优先级评估、烹饪任务特殊处理
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { DEFAULT_AI_CONTEXT_LIMIT, normalizeAiContextLimit } from '@/app/services/aiContextLimit';
import { normalizeAiMemoryContent } from '@/app/services/aiMemory';
import { inferRepeatRuleFromText, normalizeTaskRepeatRule } from '@/app/services/repeatRules';

// ─── AI API 配置 ────────────────────────────────────────────

/** 默认 AI API 地址 */
const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';

/** 备用 API 地址列表（故障转移） */
const DEFAULT_BASE_URLS = [
  'https://ai.shuaihong.fun/v1',
  'https://shapi.zeabur.app/v1',
];

/** 根据 base URL 构建 /chat/completions 端点 */
const buildChatCompletionsUrl = (base: string) => {
  const trimmed = base.replace(/\/$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
};

/** 构建 API 端点列表（用户指定的优先，然后是默认备用） */
const resolveBaseUrlList = (primary?: string) => {
  const list = [primary, ...DEFAULT_BASE_URLS].filter(Boolean) as string[];
  return Array.from(new Set(list));
};

// ─── 会话上下文记忆系统 ─────────────────────────────────────

/** 单条上下文记录 */
type ContextEntry = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

/** 内存级上下文缓存（Redis 不可用时的降级方案） */
const MEMORY_CONTEXT_CACHE = new Map<string, ContextEntry[]>();

/** 上下文条数由设置页传入，默认使用 DEFAULT_AI_CONTEXT_LIMIT。 */
/** 将 Redis 中的原始字符串数组解析为结构化的上下文条目 */
function normalizeContextEntries(raw: string[]): ContextEntry[] {
  return raw
    .map((item) => {
      try {
        const parsed = JSON.parse(item);
        const role = parsed?.role === 'assistant' ? 'assistant' : 'user';
        const content = typeof parsed?.content === 'string' ? parsed.content.trim() : '';
        const timestamp = Number(parsed?.timestamp) || Date.now();
        if (!content) return null;
        return { role, content, timestamp } as ContextEntry;
      } catch (error) {
        const content = String(item || '').trim();
        if (!content) return null;
        return { role: 'user', content, timestamp: Date.now() } as ContextEntry;
      }
    })
    .filter(Boolean) as ContextEntry[];
}

/**
 * 获取指定会话的历史上下文消息
 * 优先从 Redis 读取，Redis 不可用时降级到内存缓存
 */
async function getContextMessages(
  redisConfig: any,
  sessionId: string,
  contextLimit: unknown = DEFAULT_AI_CONTEXT_LIMIT,
): Promise<ContextEntry[]> {
  if (!sessionId) {
    return [];
  }

  const limit = normalizeAiContextLimit(contextLimit);

  if (!redisConfig || !redisConfig.host) {
    return (MEMORY_CONTEXT_CACHE.get(sessionId) ?? []).slice(-limit);
  }

  let redis: Redis | null = null;
  try {
    redis = new Redis({
      host: redisConfig.host,
      port: Number(redisConfig.port) || 6379,
      password: redisConfig.password || undefined,
      db: Number(redisConfig.db) || 0,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    const contextKey = `session:${sessionId}:context`;
    const raw = await redis.lrange(contextKey, 0, limit - 1);
    // Redis 存储顺序是最新在前（LPUSH），AI 提示词需要按时间正序排列
    return normalizeContextEntries(raw).reverse();
  } catch (error) {
    console.error('Redis context retrieval failed:', error);
    return (MEMORY_CONTEXT_CACHE.get(sessionId) ?? []).slice(-limit);
  } finally {
    if (redis) {
      try {
        redis.disconnect();
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * 追加一条上下文记录到会话历史
 * 使用 Redis LPUSH + LTRIM 实现固定长度的滑动窗口
 * @param retentionDays - 上下文保留天数（1-3 天）
 */


/**
 * 只保留最近 N 轮上下文，避免旧任务被误带入当前识别。
 * 每轮按单条消息计数（user / assistant 各一条）。
 */
function getRecentContextMessages(messages: ContextEntry[], maxEntries: number): ContextEntry[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  if (maxEntries <= 0) return [];
  return messages.slice(-maxEntries);
}
async function appendContextEntry(
  redisConfig: any,
  sessionId: string,
  entry: ContextEntry,
  retentionDays: number = 1,
  contextLimit: unknown = DEFAULT_AI_CONTEXT_LIMIT,
) {
  if (!sessionId) return;
  const payload = JSON.stringify(entry);
  const limit = normalizeAiContextLimit(contextLimit);

  if (!redisConfig || !redisConfig.host) {
    const current = MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
    const next = [...current, entry].slice(-limit);
    MEMORY_CONTEXT_CACHE.set(sessionId, next);
    return;
  }

  let redis: Redis | null = null;
  try {
    redis = new Redis({
      host: redisConfig.host,
      port: Number(redisConfig.port) || 6379,
      password: redisConfig.password || undefined,
      db: Number(redisConfig.db) || 0,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    const contextKey = `session:${sessionId}:context`;
    // 计算过期时间（秒），默认1天
    const ttlSeconds = Math.max(1, Math.min(3, Math.round(retentionDays))) * 24 * 60 * 60;
    
    await redis.lpush(contextKey, payload);
    await redis.ltrim(contextKey, 0, limit - 1);
    // 设置过期时间
    await redis.expire(contextKey, ttlSeconds);
  } catch (error) {
    console.error('Redis context storage failed:', error);
    const current = MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
    const next = [...current, entry].slice(-limit);
    MEMORY_CONTEXT_CACHE.set(sessionId, next);
  } finally {
    if (redis) {
      try {
        redis.disconnect();
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * 向 AI API 发送聊天请求（支持多端点故障转移）
 * 按顺序尝试每个端点，第一个成功的即返回
 * @throws 所有端点均失败时抛出错误
 */
async function requestChat(baseUrls: string[], apiKey: string | undefined, payload: any) {
  const errors: string[] = [];
  for (const base of baseUrls) {
    const url = process.env.OPENAI_CHAT_COMPLETIONS_URL || buildChatCompletionsUrl(base);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return { res, url };
      }
      errors.push(`${url} -> ${res.status} ${await res.text()}`);
    } catch (err) {
      errors.push(`${url} -> ${(err as Error).message}`);
    }
  }
  throw new Error(`Chat completion failed: ${errors.join(' | ') || 'all endpoints failed'}`);
}

/** 将 AI 处理异常转换为前端可展示、可排查的错误信息 */
function describeAiProcessError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
  const detail = rawMessage.length > 900 ? `${rawMessage.slice(0, 900)}...` : rawMessage;

  if (detail.includes('Chat completion failed')) {
    return {
      error: 'AI 上游请求失败',
      detail,
      hint: '请检查 AI Base URL、API Key、模型名称，以及当前网络是否能访问模型服务。',
    };
  }

  if (detail.includes('LLM invalid JSON')) {
    return {
      error: 'AI 返回格式无法解析',
      detail,
      hint: '模型没有按要求返回结构化结果。可以换模型，或把输入拆短后重试。',
    };
  }

  if (detail.includes('Input is required')) {
    return {
      error: '输入内容为空',
      detail,
      hint: '请先输入要整理的内容后再发送。',
    };
  }

  return {
    error: 'AI 助手处理失败',
    detail,
    hint: '请打开运行日志查看详情；如果反复出现，优先检查模型配置和本地服务日志。',
  };
}

/** 从 AI 响应中提取并解析 JSON 内容 */
function parseChatContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM invalid JSON: empty content');
  }
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`LLM invalid JSON: ${(err as Error).message}`);
  }
}

// ─── 常量与类型定义 ─────────────────────────────────────────

/** 默认聊天模型 */
const DEFAULT_CHAT_MODEL = 'gemini-2.5-flash-lite';

/** 任务分类选项（AI 输出必须从中选择） */
const CATEGORY_OPTIONS = ['工作', '生活', '健康', '学习', '家庭', '财务', '社交'];
const SENSITIVE_KNOWLEDGE_PATTERN = /(?:密码|密钥|api\s*key|token|验证码|身份证|银行卡|信用卡|病历|诊断|药物|工资|收入|贷款)/i;

/** 网络时间校准源（按优先级排列） */
const TIME_SOURCES = [
  'https://www.ntsc.ac.cn',
  'http://www.bjtime.cn',
  'https://www.baidu.com',
  'https://www.taobao.com',
  'https://www.360.cn',
];

type ParsedTask = {
  id?: string;
  title?: string;
  dueDate?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  subtasks?: { title?: string }[];
  scheduleOptions?: AgentScheduleOption[];
  timeReason?: string;
  repeat?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDay?: number;
  };
};

type OrganizePayload = {
  tasks?: ParsedTask[];
};

type AgentItem = {
  title?: string;
  dueDate?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  subtasks?: { title?: string }[];
  scheduleOptions?: AgentScheduleOption[];
  timeReason?: string;
  repeat?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDay?: number;
  };
};

type AgentTaskChanges = {
  title?: string;
  dueDate?: string | null;
  priority?: number;
  category?: string | null;
  tags?: string[];
  subtasks?: { title?: string }[];
  repeat?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDay?: number;
  } | null;
  status?: 'todo' | 'in_progress' | 'completed';
  pinned?: boolean;
};

type TodoAgentTaskSummary = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  dueDate?: string;
  priority: number;
  category?: string;
  tags: string[];
  pinned: boolean;
  updatedAt?: string;
  subtaskCompleted: number;
  subtaskTotal: number;
  subtasks: string[];
  dependsOnTaskIds: string[];
  blockedByTaskIds: string[];
};

type AgentDecisionPayload = {
  type?: 'create' | 'update' | 'delete' | 'reuse' | 'skip' | 'blocked';
  reason?: string;
  taskId?: string;
  taskTitle?: string;
  blockedByTaskIds?: string[];
  item?: AgentItem;
  changes?: AgentTaskChanges;
};

type NormalizedAgentDecision = {
  id: string;
  type: 'create' | 'update' | 'delete' | 'reuse' | 'skip' | 'blocked';
  reason?: string;
  taskId?: string;
  taskTitle?: string;
  blockedByTaskIds?: string[];
  blockedByTaskTitles?: string[];
  item?: ReturnType<typeof normalizeTask>;
  changes?: ReturnType<typeof normalizeTaskChanges>;
};

type CountdownItem = {
  title?: string;
  targetDate?: string;
};

type HabitAgentItem = {
  title?: string;
  checkInDueDate?: string;
  reason?: string;
  frequency?: string;
  category?: string;
  priority?: number;
};

type AgentPayload = {
  reply?: string;
  guidance?: string[];
  items?: AgentItem[];
  decisions?: AgentDecisionPayload[];
  knowledgeUpdates?: unknown[];
};

type NormalizedKnowledgeUpdate = {
  title: string;
  content: string;
  category: 'preference' | 'task' | 'habit' | 'profile' | 'note';
};

type AgentScheduleOption = {
  id?: string;
  label?: string;
  dueDate?: string;
  priority?: number;
  reason?: string;
};

type CountdownPayload = {
  reply?: string;
  items?: CountdownItem[];
  knowledgeUpdates?: unknown[];
};

type HabitAgentPayload = {
  reply?: string;
  items?: HabitAgentItem[];
  knowledgeUpdates?: unknown[];
};

const DEFAULT_TASK = {
  title: 'Untitled',
  dueDate: undefined as string | undefined,
  priority: 0,
  category: '生活',
  tags: [] as string[],
  subtasks: [] as { title: string }[],
};

const DEFAULT_COUNTDOWN = {
  title: '未命名倒数日',
  targetDate: undefined as string | undefined,
};

// ─── 数据规范化工具 ─────────────────────────────────────────

const SHANGHAI_OFFSET_MINUTES = 8 * 60;
const HALF_HOUR_MS = 30 * 60 * 1000;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatShanghaiDateKey(date: Date) {
  const zoned = new Date(date.getTime() + SHANGHAI_OFFSET_MINUTES * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${pad2(zoned.getUTCMonth() + 1)}-${pad2(zoned.getUTCDate())}`;
}

function buildShanghaiDueDateIso(dateKey: string, timeText: string) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const [hourText, minuteText] = timeText.split(':');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return undefined;
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - SHANGHAI_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function getShanghaiHour(dueDate: string) {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Date(parsed.getTime() + SHANGHAI_OFFSET_MINUTES * 60 * 1000).getUTCHours();
}

function hasExplicitLateNightCue(text: string) {
  return /(凌晨|半夜|深夜|夜里|夜间|通宵|熬夜|睡前|0?[0-6]\s*[点时]|0?[0-6][:：][0-5]\d|00[:：][0-5]\d)/i.test(text);
}

function pickReasonableFallbackTime(text: string) {
  if (/(今晚|晚上|晚点|下班|回家后)/.test(text)) return '20:00';
  if (/(下午|午后)/.test(text)) return '15:00';
  if (/(中午|午休)/.test(text)) return '12:00';
  if (/(上午|早上|早晨|一早)/.test(text)) return '09:30';
  if (/(购买|买|购物|采买|采购|快递|寄|取|打印|标签纸)/.test(text)) return '10:00';
  if (/(联系|沟通|回复|发送|打电话|客户|老板|李总)/.test(text)) return '09:30';
  return '10:00';
}

function normalizeSuggestedDueDate(
  dueDate: string | undefined,
  title: string,
  input: string,
  now: Date,
) {
  if (!dueDate) return { dueDate, adjusted: false };
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return { dueDate, adjusted: false };
  const hour = getShanghaiHour(dueDate);
  if (hour === undefined || hour >= 7) return { dueDate, adjusted: false };

  const decisionText = `${input} ${title}`;
  if (hasExplicitLateNightCue(decisionText)) return { dueDate, adjusted: false };

  const fallbackTime = pickReasonableFallbackTime(decisionText);
  let dateKey = formatShanghaiDateKey(parsed);
  let nextDueDate = buildShanghaiDueDateIso(dateKey, fallbackTime);

  if (!nextDueDate || new Date(nextDueDate).getTime() <= now.getTime() + HALF_HOUR_MS) {
    dateKey = formatShanghaiDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    nextDueDate = buildShanghaiDueDateIso(dateKey, fallbackTime);
  }

  return {
    dueDate: nextDueDate || dueDate,
    adjusted: Boolean(nextDueDate && nextDueDate !== dueDate),
  };
}

function normalizeAgentScheduleOptions(options: unknown): AgentScheduleOption[] {
  if (!Array.isArray(options)) return [];
  const seen = new Set<string>();
  const normalized: AgentScheduleOption[] = [];

  options.forEach((option, index) => {
    const source = option as AgentScheduleOption | null | undefined;
    const label = typeof source?.label === 'string' && source.label.trim().length > 0
      ? source.label.trim().slice(0, 36)
      : `方案 ${index + 1}`;
    const dueDate = typeof source?.dueDate === 'string' && source.dueDate.trim().length > 0
      ? source.dueDate.trim()
      : undefined;
    const priority = typeof source?.priority === 'number' && Number.isFinite(source.priority)
      ? Math.max(0, Math.min(2, Math.round(source.priority)))
      : undefined;
    const reason = typeof source?.reason === 'string' && source.reason.trim().length > 0
      ? source.reason.trim().slice(0, 120)
      : undefined;
    if (!dueDate && typeof priority !== 'number') return;
    const dedupeKey = `${label}|${dueDate || ''}|${priority ?? ''}`.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    normalized.push({
      id: typeof source?.id === 'string' && source.id.trim().length > 0 ? source.id.trim() : `schedule-${index + 1}`,
      label,
      dueDate,
      priority,
      reason,
    });
  });

  return normalized.slice(0, 4);
}

/** 规范化 AI 返回的任务字段，确保类型安全和默认值 */
function normalizeTask(data: ParsedTask, sourceText = '') {
  const title = typeof data.title === 'string' && data.title.trim().length > 0 ? data.title.trim() : DEFAULT_TASK.title;
  const priority = typeof data.priority === 'number' && Number.isFinite(data.priority)
    ? Math.max(0, Math.min(2, Math.round(data.priority)))
    : DEFAULT_TASK.priority;
  const category = typeof data.category === 'string' && data.category.trim().length > 0
    ? data.category.trim()
    : DEFAULT_TASK.category;
  const tags = Array.isArray(data.tags) ? data.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : DEFAULT_TASK.tags;
  const dueDate = typeof data.dueDate === 'string' && data.dueDate.trim().length > 0 ? data.dueDate : DEFAULT_TASK.dueDate;
  const timeReason = typeof data.timeReason === 'string' && data.timeReason.trim().length > 0
    ? data.timeReason.trim().slice(0, 120)
    : undefined;
  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks
        .map((item) => ({ title: typeof item?.title === 'string' ? item.title.trim() : '' }))
        .filter((item) => item.title.length > 0)
    : DEFAULT_TASK.subtasks;
  const id = typeof data.id === 'string' && data.id.trim().length > 0 ? data.id.trim() : undefined;

  const repeat = normalizeTaskRepeatRule(data.repeat, dueDate)
    ?? inferRepeatRuleFromText(`${sourceText} ${title}`, dueDate);

  return {
    id,
    title,
    dueDate,
    priority,
    category,
    tags,
    subtasks,
    scheduleOptions: normalizeAgentScheduleOptions(data.scheduleOptions),
    timeReason,
    repeat,
  };
}

function applyReasonableTimingToItem(
  item: ReturnType<typeof normalizeTask>,
  input: string,
  now: Date,
) {
  const itemTiming = normalizeSuggestedDueDate(item.dueDate, item.title, input, now);
  const scheduleOptions = item.scheduleOptions.map((option) => {
    const optionTiming = normalizeSuggestedDueDate(option.dueDate, item.title, input, now);
    return {
      ...option,
      dueDate: optionTiming.dueDate,
      reason: optionTiming.adjusted
        ? [option.reason, '避开凌晨时段，改到更适合执行的时间。'].filter(Boolean).join('；')
        : option.reason,
    };
  });

  return {
    ...item,
    dueDate: itemTiming.dueDate,
    scheduleOptions,
    timeReason: itemTiming.adjusted
      ? [item.timeReason, '原建议落在凌晨，已改到更适合实际处理的时段。'].filter(Boolean).join('；')
      : item.timeReason,
  };
}

function normalizeTaskChanges(data: AgentTaskChanges, sourceText = '') {
  const next: {
    title?: string;
    dueDate?: string | null;
    priority?: number;
    category?: string | null;
    tags?: string[];
    subtasks?: { title: string }[];
    repeat?: {
      type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
      interval?: number;
      weekdays?: number[];
      monthDay?: number;
    } | null;
    status?: 'todo' | 'in_progress' | 'completed';
    pinned?: boolean;
  } = {};

  if (typeof data?.title === 'string' && data.title.trim().length > 0) {
    next.title = data.title.trim();
  }

  if (data?.dueDate === null) {
    next.dueDate = null;
  } else if (typeof data?.dueDate === 'string' && data.dueDate.trim().length > 0) {
    next.dueDate = data.dueDate.trim();
  }

  if (typeof data?.priority === 'number' && Number.isFinite(data.priority)) {
    next.priority = Math.max(0, Math.min(2, Math.round(data.priority)));
  }

  if (data?.category === null) {
    next.category = null;
  } else if (typeof data?.category === 'string' && data.category.trim().length > 0) {
    next.category = data.category.trim();
  }

  if (Array.isArray(data?.tags)) {
    next.tags = data.tags
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag) => tag.trim());
  }

  if (Array.isArray(data?.subtasks)) {
    next.subtasks = data.subtasks
      .map((item) => ({ title: typeof item?.title === 'string' ? item.title.trim() : '' }))
      .filter((item) => item.title.length > 0);
  }

  if (data?.repeat === null) {
    next.repeat = null;
  } else if (data?.repeat && typeof data.repeat === 'object') {
    const repeat = normalizeTaskRepeatRule(data.repeat, typeof next.dueDate === 'string' ? next.dueDate : undefined);
    if (repeat) next.repeat = repeat;
    else if (data.repeat.type === 'none') next.repeat = null;
  } else {
    const repeat = inferRepeatRuleFromText(
      `${sourceText} ${typeof next.title === 'string' ? next.title : ''}`,
      typeof next.dueDate === 'string' ? next.dueDate : undefined,
    );
    if (repeat) next.repeat = repeat;
  }

  if (data?.status === 'todo' || data?.status === 'in_progress' || data?.status === 'completed') {
    next.status = data.status;
  }

  if (typeof data?.pinned === 'boolean') {
    next.pinned = data.pinned;
  }

  return next;
}

/** 规范化倒数日条目，提取 YYYY-MM-DD 格式的日期 */
function normalizeCountdownItem(data: CountdownItem) {
  const title = typeof data.title === 'string' && data.title.trim().length > 0
    ? data.title.trim() : DEFAULT_COUNTDOWN.title;
  let targetDate = typeof data.targetDate === 'string' && data.targetDate.trim().length > 0
    ? data.targetDate.trim() : DEFAULT_COUNTDOWN.targetDate;
  if (targetDate) {
    const isoMatch = targetDate.match(/\d{4}-\d{2}-\d{2}/);
    targetDate = isoMatch ? isoMatch[0] : targetDate;
  }
  return { title, targetDate };
}

function buildNearestTonightIso(baseNow: Date) {
  const shanghaiNow = new Date(baseNow.getTime() + 8 * 60 * 60 * 1000);
  const tonightShanghai = new Date(shanghaiNow);
  tonightShanghai.setUTCHours(20, 0, 0, 0);
  if (tonightShanghai.getTime() <= shanghaiNow.getTime()) {
    tonightShanghai.setUTCDate(tonightShanghai.getUTCDate() + 1);
  }
  return new Date(tonightShanghai.getTime() - 8 * 60 * 60 * 1000).toISOString();
}

function normalizeHabitAgentItem(data: HabitAgentItem, networkNow: Date) {
  const title = typeof data.title === 'string' && data.title.trim().length > 0
    ? data.title.trim()
    : '未命名习惯';
  const checkInDueDate = typeof data.checkInDueDate === 'string' && data.checkInDueDate.trim().length > 0
    ? data.checkInDueDate.trim()
    : undefined;
  const parsed = checkInDueDate ? new Date(checkInDueDate) : null;
  const isParsedValid = Boolean(parsed && !Number.isNaN(parsed.getTime()));
  const fallbackTonightIso = buildNearestTonightIso(networkNow);
  const normalizedCheckInDueDate = isParsedValid
    ? (parsed as Date).toISOString()
    : fallbackTonightIso;

  // AI 偶发返回明显过期的日期（如 2024），统一回退到基于网络时间的最近今晚 20:00（UTC+8）
  const staleThresholdMs = 24 * 60 * 60 * 1000;
  const shouldFallback = isParsedValid
    ? (parsed as Date).getTime() < networkNow.getTime() - staleThresholdMs
    : true;

  const reason = typeof data.reason === 'string' && data.reason.trim().length > 0
    ? data.reason.trim()
    : undefined;
  const frequency = typeof data.frequency === 'string' && data.frequency.trim().length > 0
    ? data.frequency.trim()
    : undefined;
  const category = typeof data.category === 'string' && data.category.trim().length > 0
    ? data.category.trim()
    : undefined;
  const priority = typeof data.priority === 'number' && Number.isFinite(data.priority)
    ? Math.max(0, Math.min(2, Math.round(data.priority)))
    : undefined;

  return {
    title,
    checkInDueDate: shouldFallback ? fallbackTonightIso : normalizedCheckInDueDate,
    reason,
    frequency,
    category,
    priority,
  };
}

/** 基于关键词规则的任务分类（AI 分类失败时的降级方案） */
function classifyCategory(input: string) {
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
  return DEFAULT_TASK.category;
}

/** 根据截止日期和子任务数量评估优先级（AI 未给出时的降级方案） */
function evaluatePriority(dueDate?: string, subtaskCount = 0) {
  const baseNow = Date.now();
  return evaluatePriorityWithNow(dueDate, subtaskCount, baseNow);
}

/** 使用指定的当前时间评估优先级（用于网络校准时间场景） */
function evaluatePriorityWithNow(dueDate: string | undefined, subtaskCount = 0, nowMs: number) {
  if (dueDate) {
    const due = new Date(dueDate).getTime();
    const now = nowMs;
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 2;
    if (diffDays <= 3) return 1;
  }
  if (subtaskCount >= 5) return 2;
  if (subtaskCount >= 3) return 1;
  return DEFAULT_TASK.priority;
}

/** 将 Date 格式化为上海时区的可读字符串（用于 AI 提示词中的时间参考） */
function formatShanghaiDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

/**
 * 从多个网络时间源获取校准时间
 * 通过 HTTP HEAD 请求的 Date 响应头获取服务器时间
 * 所有源均失败时降级为本地时间
 */
async function getNetworkTime() {
  for (const url of TIME_SOURCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      clearTimeout(timeoutId);
      const dateHeader = response.headers.get('date');
      if (!dateHeader) continue;
      const parsed = new Date(dateHeader);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      continue;
    }
  }
  return new Date();
}

/** 判断文本是否为烹饪相关任务 */
function isCookingTask(text: string) {
  return /(做|炒|煮|炖|蒸|烤|煎|焯|凉拌|菜谱|食谱|做菜|下厨|烧菜|拌|切)/.test(text);
}

/** 为烹饪任务生成标准化子任务模板 */
function buildCookingSubtasks(title: string) {
  const cleaned = title.trim();
  return [
    { title: `准备食材（${cleaned}）` },
    { title: '处理食材：清洗/切配/腌制' },
    { title: '下锅烹饪并控制火候' },
    { title: '调味出锅并装盘' },
  ];
}

function normalizeCompareText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_.,，。！？!?:;；、“”"'`()\[\]{}]+/g, '')
    .trim();
}

function scoreTaskRelevance(task: TodoAgentTaskSummary, input: string, nowMs: number) {
  const normalizedInput = normalizeCompareText(input);
  const normalizedTitle = normalizeCompareText(task.title);
  let score = 0;

  if (normalizedInput && normalizedTitle) {
    if (normalizedTitle === normalizedInput) score += 100;
    if (normalizedInput.includes(normalizedTitle) || normalizedTitle.includes(normalizedInput)) score += 60;

    const titleTokens = new Set(task.title.toLowerCase().split(/[\s,，。.!?！？:：/]+/).filter(Boolean));
    const inputTokens = Array.from(new Set(input.toLowerCase().split(/[\s,，。.!?！？:：/]+/).filter(Boolean)));
    score += inputTokens.reduce((acc, token) => acc + (titleTokens.has(token) ? 8 : 0), 0);
  }

  if (task.status === 'in_progress') score += 35;
  if (task.status === 'todo') score += 15;
  if (task.status === 'completed') score -= 20;
  if (task.pinned) score += 12;
  score += task.priority * 10;

  if (task.dueDate) {
    const dueMs = new Date(task.dueDate).getTime();
    if (Number.isFinite(dueMs)) {
      const diff = dueMs - nowMs;
      if (diff <= 0) score += 30;
      else if (diff <= 24 * 60 * 60 * 1000) score += 18;
      else if (diff <= 3 * 24 * 60 * 60 * 1000) score += 8;
    }
  }

  if (task.updatedAt) {
    const updatedMs = new Date(task.updatedAt).getTime();
    if (Number.isFinite(updatedMs) && nowMs - updatedMs <= 7 * 24 * 60 * 60 * 1000) {
      score += 6;
    }
  }

  return score;
}

function normalizeTodoAgentTasks(tasks: any[], contextLimit: unknown = DEFAULT_AI_CONTEXT_LIMIT): TodoAgentTaskSummary[] {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task) => {
      const status: TodoAgentTaskSummary['status'] =
        task?.status === 'completed' ? 'completed' : task?.status === 'in_progress' ? 'in_progress' : 'todo';
      return {
        id: typeof task?.id === 'string' ? task.id.trim() : '',
        title: typeof task?.title === 'string' ? task.title.trim() : '',
        status,
        dueDate: typeof task?.dueDate === 'string' && task.dueDate.trim().length > 0 ? task.dueDate : undefined,
        priority: typeof task?.priority === 'number' && Number.isFinite(task.priority)
          ? Math.max(0, Math.min(2, Math.round(task.priority)))
          : 0,
        category: typeof task?.category === 'string' && task.category.trim().length > 0 ? task.category.trim() : undefined,
        tags: Array.isArray(task?.tags)
          ? task.tags.filter((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0).map((tag: string) => tag.trim())
          : [],
        pinned: Boolean(task?.pinned),
        updatedAt: typeof task?.updatedAt === 'string' && task.updatedAt.trim().length > 0 ? task.updatedAt : undefined,
        subtaskCompleted: Number.isFinite(task?.subtaskCompleted) ? Math.max(0, Number(task.subtaskCompleted)) : 0,
        subtaskTotal: Number.isFinite(task?.subtaskTotal) ? Math.max(0, Number(task.subtaskTotal)) : 0,
        subtasks: Array.isArray(task?.subtasks)
          ? task.subtasks.filter((title: unknown) => typeof title === 'string' && title.trim().length > 0).map((title: string) => title.trim())
          : [],
        dependsOnTaskIds: Array.isArray(task?.dependsOnTaskIds)
          ? task.dependsOnTaskIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0).map((id: string) => id.trim())
          : [],
        blockedByTaskIds: Array.isArray(task?.blockedByTaskIds)
          ? task.blockedByTaskIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0).map((id: string) => id.trim())
          : [],
      };
    })
    .filter((task) => task.id && task.title)
    .slice(0, normalizeAiContextLimit(contextLimit));
}

function normalizeKnowledgeContext(knowledge: any[], contextLimit: unknown = DEFAULT_AI_CONTEXT_LIMIT) {
  return (Array.isArray(knowledge) ? knowledge : [])
    .map((entry) => {
      const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
      const content = typeof entry?.content === 'string' ? entry.content.trim() : '';
      if (!title || !content) return null;
      return {
        id: typeof entry?.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : undefined,
        title: title.slice(0, 100),
        content: content.slice(0, 1200),
        category: typeof entry?.category === 'string' ? entry.category.slice(0, 40) : 'note',
        updatedAt: typeof entry?.updatedAt === 'string' ? entry.updatedAt : undefined,
      };
    })
    .filter(Boolean)
    .slice(0, Math.min(10, normalizeAiContextLimit(contextLimit)));
}

function normalizeChatHistory(history: any[], contextLimit: unknown = DEFAULT_AI_CONTEXT_LIMIT) {
  return (Array.isArray(history) ? history : [])
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
      const content = typeof message?.content === 'string' ? message.content.trim() : '';
      if (!role || !content) return null;
      return { role, content: content.slice(0, 1200) };
    })
    .filter(Boolean)
    .slice(-Math.min(12, normalizeAiContextLimit(contextLimit))) as Array<{ role: 'user' | 'assistant'; content: string }>;
}

const normalizeKnowledgeCategory = (value: unknown): NormalizedKnowledgeUpdate['category'] => (
  value === 'preference'
  || value === 'task'
  || value === 'habit'
  || value === 'profile'
  || value === 'note'
    ? value
    : 'note'
);

const inferKnowledgeCategory = (content: string): NormalizedKnowledgeUpdate['category'] => {
  if (/习惯|每天|每周|打卡|运动|阅读|学习|作息/.test(content)) return 'habit';
  if (/喜欢|不喜欢|偏好|倾向|优先|避免|默认/.test(content)) return 'preference';
  if (/我是|我在|我住|我的工作|我的公司|我的岗位|家庭|孩子|宠物/.test(content)) return 'profile';
  if (/任务|项目|计划|做过|完成|推进|处理/.test(content)) return 'task';
  return 'note';
};

function normalizeAgentKnowledgeUpdates(updates: unknown): NormalizedKnowledgeUpdate[] {
  if (!Array.isArray(updates)) return [];
  const seen = new Set<string>();

  return updates
    .map((update) => {
      const source = update as Partial<NormalizedKnowledgeUpdate> | string | null | undefined;
      const content = typeof source === 'string'
        ? normalizeAiMemoryContent(source)
        : normalizeAiMemoryContent(typeof source?.content === 'string' ? source.content : '');
      if (content.length < 4 || SENSITIVE_KNOWLEDGE_PATTERN.test(content)) return null;
      const category = typeof source === 'string' ? inferKnowledgeCategory(content) : normalizeKnowledgeCategory(source?.category);
      const title = typeof source !== 'string' && typeof source?.title === 'string' && source.title.trim().length > 0
        ? source.title.trim().slice(0, 80)
        : content.slice(0, 36);
      const dedupeKey = content.toLowerCase();
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      return {
        title,
        content,
        category,
      };
    })
    .filter((entry): entry is NormalizedKnowledgeUpdate => Boolean(entry))
    .slice(0, 6);
}

function findBestTaskMatch(tasks: TodoAgentTaskSummary[], title: string, taskId?: string) {
  if (taskId) {
    const byId = tasks.find((task) => task.id === taskId);
    if (byId) return byId;
  }

  const normalizedTarget = normalizeCompareText(title);
  if (!normalizedTarget) return undefined;

  return tasks.find((task) => {
    const normalizedTitle = normalizeCompareText(task.title);
    return normalizedTitle === normalizedTarget
      || normalizedTitle.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedTitle);
  });
}

function buildTodoPlanContext(tasks: TodoAgentTaskSummary[], input: string, networkNow: Date) {
  const nowMs = networkNow.getTime();
  const openTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const scored = [...tasks]
    .sort((a, b) => scoreTaskRelevance(b, input, nowMs) - scoreTaskRelevance(a, input, nowMs));
  const relatedTasks = scored.slice(0, 10);
  const activeTasks = [...openTasks]
    .sort((a, b) => scoreTaskRelevance(b, input, nowMs) - scoreTaskRelevance(a, input, nowMs))
    .slice(0, 20);
  const completedMatches = [...completedTasks]
    .sort((a, b) => scoreTaskRelevance(b, input, nowMs) - scoreTaskRelevance(a, input, nowMs))
    .slice(0, 6);

  const dueTodayCount = openTasks.filter((task) => {
    if (!task.dueDate) return false;
    const diff = new Date(task.dueDate).getTime() - nowMs;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  }).length;
  const overdueCount = openTasks.filter((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate).getTime() <= nowMs;
  }).length;
  const upcomingTimedTasks = openTasks
    .filter((task) => {
      if (!task.dueDate) return false;
      const dueMs = new Date(task.dueDate).getTime();
      return Number.isFinite(dueMs) && dueMs >= nowMs && dueMs <= nowMs + 14 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
    .slice(0, 30)
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      category: task.category,
    }));
  const busyDays = upcomingTimedTasks.reduce<Record<string, number>>((acc, task) => {
    const key = task.dueDate ? task.dueDate.slice(0, 10) : '';
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    overview: {
      total: tasks.length,
      open: openTasks.length,
      completed: completedTasks.length,
      inProgress: openTasks.filter((task) => task.status === 'in_progress').length,
      highPriority: openTasks.filter((task) => task.priority >= 2).length,
      dueToday: dueTodayCount,
      overdue: overdueCount,
    },
    relatedTasks,
    activeTasks,
    completedMatches,
    scheduleContext: {
      upcomingTimedTasks,
      busyDays,
    },
  };
}

function normalizeTodoAgentDecisions(
  rawDecisions: AgentDecisionPayload[],
  fallbackItems: AgentItem[],
  tasks: TodoAgentTaskSummary[],
  input: string,
  now: Date,
) {
  const next: NormalizedAgentDecision[] = [];
  const seenCreateTitles = new Set<string>();

  rawDecisions.forEach((decision, index) => {
    const type = decision?.type === 'update'
      || decision?.type === 'delete'
      || decision?.type === 'reuse'
      || decision?.type === 'skip'
      || decision?.type === 'blocked'
      ? decision.type
      : 'create';
    const reason = typeof decision?.reason === 'string' && decision.reason.trim().length > 0
      ? decision.reason.trim()
      : undefined;
    const itemSource = decision?.item ?? {};
    const titleCandidate = typeof decision?.taskTitle === 'string' && decision.taskTitle.trim().length > 0
      ? decision.taskTitle.trim()
      : typeof itemSource?.title === 'string' && itemSource.title.trim().length > 0
        ? itemSource.title.trim()
        : '';
    const matchedTask = findBestTaskMatch(tasks, titleCandidate, decision?.taskId);

    if (type === 'create') {
      const normalizedItem = applyReasonableTimingToItem(normalizeTask(itemSource, input), input, now);
      const matchedExisting = findBestTaskMatch(tasks, normalizedItem.title, decision?.taskId);
      if (matchedExisting) {
        next.push({
          id: `decision-${index}-${matchedExisting.id}`,
          type: matchedExisting.status === 'completed' ? 'skip' : 'reuse',
          reason: reason ?? (matchedExisting.status === 'completed' ? '现有计划里已有完成记录，无需重复新建。' : '现有计划中已有同主题任务，优先继续推进更合适。'),
          taskId: matchedExisting.id,
          taskTitle: matchedExisting.title,
        });
        return;
      }

      const normalizedTitle = normalizeCompareText(normalizedItem.title);
      if (!normalizedTitle || seenCreateTitles.has(normalizedTitle)) return;
      seenCreateTitles.add(normalizedTitle);
      next.push({
        id: `decision-${index}-create`,
        type: 'create',
        reason,
        item: normalizedItem,
      });
      return;
    }

    if (!matchedTask) return;

    if (type === 'update') {
      const changes = normalizeTaskChanges(decision?.changes ?? {}, input);
      if (Object.keys(changes).length === 0) return;
      next.push({
        id: `decision-${index}-${matchedTask.id}`,
        type: 'update',
        reason,
        taskId: matchedTask.id,
        taskTitle: matchedTask.title,
        changes,
      });
      return;
    }

    if (type === 'delete') {
      next.push({
        id: `decision-${index}-${matchedTask.id}`,
        type: 'delete',
        reason,
        taskId: matchedTask.id,
        taskTitle: matchedTask.title,
      });
      return;
    }

    next.push({
      id: `decision-${index}-${matchedTask.id}`,
      type,
      reason,
      taskId: matchedTask.id,
      taskTitle: matchedTask.title,
      blockedByTaskIds: Array.isArray(decision?.blockedByTaskIds)
        ? decision.blockedByTaskIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : matchedTask.blockedByTaskIds,
      blockedByTaskTitles: (Array.isArray(decision?.blockedByTaskIds) ? decision.blockedByTaskIds : matchedTask.blockedByTaskIds)
        .map((id) => tasks.find((task) => task.id === id)?.title)
        .filter((title): title is string => Boolean(title)),
    });
  });

  if (next.length === 0 && fallbackItems.length > 0) {
    fallbackItems.forEach((item, index) => {
      const normalizedItem = normalizeTask(item, input);
      const normalizedTitle = normalizeCompareText(normalizedItem.title);
      if (!normalizedTitle || seenCreateTitles.has(normalizedTitle)) return;
      seenCreateTitles.add(normalizedTitle);
      next.push({
        id: `fallback-create-${index}`,
        type: 'create',
        item: normalizedItem,
      });
    });
  }

  return next.slice(0, 10);
}

// ─── 主路由处理器 ───────────────────────────────────────────

/**
 * POST /api/ai/process
 * 统一 AI 处理入口，根据 mode 分发到不同的处理逻辑
 */
export async function POST(req: NextRequest) {
  try {
    const { input, mode, images, tasks, knowledge, chatHistory, apiKey, apiBaseUrl, chatModel, embeddingModel, rerankModel, redisConfig, sessionId, retentionDays, contextLimit } = await req.json();
    const effectiveContextLimit = normalizeAiContextLimit(contextLimit);

    const resolvedBaseUrl = apiBaseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
    const resolvedChatModel = chatModel || process.env.OPENAI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
    const baseUrlList = resolveBaseUrlList(resolvedBaseUrl);

    if (mode === 'time') {
      const networkNow = await getNetworkTime();
      return NextResponse.json({
        serverTime: networkNow.toISOString(),
        serverTimeText: formatShanghaiDateTime(networkNow),
      });
    }

    const normalizedInput = typeof input === 'string' ? input : '';
    // 允许仅发送图片（无文本），前端会把 dataUrl 透传为 images 数组
    const normalizedImages = Array.isArray(images)
      ? images.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];
    if (!normalizedInput && normalizedImages.length === 0) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    const contextMessages = await getContextMessages(redisConfig, sessionId, effectiveContextLimit);
    const historyMessages = contextMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    if (mode === 'organize') {
      // 一键整理：传入任务数组，返回整理后的任务数组（保留 id）
      const payload = typeof normalizedInput === 'string'
        ? JSON.parse(normalizedInput) as OrganizePayload
        : normalizedInput as OrganizePayload;
      const tasksToOrganize = Array.isArray(payload?.tasks) ? payload.tasks : [];

      if (tasksToOrganize.length === 0) {
        return NextResponse.json({ error: 'Tasks are required for organize mode' }, { status: 400 });
      }

      const organizePayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是一个任务整理助手。请对用户提供的任务列表进行整理：
1) 保留每个任务的 id，不新增、不删除任务。
2) 优化 title 的可读性，必要时合并/拆分重复任务。
3) 校正 priority (必须为 0/1/2)、category (只能从 ${CATEGORY_OPTIONS.join(' / ')})、tags。
4) dueDate 若无或无法解析则设为 null，必须为 ISO 8601 UTC。
5) subtasks 仅保留 title。
6) 识别并优化重复逻辑 repeat (type: 'none'|'daily'|'weekly'|'monthly'|'custom', weekdays: 0-6, interval 为正整数)。例如“每周一到周六”对应 {type:'weekly', weekdays:[1,2,3,4,5,6]}，“工作日”对应 [1,2,3,4,5]。
7) **记忆功能**：请务必参考提供的“历史对话上下文”来理解用户的偏好或特定上下文。
请只返回 JSON：{ "tasks": [{ "id": string, "title": string, "dueDate": string|null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}], "repeat": { "type": string, "interval": number, "weekdays": number[], "monthDay": number } | null }] }。不要包含 null/undefined 属性时可省略。`,
          },
          ...historyMessages,
          {
            role: 'user',
            content: JSON.stringify({ tasks: tasksToOrganize }),
          },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: organizeRes } = await requestChat(baseUrlList, apiKey, organizePayload);
      const organizePayloadJson = await organizeRes.json();
      const rawResult = parseChatContent(organizePayloadJson) as { tasks?: ParsedTask[] };
      // 统一字段并尽量保留原始 id
      const normalizedTasks = Array.isArray(rawResult?.tasks)
        ? rawResult.tasks.map((task) => normalizeTask(task, normalizedInput))
        : [];
      const normalizedCategoryTasks = normalizedTasks.map((task, index) => ({
        ...task,
        id: task.id || tasksToOrganize[index]?.id || Math.random().toString(36).substring(2, 9),
        category: CATEGORY_OPTIONS.includes(task.category || '')
          ? task.category
          : classifyCategory(`${task.title}`),
        priority: typeof task.priority === 'number'
          ? task.priority
          : evaluatePriority(task.dueDate, task.subtasks?.length || 0),
      }));

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: normalizedInput,
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: JSON.stringify({ tasks: normalizedCategoryTasks }),
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);

      return NextResponse.json({ tasks: normalizedCategoryTasks });
    }

    if (mode === 'casual-chat') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
      const incomingKnowledge = normalizeKnowledgeContext(Array.isArray(knowledge) ? knowledge : [], effectiveContextLimit);
      const incomingChatHistory = normalizeChatHistory(Array.isArray(chatHistory) ? chatHistory : [], effectiveContextLimit);

      const chatPayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是 Recall 的“随便聊聊”助手。你可以像普通 AI 对话一样自然回答，也可以在相关时参考知识库。
规则：
1) 如果知识库没有相关资料，就按普通对话正常回答，不要假装查到了资料。
2) 如果知识库资料相关，优先参考它，但不要机械复述；资料冲突时说明不确定并以用户当前输入为准。
3) 可以参考知识库理解用户偏好、作息、地点和表达习惯。
4) 当前时间：${serverTimeText}（中国标准时间，UTC+8）。
5) 如果当前模型具备联网/搜索能力，可以使用模型能力回答；否则不要编造实时结果。
6) 输出 JSON：{ "reply": string, "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }。
7) knowledgeUpdates 用于自动沉淀知识库，只保存当前对话里用户明确提供、后续全局功能可能复用的资料，例如个人偏好、习惯规律、个人资料、做过/正在推进的事、可复用经验；不要保存敏感信息、密码密钥、纯寒暄、未经确认的推测或你的普通回答。没有合适内容返回 []。`,
          },
          {
            role: 'system',
            content: JSON.stringify({
              retrieval: {
                embeddingModel: typeof embeddingModel === 'string' ? embeddingModel : '',
                rerankModel: typeof rerankModel === 'string' ? rerankModel : '',
                note: '前端已按本地相关度筛出候选知识；如配置了 embedding/rerank 模型，后续可替换为服务端向量检索与重排序。',
              },
              knowledge: incomingKnowledge,
            }),
          },
          ...incomingChatHistory,
          { role: 'user', content: normalizedInput },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: chatRes } = await requestChat(baseUrlList, apiKey, chatPayload);
      const chatPayloadJson = await chatRes.json();
      const raw = parseChatContent(chatPayloadJson) as any;
      const normalizedKnowledgeUpdates = normalizeAgentKnowledgeUpdates(raw?.knowledgeUpdates);
      const reply = typeof raw?.reply === 'string' && raw.reply.trim().length > 0
        ? raw.reply.trim()
        : '我在，继续说。';

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: `[casual-chat] ${normalizedInput}`,
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);

      return NextResponse.json({
        reply,
        knowledgeUpdates: normalizedKnowledgeUpdates,
        usedKnowledgeCount: incomingKnowledge.length,
        serverTime: networkNow.toISOString(),
        serverTimeText,
      });
    }

    if (mode === 'todo-agent') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
      const incomingTasks = normalizeTodoAgentTasks(Array.isArray(tasks) ? tasks : [], effectiveContextLimit);
      const incomingKnowledge = normalizeKnowledgeContext(Array.isArray(knowledge) ? knowledge : [], effectiveContextLimit);
      const planContext = buildTodoPlanContext(incomingTasks, normalizedInput, networkNow);
      // todo-agent：返回聊天回复 + 待办清单
      // 有图片时按 OpenAI 多模态格式构造 content，否则保持纯文本
      const userContent = normalizedImages.length > 0
        ? [
            ...(normalizedInput.trim()
              ? [{ type: 'text', text: normalizedInput }]
              : []),
            ...normalizedImages.map((url) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ]
        : normalizedInput;
      const agentPayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是记录助手，负责先审视现有计划，再按用户意图决定是直接回答，还是输出“新增 / 修改 / 删除 / 复用 / 跳过 / 阻塞”的待办决策。请遵循：
1) 用简短中文回复用户，字段名 reply，不要输出 Markdown 或多余前缀。
2) 如果用户问的是普通信息、位置、旅行、事实解释或可联网搜索类问题，直接在 reply 中回答；decisions 返回 []，guidance 返回 [] 或少量相关建议。不要因为你是记录助手就拒绝回答。
3) 如果底层模型具备联网/搜索能力，可以按模型能力完成回答；如果当前模型无法联网，只说明你基于已有上下文和模型知识回答，不要编造实时结果。
4) 只有当用户明确要记录、规划、拆解、补充、修改、延期、提前或删除任务时，才生成 guidance 数组（2-4条）和 decisions 数组。
5) 必须先阅读当前计划状态（tasks / planContext），再决定是 create / update / delete / reuse / skip / blocked。
6) 生成 decisions 数组。每项结构：
- create: { "type":"create", "reason": string, "item": { title / dueDate / timeReason / priority / category / tags / subtasks / scheduleOptions / repeat } }
- update: { "type":"update", "reason": string, "taskId": string, "taskTitle": string, "changes": { title? / dueDate? / priority? / category? / tags? / subtasks? / repeat? / status? / pinned? } }
- delete: { "type":"delete", "reason": string, "taskId": string, "taskTitle": string }
- reuse: { "type":"reuse", "reason": string, "taskId": string, "taskTitle": string }
- skip: { "type":"skip", "reason": string, "taskId": string, "taskTitle": string }
- blocked: { "type":"blocked", "reason": string, "taskId": string, "taskTitle": string, "blockedByTaskIds": string[] }
7) 如果用户是在补充、修改、延期、提前、删除某个已有任务，优先返回 update 或 delete，不要新建。
8) 如果当前事项在现有未完成任务里已经存在且无需修改，优先返回 reuse，不要重复创建。
9) 如果当前事项在现有已完成任务里已经完成，返回 skip，不要重新复活。
10) 只有当现有计划里不存在合适任务，且确实需要新增执行项时，才返回 create。
11) 如果存在明显前置依赖未完成，返回 blocked，而不是 create。
12) create 类型中的 item 仅在确实要新建时给出。
13) update 类型中的 changes 只包含真正要改动的字段；不改的字段不要返回。若要清空 dueDate/category/repeat，可显式返回 null。
14) 如果 update 是给已有任务补充子任务，changes.subtasks 必须返回合并后的完整子任务列表（原有子任务 + 新增子任务），不要只返回新增项。
15) 不要在 reply 中提前说“已添加/已修改/已删除”。在用户点击应用前，只能说“建议新增/建议修改/建议删除”或“已整理为可应用的修改”。
16) category 仅可使用：${CATEGORY_OPTIONS.join(' / ')}。
17) priority 必须为 0/1/2。
18) 当前时间为 ${serverTimeText}（中国标准时间，UTC+8），解析中文相对时间请以此为准，并转 ISO 8601 字符串；无法解析则 dueDate 为 null。
19) 新建任务必须先做“时间建议判断”：结合当前时间、任务性质、已有日程、知识库中的作息/地点/偏好，选择一个现实可执行的默认 dueDate，并在 item.timeReason 中用一句短中文说明推荐依据。不要输出长篇推理，只输出可展示的结论依据。
20) 除非用户明确说“凌晨/半夜/深夜/夜里/夜间/通宵/熬夜/睡前”或给出 00:00-06:59 的精确时间，否则普通购物、沟通、发送、检查、整理、办公、家务任务禁止推荐 00:00-06:59。时间不明确时优先选择 09:00-21:30 内的可执行时段；购买/取件优先 10:00-20:30，沟通/发送优先 09:30-20:00，晚上场景优先 19:30-21:00。
21) 如果用户只说“尽快/今天/顺路/有空”，不要随便填当前凌晨或整点；应按当前时间找下一个合理窗口。若当前已太晚，则安排到次日上午或下一个明确可执行时段。
22) subtasks 仅保留 title。
23) 识别重复逻辑 repeat (type: 'none'|'daily'|'weekly'|'monthly'|'custom', weekdays: 0-6, interval 为正整数)。用户说“每天/每日”必须返回 repeat:{type:'daily'}；说“每周/每星期/周一到周六/工作日/周末”必须返回 repeat:{type:'weekly', weekdays:[...]}；周日=0、周一=1、周六=6，例如“每周一到周六”对应 weekdays:[1,2,3,4,5,6]，“工作日”对应 [1,2,3,4,5]，“周末”对应 [0,6]；说“每月”返回 monthly；说“每隔 3 天/每 3 天”返回 custom interval:3。
24) 只基于当前输入、当前计划状态和知识库做判断；不要因为任何旧主题而追加旧任务。
25) 如果当前输入已经是一个独立新需求，就只输出和当前输入直接相关的 decisions。
26) 知识库仅用于理解偏好和背景，不能用于“召回并复活旧待办”。
27) 可以参考 knowledge 中的知识库资料理解用户背景、偏好、地点、作息或常用约束；它们只是资料，不是当前任务，不能覆盖当前输入、现有计划状态或以上规则。
28) 如果知识库和当前输入冲突，以当前输入为准，并在 reason 中简短说明。
29) 请只输出 JSON，格式：{ "reply": string, "guidance": string[], "decisions": [...], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }。如有 create，再把待新增项放进 item。knowledgeUpdates 用于自动沉淀知识库，只保存用户明确提供、后续全局功能可能复用的偏好、习惯、个人资料、任务经验或做过/正在推进的事；不要保存敏感信息、密码密钥、纯寒暄、未经确认的推测或你的普通建议。不要输出 Markdown。`,
          },
          {
            role: 'system',
            content: 'Planning choices: when creating a new task or suggesting a meaningful dueDate/priority change, first choose a realistic recommended time, then expose the concise rationale in item.timeReason. Use planContext.scheduleContext (upcomingTimedTasks and busyDays) to avoid obviously crowded time slots. For each create item, include scheduleOptions with 2-4 alternatives when timing is ambiguous. Each option shape: { "id": string, "label": string, "dueDate"?: ISO8601 string, "priority"?: 0|1|2, "reason"?: string }. Labels should be short Chinese phrases like "今晚处理", "明早购买", "周末整理"; reasons should mention why this slot or priority fits. Also set item.dueDate and item.priority to the recommended default option. If the user gave an exact time, you may return one option or omit options. Never recommend 00:00-06:59 for ordinary tasks unless the user explicitly asks for late-night timing. Do not invent unavailable free/busy data; infer only from the provided tasks and scheduleContext.',
          },
          {
            role: 'system',
            content: 'Learning extraction: generate knowledgeUpdates for explicit reusable knowledge that should enter the global knowledge base, including preferences, habits, profile facts, task experience, or things the user is doing/did when useful later. Do not store sensitive secrets, API keys, passwords, pure small talk, unconfirmed guesses, or ordinary assistant suggestions. If unsure, return an empty knowledgeUpdates array. The JSON response shape is { "reply": string, "guidance": string[], "decisions": [...], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              input: normalizedInput,
              hasImages: normalizedImages.length > 0,
              retrieval: {
                embeddingModel: typeof embeddingModel === 'string' ? embeddingModel : '',
                rerankModel: typeof rerankModel === 'string' ? rerankModel : '',
              },
              knowledge: incomingKnowledge,
              planContext,
              tasks: incomingTasks,
            }),
          },
          ...(normalizedImages.length > 0
            ? [{ role: 'user' as const, content: userContent }]
            : []),
        ],
        response_format: { type: 'json_object' },
      };

      const { res: agentRes } = await requestChat(baseUrlList, apiKey, agentPayload);
      const agentPayloadJson = await agentRes.json();
      const rawResult = parseChatContent(agentPayloadJson) as AgentPayload;
      const normalizedKnowledgeUpdates = normalizeAgentKnowledgeUpdates(rawResult?.knowledgeUpdates);
      const normalizedItems = Array.isArray(rawResult?.items) ? rawResult.items : [];
      const normalizedDecisions = normalizeTodoAgentDecisions(
        Array.isArray(rawResult?.decisions) ? rawResult.decisions : [],
        normalizedItems,
        incomingTasks,
        normalizedInput,
        networkNow,
      );
      const normalizedGuidance = Array.isArray(rawResult?.guidance)
        ? rawResult.guidance
            .map((tip) => (typeof tip === 'string' ? tip.trim() : ''))
            .filter((tip) => tip.length > 0)
            .slice(0, 4)
        : [];
      const normalizedCategoryItems = normalizedDecisions
        .filter((decision) => decision.type === 'create' && decision.item)
        .map((decision) => ({
          ...decision.item!,
          category: CATEGORY_OPTIONS.includes(decision.item?.category || '')
            ? decision.item?.category
            : classifyCategory(`${decision.item?.title || ''}`),
          priority: typeof decision.item?.priority === 'number'
            ? decision.item.priority
            : evaluatePriorityWithNow(decision.item?.dueDate, decision.item?.subtasks?.length || 0, networkNow.getTime()),
        }));

      return NextResponse.json({
        reply: typeof rawResult?.reply === 'string' && rawResult.reply.trim().length > 0
          ? rawResult.reply.trim()
          : '我先对照了当前计划，已经整理好新增和复用建议。',
        guidance: normalizedGuidance,
        decisions: normalizedDecisions,
        items: normalizedCategoryItems,
        knowledgeUpdates: normalizedKnowledgeUpdates,
        serverTime: networkNow.toISOString(),
        serverTimeText,
      });
    }

    

    if (mode === 'manage-agent') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
      const incomingTasks = Array.isArray(tasks) ? tasks : [];
      const incomingKnowledge = normalizeKnowledgeContext(Array.isArray(knowledge) ? knowledge : [], effectiveContextLimit);

      // 精简任务，避免 prompt 过长
      const normalizedTasks = incomingTasks
        .map((t: any) => ({
          id: String(t?.id || ''),
          title: String(t?.title || '').trim(),
          status: t?.status === 'completed' ? 'completed' : t?.status === 'in_progress' ? 'in_progress' : 'todo',
          dueDate: typeof t?.dueDate === 'string' ? t.dueDate : null,
          priority: typeof t?.priority === 'number' ? t.priority : 0,
          category: typeof t?.category === 'string' ? t.category : '',
          tags: Array.isArray(t?.tags) ? t.tags : [],
        }))
        .filter((t: any) => t.id && t.title)
        .slice(0, effectiveContextLimit);

      const managePayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: 'Learning extraction: generate knowledgeUpdates for explicit reusable knowledge that should enter the global knowledge base, including preferences, habits, profile facts, task management experience, or things the user is doing/did when useful later. Do not store sensitive secrets, API keys, passwords, pure small talk, unconfirmed guesses, or ordinary assistant suggestions. If unsure, return an empty knowledgeUpdates array. The JSON response shape is { "reply": string, "recommendations": [...], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }.',
          },
          {
            role: 'system',
            content: `你是 manage-agent（任务管理助手），基于用户的任务列表给出建议。

输出 JSON：{ "reply": string, "recommendations": [{"id": string, "title": string, "reason": string, "suggestedPriority": 0|1|2, "suggestedPinned"?: boolean, "suggestedDuePreset"?: "today"|"tomorrow"|"tonight"}], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }。

规则：
1) 推荐最多 8 条。
2) 必须从给定 tasks 中挑选，id 必须存在于 tasks。
3) suggestedPriority 必须为 0/1/2。
3.1) suggestedPinned 若提供，必须为 boolean。仅在你明确建议“置顶/取消置顶”时给出。
3.2) suggestedDuePreset 若提供，只能为 today/tomorrow/tonight。仅在你明确建议“改日期到今天/明天/今晚”时给出。
3.3) 每条推荐至少给出一个可执行快捷建议（suggestedPriority / suggestedPinned / suggestedDuePreset 其一）。
4) 优先考虑：逾期、今天到期、重要（priority高）、长期未完成。
5) 相关时参考 knowledge 中的知识库资料理解用户偏好、作息和常用约束；知识库和当前输入冲突时，以当前输入为准。
6) 当前时间 ${serverTimeText}（中国标准时间，UTC+8）。
7) 只输出 JSON，不要 Markdown。`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              input: normalizedInput,
              retrieval: {
                embeddingModel: typeof embeddingModel === 'string' ? embeddingModel : '',
                rerankModel: typeof rerankModel === 'string' ? rerankModel : '',
              },
              knowledge: incomingKnowledge,
              tasks: normalizedTasks,
            }),
          },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: manageRes } = await requestChat(baseUrlList, apiKey, managePayload);
      const managePayloadJson = await manageRes.json();
      const raw = parseChatContent(managePayloadJson) as any;
      const normalizedKnowledgeUpdates = normalizeAgentKnowledgeUpdates(raw?.knowledgeUpdates);

      const recommendations = Array.isArray(raw?.recommendations) ? raw.recommendations : [];
      const allowedIds = new Set(normalizedTasks.map((t: any) => t.id));
      const taskMap = new Map(normalizedTasks.map((t: any) => [t.id, t] as const));
      const nowMs = networkNow.getTime();

      const inferSuggestedPriority = (task: any) => {
        if (!task) return 1;
        if (task.status === 'completed') return 0;
        if (task.dueDate) {
          const dueMs = new Date(task.dueDate).getTime();
          if (Number.isFinite(dueMs)) {
            const diff = dueMs - nowMs;
            if (diff <= 0) return 2;
            if (diff <= 24 * 60 * 60 * 1000) return 2;
            if (diff <= 3 * 24 * 60 * 60 * 1000) return 1;
          }
        }
        return typeof task.priority === 'number'
          ? (task.priority === 2 ? 2 : task.priority === 1 ? 1 : 0)
          : 1;
      };

      const normalizedRecs = recommendations
        .map((r: any) => {
          const id = String(r?.id || '');
          const task = taskMap.get(id);
          const suggestedPriority = typeof r?.suggestedPriority === 'number'
            ? (r.suggestedPriority === 2 ? 2 : r.suggestedPriority === 1 ? 1 : 0)
            : undefined;
          const suggestedPinned = typeof r?.suggestedPinned === 'boolean' ? r.suggestedPinned : undefined;
          const suggestedDuePreset =
            r?.suggestedDuePreset === 'today' || r?.suggestedDuePreset === 'tomorrow' || r?.suggestedDuePreset === 'tonight'
              ? r.suggestedDuePreset
              : undefined;

          const hasQuickAction =
            typeof suggestedPinned === 'boolean'
            || typeof suggestedPriority === 'number'
            || Boolean(suggestedDuePreset);

          return {
            id,
            title: String(r?.title || '').trim(),
            reason: String(r?.reason || '').trim(),
            suggestedPriority: hasQuickAction ? suggestedPriority : inferSuggestedPriority(task),
            suggestedPinned,
            suggestedDuePreset,
          };
        })
        .filter((r: any) => r.id && allowedIds.has(r.id) && r.title)
        .slice(0, 8);

      return NextResponse.json({
        reply: typeof raw?.reply === 'string' && raw.reply.trim().length > 0 ? raw.reply.trim() : '已生成管理建议。',
        recommendations: normalizedRecs,
        knowledgeUpdates: normalizedKnowledgeUpdates,
        serverTime: networkNow.toISOString(),
        serverTimeText,
      });
    }

if (mode === 'habit-agent') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
      const habitPayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是习惯打卡助手，负责把用户目标拆解为“习惯 + 检查打卡任务”。
1) 用简短中文回复用户，字段名 reply。
2) 生成 items 数组，每项包含 title / checkInDueDate / reason / frequency / category / priority。
3) title 是可持续执行的习惯名称，如“英语听力 20 分钟”。
4) 当前时间为 ${serverTimeText}（中国标准时间，UTC+8）。checkInDueDate 必须是 ISO 8601 字符串；若用户未给时间，默认安排到“最近一次今晚 20:00（中国标准时间，UTC+8）”。
5) frequency 用中文简短描述，如“每天”“每周 3 次”。
6) category 仅可使用：${CATEGORY_OPTIONS.join(' / ')}。
7) priority 必须为 0/1/2。
8) reason 简短说明拆解意图，例如“先培养可坚持的最小动作”。
9) **记忆功能**：请结合历史对话上下文补全用户偏好时间和场景。
10) knowledgeUpdates 用于自动沉淀知识库，只保存用户明确表达、之后仍可能复用的习惯偏好、训练规律、场景约束或个人背景；不要保存敏感信息、密码密钥、未经确认的推测或普通建议。
11) 请只输出 JSON，格式：{ "reply": string, "items": [{"title": string, "checkInDueDate": string|null, "reason": string, "frequency": string, "category": string, "priority": 0|1|2}], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }。不要包含 null/undefined 属性时可省略。`,
          },
          ...historyMessages,
          { role: 'user', content: normalizedInput },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: habitRes } = await requestChat(baseUrlList, apiKey, habitPayload);
      const habitPayloadJson = await habitRes.json();
      const rawHabit = parseChatContent(habitPayloadJson) as HabitAgentPayload;
      const normalizedKnowledgeUpdates = normalizeAgentKnowledgeUpdates(rawHabit?.knowledgeUpdates);
      const normalizedItems = Array.isArray(rawHabit?.items)
        ? rawHabit.items.map((item) => normalizeHabitAgentItem(item, networkNow))
        : [];
      const normalizedCategoryItems = normalizedItems.map((item) => ({
        ...item,
        category: CATEGORY_OPTIONS.includes(item.category || '')
          ? item.category
          : classifyCategory(`${item.title} ${item.reason || ''}`),
        priority: typeof item.priority === 'number'
          ? item.priority
          : evaluatePriorityWithNow(item.checkInDueDate, 1, networkNow.getTime()),
      }));

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: normalizedInput,
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: rawHabit?.reply || '已拆解为习惯与检查任务，点击即可加入。',
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);

      return NextResponse.json({
        reply: typeof rawHabit?.reply === 'string' && rawHabit.reply.trim().length > 0
          ? rawHabit.reply.trim()
          : '已拆解为习惯与检查任务，点击即可加入。',
        items: normalizedCategoryItems,
        knowledgeUpdates: normalizedKnowledgeUpdates,
        serverTime: networkNow.toISOString(),
        serverTimeText,
      });
    }

    if (mode === 'countdown-agent') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
      const countdownPayload = {
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是倒数日助手，负责识别用户想创建的倒数日。
1) 用简短中文回复用户，字段名 reply。
2) 生成 items 数组，每项包含 title / targetDate。
3) targetDate 必须为 YYYY-MM-DD 格式（不要时间），若无法解析则为 null。
4) 当前时间为 ${serverTimeText}（中国标准时间，UTC+8），解析中文相对时间请以此为准。
5) **记忆功能**：请务必结合“历史对话上下文”来补全日期或标题信息。
6) knowledgeUpdates 用于自动沉淀知识库，只保存用户明确表达、之后仍可能复用的重要日期、个人事件或背景资料；不要保存敏感信息、密码密钥、未经确认的推测或普通建议。
7) 请只输出 JSON，格式：{ "reply": string, "items": [{"title": string, "targetDate": string|null}], "knowledgeUpdates": [{"title": string, "content": string, "category": "preference"|"task"|"habit"|"profile"|"note"}] }。不要包含 null/undefined 属性时可省略。`,
          },
          ...historyMessages,
          { role: 'user', content: normalizedInput },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: countdownRes } = await requestChat(baseUrlList, apiKey, countdownPayload);
      const countdownPayloadJson = await countdownRes.json();
      const rawCountdown = parseChatContent(countdownPayloadJson) as CountdownPayload;
      const normalizedKnowledgeUpdates = normalizeAgentKnowledgeUpdates(rawCountdown?.knowledgeUpdates);
      const normalizedItems = Array.isArray(rawCountdown?.items)
        ? rawCountdown.items.map((item) => normalizeCountdownItem(item))
        : [];

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: normalizedInput,
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: rawCountdown?.reply || '已识别倒数日内容，点击即可加入。',
        timestamp: Date.now(),
      }, retentionDays, effectiveContextLimit);

      return NextResponse.json({
        reply: typeof rawCountdown?.reply === 'string' && rawCountdown.reply.trim().length > 0
          ? rawCountdown.reply.trim()
          : '已识别倒数日内容，点击即可加入。',
        items: normalizedItems,
        knowledgeUpdates: normalizedKnowledgeUpdates,
        serverTime: networkNow.toISOString(),
        serverTimeText,
      });
    }

    // 默认模式：Magic Input (意图识别)
    // 移除 Embedding 生成
    const networkNow = await getNetworkTime();
    const serverTimeText = formatShanghaiDateTime(networkNow);
    const magicPayload = {
      model: resolvedChatModel,
      messages: [
        {
          role: 'system',
          content: `你是一个任务拆解助手。用户输入一个任务或一句话时，你需要：
1) 判断是否是需要创建任务，若不是则返回一个合理的待办标题。
2) 拆解 2-5 条可执行的子任务。
3) 识别优先级（0 低 / 1 中 / 2 高）与标签（从用户输入中提取），priority 必须为 0/1/2。
4) 当前时间为 ${serverTimeText}（中国标准时间，UTC+8）。如果输入包含日期/时间，请转换为 ISO 8601 格式的 dueDate（包含时分秒），优先解析中文相对时间；无法解析则 dueDate 为 null。
   模糊时间默认规则：
- 早上/上午 → 09:00
- 中午 → 12:00
- 下午 → 15:00
- 晚上/今晚 → 20:00
- 凌晨 → 00:00
例如：
- “下周五下午三点提醒我给车买保险” → 下周五 15:00 的 ISO 时间
- “周三上午开会” → 周三 09:00 的 ISO 时间
- “今晚八点” → 今日 20:00 的 ISO 时间
- “后天上午9点” → 后天 09:00 的 ISO 时间
- “下下周一下午两点” → 下下周一 14:00 的 ISO 时间
- “月底提醒交房租” → 当月月底 09:00 的 ISO 时间
- “国庆前开会” → 最近一个国庆 09:00 的 ISO 时间
- “下午三点到四点开会” → 取开始时间 15:00
5) 输出分类 category，只能从以下列表中选择：${CATEGORY_OPTIONS.join(' / ')}。
6) 识别重复逻辑 repeat。用户说“每天/每日”返回 repeat:{type:'daily'}；“每周一到周六”返回 repeat:{type:'weekly', weekdays:[1,2,3,4,5,6]}；“工作日”返回 [1,2,3,4,5]；“周末”返回 [0,6]；“每隔 3 天”返回 {type:'custom', interval:3}。
7) **重要核心**：请务必结合“历史对话上下文”来补充当前任务中可能缺失的时间或背景信息。

请只输出 JSON，格式如下：
{ "title": string, "dueDate": string | null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}], "repeat": { "type": "none"|"daily"|"weekly"|"monthly"|"custom", "interval"?: number, "weekdays"?: number[], "monthDay"?: number } | null }。不要包含 null/undefined 属性时可省略。`,
        },
        ...historyMessages,
        { role: 'user', content: normalizedInput },
      ],
      response_format: { type: 'json_object' },
    };

    const { res: magicRes } = await requestChat(baseUrlList, apiKey, magicPayload);
    const magicPayloadJson = await magicRes.json();
    const rawTask = parseChatContent(magicPayloadJson) as ParsedTask;
    let taskData = normalizeTask(rawTask, normalizedInput);
    const normalizedCategory = CATEGORY_OPTIONS.includes(taskData.category || '')
      ? taskData.category
      : classifyCategory(`${taskData.title} ${normalizedInput}`);
    const normalizedPriority = taskData.priority === DEFAULT_TASK.priority
      ? evaluatePriorityWithNow(taskData.dueDate, taskData.subtasks.length, networkNow.getTime())
      : taskData.priority;
    const sourceText = `${taskData.title} ${normalizedInput}`.trim();
    if ((!taskData.subtasks || taskData.subtasks.length === 0) && isCookingTask(sourceText)) {
      taskData = {
        ...taskData,
        subtasks: buildCookingSubtasks(taskData.title || input),
      };
    }

    await appendContextEntry(redisConfig, sessionId, {
      role: 'user',
      content: normalizedInput,
      timestamp: Date.now(),
    }, retentionDays, effectiveContextLimit);
    await appendContextEntry(redisConfig, sessionId, {
      role: 'assistant',
      content: taskData.title || '已生成任务',
      timestamp: Date.now(),
    }, retentionDays, effectiveContextLimit);

    return NextResponse.json({
      task: {
        ...taskData,
        category: normalizedCategory,
        priority: normalizedPriority,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: networkNow.toISOString(),
        status: 'todo',
        subtasks: taskData.subtasks.map((subtask) => ({
          id: Math.random().toString(36).substring(2, 9),
          title: subtask.title,
          completed: false,
        })),
      },
    });

  } catch (error) {
    console.error('AI Process Error:', error);
    return NextResponse.json(describeAiProcessError(error), { status: 500 });
  }
}

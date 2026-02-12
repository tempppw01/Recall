/**
 * AI 处理 API 路由（核心 AI 功能入口）
 *
 * POST /api/ai/process - 统一的 AI 处理端点，通过 mode 参数区分功能：
 *
 * - mode='time'           → 返回网络校准时间
 * - mode='organize'       → 一键整理已有任务列表（保留 id）
 * - mode='todo-agent'     → 聊天式待办助手（支持图片输入、上下文记忆）
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

/** 每个会话最多保留的上下文条数 */
const MAX_CONTEXT_ENTRIES = 12;

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
async function getContextMessages(redisConfig: any, sessionId: string): Promise<ContextEntry[]> {
  if (!sessionId) {
    return [];
  }

  if (!redisConfig || !redisConfig.host) {
    return MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
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
    const raw = await redis.lrange(contextKey, 0, MAX_CONTEXT_ENTRIES - 1);
    // Redis 存储顺序是最新在前（LPUSH），AI 提示词需要按时间正序排列
    return normalizeContextEntries(raw).reverse();
  } catch (error) {
    console.error('Redis context retrieval failed:', error);
    return MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
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
async function appendContextEntry(
  redisConfig: any,
  sessionId: string,
  entry: ContextEntry,
  retentionDays: number = 1,
) {
  if (!sessionId) return;
  const payload = JSON.stringify(entry);

  if (!redisConfig || !redisConfig.host) {
    const current = MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
    const next = [...current, entry].slice(-MAX_CONTEXT_ENTRIES);
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
    await redis.ltrim(contextKey, 0, MAX_CONTEXT_ENTRIES - 1);
    // 设置过期时间
    await redis.expire(contextKey, ttlSeconds);
  } catch (error) {
    console.error('Redis context storage failed:', error);
    const current = MEMORY_CONTEXT_CACHE.get(sessionId) ?? [];
    const next = [...current, entry].slice(-MAX_CONTEXT_ENTRIES);
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
  repeat?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDay?: number;
  };
};

type CountdownItem = {
  title?: string;
  targetDate?: string;
};

type AgentPayload = {
  reply?: string;
  items?: AgentItem[];
};

type CountdownPayload = {
  reply?: string;
  items?: CountdownItem[];
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

/** 规范化 AI 返回的任务字段，确保类型安全和默认值 */
function normalizeTask(data: ParsedTask) {
  const title = typeof data.title === 'string' && data.title.trim().length > 0 ? data.title.trim() : DEFAULT_TASK.title;
  const priority = typeof data.priority === 'number' && Number.isFinite(data.priority)
    ? Math.max(0, Math.min(2, Math.round(data.priority)))
    : DEFAULT_TASK.priority;
  const category = typeof data.category === 'string' && data.category.trim().length > 0
    ? data.category.trim()
    : DEFAULT_TASK.category;
  const tags = Array.isArray(data.tags) ? data.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : DEFAULT_TASK.tags;
  const dueDate = typeof data.dueDate === 'string' && data.dueDate.trim().length > 0 ? data.dueDate : DEFAULT_TASK.dueDate;
  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks
        .map((item) => ({ title: typeof item?.title === 'string' ? item.title.trim() : '' }))
        .filter((item) => item.title.length > 0)
    : DEFAULT_TASK.subtasks;
  const id = typeof data.id === 'string' && data.id.trim().length > 0 ? data.id.trim() : undefined;

  const repeat = data.repeat && typeof data.repeat === 'object' ? {
    type: data.repeat.type || 'none',
    interval: data.repeat.interval,
    weekdays: Array.isArray(data.repeat.weekdays) ? data.repeat.weekdays : undefined,
    monthDay: data.repeat.monthDay,
  } : undefined;

  return {
    id,
    title,
    dueDate,
    priority,
    category,
    tags,
    subtasks,
    repeat,
  };
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

// ─── 主路由处理器 ───────────────────────────────────────────

/**
 * POST /api/ai/process
 * 统一 AI 处理入口，根据 mode 分发到不同的处理逻辑
 */
export async function POST(req: NextRequest) {
  try {
    const { input, mode, images, apiKey, apiBaseUrl, chatModel, redisConfig, sessionId, retentionDays } = await req.json();

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

    const contextMessages = await getContextMessages(redisConfig, sessionId);
    const historyMessages = contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content
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
6) 识别并优化重复逻辑 repeat (type: 'none'|'daily'|'weekly'|'monthly'|'custom', weekdays: 0-6, interval 为正整数)。
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
        ? rawResult.tasks.map((task) => normalizeTask(task))
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
      }, retentionDays);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: JSON.stringify({ tasks: normalizedCategoryTasks }),
        timestamp: Date.now(),
      }, retentionDays);

      return NextResponse.json({ tasks: normalizedCategoryTasks });
    }

    if (mode === 'todo-agent') {
      const networkNow = await getNetworkTime();
      const serverTimeText = formatShanghaiDateTime(networkNow);
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
            content: `你是 todo-agent 助理，负责和用户聊天并输出可执行待办清单。请遵循：
1) 用简短中文回复用户，字段名 reply，不要输出 Markdown 或多余前缀。
2) 生成 items 数组，每项含 title / dueDate / priority / category / tags / subtasks / repeat。
3) category 仅可使用：${CATEGORY_OPTIONS.join(' / ')}。
4) priority 必须为 0/1/2。
5) 当前时间为 ${serverTimeText}（中国标准时间，UTC+8），解析中文相对时间请以此为准，并转 ISO 8601 字符串；无法解析则 dueDate 为 null。
6) subtasks 仅保留 title。
7) 识别重复逻辑 repeat (type: 'none'|'daily'|'weekly'|'monthly'|'custom', weekdays: 0-6, interval 为正整数)。例如“每天”对应 type:'daily'，“每周一”对应 type:'weekly', weekdays:[1]。
8) **核心记忆功能**：请务必结合提供的“历史对话上下文”来补充当前请求中缺失的信息。如果用户之前提到了时间、地点或任务背景，而当前请求中没有明确说明，请将其合并到新的待办事项中。
9) 请只输出 JSON，格式：{ "reply": string, "items": [{"title": string, "dueDate": string|null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}], "repeat": { "type": string, "interval": number, "weekdays": number[], "monthDay": number } | null }]}。不要包含 null/undefined 属性时可省略。`,
          },
          ...historyMessages,
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: agentRes } = await requestChat(baseUrlList, apiKey, agentPayload);
      const agentPayloadJson = await agentRes.json();
      const rawResult = parseChatContent(agentPayloadJson) as AgentPayload;
      const normalizedItems = Array.isArray(rawResult?.items)
        ? rawResult.items.map((item) => normalizeTask(item))
        : [];
      const normalizedCategoryItems = normalizedItems.map((item) => ({
        ...item,
        category: CATEGORY_OPTIONS.includes(item.category || '')
          ? item.category
          : classifyCategory(`${item.title}`),
        priority: typeof item.priority === 'number'
          ? item.priority
          : evaluatePriorityWithNow(item.dueDate, item.subtasks?.length || 0, networkNow.getTime()),
      }));

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: normalizedInput || '[图片]',
        timestamp: Date.now(),
      }, retentionDays);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: rawResult?.reply || '已整理成待办清单，点一下即可加入。',
        timestamp: Date.now(),
      }, retentionDays);

      return NextResponse.json({
        reply: typeof rawResult?.reply === 'string' && rawResult.reply.trim().length > 0
          ? rawResult.reply.trim()
          : '已整理成待办清单，点一下即可加入。',
        items: normalizedCategoryItems,
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
6) 请只输出 JSON，格式：{ "reply": string, "items": [{"title": string, "targetDate": string|null}] }。不要包含 null/undefined 属性时可省略。`,
          },
          ...historyMessages,
          { role: 'user', content: normalizedInput },
        ],
        response_format: { type: 'json_object' },
      };

      const { res: countdownRes } = await requestChat(baseUrlList, apiKey, countdownPayload);
      const countdownPayloadJson = await countdownRes.json();
      const rawCountdown = parseChatContent(countdownPayloadJson) as CountdownPayload;
      const normalizedItems = Array.isArray(rawCountdown?.items)
        ? rawCountdown.items.map((item) => normalizeCountdownItem(item))
        : [];

      await appendContextEntry(redisConfig, sessionId, {
        role: 'user',
        content: normalizedInput,
        timestamp: Date.now(),
      }, retentionDays);
      await appendContextEntry(redisConfig, sessionId, {
        role: 'assistant',
        content: rawCountdown?.reply || '已识别倒数日内容，点击即可加入。',
        timestamp: Date.now(),
      }, retentionDays);

      return NextResponse.json({
        reply: typeof rawCountdown?.reply === 'string' && rawCountdown.reply.trim().length > 0
          ? rawCountdown.reply.trim()
          : '已识别倒数日内容，点击即可加入。',
        items: normalizedItems,
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
6) **重要核心**：请务必结合“历史对话上下文”来补充当前任务中可能缺失的时间或背景信息。

请只输出 JSON，格式如下：
{ "title": string, "dueDate": string | null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}] }。不要包含 null/undefined 属性时可省略。`,
        },
        ...historyMessages,
        { role: 'user', content: normalizedInput },
      ],
      response_format: { type: 'json_object' },
    };

    const { res: magicRes } = await requestChat(baseUrlList, apiKey, magicPayload);
    const magicPayloadJson = await magicRes.json();
    const rawTask = parseChatContent(magicPayloadJson) as ParsedTask;
    let taskData = normalizeTask(rawTask);
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
    }, retentionDays);
    await appendContextEntry(redisConfig, sessionId, {
      role: 'assistant',
      content: taskData.title || '已生成任务',
      timestamp: Date.now(),
    }, retentionDays);

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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

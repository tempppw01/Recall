import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import OpenAI from 'openai';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_CHAT_COMPLETIONS_URL = 'https://ai.shuaihong.fun/v1/chat/completions';
const DEFAULT_CHAT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const CATEGORY_OPTIONS = ['工作', '生活', '健康', '学习', '家庭', '财务', '社交'];

type ParsedTask = {
  id?: string;
  title?: string;
  dueDate?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  subtasks?: { title?: string }[];
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
};

type AgentPayload = {
  reply?: string;
  items?: AgentItem[];
};

const DEFAULT_TASK = {
  title: 'Untitled',
  dueDate: undefined as string | undefined,
  priority: 0,
  category: '生活',
  tags: [] as string[],
  subtasks: [] as { title: string }[],
};

// 规范化 AI 返回的任务字段
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

  return {
    id,
    title,
    dueDate,
    priority,
    category,
    tags,
    subtasks,
  };
}

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

function evaluatePriority(dueDate?: string, subtaskCount = 0) {
  if (dueDate) {
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 2;
    if (diffDays <= 3) return 1;
  }
  if (subtaskCount >= 5) return 2;
  if (subtaskCount >= 3) return 1;
  return DEFAULT_TASK.priority;
}

function isCookingTask(text: string) {
  return /(做|炒|煮|炖|蒸|烤|煎|焯|凉拌|菜谱|食谱|做菜|下厨|烧菜|拌|切)/.test(text);
}

function buildCookingSubtasks(title: string) {
  const cleaned = title.trim();
  return [
    { title: `准备食材（${cleaned}）` },
    { title: '处理食材：清洗/切配/腌制' },
    { title: '下锅烹饪并控制火候' },
    { title: '调味出锅并装盘' },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { input, mode, apiKey, apiBaseUrl, chatModel, embeddingModel } = await req.json();

    const resolvedBaseUrl = apiBaseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
    const resolvedChatCompletionsUrl = process.env.OPENAI_CHAT_COMPLETIONS_URL || DEFAULT_CHAT_COMPLETIONS_URL;
    const resolvedChatModel = chatModel || process.env.OPENAI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
    const resolvedEmbeddingModel = embeddingModel || process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;

    // 如果前端传了 apiKey，使用新的实例；否则使用默认
    const client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: resolvedBaseUrl
        })
      : new OpenAI({
          apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
          baseURL: resolvedBaseUrl,
        });

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    if (mode === 'organize') {
      // 一键整理：传入任务数组，返回整理后的任务数组（保留 id）
      const payload = typeof input === 'string' ? JSON.parse(input) as OrganizePayload : input as OrganizePayload;
      const tasksToOrganize = Array.isArray(payload?.tasks) ? payload.tasks : [];

      if (tasksToOrganize.length === 0) {
        return NextResponse.json({ error: 'Tasks are required for organize mode' }, { status: 400 });
      }

      const completionResponse = await fetch(resolvedChatCompletionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
        },
        body: JSON.stringify({
          model: resolvedChatModel,
          messages: [
            {
              role: 'system',
              content: `你是一个任务整理助手。请对用户提供的任务列表进行整理：
1) 保留每个任务的 id。
2) 优化 title 的可读性，必要时合并/拆分重复任务。
3) 校正 priority(0-2)、category(只可从 ${CATEGORY_OPTIONS.join(' / ')})、tags。
4) dueDate 若无则保持 null。
5) subtasks 仅保留 title。
请只返回 JSON：{ "tasks": [{ "id": string, "title": string, "dueDate": string|null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}] }] }`,
            },
            {
              role: 'user',
              content: JSON.stringify({ tasks: tasksToOrganize }),
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text();
        throw new Error(`Chat completion failed: ${errorText}`);
      }

      const completionPayload = await completionResponse.json();
      const rawResult = JSON.parse(completionPayload?.choices?.[0]?.message?.content || '{}') as { tasks?: ParsedTask[] };
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
        priority: typeof task.priority === 'number' ? task.priority : evaluatePriority(task.dueDate, task.subtasks?.length || 0),
      }));

      return NextResponse.json({ tasks: normalizedCategoryTasks });
    }

    if (mode === 'search') {
      // 仅生成 Embedding 用于搜索
      const embedding = await generateEmbedding(input, { client, model: resolvedEmbeddingModel });
      return NextResponse.json({ embedding });
    }

    if (mode === 'todo-agent') {
      // todo-agent：返回聊天回复 + 待办清单
      const completionResponse = await fetch(resolvedChatCompletionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
        },
        body: JSON.stringify({
          model: resolvedChatModel,
          messages: [
            {
              role: 'system',
              content: `你是 todo-agent 助理，负责和用户聊天并输出可执行待办清单。请遵循：
1) 用简短中文回复用户，字段名 reply。
2) 生成 items 数组，每项含 title / dueDate / priority / category / tags / subtasks。
3) category 仅可使用：${CATEGORY_OPTIONS.join(' / ')}。
4) dueDate 可为空，优先解析中文相对时间并转 ISO 字符串。
5) subtasks 仅保留 title。
6) 请只输出 JSON，格式：{ "reply": string, "items": [{"title": string, "dueDate": string|null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}] }]}。`,
            },
            { role: 'user', content: input },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text();
        throw new Error(`Chat completion failed: ${errorText}`);
      }

      const completionPayload = await completionResponse.json();
      const rawResult = JSON.parse(completionPayload?.choices?.[0]?.message?.content || '{}') as AgentPayload;
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
          : evaluatePriority(item.dueDate, item.subtasks?.length || 0),
      }));

      return NextResponse.json({
        reply: typeof rawResult?.reply === 'string' && rawResult.reply.trim().length > 0
          ? rawResult.reply.trim()
          : '已整理成待办清单，点一下即可加入。',
        items: normalizedCategoryItems,
      });
    }

    // 默认模式：Magic Input (意图识别 + Embedding)
    const completionResponse = await fetch(resolvedChatCompletionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
      },
      body: JSON.stringify({
        model: resolvedChatModel,
        messages: [
          {
            role: 'system',
            content: `你是一个任务拆解助手。用户输入一个任务或一句话时，你需要：\n1) 判断是否是需要创建任务，若不是则返回一个合理的待办标题。\n2) 拆解 2-5 条可执行的子任务。\n3) 识别优先级（0 低 / 1 中 / 2 高）与标签（从用户输入中提取）。\n4) 如果输入包含日期/时间，请转换为 ISO 格式的 dueDate（包含时分秒），优先解析中文相对时间，并遵循模糊时间默认规则：\n- 早上/上午 → 09:00\n- 中午 → 12:00\n- 下午 → 15:00\n- 晚上/今晚 → 20:00\n- 凌晨 → 00:00\n例如：\n- “下周五下午三点提醒我给车买保险” → 下周五 15:00 的 ISO 时间\n- “周三上午开会” → 周三 09:00 的 ISO 时间\n- “今晚八点” → 今日 20:00 的 ISO 时间\n- “后天上午9点” → 后天 09:00 的 ISO 时间\n- “下下周一下午两点” → 下下周一 14:00 的 ISO 时间\n- “月底提醒交房租” → 当月月底 09:00 的 ISO 时间\n- “国庆前开会” → 最近一个国庆 09:00 的 ISO 时间\n- “下午三点到四点开会” → 取开始时间 15:00\n5) 输出分类 category，只能从以下列表中选择：${CATEGORY_OPTIONS.join(' / ')}。\n\n请只输出 JSON，格式如下：\n{ "title": string, "dueDate": string | null, "priority": 0|1|2, "category": string, "tags": string[], "subtasks": [{"title": string}] }`,
          },
          { role: 'user', content: input },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      throw new Error(`Chat completion failed: ${errorText}`);
    }

    const completionPayload = await completionResponse.json();
    const rawTask = JSON.parse(completionPayload?.choices?.[0]?.message?.content || '{}') as ParsedTask;
    let taskData = normalizeTask(rawTask);
    const normalizedCategory = CATEGORY_OPTIONS.includes(taskData.category || '')
      ? taskData.category
      : classifyCategory(`${taskData.title} ${input}`);
    const normalizedPriority = taskData.priority === DEFAULT_TASK.priority
      ? evaluatePriority(taskData.dueDate, taskData.subtasks.length)
      : taskData.priority;
    const sourceText = `${taskData.title} ${input}`.trim();
    if ((!taskData.subtasks || taskData.subtasks.length === 0) && isCookingTask(sourceText)) {
      taskData = {
        ...taskData,
        subtasks: buildCookingSubtasks(taskData.title || input),
      };
    }
    const textToEmbed = `${taskData.title} ${taskData.tags.join(' ')}`.trim();
    
    const embedding = await generateEmbedding(textToEmbed, { client, model: resolvedEmbeddingModel });

    return NextResponse.json({
      task: {
        ...taskData,
        category: normalizedCategory,
        priority: normalizedPriority,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        status: 'todo',
        subtasks: taskData.subtasks.map((subtask) => ({
          id: Math.random().toString(36).substring(2, 9),
          title: subtask.title,
          completed: false,
        }))
      },
      embedding
    });

  } catch (error) {
    console.error('AI Process Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

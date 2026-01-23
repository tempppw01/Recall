import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import OpenAI from 'openai';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';
const DEFAULT_CHAT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

type ParsedTask = {
  title?: string;
  dueDate?: string;
  priority?: number;
  tags?: string[];
};

const DEFAULT_TASK = {
  title: 'Untitled',
  dueDate: undefined as string | undefined,
  priority: 0,
  tags: [] as string[],
};

function normalizeTask(data: ParsedTask) {
  const title = typeof data.title === 'string' && data.title.trim().length > 0 ? data.title.trim() : DEFAULT_TASK.title;
  const priority = typeof data.priority === 'number' && Number.isFinite(data.priority)
    ? Math.max(0, Math.min(2, Math.round(data.priority)))
    : DEFAULT_TASK.priority;
  const tags = Array.isArray(data.tags) ? data.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : DEFAULT_TASK.tags;
  const dueDate = typeof data.dueDate === 'string' && data.dueDate.trim().length > 0 ? data.dueDate : DEFAULT_TASK.dueDate;

  return {
    title,
    dueDate,
    priority,
    tags,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { input, mode, apiKey, apiBaseUrl, chatModel, embeddingModel } = await req.json();

    const resolvedBaseUrl = apiBaseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
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

    if (mode === 'search') {
      // 仅生成 Embedding 用于搜索
      const embedding = await generateEmbedding(input, { client, model: resolvedEmbeddingModel });
      return NextResponse.json({ embedding });
    }

    // 默认模式：Magic Input (意图识别 + Embedding)
    const completion = await client.chat.completions.create({
      model: resolvedChatModel,
      messages: [
        {
          role: 'system',
          content: `You are a GTD assistant. Extract task details from the user input.
          Return JSON format: { "title": string, "dueDate": string (ISO), "priority": int (0-2), "tags": string[] }`
        },
        { role: 'user', content: input }
      ],
      response_format: { type: "json_object" },
    });

    const rawTask = JSON.parse(completion.choices[0].message.content || '{}') as ParsedTask;
    const taskData = normalizeTask(rawTask);
    const textToEmbed = `${taskData.title} ${taskData.tags.join(' ')}`.trim();
    
    const embedding = await generateEmbedding(textToEmbed, { client, model: resolvedEmbeddingModel });

    return NextResponse.json({
      task: {
        ...taskData,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        status: 'todo'
      },
      embedding
    });

  } catch (error) {
    console.error('AI Process Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

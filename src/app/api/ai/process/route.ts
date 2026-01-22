import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { input, mode, apiKey } = await req.json();

    // 如果前端传了 apiKey，使用新的实例；否则使用默认
    const client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: process.env.OPENAI_BASE_URL || 'https://ai.shuaihong.fun/v1'
        })
      : new OpenAI({
          apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
          baseURL: process.env.OPENAI_BASE_URL || 'https://ai.shuaihong.fun/v1',
        });

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    if (mode === 'search') {
      // 仅生成 Embedding 用于搜索
      // TODO: generateEmbedding 目前是硬编码使用默认 client 的，需要重构以支持自定义 client
      // 暂时用 client 直接调用 embedding 接口
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: input,
        encoding_format: 'float',
      });
      const embedding = response.data[0].embedding;
      return NextResponse.json({ embedding });
    }

    // 默认模式：Magic Input (意图识别 + Embedding)
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
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

    const taskData = JSON.parse(completion.choices[0].message.content || '{}');
    const textToEmbed = `${taskData.title} ${taskData.tags?.join(' ')}`;
    
    // 同样使用 client 生成 embedding
    const embedRes = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
      encoding_format: 'float',
    });
    const embedding = embedRes.data[0].embedding;

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

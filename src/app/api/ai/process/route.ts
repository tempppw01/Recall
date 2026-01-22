import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://ai.shuaihong.fun/v1',
});

export async function POST(req: NextRequest) {
  try {
    const { input, mode } = await req.json();

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    if (mode === 'search') {
      // 仅生成 Embedding 用于搜索
      const embedding = await generateEmbedding(input);
      return NextResponse.json({ embedding });
    }

    // 默认模式：Magic Input (意图识别 + Embedding)
    const completion = await openai.chat.completions.create({
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
    const embedding = await generateEmbedding(textToEmbed);

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

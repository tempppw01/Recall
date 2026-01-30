import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getPgConfigFromHeaders, getDynamicPrisma } from '@/lib/prisma';

const parseJSON = (value: unknown, fallback: any) => {
  if (!value) return fallback;
  try {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  } catch {
    return fallback;
  }
};

const DEFAULT_USER_ID = 'local-user'; // 单机模式默认 ID

export async function GET(request: Request) {
  const pgConfig = getPgConfigFromHeaders(request.headers);
  let client = prisma;
  let userId = '';

  if (pgConfig) {
    const dynamicClient = getDynamicPrisma(pgConfig);
    if (dynamicClient) {
      client = dynamicClient;
      userId = DEFAULT_USER_ID; // 动态连接时假设单用户或固定ID
      // 如果需要多用户，可以通过 headers 传递 userId，这里简化为单机模式
    }
  } else {
    const session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string })?.id || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await client.task.findMany({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    });

    // 如果是动态连接，处理完需断开，避免连接池耗尽
    // 注意：Prisma 在 serverless 环境中不建议频繁 disconnect，但在动态单次连接场景下需要
    if (client !== prisma) {
      await client.$disconnect();
    }

    return NextResponse.json(
      tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
        priority: task.priority,
        category: task.category ?? undefined,
        status: task.status,
        tags: parseJSON(task.tags, []),
        subtasks: parseJSON(task.subtasks, []),
        attachments: parseJSON(task.attachments, []),
        repeat: parseJSON(task.repeat, undefined),
        createdAt: task.createdAt.toISOString(),
        sortOrder: task.sortOrder,
      })),
    );
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const pgConfig = getPgConfigFromHeaders(request.headers);
  let client = prisma;
  let userId = '';

  if (pgConfig) {
    const dynamicClient = getDynamicPrisma(pgConfig);
    if (dynamicClient) {
      client = dynamicClient;
      userId = DEFAULT_USER_ID;
    }
  } else {
    const session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string })?.id || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // 确保 User 存在（仅针对 PG 动态连接且首次写入）
    if (client !== prisma) {
      const userExists = await client.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        // 创建默认用户
        await client.user.create({ data: { id: userId, name: 'Local User' } });
      }
    }

    const task = await client.task.create({
      data: {
        id: payload.id, // 允许前端透传 ID
        userId,
        title: payload.title,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority ?? 0,
        category: payload.category ?? null,
        status: payload.status ?? 'todo',
        tags: payload.tags ?? [],
        subtasks: payload.subtasks ?? [],
        attachments: payload.attachments ?? [],
        repeat: payload.repeat ?? null,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
        sortOrder: payload.sortOrder ?? 0,
      },
    });

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ id: task.id });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error', details: String(error) }, { status: 500 });
  }
}

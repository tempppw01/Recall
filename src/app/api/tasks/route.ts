/**
 * 任务（Task）API 路由
 *
 * GET  /api/tasks  - 获取当前用户的所有任务
 * POST /api/tasks  - 创建新任务
 *
 * 支持两种认证模式：
 * 1. NextAuth session（默认）—— 从 JWT 中获取 userId
 * 2. 动态 PG 连接（通过 x-pg-* 请求头）—— 使用固定的 local-user ID
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getPgConfigFromHeaders, getDynamicPrisma } from '@/lib/prisma';

/**
 * 安全解析 JSON 字段
 * Prisma 的 Json 类型字段在数据库中可能存储为字符串或对象，需统一处理
 */
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

/** 单机模式下的默认用户 ID（动态 PG 连接时使用） */
const DEFAULT_USER_ID = 'local-user';

/**
 * GET /api/tasks
 * 获取当前用户的所有任务，按 sortOrder 降序排列
 * 返回时将数据库字段转换为前端友好的格式（日期转 ISO 字符串，JSON 字段解析）
 */
export async function GET(request: Request) {
  // 根据请求头判断使用动态 PG 连接还是默认连接
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
    // 默认模式：通过 NextAuth session 获取用户身份
    const session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string })?.id || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await client.task.findMany({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    });

    // 动态连接用完即断开，避免连接池耗尽
    if (client !== prisma) {
      await client.$disconnect();
    }

    // 将数据库记录转换为前端 Task 接口格式
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

/**
 * POST /api/tasks
 * 创建新任务，支持前端透传 id 和 createdAt（用于同步场景）
 * 动态 PG 连接时会自动创建默认用户（如果不存在）
 */
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

    // 动态连接时确保用户记录存在（首次写入自动创建）
    if (client !== prisma) {
      const userExists = await client.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        await client.user.create({ data: { id: userId, name: 'Local User' } });
      }
    }

    const task = await client.task.create({
      data: {
        id: payload.id,           // 允许前端透传 ID（用于离线同步）
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

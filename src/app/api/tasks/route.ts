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
  const session = await getServerSession(authOptions);
  let client = prisma;
  let userId = (session?.user as { id?: string })?.id || '';

  if (!userId) {
    // 未登录时，才允许使用动态 PG（通过 x-pg-* 请求头），并使用固定 local-user
    const pgConfig = getPgConfigFromHeaders(request.headers);
    if (pgConfig) {
      const dynamicClient = getDynamicPrisma(pgConfig);
      if (dynamicClient) {
        client = dynamicClient;
        userId = DEFAULT_USER_ID;
      }
    }
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

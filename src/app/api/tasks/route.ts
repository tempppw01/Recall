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
import { Prisma } from '@prisma/client';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';
import { buildPaginatedListResult, getPaginationParams } from '@/lib/server/pagination';
import { normalizeTaskPayload } from '@/lib/server/record-normalizers';
import { filterOutOnboardingTasks, isOnboardingTask } from '@/lib/onboardingTasks';

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

const mapTask = (task: any) => ({
  id: task.id,
  title: task.title,
  dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
  priority: task.priority,
  category: task.category ?? undefined,
  status: task.status,
  tags: parseJSON(task.tags, []),
  subtasks: parseJSON(task.subtasks, []),
  attachments: parseJSON(task.attachments, []),
  repeat: parseJSON(task.repeat, null) ?? undefined,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt?.toISOString?.() ?? undefined,
  sortOrder: task.sortOrder ?? 0,
});

/**
 * GET /api/tasks
 * 获取当前用户的所有任务，按 sortOrder 降序排列
 * 返回时将数据库字段转换为前端友好的格式（日期转 ISO 字符串，JSON 字段解析）
 */
export async function GET(request: Request) {
  const { client, userId } = await getRequestDbContext(request);
  const pagination = getPaginationParams(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const baseQuery = {
      where: { userId },
      orderBy: [{ sortOrder: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }],
    };

    if (pagination.enabled) {
      const tasks = await client.task.findMany({
        ...baseQuery,
        skip: pagination.offset,
        take: pagination.limit + 1,
      });

      return NextResponse.json(buildPaginatedListResult(filterOutOnboardingTasks(tasks.map(mapTask)), pagination));
    }

    const tasks = await client.task.findMany(baseQuery);

    return NextResponse.json(filterOutOnboardingTasks(tasks.map(mapTask)));
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const normalized = normalizeTaskPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    if (isOnboardingTask({ ...payload, title: normalized.title })) {
      return NextResponse.json({ skipped: true, id: normalized.id ?? null });
    }

    if (client !== prisma) {
      await ensureLocalUser(client, userId);
    }

    const task = await client.task.create({
      data: {
        ...(normalized.id ? { id: normalized.id } : {}),
        userId,
        title: normalized.title,
        dueDate: normalized.dueDate,
        priority: normalized.priority,
        category: normalized.category,
        status: normalized.status,
        tags: normalized.tags,
        subtasks: normalized.subtasks,
        attachments: normalized.attachments,
        repeat: normalized.repeat ?? Prisma.DbNull,
        createdAt: normalized.createdAt,
        sortOrder: normalized.sortOrder,
      },
    });

    return NextResponse.json({ id: task.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error', details: String(error) }, { status: 500 });
  }
}

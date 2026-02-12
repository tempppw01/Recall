/**
 * 单个任务操作 API 路由
 *
 * PUT    /api/tasks/:id  - 更新指定任务
 * DELETE /api/tasks/:id  - 删除指定任务
 *
 * 通过 URL 参数 id 和 userId 双重条件确保数据隔离
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getPgConfigFromHeaders, getDynamicPrisma } from '@/lib/prisma';

/** 单机模式下的默认用户 ID */
const DEFAULT_USER_ID = 'local-user';

/**
 * PUT /api/tasks/:id
 * 更新指定任务的所有可变字段
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    // where 条件同时包含 id 和 userId，确保用户只能修改自己的任务
    const task = await client.task.update({
      where: { id: params.id, userId },
      data: {
        title: payload.title,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority ?? 0,
        category: payload.category ?? null,
        status: payload.status ?? 'todo',
        tags: payload.tags ?? [],
        subtasks: payload.subtasks ?? [],
        attachments: payload.attachments ?? [],
        repeat: payload.repeat ?? null,
      },
    });

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ id: task.id });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/:id
 * 删除指定任务（硬删除）
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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
    await client.task.delete({
      where: { id: params.id, userId },
    });

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

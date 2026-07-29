/**
 * 鍗曚釜浠诲姟鎿嶄綔 API 璺敱
 *
 * PUT    /api/tasks/:id  - 鏇存柊鎸囧畾浠诲姟
 * DELETE /api/tasks/:id  - 鍒犻櫎鎸囧畾浠诲姟
 *
 * 閫氳繃 URL 鍙傛暟 id 鍜?userId 鍙岄噸鏉′欢纭繚鏁版嵁闅旂
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { serializeJsonForDatabase } from '@/lib/database';
import { normalizeTaskPayload } from '@/lib/server/record-normalizers';
import { isOnboardingTask } from '@/lib/onboardingTasks';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/tasks/:id
 * 鏇存柊鎸囧畾浠诲姟鐨勬墍鏈夊彲鍙樺瓧娈?
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId, provider } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const normalized = normalizeTaskPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    if (isOnboardingTask({ ...payload, title: normalized.title })) {
      return NextResponse.json({ skipped: true, id });
    }

    const task = await client.task.update({
      where: { id, userId },
      data: {
        title: normalized.title,
        dueDate: normalized.dueDate,
        priority: normalized.priority,
        category: normalized.category,
        status: normalized.status,
        tags: serializeJsonForDatabase(normalized.tags, provider),
        subtasks: serializeJsonForDatabase(normalized.subtasks, provider),
        attachments: serializeJsonForDatabase(normalized.attachments, provider),
        repeat: serializeJsonForDatabase(normalized.repeat, provider),
        sortOrder: normalized.sortOrder,
      },
    });

    return NextResponse.json({ id: task.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/:id
 * 鍒犻櫎鎸囧畾浠诲姟锛堢‖鍒犻櫎锛?
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await client.task.delete({
      where: { id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

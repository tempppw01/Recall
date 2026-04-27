/**
 * 鍗曚釜涔犳儻鎿嶄綔 API 璺敱
 *
 * PUT    /api/habits/:id  - 鏇存柊鎸囧畾涔犳儻锛堟爣棰樸€佹墦鍗¤褰曪級
 * DELETE /api/habits/:id  - 鍒犻櫎鎸囧畾涔犳儻
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { normalizeHabitPayload } from '@/lib/server/record-normalizers';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PUT /api/habits/:id - 鏇存柊涔犳儻鏍囬鍜屾墦鍗¤褰?*/
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const normalized = normalizeHabitPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    const habit = await client.habit.update({
      where: { id, userId },
      data: {
        title: normalized.title,
        logs: normalized.logs,
      },
    });

    return NextResponse.json({ id: habit.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await client.habit.delete({
      where: { id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

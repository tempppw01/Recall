/**
 * 单个习惯操作 API 路由
 *
 * PUT    /api/habits/:id  - 更新指定习惯（标题、打卡记录）
 * DELETE /api/habits/:id  - 删除指定习惯
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PUT /api/habits/:id - 更新习惯标题和打卡记录 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();

    const habit = await client.habit.update({
      where: { id, userId },
      data: {
        title: payload.title,
        logs: payload.logs ?? [],
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

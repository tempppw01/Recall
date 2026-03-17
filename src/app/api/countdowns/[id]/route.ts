/**
 * 单个倒计时操作 API 路由
 *
 * PUT    /api/countdowns/:id  - 更新指定倒计时（标题、目标日期、置顶状态）
 * DELETE /api/countdowns/:id  - 删除指定倒计时
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PUT /api/countdowns/:id - 更新倒计时 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();

    const countdown = await client.countdown.update({
      where: { id, userId },
      data: {
        title: payload.title,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : new Date(),
        pinned: payload.pinned ?? false,
      },
    });

    return NextResponse.json({ id: countdown.id });
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
    await client.countdown.delete({
      where: { id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

/**
 * 倒计时（Countdown）API 路由
 *
 * GET  /api/countdowns  - 获取当前用户的所有倒计时
 * POST /api/countdowns  - 创建新倒计时
 */

import { NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';

export async function GET(request: Request) {
  const { client, userId } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const countdowns = await client.countdown.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      countdowns.map((item: any) => ({
        id: item.id,
        title: item.title,
        targetDate: item.targetDate.toISOString(),
        pinned: item.pinned,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt?.toISOString?.() ?? undefined,
      })),
    );
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { client, userId } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();

    if (client !== prisma) {
      await ensureLocalUser(client, userId);
    }

    const countdown = await client.countdown.create({
      data: {
        id: payload.id,
        userId,
        title: payload.title,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : new Date(),
        pinned: payload.pinned ?? false,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      },
    });

    return NextResponse.json({ id: countdown.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

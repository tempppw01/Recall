/**
 * 倒计时（Countdown）API 路由
 *
 * GET  /api/countdowns  - 获取当前用户的所有倒计时
 * POST /api/countdowns  - 创建新倒计时
 */

import { NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';
import { buildPaginatedListResult, getPaginationParams } from '@/lib/server/pagination';
import { normalizeCountdownPayload } from '@/lib/server/record-normalizers';

const mapCountdown = (item: any) => ({
  id: item.id,
  title: item.title,
  targetDate: item.targetDate.toISOString(),
  pinned: item.pinned,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt?.toISOString?.() ?? undefined,
});

export async function GET(request: Request) {
  const { client, userId } = await getRequestDbContext(request);
  const pagination = getPaginationParams(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const baseQuery = {
      where: { userId },
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    };

    if (pagination.enabled) {
      const countdowns = await client.countdown.findMany({
        ...baseQuery,
        skip: pagination.offset,
        take: pagination.limit + 1,
      });

      return NextResponse.json(buildPaginatedListResult(countdowns.map(mapCountdown), pagination));
    }

    const countdowns = await client.countdown.findMany(baseQuery);

    return NextResponse.json(countdowns.map(mapCountdown));
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
    const normalized = normalizeCountdownPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    if (client !== prisma) {
      await ensureLocalUser(client, userId);
    }

    const countdown = await client.countdown.create({
      data: {
        ...(normalized.id ? { id: normalized.id } : {}),
        userId,
        title: normalized.title,
        targetDate: normalized.targetDate ?? new Date(),
        pinned: normalized.pinned,
        createdAt: normalized.createdAt,
      },
    });

    return NextResponse.json({ id: countdown.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

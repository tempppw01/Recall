/**
 * 习惯（Habit）API 路由
 *
 * GET  /api/habits  - 获取当前用户的所有习惯
 * POST /api/habits  - 创建新习惯
 */

import { NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';
import { buildPaginatedListResult, getPaginationParams } from '@/lib/server/pagination';
import { normalizeHabitPayload } from '@/lib/server/record-normalizers';

const parseJSON = (value: unknown, fallback: any) => {
  if (!value) return fallback;
  try {
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
};

const mapHabit = (habit: any) => ({
  id: habit.id,
  title: habit.title,
  createdAt: habit.createdAt.toISOString(),
  updatedAt: habit.updatedAt?.toISOString?.() ?? undefined,
  logs: parseJSON(habit.logs, []),
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
      const habits = await client.habit.findMany({
        ...baseQuery,
        skip: pagination.offset,
        take: pagination.limit + 1,
      });

      return NextResponse.json(buildPaginatedListResult(habits.map(mapHabit), pagination));
    }

    const habits = await client.habit.findMany(baseQuery);

    return NextResponse.json(habits.map(mapHabit));
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
    const normalized = normalizeHabitPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    if (client !== prisma) {
      await ensureLocalUser(client, userId);
    }

    const habit = await client.habit.create({
      data: {
        ...(normalized.id ? { id: normalized.id } : {}),
        userId,
        title: normalized.title,
        logs: normalized.logs,
        createdAt: normalized.createdAt,
      },
    });

    return NextResponse.json({ id: habit.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

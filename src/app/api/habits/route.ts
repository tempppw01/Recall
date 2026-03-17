/**
 * 习惯（Habit）API 路由
 *
 * GET  /api/habits  - 获取当前用户的所有习惯
 * POST /api/habits  - 创建新习惯
 */

import { NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';

const parseJSON = (value: unknown, fallback: any) => {
  if (!value) return fallback;
  try {
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
};

export async function GET(request: Request) {
  const { client, userId } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const habits = await client.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      habits.map((habit: any) => ({
        id: habit.id,
        title: habit.title,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt?.toISOString?.() ?? undefined,
        logs: parseJSON(habit.logs, []),
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

    const habit = await client.habit.create({
      data: {
        id: payload.id,
        userId,
        title: payload.title,
        logs: payload.logs ?? [],
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      },
    });

    return NextResponse.json({ id: habit.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

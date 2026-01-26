import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    habits.map((habit: any) => ({
      id: habit.id,
      title: habit.title,
      createdAt: habit.createdAt.toISOString(),
      logs: parseJSON(habit.logs, []),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();

  const habit = await prisma.habit.create({
    data: {
      userId,
      title: payload.title,
      logs: payload.logs ?? [],
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
    },
  });

  return NextResponse.json({ id: habit.id });
}

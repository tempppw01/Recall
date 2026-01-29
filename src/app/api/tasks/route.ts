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

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
  });

  return NextResponse.json(
    tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
      priority: task.priority,
      category: task.category ?? undefined,
      status: task.status,
      tags: parseJSON(task.tags, []),
      subtasks: parseJSON(task.subtasks, []),
      repeat: parseJSON(task.repeat, undefined),
      createdAt: task.createdAt.toISOString(),
      sortOrder: task.sortOrder,
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();

  const task = await prisma.task.create({
    data: {
      userId,
      title: payload.title,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      priority: payload.priority ?? 0,
      category: payload.category ?? null,
      status: payload.status ?? 'todo',
      tags: payload.tags ?? [],
      subtasks: payload.subtasks ?? [],
      repeat: payload.repeat ?? null,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      sortOrder: payload.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ id: task.id });
}

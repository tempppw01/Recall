import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();

  const task = await prisma.task.update({
    where: { id: params.id, userId },
    data: {
      title: payload.title,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      priority: payload.priority ?? 0,
      category: payload.category ?? null,
      status: payload.status ?? 'todo',
      tags: payload.tags ?? [],
      subtasks: payload.subtasks ?? [],
      repeat: payload.repeat ?? null,
      embedding: payload.embedding ?? null,
    },
  });

  return NextResponse.json({ id: task.id });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.task.delete({
    where: { id: params.id, userId },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();

  const countdown = await prisma.countdown.update({
    where: { id: params.id, userId },
    data: {
      title: payload.title,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : new Date(),
      pinned: payload.pinned ?? false,
    },
  });

  return NextResponse.json({ id: countdown.id });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.countdown.delete({
    where: { id: params.id, userId },
  });

  return NextResponse.json({ ok: true });
}

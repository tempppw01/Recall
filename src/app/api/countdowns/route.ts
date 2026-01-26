import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const countdowns = await prisma.countdown.findMany({
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
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();

  const countdown = await prisma.countdown.create({
    data: {
      userId,
      title: payload.title,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : new Date(),
      pinned: payload.pinned ?? false,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
    },
  });

  return NextResponse.json({ id: countdown.id });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getPgConfigFromHeaders, getDynamicPrisma } from '@/lib/prisma';

const DEFAULT_USER_ID = 'local-user';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const pgConfig = getPgConfigFromHeaders(request.headers);
  let client = prisma;
  let userId = '';

  if (pgConfig) {
    const dynamicClient = getDynamicPrisma(pgConfig);
    if (dynamicClient) {
      client = dynamicClient;
      userId = DEFAULT_USER_ID;
    }
  } else {
    const session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string })?.id || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();

    const habit = await client.habit.update({
      where: { id: params.id, userId },
      data: {
        title: payload.title,
        logs: payload.logs ?? [],
      },
    });

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ id: habit.id });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const pgConfig = getPgConfigFromHeaders(request.headers);
  let client = prisma;
  let userId = '';

  if (pgConfig) {
    const dynamicClient = getDynamicPrisma(pgConfig);
    if (dynamicClient) {
      client = dynamicClient;
      userId = DEFAULT_USER_ID;
    }
  } else {
    const session = await getServerSession(authOptions);
    userId = (session?.user as { id?: string })?.id || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await client.habit.delete({
      where: { id: params.id, userId },
    });

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

/**
 * 倒计时（Countdown）API 路由
 *
 * GET  /api/countdowns  - 获取当前用户的所有倒计时
 * POST /api/countdowns  - 创建新倒计时
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getPgConfigFromHeaders, getDynamicPrisma } from '@/lib/prisma';

/** 单机模式下的默认用户 ID */
const DEFAULT_USER_ID = 'local-user';

/** GET /api/countdowns - 获取所有倒计时，按创建时间降序 */
export async function GET(request: Request) {
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
    const countdowns = await client.countdown.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (client !== prisma) await client.$disconnect();

    return NextResponse.json(
      countdowns.map((item: any) => ({
        id: item.id,
        title: item.title,
        targetDate: item.targetDate.toISOString(),
        pinned: item.pinned,
        createdAt: item.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    if (client !== prisma) {
      const userExists = await client.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        await client.user.create({ data: { id: userId, name: 'Local User' } });
      }
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

    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ id: countdown.id });
  } catch (error) {
    console.error('API Error', error);
    if (client !== prisma) await client.$disconnect();
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

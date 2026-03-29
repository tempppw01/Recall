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
    const items = await client.item.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(items.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category ?? undefined,
      tags: parseJSON(item.tags, []),
      location: item.location ?? undefined,
      quantity: item.quantity ?? 0,
      status: item.status,
      note: item.note ?? undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt?.toISOString?.() ?? undefined,
    })));
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

    const item = await client.item.create({
      data: {
        id: payload.id,
        userId,
        name: payload.name,
        category: payload.category ?? null,
        tags: payload.tags ?? [],
        location: payload.location ?? null,
        quantity: payload.quantity ?? 0,
        status: payload.status ?? 'normal',
        note: payload.note ?? null,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      },
    });

    return NextResponse.json({ id: item.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { prisma, ensureLocalUser } from '@/lib/prisma';
import { buildPaginatedListResult, getPaginationParams } from '@/lib/server/pagination';
import { normalizeItemPayload } from '@/lib/server/record-normalizers';

const parseJSON = (value: unknown, fallback: any) => {
  if (!value) return fallback;
  try {
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
};

const mapItem = (item: any) => ({
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
      const items = await client.item.findMany({
        ...baseQuery,
        skip: pagination.offset,
        take: pagination.limit + 1,
      });

      return NextResponse.json(buildPaginatedListResult(items.map(mapItem), pagination));
    }

    const items = await client.item.findMany(baseQuery);

    return NextResponse.json(items.map(mapItem));
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
    const normalized = normalizeItemPayload(payload);

    if (!normalized.name) {
      return NextResponse.json({ error: 'Invalid payload', details: 'name is required' }, { status: 400 });
    }

    if (client !== prisma) {
      await ensureLocalUser(client, userId);
    }

    const item = await client.item.create({
      data: {
        ...(normalized.id ? { id: normalized.id } : {}),
        userId,
        name: normalized.name,
        category: normalized.category,
        tags: normalized.tags,
        location: normalized.location,
        quantity: normalized.quantity,
        status: normalized.status,
        note: normalized.note,
        createdAt: normalized.createdAt,
      },
    });

    return NextResponse.json({ id: item.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

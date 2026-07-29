import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { serializeJsonForDatabase } from '@/lib/database';
import { normalizeItemPayload } from '@/lib/server/record-normalizers';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId, provider } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const normalized = normalizeItemPayload(payload);

    if (!normalized.name) {
      return NextResponse.json({ error: 'Invalid payload', details: 'name is required' }, { status: 400 });
    }

    const item = await client.item.update({
      where: { id, userId },
      data: {
        name: normalized.name,
        category: normalized.category,
        tags: serializeJsonForDatabase(normalized.tags, provider),
        location: normalized.location,
        quantity: normalized.quantity,
        status: normalized.status,
        note: normalized.note,
      },
    });
    return NextResponse.json({ id: item.id });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await client.item.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

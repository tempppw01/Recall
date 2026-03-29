import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const item = await client.item.update({
      where: { id, userId },
      data: {
        name: payload.name,
        category: payload.category ?? null,
        tags: payload.tags ?? [],
        location: payload.location ?? null,
        quantity: payload.quantity ?? 0,
        status: payload.status ?? 'normal',
        note: payload.note ?? null,
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

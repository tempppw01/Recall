/**
 * 鍗曚釜鍊掕鏃舵搷浣?API 璺敱
 *
 * PUT    /api/countdowns/:id  - 鏇存柊鎸囧畾鍊掕鏃讹紙鏍囬銆佺洰鏍囨棩鏈熴€佺疆椤剁姸鎬侊級
 * DELETE /api/countdowns/:id  - 鍒犻櫎鎸囧畾鍊掕鏃?
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbContext } from '@/lib/request-db';
import { normalizeCountdownPayload } from '@/lib/server/record-normalizers';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PUT /api/countdowns/:id - 鏇存柊鍊掕鏃?*/
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { client, userId } = await getRequestDbContext(request);

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const normalized = normalizeCountdownPayload(payload);

    if (!normalized.title) {
      return NextResponse.json({ error: 'Invalid payload', details: 'title is required' }, { status: 400 });
    }

    const countdown = await client.countdown.update({
      where: { id, userId },
      data: {
        title: normalized.title,
        targetDate: normalized.targetDate ?? new Date(),
        pinned: normalized.pinned,
      },
    });

    return NextResponse.json({ id: countdown.id });
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
    await client.countdown.delete({
      where: { id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Error', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}

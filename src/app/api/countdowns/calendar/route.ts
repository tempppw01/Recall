import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ALMANAC_BASE_URL = 'https://api.tiax.cn/almanac/';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = searchParams.get('year') || String(now.getFullYear());
  const month = searchParams.get('month') || String(now.getMonth() + 1);
  const day = searchParams.get('day') || String(now.getDate());

  const url = new URL(ALMANAC_BASE_URL);
  url.searchParams.set('year', year);
  url.searchParams.set('month', month);
  url.searchParams.set('day', day);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}

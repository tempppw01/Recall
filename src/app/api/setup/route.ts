import { NextResponse } from 'next/server';
import { getDatabaseReadiness, ensureActiveDatabase, prisma } from '@/lib/prisma';
import { initializeSqliteSelection } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getDatabaseReadiness();
  if (!status.configured) {
    return NextResponse.json(status);
  }

  try {
    await ensureActiveDatabase();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ...status, ready: true });
  } catch (error) {
    return NextResponse.json(
      { ...status, ready: false, error: String((error as Error)?.message || error) },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.provider !== 'sqlite') {
      return NextResponse.json({ error: '目前仅支持初始化 SQLite。' }, { status: 400 });
    }

    const selection = initializeSqliteSelection();
    await ensureActiveDatabase();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      provider: 'sqlite',
      databaseUrl: selection.databaseUrl,
      message: 'SQLite 初始化完成，Recall 已切换到服务端数据库。',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'SQLite 初始化失败', details: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

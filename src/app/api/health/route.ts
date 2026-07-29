import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureActiveDatabase, getDatabaseReadiness, prisma } from '@/lib/prisma';

// Health endpoint:
// - shallow: no auth / no DB dependency, suitable for container liveness
// - deep: optional DB check, suitable for operator diagnostics
//
// Usage:
//   curl -fsS http://localhost:3789/api/health
//   curl -fsS http://localhost:3789/api/health?deep=1
export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  const { searchParams } = new URL(request.url);
  const deep = searchParams.get('deep');
  const wantsDeep = deep === '1' || deep === 'true';

  if (!wantsDeep) {
    return NextResponse.json({
      ok: true,
      mode: 'shallow',
      service: 'recall',
      ts: new Date().toISOString(),
      requestId,
    });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {
    db: { ok: false },
  };

  try {
    const status = getDatabaseReadiness();
    if (!status.configured) {
      return NextResponse.json({
        ok: false,
        mode: 'deep',
        service: 'recall',
        ts: new Date().toISOString(),
        requestId,
        checks: { db: { ok: false, detail: 'database setup required' } },
      }, { status: 503 });
    }
    await ensureActiveDatabase();
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true };
  } catch (error) {
    checks.db = {
      ok: false,
      detail: String((error as Error)?.message || error),
    };
  }

  const ok = Object.values(checks).every((item) => item.ok);
  return NextResponse.json(
    {
      ok,
      mode: 'deep',
      service: 'recall',
      ts: new Date().toISOString(),
      requestId,
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}

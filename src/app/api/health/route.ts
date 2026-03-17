import { NextResponse } from 'next/server';

// Minimal health endpoint.
// - No auth required
// - No DB dependency (so the container can be checked even before DB is ready)
//
// Usage:
//   curl -fsS http://localhost:3789/api/health
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'recall',
    ts: new Date().toISOString(),
  });
}

#!/usr/bin/env bash
set -euo pipefail

# Simple DB link verification for Recall.
# Usage:
#   DATABASE_URL='postgresql://...' ./scripts/db-check.sh

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db-check] DATABASE_URL is required" >&2
  exit 1
fi

# Ensure prisma client is generated (no-op if already)
if [[ ! -d node_modules/.prisma ]]; then
  echo "[db-check] prisma client not generated; running 'npx prisma generate'" >&2
  npx prisma generate
fi

echo "[db-check] running SELECT 1 via Prisma..." >&2
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient({ log: ['error'] });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[db-check] ok');
  } catch (err) {
    console.error('[db-check] failed:', err?.message || err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
})();
NODE

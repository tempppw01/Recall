#!/usr/bin/env sh
set -eu

# Startup secret handling:
# - Prefer user-provided NEXTAUTH_SECRET
# - If missing (or insecure default), auto-generate a fallback so the app can start
#
# Note: auto-generated secret changes on container recreate/restart,
# which will invalidate existing sessions. For stable production sessions,
# set NEXTAUTH_SECRET explicitly.

default_secret="change-me-in-prod"

if [ "${NODE_ENV:-}" = "production" ]; then
  current="${NEXTAUTH_SECRET:-}"

  if [ -z "$current" ] || [ "$current" = "$default_secret" ]; then
    generated="${HOSTNAME:-recall}-$(date +%s)-$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo fallback)"
    export NEXTAUTH_SECRET="$generated"
    echo "[startup][warn] NEXTAUTH_SECRET is not set (or insecure default). Auto-generated a temporary secret." >&2
    echo "[startup][warn] Sessions may be invalidated after restart. Set NEXTAUTH_SECRET explicitly for stable production." >&2
  fi
fi

exec node server.js

#!/usr/bin/env sh
set -eu

# Fail fast on insecure defaults.
# NextAuth in production requires a stable secret. Using a hardcoded default is unsafe.

default_secret="change-me-in-prod"

if [ "${NODE_ENV:-}" = "production" ]; then
  if [ -z "${NEXTAUTH_SECRET:-}" ]; then
    echo "[startup] NEXTAUTH_SECRET is required in production (set a strong random value)." >&2
    echo "[startup] Example: export NEXTAUTH_SECRET=\"$(openssl rand -base64 32 2>/dev/null || echo '<random>')\"" >&2
    exit 1
  fi

  if [ "${NEXTAUTH_SECRET}" = "${default_secret}" ]; then
    echo "[startup] Refusing to start: NEXTAUTH_SECRET is still the insecure default (${default_secret})." >&2
    echo "[startup] Please set NEXTAUTH_SECRET to a strong random value." >&2
    exit 1
  fi
fi

exec node server.js

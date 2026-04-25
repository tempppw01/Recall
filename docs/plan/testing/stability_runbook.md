# Stability Runbook

This runbook covers pre-release validation, rollback basics, and health checks.

## Preflight

```bash
npm run typecheck
npm run lint
npm run build
```

Health checks:

```bash
curl -fsS http://127.0.0.1:3789/api/health
curl -fsS "http://127.0.0.1:3789/api/health?deep=1"
```

## Rollback basics

1. Return to the previous stable release tag or image
2. Restart the service
3. Re-run health checks
4. Record the incident in an audit note

## Monitoring

- startup logs
- auth / database / Redis errors
- `/api/health`
- `/api/health?deep=1`
- `/api/sync` failures and request identifiers

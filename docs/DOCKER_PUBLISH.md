# Docker Publish Workflow

GitHub Actions workflow: `.github/workflows/docker-publish.yml`

GitHub Releases are published by `.github/workflows/github-release.yml` when a `vX.Y.Z` tag is pushed. The release body comes from `docs/plan/releases/release_notes_vX.Y.Z.md`.

## Trigger rules

- Push to `main`
  - Publish Docker tag:
    - `latest`
  - Do not publish a SemVer image tag from `main` alone
- Push Git tag such as `v0.3.1`
  - Publish Docker tags:
    - `0.3.1`
    - `0.3`
- Manual trigger: `workflow_dispatch`
  - Uses the same workflow, but formal SemVer tags still come from Git tags

## Why this policy exists

- `package.json.version` is the formal release version
- A SemVer Docker tag should exist only after the release commit and Git tag are both in place
- `main` can move ahead of the latest formal release, so `main` publishes `latest` only

## Docker Hub repository

- `34v0wphix/recall`

## Runtime port

The image listens on `3789` by default because `Dockerfile` sets:

- `ENV PORT=3789`
- `EXPOSE 3789`

## Local run example

```bash
docker run --rm -p 43100:3789 34v0wphix/recall:latest
```

## NextAuth production environment

Provide these variables in production:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Example:

```bash
docker run --rm \
  -p 43100:3789 \
  -e NEXTAUTH_URL=http://localhost:43100 \
  -e NEXTAUTH_SECRET="your-strong-secret" \
  34v0wphix/recall:latest
```

## Multi-arch build

Default platforms:

- `linux/amd64`
- `linux/arm64`

## Required GitHub Secrets

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

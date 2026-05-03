# Release Process

Formal release versions follow SemVer and use `package.json.version` as the source of truth.

## Release steps

1. Bump the intended version without creating a tag yet:
   - `npm version <target> --no-git-tag-version`
2. Update release records:
   - `docs/plan/releases/CHANGELOG.md`
   - `docs/plan/releases/release_notes_vX.Y.Z.md`
3. Run validation:
   - `npm run release:check`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
4. Commit the release changes.
5. Create the Git tag:
   - `git tag vX.Y.Z`
6. Push the commit and the tag:
   - `git push origin main`
   - `git push origin vX.Y.Z`
7. GitHub Actions automatically publishes the GitHub Release from:
   - `docs/plan/releases/release_notes_vX.Y.Z.md`
   - `.github/workflows/github-release.yml`

## Rules

- Do not declare a new release only in docs.
- Do not create a SemVer Docker tag from `main` pushes alone.
- Do not manually edit GitHub Release text without also updating the matching release notes file.
- Release candidates and draft scopes must stay under `docs/plan/release-candidates/`.

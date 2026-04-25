# docs/plan Overview

## Release vs. stage

- Official release version:
  - `package.json.version` is the single source of truth.
  - The same version must be reflected by the current Git tag, `docs/plan/releases/CHANGELOG.md`, and `docs/plan/releases/release_notes_vX.Y.Z.md`.
- Roadmap stage:
  - `docs/plan/stages/` describes planning stages only.
  - Stage names such as `v0.1`, `v0.2`, `v0.3`, and `v1.0` are roadmap labels, not release versions.

## Navigation

- Roadmap: `docs/plan/roadmap.md`
- Stage docs: `docs/plan/stages/`
- Release history: `docs/plan/releases/CHANGELOG.md`
- Release candidates: `docs/plan/release-candidates/`
- Release process: `docs/plan/release-process.md`
- Audit reports: `docs/plan/audits/`
- UI spec: `docs/plan/ui-spec.md`
- UI refactor checklist: `docs/plan/ui-refactor-checklist.md`
- Collaboration workflow: `docs/plan/collaboration-workflow.md`
- Product iteration workflow: `docs/plan/product-iteration-workflow.md`
- Archive: `docs/plan/archive/`

## Rules

- Only formal release records belong in `docs/plan/releases/`:
  - `CHANGELOG.md`
  - `release_notes_vX.Y.Z.md`
- Candidate scopes belong in `docs/plan/release-candidates/`.
- Stability and operational runbooks belong outside `docs/plan/releases/`.
- Stage docs must not be used to declare a formal release.
- Every release bump must follow `docs/plan/release-process.md` and pass `npm run release:check`.

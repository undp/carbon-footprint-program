## Context

The Huella Latam monorepo runs on Node ≥24, pnpm 10.23, Turbo, and a workspace-catalog setup (`pnpm-workspace.yaml` defines a `shared` catalog). It has two apps (`apps/api` on Fastify 5 + Prisma 7, `apps/web` on React 19 + MUI 7 + Vite 7) and six internal packages. The CI pipeline enforces zero-warning lint, type-check, format-check, full test suite, and build on every PR. Tests run sequentially against real PostgreSQL and Azurite containers (`@testcontainers/*`).

Current state: dependencies have drifted. Some are 1–2 majors behind (`@mui/material` 7 vs 9, `@azure/msal-browser` 4 vs 5, ESLint 9 vs 10, TypeScript 5.9 vs 6.0). Others are minor/patch behind (Prisma 7.0→7.8, Fastify 5.6→5.8, TanStack Query 5.90→5.100, etc.). Running `pnpm outdated --recursive` enumerates ~70 packages with upgrades available.

The user's constraint: **after every single library bump**, run `pnpm install` and `pnpm build` (plus the project's mandatory `pnpm format && pnpm lint && pnpm type-check && pnpm test` per `CLAUDE.md`) and only commit if everything passes. This forces atomicity — each commit is the smallest possible unit of upgrade work, so any regression is isolated to one library.

Stakeholders:

- Engineering (must review each PR — three PRs total, sized for review by risk tier).
- QA / product (manual smoke tests on PR 2 auth flow and PR 3 UI changes).
- Operations (no deployment changes; library upgrades are deploy-by-replacement).

## Goals / Non-Goals

**Goals:**

- Bring every direct dependency in the monorepo to its latest compatible version, in a fully reversible way.
- Establish and follow a repeatable per-library upgrade protocol: bump → `pnpm install` → `pnpm build` → quality gates → commit.
- Group upgrades into three risk-tiered PRs (low, medium, high) that can be merged sequentially, so a regression in one tier does not block the others.
- Keep CI green at every commit (no "WIP" commits, no `--no-verify`).
- Run official codemods (`@mui/codemod`, `@mui/x-codemod`) before manual edits when available.
- Document the per-library protocol as a reusable spec (`dependency-upgrade-policy`) so future upgrade cycles follow the same playbook.

**Non-Goals:**

- Changing the Prisma schema, database migrations, or seed data (only library bumps).
- Bumping the Node engine (`>=24.0.0` stays). A future Node-version upgrade is a separate change.
- Refactoring application code beyond what migration guides require.
- Replacing libraries with alternatives (e.g., swapping `ky` for `axios`) — only version upgrades.
- Adopting new optional features that the new versions enable (e.g., new MUI v9 components) — out of scope for this change.
- Adjusting CI configuration, GitHub Actions, or deployment infrastructure.

## Decisions

### Decision 1: Three sequential PRs grouped by risk tier

**Choice**: Split the upgrade into three PRs (low-risk, medium-risk, high-risk) merged in order, each on its own branch.

**Rationale**:

- A single PR with ~70 library bumps is impossible to review or revert selectively.
- Risk-tiered grouping lets reviewers focus: PR 1 is mostly mechanical, PR 2 needs targeted attention on the auth flow, PR 3 needs deep UI smoke testing.
- Sequential merge means PR 2 builds on the green baseline established by PR 1, and PR 3 builds on PR 2 — each tier shrinks the surface of "what could have broken this".

**Alternatives considered**:

- One PR per library: too much overhead (~70 PRs), slows velocity, no benefit since low-risk bumps are mechanical.
- One PR for everything: unreviewable, unrevertable.
- Group by domain (api/web/packages): doesn't help with risk isolation — a low-risk patch in `apps/web` and a high-risk major in `apps/web` would land together.

### Decision 2: Per-library commit protocol — install + build + quality gates + commit

**Choice**: Every individual library version bump is its own commit. Before committing, run (in order): `pnpm install` → `pnpm build` → `pnpm format` → `pnpm lint` → `pnpm type-check` → `pnpm test`. If anything fails, fix in the same commit; if it can't be fixed in ~30 minutes, stop and consult the user.

**Rationale**:

- Atomic commits = atomic reverts. If `react-hook-form` 7.76 regresses on a form, `git revert <sha>` only touches that one library.
- `pnpm build` after every bump catches API contract changes early (Prisma client regeneration, Fastify type provider changes, MUI component re-exports).
- Quality gates are already mandatory per `CLAUDE.md`; running them per-commit (not per-PR) ensures green CI at every commit, so `git bisect` works trivially.

**Alternatives considered**:

- Quality gates only at end of PR: faster but breaks `git bisect` and risks bundling a failing library with passing ones.
- `pnpm install` only at the start of each PR: insufficient — pnpm resolves dependency trees holistically; a single bump can shift transitive versions, and the lockfile must reflect each step.
- Skipping `pnpm build` per-library: too risky — some libraries (Prisma, TanStack Router via `@tanstack/router-plugin`, `tsc-alias`) produce build-time artifacts that type-check alone won't validate.

### Decision 3: Use the pnpm catalog for shared deps; per-package files for the rest

**Choice**: Versions of `typescript`, `vitest`, `zod`, `pino`, `tsx`, `@types/node` live in `pnpm-workspace.yaml > catalogs.shared` and are edited there once per upgrade. All other deps live in their respective `package.json` files.

**Rationale**: This is the existing project structure — we follow it, we don't change it in this PR.

### Decision 4: PR 3 internal phasing (TS → ESLint → MSAL → MUI core → MUI X)

**Choice**: Inside PR 3, apply majors in this strict order: (1) TypeScript 6 + `@types/node` 25, (2) ESLint 10, (3) MSAL 5, (4) MUI core 9, (5) MUI X 9.

**Rationale**:

- TS first: stricter inference reveals latent errors throughout the codebase. Doing it first means subsequent bumps build on the corrected types.
- ESLint second: depends on the corrected TypeScript; ESLint 10 may surface new lint findings that need adjustment after the TS rewrite.
- MSAL third: isolated to `apps/web` auth — touches few files but is critical to verify before UI work.
- MUI core fourth: huge surface area, but easier to debug if TS/ESLint are already clean.
- MUI X last: depends on MUI core (peer dependency); codemods assume MUI core is on v9.

**Alternatives considered**: Doing MUI first (most files changed, more visible progress). Rejected because TS errors triggered by MUI v9 typings would be tangled with TS6 errors — separating them keeps each phase debuggable.

### Decision 5: Use official codemods before manual edits

**Choice**: For MUI 7→9 (run v8 codemod first, then v9 codemod, since direct 7→9 codemod doesn't exist) and MUI X 8→9, run the official codemods first; only edit by hand to fix what the codemod missed.

**Rationale**: Hand-editing 100+ files for an API rename is error-prone; codemods are tested and idempotent. Leaving codemod output as a separate sub-step (and committing it before manual fixes) makes the diff readable.

### Decision 6: Smoke test gates on PR 2 and PR 3 — manual confirmation required

**Choice**: Auth flow (PR 2 `jwks-rsa` + `ky`; PR 3 MSAL 5) and UI changes (PR 3 MUI 9) require a manual smoke test by the user before the PR is marked ready to merge. The LLM cannot self-verify these end-to-end.

**Rationale**: Tests cover unit and integration behavior but the full MSAL redirect flow + token injection into authenticated API calls only works against the real Azure AD tenant. UI regressions (broken layout, missing icons, wrong theme colors) need eyeballs.

## Risks / Trade-offs

- **Risk**: MUI 7 → 9 skips v8 entirely. Some breaking changes from v7→v8 may compound with v8→v9 changes in surprising ways. → **Mitigation**: run both codemods in sequence (`v8.0.0/preset-safe` then `v9.0.0/preset-safe`); read both migration guides before starting; commit codemod output separately from manual fixes so each step is reviewable.
- **Risk**: TypeScript 6 stricter inference cascades into 100+ type errors and turns into a multi-day refactor. → **Mitigation**: stop and consult user if TS6 cleanup exceeds ~15 files of meaningful changes. Never patch with `any` — degrade gracefully back to TS5.9.x latest if the upgrade is too disruptive.
- **Risk**: MSAL 5 token-acquisition changes silently break the `ky` `beforeRequest` hook, so API calls appear to work locally (cached token) but fail in production. → **Mitigation**: clear browser storage between tests; require explicit user smoke-test confirmation that logout + login + authenticated call cycle works before merging PR 3.
- **Risk**: `pnpm-lock.yaml` drift between PRs because PR 1 merges, PR 2 rebases, and pnpm regenerates differently. → **Mitigation**: always rebase on freshly-merged `main` before starting the next PR; never carry a stale lockfile across PRs.
- **Risk**: Running `pnpm build` after every commit is slow (~30s × 70 commits = 35 min of compute over the change). → **Trade-off accepted**: speed of iteration is less important than reliable atomic commits.
- **Risk**: A `latest` version published between writing this design and executing it differs from what's tabulated. → **Mitigation**: the spec mandates re-checking `pnpm outdated --recursive` at the start of each PR; the version table in `tasks.md` is treated as guidance, not a contract.
- **Risk**: Codemods modify generated/auto-generated files (e.g., `routeTree.gen.ts`) leading to dirty diffs. → **Mitigation**: regenerate auto-generated files after codemods run (`pnpm dev:web` triggers regeneration) and never commit hand-edits to `routeTree.gen.ts`.
- **Trade-off**: this change does not adopt any new features from the upgraded libraries (e.g., MUI 9's new `pigment-css` integration, TanStack Router `loaderDeps` changes). That's a deliberate non-goal — it keeps the change reviewable. Follow-up changes can adopt new features.

## Migration Plan

**Deployment**: each PR merges to `main` and is deployed via the existing process (no infrastructure changes). Library upgrades take effect on the next deployment, no schema migration or data backfill required.

**Pre-flight (once, before PR 1)**:

1. Confirm `main` is green: `pnpm install && pnpm type-check && pnpm lint && pnpm test && pnpm build`.
2. If anything fails on `main`, halt the upgrade until the underlying issue is fixed.

**PR 1 (low-risk)**:

1. Branch `chore/upgrade-deps-low-risk` from `main`.
2. For each package in the low-risk list: edit version → `pnpm install` → `pnpm build` → format + lint + type-check + test → commit.
3. Push, open PR, wait for review + merge.

**PR 2 (medium-risk)**: rebase from `main` after PR 1 merged, then per-library protocol on the medium-risk list. Same flow.

**PR 3 (high-risk)**: rebase from `main` after PR 2 merged, then execute internal phases 3.1–3.5 in order, each with their own quality-gate cycle. Codemods run as their own commit before manual fixes.

**Rollback**:

- Per-library: `git revert <commit-sha>` on the offending library's commit. Each commit being atomic, the revert is clean.
- Per-PR: `git revert <merge-commit-sha>` on `main` reverts the entire PR. Since PRs are merged sequentially, reverting PR 3 leaves PR 1 and PR 2's gains intact.
- Mid-PR (before merge): `git reset --hard <last-good-commit>` on the working branch and force-push (only on the upgrade branch, never on `main`).

## Open Questions

- Should we adopt corepack pinning for `pnpm 10.23.0` in CI to guarantee resolver behavior is identical between local and CI? (Out of scope; could be a follow-up.)
- After PR 3 lands, do we want to enable `eslint-plugin-react-compiler` to take advantage of React 19's auto-memoization compiler? (Follow-up change; depends on React Compiler stability at the time.)
- For Tailwind 4.3, should we adopt the new `@theme` directive features? (Follow-up; not a migration requirement.)

# CI/CD Pipeline

This document describes the continuous integration pipeline for Huella Latam: what triggers it, what jobs run, how failures are debugged, and how to extend or modify it.

---

## Overview

CI is split across a few workflow files in `.github/workflows/`:

| Workflow        | What it does                                                                                    | Triggers                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `ci.yml`        | The main PR gate: lint, type-check, format, test, coverage, build, and security/quality checks. | Pull requests targeting `main`.                               |
| `codeql.yml`    | CodeQL SAST (static analysis for security & quality).                                           | Push to `main`, PRs, and weekly.                              |
| `scorecard.yml` | OpenSSF Scorecard supply-chain posture analysis.                                                | Push to `main`, weekly, and on branch-protection-rule change. |
| `trivy.yml`     | Trivy vulnerability scan of the built API and web container images.                             | Push to `main`, PRs that touch the images, and weekly.        |
| `labels.yml`    | Syncs the repository labels from `.github/labels.yml`.                                          | Changes to the label definitions.                             |

There is no deployment pipeline in source control; deployments are performed manually via the scripts described in the [Infrastructure](../infrastructure/) docs.

The rest of this document describes `ci.yml` (the PR gate) in detail; the security workflows are covered in [Security](../security/).

---

## Trigger

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
```

| Condition                         | Behaviour                                       |
| --------------------------------- | ----------------------------------------------- |
| PR opened, pushed to, or reopened | CI runs                                         |
| PR converted from draft to ready  | CI runs                                         |
| PR is still a draft               | CI is **skipped** (see `check-draft` job below) |
| Push directly to `main`           | CI does **not** run                             |

### Concurrency

Each PR gets its own concurrency group. If a new commit is pushed while CI is running, the in-progress run is cancelled and replaced:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

---

## Jobs

Every job runs on `ubuntu-latest`. Jobs that install dependencies use Node (pinned via `.nvmrc`) and pnpm with a shared pnpm cache, installing via `pnpm install --frozen-lockfile`. Every action is pinned by commit SHA — the `zizmor` job fails the build on an unpinned action.

### Job graph

`check-draft` is the entry gate — every other job `needs` it (directly or transitively), so a draft PR skips the whole pipeline. `changes` classifies the PR as code vs docs-only; the heavy jobs gate their **steps** (not the job) on its output, so they still report their required status check on docs-only PRs (see [Docs-only optimization](#docs-only-optimization)).

```
check-draft
├── changes ──┬── lint
│             ├── type-check
│             ├── test ── coverage
│             └── build
├── verify-changes-filter
├── format
├── audit
├── zizmor
├── docs-links
└── secret-scan
```

| Job                     | Purpose                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `check-draft`           | Entry gate; skips everything on draft PRs.                                                                                                |
| `changes`               | Classifies the PR as code vs docs-only.                                                                                                   |
| `verify-changes-filter` | Guards the `changes` filter against drift (`scripts/check-ci-changes-filter.mjs`).                                                        |
| `lint`                  | ESLint across the monorepo (`--max-warnings=0`).                                                                                          |
| `type-check`            | `tsc --noEmit` across all projects.                                                                                                       |
| `format`                | Prettier `--check`.                                                                                                                       |
| `test`                  | Vitest + Testcontainers, 3-leg matrix (see below).                                                                                        |
| `coverage`              | Merges the three test legs' coverage and enforces the `apps/api` gate (90% for all four metrics: lines, statements, functions, branches). |
| `build`                 | Turborepo build of all apps and packages.                                                                                                 |
| `audit`                 | `pnpm audit --prod --audit-level moderate` (dependency vulnerabilities).                                                                  |
| `zizmor`                | Static analysis of the GitHub Actions workflows.                                                                                          |
| `docs-links`            | Broken local-link check for Markdown docs (lychee, offline).                                                                              |
| `secret-scan`           | Full-history secret scan (betterleaks).                                                                                                   |

The code-gated jobs (`lint`, `type-check`, `test`, `coverage`, `build`) run in **parallel** once `changes` reports; the ungated jobs (`format`, `audit`, `zizmor`, `docs-links`, `secret-scan`) run in parallel once `check-draft` passes.

---

### `check-draft`

```yaml
if: github.event.pull_request.draft == false
```

Acts as a gate. If the PR is a draft, this job is skipped, which causes all downstream jobs to be skipped too. No code is checked out — the job simply prints a message.

---

### Docs-only optimization

The heavy jobs (`lint`, `type-check`, `test`, `coverage`, `build`) skip their expensive **steps** on docs-only PRs, but the **jobs still run** and report their (required) status checks. This is deliberate: a required check that never reports — e.g. because the job was skipped via `on.paths` or a job-level `if:` — leaves the PR "pending" forever under branch protection. An always-running job that executes zero steps reports success instead.

The `changes` job (using `dorny/paths-filter`) sets a `code` output that is `true` when anything build-affecting changed. Each gated step carries `if: needs.changes.outputs.code == 'true'`. The filter's pattern list is a second source of truth for "what affects the build", so `verify-changes-filter` (`scripts/check-ci-changes-filter.mjs`) guards it against drift.

---

### `lint`

```bash
pnpm lint
```

Runs ESLint across the entire monorepo (all apps and packages). Must pass with zero errors. See [Contributing Guide](./contributing.md) for lint rules.

---

### `type-check`

```bash
pnpm type-check
```

Runs `tsc --noEmit` across all TypeScript projects. Catches type errors that don't prevent compilation but would cause runtime issues.

---

### `format`

```bash
pnpm format:check
```

Verifies Prettier formatting without modifying files. If any file is not formatted, this job fails. Run `pnpm format` locally to fix.

---

### `test`

Runs the Vitest + Testcontainers integration tests. Docker is available on the GitHub-hosted runner, so Testcontainers can spin up PostgreSQL, Azurite, and MinIO containers.

This is a matrix job with three legs that **partition** the suite into disjoint sets, so the storage layer is exercised against **both** storage providers without running the non-storage files more than once. Each leg is a **Vitest project** (`test.projects` in `apps/api/vitest.config.ts`); the leg name is both the `--project` filter and the branch-protection check name:

| Leg (check name)       | Provider             | Scope                                                                                         |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `Test (base)`          | none¹                | The full suite **except** the storage manifest — the bulk, run once.                          |
| `Test (storage-azure)` | `azure_blob_storage` | **Only** the storage manifest (`apps/api/test/setup/storageTestManifest.ts`) against Azurite. |
| `Test (storage-minio)` | `minio`              | **Only** the storage manifest against MinIO.                                                  |

`base ∪ storage-azure ∪ storage-minio` covers the full suite, and `base` is disjoint from the storage legs. The storage manifest is the single source of truth for both the base project's `exclude` and the storage projects' `include`. Each project selects its provider — and boots the matching testcontainer — from its **name** in `globalSetup.ts` (never from a shared `process.env`, which would be last-writer-wins across projects); each project also declares the matching `STORAGE_PROVIDER` in its `test.env` so `buildStorageConfig()` validation passes at `app.ready()`.

Each leg runs `pnpm test:ci` (with `LEG` set to the matrix leg), which is `vitest run --project=$LEG --coverage --reporter=blob`. The `--reporter=blob` output carries the coverage data and is merged natively in the `coverage` job below (no external merge script).

¹ The `base` project boots **no** storage container — it never touches real storage (its `app.storage` is the throwing adapter). Its `test.env` still sets `STORAGE_PROVIDER=azure_blob_storage` (+ a dummy account name) purely so `buildStorageConfig()` passes at `app.ready()`.

Before running the tests, all three legs run `pnpm test:verify-storage-manifest` — a static gate that fails if a test touches real storage but is missing from the manifest (or vice versa). A runtime guard backs it up: a storage-agnostic test's `app.storage` is a throwing adapter, so accidental storage access fails loudly. See [Storage test manifest](#storage-test-manifest) below.

**Blob report artifact:** After each leg (even on failure), its Vitest blob report is uploaded — `blob-report-base`, `blob-report-storage-azure`, and `blob-report-storage-minio`:

```yaml
- uses: actions/upload-artifact@v7
  if: always()
  with:
    name: blob-report-${{ matrix.leg }}
    path: apps/api/.vitest-reports/
    include-hidden-files: true # .vitest-reports is a dotfile dir
    retention-days: 7
```

The `coverage` job downloads all three and merges them (see below).

#### Storage test manifest

`apps/api/test/setup/storageTestManifest.ts` lists the tests that exercise real object storage. Two layers keep it from drifting:

- **Static** — `pnpm test:verify-storage-manifest` scans the tests for storage markers (e.g. `inject("storageDescriptor")`, `uploadFixture(...)`, `app.storage.<method>`) and fails with an actionable message if a marked test is missing from the manifest, an entry no longer exists, or an entry has no markers.
- **Runtime** — `createTestApp` installs a throwing storage adapter when no `storageDescriptor` is passed, so a test that quietly reaches for storage fails immediately instead of passing against a fake backend.

When you add a test that uploads/reads files, add its path to `STORAGE_TEST_MANIFEST` (and pass `storageDescriptor: inject("storageDescriptor")` to `createTestApp`).

---

### `coverage`

Enforces a **per-metric coverage gate** for `apps/api`: **90%** for all four metrics — lines, statements, functions, and branches. (Branches were the last to reach the bar; #512 closed the gap with new integration suites plus targeted `v8 ignore`s of genuinely-unreachable guards, retiring the earlier intermediate 85% branch ratchet.)

Because the `test` matrix **partitions** the suite into three disjoint legs, no single leg exercises the whole codebase — so no single leg can be gated on its own coverage (it would fail on the files it never runs). The **90%** gate is declared once in `apps/api/vitest.config.ts` (`test.coverage.thresholds`); each single-project `test` leg overrides it to `0` on the CLI (its numbers still print in its own report), and the gate is applied only after the legs are merged:

1. Each `test` leg emits a Vitest **blob** report (`--reporter=blob`, coverage embedded) as an artifact.
2. This job (`needs: test`) downloads all three into one flat dir (`merge-multiple: true` — `vitest --merge-reports` reads the dir non-recursively and rejects subfolders; each blob is uniquely named `blob-<leg>.json`) and runs `pnpm test:coverage:merge`, which is `vitest run --merge-reports --coverage`. That command doesn't override the thresholds, so the config's 90% gate applies. Vitest merges the coverage natively — a line covered by _any_ leg counts as covered (v8 merges hit-counts) — then fails if any metric falls below its threshold (90% for all four).

The gate lives in the config, so local (`test:coverage`) and CI (`test:coverage:merge`) use the exact same thresholds — only `test:ci` (a partial single-project run) opts out. If a `test` leg fails, this job is skipped (the PR is already blocked, and there is no complete coverage to merge).

The merge step also produces a human-readable report (html + lcov + json) under `apps/api/coverage/`, which this job uploads as the `coverage-report-merged` artifact (`if: always()`, so it is available **even when the gate fails** — exactly when you need to see which lines are missing). Download it straight from the run instead of merging the per-leg blobs by hand.

> **Scope:** this merged gate covers `apps/api`. Frontend (`apps/web`) has its own coverage gate — a low **global floor** enforced by the `Test (web)` job (thresholds in `apps/web/vitest.config.ts`, run with `--coverage`), ratcheted up as its logic layers gain tests. See [Testing → Web unit tests](./testing.md#web-unit-tests-appsweb).

---

### `build`

```bash
VITE_API_BASE_URL=https://example.invalid pnpm build
```

Builds all apps and packages via Turborepo. The frontend build requires `VITE_API_BASE_URL` to be set at build time; a placeholder URL is used in CI because the actual API URL is environment-specific. This verifies the build does not fail for any missing env variable that should be optional at build time.

---

## Environment Variables and Secrets

The CI workflow references **no secrets**. All test infrastructure (PostgreSQL, Azurite, MinIO) is provided by Testcontainers on the runner, so no external Azure or MinIO credentials are required.

- `build` sets `VITE_API_BASE_URL` to a placeholder.
- `test` needs no storage env in the workflow: each Vitest project declares its own dummy connection vars in `test.env` (`STORAGE_PROVIDER` plus `AZURE_STORAGE_ACCOUNT_NAME` / `AZURE_STORAGE_CONTAINER_NAME` for the Azure projects, or `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` / `MINIO_REGION` for the MinIO project). These only satisfy the config validation in `apps/api/src/config/environment.ts`; none are real secrets — the actual connection details come from the testcontainer started by `globalSetup.ts`, and the dynamic MinIO endpoint is applied from the injected descriptor in `createTestApp` before `app.ready()`.

---

## Debugging CI Failures

### View logs

In the GitHub Actions run UI, expand the failing job and step to see the full output. Pino structured logs from tests are printed to stdout and captured there.

### Download the coverage report

The `coverage` job uploads the merged, human-readable report as the `coverage-report-merged` artifact (html + lcov + json, `if: always()`) — download it from the run and open `index.html` to see exactly which lines are missing. This is the quickest path when the `Coverage` gate fails.

The per-leg `blob-report-base`, `blob-report-storage-azure`, and `blob-report-storage-minio` artifacts are also uploaded after every test run. They are Vitest blob reports (not human-readable on their own); to reproduce the merge locally, download all three into `apps/api/.vitest-reports/` and run `pnpm --filter=api exec vitest run --merge-reports --coverage`, which produces the same report under `apps/api/coverage/`.

### Reproduce locally

Every CI job runs the same command you can run locally:

| CI job          | Local command                                          |
| --------------- | ------------------------------------------------------ |
| lint            | `pnpm lint`                                            |
| type-check      | `pnpm type-check`                                      |
| format          | `pnpm format:check` (or `pnpm format` to fix)          |
| test + coverage | `pnpm test:verify-storage-manifest && pnpm test:api`   |
| build           | `VITE_API_BASE_URL=https://example.invalid pnpm build` |

`pnpm test:api` runs the whole suite (all three Vitest projects) in one command, merges coverage, and applies the gate — the local equivalent of the `test` matrix + `coverage` job combined. (CI splits it across three runners for wall-clock, then merges the blobs; the config and gate are identical.)

### Common failures

| Failure                                     | Cause                                                                  | Fix                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `lint` fails with "unused variable"         | ESLint rule violation                                                  | Fix the linting issue; do not use `// eslint-disable` except in justified cases       |
| `type-check` fails                          | TypeScript error introduced without running local type-check           | Run `pnpm type-check` before pushing                                                  |
| `format` fails                              | Files not formatted with Prettier                                      | Run `pnpm format` and commit the changes                                              |
| `test` fails with container startup timeout | Testcontainers failed to pull an image or Docker had a transient error | Re-run the job — transient Docker failures are rare but happen                        |
| `test` fails with port conflict             | Unlikely on GitHub runners; more common locally                        | See [Troubleshooting](./troubleshooting.md)                                           |
| `build` fails                               | TypeScript or missing env variable                                     | Check the build output; ensure any new required env variable has a build-time default |

### Cancellation behaviour

If CI was cancelled (e.g., because a new commit was pushed), the run shows as "Cancelled". No action is needed — CI will re-run for the new commit automatically.

---

## Adding a New CI Step

To add a check (e.g., a security scanner, a new test command):

1. Open `.github/workflows/ci.yml`.
2. Add a new job (or add a step to an existing job) that `needs: check-draft`.
3. Follow the same setup pattern as the other jobs (checkout → pnpm/action-setup → setup-node with `node-version-file: .nvmrc` and cache → frozen install → your command). **Pin every action by commit SHA** (append `# vX.Y.Z`) — the `zizmor` job fails on an unpinned action.
4. If the check depends on source code, gate each step on `if: needs.changes.outputs.code == 'true'` and add `changes` to `needs`, so it no-ops on docs-only PRs while still reporting its check (see [Docs-only optimization](#docs-only-optimization)).
5. If the check should not block merging (advisory only), set `continue-on-error: true` on the step.

Example new job skeleton (copy the pinned SHAs from an existing job so they stay consistent):

```yaml
my-check:
  needs: [check-draft, changes]
  name: My Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@<sha> # v7.0.0
      if: needs.changes.outputs.code == 'true'
      with:
        persist-credentials: false
    - uses: pnpm/action-setup@<sha> # v6.0.9
      if: needs.changes.outputs.code == 'true'
    - uses: actions/setup-node@<sha> # v6.4.0
      if: needs.changes.outputs.code == 'true'
      with:
        node-version-file: .nvmrc
        cache: pnpm
    - run: pnpm install --frozen-lockfile
      if: needs.changes.outputs.code == 'true'
    - run: pnpm my-check-command
      if: needs.changes.outputs.code == 'true'
```

---

## Skipping CI for a Commit

GitHub Actions honours `[skip ci]` in the commit message. Alternatively, keep the PR as a draft — CI will not run until the PR is marked as ready for review.

---

## Security & supply-chain scanning

These run in CI today — most as jobs in `ci.yml`, the rest as dedicated workflows (see [Overview](#overview)):

| Capability                        | Where                                                              |
| --------------------------------- | ------------------------------------------------------------------ |
| SAST (static analysis)            | CodeQL (`codeql.yml`)                                              |
| Secret scanning                   | `secret-scan` job (betterleaks, full history)                      |
| Dependency vulnerability scanning | `audit` job (`pnpm audit`) + Dependabot (`.github/dependabot.yml`) |
| GitHub Actions workflow security  | `zizmor` job + SHA-pinned actions                                  |
| Container image scanning          | Trivy (`trivy.yml`)                                                |
| Supply-chain posture              | OpenSSF Scorecard (`scorecard.yml`)                                |

## What CI Does Not Cover

| Capability                              | Status                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment to Azure                     | **Manual** — see [API Deployment](../infrastructure/ApiDeployment.md) and [Frontend Deployment](../infrastructure/StaticWebAppDeployment.md) |
| Infrastructure provisioning             | **Manual** — see [Deployment Guide](../infrastructure/Deployment.md)                                                                         |
| Database migrations                     | **Manual** — see [Database Migrations](../infrastructure/Migrations.md)                                                                      |
| Frontend (`apps/web`) unit tests        | **Implemented** — Vitest + jsdom + React Testing Library over the logic layers; global coverage floor enforced in CI                         |
| End-to-end (browser) tests              | **Not implemented**                                                                                                                          |
| Dynamic analysis (DAST / fuzzing)       | **Not implemented**                                                                                                                          |
| Release tagging or changelog generation | **Not implemented**                                                                                                                          |

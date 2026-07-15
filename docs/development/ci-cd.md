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

| Job                     | Purpose                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `check-draft`           | Entry gate; skips everything on draft PRs.                                                                            |
| `changes`               | Classifies the PR as code vs docs-only.                                                                               |
| `verify-changes-filter` | Guards the `changes` filter against drift (`scripts/check-ci-changes-filter.mjs`).                                    |
| `lint`                  | ESLint across the monorepo (`--max-warnings=0`).                                                                      |
| `type-check`            | `tsc --noEmit` across all projects.                                                                                   |
| `format`                | Prettier `--check`.                                                                                                   |
| `test`                  | Vitest + Testcontainers, 3-leg matrix (see below).                                                                    |
| `coverage`              | Merges the three test legs' coverage and enforces the `apps/api` gate (90% lines/statements/functions, 85% branches). |
| `build`                 | Turborepo build of all apps and packages.                                                                             |
| `audit`                 | `pnpm audit --prod --audit-level moderate` (dependency vulnerabilities).                                              |
| `zizmor`                | Static analysis of the GitHub Actions workflows.                                                                      |
| `docs-links`            | Broken local-link check for Markdown docs (lychee, offline).                                                          |
| `secret-scan`           | Full-history secret scan (betterleaks).                                                                               |

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

This is a matrix job with three legs that **partition** the suite into disjoint sets, so the storage layer is exercised against **both** storage providers without running the non-storage files more than once:

| Leg (check name)       | `STORAGE_PROVIDER`    | Command                   | Scope                                                                                         |
| ---------------------- | --------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `Test (base)`          | `azure_blob_storage`¹ | `pnpm test:base`          | The full suite **except** the storage manifest — the bulk, run once.                          |
| `Test (storage-azure)` | `azure_blob_storage`  | `pnpm test:storage-azure` | **Only** the storage manifest (`apps/api/test/setup/storageTestManifest.ts`) against Azurite. |
| `Test (storage-minio)` | `minio`               | `pnpm test:storage-minio` | **Only** the storage manifest against MinIO.                                                  |

`base ∪ storage-azure ∪ storage-minio` covers the full suite, and `base` is disjoint from the storage legs. The storage manifest is the single source of truth for both the base leg's `exclude` and the storage legs' `include`; each test script sets `STORAGE_PROVIDER` itself, which selects the testcontainer in `globalSetup.ts`.

¹ The `base` leg sets `STORAGE_PROVIDER=azure_blob_storage` only so `buildStorageConfig()` passes at `app.ready()` without depending on the storage container starting — it never touches real storage (its `app.storage` is the throwing adapter). It runs against Azurite like `storage-azure` at the container level, but exercises zero storage-manifest files.

Before running the tests, all three legs run `pnpm test:verify-storage-manifest` — a static gate that fails if a test touches real storage but is missing from the manifest (or vice versa). A runtime guard backs it up: a storage-agnostic test's `app.storage` is a throwing adapter, so accidental storage access fails loudly. See [Storage test manifest](#storage-test-manifest) below.

**Coverage artifact:** After each leg (even on failure), its coverage report is uploaded — `coverage-report-base`, `coverage-report-storage-azure`, and `coverage-report-storage-minio`:

```yaml
- uses: actions/upload-artifact@v7
  if: always()
  with:
    name: ${{ matrix.coverage_artifact }}
    path: apps/api/coverage/
    retention-days: 7
```

Download the artifact from the GitHub Actions run UI to inspect line-by-line coverage.

#### Storage test manifest

`apps/api/test/setup/storageTestManifest.ts` lists the tests that exercise real object storage. Two layers keep it from drifting:

- **Static** — `pnpm test:verify-storage-manifest` scans the tests for storage markers (e.g. `inject("storageDescriptor")`, `uploadFixture(...)`, `app.storage.<method>`) and fails with an actionable message if a marked test is missing from the manifest, an entry no longer exists, or an entry has no markers.
- **Runtime** — `createTestApp` installs a throwing storage adapter when no `storageDescriptor` is passed, so a test that quietly reaches for storage fails immediately instead of passing against a fake backend.

When you add a test that uploads/reads files, add its path to `STORAGE_TEST_MANIFEST` (and pass `storageDescriptor: inject("storageDescriptor")` to `createTestApp`).

---

### `coverage`

Enforces a **per-metric coverage gate** for `apps/api`: **90%** lines, statements, and functions; **85%** branches. (Branch coverage is held to an intermediate 85% — most of the remaining uncovered branches are error/edge paths behind integration-test setup plus defensive guards — and is ratcheting toward 90%.)

Because the `test` matrix **partitions** the suite into three disjoint legs, no single leg exercises the whole codebase — so a per-run Vitest threshold cannot be used (a leg would fail on the files it never runs). Vitest's own thresholds are therefore kept at `0` (informational; the numbers still print in each leg's report — see `apps/api/vitest.shared.ts`), and the real gate lives here:

1. Each `test` leg uploads its raw Istanbul coverage (`coverage-final.json`) as an artifact.
2. This job (`needs: test`) downloads all three, and `scripts/check-coverage.mjs` **merges** them — a line covered by _any_ leg counts as covered — then fails if any metric's merged percentage falls below its threshold (90% lines/statements/functions, 85% branches).

The thresholds are per-metric constants in `scripts/check-coverage.mjs` (override locally per-metric with `COVERAGE_THRESHOLD_LINES` / `_STATEMENTS` / `_FUNCTIONS` / `_BRANCHES`, or all at once with the bare `COVERAGE_THRESHOLD` env var). If a `test` leg fails, this job is skipped (the PR is already blocked, and there is no complete coverage to merge).

> **Scope:** this gate covers `apps/api` only. Frontend (`apps/web`) test coverage is tracked separately in issue #477.

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
- `test` provides dummy connection vars that satisfy the config validation in `apps/api/src/config/environment.ts`: `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_CONTAINER_NAME`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`. `STORAGE_PROVIDER` itself is set by each test script (`azure_blob_storage` for `test:base` and `test:storage-azure`, `minio` for `test:storage-minio`); the `base` leg sets it purely so boot validation passes without the storage container. None of these are real secrets — the actual connection details come from the testcontainer started by `globalSetup.ts`.

---

## Debugging CI Failures

### View logs

In the GitHub Actions run UI, expand the failing job and step to see the full output. Pino structured logs from tests are printed to stdout and captured there.

### Download the coverage report

The `coverage-report-base`, `coverage-report-storage-azure`, and `coverage-report-storage-minio` artifacts are uploaded after every test run. Download them from the "Artifacts" section of the run summary to see which lines are not covered. (Each leg reports coverage for only the files it ran, so no single artifact is the whole picture.)

### Reproduce locally

Every CI job runs the same command you can run locally:

| CI job               | Local command                                                  |
| -------------------- | -------------------------------------------------------------- |
| lint                 | `pnpm lint`                                                    |
| type-check           | `pnpm type-check`                                              |
| format               | `pnpm format:check` (or `pnpm format` to fix)                  |
| test (base)          | `pnpm test:verify-storage-manifest && pnpm test:base`          |
| test (storage-azure) | `pnpm test:verify-storage-manifest && pnpm test:storage-azure` |
| test (storage-minio) | `pnpm test:verify-storage-manifest && pnpm test:storage-minio` |
| build                | `VITE_API_BASE_URL=https://example.invalid pnpm build`         |

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
| Frontend (`apps/web`) unit tests        | **Not implemented** — tracked in issue #477                                                                                                  |
| End-to-end (browser) tests              | **Not implemented**                                                                                                                          |
| Dynamic analysis (DAST / fuzzing)       | **Not implemented**                                                                                                                          |
| Release tagging or changelog generation | **Not implemented**                                                                                                                          |

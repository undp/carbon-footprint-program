# CI/CD Pipeline

This document describes the continuous integration pipeline for Huella Latam: what triggers it, what jobs run, how failures are debugged, and how to extend or modify it.

---

## Overview

The project has a single workflow file at `.github/workflows/ci.yml`. It runs **only on pull requests targeting `main`** — there is no deployment pipeline in source control; deployments are performed manually via the scripts described in the [Infrastructure](../infrastructure/) docs.

---

## Trigger

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
```

| Condition | Behaviour |
|---|---|
| PR opened, pushed to, or reopened | CI runs |
| PR converted from draft to ready | CI runs |
| PR is still a draft | CI is **skipped** (see `check-draft` job below) |
| Push directly to `main` | CI does **not** run |

### Concurrency

Each PR gets its own concurrency group. If a new commit is pushed while CI is running, the in-progress run is cancelled and replaced:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

---

## Jobs

All five jobs use `ubuntu-latest`, Node 24, and pnpm with a shared pnpm cache. Dependencies are installed via `pnpm install --frozen-lockfile`.

### Dependency graph

```
check-draft
    ├── lint
    ├── type-check
    ├── format
    ├── test
    └── build
```

`lint`, `type-check`, `format`, `test`, and `build` all declare `needs: check-draft`. They run in **parallel** once `check-draft` passes.

---

### `check-draft`

```yaml
if: github.event.pull_request.draft == false
```

Acts as a gate. If the PR is a draft, this job is skipped, which causes all downstream jobs to be skipped too. No code is checked out — the job simply prints a message.

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

```bash
pnpm test
```

Runs the full Vitest + Testcontainers integration test suite. Docker is available on the GitHub-hosted runner, so Testcontainers can spin up PostgreSQL and Azurite containers.

**Coverage artifact:** After the test run (even on failure), the coverage report is uploaded:

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-report
    path: apps/api/coverage/
    retention-days: 7
```

Download the artifact from the GitHub Actions run UI to inspect line-by-line coverage.

---

### `build`

```bash
VITE_API_BASE_URL=https://example.invalid pnpm build
```

Builds all apps and packages via Turborepo. The frontend build requires `VITE_API_BASE_URL` to be set at build time; a placeholder URL is used in CI because the actual API URL is environment-specific. This verifies the build does not fail for any missing env variable that should be optional at build time.

---

## Environment Variables and Secrets

The CI workflow references **no secrets**. All test infrastructure (PostgreSQL, Azurite) is provided by Testcontainers on the runner, so no external Azure credentials are required.

The only env variable is `VITE_API_BASE_URL` in the `build` job, set to a placeholder.

---

## Debugging CI Failures

### View logs

In the GitHub Actions run UI, expand the failing job and step to see the full output. Pino structured logs from tests are printed to stdout and captured there.

### Download the coverage report

The `coverage-report` artifact is uploaded after every test run. Download it from the "Artifacts" section of the run summary to see which lines are not covered.

### Reproduce locally

Every CI job runs the same command you can run locally:

| CI job | Local command |
|---|---|
| lint | `pnpm lint` |
| type-check | `pnpm type-check` |
| format | `pnpm format:check` (or `pnpm format` to fix) |
| test | `pnpm test` |
| build | `VITE_API_BASE_URL=https://example.invalid pnpm build` |

### Common failures

| Failure | Cause | Fix |
|---|---|---|
| `lint` fails with "unused variable" | ESLint rule violation | Fix the linting issue; do not use `// eslint-disable` except in justified cases |
| `type-check` fails | TypeScript error introduced without running local type-check | Run `pnpm type-check` before pushing |
| `format` fails | Files not formatted with Prettier | Run `pnpm format` and commit the changes |
| `test` fails with container startup timeout | Testcontainers failed to pull an image or Docker had a transient error | Re-run the job — transient Docker failures are rare but happen |
| `test` fails with port conflict | Unlikely on GitHub runners; more common locally | See [Troubleshooting](./troubleshooting.md) |
| `build` fails | TypeScript or missing env variable | Check the build output; ensure any new required env variable has a build-time default |

### Cancellation behaviour

If CI was cancelled (e.g., because a new commit was pushed), the run shows as "Cancelled". No action is needed — CI will re-run for the new commit automatically.

---

## Adding a New CI Step

To add a check (e.g., a security scanner, a new test command):

1. Open `.github/workflows/ci.yml`.
2. Add a new job (or add a step to an existing job) that `needs: check-draft`.
3. Follow the same setup pattern as the other jobs (checkout → pnpm/action-setup → setup-node v24 with cache → frozen install → your command).
4. If the check should not block merging (advisory only), set `continue-on-error: true` on the step.

Example new job skeleton:

```yaml
  my-check:
    needs: check-draft
    name: My Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm my-check-command
```

---

## Skipping CI for a Commit

GitHub Actions honours `[skip ci]` in the commit message. Alternatively, keep the PR as a draft — CI will not run until the PR is marked as ready for review.

---

## What CI Does Not Cover

| Capability | Status |
|---|---|
| Deployment to Azure | **Manual** — see [API Deployment](../infrastructure/ApiDeployment.md) and [Frontend Deployment](../infrastructure/StaticWebAppDeployment.md) |
| Infrastructure provisioning | **Manual** — see [Deployment Guide](../infrastructure/Deployment.md) |
| Database migrations | **Manual** — see [Database Migrations](../infrastructure/Migrations.md) |
| End-to-end (browser) tests | **Not implemented** |
| Security scanning / SAST | **Not implemented** |
| Dependency vulnerability scanning | **Not implemented** |
| Release tagging or changelog generation | **Not implemented** |

# Testing Guide

This document describes the test infrastructure, conventions, and patterns used across the Huella Latam monorepo: the `apps/api` integration suite (Vitest + Testcontainers) and the `apps/web` unit suite (Vitest + jsdom + React Testing Library — see [Web unit tests](#web-unit-tests-appsweb)).

---

## Overview

The API uses **Vitest** with **Testcontainers** for integration testing. Tests run against real PostgreSQL and object-storage containers (Azurite for the `storage-azure` project, MinIO for `storage-minio`) — there are no mocks for the database layer. All **API** tests live under `apps/api/test/`; the web app's unit tests are **co-located** under `apps/web/src/` (see [Web unit tests](#web-unit-tests-appsweb)).

| Aspect         | Detail                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework      | Vitest 4.x                                                                                                                                             |
| Test type      | Integration (HTTP layer + real DB)                                                                                                                     |
| Database       | Testcontainers — `postgres:18-alpine`                                                                                                                  |
| Storage        | Testcontainers — Azurite (`storage-azure` project) or MinIO (`storage-minio` project)                                                                  |
| Authentication | `AUTH_PROVIDER=forced-user` (hardcoded for all tests)                                                                                                  |
| Execution      | Parallel — files run across workers, each file gets its own database                                                                                   |
| Coverage       | v8 provider; per-project thresholds held at 0 (informational). The real gate is applied after merging the three projects — see the coverage note below |

---

## Directory Structure

```
apps/api/test/
├── setup/
│   ├── globalSetup.ts               # Starts/stops containers; migrates + seeds the template DB
│   ├── testDatabase.ts              # PostgreSQL container + migration/seed helpers
│   ├── testStorage.ts               # Storage container (Azurite or MinIO, per project name)
│   ├── perFileDatabase.ts           # Clones a private DB per test file from the template
│   ├── storageTestManifest.ts       # Manifest of storage-dependent tests (both storage CI legs)
│   └── assertStorageTestManifest.ts # Static verifier (pnpm test:verify-storage-manifest)
├── factories/                  # Test data helpers
│   ├── appFactory.ts           # Creates a ready Fastify test instance
│   ├── userFactory.ts
│   ├── organizationFactory.ts
│   ├── submissionFactory.ts
│   ├── carbonInventorySeeder.ts
│   ├── storageHelper.ts        # Seeds fixture objects via the storage adapter
│   └── ...                     # One factory per domain entity
└── features/                   # Integration tests
    ├── carbonInventories/
    ├── files/
    ├── organizations/
    ├── submissions/
    ├── users/
    └── ...
```

Test files follow the naming pattern:

```
test/features/<feature>/<action>/integration.test.ts
test/features/<feature>/<action>/service.test.ts   # service-level unit tests
```

---

## Global Setup and Database Lifecycle

`test/setup/globalSetup.ts` runs once **per Vitest project** before that project's tests:

1. **PostgreSQL container** — `postgres:18-alpine`, credentials `testuser:testpass`, database `testdb`. Startup timeout: 180 s (accounts for first image pull in CI).
2. **Storage container** — chosen from the **project name** (not an env var): the `storage-azure` project boots Azurite (`mcr.microsoft.com/azure-storage/azurite`, in-memory), `storage-minio` boots MinIO (`minio/minio`), and `base` boots **none** (its tests never touch storage). See `test/setup/testStorage.ts`. The `test-files` container/bucket is not pre-created — the test adapters in `@repo/storage/testing` create it lazily and idempotently. Startup timeout: 120 s. If the storage container fails, database-only tests still run.
3. **Migrations** — `prisma migrate deploy` is executed once against the **template** database (`testdb`).
4. **Seeding** — the `@repo/seed` runner (`pnpm run seed` in `tools/seed`) with `SEEDS_DATASET=testing` populates all lookup tables (countries, job positions, methodologies, etc.) in the template.
5. **Context injection** — the template database URL (`databaseUrl`) and a storage descriptor (`storageDescriptor`, provider + connection details, or `null` for `base`) are passed to that project's workers via Vitest's `project.provide()` interface. The dynamic MinIO endpoint is applied from that descriptor in `createTestApp` before `app.ready()`.

The teardown function stops the project's containers after its tests complete.

### Per-file database isolation

`test/setup/perFileDatabase.ts` (registered in `setupFiles`, so it runs once per
test file) gives every file its **own** database, cloned from the seeded template:

```sql
CREATE DATABASE "t_<sha256(testFilePath)[:16]>" TEMPLATE "testdb"
```

- `TEMPLATE testdb` is a fast, file-level Postgres copy of the already-migrated
  **and** seeded database — no per-file migrate/seed cost.
- `createTestApp(...)` automatically connects to the current file's database, so
  the standard `createTestApp(inject("databaseUrl"))` call needs no changes.
- **Consequence:** each file starts from pristine seeded state. You do **not**
  need to clean up rows so the next file stays clean — files can no longer
  contaminate each other, which is what lets them run in parallel.
- The per-file databases are **not** dropped: the Postgres container is ephemeral
  and is discarded when the suite ends. On the rare name clash (hash collision or
  a re-run against a live container) the setup appends a numeric suffix so the
  file still gets its own fresh database.

> **Note:** the **storage** container (Azurite/MinIO) and its `test-files` bucket
> are still shared across files. Storage-touching tests should use unique keys.

**Requirements:**

- Docker must be running before executing tests.
- On Linux: `sudo systemctl start docker`

---

## Running Tests

```bash
# Run every test suite (API storage legs + web + seed)
pnpm test

# Run all API tests (all three Vitest projects), merge coverage, apply the gate
pnpm test:api

# Run the apps/web suite (Vitest + jsdom; builds @repo/* deps first).
# Runs with coverage and enforces a global coverage floor (see the note below).
pnpm test:web

# Run the tools/seed unit tests
pnpm test:seed

# Run a single API test file
pnpm test --filter=api -- /createUser/integration.test.ts --coverage=false

# Run all tests for a domain
pnpm test --filter=api -- /organizations --coverage=false

# Open the Vitest UI dashboard
pnpm --filter=api test:ui
```

> **Web coverage floor.** `pnpm test:web` runs with `--coverage` and enforces a
> **low global coverage floor** (thresholds in `apps/web/vitest.config.ts`).
> Unlike the API — which enforces a merged 90% gate on all four metrics — the web floor is
> deliberately low: `coverage.all` counts every file under `src/**`, and the app
> is ~98% render-heavy, untested `screens/`/`components/`, so a high global gate
> is impractical. The floor is a **regression guard** set just below the current
> level to prevent backsliding, and is meant to be **ratcheted up over time** as
> the logic layers (`utils/`, `hooks/`, `stores/`, `components/Chatbot/`) gain
> tests — raise it by adding coverage, not by bumping the number, since adding
> untested UI lowers the global percentage. The coverage-free fast dev loop is
> `pnpm --filter=web test:watch` (no threshold checks).

---

## Web unit tests (`apps/web`)

The web app is tested with **Vitest** + **jsdom** + **React Testing Library**. Tests are **co-located** next to the source as `*.test.ts(x)` (unlike the API's separate `test/` tree) and picked up by `include: ["src/**/*.{test,spec}.{ts,tsx}"]` in `apps/web/vitest.config.ts`.

Run them with `pnpm test:web` (Turbo builds the `@repo/*` deps first, then runs Vitest **with coverage**). Use `pnpm --filter=web test:watch` for the coverage-free fast loop. Config: `apps/web/vitest.config.ts` + `vitest.setup.ts`.

### What's covered

Coverage targets the **logic layers**, each at ~100%:

| Layer                 | Examples                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `utils/`              | `getApiErrorMessage`, `formatting`, the Excel exporters, `files`, `validateLineFileOriginalName` |
| `hooks/`              | `useCarbonInventoryAccess`, `useReductionProjectAccess`, `useFuzzySearch`, `useChatbotSize`      |
| `stores/`             | `userStore`, `sidebarStore` (Zustand)                                                            |
| `labels/chips/`       | the enum → label/color chip mappers                                                              |
| `components/Chatbot/` | `useChatStream`, `MessageBubble`, `ChatbotIcon`                                                  |
| route guards          | `requireRole`                                                                                    |

Render-heavy `screens/`/`components/` and the `api/**` query hooks are **deliberately deferred** — they need render/MSW scaffolding and a dedicated effort; browser E2E (Playwright) is not set up. As a result the _global_ coverage figure is low (~8% lines) even though the covered files are near-100%.

### Coverage floor (ratchet)

`pnpm test:web` enforces a **low global coverage floor** (thresholds in `vitest.config.ts`). Because Vitest's `coverage.all` counts every file under `src/**` (~9,900 lines) and the app is ~98% untested UI, the floor is a **regression guard, not a target**. It is set just under the current level and **ratcheted up as tests are added** — raise it by adding coverage, never by just bumping the number. Adding untested UI lowers the global percentage, so the floor keeps a little headroom below current.

### Conventions & patterns

- **Assert exact Spanish strings** — mirror private/user-facing copy as local constants so a copy change trips a test deliberately.
- **Determinism** — no `Date.now()` / argless `new Date()`; use `vi.useFakeTimers()` for debounce/timeout logic and pass explicit dates to formatters.
- **Query-backed hooks** (`useCarbonInventoryAccess`, …) — `vi.mock` the underlying TanStack Query hook (via `vi.hoisted`) and `renderHook`; no `QueryClientProvider` needed because the real `useQuery` never runs.
- **Zustand stores** — drive via `store.getState()` / `store.setState()`; no render.
- **Components** — React Testing Library `render` + `screen`; MUI's `useTheme()` falls back to the default theme, so no `ThemeProvider` wrapper is needed for content/role assertions.
- **Excel exporters** — round-trip the written buffer back through a fresh `ExcelJS.Workbook().xlsx.load(...)` and assert on cells.
- **jsdom gaps handled in `vitest.setup.ts`** — an in-memory `localStorage` polyfill (jsdom here provides `sessionStorage` but not `localStorage`); jest-dom matchers are registered there, with an ambient `src/vitest.d.ts` (`import "@testing-library/jest-dom/vitest"`) so `tsc` sees `toBeInTheDocument` etc.

> **CI resolution gotcha:** always run via `pnpm test:web` (`turbo run test --filter=web`), which builds the `@repo/*` deps to `dist` first. A bare `pnpm --filter=web test` skips that build and fails to resolve `@repo/*` on a clean checkout.

---

## Writing a Test for a New Feature

### 1 — Create the test file

Place the file at:

```
apps/api/test/features/<feature>/<action>/integration.test.ts
```

### 2 — Standard test skeleton

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/<feature> - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl"); // injected by globalSetup
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Optional: this file has its own database, so cleanup is NOT required for
  // isolation from other files. Add an afterEach only if tests within THIS file
  // need a clean slate from each other.
  afterEach(async () => {
    await prisma.<model>.deleteMany({ where: { ... } });
  });

  it("should <expected behavior>", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/<feature>",
      payload: { ... },
    });

    expect(response.statusCode).toBe(201);

    // Verify database state
    const record = await prisma.<model>.findFirst({ where: { ... } });
    expect(record).toBeDefined();
  });
});
```

### 3 — Key conventions

| Convention           | Detail                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Get the DB URL       | `const databaseUrl = inject("databaseUrl")`                                                                                                                                                                                |
| Create the app       | `createTestApp(databaseUrl)`                                                                                                                                                                                               |
| Storage tests        | Pass `{ storageDescriptor: inject("storageDescriptor") }` to `createTestApp` and list the file in the [storage test manifest](./ci-cd.md#storage-test-manifest); without a descriptor, `app.storage` is a throwing adapter |
| Make HTTP calls      | `app.inject({ method, url, payload })`                                                                                                                                                                                     |
| Seed lookup data     | Already present from global seed; query with `prisma.<model>.findFirst()`                                                                                                                                                  |
| Create test entities | Use the factories in `test/factories/`                                                                                                                                                                                     |
| Clean up             | Not needed for isolation — each file has its own database. Use `afterEach`/`beforeEach` only if a test needs a clean slate from _other tests in the same file_                                                             |
| Auth                 | All requests are automatically authenticated as the seeded test user; no auth headers needed                                                                                                                               |

---

## Test Factories

Factories create test-specific entities and return them for use in assertions. They are not fixtures — they write to the database.

| Factory                      | Purpose                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appFactory.ts`              | `createTestApp(databaseUrl, options?)` — Fastify instance with Prisma; a real storage adapter when `storageDescriptor` is passed, a throwing adapter otherwise |
| `userFactory.ts`             | `getTestLoggedUser()`, `createTestUser()`, `cleanupTestUsers()`                                                                                                |
| `organizationFactory.ts`     | `createTestOrganization()`, `cleanupTestOrganization()`                                                                                                        |
| `organizationDataFactory.ts` | Creates `OrganizationData` linked to an organization                                                                                                           |
| `submissionFactory.ts`       | `buildOrganizationDataSubmission()` — creates org → org data → submission chain                                                                                |
| `carbonInventorySeeder.ts`   | `cleanupCarbonInventoryTestData()`                                                                                                                             |
| `methodologyFactory.ts`      | `getTestMethodologyVersionId()`, `getTestCountryId()`                                                                                                          |
| `fileFactory.ts`             | `createTestFile()`, `createTestFileForSubmission()`, `createTestFileForBadge()`                                                                                |
| `storageHelper.ts`           | `uploadFixture()` — seeds a fixture object via the storage adapter (provider-agnostic)                                                                         |

---

## Testing Multi-Step Workflows

For features that span multiple HTTP calls (e.g., request-upload → upload → confirm), write a single `it` block that executes the full sequence. These tests touch real storage, so create the app with `createTestApp(databaseUrl, { storageDescriptor: inject("storageDescriptor") })` and list the file in the storage test manifest:

```typescript
it("should complete the full file upload lifecycle", async () => {
  // Step 1 — Request an upload URL
  const requestResponse = await app.inject({
    method: "POST",
    url: "/api/files/badge/CARBON_INVENTORY_CALCULATION/request-upload",
    payload: { originalName: "badge.png" },
  });
  expect(requestResponse.statusCode).toBe(200);
  const { uuid, uploadUrl } = JSON.parse(requestResponse.body);

  // Step 2 — Simulate client uploading the file directly to storage
  const blobPath = `BADGE/CARBON_INVENTORY_CALCULATION/${uuid}-badge.png`;
  await uploadFixture(app.storage, blobPath, { contentType: "image/png" });

  // Step 3 — Confirm the upload
  const confirmResponse = await app.inject({
    method: "POST",
    url: "/api/files/badge/CARBON_INVENTORY_CALCULATION/confirm-upload",
    payload: { uuid, originalName: "badge.png" },
  });
  expect(confirmResponse.statusCode).toBe(201);
});
```

---

## Service-Level Unit Tests

For complex service functions, a service-level test (without HTTP) can pass a stubbed
storage adapter straight into the service. Use `createMockStorageAdapter()` — it returns a
`StorageAdapter` whose every method is a `vi.fn()` with a canned default, so you assert on
calls or override individual methods per test:

```typescript
import { createMockStorageAdapter } from "@test/factories/mockStorageAdapter.js";

const mockStorage = createMockStorageAdapter();

// Override a single method for this test:
mockStorage.createReadUrlSigner.mockResolvedValue(signerSpy);

// Inject it into the service under test (no HTTP, no container):
const result = await getOrganizationHistory({ storage: mockStorage /* ... */ });

expect(mockStorage.createReadUrlSigner).toHaveBeenCalledTimes(1);
```

When you already have an `app` from `createTestApp`, spy on the real adapter instead of
mocking a module — e.g. `vi.spyOn(app.storage, "copyObject")` to make a copy/delete inert
or to assert it ran.

Use this pattern sparingly. Prefer integration tests with real Testcontainers where the overhead is acceptable.

---

## What to Test

Every new endpoint should have tests covering:

| Case                 | Assertion                                    |
| -------------------- | -------------------------------------------- |
| Happy path           | HTTP 2xx, response shape, database state     |
| Validation error     | HTTP 400, error message                      |
| Not found            | HTTP 404 for unknown IDs                     |
| Authorization        | HTTP 403 when user lacks required role       |
| Constraint violation | HTTP 4xx for FK violations, unique conflicts |

---

## Vitest Configuration Reference

Key settings live in `apps/api/vitest.shared.ts` (`defineApiVitestProject` builds one project; `apiCoverageConfig` is the shared coverage block). `apps/api/vitest.config.ts` assembles them into a single config with three **projects** (`test.projects`): `base` (the full suite **minus** the storage manifest), `storage-azure`, and `storage-minio` (**only** the storage manifest, one per provider). One config drives both `vitest run --coverage` locally and the `--project=<leg>` legs in CI:

| Setting               | Value                                                    | Reason                                                                                                                                                    |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxWorkers`          | 4                                                        | Run files in parallel; safe because each file has its own database                                                                                        |
| `fileParallelism`     | true                                                     | Files run concurrently across workers                                                                                                                     |
| `testTimeout`         | 30 000 ms                                                | Allows for slower container I/O                                                                                                                           |
| `hookTimeout`         | 30 000 ms                                                | Allows beforeAll/afterAll to complete                                                                                                                     |
| `teardownTimeout`     | 10 000 ms                                                | Container shutdown grace period                                                                                                                           |
| `globalSetup`         | `./test/setup/globalSetup.ts`                            | Container lifecycle; migrate + seed the template DB                                                                                                       |
| `setupFiles`          | `./test/setup/perFileDatabase.ts`                        | Clones a private database per test file                                                                                                                   |
| `coverage.thresholds` | 0 in the config (branches, functions, lines, statements) | Per-project thresholds would fail on the files a project never runs; the real gate is passed by flag at the merge/gate step — see the coverage note below |

> **Note on coverage:** the per-project thresholds in `vitest.shared.ts` are held
> at **0** (informational only). This is deliberate: the suite is partitioned into
> three projects (`base`, `storage-azure`, `storage-minio`), so no single project
> exercises the whole codebase and a per-project threshold would fail on the files
> it never runs. The **real gate is not disabled** — it is applied only after the
> three projects' coverage is merged, and passed by flag (same thresholds locally
> and in CI): **90%** for all four metrics — lines, statements, functions, and
> branches. v8 merges hit-counts, so a line covered by _any_ project counts as
> covered.
>
> - **Locally:** `pnpm test:api` runs all three projects in one `vitest run --coverage`, merges their coverage, and applies the gate.
> - **In CI:** each leg emits a blob report (`--reporter=blob`); the `coverage` job merges them (`vitest run --merge-reports --coverage`) and applies the gate. No external merge script.
>
> See the [`coverage` job](./ci-cd.md#coverage) in the CI/CD guide.

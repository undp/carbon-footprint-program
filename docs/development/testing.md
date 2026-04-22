# Testing Guide

This document describes the test infrastructure, conventions, and patterns used in the Huella Latam API.

---

## Overview

The API uses **Vitest** with **Testcontainers** for integration testing. Tests run against real PostgreSQL and Azure Blob Storage (Azurite) containers — there are no mocks for the database layer. All tests live under `apps/api/test/`.

| Aspect         | Detail                                                |
| -------------- | ----------------------------------------------------- |
| Framework      | Vitest 4.x                                            |
| Test type      | Integration (HTTP layer + real DB)                    |
| Database       | Testcontainers — `postgres:18-alpine`                 |
| Storage        | Testcontainers — Azurite (Azure Storage emulator)     |
| Authentication | `AUTH_PROVIDER=forced-user` (hardcoded for all tests) |
| Execution      | Sequential — single worker, no file parallelism       |
| Coverage       | v8 provider; 80% thresholds enforced locally          |

---

## Directory Structure

```
apps/api/test/
├── setup/
│   ├── globalSetup.ts          # Starts/stops containers; runs migrations + seeds
│   └── testcontainers.ts       # Container lifecycle helpers
├── factories/                  # Test data helpers (16 utilities)
│   ├── appFactory.ts           # Creates a ready Fastify test instance
│   ├── userFactory.ts
│   ├── organizationFactory.ts
│   ├── submissionFactory.ts
│   ├── carbonInventorySeeder.ts
│   ├── blobHelper.ts           # Uploads blobs directly to Azurite
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

`test/setup/globalSetup.ts` runs once before all tests:

1. **PostgreSQL container** — `postgres:18-alpine`, credentials `testuser:testpass`, database `testdb`. Startup timeout: 180 s (accounts for first image pull in CI).
2. **Azurite container** — `mcr.microsoft.com/azure-storage/azurite`, in-memory mode. Container `test-files` is pre-created. Startup timeout: 120 s. If Azurite fails, database-only tests still run.
3. **Migrations** — `prisma migrate deploy` is executed against the test database.
4. **Seeding** — `prisma db seed` with `SEEDS_DATASET=testing` populates all lookup tables (countries, job positions, methodologies, etc.).
5. **Context injection** — the database URL and storage connection string are passed to workers via Vitest's `project.provide()` interface.

The teardown function stops both containers after all tests complete.

**Requirements:**

- Docker must be running before executing tests.
- On Linux: `sudo systemctl start docker`

---

## Running Tests

```bash
# Run all API tests
pnpm test

# Run a single test file
pnpm test --filter=api -- /createUser/integration.test.ts --coverage=false

# Run all tests for a domain
pnpm test --filter=api -- /organizations --coverage=false

# Open the Vitest UI dashboard
pnpm --filter=api test:ui
```

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

  afterEach(async () => {
    // Delete only the records created by this test suite
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

| Convention           | Detail                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Get the DB URL       | `const databaseUrl = inject("databaseUrl")`                                                  |
| Create the app       | `createTestApp(databaseUrl)`                                                                 |
| Make HTTP calls      | `app.inject({ method, url, payload })`                                                       |
| Seed lookup data     | Already present from global seed; query with `prisma.<model>.findFirst()`                    |
| Create test entities | Use the factories in `test/factories/`                                                       |
| Clean up             | `afterEach` with targeted `deleteMany`; never truncate shared lookup tables                  |
| Auth                 | All requests are automatically authenticated as the seeded test user; no auth headers needed |

---

## Test Factories

Factories create test-specific entities and return them for use in assertions. They are not fixtures — they write to the database.

| Factory                      | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `appFactory.ts`              | `createTestApp(databaseUrl)` — Fastify instance with Prisma and optional Blob storage |
| `userFactory.ts`             | `getTestLoggedUser()`, `createTestUser()`, `cleanupTestUsers()`                       |
| `organizationFactory.ts`     | `createTestOrganization()`, `cleanupTestOrganization()`                               |
| `organizationDataFactory.ts` | Creates `OrganizationData` linked to an organization                                  |
| `submissionFactory.ts`       | `buildOrganizationDataSubmission()` — creates org → org data → submission chain       |
| `carbonInventorySeeder.ts`   | `cleanupCarbonInventoryTestData()`                                                    |
| `methodologyFactory.ts`      | `getTestMethodologyVersionId()`, `getTestCountryId()`                                 |
| `fileFactory.ts`             | `createTestFile()`, `createTestFileForSubmission()`, `createTestFileForBadge()`       |
| `blobHelper.ts`              | `uploadBlobToAzurite()` — uploads a blob directly to the Azurite container            |

---

## Testing Multi-Step Workflows

For features that span multiple HTTP calls (e.g., request-upload → upload → confirm), write a single `it` block that executes the full sequence:

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
  const storageConnectionString = inject("storageConnectionString");
  const blobPath = `BADGE/CARBON_INVENTORY_CALCULATION/${uuid}-badge.png`;
  await uploadBlobToAzurite(app.blobStorage!, blobPath, {
    contentType: "image/png",
  });

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

For complex service functions, a service-level test (without HTTP) can be written using Vitest mocks:

```typescript
import { vi } from "vitest";

// Hoist mocks before imports
const { mockCreateReadSasUrlSigner } = vi.hoisted(() => ({
  mockCreateReadSasUrlSigner: vi.fn(),
}));

vi.mock("@/services/blobService.js", async () => {
  const actual = await vi.importActual("@/services/blobService.js");
  return { ...actual, createReadSasUrlSigner: mockCreateReadSasUrlSigner };
});
```

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

Key settings in `apps/api/vitest.config.ts`:

| Setting                  | Value                                        | Reason                                                 |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `maxWorkers: 1`          | 1                                            | Sequential execution prevents container port conflicts |
| `fileParallelism: false` | false                                        | Ensures deterministic test order                       |
| `testTimeout`            | 30 000 ms                                    | Allows for slower container I/O                        |
| `hookTimeout`            | 30 000 ms                                    | Allows beforeAll/afterAll to complete                  |
| `teardownTimeout`        | 10 000 ms                                    | Container shutdown grace period                        |
| `globalSetup`            | `./test/setup/globalSetup.ts`                | Container lifecycle                                    |
| `setupFiles`             | Per-file environment initialization          |                                                        |
| `coverage.thresholds`    | 80% (branches, functions, lines, statements) | Enforced locally; disabled in CI                       |

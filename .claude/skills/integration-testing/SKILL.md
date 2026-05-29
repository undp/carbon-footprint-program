---
name: Integration Testing
description: How to write integration tests for the API using Vitest + Testcontainers (real PostgreSQL and Azurite containers, no DB mocks) — test location, app.inject() for HTTP, shared factories, forced-user auth, sequential execution, and coverage. Use when adding or modifying tests under apps/api/test.
when_to_use: Use when writing or updating an integration.test.ts file, setting up test data with factories, calling an endpoint in a test, configuring auth for tests, or running a single test file or domain test suite.
---

# Integration Testing

## Framework

Vitest + Testcontainers with **real** PostgreSQL and Azurite containers — no mocks for the database layer.

## Test location

Tests live under `test/`, separate from source:

```
apps/api/test/features/<feature>/<action>/integration.test.ts
```

## HTTP requests

Use `app.inject()` to call endpoints. No actual network is used — Fastify handles the request internally.

## Factories

Use the existing factories in `apps/api/test/factories/` for setup and data creation: `appFactory`, `userFactory`, `organizationFactory`.

## Auth in tests

Tests run with `AUTH_PROVIDER=forced-user`, which injects a hardcoded user without real authentication.

## Execution & coverage

- Tests run sequentially (`maxWorkers: 1`, `fileParallelism: false`).
- Coverage threshold is 80%, enforced locally.

## Running tests

- Single file:
  `pnpm test --filter=api -- /{feature-name}/integration.test.ts --coverage=false`
  e.g. `pnpm test --filter=api -- /getOrganizationById/integration.test.ts --coverage=false`
- All tests for a domain:
  `pnpm test --filter=api -- /{domain} --coverage=false`
  e.g. `pnpm test --filter=api -- organizations --coverage=false`

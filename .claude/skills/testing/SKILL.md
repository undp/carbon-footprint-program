---
name: testing
description: Integration testing for apps/api with Vitest + Testcontainers. Use when writing, running, or fixing API tests — test location/layout, app.inject() for HTTP, the existing factories, forced-user auth, sequential execution, and the coverage threshold.
---

# Testing Patterns

- **Framework**: Vitest + Testcontainers (real PostgreSQL and Azurite containers — no mocks for the database layer).
- **Test location**: `apps/api/test/features/<feature>/<action>/integration.test.ts` (tests live in `test/`, separate from source).
- **HTTP requests**: use `app.inject()` to call endpoints (no actual network — Fastify handles it internally).
- **Factories**: use existing factories in `apps/api/test/factories/` (`appFactory`, `userFactory`, `organizationFactory`) for test setup and data creation.
- **Auth in tests**: tests run with `AUTH_PROVIDER=forced-user`, which injects a hardcoded user without real authentication.
- **Execution**: tests run sequentially (`maxWorkers: 1`, `fileParallelism: false`).
- **Coverage**: 80% threshold enforced locally.

## Running tests

Command form is in CLAUDE.md › Commands. Examples:

- Single file: `pnpm test --filter=api -- /getOrganizationById/integration.test.ts --coverage=false`
- Whole domain: `pnpm test --filter=api -- organizations --coverage=false`

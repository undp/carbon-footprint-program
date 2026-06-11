---
name: api-backend
description: Backend/API conventions for apps/api (Fastify + Prisma). Use when building or modifying API endpoints — feature folder structure (route→handler→service→helpers), efficient Prisma queries (push logic to DB, parallelize, avoid overfetch, include wisely), interactive transactions to avoid TOCTOU, helper placement, and the packages/types domain layout.
---

# API & Backend Rules

## Feature structure

Follow the existing pattern — `route.ts` → `handler.ts` → `service.ts` (→ `helpers.ts` if needed) per feature, under `apps/api/src/features/`.

## Efficient database usage

Endpoints must be efficient and mindful that datasets grow over time. Apply these principles in order of preference:

1. **Push logic to the database**: use aggregations, filters, and calculations at the query level (`groupBy`, `count`, `_sum`, raw SQL when needed) instead of fetching raw rows and processing in memory.
2. **Parallelize independent queries**: use `Promise.all` or `prisma.$transaction` to run independent queries concurrently instead of sequentially.
3. **Avoid overfetching**: use `select` to retrieve only the fields you need. The dataset will grow and overfetching will degrade performance.
4. **Use `include` wisely**: prefer a single query with `include` over multiple sequential queries, but only include relations that are actually needed.

## Transactions

When an endpoint performs validations followed by updates (read-then-write), wrap them in a `prisma.$transaction` to avoid TOCTOU (time-of-check to time-of-use) race conditions. Use the interactive form (`prisma.$transaction(async (tx) => { ... })`) so that all reads and writes share the same transaction context and data stays consistent.

## Helper functions

Feature-specific helpers go in a separate `helpers.ts` within the feature directory, not inside `service.ts`. Keep `service.ts` focused on business logic and database operations. Promote a helper to the shared `apps/api/src/helpers/` directory only when reuse is actually observed — never speculatively.

## Types package structure (`packages/types/src/`)

Organized by domain (e.g., `organizations/`, `carbonInventories/`). Each domain contains:

- `schemas.ts` + `types.ts` at the domain root for shared schemas/types.
- `app/` and/or `admin/` subfolders to separate public and admin endpoints.
- Inside each subfolder, one directory per endpoint (e.g., `app/getOrganizationById/`) with its own `schemas.ts` and `types.ts` for params, query, body, and response.
- An `index.ts` at each level to re-export everything.

See also the **typescript-typing**, **api-authorization**, and **error-handling** skills.

# Plan: Initiatives Maintainer — API

## Context

Backend for the `/admin/reduction-plan` maintainer. Four CRUD-style endpoints restricted to `SystemRole.ADMIN` and `SystemRole.SUPERADMIN`, consumed by the frontend inline-edit grid.

Depends on the shared Zod contracts created in `database.plan.md` (`@repo/types` `reductionPlanInitiatives/admin/*`). No Prisma schema changes.

## Scope summary (api-relevant)

| Area                 | Decision                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| Route base           | `/api/admin/reduction-plan`                                                 |
| Roles (read + write) | `SystemRole.ADMIN`, `SystemRole.SUPERADMIN`                                 |
| Fields persisted     | `title`, `description`, `subcategoryId`                                     |
| Sort (getAll)        | `category.name` → `subcategory.name` → `title` (ASC)                        |
| Delete               | Soft delete (`status = DELETED`); idempotent                                |
| Update body          | Must reject `status` (400)                                                  |
| Validation           | enforced by `@repo/types` schemas                                           |
| Tests                | Integration tests per endpoint: role/auth (401, 403) + validation negatives |

## Backend — `apps/api/src/features/reductionPlanInitiatives/admin/`

Four action folders, each `{ route.ts, handler.ts, service.ts, integration.test.ts }`, modeled on `apps/api/src/features/organizations/admin/getAllOrganizations/`:

- `getAllInitiatives/`
  - Prisma query filtering `status = ACTIVE`.
  - `include: { subcategory: { include: { category: true } } }`.
  - `orderBy: [{ subcategory: { category: { name: "asc" } } }, { subcategory: { name: "asc" } }, { title: "asc" }]`.

- `createInitiative/`
  - Validate `subcategoryId` exists → `404` if not.
  - Insert with `status = ACTIVE`, `createdById = req.user.id`, `dimensionValue1Id = null`, `dimensionValue2Id = null`.
  - Return `{ id }` only — frontend invalidates the list query on success, so no need to echo the full row. Client uses the returned id to reconcile the newly-created row before the refetch lands.

- `updateInitiative/`
  - Load row → `404` if missing.
  - Reject if body contains `status` → `400` (enforced by the shared schema, but double-check).
  - Persist patch; set `updatedAt` and `updatedById = req.user.id`.

- `deleteInitiative/`
  - Set `status = DELETED`, `updatedAt = now`, `updatedById = req.user.id`.
  - Idempotent on rows already `DELETED` → still `200`.

## Route registration

Create `apps/api/src/routes/api/admin/reduction-plan/index.ts`, following `apps/api/src/routes/api/admin/requests/index.ts`:

```ts
fastify.addHook("onRequest", fastify.requireAuth);
fastify.addHook(
  "preHandler",
  fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])
);
```

Register this index in the admin router barrel.

## Integration tests — per endpoint

Focused negatives (positives minimal, just enough that negatives are meaningful):

- `401` unauthenticated
- `403` for `SystemRole.USER`
- `200` for `ADMIN` and `SUPERADMIN` (minimal happy path)
- Validation cases (split across create/update where applicable):
  - empty `title`
  - `title` > 120
  - `description` > 1000
  - missing `subcategoryId`
  - invalid `subcategoryId` (not found) → `404`
  - `status` present in update body → `400`
- `deleteInitiative`: idempotent second call still returns `200`.

Follow the patterns and factories described in the `api-testing` skill.

## Constants & enums

- `SystemRole.ADMIN`, `SystemRole.SUPERADMIN` — `@repo/database` (backend)
- `ReductionPlanInitiativeStatus.ACTIVE`, `.DELETED` — `@repo/database` (Prisma enum)
- `TITLE_MAX_LENGTH`, `DESCRIPTION_MAX_LENGTH` — `@repo/types` (reuse the constants exposed in `database.plan.md`)

## Files to read while implementing

- `apps/api/src/routes/api/admin/requests/index.ts` — admin router template
- `apps/api/src/features/organizations/admin/getAllOrganizations/` — feature folder template (route/handler/service/test shapes)
- `packages/types/src/reductionPlanInitiatives/admin/*` — shared Zod contracts (created in `database.plan.md`)
- Prisma schema `ReductionPlanInitiative` model (lines 1066–1085) + enum (line 1059)

## Verification

1. `pnpm type-check` — passes.
2. `pnpm lint` — clean.
3. `pnpm test --filter=api -- /reductionPlanInitiatives --coverage=false` — all new integration tests pass.
4. Manual (once `web.plan.md` is also implemented):
   - ADMIN + SUPERADMIN: read + write OK.
   - `USER`: GET returns `403`.
   - Unauthenticated: GET returns `401`.
   - Soft-deleted rows stay in DB and are excluded from default list.

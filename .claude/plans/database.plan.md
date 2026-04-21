# Plan: Initiatives Maintainer — Database & Types

## Context

`ReductionPlanInitiative` catalog powers suggested initiatives inside reduction plans (merged in #244). Today rows only land via Prisma seeds; no UI to curate them.

This sub-plan covers the shared Zod contracts in `@repo/types` consumed by the admin maintainer (`/admin/reduction-plan`). No Prisma schema migrations are required — the existing `ReductionPlanInitiative` model (Prisma schema lines 1066–1085) and `ReductionPlanInitiativeStatus` enum (line 1059) already expose every field we need.

## Scope summary (types-relevant)

| Area             | Decision                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| Fields persisted | `title`, `description`, `subcategoryId` only                                          |
| UI-only field    | `category` (filtering only, never in any request/response payload)                    |
| Validation       | `title` min 1 / max 120, `description` min 1 / max 1000, `subcategoryId` required     |
| Status           | `ACTIVE` on create; soft delete flips to `DELETED` (handled by API, not exposed here) |
| Status in update | Explicitly rejected in `updateInitiative` body                                        |

## Prisma / database

- No schema changes.
- Reuse enum `ReductionPlanInitiativeStatus` (values `ACTIVE`, `DELETED`) from `@repo/database`.
- Soft delete = `status = DELETED` (set by API service layer, not a new column).
- Confirm suggested-initiatives consumer (reduction-plan UI from #244) filters by `status = ACTIVE` so DELETED rows do not leak into user-facing lists. No code change expected here — just verify the existing query.

## Shared types — `packages/types/src/reductionPlanInitiatives/admin/`

Reuse `ReductionPlanInitiativeBaseSchema` (already at `packages/types/src/baseSchemas/reductionPlanInitiative.ts`) and `ReductionPlanInitiativeStatusSchema`.

Schemas to create (one folder per action):

- `getAllInitiatives/response.ts`

  ```
  z.array(
    ReductionPlanInitiativeBaseSchema
      .pick({ id, title, description, subcategoryId, createdAt, updatedAt })
      .extend({
        subcategory: SubcategoryBaseSchema
          .pick({ id, name })
          .extend({ category: CategoryBaseSchema.pick({ id, name }) }),
      }),
  )
  ```

- `createInitiative/request.ts` — body

  ```
  {
    title: z.string().trim().min(1).max(TITLE_MAX_LENGTH),
    description: z.string().trim().min(1).max(DESCRIPTION_MAX_LENGTH),
    subcategoryId: IdSchema,
  }
  ```

  (no dimension fields, no `status`)

- `createInitiative/response.ts` — same shape as list item.

- `updateInitiative/request.ts`
  - params: `{ id }`
  - body: partial of create body; `status` must be rejected explicitly (strict schema or `.refine` checking key absence).

- `updateInitiative/response.ts` — same shape as list item.

- `deleteInitiative/request.ts` — params `{ id }`.

- `deleteInitiative/response.ts` — `{ id }`.

Export all from `packages/types/src/index.ts`.

## Constants — no magic strings

Expose from the shared schema file so frontend form + backend schema share them:

- `TITLE_MAX_LENGTH = 120`
- `DESCRIPTION_MAX_LENGTH = 1000`

Reference existing enums:

- `SystemRole.ADMIN`, `SystemRole.SUPERADMIN` — `@repo/types`
- `ReductionPlanInitiativeStatus.ACTIVE` / `.DELETED` — `@repo/database`

## Files to read

- `packages/types/src/baseSchemas/reductionPlanInitiative.ts` — base Zod schemas to extend
- `packages/types/src/baseSchemas/subcategory.ts`, `.../category.ts` — base shapes for the nested `subcategory.category` response field
- `packages/types/src/index.ts` — export barrel
- Prisma schema `ReductionPlanInitiative` model (lines 1066–1085) + `ReductionPlanInitiativeStatus` enum (line 1059)

## Verification

1. `pnpm type-check` — passes across `@repo/types` (and downstream `api`, `web` once those plans land).
2. `pnpm lint` — clean.
3. Confirm new schemas are exported from `packages/types/src/index.ts`.
4. Manual spot-check: importing any new schema in `api` / `web` resolves without type errors.

# Progress: Initiatives Maintainer — Database & Types

Plan: `.claude/plans/database.plan.md`

Status: Complete

## 1. Created files

- `packages/constants/src/reductionPlanInitiative.ts` — `REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH = 120`, `REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH = 1000`.
- `packages/types/src/reductionPlanInitiatives/index.ts` — re-exports admin barrel.
- `packages/types/src/reductionPlanInitiatives/admin/index.ts` — barrel for admin schemas/types.
- `packages/types/src/reductionPlanInitiatives/admin/schemas.ts` — shared `InitiativeMutationDataSchema` + `InitiativeMutationData` type (pattern mirrors `ReductionProjectMutationDataSchema`).
- `packages/types/src/reductionPlanInitiatives/admin/getAllInitiatives/schemas.ts` — `AdminInitiativeListItemSchema` (shared list-item shape) + `GetAllInitiativesResponseSchema`.
- `packages/types/src/reductionPlanInitiatives/admin/getAllInitiatives/types.ts` — inferred types.
- `packages/types/src/reductionPlanInitiatives/admin/createInitiative/schemas.ts` — `CreateInitiativeRequestSchema = InitiativeMutationDataSchema`; response = `z.strictObject({ id })`.
- `packages/types/src/reductionPlanInitiatives/admin/createInitiative/types.ts` — inferred types.
- `packages/types/src/reductionPlanInitiatives/admin/updateInitiative/schemas.ts` — strict `{ id }` params; request = `InitiativeMutationDataSchema.partial()` + "at least one field" refine; response = `z.strictObject({})`.
- `packages/types/src/reductionPlanInitiatives/admin/updateInitiative/types.ts` — inferred types.
- `packages/types/src/reductionPlanInitiatives/admin/deleteInitiative/schemas.ts` — strict `{ id }` params; response = `z.strictObject({})`.
- `packages/types/src/reductionPlanInitiatives/admin/deleteInitiative/types.ts` — inferred types.

## 2. Updated files

- `packages/constants/src/index.ts` — added `export * from "./reductionPlanInitiative.js";`.
- `packages/types/src/index.ts` — added `export * from "./reductionPlanInitiatives/index.js";`.

## 3. Commands executed

- `pnpm type-check` — 9/9 passed.
- `pnpm lint` — 10/10 passed.

## 4. Implementation summary

1. **Prisma / database** — No schema changes. `ReductionPlanInitiative` model and `ReductionPlanInitiativeStatus` enum already expose every needed field. Soft-delete behavior will be handled in the API service layer (not in this sub-plan). Verification that the suggested-initiatives consumer from #244 filters by `status = ACTIVE` is deferred to the API sub-plan.
2. **Shared types** — Created all per-action folders under `packages/types/src/reductionPlanInitiatives/admin/` following the codebase's `schemas.ts` + `types.ts` convention. `AdminInitiativeListItemSchema` is the list-item shape (list response only). `InitiativeMutationDataSchema` (strict object) is shared between create and update request bodies — create uses it as-is, update uses `.partial()` plus a refine requiring at least one defined field. Strictness on the mutation schema implicitly rejects `status` in update bodies. Create response is `z.strictObject({ id })`; update and delete responses are `z.strictObject({})`. All schemas exported through the package barrel.
3. **Constants** — Added `REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH` and `REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH` in `@repo/constants` and wired through its barrel, so backend schemas and the future frontend form share identical limits.
4. **Verification** — `pnpm type-check` and `pnpm lint` both green across the workspace. Downstream consumers in `api` / `web` compile against the new exports.

## Deviations from plan

- File layout uses `schemas.ts` + `types.ts` per action (existing codebase convention) rather than the plan's `request.ts` / `response.ts` names.
- Constants exported with `REDUCTION_PLAN_INITIATIVE_` prefix to match `REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH` naming in `@repo/constants` and avoid barrel collisions.
- Delete response is empty `z.strictObject({})` instead of `{ id }` (user requested).
- Update response is empty `z.strictObject({})` instead of the list-item shape (user requested).
- Create response is `z.strictObject({ id })` instead of the list-item shape (plan updated: client invalidates list on success, only needs id to reconcile the new row).
- Create and update share `InitiativeMutationDataSchema` — refactor requested by user to follow the `ReductionProjectMutationDataSchema` pattern.

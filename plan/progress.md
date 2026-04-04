# Progress

## 1. Created files

- `packages/types/src/baseSchemas/reductionProject.ts` — `ReductionProjectBaseSchema` mirroring Prisma fields (decimals as strings; `consideredGei` as string array).
- `packages/types/src/reductionProjects/schemas.ts` — display status enum/schemas and Zod schemas for all reduction-project API shapes from `database.plan.md` / `api.plan.md` (create, list, minimal, by id, patch, delete, submit).
- `packages/types/src/reductionProjects/index.ts` — re-exports schemas.

## 2. Updated files

- `packages/database/src/prisma/schema.prisma` — `ReductionProject`, `SubmissionSubjectReductionProject`; `REDUCTION_PROJECT_VERIFICATION` on `SubmissionType`; `REDUCTION_PROJECT_VERIFICATION` on `BadgeType` (keeps badge lookup aligned with submission type); inverse relations on `User`, `Organization`, `CarbonInventory`, `Subcategory`, `SubmissionSubject`.
- `packages/types/src/baseSchemas/index.ts` — export `reductionProject.js`.
- `packages/types/src/index.ts` — export `reductionProjects/index.js`.
- `packages/types/src/requests/admin/getRequestsKpis/schemas.ts` — KPI union entries for `REDUCTION_PROJECT_VERIFICATION` × all `SubmissionStatus` values.
- `apps/api/src/features/carbonInventories/getCarbonInventoryBadges/service.ts` — `BADGE_SORT_ORDER` includes new badge type.
- `apps/web/src/components/CarbonInventoryBadgesCard/BadgeRow.tsx` — label map for new badge type.
- `apps/web/src/screens/Maintainer/hooks/useRequestColumns.tsx` — type label and sort order for new submission type.
- `apps/web/src/theme/palette.ts` — `requestTypeColors` for new submission type.

## 3. Commands executed

- `pnpm exec prisma validate` (from `packages/database`)
- `pnpm exec prisma generate` (from `packages/database`)
- `pnpm type-check` (repo root)
- `pnpm lint` (repo root)

## 4. Implementation summary

1. **database.plan.md** — Phase 1: Prisma models, relations, and enum updates are in place; Prisma client regenerated. Phase 2: base schema and `reductionProjects` Zod schemas exported from `@repo/types`. **User still needs to run** `pnpm --filter=database db:migrate` (or your usual migrate command) to apply SQL. Adding `SubmissionType`/`BadgeType` values and new tables will require a new migration; if `submission_summary_view` or other SQL views filter on submission type, extend the migration SQL as needed. Follow-on edits to web/api KPI and badge maps were required so `Record<SubmissionType, …>` / `Record<BadgeType, …>` stay exhaustive after the new enum member.

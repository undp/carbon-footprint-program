# Progress

_Reconciled with `git diff` (working tree was clean vs `HEAD`) and with cumulative branch changes via `git diff main...HEAD`._

## 1. Created files

- `packages/database/src/prisma/migrations/20260404173819_add_reduction_project/migration.sql` — `reduction_projects`, `submission_subject_reduction_projects`, enum alterations aligned with schema.
- `packages/types/src/baseSchemas/reductionProject.ts` — `ReductionProjectBaseSchema`.
- `packages/types/src/reductionProjects/schemas.ts` — shared `ReductionProjectDisplayStatusSchema` / enum.
- `packages/types/src/reductionProjects/types.ts` — `ReductionProjectDisplayStatus`.
- `packages/types/src/reductionProjects/index.ts` — barrel exports.
- `packages/types/src/reductionProjects/createReductionProject/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/deleteReductionProject/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/getAllReductionProjects/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/getReductionProjectById/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/getReductionProjectsMinimal/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/requestReductionProjectVerification/` — `schemas.ts`, `types.ts`.
- `packages/types/src/reductionProjects/updateReductionProject/` — `schemas.ts`, `types.ts` (partial project fields + optional `fileUuids`, same pattern as app `updateOrganization`).
- `plan/api.plan.md`, `plan/database.plan.md`, `plan/main_plan.md`, `plan/web.plan.md`.

## 2. Updated files

- `packages/database/src/prisma/schema.prisma` — `ReductionProject`, `SubmissionSubjectReductionProject`, relations on `User`, `Organization`, `CarbonInventory`, `Subcategory`, `SubmissionSubject`; `SubmissionType` / `BadgeType` include `REDUCTION_PROJECT_VERIFICATION` (this branch **replaces** the previous `REDUCTION_PLAN_VERIFICATION` variant in those enums).
- `packages/database/src/prisma/migrations/20260205200000_add_carbon_inventory_and_organization_data_submission_models/migration.sql` — `submission_type` enum text adjusted to match the above naming (see note below).
- `packages/database/src/prisma/migrations/20260219000001_add_badge_tables/migration.sql` — `badge_type` enum text adjusted similarly.
- `packages/types/src/baseSchemas/index.ts` — export `reductionProject.js`.
- `packages/types/src/index.ts` — export `reductionProjects/index.js`.
- `packages/types/src/requests/admin/getRequestsKpis/schemas.ts` — KPI union uses `REDUCTION_PROJECT_VERIFICATION` × all submission statuses (no separate `REDUCTION_PLAN_VERIFICATION` bucket).
- `apps/api/src/features/carbonInventories/getCarbonInventoryBadges/service.ts` — `BADGE_SORT_ORDER` for all `BadgeType` values.
- `apps/web/src/components/CarbonInventoryBadgesCard/BadgeRow.tsx` — badge labels for all `BadgeType` values.
- `apps/web/src/screens/Maintainer/hooks/useRequestColumns.tsx` — `SubmissionType` labels / sort order.
- `apps/web/src/theme/palette.ts` — `requestTypeColors` for all `SubmissionType` values.
- `docs/Infra/FileStorage.md` — `BadgeType` documentation aligned with schema.
- `infra/deploy-badges.sh` — badge asset mapping uses `REDUCTION_PROJECT_VERIFICATION`.

## 3. Commands executed

- `git diff` — empty (no uncommitted changes at reconciliation time).
- `git diff main...HEAD` — used to rebuild this progress list from the branch delta.
- _(Recommended after pull/merge)_ `pnpm --filter=database exec prisma migrate deploy` (or your env’s migrate workflow), `pnpm type-check`, `pnpm lint`.

## 4. Implementation summary

1. **database.plan.md / Prisma** — Reduction-project persistence and submission-subject link; migration folder `20260404173819_add_reduction_project`. **Caution:** editing older migration files to rename enum values is only appropriate if those migrations have **never** been applied in target environments; otherwise use a forward migration to alter enum types safely.
2. **Types (`packages/types/src/reductionProjects/`)** — Matches `carbonInventories` conventions (per-endpoint `schemas` + `types`, shared root `schemas`/`types`). `updateReductionProject` adds optional `fileUuids`; plans document that the **API** must require them when display status is not `DRAFT`. First verification request is typed under `requestReductionProjectVerification/`.
3. **Plan documents** — `api.plan.md`, `database.plan.md`, `main_plan.md`, and `web.plan.md` describe API routes, PATCH + files behavior, web hooks, and verification naming (`request-verification` / `requestReductionProjectVerification`).
4. **Enum ripple** — Admin KPI schema, maintainer UI, theme palette, carbon inventory badge ordering/labels, infra badge deploy script, and file-storage docs updated so `Record<SubmissionType, …>` / `Record<BadgeType, …>` and operational docs stay consistent with `REDUCTION_PROJECT_VERIFICATION`.

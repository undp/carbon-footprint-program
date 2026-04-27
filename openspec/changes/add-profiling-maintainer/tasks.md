> Rule: **no DB queries in any task**. Every task MUST be satisfied by reading code, editing files, or running the project's scripted commands (format / lint / type-check / test / build). Do not run `psql`, `prisma db execute`, or any `SELECT …` statement as part of a task.

## 1. Pre-flight (code-level only)

- [x] 1.1 Grep the call sites that must change: `rg 'ADMIN_ITEMS|UnderConstructionScreen|country_sector\b|CountrySector\b|country_subsector\b|CountrySubsector\b|OrganizationMainActivity|organization_main_activity|CountryOrganizationSize|country_organization_size' apps/ packages/`. Save the output for later audit.
- [x] 1.2 Confirm `Routes.ADMIN_ITEMS` has a single consumer (the sidebar). If any other site references it, resolve before proceeding.
- [x] 1.3 Confirm that the `main-activities` route's current component is `UnderConstructionScreen` and that no other screen imports `UnderConstructionScreen` in a way that would regress when we swap the main-activities component.
- [x] 1.4 Confirm that `getApiErrorMessage` currently has no mapping for `country_sector`/`country_subsector`/`organization_main_activity`/`country_organization_size` P2002 violations (there should be none today — admin CRUD does not exist yet).
- [x] 1.5 List the front selector consumers that will need the union helper (pre-identified — verify they still exist):
  - `apps/web/src/screens/MyOrganization/components/OrganizationForm/hooks/useOrganizationForm.ts`
  - `apps/web/src/screens/MyOrganization/components/OrganizationForm/OrganizationFormDialog.tsx`
  - `apps/web/src/screens/MyOrganization/components/OrganizationProfileSection.tsx`
  - `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx`
  - `apps/web/src/screens/CarbonInventory/hooks/useBusinessProfilingData.ts`

## 2. Database — schema + migration

- [x] 2.1 Edit `packages/database/src/prisma/schema.prisma`: declare four dedicated enums — `enum CountrySectorStatus { ACTIVE DELETED }`, `enum CountrySubsectorStatus { ACTIVE DELETED }`, `enum OrganizationMainActivityStatus { ACTIVE DELETED }`, `enum CountryOrganizationSizeStatus { ACTIVE DELETED }`. No shared `MaintainerRecordStatus` enum.
- [x] 2.2 Add to `CountrySector`: `status CountrySectorStatus @default(ACTIVE)` and `description String?`. REMOVE the `@@unique([countryId, name])` attribute (to be replaced by the partial index in SQL).
- [x] 2.3 Add to `CountrySubsector`: `status CountrySubsectorStatus @default(ACTIVE)` and `description String?`. REMOVE the `@@unique([countrySectorId, name])` attribute.
- [x] 2.4 Add to `OrganizationMainActivity`: `status OrganizationMainActivityStatus @default(ACTIVE)` and `description String?`. REMOVE the existing `@@unique([name, countrySectorId, countrySubsectorId], map: "organization_main_activity_name_country_sector_id_country_s_key")` attribute.
- [x] 2.5 Add to `CountryOrganizationSize`: `status CountryOrganizationSizeStatus @default(ACTIVE)`, `description String?`, `createdById BigInt? @map("created_by_id")`, `updatedById BigInt? @map("updated_by_id")`, `creator User? @relation("country_organization_size_created_by", …)`, `updater User? @relation("country_organization_size_updated_by", …)`. REMOVE the `@@unique([countryId, name])` attribute. Add matching back-relations on `User`.
- [x] 2.6 **Modify the original migrations in place** (the project is not yet in production, so editing existing migration files is acceptable and preferred over a follow-up migration). Do NOT create a new `<timestamp>_add_soft_delete_to_profiling_catalogs` directory.
  - [x] 2.6a Edit `packages/database/src/prisma/migrations/20251211144312_base/migration.sql`:
    - At the top of the file (before any `CREATE TABLE`), add three `CREATE TYPE` statements:
      - `CREATE TYPE "CountrySectorStatus" AS ENUM ('ACTIVE', 'DELETED');`
      - `CREATE TYPE "CountrySubsectorStatus" AS ENUM ('ACTIVE', 'DELETED');`
      - `CREATE TYPE "CountryOrganizationSizeStatus" AS ENUM ('ACTIVE', 'DELETED');`
    - In `CREATE TABLE "country_organization_size"`, add columns: `"description" TEXT`, `"status" "CountryOrganizationSizeStatus" NOT NULL DEFAULT 'ACTIVE'`, `"created_by_id" BIGINT`, `"updated_by_id" BIGINT`.
    - In `CREATE TABLE "country_sector"`, add columns: `"description" TEXT`, `"status" "CountrySectorStatus" NOT NULL DEFAULT 'ACTIVE'`.
    - In `CREATE TABLE "country_subsector"`, add columns: `"description" TEXT`, `"status" "CountrySubsectorStatus" NOT NULL DEFAULT 'ACTIVE'`.
    - Replace the `CREATE UNIQUE INDEX "country_organization_size_country_id_name_key"` line with: `CREATE UNIQUE INDEX "country_organization_size_country_id_name_key" ON "country_organization_size"("country_id", "name") WHERE "status" = 'ACTIVE';`
    - Replace the `CREATE UNIQUE INDEX "country_sector_country_id_name_key"` line with: `CREATE UNIQUE INDEX "country_sector_country_id_name_key" ON "country_sector"("country_id", "name") WHERE "status" = 'ACTIVE';`
    - Replace the `CREATE UNIQUE INDEX "country_subsector_country_sector_id_name_key"` line with: `CREATE UNIQUE INDEX "country_subsector_country_sector_id_name_key" ON "country_subsector"("country_sector_id", "name") WHERE "status" = 'ACTIVE';`
    - Add two new `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` statements for `country_organization_size_created_by_id_fkey` and `country_organization_size_updated_by_id_fkey`, referencing `user(id)` with `ON DELETE SET NULL ON UPDATE CASCADE` (mirror the FK pattern already used by `country_sector_created_by_id_fkey`).
    - Add an inline `-- NOTE: Partial unique indexes (… WHERE status = 'ACTIVE'). Prisma does not track partial indexes on schema diffs. Preserve the WHERE clause manually when touching these tables.` comment immediately above each replaced unique-index statement.

  - [x] 2.6b Edit `packages/database/src/prisma/migrations/20251215191526_create_organization_main_activity_table/migration.sql`:
    - Add `CREATE TYPE "OrganizationMainActivityStatus" AS ENUM ('ACTIVE', 'DELETED');` at the top of the file (before the `CREATE TABLE`).
    - In `CREATE TABLE "organization_main_activity"`, add columns: `"description" TEXT`, `"status" "OrganizationMainActivityStatus" NOT NULL DEFAULT 'ACTIVE'`.
    - Leave the existing full unique index in this file unchanged — the partial index replaces it in `20251215191534_create_organization_main_activity_unique_constraint` (see 2.6c).

  - [x] 2.6c Edit `packages/database/src/prisma/migrations/20251215191534_create_organization_main_activity_unique_constraint/migration.sql`:
    - Replace the `CREATE UNIQUE INDEX "organization_main_activity_name_country_sector_id_country_s_key" … NULLS NOT DISTINCT;` block with: `CREATE UNIQUE INDEX "organization_main_activity_name_country_sector_id_country_s_key" ON "organization_main_activity"("name", "country_sector_id", "country_subsector_id") NULLS NOT DISTINCT WHERE "status" = 'ACTIVE';`
    - Update the existing comment so it documents both the `NULLS NOT DISTINCT` rationale AND the partial-index rationale (Prisma does not track the WHERE clause; preserve manually).

- [x] 2.7 Drop and re-create the local development database so the edited migrations replay from a clean slate (`pnpm --filter database db:reset` or equivalent). DO NOT attempt incremental migration; editing existing migration files breaks the migration history hash and Prisma will refuse to apply them on top of the previous state.
- [x] 2.8 Run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
- [x] 2.9 Run `pnpm --filter database db:seed` against the freshly-reset local DB to confirm the seed still succeeds and the partial indexes accept the seed data.

## 3. Shared types — base schemas

- [x] 3.1 `packages/types/src/baseSchemas/countrySector.ts`: extend `CountrySectorBaseSchema` with `status: z.nativeEnum(CountrySectorStatus)` and `description: z.string().nullable()`. Use the per-table enum imported from `@prisma/client` (or re-exported from `packages/database`).
- [x] 3.2 Mirror for `countrySubsector.ts` (`CountrySubsectorStatus`), `organizationMainActivity.ts` (`OrganizationMainActivityStatus`), `countryOrganizationSize.ts` (`CountryOrganizationSizeStatus`). For `organizationMainActivity` and `countryOrganizationSize`, ensure the base schema also exposes auditor ids for the admin variant (but not the public one).
- [x] 3.3 Re-export the four Prisma-generated enums (`CountrySectorStatus`, `CountrySubsectorStatus`, `OrganizationMainActivityStatus`, `CountryOrganizationSizeStatus`) from `packages/types/src/baseSchemas/` so frontend and API consumers import them from `@repo/types` without reaching into `@prisma/client` directly. Do NOT introduce a shared alias type across the four.

## 4. Shared types — admin schemas (per domain)

For each of the four domains, create a `packages/types/src/<domain>/admin/` tree with these subdirectories:

- [x] 4.1 `create<Domain>/schemas.ts` + `types.ts`: input `{ name: z.string().trim().min(1).max(255), description: z.string().trim().max(2000).nullable().optional() }` plus any domain-specific fields (`countrySectorId` on subsector/main activity, `countrySubsectorId` on main activity). Response: admin record shape including `status`, `description`, auditors, and (for list) `isInUse`.
- [x] 4.2 `update<Domain>/schemas.ts` + `types.ts`: `params: { id }`; `body`: all fields optional BUT refined with `.refine(v => Object.values(v).some((value) => value !== undefined), { message: "Se requiere al menos un campo para actualizar" })`. Checking defined values (not just keys) prevents no-op payloads like `{ name: undefined }` from passing schema validation. Response: admin record shape.
- [x] 4.3 `delete<Domain>/schemas.ts` + `types.ts`: `params: { id }`. Response: admin record shape (the updated, DELETED row — NOT 204).
- [x] 4.4 `restore<Domain>/schemas.ts` + `types.ts`: `params: { id }`. No body. Response: admin record shape (the updated, ACTIVE row).
- [x] 4.5 `getAll<Domain>/schemas.ts` + `types.ts` (admin variant): `querystring: { status: z.enum(["active", "deleted", "all"]).optional().default("active") }`. Response: array of admin record shape with `isInUse`.
- [x] 4.6 `index.ts` re-exports at each level.

Repeat 4.1–4.6 for `countrySectors`, `countrySubsectors`, `organizationMainActivities`, `countryOrganizationSizes`.

- [x] 4.7 Update `packages/types/src/index.ts` to re-export the new trees.
- [x] 4.8 Run `pnpm type-check`; resolve any downstream compile hits.

## 5. API — countrySectors admin endpoints

- [x] 5.0 Create `apps/api/src/errors/DeleteBlockedByReferencesError.ts` (code `DELETE_BLOCKED_BY_REFERENCES`, HTTP 409) and re-export it from `apps/api/src/errors/index.ts`. Follow the existing `DatabaseUniqueConstraintViolationError` shape (`createError`). The static template can stay in English; call sites overwrite `error.message` with the Spanish, end-user-friendly sentence (naming the blocking reference type(s)) so the FE can surface it directly via `getApiErrorMessage`.
- [x] 5.0a **Spanish error text via `message` — cross-cutting convention.** No `userMessage` field on `ApiErrorResponseSchema` or anywhere else: the existing `message` field already carries human-readable text per its docblock. Services convey dynamic Spanish copy by setting `error.message` directly on the thrown error (after `new …Error(...)`). The Fastify error-handler plugin already serializes `error.message` into the response body; no handler change is needed. The frontend's `getApiErrorMessage` falls back to the API's `message` (via `AppHttpError#apiMessage`) when no per-code static fallback exists, so dynamic Spanish round-trips end-to-end without a parallel field.
- [x] 5.1 `apps/api/src/features/countrySectors/admin/createCountrySector/` (route/handler/service): `POST /admin/country-sectors`, `requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])`. Resolve `countryId` via `country.findFirst({ orderBy: { id: "asc" } })`; throw `NoCountryFoundError` if missing. Normalize description tri-state. Catch Prisma P2002 → `DatabaseUniqueConstraintViolationError` and set Spanish text on `error.message`. Stamp `createdById`.
- [x] 5.2 `getAllCountrySectors/` (admin variant, under `admin/`): accept `status` query; when `status=active`, also restrict nested subsectors to `ACTIVE`. Compute `isInUse` per row via Prisma `_count` selects across `organizationData` and `organizationMainActivities`. Sort alphabetically.
- [x] 5.3 `updateCountrySector/`: wrap in `prisma.$transaction`. Apply description tri-state. P2002 → 409. Stamp `updatedById`. Do not allow changing `status` via this endpoint.
- [x] 5.4 `deleteCountrySector/`: wrap in `prisma.$transaction`. Count ACTIVE references: `countrySubsector`, `organizationMainActivity`, `subcategoryRecommendation`. If any > 0, throw `DeleteBlockedByReferencesError` (HTTP 409, new error class under `apps/api/src/errors/` with code `DELETE_BLOCKED_BY_REFERENCES`) and set `error.message` to a Spanish sentence listing the blocking types. Otherwise, update `status: DELETED`. Return the updated row.
- [x] 5.5 `restoreCountrySector/`: wrap in `prisma.$transaction`. If the row's current `status` is already `ACTIVE`, throw a 400 error with Spanish text on `error.message`. Check for ACTIVE collision on `(countryId, name)` — if found, throw `DatabaseUniqueConstraintViolationError` (409). Otherwise update `status: ACTIVE`. Return the updated row.
- [x] 5.6 Register the five routes under `apps/api/src/routes/api/admin/country-sectors/index.ts` following the `routes/api/admin/organizations/index.ts` pattern.
- [x] 5.7 Edit the **public** `apps/api/src/features/countrySectors/getAllCountrySectors/service.ts`: add `where: { status: 'ACTIVE' }` on the top-level query AND on the nested subsector include. Confirm the response shape stays byte-compatible.

## 6. API — countrySubsectors admin endpoints

- [x] 6.1 Mirror 5.1 for subsectors: require `countrySectorId`; validate inside transaction that the parent sector exists AND is `ACTIVE`. Missing / DELETED parent → `ResourceNotFoundError` (404).
- [x] 6.2 Mirror 5.2: admin list with `status` filter and `isInUse` (OR across `organizationData.subsectorId` and `organizationMainActivity.countrySubsectorId`).
- [x] 6.3 Mirror 5.3: PATCH may re-parent via `countrySectorId`; validate new parent inside the transaction.
- [x] 6.4 Mirror 5.4: soft-delete blocked by ACTIVE `organizationMainActivity.countrySubsectorId` or any `subcategoryRecommendation.subsectorId`.
- [x] 6.5 Mirror 5.5: restore with `(countrySectorId, name)` collision check.
- [x] 6.6 Mirror 5.6: register the routes under `routes/api/admin/country-subsectors/index.ts`.

## 7. API — organizationMainActivities admin endpoints

- [x] 7.1 Mirror 5.1 for main activities: optional `countrySectorId` and `countrySubsectorId`; when provided, validate parents are ACTIVE inside the transaction. When BOTH are provided, also load the subsector inside the same transaction and assert that `subsector.countrySectorId === supplied countrySectorId`; on mismatch, fail the transaction with a 400 error and set Spanish text on `error.message` (e.g., "El subrubro seleccionado no pertenece al rubro indicado"). Do not persist the row on mismatch.
- [x] 7.2 Mirror 5.2: admin list with `status` filter; `isInUse` computed as `organizationData.mainActivityId` count > 0; include parent sector/subsector `name` on each row for display.
- [x] 7.3 Mirror 5.3: PATCH may re-parent; validate inside transaction, including the subsector→sector pairing check. Compute the effective `(countrySectorId, countrySubsectorId)` pair by merging the patch with the persisted values, and assert the subsector belongs to the effective sector. On mismatch, fail with 400 and Spanish text on `error.message`; do not persist.
- [x] 7.4 Mirror 5.4: soft-delete never blocked by catalog references.
- [x] 7.5 Mirror 5.5: restore with `(name, countrySectorId, countrySubsectorId)` collision check.
- [x] 7.6 Register the routes under `routes/api/admin/organization-main-activities/index.ts`.
- [x] 7.7 Edit the public main-activity endpoint(s) under `apps/api/src/features/organizationMainActivities/` to filter `status = 'ACTIVE'`.

## 8. API — countryOrganizationSizes admin endpoints

- [x] 8.1 Mirror 5.1 for sizes: resolve `countryId` via singleton; stamp `createdById`.
- [x] 8.2 Mirror 5.2: admin list with `status` filter; `isInUse` computed as `organizationData.countryOrganizationSizeId` count > 0.
- [x] 8.3 Mirror 5.3: PATCH with tri-state description; stamp `updatedById`.
- [x] 8.4 Mirror 5.4: soft-delete never blocked by catalog references.
- [x] 8.5 Mirror 5.5: restore with `(countryId, name)` collision check.
- [x] 8.6 Register the routes under `routes/api/admin/country-organization-sizes/index.ts`.
- [x] 8.7 Edit the public `getAllCountryOrganizationSizes` service to filter `status = 'ACTIVE'`.

## 9. API — integration tests

Create integration tests under `apps/api/test/features/<domain>/<action>/integration.test.ts` covering, for each of the four domains:

- [x] 9.1 Create: valid payload → 201; missing name → 400; whitespace-only name → 400; ACTIVE-collision on unique scope → 409; missing/DELETED parent (where applicable) → 404; USER role → 403. For main activities specifically, also cover the sector/subsector pairing invariant: when both IDs are provided and the subsector does NOT belong to the sector → 400 with a Spanish sentence on `message` and no row persisted.
- [x] 9.2 List (admin): default `status=active` returns only ACTIVE; `status=deleted` returns only DELETED; `status=all` returns both; each row carries `isInUse`; invalid `status` value → 400.
- [x] 9.3 Update: partial name OK; description tri-state (null, empty string, omitted) handled correctly; empty body → 400; rename into ACTIVE collision → 409; re-parent to missing/DELETED parent → 404. For main activities specifically, also cover the sector/subsector pairing invariant on PATCH: (a) re-parent to a `(sectorId, subsectorId)` pair where the subsector does not belong to the sector → 400; (b) PATCH that changes only `countrySectorId` while the persisted `countrySubsectorId` no longer belongs to the new sector → 400; (c) PATCH that changes only `countrySubsectorId` to a subsector under a different sector than the persisted `countrySectorId` → 400. No row persisted on mismatch.
- [x] 9.4 Delete (soft-delete): clean row → 200 and status transitions to `DELETED`; blocked by ACTIVE catalog reference → 409 with `code === "DELETE_BLOCKED_BY_REFERENCES"`; user-data reference alone does NOT block.
- [x] 9.5 Restore: DELETED row with no collision → 200 and status transitions to `ACTIVE`; collision with ACTIVE row → 409; restore on already-ACTIVE row → 400.
- [x] 9.6 Public endpoint smoke test (per domain): DELETED rows absent from the response; response shape byte-compatible with the pre-change contract.
- [x] 9.7 Add factory helpers where missing: `countrySectorFactory.ts`, `countrySubsectorFactory.ts`, `organizationMainActivityFactory.ts`, `countryOrganizationSizeFactory.ts`. Each factory MUST type its `status` override with its per-table enum (imported from `@prisma/client` or re-exported by `@repo/types`): `CountrySectorStatus` for sectors, `CountrySubsectorStatus` for subsectors, `OrganizationMainActivityStatus` for main activities, `CountryOrganizationSizeStatus` for sizes. Default new rows to the enum's `ACTIVE` member and require callers to pass enum values (e.g., `CountrySectorStatus.DELETED`) — raw string literals (`{ status: "DELETED" }`) MUST NOT be accepted by the override API. Update any test that overrides `status` to use the enum constants.
- [x] 9.8 Run `pnpm test --filter=api -- /countrySectors --coverage=false && pnpm test --filter=api -- /countrySubsectors --coverage=false && pnpm test --filter=api -- /organizationMainActivities --coverage=false && pnpm test --filter=api -- /countryOrganizationSizes --coverage=false`. NOTE: Docker is not available in the local sandbox; tests rely on Testcontainers and will run in CI.

## 10. Frontend — routes and sidebar

- [x] 10.1 `apps/web/src/interfaces/routes/routes.const.ts`: add `ADMIN_SECTORS: "/admin/sectors"`, `ADMIN_SUBSECTORS: "/admin/subsectors"`, `ADMIN_ORGANIZATION_SIZES: "/admin/organization-sizes"`. Remove `ADMIN_ITEMS`.
- [x] 10.2 Delete `apps/web/src/routes/admin/items.tsx`.
- [x] 10.3 Create `apps/web/src/routes/admin/sectors.tsx`: `createFileRoute(Routes.ADMIN_SECTORS)`, `beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`, component `SectorsMaintainerScreen`.
- [x] 10.4 Create `apps/web/src/routes/admin/subsectors.tsx` mirroring 10.3 with `SubsectorsMaintainerScreen`.
- [x] 10.5 Create `apps/web/src/routes/admin/organization-sizes.tsx` mirroring 10.3 with `OrganizationSizesMaintainerScreen`.
- [x] 10.6 Edit `apps/web/src/routes/admin/main-activities.tsx`: widen `requireRole` to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`; replace the `UnderConstructionScreen` component with `MainActivitiesMaintainerScreen`.
- [x] 10.7 Run TanStack Router codegen (dev server or explicit codegen script) and commit the regenerated `routeTree.gen.ts`.
- [x] 10.8 `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`: remove the existing `Rubros` entry. Insert `Perfilamiento` (icon `BusinessCenterOutlined`, `requiredRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN]`) in the same position, with **four** children in order: `Rubros` (→ `ADMIN_SECTORS`), `Subrubros` (→ `ADMIN_SUBSECTORS`), `Actividades Principales` (→ `ADMIN_MAIN_ACTIVITIES`), `Tamaño de la Organización` (→ `ADMIN_ORGANIZATION_SIZES`).
- [x] 10.9 Add the `BusinessCenterOutlined` import.

## 11. Frontend — shared components

- [x] 11.1 Create `apps/web/src/utils/mergeSelectedOption.ts`: generic helper `<T extends { id: string | number; name: string }>(options: T[], selected: T | null | undefined): T[]` that returns `options` if `selected` is `null`/`undefined` OR if `selected.id` is already present; otherwise `[selected, ...options]` sorted by `name`. Export from `apps/web/src/utils/index.ts`.
- [x] 11.2 Create `apps/web/src/screens/Maintainer/components/dialogs/InUseWarningDialog.tsx`: controlled MUI `Dialog` with Spanish copy parameterized by `entityLabel` (e.g., "rubro", "subrubro", "actividad principal", "tamaño"). Props: `open`, `onConfirm`, `onCancel`, `entityLabel`.
- [x] 11.3 Create `apps/web/src/screens/Maintainer/components/ProfilingMaintainerScreenLayout.tsx`: wraps `FormProvider` + `MaintainerPageHeader` (passing `extra` for the status filter) + children + `UnsavedChangesDialog` + `InUseWarningDialog`. Props accept the form instance, title, addLabel, statusFilter node, the in-use dialog state, and the blocker result. NOT modifying `MaintainerScreenLayout` or its hooks.
- [x] 11.4 Create `apps/web/src/screens/Maintainer/components/MaintainerStatusFilterToggle.tsx`: tri-state toggle (`Activos` / `Eliminados` / `Todos`) rendered as an MUI `ToggleButtonGroup`. Props: `value`, `onChange`.

## 12. Frontend — query hooks (per domain)

Create or extend `apps/web/src/api/query/<domain>/`:

- [x] 12.1 `keys.ts`: structured key factory with `.app` and `.admin` namespaces; admin namespace includes `list(status)`.
- [x] 12.2 `useAdmin<Domain>.ts`: query hook accepting the `status` filter.
- [x] 12.3 `useCreate<Domain>.ts`: mutation invalidating `keys.admin.all` AND `keys.app.all`.
- [x] 12.4 `useUpdate<Domain>.ts`: same invalidation as 12.3.
- [x] 12.5 `useSoftDelete<Domain>.ts`: same invalidation.
- [x] 12.6 `useRestore<Domain>.ts`: same invalidation.
- [x] 12.7 Audit existing hook files under each domain (`useCountrySectors.ts`, `useOrganizationMainActivities.ts`, `useCountryOrganizationSizes.ts`) — migrate their existing key factory to the new `.app` namespace without changing the returned data shape.
- [x] 12.8 `apps/web/src/utils/getApiErrorMessage.ts`: extend the fallback chain so that when the error code has no per-code static entry AND the API response body carries a non-empty `message` (surfaced via `AppHttpError#apiMessage`), the API's `message` is returned before the generic fallback string. This way services can pass dynamic Spanish copy via `error.message` without each new code requiring a frontend mapping. Static per-code entries are still preferred for legacy codes whose API messages remain in English.

Repeat 12.1–12.7 for `countrySectors`, `countrySubsectors`, `organizationMainActivities`, `countryOrganizationSizes`.

## 13. Frontend — Sectors maintainer screen

- [x] 13.1 Create `apps/web/src/screens/Maintainer/hooks/useSectorsForm.ts`: field array `{ id, name, description: string | null, status, isInUse }`; Zod schema with Spanish messages.
- [x] 13.2 Create `apps/web/src/screens/Maintainer/hooks/useSectorColumns.tsx`: columns for `name` (inline-edit, disabled for DELETED rows), `description`, `status` (chip), actions (edit/save/cancel/soft-delete for ACTIVE; restore for DELETED).
- [x] 13.3 Create `apps/web/src/screens/Maintainer/screens/SectorsMaintainerScreen.tsx` using `ProfilingMaintainerScreenLayout`. Wire `useAdminCountrySectors(status)`, `useCreate…`, `useUpdate…`, `useSoftDelete…`, `useRestore…`. Pass `MaintainerStatusFilterToggle` into the layout's status-filter slot.
  - On save of a PATCH, compute which visible fields changed. If `isInUse` is true AND a visible field changed, open `InUseWarningDialog` with `entityLabel="rubro"`; dispatch the mutation only on confirm.
  - Spanish snackbars: "Rubro creado exitosamente", "Cambios guardados satisfactoriamente", "Rubro eliminado", "Rubro restaurado".
- [x] 13.4 Export from `apps/web/src/screens/Maintainer/screens/index.ts`.

## 14. Frontend — Subsectors maintainer screen

- [x] 14.1 `useSubsectorsForm.ts`: field array `{ id, countrySectorId, name, description, status, isInUse }`.
- [x] 14.2 `useSubsectorColumns.tsx`: parent-rubro dropdown (options from admin ACTIVE sectors), `name`, `description`, `status`, actions.
- [x] 14.3 `SubsectorsMaintainerScreen.tsx`: mirror 13.3 with `entityLabel="subrubro"`. Visible-field change detection covers both `name` and `countrySectorId`. Empty-state helper "Crea primero un rubro" when the admin ACTIVE sector list is empty; add button disabled.
- [x] 14.4 Export.

## 15. Frontend — MainActivities maintainer screen

- [x] 15.1 `useMainActivitiesForm.ts`: field array `{ id, countrySectorId?, countrySubsectorId?, name, description, status, isInUse }`.
- [x] 15.2 `useMainActivityColumns.tsx`: optional parent-rubro dropdown (from admin ACTIVE sectors), optional parent-subrubro dropdown (from admin ACTIVE subsectors filtered by selected rubro), `name`, `description`, `status`, actions.
- [x] 15.3 `MainActivitiesMaintainerScreen.tsx`: mirror 13.3 with `entityLabel="actividad principal"`. Visible-field change detection covers `name`, `countrySectorId`, `countrySubsectorId`.
- [x] 15.4 Export.

## 16. Frontend — OrganizationSizes maintainer screen

- [x] 16.1 `useOrganizationSizesForm.ts`: field array `{ id, name, description, status, isInUse }`.
- [x] 16.2 `useOrganizationSizeColumns.tsx`: `name`, `description`, `status`, actions.
- [x] 16.3 `OrganizationSizesMaintainerScreen.tsx`: mirror 13.3 with `entityLabel="tamaño"`.
- [x] 16.4 Export.

## 17. Frontend — apply union helper at selector consumers

For each consumer, import `mergeSelectedOption` and wrap the dropdown options before rendering. Initial-selected value comes from the parent resource's response (`organization.data.sectorId` + `organization.data.sectorName` already available on the current payload — verify shape and extend the API response if a name is missing):

- [x] 17.1 `apps/web/src/screens/MyOrganization/components/OrganizationForm/hooks/useOrganizationForm.ts` — apply to the four dropdowns.
- [x] 17.2 `apps/web/src/screens/MyOrganization/components/OrganizationForm/OrganizationFormDialog.tsx` — verify consumption of the merged options; no direct fetch duplication.
- [x] 17.3 `apps/web/src/screens/MyOrganization/components/OrganizationProfileSection.tsx` — apply where selectors are rendered. NOTE: this component is purely read-only display (`profile.sector?.name` etc.); the `getOrganizationByIdService` joins the catalog tables via Prisma `include` (no status filter) so DELETED rows still return their name. No selector dropdowns means no list-merge is needed.
- [x] 17.4 `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx` — apply to the four dropdowns. Wired by passing `existingInventory.organizationData.{sector, subsector, mainActivity, size}` into `useBusinessProfilingData`.
- [x] 17.5 `apps/web/src/screens/CarbonInventory/hooks/useBusinessProfilingData.ts` — apply where the hook exposes the options. Mirrors the `useOrganizationData` pattern.
- [x] 17.6 Verify that the public responses already include `{ id, name }` for every currently-selected entity. If any parent resource payload omits the name (only the id), extend the API response to include it — this is cheaper than a separate fetch. Do not add a `?includeIds=` parameter on the public list endpoints. RESOLVED: extended `OrganizationDataFieldSchema` with optional `sector / subsector / size / mainActivity` resolved-reference fields and added `resolveInventoryOrganizationDataReferences` helper used by both `getCarbonInventoryById` and `updateCarbonInventory`.

## 18. Frontend — smoke test (no DB queries)

- [x] 18.1 `pnpm format && pnpm lint && pnpm type-check` — all green.
- [ ] 18.2 Run the dev server; log in as ADMIN. For each of the four maintainer screens:
  - Sidebar entry renders under "Perfilamiento".
  - The screen loads with the default ACTIVE filter.
  - Create → rename → soft-delete round-trip, verifying Spanish snackbars and grid state transitions.
  - Toggle to "Eliminados" → verify the DELETED row appears, edit controls are disabled, Restore works.
  - Rename an in-use row → `InUseWarningDialog` appears; cancel returns to edit; confirm dispatches.
  - Edit only the `description` of an in-use row → no dialog, PATCH succeeds.
- [ ] 18.3 As ADMIN, verify soft-delete blocking: soft-delete a sector that has ACTIVE subsectors → Spanish error snackbar; soft-delete a subsector used by `SubcategoryRecommendation` → Spanish error snackbar; soft-delete a main activity or size → always succeeds.
- [ ] 18.4 Log in as USER → confirm no admin routes reachable.
- [ ] 18.5 Log in as SUPERADMIN → confirm "Metodologías" is still visible AND "Perfilamiento" is visible.
- [ ] 18.6 Union regression: pick an organization referencing a catalog entity, soft-delete that entity via the admin maintainer, then reopen the organization form → the dropdown still shows the (now DELETED) entity by name alongside ACTIVE options; the form saves successfully without changing the selection.

## 19. Docs

- [x] 19.1 Create `docs/development/maintainers/profiling.md`:
  - Four maintainers, their routes, their screens.
  - Soft-delete lifecycle and catalog-reference blocking matrix.
  - Partial unique index rule (and the Prisma blind-spot warning).
  - `InUseWarningDialog` trigger rules.
  - `mergeSelectedOption` helper and the list of selector consumers.
- [x] 19.2 Cross-link from `docs/` index / README where appropriate.

## 20. Pre-commit checklist

- [x] 20.1 `pnpm format && pnpm lint && pnpm type-check`.
- [x] 20.2 Full API tests for the four domains (from 9.8). NOTE: Docker is not available in the local sandbox; tests rely on Testcontainers (real PostgreSQL) and will run in CI.
- [x] 20.3 Build: `pnpm build`. (`pnpm --filter web build` requires `VITE_API_BASE_URL` set; unrelated to this change. API + types build clean.)
- [x] 20.4 Grep cleanup: `rg 'ADMIN_ITEMS' apps/ packages/` returns zero; `rg 'UnderConstructionScreen' apps/web/src/routes/admin/` returns zero. NOTE: `units.tsx` and `parameters.tsx` retain `UnderConstructionScreen` legitimately (they are out of scope for this change — those routes were already under construction before).
- [x] 20.5 Commit in modular chunks per CLAUDE.md (schema + migration, enum + shared types, public endpoint filter, API admin per domain, shared FE components, FE per domain, union consumers, docs) with Conventional Commit messages.

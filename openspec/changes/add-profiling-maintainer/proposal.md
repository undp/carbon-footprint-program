## Why

Admins need a UI to maintain the catalogs that drive organization profiling: **rubros** (`country_sector`), **subrubros** (`country_subsector`), **actividades principales** (`organization_main_activity`), and **tamaño de la organización** (`country_organization_size`). Today these tables are managed exclusively via seed files and SQL; the only admin-visible surface is a dormant "Rubros" branch in the sidebar whose single child ("Actividades Principales") is an `UnderConstructionScreen`. Without CRUD, any catalog change requires a SQL migration or seed re-run per country deployment — an operational bottleneck that conflicts with the country-agnostic principle.

The catalogs are **live** — organizations and carbon-inventory profiling data reference them continuously. A catalog entry can legitimately become obsolete (a sector is retired, a size bucket is renamed) while historical rows still point at it. Hard-deleting is therefore not an option; the admin needs a **soft-delete** that hides the entry from new selections while preserving the record so existing references keep rendering a human-readable label. Edits to names in use must also be gated by an explicit confirmation, because a rename propagates to every consuming organization without warning otherwise.

This change introduces a new **"Perfilamiento"** grouping in the admin panel that absorbs the existing "Rubros" branch and adds four maintainers — Rubros, Subrubros, Actividades Principales, Tamaño de la Organización — all following the inline-edit DataGrid pattern but on a **dedicated simpler layout** (no methodology scope), with soft-delete, restore, a "value in use" edit-warning dialog, and a front-side `active ∪ selected` union for every selector that consumes these catalogs.

> **Supersedes prior scope**: an earlier draft of this proposal rejected soft-delete and proposed reusing `MaintainerScreenLayout` by making its methodology `scope` optional. Both positions are reversed here — see `design.md` for the new ADRs.

## What Changes

### Database (cross-cutting)

- Add a non-nullable `status` column, defaulting to `ACTIVE`, to each of the four tables — with a **dedicated enum per table** (values `ACTIVE`, `DELETED` on each). No shared cross-table enum is introduced:
  - `country_sector.status: CountrySectorStatus`
  - `country_subsector.status: CountrySubsectorStatus`
  - `organization_main_activity.status: OrganizationMainActivityStatus`
  - `country_organization_size.status: CountryOrganizationSizeStatus`
- **Do NOT add a `deletedAt` column.** Reuse the existing `updatedAt` as the soft-delete timestamp proxy — the transition `ACTIVE → DELETED` updates `updatedAt` naturally via Prisma's `@updatedAt`.
- Add nullable `description String?` to: `country_sector`, `country_subsector`, `organization_main_activity`, `country_organization_size`.
- Add `createdById BigInt?` and `updatedById BigInt?` to `country_organization_size` (the other three models already have them).
- Replace the existing full unique constraints with **partial unique indexes** scoped to `status = 'ACTIVE'`, declared via raw SQL in the migration (Prisma does not support partial indexes natively):
  - `country_sector`: `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`
  - `country_subsector`: `UNIQUE (country_sector_id, name) WHERE status = 'ACTIVE'`
  - `organization_main_activity`: `UNIQUE (name, country_sector_id, country_subsector_id) WHERE status = 'ACTIVE'`
  - `country_organization_size`: `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`
- Migration is backward-compatible: existing rows default to `ACTIVE`, `description` is nullable, the new columns on `country_organization_size` are nullable.

### Soft-delete semantics

- `DELETE /admin/…/:id` transitions the row to `status = DELETED` (and touches `updatedAt`) instead of removing it. Responds `200` with the updated record.
- **Catalog-level reference blocking** (throws `DeleteBlockedByReferencesError`, HTTP 409) applies to soft-delete when another _catalog_ record still points at the target:
  - Soft-deleting a sector is blocked by: ACTIVE `country_subsector`, ACTIVE `organization_main_activity`, ACTIVE `subcategory_recommendation` that reference it.
  - Soft-deleting a subsector is blocked by: ACTIVE `organization_main_activity`, ACTIVE `subcategory_recommendation` that reference it.
  - Soft-deleting a main activity or organization size is never blocked (no catalog records reference these).
- **User-data references do NOT block** soft-delete: `organization_data.sectorId`, `organization_data.subsectorId`, `organization_data.mainActivityId`, `organization_data.countryOrganizationSizeId` — these keep pointing at the (now DELETED) row, and the front-side union pattern ensures the label still renders.
- A new `POST /admin/…/:id/restore` endpoint transitions `status: DELETED → ACTIVE`. Restore is rejected (HTTP 409, `DatabaseUniqueConstraintViolationError`) if the `name` collides with a currently-ACTIVE row (same-country for sector/size, same-sector for subsector, same-sector-and-subsector for main activity).

### Edit-warning dialog (cross-cutting)

- A new shared `InUseWarningDialog` opens in the maintainer screens when the admin attempts to save an edit that:
  - changes a **visible** field (`name`, or a parent-relation FK like `countrySectorId` / `countrySubsectorId`), AND
  - the target row has at least one user-data reference (counted server-side and exposed via a new `isInUse: boolean` field on the admin list response).
- Edits that only change `description` bypass the dialog.
- Dialog copy (Spanish): "Este rubro/subrubro/actividad/tamaño está siendo utilizado por organizaciones y huellas. Cambiar su nombre afectará a todos los usuarios que lo tengan seleccionado. ¿Deseas continuar?" Confirm triggers the PATCH; cancel discards the dialog and returns to editing.

### Selector union (`active ∪ selected`) — front-only

- All 4 public list endpoints stay returning only `status = ACTIVE` rows. No backend parameter is added.
- Every form that consumes a catalog as a selector MUST, before rendering the dropdown options, merge the currently-selected entity (obtained from the form's initial value — the front already has `{ id, name }` from the parent resource's response) into the ACTIVE list, de-duplicated by `id`.
- Consumers that require the union (from the front audit):
  - `apps/web/src/screens/MyOrganization/components/OrganizationForm/hooks/useOrganizationData.ts` — sectors, subsectors, main activities, organization sizes.
  - `apps/web/src/screens/MyOrganization/components/OrganizationForm/OrganizationFormDialog.tsx`
  - `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx`
  - `apps/web/src/screens/CarbonInventory/hooks/useBusinessProfilingData.ts`
- Read-only displays (`InventoryAttributesCard`, `Transparency*`, `SubmissionHistory`, Excel export) need no change — they render the name from the parent payload regardless of status.

### Sidebar and routes

- Remove the current `Rubros` sidebar group.
- Add a `Perfilamiento` group (icon `BusinessCenterOutlined`, position where `Rubros` was) gated to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`, with **four** children in order: `Rubros` (→ `/admin/sectors`), `Subrubros` (→ `/admin/subsectors`), `Actividades Principales` (→ `/admin/main-activities`), `Tamaño de la Organización` (→ `/admin/organization-sizes`).
- Routes: add `Routes.ADMIN_SECTORS`, `Routes.ADMIN_SUBSECTORS`, `Routes.ADMIN_ORGANIZATION_SIZES`. Remove `Routes.ADMIN_ITEMS` and `admin/items.tsx`. Widen `admin/main-activities.tsx` auth to `[ADMIN, SUPERADMIN]` AND replace its `UnderConstructionScreen` component with the real maintainer.
- Metodologías stays SUPERADMIN-only.

### API

New admin endpoints under `/admin/country-sectors`, `/admin/country-subsectors`, `/admin/organization-main-activities`, `/admin/country-organization-sizes`:

- `POST` — create.
- `GET` — list with admin fields (`status`, `description`, auditors, `isInUse`); supports `?status=active|deleted|all` (default `active`).
- `PATCH /:id` — update (name / description / parent FKs as applicable).
- `DELETE /:id` — soft-delete (status → DELETED, catalog-ref blocking).
- `POST /:id/restore` — restore (status → ACTIVE, name-collision check).

All gated by `requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])`.

The existing public read endpoints (`GET /country-sectors`, `GET /country-organization-sizes`, `GET /organization-main-activities`) MUST now filter to `status = ACTIVE`. Their response shapes stay unchanged. No `?status` parameter is exposed on the public side.

### Frontend — dedicated simpler layout

- Create a new `ProfilingMaintainerScreenLayout` under `apps/web/src/screens/Maintainer/components/` for the four profiling screens. It reuses `MaintainerPageHeader` (title, add button, `extra` slot for the active/deleted/all filter toggle) and `UnsavedChangesDialog` (navigation blocker), but **does NOT** include the methodology-scoped InfoBanner, EditModeToolbar, or ExitEditModeDialog. The existing `MaintainerScreenLayout` and `useMaintainerEditingState` / `useMaintainerExitEditMode` hooks are **left untouched** — the prior plan to make `scope` optional is dropped.
- Create four new screens under `apps/web/src/screens/Maintainer/screens/`: `SectorsMaintainerScreen`, `SubsectorsMaintainerScreen`, `MainActivitiesMaintainerScreen`, `OrganizationSizesMaintainerScreen`. Each hosts a DataGrid with inline-edit rows, a status filter toggle, a restore action for DELETED rows, and the `InUseWarningDialog`.
- Create new query hooks under `apps/web/src/api/query/countrySectors/`, `countrySubsectors/`, `organizationMainActivities/`, `countryOrganizationSizes/` (some domains already exist — extend, do not replace). Segregate admin vs. app namespaces in the key factories; admin mutations invalidate both.

### Shared types

- New Zod schemas under `packages/types/src/{countrySectors,countrySubsectors,organizationMainActivities,countryOrganizationSizes}/admin/` — create / update / delete / restore / list — each carrying `status`, `description`, auditors, and (for list responses) `isInUse`.
- Extend the four base schemas to include the new `status` and `description` fields.
- Existing public-facing schemas are unchanged in shape; only their implementation filters DELETED rows.

### Validation

- `name`: `z.string().trim().min(1).max(255)` (trim before min/max).
- `description`: `z.string().trim().max(2000).nullable().optional()`; PATCH tri-state (`undefined` = no-op, `null` = clear, `""` → normalized to null at service).
- PATCH body refined with `.refine(v => Object.values(v).some((value) => value !== undefined))` so empty `{}` and no-op payloads (e.g. `{ name: undefined }`) return 400.
- All Zod messages in Spanish.

### Docs

- `docs/development/maintainers/profiling.md` (new) — covers the four maintainers, the cross-cutting soft-delete contract, the edit-warning dialog, and the union-selector pattern, cross-referencing the capability specs.

### Tests

- Integration tests for all new endpoints (create / list / patch / delete / restore × 4 domains), mirroring `features/subcategories/` layout.
- Unit-level coverage for the union-selector helper (one test file, reused across the four consumers).

## Capabilities

### New Capabilities

- **`profiling-catalog-behavior`** — cross-cutting rules shared by the four maintainers: `status` column + enum, partial unique index, catalog-reference blocking on soft-delete, selector union on the public side, edit-warning dialog semantics, admin list filter + restore action.
- **`profiling-maintainer`** — admin CRUD over `country_sector` and `country_subsector` (already drafted; updated here).
- **`profiling-main-activity-maintainer`** — admin CRUD over `organization_main_activity`, replacing the `UnderConstructionScreen`.
- **`profiling-organization-size-maintainer`** — admin CRUD over `country_organization_size`, including the first-time addition of auditor fields on that model.

### Modified Capabilities

<!-- No existing spec captures the profiling catalogs' admin behavior. The public-endpoint shape preservation is handled inside profiling-catalog-behavior, not as a modification to an existing capability. -->

## Impact

- **Database**: `packages/database/src/prisma/schema.prisma` — four new dedicated enums (`CountrySectorStatus`, `CountrySubsectorStatus`, `OrganizationMainActivityStatus`, `CountryOrganizationSizeStatus`); `status`, `description` columns on four tables; `createdById` / `updatedById` on `country_organization_size`; existing `@@unique` constraints replaced in the schema, with raw-SQL partial indexes declared in the migration.
- **Shared types**: `packages/types/src/baseSchemas/{countrySector,countrySubsector,organizationMainActivity,countryOrganizationSize}.ts` extended; new `admin/` trees per domain; index re-exports.
- **API**: new feature directories under `apps/api/src/features/{countrySectors,countrySubsectors,organizationMainActivities,countryOrganizationSizes}/admin/` (5 endpoints each); public endpoints gain a `status = ACTIVE` filter; new route-mount files under `apps/api/src/routes/api/admin/`.
- **Frontend**:
  - `apps/web/src/interfaces/routes/routes.const.ts` — add 3 new route constants; remove `ADMIN_ITEMS`.
  - `apps/web/src/routes/admin/{sectors,subsectors,organization-sizes}.tsx` (new); `apps/web/src/routes/admin/items.tsx` (deleted); `apps/web/src/routes/admin/main-activities.tsx` (auth widened, component swapped).
  - `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` — sidebar rewired (remove `Rubros`, insert `Perfilamiento` with 4 children).
  - `apps/web/src/screens/Maintainer/components/ProfilingMaintainerScreenLayout.tsx` (new).
  - `apps/web/src/screens/Maintainer/components/dialogs/InUseWarningDialog.tsx` (new, reusable across 4 screens).
  - `apps/web/src/screens/Maintainer/screens/{Sectors,Subsectors,MainActivities,OrganizationSizes}MaintainerScreen.tsx` (new).
  - Per-screen hooks (`useSectorsForm.ts`, `useSectorColumns.tsx`, mirrors for the other three).
  - `apps/web/src/api/query/{countrySectors,countrySubsectors,organizationMainActivities,countryOrganizationSizes}/**` — admin hooks + keys segregation.
  - Selector consumers listed in **Selector union** above — each receives a small change to merge the currently-selected entity into the options list.
  - `apps/web/src/utils/getApiErrorMessage.ts` — Spanish fallbacks for new error codes.
- **Tests**: `apps/api/test/features/{countrySectors,countrySubsectors,organizationMainActivities,countryOrganizationSizes}/**/integration.test.ts`; factory helpers added where missing.
- **Docs**: new `docs/development/maintainers/profiling.md`.
- **Risk**:
  - The soft-delete reversal invalidates a previous product decision. The new ADRs in `design.md` document why; reviewers should read the superseded sections before merging.
  - Partial unique indexes are declared in raw SQL; Prisma will not manage them on subsequent schema diffs — any future migration that touches these tables must preserve the partial index manually. Call out in PR description.
  - The public read endpoints now filter DELETED rows. Any consumer that historically relied on a DELETED row still being returned will silently lose data. The front audit confirmed no such consumer exists today (the only public consumers pass ids through to display the name, which is still accessible on the parent resource).
  - Widening `main-activities` auth and swapping its component at the same time is an intentional coupling; document the before/after for reviewers.
  - The `InUseWarningDialog` depends on the admin list returning `isInUse`. If the count query is expensive (four reference types on sector, three on subsector), benchmark on a representative dataset; if needed, move the count to a per-row on-demand endpoint instead of eager-loading in the list.

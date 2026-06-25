## ADDED Requirements

### Requirement: Per-table status column and dedicated enums

All four profiling catalog tables — `country_sector`, `country_subsector`, `organization_main_activity`, `country_organization_size` — SHALL carry a non-nullable `status` column defaulting to `ACTIVE`. Each table MUST declare its own dedicated Prisma enum (values `ACTIVE`, `DELETED`); no shared cross-table enum is used:

- `country_sector.status: CountrySectorStatus`
- `country_subsector.status: CountrySubsectorStatus`
- `organization_main_activity.status: OrganizationMainActivityStatus`
- `country_organization_size.status: CountryOrganizationSizeStatus`

No dedicated `deletedAt` column SHALL be added on any of these tables. The existing `updatedAt` column (refreshed by Prisma's `@updatedAt`) MUST serve as the implicit soft-delete timestamp for a row whose `status` is `DELETED`.

#### Scenario: Default status on insert

- **WHEN** any insert is performed into one of the four tables without specifying `status`
- **THEN** the row is persisted with `status = 'ACTIVE'`

#### Scenario: Soft-delete refreshes updatedAt

- **WHEN** a row transitions from `ACTIVE` to `DELETED` via a service-layer update
- **THEN** its `updatedAt` column is refreshed in the same statement; no `deletedAt` column exists

### Requirement: Partial unique indexes scoped to ACTIVE

Uniqueness across the four tables SHALL be enforced by partial unique indexes restricted to `status = 'ACTIVE'`, declared via raw SQL in the migration (Prisma does not support partial indexes). The original full-table `@@unique` attributes MUST be removed from the Prisma schema so that the partial index is the sole uniqueness source of truth.

The partial indexes SHALL be:

- `country_sector`: `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`
- `country_subsector`: `UNIQUE (country_sector_id, name) WHERE status = 'ACTIVE'`
- `organization_main_activity`: `UNIQUE (name, country_sector_id, country_subsector_id) WHERE status = 'ACTIVE'`
- `country_organization_size`: `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`

The migration file MUST include an inline SQL comment warning that future schema changes touching these tables must preserve the partial index (Prisma will otherwise silently regenerate a full-table unique constraint).

#### Scenario: ACTIVE row collision rejected

- **WHEN** two ACTIVE rows are attempted under the same unique-scope key
- **THEN** the database rejects the second insert with a unique-constraint violation (Prisma P2002)

#### Scenario: DELETED row does not collide

- **WHEN** one row exists with `status = 'DELETED'` and another insert targets the same unique-scope key with `status = 'ACTIVE'`
- **THEN** both rows coexist and no constraint is violated

### Requirement: Soft-delete replaces hard-delete and cascades over ACTIVE catalog children

Every `DELETE /admin/…/:id` endpoint for the four profiling catalogs MUST transition `status` from `ACTIVE` to `DELETED` inside a `prisma.$transaction`. Physical deletion (hard-delete) MUST NOT be exposed on any admin route of these catalogs.

Soft-delete MUST cascade: within the same transaction the service MUST transition every ACTIVE _catalog_ child of the target from `status = 'ACTIVE'` to `'DELETED'`, mirroring the methodology-catalog standard (`softDeleteSubcategoryDependents`). A delete is NEVER blocked by catalog references. The cascade matrix is:

| Target                     | Cascade soft-deletes (ACTIVE only)                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `CountrySector`            | `CountrySubsector.countrySectorId`, `OrganizationMainActivity.countrySectorId`, `SubcategoryRecommendation.sectorId` |
| `CountrySubsector`         | `OrganizationMainActivity.countrySubsectorId`, `SubcategoryRecommendation.subsectorId`                               |
| `OrganizationMainActivity` | (none — no catalog table references main activity)                                                                   |
| `CountryOrganizationSize`  | (none)                                                                                                               |

The sector cascade reaches children nested under its subsectors without first resolving subsector ids, because the catalog denormalizes the parent sector: every main activity stores its `countrySectorId` and every recommendation a non-null `sectorId`.

User-data references (`OrganizationData.sectorId`, `.subsectorId`, `.mainActivityId`, `.countryOrganizationSizeId`) MUST NOT be modified by the cascade under any circumstance, so soft-deleting a catalog row never rewrites a country's historical footprint; the selector-union requirement below guarantees user-facing rendering.

#### Scenario: Soft-delete cascades to ACTIVE catalog children

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector whose subsectors include at least one `ACTIVE` row
- **THEN** the response is `200` and, in the same transaction, the target and every ACTIVE subsector, main activity and subcategory recommendation under it transition to `DELETED`

#### Scenario: Cascade leaves user-data references untouched

- **WHEN** an ADMIN calls `DELETE /admin/country-organization-sizes/:id` on a size row that is referenced only by `OrganizationData.countryOrganizationSizeId`
- **THEN** the response is `200` and the row transitions to `DELETED`; the `OrganizationData` references remain unchanged

### Requirement: Restore endpoint with collision check

Each of the four admin domains SHALL expose `POST /admin/<domain>/:id/restore` that transitions the target from `status = 'DELETED'` to `status = 'ACTIVE'` inside a `prisma.$transaction`.

Inside the transaction, the service MUST verify that no currently-ACTIVE row collides on the target's unique-scope key. On collision the service MUST throw `DatabaseUniqueConstraintViolationError` (HTTP `409`) and overwrite `error.message` with a Spanish sentence instructing the admin to first rename or soft-delete the colliding ACTIVE row.

Restore MUST reject with `400` and a Spanish sentence on `error.message` when called on a row whose `status` is already `ACTIVE`. All four restore endpoints MUST behave identically; returning `200` on an already-ACTIVE row is NOT permitted.

#### Scenario: Restore success

- **WHEN** an ADMIN calls the restore endpoint on a DELETED row whose unique-scope key does not collide with any ACTIVE row
- **THEN** the response is `200`, the row's `status` is `ACTIVE`, and `updatedAt` is refreshed

#### Scenario: Restore rejected by collision

- **WHEN** an ADMIN calls the restore endpoint on a DELETED row whose `name` matches an ACTIVE row in the same unique scope
- **THEN** the response is `409` with a Spanish sentence on `message` and the row stays `DELETED`

#### Scenario: Restore rejected on already-ACTIVE row

- **WHEN** an ADMIN calls the restore endpoint on a row whose `status` is already `ACTIVE`
- **THEN** the response is `400` with a Spanish sentence on `message` and the row is unchanged

### Requirement: Admin list supports status filter and returns impactedChildren

Each `GET /admin/<domain>` endpoint MUST accept `?status=active|deleted|all`, defaulting to `active`. The server MUST reject any other value with `400`.

Each admin list response MUST include `impactedChildren` per row: the per-reference counts that drive the delete-warning dialog on the frontend, computed inside the same query from the catalog `_count` over the references relevant to the row's domain:

- Sector: active subsectors, active main activities, organization data, subcategory recommendations
- Subsector: active main activities, organization data, subcategory recommendations
- Main activity: organization data
- Organization size: organization data

Catalog children MUST be counted ACTIVE-only — a `status = 'DELETED'` child never participates, since the parent has already broken the relationship. Carbon-inventory snapshots (`carbon_inventory.organizationData`) are deliberately NOT counted here: soft-deleting a catalog row never affects a frozen huella, so it is not surfaced in the delete-warning dialog.

#### Scenario: Default filter hides DELETED

- **WHEN** an ADMIN calls `GET /admin/<domain>` without a `status` query
- **THEN** the response contains only rows with `status = 'ACTIVE'`

#### Scenario: status=all returns both

- **WHEN** an ADMIN calls `GET /admin/<domain>?status=all`
- **THEN** the response includes both ACTIVE and DELETED rows, each carrying its current `status`

#### Scenario: Invalid status value rejected

- **WHEN** a client calls `GET /admin/<domain>?status=purged`
- **THEN** the response is `400` with a Zod validation error

#### Scenario: impactedChildren counts ACTIVE catalog children only

- **WHEN** an ADMIN lists a domain whose target row has one ACTIVE and one DELETED catalog child of the same kind
- **THEN** the row's `impactedChildren` count for that kind includes only the ACTIVE child

### Requirement: Public read endpoints filter to ACTIVE with shape preserved

The existing public (non-admin) read endpoints for the four catalogs MUST filter rows to `status = 'ACTIVE'` at the service layer. The response shape MUST remain byte-compatible with the pre-change contract: no `status` field, no `description`, no auditor ids exposed.

No `?status` query parameter SHALL be added on the public side. Public API callers MUST NOT be able to observe DELETED rows.

#### Scenario: Public endpoint hides DELETED entries

- **WHEN** any authenticated or anonymous caller hits a public catalog endpoint
- **THEN** DELETED rows are absent from the response and the shape matches the pre-change contract exactly

### Requirement: Frontend selectors merge currently-selected value (active ∪ selected)

Every frontend form that renders one of the four profiling catalogs as a single-select dropdown MUST merge the form's initial selected entity into the ACTIVE options list before rendering. The union MUST be de-duplicated by `id` (ACTIVE takes precedence if the selected id is also ACTIVE — no-op).

This requirement SHALL be satisfied by a single shared helper exported from `apps/web/src/utils/` (e.g., `mergeSelectedOption(options, selected)`) reused by every selector consumer. The helper accepts:

- `options: Array<{ id: string; name: string; … }>` — the ACTIVE list returned by the public query.
- `selected: { id: string; name: string } | null | undefined` — the currently-selected entity taken from the parent resource's response (the form already has `id` and `name` because they are included in the parent payload).

The consumers that MUST apply the union are:

- `apps/web/src/screens/MyOrganization/components/OrganizationForm/hooks/useOrganizationForm.ts` — sectors, subsectors, main activities, organization sizes.
- `apps/web/src/screens/MyOrganization/components/OrganizationForm/OrganizationFormDialog.tsx`
- `apps/web/src/screens/MyOrganization/components/OrganizationProfileSection.tsx`
- `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx`
- `apps/web/src/screens/CarbonInventory/hooks/useBusinessProfilingData.ts`

Read-only displays (e.g., `InventoryAttributesCard`, `Transparency*`, `SubmissionHistory/OrgDataSection`, `exportCarbonInventoryToExcel`) do NOT require the union because they render a label that is already carried on the parent resource payload.

#### Scenario: DELETED value still selectable in the form

- **WHEN** a user opens an organization edit form and the organization's `sectorId` points at a DELETED sector
- **THEN** the sector dropdown includes that sector (by name) alongside the ACTIVE sectors, and the form shows it as the current selection

#### Scenario: Selected value already ACTIVE does not duplicate

- **WHEN** the form's selected entity is also present in the ACTIVE list
- **THEN** the dropdown shows the entity exactly once

### Requirement: Identity edits on an in-use catalog row are blocked

An identity-changing edit to a profiling catalog row — its `name`, or its parent FK(s) (re-parent) — MUST be rejected at the service layer with `EditBlockedByReferencesError` (HTTP `409`, code `EDIT_BLOCKED_BY_REFERENCES`) while the row is referenced, because both the live `organization_data.*` rows and the frozen `carbon_inventory.organizationData` JSON snapshot resolve the catalog row's display name (and, for re-parent, its parent pair) **by id at read time** — so the edit would make a user see a name or parent they never chose, including inside a frozen huella. The thrown error MUST attach `details.attemptedChange: "name" | "parent"` and `details.referencedBy` (the per-reference counts).

The guarded edits per catalog:

- `CountrySector` (rubro) and `CountryOrganizationSize` (size): rename only (no parent FK).
- `CountrySubsector` (subrubro): rename and re-parent (`countrySectorId`).
- `OrganizationMainActivity` (actividad): rename and re-parent (`countrySectorId` / `countrySubsectorId`).

What counts as a blocking reference:

- A **rename** is blocked only by **user data**: a live `organization_data.*Id` row OR an ACTIVE `carbon_inventory.organizationData` snapshot whose JSON field equals the row id (the snapshot stores ids as strings, matched by JSON path). ACTIVE catalog children (main activities, subcategory recommendations) alone MUST NOT block a rename.
- A **re-parent** is blocked by **any** dependent: the user data above PLUS ACTIVE catalog children.

A no-op edit (same name / same parent), a `description`-only edit, and a reference that lives only in a DELETED carbon inventory MUST NEVER block. Re-identification is only possible by soft-deleting the row (which cascades) and re-creating it under the correct name/parent, so existing references keep resolving to the value the user originally picked.

The frontend MUST surface the `409` in a `BlockedActionDialog` (not a confirm dialog) carrying the localized reason and the delete-then-recreate hint. There is no "continue anyway" path — the block is authoritative on the server.

#### Scenario: Rename of an in-use row is blocked

- **WHEN** an ADMIN renames a row referenced by a live `organization_data` row or an ACTIVE carbon-inventory snapshot
- **THEN** the response is `409` (`EDIT_BLOCKED_BY_REFERENCES`, `attemptedChange: "name"`) and the `name` is unchanged

#### Scenario: Rename blocked only by catalog children is allowed

- **WHEN** an ADMIN renames a subsector that has ACTIVE main activities but no `organization_data` or ACTIVE-snapshot references
- **THEN** the response is `200` — catalog children do not block a rename

#### Scenario: Re-parent of an in-use row is blocked

- **WHEN** an ADMIN re-parents a subsector or main activity that has any ACTIVE catalog child, `organization_data` row, or ACTIVE carbon-inventory snapshot
- **THEN** the response is `409` (`EDIT_BLOCKED_BY_REFERENCES`, `attemptedChange: "parent"`) and the parent is unchanged

#### Scenario: Description-only edit is always allowed

- **WHEN** an ADMIN edits only the `description` of an in-use row
- **THEN** the response is `200` with no block

#### Scenario: DELETED snapshot does not block

- **WHEN** the only reference to a row is the `organizationData` snapshot of a DELETED carbon inventory
- **THEN** a rename or re-parent of the row is allowed (`200`)

### Requirement: Admin screens expose status filter and restore action

Each of the four profiling maintainer screens SHALL expose a tri-state status filter (`Activos` | `Eliminados` | `Todos`) in the `MaintainerPageHeader.extra` slot, defaulting to `Activos`. The selected filter MUST be passed through to the admin list query's `?status=` parameter.

DELETED rows rendered in the grid (visible when the filter is `Eliminados` or `Todos`) MUST:

- Render in a visually distinct style (dimmed row OR a `Chip` showing "Eliminado").
- Expose a `Restore` row action in place of the standard edit / soft-delete actions.
- Be non-editable inline (edit is disabled until restore).

A successful restore MUST trigger a Spanish snackbar success message.

#### Scenario: Filter toggle changes server query

- **WHEN** an ADMIN switches the filter from `Activos` to `Todos`
- **THEN** the admin list query is re-issued with `?status=all` and both ACTIVE and DELETED rows render

#### Scenario: DELETED row cannot be edited inline

- **WHEN** a DELETED row is visible and the ADMIN attempts to enter inline edit
- **THEN** the edit action is disabled; only the `Restore` action is available on the row

### Requirement: Dedicated ProfilingMaintainerScreenLayout

The four profiling maintainer screens SHALL use a new component `ProfilingMaintainerScreenLayout` located at `apps/web/src/screens/Maintainer/components/ProfilingMaintainerScreenLayout.tsx`.

The component MUST:

- Wrap the grid area with a `FormProvider` fed by the screen's `useForm` instance.
- Render `MaintainerPageHeader` at the top (reused from the existing maintainer layout), passing through `title`, `addLabel`, `onAddRow`, `addDisabled`, and the status filter toggle via the `extra` slot.
- Render the standard `UnsavedChangesDialog` driven by the screen's `useBlocker` result.
- Expose an `extraDialogs` slot for screen-owned dialogs (e.g. the `BlockedActionDialog` that surfaces a blocked edit or blocked restore).
- Accept a single `children` slot for the DataGrid.

The component MUST NOT include: methodology selector, InfoBanner, EditModeToolbar, or ExitEditModeDialog. The existing `MaintainerScreenLayout` and its hooks (`useMaintainerEditingState`, `useMaintainerExitEditMode`, `useMaintainerMethodologyScope`) MUST NOT be modified as part of this change. Any prior plan to make `scope` optional on `MaintainerScreenLayout` is explicitly withdrawn.

#### Scenario: Layout renders without methodology chrome

- **WHEN** a profiling maintainer screen mounts
- **THEN** the rendered tree contains `MaintainerPageHeader` and `UnsavedChangesDialog` but no `InfoBanner`, `EditModeToolbar`, or `ExitEditModeDialog`

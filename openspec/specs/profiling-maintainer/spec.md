## ADDED Requirements

### Requirement: Country sectors and subsectors carry status, description, and auditors

Each `CountrySector` and `CountrySubsector` record SHALL carry:

- `status` — non-nullable, defaulting to `ACTIVE`. Each table uses its own dedicated enum: `country_sector.status: CountrySectorStatus { ACTIVE, DELETED }`; `country_subsector.status: CountrySubsectorStatus { ACTIVE, DELETED }`.
- `description: String?` — nullable.

The `updatedAt` timestamp doubles as the soft-delete timestamp (the `ACTIVE → DELETED` transition updates `updatedAt` via Prisma's `@updatedAt`). A dedicated `deletedAt` column MUST NOT be added.

Existing `createdById` / `updatedById` auditor columns on both tables remain unchanged.

The full-table unique constraints `(countryId, name)` on `CountrySector` and `(countrySectorId, name)` on `CountrySubsector` MUST be replaced by **partial unique indexes** scoped to `status = 'ACTIVE'`, declared via raw SQL in the migration (Prisma does not support partial indexes natively):

- `country_sector`: `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`
- `country_subsector`: `UNIQUE (country_sector_id, name) WHERE status = 'ACTIVE'`

#### Scenario: Sector created with default status

- **WHEN** an admin creates a sector
- **THEN** the row is persisted with `status = 'ACTIVE'` without the client having to supply it

#### Scenario: Two ACTIVE rows cannot share a name within the same country

- **WHEN** two create requests target the same `(countryId, name)` with `status = 'ACTIVE'`
- **THEN** the second is rejected with `409` via `DatabaseUniqueConstraintViolationError`

#### Scenario: A DELETED row may share a name with an ACTIVE row

- **WHEN** a sector is soft-deleted and a new sector is created with the same `name` in the same country
- **THEN** both rows coexist, the partial index is not violated, and the ACTIVE row is the one surfaced to consumers

#### Scenario: Subsector storage mirrors sector

- **WHEN** a subsector is created, renamed, soft-deleted, or restored
- **THEN** the same status, description, partial-index, and auditor semantics apply under the `(countrySectorId, name)` scope

### Requirement: Admin CRUD endpoints over country sectors

The system SHALL expose the following admin endpoints under `/admin/country-sectors`, all requiring authentication AND `SystemRole.ADMIN` or `SystemRole.SUPERADMIN`:

- `POST /admin/country-sectors` — create. Body: `{ name: string (1..255, trimmed), description?: string | null (max 2000) }`. Server resolves `countryId` via `country.findFirst({ orderBy: { id: "asc" } })`. Stamps `createdById` from `request.currentUser`. Response: `201` with the admin sector record.
- `GET /admin/country-sectors?status=active|deleted|all` — list with admin fields (`status`, `description`, `createdAt`, `updatedAt`, `createdById`, `updatedById`, `isInUse`) and nested subsectors filtered by the same `status` parameter. Default `status=active`. Sort by sector name ASC, nested subsectors by name ASC.
- `PATCH /admin/country-sectors/:id` — partial update. Any of `name`, `description` MAY be provided; the body MUST contain at least one field (empty `{}` → `400`). Stamps `updatedById`. Response: `200`.
- `DELETE /admin/country-sectors/:id` — **soft-delete** (transitions `status: ACTIVE → DELETED`). Subject to the catalog-reference blocking rules below. Response: `200` with an empty body (the frontend invalidates and refetches; no consumer reads the deleted row).
- `POST /admin/country-sectors/:id/restore` — restore (transitions `status: DELETED → ACTIVE`). Rejected `409` via `DatabaseUniqueConstraintViolationError` if the `name` collides with a currently-ACTIVE sector in the same country. Response: `200` with the updated record.

All endpoints MUST return `401` for unauthenticated requests and `403` for `SystemRole.USER`.

The `description` field MUST follow PATCH tri-state semantics: `undefined` leaves the stored value unchanged; `null` clears it; `""` is normalized to `null` at the service layer. The `name` field MUST be validated as `.trim().min(1).max(255)`.

The admin list response MUST include a per-row `isInUse: boolean` computed as `OR` across the user-data references (`organization_data.sectorId`) AND catalog references that carry user effect transitively (`organization_main_activity.countrySectorId`). This powers the edit-warning dialog trigger on the frontend.

#### Scenario: Admin soft-deletes a sector with no references

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector with no ACTIVE catalog references
- **THEN** the response is `200`, the row's `status` is `DELETED`, `updatedAt` is refreshed, and the row is no longer returned by `GET` with default `status=active`

#### Scenario: Admin restores a sector

- **WHEN** an ADMIN calls `POST /admin/country-sectors/:id/restore` on a DELETED sector whose name does not collide with any ACTIVE sector
- **THEN** the response is `200`, the row's `status` is `ACTIVE`, and the row appears in subsequent `GET` calls with default `status=active`

#### Scenario: Restore is blocked by name collision

- **WHEN** an ADMIN attempts to restore a DELETED sector whose `name` matches an ACTIVE sector in the same country
- **THEN** the response is `409` with a Spanish sentence on `message` instructing to rename or soft-delete the colliding row first

#### Scenario: Admin list filter

- **WHEN** an ADMIN calls `GET /admin/country-sectors?status=all`
- **THEN** the response includes both ACTIVE and DELETED sectors, each carrying its current `status`, alphabetically sorted

### Requirement: Admin CRUD endpoints over country subsectors

The system SHALL expose analogous admin endpoints under `/admin/country-subsectors` (`POST`, `GET`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore`). Authorization, auditor stamping, description normalization, status filter, and `isInUse` behavior MUST match the sector endpoints.

The create endpoint body MUST require `countrySectorId: string` and SHALL validate inside `prisma.$transaction` that the parent sector exists AND is `ACTIVE`. A non-existent or DELETED parent MUST result in `404` via `ResourceNotFoundError`. The update endpoint MAY accept `countrySectorId` for re-parenting; the new parent MUST be validated the same way.

Re-parenting (a `PATCH` that changes `countrySectorId` to a different sector) MUST be blocked with `ReparentBlockedByReferencesError` (HTTP `409`) when the subsector still has dependents — any ACTIVE `OrganizationMainActivity.countrySubsectorId`, any ACTIVE `SubcategoryRecommendation.subsectorId`, or any `OrganizationData.subsectorId` (the latter carries the subsector into a country's carbon inventories). This keeps the denormalized parent columns the delete-cascade relies on from drifting; re-association is only possible by soft-deleting the subsector (which cascades) and re-creating it under the correct sector. Editing only `name`/`description` MUST never be blocked, and a `countrySectorId` equal to the current parent is a no-op (not blocked).

The admin list response SHALL include `countrySectorId` and the parent sector's `name`. Sort by parent sector name ASC, subsector name ASC.

`isInUse` for subsector is computed as `OR` across `organization_data.subsectorId` AND `organization_main_activity.countrySubsectorId`.

#### Scenario: Subsector creation rejects DELETED parent

- **WHEN** an ADMIN calls `POST /admin/country-subsectors` with a `countrySectorId` whose sector is DELETED
- **THEN** the response is `404` and no row is persisted

#### Scenario: Subsector re-parenting validated inside transaction

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` with a new `countrySectorId` pointing at an ACTIVE sector and the subsector has no dependents
- **THEN** the subsector's parent is updated atomically alongside the validation

#### Scenario: Re-parenting a subsector with dependents is blocked

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` changing `countrySectorId` on a subsector that has at least one ACTIVE main activity, ACTIVE subcategory recommendation, or any organization data referencing it
- **THEN** the response is `409` (`REPARENT_BLOCKED_BY_REFERENCES`) and the subsector's `countrySectorId` is unchanged

#### Scenario: Editing name/description is never blocked by dependents

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` changing only `name` or `description` on a subsector that has dependents
- **THEN** the response is `200` and the change is persisted

### Requirement: Soft-delete cascades over ACTIVE catalog children

`DELETE /admin/country-sectors/:id` MUST soft-delete the sector (status `ACTIVE` → `DELETED`) and, in the same transaction, cascade soft-delete every ACTIVE row that references it:

- `CountrySubsector.countrySectorId = id` AND `CountrySubsector.status = 'ACTIVE'`
- `OrganizationMainActivity.countrySectorId = id` AND `OrganizationMainActivity.status = 'ACTIVE'`
- `SubcategoryRecommendation.sectorId = id` AND `SubcategoryRecommendation.status = 'ACTIVE'`

`DELETE /admin/country-subsectors/:id` MUST soft-delete the subsector and cascade soft-delete every ACTIVE row that references it:

- `OrganizationMainActivity.countrySubsectorId = id` AND `OrganizationMainActivity.status = 'ACTIVE'`
- `SubcategoryRecommendation.subsectorId = id` AND `SubcategoryRecommendation.status = 'ACTIVE'`

A delete is NEVER blocked by catalog references. User-data references (`OrganizationData.sectorId`, `OrganizationData.subsectorId`) MUST NOT be modified by the cascade; the front-side selector union covers the display of those rows.

The cascade and the status update MUST occur inside a single `prisma.$transaction`, mirroring the methodology-catalog standard (`softDeleteSubcategoryDependents`).

#### Scenario: Sector with ACTIVE subsectors cascade soft-deletes them

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector whose subsectors include at least one ACTIVE row
- **THEN** the response is `200` and the sector, every ACTIVE subsector, main activity and subcategory recommendation under it transition to `DELETED`

#### Scenario: Sector referenced only by OrganizationData can be soft-deleted

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector referenced by `OrganizationData.sectorId` but no ACTIVE catalog row
- **THEN** the response is `200`, the sector transitions to `DELETED`, and existing `OrganizationData` rows retain their reference

#### Scenario: Subsector referenced by SubcategoryRecommendation cascade soft-deletes it

- **WHEN** an ADMIN calls `DELETE /admin/country-subsectors/:id` on a subsector referenced by at least one ACTIVE `SubcategoryRecommendation.subsectorId`
- **THEN** the response is `200` and the subsector and that recommendation transition to `DELETED`

### Requirement: Unique-constraint violations surface Spanish error messages

The create, update, and restore endpoints MUST catch Prisma P2002 unique-constraint errors (triggered by the partial unique index on the `ACTIVE` subset) and translate them into `DatabaseUniqueConstraintViolationError`. Service code MUST overwrite `error.message` on the thrown error with a Spanish, end-user-friendly sentence (no separate `userMessage` field — Spanish text travels on the standard `message` field of `ApiErrorResponseSchema`):

- Sector collision → "Ya existe un rubro con ese nombre"
- Subsector collision → "Ya existe un subrubro con ese nombre para el rubro seleccionado"

The frontend `getApiErrorMessage` MUST fall back to the API's `message` (via `AppHttpError#apiMessage`) when the error code has no per-code static entry, so that dynamic Spanish supplied by the API surfaces directly without each code requiring its own frontend mapping.

#### Scenario: Duplicate ACTIVE sector name rejected

- **WHEN** an ADMIN attempts to create a sector with a `name` that matches an existing ACTIVE sector in the same country
- **THEN** the response is `409` with the Spanish message above and no row is created

#### Scenario: Rename into an ACTIVE collision rejected

- **WHEN** an ADMIN calls `PATCH /admin/country-sectors/:id` renaming a sector to a `name` already used by another ACTIVE sector in the same country
- **THEN** the response is `409` and the existing row is not modified

### Requirement: Public read endpoint filters to ACTIVE and preserves shape

The existing app-facing `GET /country-sectors` endpoint MUST filter rows to `status = 'ACTIVE'` at the service layer. Its response shape MUST remain unchanged (`id`, `name`, nested `{ id, name }` subsectors — no `description`, no auditors, no `status`). No `?status` parameter is exposed on the public side.

#### Scenario: Public endpoint hides DELETED sectors

- **WHEN** a client calls the public `GET /country-sectors`
- **THEN** the response contains only `ACTIVE` sectors and, within each, only `ACTIVE` subsectors; the shape matches the pre-change contract

### Requirement: Admin sidebar exposes a "Perfilamiento" group

The admin sidebar SHALL replace the existing top-level `Rubros` entry with a `Perfilamiento` entry occupying the same position. The `Perfilamiento` entry SHALL:

- Render with the `BusinessCenterOutlined` MUI icon.
- Require role `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`.
- Contain four children in this order: `Rubros` (→ `/admin/sectors`), `Subrubros` (→ `/admin/subsectors`), `Actividades Principales` (→ `/admin/main-activities`), `Tamaño de la Organización` (→ `/admin/organization-sizes`).

The Metodologías group and its children SHALL retain their existing `[SystemRole.SUPERADMIN]` gate.

#### Scenario: ADMIN sees Perfilamiento with four children

- **WHEN** a user with `SystemRole.ADMIN` loads the admin layout
- **THEN** the sidebar shows a `Perfilamiento` entry with exactly four children in the order above and no Metodologías entry

#### Scenario: USER sees neither group

- **WHEN** a user with `SystemRole.USER` loads the admin layout
- **THEN** Metodologías and Perfilamiento are hidden

### Requirement: Admin routes for sectors and subsectors

The system SHALL register `/admin/sectors` and `/admin/subsectors` as TanStack Router file routes. Each route's `beforeLoad` MUST enforce `requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. The constants `Routes.ADMIN_SECTORS` and `Routes.ADMIN_SUBSECTORS` SHALL be exported from the central route constants file. The obsolete `Routes.ADMIN_ITEMS` and its `admin/items.tsx` file MUST be removed.

#### Scenario: USER is redirected from sectors route

- **WHEN** a user with `SystemRole.USER` attempts to navigate to `/admin/sectors`
- **THEN** the router redirects to `Routes.ADMIN_DASHBOARD`

### Requirement: Sectors and Subsectors maintainer screens

The screens at `/admin/sectors` and `/admin/subsectors` SHALL:

- Render inside the new `ProfilingMaintainerScreenLayout` (NOT `MaintainerScreenLayout`). The existing `MaintainerScreenLayout` MUST NOT be modified as part of this capability.
- Display a `MaintainerDataGrid` with inline-editable rows.
  - Sectors columns: `name`, `description`, row actions (start/stop/cancel/soft-delete OR restore, depending on row status).
  - Subsectors columns: parent-rubro selector (populated from admin ACTIVE sectors), `name`, `description`, row actions.
- Surface a tri-state status filter toggle (`Activos` | `Eliminados` | `Todos`) inside `MaintainerPageHeader.extra`, defaulting to `Activos`. The filter value is passed through to the admin list query.
- Render DELETED rows in a visually distinct style (dimmed / `Chip` "Eliminado") and swap row actions to a single `Restore` button; edit is disabled for DELETED rows.
- Use the admin-side query hooks to fetch the list and run create / update / soft-delete / restore mutations. Successful mutations MUST invalidate both admin and public-side caches (`countrySectorsKeys.admin.all` AND `countrySectorsKeys.app.all`) so open forms see fresh ACTIVE options.
- Block navigation while a row is dirty (`useBlocker` against `form.formState.isDirty`).
- Surface server errors via snackbar using `getApiErrorMessage`.
- On save of an edit that changes a **visible** field (`name` for sector; `name` or `countrySectorId` for subsector) on a row whose `isInUse` is `true`, open `InUseWarningDialog` BEFORE dispatching the PATCH. Confirm → PATCH. Cancel → remain in edit mode.
- Show Spanish snackbar messages on success: "Rubro creado exitosamente", "Cambios guardados satisfactoriamente", "Rubro eliminado", "Rubro restaurado" (and the subrubro equivalents).

#### Scenario: Admin restores a soft-deleted rubro

- **WHEN** an ADMIN toggles the filter to "Eliminados", clicks Restore on a row, and the restore succeeds
- **THEN** the row is removed from the DELETED list, a Spanish snackbar "Rubro restaurado" appears, and the row reappears when the filter switches to "Activos"

#### Scenario: In-use warning on rename

- **WHEN** an ADMIN edits the `name` of a rubro whose admin list row carries `isInUse: true` and confirms
- **THEN** `InUseWarningDialog` appears; on confirm, the PATCH is dispatched and succeeds; on cancel, the row remains in edit mode with the pending name

#### Scenario: Description-only edit bypasses the warning

- **WHEN** an ADMIN edits only the `description` of a rubro whose `isInUse` is `true`
- **THEN** the PATCH is dispatched without `InUseWarningDialog` appearing, and the row is saved

#### Scenario: Subsector empty state when no sectors exist

- **WHEN** the Subsectors screen loads and the admin ACTIVE sector list is empty
- **THEN** the grid shows the "Crea primero un rubro" helper text and the add button is disabled

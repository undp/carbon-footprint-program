## ADDED Requirements

### Requirement: OrganizationMainActivity carries status and description

The `OrganizationMainActivity` record SHALL carry:

- `status: OrganizationMainActivityStatus { ACTIVE, DELETED }` — non-nullable, defaulting to `ACTIVE`. This enum is dedicated to the `organization_main_activity` table and is not shared with the other profiling catalogs.
- `description: String?` — nullable.

Existing `createdById` / `updatedById` auditor columns remain unchanged.

The full-table unique constraint `(name, countrySectorId, countrySubsectorId)` MUST be replaced by a partial unique index `UNIQUE (name, country_sector_id, country_subsector_id) WHERE status = 'ACTIVE'`.

The soft-delete timestamp is captured by `updatedAt` (no separate `deletedAt`).

#### Scenario: Main activity default status

- **WHEN** a main activity is inserted without an explicit `status`
- **THEN** the row is persisted with `status = 'ACTIVE'`

#### Scenario: ACTIVE uniqueness honors all three fields

- **WHEN** two ACTIVE main activities share the exact triple `(name, countrySectorId, countrySubsectorId)`
- **THEN** the second insert fails with a Prisma P2002 error

### Requirement: Admin CRUD endpoints over organization main activities

The system SHALL expose the following admin endpoints under `/admin/organization-main-activities`, all requiring `SystemRole.ADMIN` or `SystemRole.SUPERADMIN`:

- `POST` — create. Body: `{ name: string (1..255, trimmed), description?: string | null (max 2000), countrySectorId?: string | null, countrySubsectorId?: string | null }`. When `countrySectorId` is provided, the parent sector MUST exist and be `ACTIVE` (validated inside `prisma.$transaction`); same for `countrySubsectorId`. A DELETED or missing parent MUST return `404` via `ResourceNotFoundError`.
- `GET ?status=active|deleted|all` — list with admin fields (`status`, `description`, parent `countrySectorId`, `countrySectorName`, `countrySubsectorId`, `countrySubsectorName`, auditors, `isInUse`). Default `status=active`. Sort by main-activity `name` ASC.
- `PATCH /:id` — partial update. Any of `name`, `description`, `countrySectorId`, `countrySubsectorId` MAY be provided. Empty body → `400`. Parent FKs validated inside transaction as in create. Stamps `updatedById`.
- `DELETE /:id` — soft-delete. Not blocked by any catalog reference (no catalog table references main activity). Response: `200` with the updated record.
- `POST /:id/restore` — restore; rejects `409` on unique-scope name collision with another ACTIVE main activity under the same `(countrySectorId, countrySubsectorId)`.

Validation and auditor stamping rules match the sector endpoints: `name` trimmed min(1) max(255); `description` tri-state (`undefined` = no-op, `null` = clear, `""` = null); PATCH body refined to require ≥ 1 field.

`isInUse` for main activity MUST be computed as `organization_data.mainActivityId` count > 0.

#### Scenario: Create without sector or subsector

- **WHEN** an ADMIN calls `POST /admin/organization-main-activities` with `{ name, description: null }` and no parent FKs
- **THEN** the row is persisted with `countrySectorId = null` and `countrySubsectorId = null`

#### Scenario: Create with DELETED parent sector

- **WHEN** an ADMIN calls create with a `countrySectorId` whose sector is DELETED
- **THEN** the response is `404` and no row is persisted

#### Scenario: Re-parent via PATCH

- **WHEN** an ADMIN calls PATCH with a new `(countrySectorId, countrySubsectorId)` pair pointing at ACTIVE parents
- **THEN** the row is updated atomically; subsequent GET reflects the new parents

#### Scenario: Soft-delete never blocked

- **WHEN** an ADMIN calls DELETE on a main activity referenced only by `organization_data.mainActivityId`
- **THEN** the response is `200` and the row transitions to `DELETED`

#### Scenario: Restore collision

- **WHEN** an ADMIN restores a DELETED main activity whose `(name, countrySectorId, countrySubsectorId)` triple matches an ACTIVE row
- **THEN** the response is `409` and the row stays `DELETED`

### Requirement: Admin route, sidebar, and screen for main activity

The TanStack Router file route `/admin/main-activities` MUST:

- Keep its existing path.
- Have its `beforeLoad` widened from `[SystemRole.SUPERADMIN]` to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`.
- Replace its current `UnderConstructionScreen` component with the new `MainActivitiesMaintainerScreen`.

The sidebar child labeled `Actividades Principales` under the `Perfilamiento` group MUST target `/admin/main-activities`.

The `MainActivitiesMaintainerScreen` MUST use the shared `ProfilingMaintainerScreenLayout`. Its DataGrid columns MUST include: parent-rubro selector (populated from admin ACTIVE sectors), parent-subrubro selector (populated from admin ACTIVE subsectors of the selected parent rubro, or all if no parent is selected), `name`, `description`, and row actions (soft-delete / restore depending on row status). The status filter toggle, in-use warning dialog, and unsaved-changes blocker MUST behave identically to the sector/subsector screens.

Successful mutations MUST invalidate both admin and public-side main-activity caches.

#### Scenario: ADMIN accesses main activities route

- **WHEN** a user with `SystemRole.ADMIN` navigates to `/admin/main-activities`
- **THEN** the `MainActivitiesMaintainerScreen` renders (no longer `UnderConstructionScreen`)

#### Scenario: USER is redirected

- **WHEN** a user with `SystemRole.USER` attempts to navigate to `/admin/main-activities`
- **THEN** the router redirects to `Routes.ADMIN_DASHBOARD`

### Requirement: Public main-activity endpoint filters to ACTIVE

The existing public read endpoint(s) that surface organization main activities to end-user forms MUST filter rows to `status = 'ACTIVE'` at the service layer. The response shape MUST remain byte-compatible with the pre-change contract (no `status` or `description` field exposed).

#### Scenario: Public endpoint hides DELETED main activities

- **WHEN** an end user opens a form that fetches main activities
- **THEN** DELETED main activities are absent from the dropdown

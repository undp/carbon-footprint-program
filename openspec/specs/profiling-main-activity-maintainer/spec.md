# profiling-main-activity-maintainer Specification

## Purpose

Admin CRUD over the `organization_main_activity` catalog: its `status`/`description` columns and ACTIVE-only partial unique index, the create/list/update/soft-delete/restore endpoints with parent sector/subsector validation, the widened `/admin/main-activities` route and maintainer screen that replaces the former placeholder, and the ACTIVE-only public read.

## Requirements

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

- `POST` — create. Body: `{ name: string (1..255, trimmed), description?: string | null (max 2000), countrySectorId?: string | null, countrySubsectorId?: string | null }`. When `countrySectorId` is provided, the parent sector MUST exist and be `ACTIVE` (validated inside `prisma.$transaction`); same for `countrySubsectorId`. A DELETED or missing parent MUST return `404` via `ResourceNotFoundError`. When BOTH `countrySectorId` and `countrySubsectorId` are provided, the subsector's `countrySectorId` MUST match the supplied `countrySectorId` — checked inside the same transaction. A mismatched pair MUST be rejected with `400` and a Spanish sentence on `error.message` indicating the subsector does not belong to the selected sector; the row MUST NOT be persisted.
- `GET ?status=active|deleted|all` — list with admin fields (`status`, `description`, parent `countrySectorId`, `countrySectorName`, `countrySubsectorId`, `countrySubsectorName`, auditors, `impactedChildren`). Default `status=active`. Sort by main-activity `name` ASC.
- `PATCH /:id` — partial update. Any of `name`, `description`, `countrySectorId`, `countrySubsectorId` MAY be provided. Empty body → `400`. Parent FKs validated inside transaction as in create, including the subsector→sector consistency check: after resolving the effective `(countrySectorId, countrySubsectorId)` pair (merging the patch with the persisted values), the subsector's `countrySectorId` MUST match the effective `countrySectorId`. A mismatched pair MUST be rejected with `400` and a Spanish sentence on `error.message`; the row MUST NOT be persisted. Stamps `updatedById`.
- `DELETE /:id` — soft-delete. Not blocked by any catalog reference (no catalog table references main activity). Response: `200` with an empty body (the frontend invalidates and refetches; no consumer reads the deleted row).
- `POST /:id/restore` — restore. Inside the same `prisma.$transaction`:
  - Any persisted `countrySectorId` / `countrySubsectorId` MUST resolve to an ACTIVE parent. A missing parent MUST reject with `404` via `ResourceNotFoundError`; a DELETED parent MUST reject with `409` via `ParentNotActiveError` (with `details: { resourceType, resourceName, parentType, parentName }`) so the frontend can prompt to restore the parent first.
  - When BOTH `countrySectorId` and `countrySubsectorId` are persisted, the subsector's `countrySectorId` MUST still match the activity's `countrySectorId`. A mismatch MUST reject with `400` via `SectorSubsectorMismatchError`.
  - A unique-scope name collision with another ACTIVE main activity under the same `(countrySectorId, countrySubsectorId)` MUST reject with `409` via `DatabaseUniqueConstraintViolationError`.
  - On any rejection the row stays `DELETED`.

Validation and auditor stamping rules match the sector endpoints: `name` trimmed min(1) max(255); `description` tri-state (`undefined` = no-op, `null` = clear, `""` = null); PATCH body refined to require ≥ 1 field.

`impactedChildren` for main activity MUST carry an `organizationData` count: the number of `organization_data` rows referencing this main activity via `mainActivityId`.

#### Scenario: Create without sector or subsector

- **WHEN** an ADMIN calls `POST /admin/organization-main-activities` with `{ name, description: null }` and no parent FKs
- **THEN** the row is persisted with `countrySectorId = null` and `countrySubsectorId = null`

#### Scenario: Create with DELETED parent sector

- **WHEN** an ADMIN calls create with a `countrySectorId` whose sector is DELETED
- **THEN** the response is `404` and no row is persisted

#### Scenario: Re-parent via PATCH

- **WHEN** an ADMIN calls PATCH with a new `(countrySectorId, countrySubsectorId)` pair pointing at ACTIVE parents and the subsector's `countrySectorId` matches the supplied sector
- **THEN** the row is updated atomically; subsequent GET reflects the new parents

#### Scenario: Mismatched sector/subsector pair rejected on create

- **WHEN** an ADMIN calls `POST /admin/organization-main-activities` with both `countrySectorId` and `countrySubsectorId` where the subsector's `countrySectorId` does NOT match the supplied `countrySectorId`
- **THEN** the response is `400` with a Spanish sentence on `error.message` explaining the subsector does not belong to the selected sector; no row is persisted

#### Scenario: Mismatched sector/subsector pair rejected on PATCH

- **WHEN** an ADMIN calls PATCH with a `(countrySectorId, countrySubsectorId)` pair (or an effective pair after merging with persisted values) whose subsector does NOT belong to the supplied sector
- **THEN** the response is `400` with a Spanish sentence on `error.message` and the row is unchanged

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

The `MainActivitiesMaintainerScreen` MUST use the shared `ProfilingMaintainerScreenLayout`. Its DataGrid columns MUST include: parent-rubro selector (populated from admin ACTIVE sectors), parent-subrubro selector (populated from admin ACTIVE subsectors of the selected parent rubro, or all if no parent is selected), `name`, `description`, and row actions (soft-delete / restore depending on row status). The status filter toggle, delete-warning and blocked-action dialogs, and unsaved-changes blocker MUST behave identically to the sector/subsector screens.

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

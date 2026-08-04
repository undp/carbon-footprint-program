# profiling-organization-size-maintainer Specification

## Purpose

Admin CRUD over the `country_organization_size` catalog: its newly added `status`/`description`/auditor columns and ACTIVE-only partial unique index, the create/list/update/soft-delete/restore endpoints, the `/admin/organization-sizes` route and maintainer screen, and the ACTIVE-only public read consumed by organization and carbon-inventory profiling forms.

## Requirements

### Requirement: CountryOrganizationSize gains status, description, and auditors

The `CountryOrganizationSize` record SHALL carry, as a result of this change:

- `status: CountryOrganizationSizeStatus { ACTIVE, DELETED }` — non-nullable, defaulting to `ACTIVE`. This enum is dedicated to the `country_organization_size` table and is not shared with the other profiling catalogs.
- `description: String?` — nullable.
- `createdById: BigInt?` — nullable, relation to `User` (mirror of the pattern on the other profiling catalogs).
- `updatedById: BigInt?` — nullable, relation to `User`.

Existing `createdAt` and `updatedAt` remain unchanged. `updatedAt` doubles as the soft-delete timestamp.

The full-table unique constraint `(countryId, name)` MUST be replaced by a partial unique index `UNIQUE (country_id, name) WHERE status = 'ACTIVE'`.

Existing rows in any deployment MUST remain valid after the migration: the default `status = 'ACTIVE'` applies, and the nullable `description`, `createdById`, `updatedById` columns start at `NULL`.

#### Scenario: Migration preserves existing rows

- **WHEN** the migration is applied to a deployment with pre-existing `country_organization_size` rows
- **THEN** every existing row has `status = 'ACTIVE'`, `description = NULL`, `createdById = NULL`, `updatedById = NULL`

#### Scenario: ACTIVE uniqueness within a country

- **WHEN** two ACTIVE rows attempt to share `(countryId, name)`
- **THEN** the second insert fails with a Prisma P2002 error

### Requirement: Admin CRUD endpoints over country organization sizes

The system SHALL expose the following admin endpoints under `/admin/country-organization-sizes`, all requiring `SystemRole.ADMIN` or `SystemRole.SUPERADMIN`:

- `POST` — create. Body: `{ name: string (1..255, trimmed), description?: string | null (max 2000) }`. Server resolves `countryId` via `country.findFirst({ orderBy: { id: "asc" } })`. Stamps `createdById`. Response: `201`.
- `GET ?status=active|deleted|all` — list with admin fields (`status`, `description`, `createdAt`, `updatedAt`, `createdById`, `updatedById`, `impactedChildren`). Default `status=active`. Sort by `name` ASC.
- `PATCH /:id` — partial update (`name`, `description`). Empty body → `400`. Stamps `updatedById`.
- `DELETE /:id` — soft-delete. Not blocked by any catalog reference. Response: `200` with updated record.
- `POST /:id/restore` — restore; rejects `409` on unique-scope name collision with another ACTIVE size in the same country.

Validation and tri-state rules match the sector endpoints.

`impactedChildren` for organization size MUST carry an `organizationData` count: the number of `organization_data` rows referencing this size via `countryOrganizationSizeId`.

#### Scenario: Admin creates a size

- **WHEN** an ADMIN calls `POST /admin/country-organization-sizes` with `{ name: "Pequeña", description: "1-10 empleados" }`
- **THEN** the row is persisted with the singleton `countryId`, `createdById` set from `request.currentUser`, and the response is `201`

#### Scenario: Soft-delete never blocked

- **WHEN** an ADMIN calls DELETE on a size referenced only by `organization_data.countryOrganizationSizeId`
- **THEN** the response is `200` and the row transitions to `DELETED`

#### Scenario: Restore collision

- **WHEN** an ADMIN restores a DELETED size whose `name` matches an ACTIVE size in the same country
- **THEN** the response is `409` and the row stays `DELETED`

### Requirement: Admin route, sidebar, and screen for organization size

The system SHALL register `/admin/organization-sizes` as a TanStack Router file route. The route's `beforeLoad` MUST enforce `requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. A constant `Routes.ADMIN_ORGANIZATION_SIZES` SHALL be added to the central route constants file.

The sidebar child labeled `Tamaño de la Organización` under the `Perfilamiento` group MUST target `/admin/organization-sizes`.

The `OrganizationSizesMaintainerScreen` MUST use the shared `ProfilingMaintainerScreenLayout`. Its DataGrid columns MUST include: `name`, `description`, row actions. The status filter toggle, delete-warning and blocked-action dialogs, and unsaved-changes blocker MUST behave identically to the other profiling screens.

Successful mutations MUST invalidate both admin and public-side organization-size caches (`countryOrganizationSizesKeys.admin.all` AND `countryOrganizationSizesKeys.app.all`).

#### Scenario: ADMIN accesses organization sizes route

- **WHEN** a user with `SystemRole.ADMIN` navigates to `/admin/organization-sizes`
- **THEN** the `OrganizationSizesMaintainerScreen` renders

#### Scenario: USER is redirected

- **WHEN** a user with `SystemRole.USER` attempts to navigate to `/admin/organization-sizes`
- **THEN** the router redirects to `Routes.ADMIN_DASHBOARD`

### Requirement: Public organization-size endpoint filters to ACTIVE

The existing public `GET /country-organization-sizes` endpoint (consumed by organization and carbon-inventory profiling forms) MUST filter rows to `status = 'ACTIVE'` at the service layer. The response shape MUST remain byte-compatible with the pre-change contract.

#### Scenario: Public endpoint hides DELETED sizes

- **WHEN** a client calls the public `GET /country-organization-sizes`
- **THEN** the response contains only ACTIVE sizes and the shape matches the pre-change contract

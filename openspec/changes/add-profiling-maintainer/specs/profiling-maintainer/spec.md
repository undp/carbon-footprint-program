## ADDED Requirements

### Requirement: Country sectors and subsectors carry an optional description

Each `CountrySector` and `CountrySubsector` record SHALL carry a nullable `description` text field. The column MUST be backward-compatible (existing rows default to `null`) and MUST round-trip through the admin API unchanged.

#### Scenario: Sector created without description

- **WHEN** an admin creates a sector without supplying `description`
- **THEN** the row is persisted with `description = null` and admin read endpoints return `null` for that field

#### Scenario: Sector description replaced

- **WHEN** an admin updates a sector with a new `description` string
- **THEN** the column is overwritten and subsequent reads return the new value

#### Scenario: Sector description cleared

- **WHEN** an admin updates a sector passing `description: null`
- **THEN** the column is set to `null`

#### Scenario: Subsector description behavior mirrors sector

- **WHEN** an admin creates or updates a subsector with or without a `description`
- **THEN** the behavior matches the corresponding sector scenarios above

### Requirement: Admin CRUD endpoints over country sectors

The system SHALL expose the following admin endpoints under `/admin/country-sectors`:

- `POST /admin/country-sectors` — create a sector. Body: `{ name: string (1..255, trimmed), description?: string | null (max 2000) }`. Response: `201` with the created admin sector record.
- `PATCH /admin/country-sectors/:id` — partial update. Any of `name`, `description` MAY be provided, but the body MUST contain at least one field; an empty body (`{}`) MUST be rejected with `400`. Response: `200` with the updated admin sector record.
- `DELETE /admin/country-sectors/:id` — delete. Response: `204` No Content on success (no body).
- `GET /admin/country-sectors` — list all sectors with admin fields (`description`, `createdAt`, `updatedAt`, `createdById`, `updatedById`) and their nested subsectors. Sorted by sector name ASC, subsectors within each sector sorted by name ASC.

All four endpoints MUST require authentication AND `SystemRole.ADMIN` or `SystemRole.SUPERADMIN` via `requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])`. Unauthenticated requests MUST return `401`; authenticated requests by a user with `SystemRole.USER` MUST return `403`.

The create endpoint MUST resolve the deployment's `countryId` via the singleton pattern `country.findFirst({ orderBy: { id: "asc" } })`. The request MUST NOT accept a `countryId` field.

The create and update endpoints MUST stamp `createdById` / `updatedById` from `request.currentUser`.

The `description` field on create and update MUST follow PATCH tri-state semantics: `undefined` (omitted) leaves the stored value unchanged on update; `null` clears the value; an empty string `""` MUST be normalized to `null` at the service layer before persistence. The `name` field MUST be validated as `.trim().min(1).max(255)` so that whitespace-only input is rejected.

#### Scenario: Admin creates a sector

- **WHEN** an authenticated ADMIN calls `POST /admin/country-sectors` with `{ name: "Industria", description: "Manufactura y transformación" }`
- **THEN** a new row is created with `countryId` from the singleton country, `createdById` set to the current user, and the response is `201` with the admin shape

#### Scenario: Empty PATCH body rejected

- **WHEN** an ADMIN calls `PATCH /admin/country-sectors/:id` with an empty body `{}`
- **THEN** the response is `400` with a Spanish validation message; no row is modified

#### Scenario: Whitespace-only name rejected

- **WHEN** an ADMIN submits `{ name: "   " }` to create or update
- **THEN** the response is `400` because the trimmed value fails the `min(1)` check

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request without auth is sent to any of the four admin endpoints
- **THEN** the response is `401`

#### Scenario: USER role is rejected

- **WHEN** a request authenticated as `SystemRole.USER` is sent to any of the four admin endpoints
- **THEN** the response is `403`

#### Scenario: Both ADMIN and SUPERADMIN succeed

- **WHEN** an authenticated ADMIN OR SUPERADMIN calls any of the four admin endpoints with valid input
- **THEN** the request succeeds (no role-level rejection)

### Requirement: Admin CRUD endpoints over country subsectors

The system SHALL expose analogous admin endpoints under `/admin/country-subsectors`: `POST`, `PATCH /:id`, `DELETE /:id`, and `GET`. Authorization, auditor stamping, and description-normalization rules MUST match the sector endpoints.

The create endpoint body MUST require `countrySectorId: string` and SHALL validate that the parent sector exists within the same `prisma.$transaction` as the insert. The update endpoint MAY accept `countrySectorId` for re-parenting; the new parent MUST be validated inside the update transaction.

The admin list endpoint SHALL return each subsector with `countrySectorId` and the parent sector's `name` for display. Sort order SHALL be parent sector name ASC, then subsector name ASC.

#### Scenario: Subsector created with valid parent

- **WHEN** an ADMIN calls `POST /admin/country-subsectors` with `{ countrySectorId: "<valid sector id>", name: "Alimentos" }`
- **THEN** the subsector is persisted and linked to the given sector

#### Scenario: Subsector creation with invalid parent is rejected

- **WHEN** an ADMIN calls `POST /admin/country-subsectors` with a `countrySectorId` that does not exist
- **THEN** the response is `404` (via `ResourceNotFoundError`) with a Spanish error message indicating the parent sector was not found; no row is persisted

#### Scenario: Subsector re-parented via update

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` with a new `countrySectorId`
- **THEN** the subsector's `countrySectorId` is replaced and subsequent reads reflect the new parent

#### Scenario: Subsector re-parented to a non-existent sector

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` with a `countrySectorId` that does not exist
- **THEN** the response is `404` (via `ResourceNotFoundError`) and the existing row is not modified

### Requirement: Unique-constraint violations surface Spanish error messages

The create and update endpoints for both sectors and subsectors MUST catch Prisma P2002 unique-constraint errors and translate them into a `DatabaseUniqueConstraintViolationError` carrying a Spanish `userMessage`:

- Sector: `(countryId, name)` collision → "Ya existe un rubro con ese nombre"
- Subsector: `(countrySectorId, name)` collision → "Ya existe un subrubro con ese nombre para el rubro seleccionado"

The frontend error-message mapper (`getApiErrorMessage`) MUST prefer the `userMessage` carried on the error response when present, falling back to a code-keyed Spanish string (keyed on the error `code`) so that a missing `userMessage` still renders a Spanish error.

#### Scenario: Duplicate sector name rejected

- **WHEN** an ADMIN attempts to create a sector with a `name` that already exists in the same country
- **THEN** the response is `409` with the Spanish message above and no row is created

#### Scenario: Duplicate subsector within same parent rejected

- **WHEN** an ADMIN attempts to create a subsector with a `(countrySectorId, name)` that already exists
- **THEN** the response is `409` with the Spanish message above and no row is created

#### Scenario: Renaming a sector to collide with another rejected

- **WHEN** an ADMIN calls `PATCH /admin/country-sectors/:id` with a `name` that already belongs to another sector in the same country
- **THEN** the response is `409` with the same Spanish message as the create-collision case and the existing row is not modified

#### Scenario: Re-parenting a subsector into a name collision rejected

- **WHEN** an ADMIN calls `PATCH /admin/country-subsectors/:id` with a new `countrySectorId` under which a subsector with the same `name` already exists
- **THEN** the response is `409` with the subsector-collision Spanish message and the existing row is not modified

### Requirement: Delete blocks when references exist

`DELETE /admin/country-sectors/:id` MUST refuse deletion and throw `DataIntegrityError` (HTTP `500`, as currently defined in `apps/api/src/errors/DataIntegrityError.ts`) if any of the following rows reference the sector (Prisma field names shown):

- `CountrySubsector.countrySectorId = id`
- `OrganizationMainActivity.countrySectorId = id`
- `OrganizationData.sectorId = id`
- `SubcategoryRecommendation.sectorId = id`

`DELETE /admin/country-subsectors/:id` MUST similarly refuse if any of the following reference the subsector (Prisma field names shown):

- `OrganizationMainActivity.countrySubsectorId = id`
- `OrganizationData.subsectorId = id`
- `SubcategoryRecommendation.subsectorId = id`

Reference checks and deletion MUST occur inside a single `prisma.$transaction`. Note: under Postgres default isolation (READ COMMITTED) the transaction is best-effort and a concurrent insert of a dependent row can still race the reference check; the database foreign-key constraint is the final guardrail (a racing FK violation surfaces as a separate Prisma error, not as `DataIntegrityError`). The thrown `DataIntegrityError` MUST include a Spanish `userMessage` that names the blocking reference type(s) so the admin can act.

#### Scenario: Sector with subsectors cannot be deleted

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector with at least one `CountrySubsector`
- **THEN** the response is `500` with a Spanish `userMessage` explaining subsectors must be removed first, and no row is deleted

#### Scenario: Sector used by organizations cannot be deleted

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector referenced by `OrganizationData.sectorId`
- **THEN** the response is `500` with a Spanish `userMessage`, and no row is deleted

#### Scenario: Sector with no references is deleted

- **WHEN** an ADMIN calls `DELETE /admin/country-sectors/:id` on a sector with zero references of any kind
- **THEN** the row is removed and the response is `204` No Content

#### Scenario: Subsector blocking mirrors sector

- **WHEN** an ADMIN calls `DELETE /admin/country-subsectors/:id` on a subsector referenced by `OrganizationData.subsectorId`, `OrganizationMainActivity.countrySubsectorId`, or `SubcategoryRecommendation.subsectorId`
- **THEN** the response is `500` with the corresponding Spanish `userMessage`

### Requirement: Public read endpoint remains unchanged

The existing app-facing `GET /country-sectors` endpoint (consumed by the organization-creation form) MUST remain functionally unchanged. Its response shape MUST NOT include `description`, `createdAt`, `updatedAt`, or auditor identifiers, and it MUST NOT require admin authorization.

#### Scenario: Public endpoint shape preserved

- **WHEN** any client calls the existing public `GET /country-sectors`
- **THEN** the response contains only the pre-existing fields (`id`, `name`, nested `{ id, name }` subsectors) and omits admin-only fields

### Requirement: Admin sidebar exposes a "Perfilamiento" group

The admin sidebar SHALL replace the existing top-level `Rubros` entry with a `Perfilamiento` entry occupying the same position. The `Perfilamiento` entry SHALL:

- Render with the `BusinessCenterOutlined` MUI icon.
- Require role `[SystemRole.ADMIN, SystemRole.SUPERADMIN]` (widened from the prior `[SystemRole.SUPERADMIN]` gate on the old `Rubros` group).
- Contain three children in this order: `Rubros` (→ `/admin/sectors`), `Subrubros` (→ `/admin/subsectors`), `Actividades Principales` (→ `/admin/main-activities`, destination unchanged).

The Metodologías group and its children SHALL retain their existing `[SystemRole.SUPERADMIN]` gate; the auth widening applies only to the new Perfilamiento group.

#### Scenario: ADMIN sees Perfilamiento

- **WHEN** a user with `SystemRole.ADMIN` loads the admin layout
- **THEN** the sidebar shows a `Perfilamiento` entry with three children and does NOT show the Metodologías entry

#### Scenario: SUPERADMIN sees both Metodologías and Perfilamiento

- **WHEN** a user with `SystemRole.SUPERADMIN` loads the admin layout
- **THEN** the sidebar shows both the Metodologías and Perfilamiento groups

#### Scenario: USER sees neither admin-scoped group

- **WHEN** a user with `SystemRole.USER` loads the admin layout
- **THEN** the sidebar shows only entries whose `requiredRoles` they satisfy; Metodologías and Perfilamiento are hidden

### Requirement: Admin routes for sectors and subsectors

The system SHALL register `/admin/sectors` and `/admin/subsectors` as TanStack Router file routes. Each route's `beforeLoad` MUST enforce `requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. The corresponding route constants `Routes.ADMIN_SECTORS` and `Routes.ADMIN_SUBSECTORS` SHALL be exported from the central route constants file. The obsolete `Routes.ADMIN_ITEMS` constant and its `admin/items.tsx` route file MUST be removed.

The existing `admin/main-activities.tsx` route SHALL have its `beforeLoad` widened from `[SystemRole.SUPERADMIN]` to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`.

#### Scenario: ADMIN accesses sectors route

- **WHEN** a user with `SystemRole.ADMIN` navigates to `/admin/sectors`
- **THEN** the Sectors maintainer screen renders

#### Scenario: USER is redirected from sectors route

- **WHEN** a user with `SystemRole.USER` attempts to navigate to `/admin/sectors`
- **THEN** the router redirects to `Routes.ADMIN_DASHBOARD` per the `beforeLoad` guard

### Requirement: Sectors maintainer screen

The Sectors maintainer screen at `/admin/sectors` SHALL:

- Render inside the shared `MaintainerScreenLayout` without a methodology scope (title "Rubros", add label "Agregar rubro").
- Display a `MaintainerDataGrid` with inline-editable rows. Columns MUST include, at minimum, `name` and `description`, plus an actions column with start/stop/cancel/delete controls.
- Use the admin-side query hooks to fetch the list and run create/update/delete mutations. A successful mutation MUST invalidate both the admin list cache and the public app-side sector cache so that open organization forms see fresh data.
- Block navigation while a row is dirty (`useBlocker` against `form.formState.isDirty`).
- Surface server errors via snackbar using `getApiErrorMessage`.
- Show Spanish snackbar messages on success: "Rubro creado exitosamente", "Cambios guardados satisfactoriamente", "Rubro eliminado".

#### Scenario: Admin creates a rubro end-to-end

- **WHEN** an ADMIN adds a row, fills `name` + optional `description`, and confirms
- **THEN** the row is persisted, the grid shows the saved row with its server-assigned id, and a success snackbar appears in Spanish

#### Scenario: Admin deletes a rubro that has subsectors

- **WHEN** an ADMIN triggers delete on a rubro that has at least one subsector
- **THEN** the backend returns `500` via `DataIntegrityError`, the row remains in the grid, and an error snackbar in Spanish (from the error's `userMessage`) explains the blocking condition

### Requirement: Subsectors maintainer screen

The Subsectors maintainer screen at `/admin/subsectors` SHALL:

- Render inside the shared `MaintainerScreenLayout` without a methodology scope (title "Subrubros", add label "Agregar subrubro").
- Display a `MaintainerDataGrid` whose columns include a parent-rubro selector (populated from the admin sector list), `name`, `description`, and actions.
- Reuse the admin-side subsector query + mutation hooks. Mutations MUST invalidate the subsector admin cache, the sector admin cache (nested subsectors display), and the public app-side sector cache.
- Show an empty-state message "Crea primero un rubro" and disable the add button when zero sectors exist.
- Block navigation while a row is dirty and surface errors via snackbar, identically to the Sectors screen.

#### Scenario: Admin re-parents a subsector

- **WHEN** an ADMIN changes the parent rubro of a subsector row and confirms
- **THEN** the row is updated server-side and the grid re-sorts under the new parent on refetch

#### Scenario: Empty state when no rubros exist

- **WHEN** the Subsectors screen loads and the admin sector list is empty
- **THEN** the grid shows the "Crea primero un rubro" helper text and the add button is disabled

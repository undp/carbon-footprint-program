## ADDED Requirements

### Requirement: Shared explanation slug catalog

The system SHALL expose a shared, code-declared catalog of explanation slugs from `@repo/constants` containing a const `ExplanationSlug` union of identifiers and an `EXPLANATION_CATALOG` record mapping each slug to `{ name: string; description?: string }`. Web and seed code MUST import the catalog; slugs MUST NOT be hardcoded at call sites.

#### Scenario: Initial catalog contents

- **WHEN** the catalog is loaded
- **THEN** it contains at least the five reduction-project slugs: `reduction_projects_list`, `reduction_project_basis`, `reduction_project_gwp`, `reduction_project_gei_considered`, `reduction_project_reported_elsewhere`, each with a Spanish `name` and `description`

#### Scenario: Slug type is a closed union

- **WHEN** a developer passes an arbitrary string literal to a function typed `(slug: ExplanationSlug | null) => void`
- **THEN** the TypeScript compiler rejects the call with a type error

### Requirement: Explanation model carries name and description

The `Explanation` database model SHALL include `name String` (NOT NULL) and `description String?` (nullable) columns, alongside the existing immutable `slug` and mutable `content` fields. The model MUST NOT carry a `createdById` column or a `creator` user relation.

#### Scenario: Schema shape

- **WHEN** the Prisma schema is inspected
- **THEN** the `Explanation` model has `slug`, `name`, `description`, `content`, `updatedById`, `updater` relation, `createdAt`, and `updatedAt`; it has no `createdById` and no `creator` relation

#### Scenario: User back-relation

- **WHEN** the `User` model is inspected
- **THEN** it has no back-relation named `explanation_created_by`

### Requirement: Standalone catalog seed is idempotent and content-preserving

Seeding SHALL upsert one row per `EXPLANATION_CATALOG` entry keyed by `slug`. The create branch MUST set `name`, `description`, and `content: ""`. The update branch MUST refresh `name` and `description` only; it MUST NOT overwrite `content`.

#### Scenario: First seed of an empty database

- **WHEN** the seed runs against an empty `Explanation` table
- **THEN** one row exists per catalog entry with the catalog's `name`/`description` and an empty `content`

#### Scenario: Re-seed after operator edits content

- **GIVEN** an explanation row whose `content` was previously updated by an admin to "Authored markdown"
- **WHEN** the seed runs again with a changed catalog `name` for that slug
- **THEN** the row's `name` is refreshed to the new catalog value
- **AND** the row's `content` remains "Authored markdown"

### Requirement: Admin listing endpoint

The system SHALL expose `GET /api/admin/explanations` that returns all explanation rows sorted by `name` ascending. The endpoint MUST require authentication and SHALL restrict access to SUPERADMIN and ADMIN system roles. The response MUST include `slug`, `name`, `description`, `content`, `createdAt`, `updatedAt`, and `updatedById` for each row. It MUST NOT include `createdById`.

#### Scenario: Unauthenticated request

- **WHEN** a client without a valid auth token calls `GET /api/admin/explanations`
- **THEN** the response status is 401

#### Scenario: Authenticated non-admin request

- **WHEN** a user with system role `USER` calls `GET /api/admin/explanations`
- **THEN** the response status is 403

#### Scenario: Admin request returns sorted list

- **GIVEN** rows with names "Zeta", "Alfa", "Delta"
- **WHEN** an ADMIN user calls `GET /api/admin/explanations`
- **THEN** the response status is 200
- **AND** the rows are returned in the order Alfa, Delta, Zeta

### Requirement: Admin update endpoint

The system SHALL expose `PATCH /api/admin/explanations/:slug` that updates only the `content` field of the addressed explanation. It MUST require authentication and SHALL restrict access to SUPERADMIN and ADMIN system roles. The body MUST be `{ content: string }` with `content.length <= 10000`; an empty string MUST be accepted. On success the response MUST return the full updated row, and the row's `updatedById` MUST be set to the calling user's id and `updatedAt` bumped. Reads and writes MUST happen inside a single Prisma interactive transaction to avoid TOCTOU races.

#### Scenario: Unauthenticated request

- **WHEN** a client without a valid auth token calls `PATCH /api/admin/explanations/:slug`
- **THEN** the response status is 401

#### Scenario: Authenticated non-admin request

- **WHEN** a user with system role `USER` calls the endpoint
- **THEN** the response status is 403

#### Scenario: Unknown slug

- **GIVEN** no explanation row exists with slug `does_not_exist`
- **WHEN** an ADMIN calls `PATCH /api/admin/explanations/does_not_exist` with a valid body
- **THEN** the response status is 404

#### Scenario: Content too long

- **WHEN** an ADMIN calls the endpoint with a body whose `content` has 10 001 characters
- **THEN** the response status is 400

#### Scenario: Empty content allowed

- **WHEN** an ADMIN calls the endpoint with `{ content: "" }` for an existing slug
- **THEN** the response status is 200
- **AND** the row's `content` becomes the empty string

#### Scenario: Happy-path update

- **GIVEN** an existing row for slug `reduction_project_gwp`
- **WHEN** an ADMIN user with id `U` calls the endpoint with `{ content: "New markdown" }`
- **THEN** the response status is 200
- **AND** the row's `content` is "New markdown", `updatedById` is `U`, and `updatedAt` is more recent than before the call

### Requirement: Public endpoint response unchanged

`GET /api/explanations/:slug` SHALL continue to respond with a body containing exactly `{ slug, content }`. The `name` and `description` fields MUST NOT appear in the public response.

#### Scenario: Public response shape

- **WHEN** any client calls `GET /api/explanations/:slug` for an existing slug
- **THEN** the response body has keys `slug` and `content` only

### Requirement: Admin maintainer screen

The web app SHALL expose a maintainer screen at `/admin/explanations` accessible to SUPERADMIN and ADMIN users. Users with any other system role MUST be redirected to the admin dashboard. The screen MUST render a table with columns `Nombre`, `Descripción`, `Slug`, and `Acciones`, sourced from `GET /api/admin/explanations`, sorted by name ascending, and provide a client-side search input that filters by name or slug (accent-insensitive, case-insensitive).

#### Scenario: Non-admin user navigates to the route

- **GIVEN** a user with system role `USER`
- **WHEN** the user navigates to `/admin/explanations`
- **THEN** the user is redirected to the admin dashboard route

#### Scenario: Admin sees the sorted list

- **WHEN** an ADMIN navigates to `/admin/explanations`
- **THEN** all catalog rows appear, sorted by `Nombre` ascending, each with `Nombre`, `Descripción`, `Slug`, and an "Editar" action

#### Scenario: Client-side search

- **GIVEN** the list is loaded
- **WHEN** the user types a term matching part of a row's name or slug (accent- and case-insensitive)
- **THEN** only the matching rows remain visible

### Requirement: Edit via modal commits immediately

Pressing "Editar" on a row SHALL open the existing `ExplanationModal` with a multiline markdown textarea seeded with the row's current `content` and the row's `name` as the modal title. Pressing "Guardar" SHALL call `PATCH /api/admin/explanations/:slug`, show a loading indicator on the save button while the request is in flight, close the modal on success, invalidate the admin explanations query, and display a success toast. There MUST NOT be a multi-row dirty state or a cancel-pending-changes flow.

#### Scenario: Successful save

- **GIVEN** an ADMIN has opened the modal for a row and typed new markdown
- **WHEN** the ADMIN presses "Guardar"
- **THEN** a `PATCH` request is sent, the save button shows a loading indicator, and on success the modal closes, the list refreshes, and a success toast appears

#### Scenario: Save failure

- **GIVEN** the PATCH request fails
- **WHEN** the error returns
- **THEN** the modal remains open with the user's edits intact and an error message is surfaced

### Requirement: Reduction-project InfoButton slots wired

All five existing `InfoButton` slots in reduction-project screens SHALL pass concrete `ExplanationSlug` values rather than `null`. The relevant component props SHALL be named with the `*ExplanationSlug` suffix (not `*ExplanationId`).

#### Scenario: Reduction projects list header

- **WHEN** the user views the reduction projects list
- **AND** clicks the list header's `InfoButton`
- **THEN** the explanation dialog opens with the content for slug `reduction_projects_list`

#### Scenario: Reduction project detail sections

- **WHEN** the user views a reduction project detail
- **THEN** the `InfoButton`s in the "Datos base", GWP, "GEI considerados", and "Reportado en otra iniciativa" areas each resolve to their corresponding catalog slug and open their content

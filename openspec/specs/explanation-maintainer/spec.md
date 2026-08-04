# explanation-maintainer Specification

## Purpose

Admins and superadmins maintain the editable markdown content of standalone `explanation` rows (initially the reduction-project help texts) through a dedicated maintainer screen. Reduction-project surfaces reference these explanations by slug through a shared slug constant, the seed populates the rows from per-dataset data files, and the public endpoint resolves a slug's content at read time. This capability covers the shared slug constant, the `Explanation` model shape, the standalone-explanation seed, the admin list and content-update endpoints, the maintainer screen, and the reduction-project InfoButton wiring.

## Requirements

### Requirement: Shared reduction-project explanation slugs

Reduction-project help slugs SHALL be declared once as a shared, code-declared constant and referenced by every reduction-project InfoButton; slugs MUST NOT be hardcoded as inline string literals at individual call sites.

#### Scenario: Initial slug set

- **WHEN** the shared reduction-project explanation slug constant is inspected
- **THEN** it contains the five hyphenated slugs `reduction-project`, `reduction-project-basis`, `reduction-project-gwp`, `reduction-project-gei-considered`, and `reduction-project-reported-elsewhere`

#### Scenario: Slugs referenced through the constant

- **WHEN** a reduction-project InfoButton opens an explanation
- **THEN** it passes a slug drawn from the shared constant rather than an inline string literal

### Requirement: Explanation model carries name and description

The `Explanation` database model SHALL include `name String` (NOT NULL) and `description String?` (nullable) columns, alongside the immutable `slug` primary key and the mutable `content` field. The model retains its `createdById` and `updatedById` auditor columns and their `creator` and `updater` relations to `User`.

#### Scenario: Schema shape

- **WHEN** the Prisma schema is inspected
- **THEN** the `Explanation` model has `slug`, `name`, `description`, `content`, `createdAt`, `updatedAt`, `createdById`, `updatedById`, and the `creator` and `updater` relations to `User`

#### Scenario: User back-relations

- **WHEN** the `User` model is inspected
- **THEN** it has the `explanationsCreated` back-relation tied to `@relation("explanation_created_by")` and the `explanationsUpdated` back-relation tied to `@relation("explanation_updated_by")`

### Requirement: Standalone explanation seed

Seeding SHALL upsert one `explanation` row per entry in the dataset's standalone-explanations data file, keyed by `slug`. Each entry provides `slug`, `name`, an optional `description`, and an optional `content`; the effective `content` is the matching per-slug markdown file when present, otherwise the entry's `content`, otherwise the empty string. Both the create and the update branch set `name`, `description`, and `content`. When no standalone data file exists for a dataset the seed is a no-op.

#### Scenario: First seed of an empty database

- **WHEN** the seed runs against an empty `Explanation` table with a standalone-explanations data file present
- **THEN** one row exists per data-file entry, each with the entry's `name` and `description` and the resolved `content`

#### Scenario: Re-seed refreshes name, description, and content

- **GIVEN** an explanation row previously seeded for a slug
- **WHEN** the seed runs again for that slug
- **THEN** the row's `name`, `description`, and `content` are refreshed from the data file (and matching markdown file) for that slug

### Requirement: Admin listing endpoint

The system SHALL expose `GET /api/admin/explanations` that returns all explanation rows sorted by `name` ascending. The endpoint MUST require authentication and SHALL restrict access to SUPERADMIN and ADMIN system roles. Each returned row MUST include `slug`, `name`, `description`, and `content`; audit fields and timestamps are not exposed in this response.

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
- **AND** the rows are returned in the order Alfa, Delta, Zeta, each carrying `slug`, `name`, `description`, and `content`

### Requirement: Admin update endpoint

The system SHALL expose `PATCH /api/admin/explanations/:slug` that updates only the `content` field of the addressed explanation. It MUST require authentication and SHALL restrict access to SUPERADMIN and ADMIN system roles. The body MUST be `{ content: string }` with `content.length <= 10000`; an empty string MUST be accepted. The update MUST be applied atomically and MUST set `updatedById` to the calling user's id (with `updatedAt` refreshed via `@updatedAt`). If no row matches the slug the endpoint MUST respond `404`. On success the endpoint MUST respond `204` with no body.

#### Scenario: Unauthenticated request

- **WHEN** a client without a valid auth token calls `PATCH /api/admin/explanations/:slug`
- **THEN** the response status is 401

#### Scenario: Authenticated non-admin request

- **WHEN** a user with system role `USER` calls the endpoint
- **THEN** the response status is 403

#### Scenario: Unknown slug

- **GIVEN** no explanation row exists with slug `does-not-exist`
- **WHEN** an ADMIN calls `PATCH /api/admin/explanations/does-not-exist` with a valid body
- **THEN** the response status is 404

#### Scenario: Content too long

- **WHEN** an ADMIN calls the endpoint with a body whose `content` has 10 001 characters
- **THEN** the response status is 400

#### Scenario: Empty content allowed

- **WHEN** an ADMIN calls the endpoint with `{ content: "" }` for an existing slug
- **THEN** the response status is 204
- **AND** the row's `content` becomes the empty string

#### Scenario: Happy-path update

- **GIVEN** an existing row for slug `reduction-project-gwp`
- **WHEN** an ADMIN user with id `U` calls the endpoint with `{ content: "New markdown" }`
- **THEN** the response status is 204
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
- **THEN** all explanation rows appear, sorted by `Nombre` ascending, each with `Nombre`, `Descripción`, `Slug`, and an "Editar" action

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

All five reduction-project `InfoButton` slots SHALL pass a concrete slug value drawn from the shared reduction-project slug constant rather than `null`. The relevant component props SHALL be named with the `*ExplanationSlug` suffix (not `*ExplanationId`).

#### Scenario: GWP InfoButton resolves its slug

- **WHEN** the user views a reduction-project detail and clicks the GWP `InfoButton`
- **THEN** the explanation dialog opens with the content for slug `reduction-project-gwp`

#### Scenario: All slots use the shared constant

- **WHEN** the reduction-project list header and the detail "Datos base", GWP, "GEI considerados", and "Reportado en otra iniciativa" `InfoButton`s are inspected
- **THEN** each passes a slug from the shared constant (not `null` and not an inline literal), and each opens its corresponding explanation content

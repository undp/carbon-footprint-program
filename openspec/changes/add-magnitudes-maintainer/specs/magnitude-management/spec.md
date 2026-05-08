## ADDED Requirements

### Requirement: Magnitudes are a database model with a stable code and editable name

The system SHALL define a `Magnitude` Prisma model with the following columns: `id` (BigInt, autoincrement, primary key), `code` (string, unique), `name` (string), `isSystem` (boolean, default `false`), `status` (`MeasurementUnitStatus`, default `ACTIVE`), `createdAt`, `updatedAt`. The Prisma `Magnitude` enum SHALL be removed. `MeasurementUnit.magnitude` (enum) SHALL be replaced by `MeasurementUnit.magnitudeId` (BigInt, foreign key to `Magnitude.id`, `ON DELETE RESTRICT`).

#### Scenario: Existing rows after schema change

- **WHEN** the base migration (which now includes the `Magnitude` table and the `MeasurementUnit.magnitudeId` column) is applied and the seed script runs
- **THEN** ten system magnitudes SHALL be present (`MASS`, `VOLUME`, `DISTANCE`, `TIME`, `ANIMALS`, `AREA`, `POWER`, `ENERGY`, `DISTANCE_MASS`, `ROOMS`) with `isSystem = true` and the canonical Spanish labels, AND every seeded `MeasurementUnit` SHALL have a `magnitudeId` resolved from its `magnitudeCode` in the seed JSON

#### Scenario: Code is immutable after creation

- **WHEN** an admin sends a PATCH request whose body includes `code`
- **THEN** the system SHALL respond with HTTP 400 (the update route schema does not declare a `code` field, so the request is rejected at validation time)

### Requirement: System magnitudes are protected from soft-delete

The system SHALL refuse any soft-delete operation targeting a `Magnitude` with `isSystem = true`, regardless of `referenceCount`. System magnitudes ARE editable on the `name` field but never on `code`, `isSystem`, or `status`. The seed script is the only writer of `isSystem = true`.

#### Scenario: Soft-delete of a system magnitude

- **WHEN** an admin sends a DELETE request targeting a magnitude with `isSystem = true`
- **THEN** the system SHALL respond with HTTP 422 and the `MagnitudeIsSystemError` code

#### Scenario: Rename of a system magnitude

- **WHEN** an admin sends a PATCH request targeting a magnitude with `isSystem = true` and a body containing only `name`
- **THEN** the system SHALL apply the rename and respond with HTTP 200

### Requirement: Custom magnitudes are deletable only when no measurement unit references them

A magnitude with `isSystem = false` SHALL be soft-deletable when no `MeasurementUnit` row (regardless of MU status) holds `magnitudeId` equal to that magnitude's id. Otherwise the system SHALL refuse the operation.

#### Scenario: Soft-delete of an unreferenced custom magnitude

- **WHEN** an admin sends a DELETE request targeting a magnitude with `isSystem = false` and `referenceCount = 0`
- **THEN** the system SHALL set `status = DELETED` on the magnitude and respond with HTTP 200

#### Scenario: Soft-delete of a referenced custom magnitude

- **WHEN** an admin sends a DELETE request targeting a magnitude with `isSystem = false` and `referenceCount > 0` (any `MeasurementUnit` row references it, regardless of MU status)
- **THEN** the system SHALL respond with HTTP 422 and the `MagnitudeReferencedError` code

### Requirement: Re-creating a soft-deleted magnitude restores it

The create endpoint SHALL look up an existing magnitude by `code` including `DELETED` rows. When a `DELETED` row is found with `isSystem = false`, the endpoint SHALL restore it by setting `status = ACTIVE` and overwriting `name` from the new payload. When an `ACTIVE` row is found, the endpoint SHALL reject the request.

#### Scenario: Restore after soft-delete

- **WHEN** an admin creates a magnitude with `code` matching a `DELETED` non-system magnitude
- **THEN** the system SHALL set `status = ACTIVE` and overwrite `name`, and respond with HTTP 200, action discriminator `"fullyRestored"`

#### Scenario: Code collision with an active magnitude

- **WHEN** an admin creates a magnitude with `code` matching an `ACTIVE` magnitude (system or custom)
- **THEN** the system SHALL respond with HTTP 409 and the `MagnitudeCodeAlreadyExistsError` code

#### Scenario: Code collision with a deleted system magnitude (defensive)

- **WHEN** an admin creates a magnitude with `code` matching a `DELETED` magnitude with `isSystem = true` (an unreachable state under normal operation, since system magnitudes cannot be soft-deleted)
- **THEN** the system SHALL respond with HTTP 500 and a `DataIntegrityError` (logging the magnitude id and code so operators can locate the broken row)

### Requirement: Validation rules for create and update

The create endpoint and the update endpoint SHALL validate inputs via Zod schemas declared in `packages/types/src/magnitudes/admin/{createMagnitude,updateMagnitude}/schemas.ts` and passed to Fastify's `schema` option. The rules are:

- `code` (create only): non-empty string matching `^[a-z][a-z0-9_]*$`, length ≤ `MAGNITUDE_CODE_MAX_LENGTH`. The pattern enforces lowercase snake_case starting with a letter; uppercase legacy codes (`MASS`, `VOLUME`, …) are reserved for system magnitudes seeded by the script.
- `name` (create and update): non-empty string, trimmed, length ≤ `MAGNITUDE_NAME_MAX_LENGTH`.

The update body SHALL accept only `name`; sending `code`, `isSystem`, or `status` SHALL be rejected at validation time. The `MAGNITUDE_*_MAX_LENGTH` constants SHALL live in `packages/constants/`.

#### Scenario: Custom code with uppercase characters

- **WHEN** an admin creates a magnitude with `code = "VEHICLES"`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Custom code starting with a digit

- **WHEN** an admin creates a magnitude with `code = "3d_objects"`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Empty name

- **WHEN** an admin creates or updates a magnitude with `name = ""` (or a string that becomes empty after trimming)
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Name exceeds maximum length

- **WHEN** an admin creates or updates a magnitude with `name.length > MAGNITUDE_NAME_MAX_LENGTH`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Update body contains code or isSystem

- **WHEN** an admin sends a PATCH request with a body containing `code`, `isSystem`, or `status` (regardless of value)
- **THEN** the system SHALL respond with HTTP 400 (the update body schema rejects unknown fields)

### Requirement: List endpoint is publicly accessible and exposes reference count

The endpoint `GET /api/magnitudes` SHALL filter `where: { status: "ACTIVE" }`, default-order `[{ isSystem: "desc" }, { name: "asc" }]`, and return each row with its `referenceCount`. The endpoint SHALL be accessible to any authenticated user (no admin role required), because the measurement-unit list endpoint joins magnitudes and is consumed by every authenticated role via the `EmissionEditor` flow.

#### Scenario: Soft-deleted magnitudes excluded from list

- **WHEN** the `getAllMagnitudes` endpoint is called
- **THEN** the response SHALL NOT include rows with `status = DELETED`

#### Scenario: System magnitudes pinned to the top of the list

- **WHEN** the `getAllMagnitudes` endpoint returns mixed system and custom magnitudes
- **THEN** all `isSystem = true` rows SHALL appear before any `isSystem = false` row, and within each group rows SHALL be ordered by `name` ASC

### Requirement: Maintainer mutation endpoints require admin authentication

The endpoints `POST /api/magnitudes`, `PATCH /api/magnitudes/:id`, and `DELETE /api/magnitudes/:id` SHALL be accessible only to authenticated users with system role `ADMIN` or `SUPERADMIN`.

#### Scenario: Unauthenticated mutation request

- **WHEN** any maintainer mutation endpoint receives a request without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Authenticated user without admin role

- **WHEN** any maintainer mutation endpoint receives a request from a user with system role `USER`
- **THEN** the system SHALL respond with HTTP 403

### Requirement: Picker reads filter status, display reads do not

Every API read that lists `Magnitude` rows for selection (a picker context) SHALL filter `status: ACTIVE`. Every API read that resolves a stored `MeasurementUnit.magnitudeId` for display (e.g., joining `magnitude` on an existing MU to render its label) SHALL NOT filter by status.

#### Scenario: Picker context filters out deleted magnitudes

- **WHEN** any endpoint serves a list of magnitudes for the user to choose from when creating or editing a measurement unit
- **THEN** the query SHALL include `where: { status: ACTIVE }`

#### Scenario: Display context resolves deleted magnitudes

- **WHEN** any endpoint joins on an existing reference (e.g., `include: { magnitude: true }` on a `MeasurementUnit`) to render historical data
- **THEN** the query SHALL NOT filter the joined magnitude by status, and the join SHALL succeed even when the magnitude's `status = DELETED`

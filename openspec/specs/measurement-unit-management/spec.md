# measurement-unit-management Specification

## Purpose

Defines the backend management of `MeasurementUnit` and its automatically-paired canonical `RateMeasurementUnit` (`kg/<abbreviation>`): the soft-delete lifecycle via `MeasurementUnitStatus`, the derived-RMU cascade on create/rename/soft-delete/restore, field-locking once a unit is referenced or is a base unit, system protection of the `kg` unit and each magnitude's base unit, the admin-only mutation endpoints, and the picker-vs-display read rule that keeps historical data resolvable. Magnitudes are referenced by FK (`MeasurementUnit.magnitudeId`) into the `Magnitude` table.

## Requirements

### Requirement: Measurement units and rate measurement units support soft delete via a status enum

The system SHALL provide a Prisma enum `MeasurementUnitStatus { ACTIVE, DELETED }` and a `status` column with default `ACTIVE` on both `MeasurementUnit` and `RateMeasurementUnit`. No row is ever hard-deleted by the maintainer endpoints.

#### Scenario: Existing rows after schema change

- **WHEN** the migration that adds the `status` column with default `ACTIVE` is applied
- **THEN** every existing row SHALL have `status = ACTIVE` via the column default and no rows SHALL be removed

#### Scenario: Soft-deleting an unreferenced MU cascades to its canonical RMU

- **WHEN** an admin soft-deletes a `MeasurementUnit` with `referenceCount = 0` whose canonical `RateMeasurementUnit` (`denominatorMeasurementUnitId = MU.id AND numeratorMeasurementUnitId = (kg).id`) exists with `status = ACTIVE`
- **THEN** the system SHALL set `status = DELETED` on both the MU and the canonical RMU in the same database transaction and respond with HTTP 200

#### Scenario: Soft-delete blocked when the unit is referenced

- **WHEN** an admin soft-deletes a `MeasurementUnit` whose `referenceCount > 0`
- **THEN** the system SHALL respond with HTTP 422 and the `MeasurementUnitReferencedError` code, and the MU SHALL remain `ACTIVE`

#### Scenario: Soft-delete requires exactly one ACTIVE canonical RMU

- **WHEN** an admin soft-deletes an eligible `MeasurementUnit` but no `ACTIVE` canonical `RateMeasurementUnit` (`denominatorMeasurementUnitId = MU.id AND numeratorMeasurementUnitId = (kg).id`) can be updated
- **THEN** the system SHALL abort the transaction (the MU's status SHALL NOT change), SHALL throw a `DataIntegrityError` logged with the MU id and abbreviation, and SHALL respond with HTTP 500

### Requirement: Every measurement unit has exactly one canonical rate measurement unit

For every `MeasurementUnit X`, the system SHALL maintain exactly one `RateMeasurementUnit` such that `numeratorMeasurementUnitId = (kg).id`, `denominatorMeasurementUnitId = X.id`, `abbreviation = "kg/" + X.abbreviation`, and `name = "kg por " + X.abbreviation` (both derived strings are built from the parent MU's abbreviation). This RMU's lifecycle is bound to the parent MU's lifecycle (creation, rename, soft-delete, restore).

#### Scenario: Cascade create on MU creation

- **WHEN** an admin creates a measurement unit `X` with abbreviation `m3`
- **THEN** the system SHALL create a rate measurement unit with `abbreviation = "kg/m3"`, `name = "kg por m3"`, `numeratorMeasurementUnitId = (kg).id`, `denominatorMeasurementUnitId = X.id`, and `status = ACTIVE`, in the same transaction as the MU insert

#### Scenario: Cascade rename on MU update

- **WHEN** an admin changes an MU's `abbreviation` or `name`
- **THEN** the system SHALL rebuild the canonical RMU's `abbreviation` and `name` from the MU's abbreviation in the same transaction; the RMU's id, numerator, denominator, and status SHALL remain unchanged

#### Scenario: Seed-time canonical RMU coverage check

- **WHEN** the measurement-unit seed script runs for any dataset
- **THEN** after inserting the seeded rate measurement units, the script SHALL verify that the `kg` MU exists and that every `MeasurementUnit` has a `RateMeasurementUnit` with `numeratorMeasurementUnitId = (kg).id` and `abbreviation = "kg/" + MU.abbreviation`, and SHALL throw a descriptive error naming every MU lacking its canonical RMU (or naming `kg` if the `kg` MU itself is missing)

### Requirement: The `kg` measurement unit is system-protected

The system SHALL refuse any update or soft-delete operation targeting the `MeasurementUnit` whose `abbreviation = "kg"`. The cascade resolves `kg` at runtime via `findUnique({ where: { abbreviation: "kg" } })` and throws when not found.

#### Scenario: Update attempt on the `kg` row

- **WHEN** an admin sends a PATCH request targeting the MU with abbreviation `kg`
- **THEN** the system SHALL respond with HTTP 422 and the `KgMeasurementUnitImmutableError` code

#### Scenario: Soft-delete attempt on the `kg` row

- **WHEN** an admin sends a DELETE request targeting the MU with abbreviation `kg`
- **THEN** the system SHALL respond with HTTP 422 and the `KgMeasurementUnitImmutableError` code

#### Scenario: Cascade fails when `kg` row is missing

- **WHEN** any create, update, or delete endpoint runs while no MU with `abbreviation = "kg"` exists in the database
- **THEN** the system SHALL respond with HTTP 500 and the `KgMeasurementUnitNotFoundError` code

### Requirement: Each magnitude has exactly one immutable base unit

The system SHALL enforce that every `Magnitude` row (referenced by `MeasurementUnit.magnitudeId`) has at most one `ACTIVE` `MeasurementUnit` with `isBase = true`. The `isBase` field SHALL NOT be toggled on any existing MU. A base unit's physical fields (`magnitudeId`, `abbreviation`, `baseFactor`) SHALL NOT be changed and a base unit SHALL NOT be soft-deleted. A base unit MUST have `baseFactor = 1`, and a non-base unit SHALL NOT use `baseFactor = 1` while the magnitude already has an `ACTIVE` base unit.

#### Scenario: Creating a second base for the same magnitude

- **WHEN** an admin creates an MU with `isBase = true` and a `magnitudeId` for which an `ACTIVE` MU with `isBase = true` already exists
- **THEN** the system SHALL respond with HTTP 409 and the `MagnitudeAlreadyHasBaseUnitError` code

#### Scenario: Creating a base unit with a base factor other than 1

- **WHEN** an admin creates an MU with `isBase = true` and `baseFactor ≠ 1`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitMustHaveBaseFactorOneError` code

#### Scenario: Reserving baseFactor 1 for the base unit

- **WHEN** an admin creates or updates a non-base MU with `baseFactor = 1` for a magnitude that already has an `ACTIVE` base unit
- **THEN** the system SHALL respond with HTTP 422 and the `BaseFactorOneReservedForBaseUnitError` code

#### Scenario: Toggling `isBase` on an existing MU

- **WHEN** an admin sends an update with an `isBase` value differing from the target MU's current `isBase`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitToggleNotAllowedError` code

#### Scenario: Updating a base unit's physical fields

- **WHEN** an admin sends a PATCH request that changes `magnitudeId`, `abbreviation`, or `baseFactor` on an MU with `isBase = true`
- **THEN** the system SHALL respond with HTTP 422 and the `MeasurementUnitFieldsLockedError` code

#### Scenario: Soft-deleting a base unit

- **WHEN** an admin sends a DELETE request targeting an MU with `isBase = true`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitImmutableError` code

### Requirement: Mutating physical fields is locked once a unit is referenced

The fields `magnitudeId`, `abbreviation`, `baseFactor`, and `isBase` SHALL be immutable on any `MeasurementUnit` whose `referenceCount > 0` (and always on a base unit); only `name` remains editable. `referenceCount` is the sum of `ACTIVE` references across `CarbonInventoryLineInput.measurementUnitId`, `SubcategoryMeasurementUnit.measurementUnitId` (active subcategory), and — via the canonical RMU — `EmissionFactor.rateMeasurementUnitId`, `CarbonInventoryLineInput.manualFactorRateUnitId`, and `CarbonInventoryLineFactor.appliedFactorRateUnitId`.

#### Scenario: Locked-field update rejected

- **WHEN** an admin updates an MU with `referenceCount > 0` and the request body changes any of `magnitudeId`, `abbreviation`, or `baseFactor`
- **THEN** the system SHALL respond with HTTP 422 and the `MeasurementUnitFieldsLockedError` code

#### Scenario: Name edits succeed regardless of reference count

- **WHEN** an admin updates an MU's `name` only, regardless of `referenceCount`
- **THEN** the system SHALL apply the update, rebuild the canonical RMU's derived strings, and respond with HTTP 200

### Requirement: Re-creating a soft-deleted unit restores it

The create endpoint SHALL look up an existing row by abbreviation including `DELETED` rows. When a `DELETED` row is found, the endpoint SHALL restore it instead of inserting a new row, applying the new payload subject to the field-locking rule. When an `ACTIVE` row is found, the endpoint SHALL reject the request.

#### Scenario: Restore with no references — full overwrite

- **WHEN** an admin creates an MU with abbreviation `X` while a `DELETED` MU with abbreviation `X` exists with `referenceCount = 0`
- **THEN** the system SHALL overwrite all fields (`name`, `abbreviation`, `magnitudeId`, `baseFactor`, `isBase`), set `status = ACTIVE`, cascade-restore the RMU, and respond with HTTP 201 and action discriminator `"fullyRestored"`

#### Scenario: Restore with references — label-only overwrite

- **WHEN** an admin creates an MU with abbreviation `X` while a `DELETED` MU with abbreviation `X` exists with `referenceCount > 0`
- **THEN** the system SHALL overwrite only `name` and `abbreviation`, preserve the deleted row's `magnitudeId`, `baseFactor`, and `isBase`, set `status = ACTIVE`, cascade-restore the RMU, and respond with HTTP 201 and action discriminator `"restoredLabelsOnly"`

#### Scenario: Brand-new create

- **WHEN** an admin creates an MU whose abbreviation matches no existing row
- **THEN** the system SHALL insert the MU and its canonical RMU and respond with HTTP 201 and action discriminator `"created"`

#### Scenario: Active abbreviation collision on create

- **WHEN** an admin creates an MU with an abbreviation matching an existing `ACTIVE` MU
- **THEN** the system SHALL respond with HTTP 409 and the `MeasurementUnitAbbreviationAlreadyExistsError` code

#### Scenario: Rename collides with another row's abbreviation

- **WHEN** an admin updates an MU's `abbreviation` to a value another row already holds
- **THEN** the system SHALL respond with HTTP 409 and the `MeasurementUnitAbbreviationAlreadyExistsError` code

### Requirement: List endpoints expose status, reference count, and the joined magnitude

The endpoint `GET /api/measurement-units` SHALL filter `where: { status: ACTIVE }` and return each row with its `status`, `referenceCount`, `magnitudeId`, and a joined `magnitude: { id, code, name, isSystem, status }`. Rows SHALL be ordered by magnitude name ascending, then unit name ascending. The endpoint SHALL be publicly readable by any authenticated user.

#### Scenario: List includes joined magnitude

- **WHEN** the `getAllMeasurementUnits` endpoint is called
- **THEN** every returned row SHALL include both `magnitudeId` and a joined `magnitude` object with the magnitude's `code`, `name`, `isSystem`, and `status`

#### Scenario: Soft-deleted units excluded from list

- **WHEN** the `getAllMeasurementUnits` endpoint is called
- **THEN** the response SHALL NOT include rows with `status = DELETED`

#### Scenario: Reference count drives UI lock

- **WHEN** the endpoint returns a row whose MU is referenced by any active line input, applied line factor, emission factor (via its canonical RMU), manual line-input factor, or subcategory assignment
- **THEN** the row's `referenceCount` SHALL be greater than zero

#### Scenario: Display reads include soft-deleted magnitudes

- **WHEN** the endpoint returns a row whose joined magnitude has `status = DELETED`
- **THEN** the joined `magnitude` object SHALL still resolve, with `status = DELETED` exposed in the response

### Requirement: Rate measurement units list endpoint exposes reference counts

The endpoint `GET /api/measurement-units/rates` SHALL filter `where: { status: ACTIVE }` and accept no querystring parameters. Each response item SHALL include a `referenceCounts` object with exactly two categories — `emissionFactors` (`ACTIVE EmissionFactor.rateMeasurementUnitId`) and `lineFactorsAsApplied` (`CarbonInventoryLineFactor.appliedFactorRateUnitId` on active line inputs) — plus a derived `totalReferenceCount` equal to their sum. The counts SHALL be computed via two parallel `groupBy` queries, so the total number of database queries per request is fixed at three (one `findMany` + two `groupBy`). The endpoint SHALL be publicly readable by any authenticated user.

#### Scenario: Returns all ACTIVE rate units with counts

- **WHEN** the endpoint is called
- **THEN** the response SHALL include every `RateMeasurementUnit` with `status = ACTIVE`, each carrying `referenceCounts` and `totalReferenceCount`

#### Scenario: Reference counts are accurate per category

- **WHEN** the endpoint returns a row for rate unit `R` and the database contains `e` `ACTIVE` `EmissionFactor` rows with `rateMeasurementUnitId = R.id` and `a` `CarbonInventoryLineFactor` rows (on active line inputs) with `appliedFactorRateUnitId = R.id`
- **THEN** the response item SHALL have `referenceCounts.emissionFactors = e`, `referenceCounts.lineFactorsAsApplied = a`, and `totalReferenceCount = e + a`

#### Scenario: Endpoint remains publicly readable

- **WHEN** an authenticated user with any system role (including `USER`) calls the endpoint
- **THEN** the system SHALL respond with HTTP 200 — the endpoint is consumed by the carbon-inventory `EmissionEditor` flow for non-admin users

### Requirement: Picker reads filter status, display reads do not

Every API read that lists `MeasurementUnit` or `RateMeasurementUnit` rows for selection (a picker context) SHALL filter `status: ACTIVE`. Every API read that resolves a stored foreign key for display (e.g., joining `measurementUnit` on an existing line input or factor row to render its name) SHALL NOT filter by status.

#### Scenario: Picker context filters out deleted units

- **WHEN** any endpoint serves a list of measurement units or rate measurement units for the user to choose from when creating a new entity
- **THEN** the query SHALL include `where: { status: ACTIVE }`

#### Scenario: Display context resolves deleted units

- **WHEN** any endpoint joins on an existing reference (e.g., `include: { measurementUnit: true }` on a `CarbonInventoryLineInput`) to render historical data
- **THEN** the query SHALL NOT filter the joined unit by status, and the join SHALL succeed even when the unit's `status = DELETED`

### Requirement: Maintainer endpoints require admin authentication

The endpoints `POST /api/measurement-units`, `PATCH /api/measurement-units/:id`, and `DELETE /api/measurement-units/:id` SHALL be accessible only to authenticated users with system role `ADMIN` or `SUPERADMIN`. The list endpoints (`GET /api/measurement-units` and `GET /api/measurement-units/rates`) remain publicly readable by any authenticated user.

#### Scenario: Unauthenticated request

- **WHEN** any maintainer mutation endpoint receives a request without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Authenticated user without admin role

- **WHEN** any maintainer mutation endpoint receives a request from a user with system role `USER`
- **THEN** the system SHALL respond with HTTP 403

### Requirement: Validation rules for create and update

The create and update endpoints SHALL validate inputs via the same Zod mutation schema (the update body being a `.partial()` of the create body). The rules are:

- `name`: non-empty string, trimmed, length ≤ `MEASUREMENT_UNIT_NAME_MAX_LENGTH`.
- `abbreviation`: non-empty string, trimmed, length ≤ `MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH`, matching `ABBREVIATION_REGEX` (MUST NOT contain ASCII control characters or the `/` character).
- `baseFactor`: a number strictly greater than zero.
- `magnitudeId`: a valid `IdSchema` (string-coerced bigint). The service SHALL verify the referenced magnitude exists and has `status = ACTIVE`, otherwise it SHALL respond with HTTP 400 and the `MagnitudeInactiveError` code.
- `isBase`: a boolean.

The `MEASUREMENT_UNIT_*_MAX_LENGTH` constants live in `packages/constants/` and are re-used by both the Zod schema and the frontend form validation.

#### Scenario: Negative or zero baseFactor

- **WHEN** an admin creates an MU with `baseFactor <= 0`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Empty name or abbreviation

- **WHEN** an admin creates an MU with `name` or `abbreviation` that is empty after trimming
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Abbreviation contains invalid characters

- **WHEN** an admin creates or updates an MU whose `abbreviation` contains an ASCII control character or the `/` character
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Name or abbreviation exceeds maximum length

- **WHEN** an admin creates or updates an MU with `name.length > MEASUREMENT_UNIT_NAME_MAX_LENGTH` or `abbreviation.length > MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Missing or inactive magnitudeId

- **WHEN** an admin creates or updates an MU with a `magnitudeId` that matches no `Magnitude` row or matches a row whose `status ≠ ACTIVE`
- **THEN** the system SHALL respond with HTTP 400 and the `MagnitudeInactiveError` code

### Requirement: Maintainer endpoints define response schemas for all HTTP status codes

Each mutation route SHALL declare Zod response schemas for every relevant HTTP status. The create route declares 201, 400, 401, 403, 409, 500; the update route declares 200, 400, 401, 403, 404, 409, 422, 500; the delete route declares 200 (empty body), 401, 403, 404, 422, 500.

#### Scenario: Successful create response

- **WHEN** the create endpoint processes a valid request successfully
- **THEN** the system SHALL respond with HTTP 201 and a body containing the measurement unit and its `action` discriminator

#### Scenario: Successful delete response

- **WHEN** the delete endpoint soft-deletes a unit successfully
- **THEN** the system SHALL respond with HTTP 200 and an empty body

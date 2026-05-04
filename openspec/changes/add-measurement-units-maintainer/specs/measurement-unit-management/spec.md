## ADDED Requirements

### Requirement: Measurement units and rate measurement units support soft delete via a status enum

The system SHALL introduce a Prisma enum `MeasurementUnitStatus { ACTIVE, DELETED }` and add a `status` column with default `ACTIVE` to both `MeasurementUnit` and `RateMeasurementUnit`. No row is ever hard-deleted by the maintainer endpoints.

#### Scenario: Existing rows after schema change

- **WHEN** the base migration (which now includes the `status` column with default `ACTIVE`) is applied
- **THEN** every existing row SHALL have `status = ACTIVE` via the column default and no rows SHALL be removed

#### Scenario: Soft-deleting an MU cascades to its canonical RMU

- **WHEN** an admin soft-deletes a `MeasurementUnit` with abbreviation `X` whose canonical `RateMeasurementUnit` (`denominatorMeasurementUnitId = MU.id AND numeratorMeasurementUnitId = (kg).id`) exists with `status = ACTIVE`
- **THEN** the system SHALL set `status = DELETED` on both the MU and the canonical RMU in the same database transaction, and respond with HTTP 200

#### Scenario: Soft-deleting an MU whose canonical RMU is already DELETED is idempotent

- **WHEN** an admin soft-deletes a `MeasurementUnit` with abbreviation `X` whose canonical `RateMeasurementUnit` is found but already has `status = DELETED`
- **THEN** the system SHALL still flip the MU to `status = DELETED` in the same transaction, SHALL leave the RMU's `status = DELETED` unchanged (no error, no second update), and SHALL respond with HTTP 200 — the operation is idempotent with respect to the RMU

#### Scenario: Soft-deleting an MU whose canonical RMU is missing fails with data-integrity error

- **WHEN** an admin soft-deletes a `MeasurementUnit` with abbreviation `X` and no `RateMeasurementUnit` exists with `denominatorMeasurementUnitId = MU.id AND numeratorMeasurementUnitId = (kg).id`
- **THEN** the system SHALL abort the transaction (the MU's status SHALL NOT be changed), SHALL throw a `DataIntegrityError` (logged with the MU id and abbreviation so operators can locate the broken row), and SHALL respond with HTTP 500. This state should be impossible because of the seed-time coverage check and the create-cascade rule, but the endpoint MUST NOT silently succeed and leave an MU `DELETED` with no corresponding RMU update

### Requirement: Every measurement unit has exactly one canonical rate measurement unit

For every `MeasurementUnit X`, the system SHALL maintain exactly one `RateMeasurementUnit` such that `numeratorMeasurementUnitId = (kg).id`, `denominatorMeasurementUnitId = X.id`, `abbreviation = "kg/" + X.abbreviation`, and `name = "kg por " + X.name`. This RMU's lifecycle is bound to the parent MU's lifecycle (creation, rename, soft-delete, restore).

#### Scenario: Cascade create on MU creation

- **WHEN** an admin creates a measurement unit `X` with abbreviation `m3`
- **THEN** the system SHALL create a rate measurement unit with `abbreviation = "kg/m3"`, `name = "kg por <X.name>"`, `numeratorMeasurementUnitId = (kg).id`, `denominatorMeasurementUnitId = X.id`, and `status = ACTIVE`, in the same transaction as the MU insert

#### Scenario: Cascade rename on MU update

- **WHEN** an admin renames an MU's `abbreviation` from `m3` to `m^3` (or its `name`)
- **THEN** the system SHALL update the canonical RMU's `abbreviation` and `name` from the new MU values in the same transaction; the RMU's id, numerator, denominator, and status SHALL remain unchanged

#### Scenario: Seed-time canonical RMU coverage check

- **WHEN** the measurement-unit seed script runs for any dataset
- **THEN** after inserting the seeded rate measurement units, the script SHALL verify that every `MeasurementUnit` has at least one `RateMeasurementUnit` with `numeratorMeasurementUnitId = (kg).id AND denominatorMeasurementUnitId = MU.id`, and SHALL throw a descriptive error naming every MU lacking its canonical RMU (or naming `kg` if the `kg` MU itself is missing)

### Requirement: The `kg` measurement unit is system-protected

The system SHALL refuse any update or soft-delete operation targeting the `MeasurementUnit` whose `abbreviation = "kg"`. The cascade resolves `kg` at runtime via `findUnique({ where: { abbreviation: "kg" } })` and throws when not found.

#### Scenario: Update attempt on the `kg` row

- **WHEN** an admin sends a PATCH request targeting the MU with abbreviation `kg`
- **THEN** the system SHALL respond with HTTP 422 and the `KgMeasurementUnitImmutableError` code

#### Scenario: Soft-delete attempt on the `kg` row

- **WHEN** an admin sends a DELETE request targeting the MU with abbreviation `kg`
- **THEN** the system SHALL respond with HTTP 422 and the `KgMeasurementUnitImmutableError` code

#### Scenario: Cascade fails when `kg` row is missing

- **WHEN** any create or update endpoint runs while no MU with `abbreviation = "kg"` exists in the database
- **THEN** the system SHALL respond with HTTP 500 and the `KgMeasurementUnitNotFoundError` code

### Requirement: Each magnitude has exactly one immutable base unit

The system SHALL enforce that every `Magnitude` value has exactly one `MeasurementUnit` with `isBase = true`. The `isBase` field SHALL NOT be toggled on any existing MU. Base units SHALL NOT be updated or soft-deleted via the maintainer endpoints.

#### Scenario: Creating a second base for the same magnitude

- **WHEN** an admin creates an MU with `isBase = true` for a magnitude that already has a base
- **THEN** the system SHALL respond with HTTP 409 and the `MagnitudeAlreadyHasBaseUnitError` code

#### Scenario: Toggling `isBase` on an existing MU

- **WHEN** an admin sends an update with an `isBase` value differing from the target MU's current `isBase`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitToggleNotAllowedError` code

#### Scenario: Updating a base unit

- **WHEN** an admin sends a PATCH request targeting an MU with `isBase = true` (and abbreviation other than `kg`)
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitImmutableError` code

#### Scenario: Soft-deleting a base unit

- **WHEN** an admin sends a DELETE request targeting an MU with `isBase = true`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitImmutableError` code

### Requirement: Re-creating a soft-deleted unit restores it

The create endpoint SHALL look up an existing row by abbreviation including `DELETED` rows. When a `DELETED` row is found, the endpoint SHALL restore it instead of inserting a new row, applying the new payload subject to the field-locking rule. When an `ACTIVE` row is found, the endpoint SHALL reject the request.

#### Scenario: Restore with no references — full overwrite

- **WHEN** an admin creates an MU with abbreviation `X` while a `DELETED` MU with abbreviation `X` exists and has zero references in `CarbonInventoryLineInput`, `CarbonInventoryLineFactor`, `EmissionFactor` (via its RMU), `CarbonInventoryLineInput.manualFactorRateUnitId`, or `SubcategoryMeasurementUnit`
- **THEN** the system SHALL overwrite all fields (`name`, `abbreviation`, `magnitude`, `baseFactor`, `isBase`) of the deleted row with the new payload, set `status = ACTIVE`, cascade-restore the RMU, and respond with HTTP 200, action discriminator `"fullyRestored"`

#### Scenario: Restore with references — label-only overwrite

- **WHEN** an admin creates an MU with abbreviation `X` while a `DELETED` MU with abbreviation `X` exists and has at least one reference
- **THEN** the system SHALL overwrite only `name` and `abbreviation`, preserve the soft-deleted row's existing `magnitude`, `baseFactor`, and `isBase`, set `status = ACTIVE`, cascade-restore the RMU, and respond with HTTP 200, action discriminator `"restoredLabelsOnly"`

#### Scenario: Active abbreviation collision on create

- **WHEN** an admin creates an MU with an abbreviation matching an existing `ACTIVE` MU
- **THEN** the system SHALL respond with HTTP 409 and the `MeasurementUnitAbbreviationAlreadyExistsError` code

#### Scenario: Rename collides with a soft-deleted abbreviation

- **WHEN** an admin updates an MU's `abbreviation` to a value that any **other** row (ACTIVE or DELETED, with a different `id` than the target MU) already holds
- **THEN** the system SHALL respond with HTTP 409 and the `MeasurementUnitAbbreviationAlreadyExistsError` code

#### Scenario: No-op rename to the same abbreviation succeeds

- **WHEN** an admin sends an update whose `abbreviation` field equals the target MU's current `abbreviation` (the rename is a no-op against itself)
- **THEN** the system SHALL NOT respond with `MeasurementUnitAbbreviationAlreadyExistsError`. The update SHALL succeed with HTTP 200; because nothing changed on the abbreviation, the canonical RMU's `abbreviation`/`name` SHALL NOT be re-derived (the cascade triggers only when `name` or `abbreviation` actually changes per the update service)

### Requirement: Mutating physical fields is locked once a unit is referenced

The fields `magnitude`, `baseFactor`, and `isBase` SHALL be immutable on any `MeasurementUnit` whose `referenceCount > 0`, where `referenceCount` is the sum of references across `CarbonInventoryLineInput.measurementUnitId`, `SubcategoryMeasurementUnit.measurementUnitId`, `EmissionFactor.rateMeasurementUnitId` (via the canonical RMU), `CarbonInventoryLineInput.manualFactorRateUnitId` (via the canonical RMU), and `CarbonInventoryLineFactor.appliedFactorRateUnitId` (via the canonical RMU). The fields `name` and `abbreviation` remain editable regardless of `referenceCount`.

#### Scenario: Locked-field update rejected

- **WHEN** an admin updates an MU with `referenceCount > 0` and the request body contains any of `magnitude`, `baseFactor`
- **THEN** the system SHALL respond with HTTP 422 and the `MeasurementUnitFieldsLockedError` code

#### Scenario: Label edits succeed regardless of reference count

- **WHEN** an admin updates an MU's `name` or `abbreviation` only, regardless of `referenceCount`
- **THEN** the system SHALL apply the update, cascade the rebuilt fields to the canonical RMU, and respond with HTTP 200

### Requirement: List endpoints expose status and reference count

The endpoint `GET /api/measurement-units` SHALL filter `where: { status: ACTIVE }` and return each row with its `status` and `referenceCount`. The endpoint `GET /api/rate-measurement-units` SHALL filter `where: { status: ACTIVE }`. Default ordering for the MU list SHALL be `(magnitude ASC, name ASC)`.

#### Scenario: Soft-deleted units excluded from list

- **WHEN** the `getAllMeasurementUnits` endpoint is called
- **THEN** the response SHALL NOT include rows with `status = DELETED`

#### Scenario: Reference count drives UI lock

- **WHEN** the `getAllMeasurementUnits` endpoint returns a row whose MU is referenced by any line input, line factor, emission factor (via canonical RMU), or subcategory measurement unit
- **THEN** the row's `referenceCount` SHALL be greater than zero

### Requirement: Picker reads filter status, display reads do not

Every API read that lists `MeasurementUnit` or `RateMeasurementUnit` rows for _selection_ (a picker context) SHALL filter `status: ACTIVE`. Every API read that resolves a stored foreign key for _display_ (e.g., joining `measurementUnit` on an existing line input or factor row to render its name) SHALL NOT filter by status.

#### Scenario: Picker context filters out deleted units

- **WHEN** any endpoint serves a list of measurement units or rate measurement units for the user to choose from when creating a new entity
- **THEN** the query SHALL include `where: { status: ACTIVE }`

#### Scenario: Display context resolves deleted units

- **WHEN** any endpoint joins on an existing reference (e.g., `include: { measurementUnit: true }` on a `CarbonInventoryLineInput`) to render historical data
- **THEN** the query SHALL NOT filter the joined unit by status, and the join SHALL succeed even when the unit's `status = DELETED`

### Requirement: Maintainer endpoints require admin authentication

The endpoints `POST /api/measurement-units`, `PATCH /api/measurement-units/:id`, and `DELETE /api/measurement-units/:id` SHALL be accessible only to authenticated users with system role `ADMIN` or `SUPERADMIN`.

#### Scenario: Unauthenticated request

- **WHEN** any maintainer endpoint receives a request without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Authenticated user without admin role

- **WHEN** any maintainer endpoint receives a request from a user with system role `USER`
- **THEN** the system SHALL respond with HTTP 403

### Requirement: Validation rules for create and update

The create endpoint and the update endpoint SHALL validate inputs via the same Zod schemas declared in `packages/types/src/measurementUnits/admin/{createMeasurementUnit,updateMeasurementUnit}/schemas.ts` and passed to Fastify's `schema` option (so request validation, response serialization, and Swagger docs all derive from a single source). The update endpoint's body schema is a `.partial()` of the create body schema; every per-field rule below applies on update whenever the field is present.

The rules are:

- `name`: non-empty string, trimmed of leading/trailing whitespace, length ≤ `MEASUREMENT_UNIT_NAME_MAX_LENGTH`.
- `abbreviation`: non-empty string, trimmed, length ≤ `MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH`, MUST NOT contain ASCII control characters (which includes tab and newline) or the `/` character (because `/` collides with the canonical RMU derivation `kg/<abbreviation>`). Regular spaces are allowed (e.g. `"t CO₂e"`).
- `baseFactor`: a finite number strictly greater than zero (`Infinity`, `-Infinity`, `NaN`, and `0` are rejected).
- `magnitude`: a member of the `Magnitude` enum.
- `isBase`: a boolean.

The two `MEASUREMENT_UNIT_*_MAX_LENGTH` constants SHALL live in `packages/constants/` (per the country-agnosticism rule for shared limits) and SHALL be re-used by both the Zod schema in `packages/types` and any frontend form-side validation.

#### Scenario: Negative or zero baseFactor

- **WHEN** an admin creates an MU with `baseFactor <= 0`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Non-finite baseFactor

- **WHEN** an admin creates an MU with `baseFactor` equal to `Infinity`, `-Infinity`, or `NaN`
- **THEN** the system SHALL respond with HTTP 400 (Zod's `.finite()` rejects it)

#### Scenario: Empty abbreviation

- **WHEN** an admin creates an MU with `abbreviation = ""` (or a string that becomes empty after trimming)
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Empty name

- **WHEN** an admin creates an MU with `name = ""` (or a string that becomes empty after trimming)
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Abbreviation contains invalid characters

- **WHEN** an admin creates or updates an MU with an `abbreviation` that contains any ASCII control character (e.g., tab `"kg\t"`, newline `"kg\n"`) or the `/` character (e.g., `"m/s"`)
- **THEN** the system SHALL respond with HTTP 400. The `/` rule exists specifically to prevent corrupting the canonical RMU abbreviation `kg/<MU.abbreviation>`. Regular spaces (e.g., `"t CO₂e"`) are permitted.

#### Scenario: Name or abbreviation exceeds maximum length

- **WHEN** an admin creates or updates an MU with `name.length > MEASUREMENT_UNIT_NAME_MAX_LENGTH` or `abbreviation.length > MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Invalid magnitude

- **WHEN** an admin creates an MU with a `magnitude` value not in the `Magnitude` enum
- **THEN** the system SHALL respond with HTTP 400

### Requirement: Maintainer endpoints define response schemas for all HTTP status codes

Each new route file (`createMeasurementUnit/route.ts`, `updateMeasurementUnit/route.ts`, `deleteMeasurementUnit/route.ts`) SHALL define Zod response schemas for every relevant HTTP status: 200, 400, 401, 403, 404 (where applicable), 409 (where applicable), 422 (where applicable), and 500.

#### Scenario: Successful response

- **WHEN** any maintainer endpoint processes a valid request successfully
- **THEN** the system SHALL respond with HTTP 200 and the documented response body shape

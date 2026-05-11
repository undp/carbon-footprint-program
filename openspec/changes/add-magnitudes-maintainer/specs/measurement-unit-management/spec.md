## MODIFIED Requirements

### Requirement: Each magnitude has exactly one immutable base unit

The system SHALL enforce that every `Magnitude` row (referenced by `MeasurementUnit.magnitudeId`) has exactly one `MeasurementUnit` with `isBase = true`. The `isBase` field SHALL NOT be toggled on any existing MU. Base units SHALL NOT be updated or soft-deleted via the maintainer endpoints.

The "one base per magnitude" check SHALL key on `magnitudeId` (the FK introduced by `magnitude-management`) rather than on the prior enum string. Otherwise the rule is unchanged: a single ACTIVE base unit per magnitude row.

#### Scenario: Creating a second base for the same magnitude

- **WHEN** an admin creates an MU with `isBase = true` and a `magnitudeId` for which an ACTIVE MU with `isBase = true` already exists
- **THEN** the system SHALL respond with HTTP 409 and the `MagnitudeAlreadyHasBaseUnitError` code

#### Scenario: Toggling `isBase` on an existing MU

- **WHEN** an admin sends an update with an `isBase` value differing from the target MU's current `isBase`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitToggleNotAllowedError` code

#### Scenario: Updating a base unit

- **WHEN** an admin sends a PATCH request targeting an MU with `isBase = true`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitImmutableError` code

#### Scenario: Soft-deleting a base unit

- **WHEN** an admin sends a DELETE request targeting an MU with `isBase = true`
- **THEN** the system SHALL respond with HTTP 422 and the `BaseUnitImmutableError` code

### Requirement: Mutating physical fields is locked once a unit is referenced

The fields `magnitudeId`, `baseFactor`, and `isBase` SHALL be immutable on any `MeasurementUnit` whose `referenceCount > 0`. The fields `name` and `abbreviation` remain editable regardless of `referenceCount`.

This requirement replaces the prior locked-fields list (which named `magnitude` as a string enum). The semantics — "physical-quantity definitions are locked once data is recorded" — are unchanged; only the field type changes from enum to FK.

#### Scenario: Locked-field update rejected

- **WHEN** an admin updates an MU with `referenceCount > 0` and the request body contains any of `magnitudeId`, `baseFactor`
- **THEN** the system SHALL respond with HTTP 422 and the `MeasurementUnitFieldsLockedError` code

#### Scenario: Label edits succeed regardless of reference count

- **WHEN** an admin updates an MU's `name` or `abbreviation` only, regardless of `referenceCount`
- **THEN** the system SHALL apply the update, cascade the rebuilt fields to the canonical RMU, and respond with HTTP 200

### Requirement: List endpoints expose status, reference count, and the joined magnitude

The endpoint `GET /api/measurement-units` SHALL filter `where: { status: ACTIVE }` and return each row with its `status`, `referenceCount`, `magnitudeId`, and a joined `magnitude: { id, code, name, isSystem, status }`. Default ordering for the MU list SHALL be `[{ magnitude: { name: "asc" } }, { name: "asc" }]`.

This requirement modifies the prior list-endpoint requirement to add the joined magnitude shape (replacing the prior enum string field) and to update the ordering clause to traverse the FK.

#### Scenario: List includes joined magnitude

- **WHEN** the `getAllMeasurementUnits` endpoint is called
- **THEN** every returned row SHALL include both `magnitudeId` (the FK) and a joined `magnitude` object with the magnitude's `code`, `name`, `isSystem`, and `status`

#### Scenario: Display reads include soft-deleted magnitudes

- **WHEN** the `getAllMeasurementUnits` endpoint returns a row whose magnitude has `status = DELETED` (an unusual but possible state for custom magnitudes after a soft-delete)
- **THEN** the joined `magnitude` object SHALL still resolve, with `status = DELETED` exposed in the response

### Requirement: Validation rules for create and update

The create endpoint and the update endpoint SHALL validate inputs via the same Zod schemas declared in `packages/types/src/measurementUnits/admin/{createMeasurementUnit,updateMeasurementUnit}/schemas.ts`. The rules are:

- `name`: non-empty string, trimmed, length ≤ `MEASUREMENT_UNIT_NAME_MAX_LENGTH`.
- `abbreviation`: non-empty string, trimmed, length ≤ `MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH`, MUST NOT contain ASCII control characters or the `/` character.
- `baseFactor`: a finite number strictly greater than zero.
- `magnitudeId`: a valid `IdSchema` (string-coerced bigint) referencing an existing magnitude row. The service SHALL verify the referenced magnitude exists and has `status = ACTIVE`; otherwise it SHALL respond with HTTP 400.
- `isBase`: a boolean.

This requirement modifies the prior validation rule by replacing the `magnitude` enum field with `magnitudeId`. All other field rules are unchanged.

#### Scenario: Invalid magnitudeId

- **WHEN** an admin creates an MU with a `magnitudeId` that does not match any row in the `Magnitude` table, or that matches a row with `status = DELETED`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Existing field-validation rules unchanged

- **WHEN** an admin creates an MU with an empty `name`, an `abbreviation` containing `/`, a `baseFactor` of zero, etc.
- **THEN** the system SHALL respond with HTTP 400 (these rules are unchanged from the prior `add-measurement-units-maintainer` change)

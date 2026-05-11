## MODIFIED Requirements

### Requirement: Magnitude column and form picker source from the API

The magnitude column in `MeasurementUnitsScreen` and the magnitude picker in its create/edit form SHALL source their data from the `useMagnitudes()` query hook (which calls `GET /api/magnitudes`), not from a local `MAGNITUDE_LABELS` constant.

The local `MAGNITUDE_LABELS` constant in `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/constants.ts` and the corresponding entry in `apps/web/src/config/vocab.ts` SHALL be removed. The form schema's `z.enum(Magnitude, ...)` validator SHALL be replaced with `magnitudeId: IdSchema` matching the new request body shape.

#### Scenario: Magnitude column renders the API name

- **WHEN** the screen mounts and rows are returned from `getAllMeasurementUnits`
- **THEN** the magnitude column SHALL render `row.magnitude.name` (the joined object) for each row

#### Scenario: Magnitude form picker is populated from the API

- **WHEN** the admin opens the create/edit form for a measurement unit
- **THEN** the magnitude picker SHALL list options from `useMagnitudes()` (filtered to `status: ACTIVE`), with the option label being the magnitude's `name` and the option value being its `id` as a string

#### Scenario: New-row default is the first available magnitude

- **WHEN** the admin clicks "Add row" and the magnitudes list is non-empty
- **THEN** the new row's `magnitudeId` SHALL default to the id of the first ACTIVE magnitude returned by `useMagnitudes()`

#### Scenario: New-row default with empty magnitudes list

- **WHEN** the admin clicks "Add row" and `useMagnitudes()` returns an empty list (e.g., on a fresh deploy before the seed has run)
- **THEN** the screen SHALL block the new-row creation and show a snackbar in Spanish explaining that magnitudes must exist before measurement units can be created

#### Scenario: Magnitude picker is disabled when the row is reference-locked

- **WHEN** the admin enters edit mode on a row whose `referenceCount > 0`
- **THEN** the magnitude picker SHALL be disabled (consistent with the existing field-locking rule on `magnitudeId`, `baseFactor`, and `isBase`)

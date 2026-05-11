## Why

Rate measurement units (`RateMeasurementUnit`) are derived data: every `MeasurementUnit` is paired with a canonical `RateMeasurementUnit` of the form `kg/<MU.abbreviation>` (per `add-measurement-units-maintainer`), and additional rate units are seeded for specific methodologies. Today admins have no way to inspect this list — there is no screen for it. When an admin renames or soft-deletes an MU, they cannot easily verify that the cascade produced the expected RMU rows; when a methodology references a rate unit they do not recognize, they cannot look it up.

Adding a read-only maintainer screen for rate measurement units closes that observability gap, without giving admins a footgun: the existing cascade rules in `measurement-unit-management` guarantee that RMU rows are derived from MUs and that direct RMU edits would break the invariant.

This is the second of three sequential proposals that reshape the "Unidades" maintainer area.

## What Changes

- Extend `GET /api/measurement-units/rates`:
  - Per item, include `referenceCounts: { emissionFactors: number, lineFactorsAsApplied: number }`. The response item also exposes a derived `totalReferenceCount` (the sum) for convenient sorting on the client.
  - Filter `status: ACTIVE` (consistent with the picker-vs-display rule from `measurement-unit-management`).
  - No new querystring parameters — the endpoint contract gains response fields only.
- Add a maintainer screen at `/admin/rate-measurement-units` (a top-level "Tasas" sidebar entry) that renders a paginated list of rate units with columns: `abbreviation`, `numerator` (e.g., "kg"), `numerator.magnitude.name`, `denominator` (e.g., "km"), `denominator.magnitude.name`, `totalReferenceCount`. The screen renders the full ACTIVE list as returned by the API; sorting is done by the DataGrid client-side.
- The screen has NO mutation actions. There is no create button, no edit, no delete. Cells are non-editable. There are no filter controls.
- Authorization: SUPERADMIN-only on the client (consistent with other read-only admin views like `/admin/methodologies`); on the server the list endpoint remains publicly readable to authenticated users (it is consumed by emission-factor pickers in the carbon-inventory flow).

## Capabilities

### New Capabilities

- `rate-measurement-units-screen`: Frontend admin screen at `/admin/rate-measurement-units`, including the sidebar entry "Tasas".

### Modified Capabilities

- `measurement-unit-management`: The `GET /api/measurement-units/rates` endpoint gains the `referenceCounts` (and derived `totalReferenceCount`) fields. The querystring contract is unchanged.

## Impact

- **Database**: No schema changes.
- **API**: `apps/api/src/features/measurementUnits/getAllRateMeasurementUnits/` is updated:
  - `service.ts` runs the main `findMany` plus three `groupBy({ by: ["rateMeasurementUnitId"|"manualFactorRateUnitId"|"appliedFactorRateUnitId"], _count: { _all: true } })` queries in parallel to compute per-row counts. The number of queries is fixed at four (one main + three counts) regardless of result size.
  - The mapper projects the joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` (each carrying their own joined `magnitude` object after `add-magnitudes-maintainer`) plus the new `referenceCounts` and `totalReferenceCount` fields.
- **Types**: `packages/types/src/measurementUnits/getAllRateMeasurementUnits/schemas.ts` updates: response items gain the `referenceCounts` object, the derived `totalReferenceCount`, and the per-row joined magnitude objects. No querystring schema is added.
- **Frontend**: New `RateMeasurementUnitsScreen` at `apps/web/src/screens/Maintainer/screens/RateMeasurementUnitsScreen/`. Uses `StylizedDataGrid` in read-only mode (no edit toggle, no row actions, no filter controls). Reuses the existing `useRateMeasurementUnits()` hook unchanged. New route at `apps/web/src/routes/admin/rate-measurement-units.tsx`. `MaintainerLayout.tsx` gets a new top-level "Tasas" entry; the future `regroup-units-sidebar` change collapses it under "Unidades".
- **Cross-cutting**: None. The screen is purely additive; mutation contracts and the endpoint's querystring contract remain unchanged.

## Why

Rate measurement units (`RateMeasurementUnit`) are derived data: every `MeasurementUnit` is paired with a canonical `RateMeasurementUnit` of the form `kg/<MU.abbreviation>` (per `add-measurement-units-maintainer`), and additional rate units are seeded for specific methodologies. Today admins have no way to inspect this list — there is no screen for it. When an admin renames or soft-deletes an MU, they cannot easily verify that the cascade produced the expected RMU rows; when a methodology references a rate unit they do not recognize, they cannot look it up.

Adding a read-only maintainer screen for rate measurement units closes that observability gap, without giving admins a footgun: the existing cascade rules in `measurement-unit-management` guarantee that RMU rows are derived from MUs and that direct RMU edits would break the invariant.

This is the second of three sequential proposals that reshape the "Unidades" maintainer area. It depends on `add-magnitudes-maintainer` having shipped (the screen filters by numerator/denominator magnitude, which requires the magnitudes to be a queryable model with stable ids).

## What Changes

- Extend `GET /api/measurement-units/rates`:
  - Add `numeratorMagnitudeId`, `denominatorMagnitudeId`, and `search` querystring parameters. `search` is a case-insensitive partial match on the rate unit's `abbreviation`.
  - Per item, include `referenceCounts: { emissionFactors: number, lineInputsAsManualFactor: number, lineFactorsAsApplied: number }`. The response item also exposes a derived `totalReferenceCount` (the sum) for convenient sorting on the client.
  - Filter `status: ACTIVE` (consistent with the picker-vs-display rule from `measurement-unit-management`).
- Add a maintainer screen at `/admin/rate-measurement-units` (a top-level "Tasas" sidebar entry) that renders a paginated list of rate units with columns: `abbreviation`, `numerator` (e.g., "kg"), `numerator.magnitude.name`, `denominator` (e.g., "km"), `denominator.magnitude.name`, `totalReferenceCount`. URL-driven filter state per project convention: `?numeratorMagnitudeId=…&denominatorMagnitudeId=…&search=…`.
- The screen has NO mutation actions. There is no create button, no edit, no delete. Cells are non-editable.
- Authorization: SUPERADMIN-only on the client (consistent with other read-only admin views like `/admin/methodologies`); on the server the list endpoint remains publicly readable to authenticated users (it is consumed by emission-factor pickers in the carbon-inventory flow).

## Capabilities

### New Capabilities

- `rate-measurement-units-screen`: Frontend admin screen at `/admin/rate-measurement-units`, including the sidebar entry "Tasas" and the URL-driven filter state.

### Modified Capabilities

- `measurement-unit-management`: The `GET /api/measurement-units/rates` endpoint gains the `numeratorMagnitudeId`, `denominatorMagnitudeId`, `search`, and `referenceCounts` features.

## Impact

- **Database**: No schema changes.
- **API**: `apps/api/src/features/measurementUnits/getAllRateMeasurementUnits/` is updated:
  - `route.ts` declares the three new querystring fields on the schema.
  - `service.ts` builds a `Prisma.RateMeasurementUnitWhereInput` from the querystring (status filter unchanged), and computes the per-row counts in a single pass. Three counts (`emissionFactors`, `lineInputs.manualFactorRateUnitId`, `lineFactors.appliedFactorRateUnitId`) are computed via three parallel `groupBy({ by: ["rateMeasurementUnitId"], _count: { _all: true } })` queries — fixed at three queries regardless of row count. Results merged into a `Map<rmuId, { emissionFactors, lineInputsAsManualFactor, lineFactorsAsApplied }>` and attached per row before mapping.
  - The mapper updates to project the joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` (each now carrying their own joined `magnitude` object after `add-magnitudes-maintainer`).
- **Types**: `packages/types/src/measurementUnits/getAllRateMeasurementUnits/schemas.ts` updates: querystring schema with the three optional filters, response items gain the `referenceCounts` object and the per-row joined magnitude objects.
- **Frontend**: New `RateMeasurementUnitsScreen` at `apps/web/src/screens/Maintainer/screens/RateMeasurementUnitsScreen/`. Uses `StylizedDataGrid` in read-only mode (no edit toggle, no row actions). New query hook `useRateMeasurementUnits(filters)` (extending or replacing the existing `useRateMeasurementUnits()` to accept optional filters). New route at `apps/web/src/routes/admin/rate-measurement-units.tsx`. `MaintainerLayout.tsx` gets a new top-level "Tasas" entry; the future `regroup-units-sidebar` change collapses it under "Unidades".
- **Cross-cutting**: None. The screen is purely additive; mutation contracts remain unchanged.
- **Dependencies**: Requires `add-magnitudes-maintainer` to be merged first (the filter UI uses magnitude ids).

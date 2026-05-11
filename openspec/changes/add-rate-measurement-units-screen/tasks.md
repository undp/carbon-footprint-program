## 1. Types — Shared Schemas (`packages/types`)

- [x] 1.1 Update `packages/types/src/measurementUnits/getAllRateMeasurementUnits/schemas.ts`:
  - Update each response item to include `referenceCounts: { emissionFactors: z.number().int().nonnegative(), lineFactorsAsApplied: z.number().int().nonnegative() }` and `totalReferenceCount: z.number().int().nonnegative()`.
  - Each response item already exposes joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` — confirm they include the joined `magnitude: MagnitudeBaseSchema` per the response shape established by `add-magnitudes-maintainer`.
  - No querystring schema is added.

## 2. API — List Endpoint Extensions

- [x] 2.1 Update `apps/api/src/features/measurementUnits/getAllRateMeasurementUnits/route.ts`:
  - Update the response schema to include the new fields. No querystring is declared.
- [x] 2.2 `handler.ts` continues to use `createGetAllHandler` with no querystring type.
- [x] 2.3 Update `service.ts`:
  - Run the main `findMany` and three `groupBy` count queries in parallel via `Promise.all`:
    - `tx.emissionFactor.groupBy({ by: ["rateMeasurementUnitId"], _count: { _all: true } })`
    - `tx.carbonInventoryLineInput.groupBy({ by: ["manualFactorRateUnitId"], where: { manualFactorRateUnitId: { not: null } }, _count: { _all: true } })`
    - `tx.carbonInventoryLineFactor.groupBy({ by: ["appliedFactorRateUnitId"], _count: { _all: true } })`
  - Merge the three count maps into a single `Map<rmuId, { emissionFactors, lineFactorsAsApplied }>`. Default missing entries to zeros.
  - For each row in the `findMany` result, attach `referenceCounts` and the derived `totalReferenceCount`. Map the joined numerator/denominator MUs (with their joined magnitudes) onto the response shape.
  - The number of queries is fixed at four (one main + three counts) regardless of row count.
- [x] 2.4 Projection is inlined in `service.ts` (no dedicated rate-unit mapper exists); it now includes `referenceCounts` and `totalReferenceCount`.

## 3. Frontend — Query Hook

- [x] 3.1 Existing `useRateMeasurementUnits` hook in `apps/web/src/api/query/measurementUnits/useRateMeasurementUnits.ts` continues to fetch the full list; no filter argument is added.
- [x] 3.2 Existing consumers of `useRateMeasurementUnits` (the EmissionEditor flow) do not regress: the new `referenceCounts`/`totalReferenceCount` fields appear on each item but are unused by them.

## 4. Frontend — Screen

- [x] 4.1 Create `apps/web/src/screens/Maintainer/screens/RateMeasurementUnitsScreen/RateMeasurementUnitsScreen.tsx`. Use `StylizedDataGrid` with the following columns:
  - `abbreviation` (e.g., `kg/km`).
  - `numeratorMeasurementUnit.abbreviation` (e.g., `kg`).
  - `numeratorMeasurementUnit.magnitude.name` (e.g., `Masa`).
  - `denominatorMeasurementUnit.abbreviation` (e.g., `km`).
  - `denominatorMeasurementUnit.magnitude.name` (e.g., `Distancia`).
  - `totalReferenceCount` (sortable; default sort DESC).
  - A tooltip on the count column that breaks down the three categories (`emissionFactors`, `lineFactorsAsApplied`).
- [x] 4.2 Disable row selection (`disableRowSelectionOnClick` is provided by `StylizedDataGrid`), do NOT render an actions column, do NOT implement `processRowUpdate`. The grid is purely read-only.
- [x] 4.3 No filter controls. The screen renders the full ACTIVE list returned by the API.
- [x] 4.4 Default sort model: `[{ field: "totalReferenceCount", sort: "desc" }]`. Native column header sorting is enabled for all sortable columns.
- [x] 4.5 Use Spanish for column headers, tooltips, and any empty-state messages.

## 5. Frontend — Route Wiring & Sidebar

- [x] 5.1 Create `apps/web/src/routes/admin/rate-measurement-units.tsx`. `beforeLoad` guard: `requireRole([SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. Component: `RateMeasurementUnitsScreen`. No `validateSearch` schema is needed.
- [x] 5.2 Add `Routes.ADMIN_RATE_MEASUREMENT_UNITS = "/admin/rate-measurement-units"` to wherever existing admin route constants live.
- [x] 5.3 In `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`, add a new top-level sidebar entry "Tasas" linked to the new route. Place it adjacent to "Magnitudes" and "Unidades". Do NOT introduce a "Unidades" collapsible group — that is `regroup-units-sidebar`'s scope.

## 6. Testing — API

- [x] 6.1 Integration test for `getAllRateMeasurementUnits`: returns all ACTIVE rate units, each with `referenceCounts` and `totalReferenceCount`. Verify `totalReferenceCount = sum of breakdowns`.
- [x] 6.2 Integration test for the count fields: insert known counts of `EmissionFactor`, `CarbonInventoryLineInput.manualFactorRateUnitId`, and `CarbonInventoryLineFactor.appliedFactorRateUnitId` against a specific RMU; assert each count is reported correctly and the total matches.
- [x] 6.3 Integration test for response shape: the joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` each carry their own `magnitude: { id, code, name, isSystem, status }` per the contract introduced by `add-magnitudes-maintainer`.

## 7. Testing — Frontend

- [x] 7.1 Smoke-test the screen in the dev server: load the screen and confirm it lists all ACTIVE rate units with their reference-count totals; verify the tooltip on the `Referencias` column breaks down the three categories; sort by `Referencias` DESC and ASC and by other column headers. **(Manual — requires running the dev server in a browser; not automatable by Claude. Pending user verification.)**
- [x] 7.2 Verify the existing carbon-inventory `EmissionEditor` rate-unit picker still works (the underlying endpoint contract has been extended, not changed). Verified at the API contract level: full `carbonInventories` integration test suite passes (284/284).

## 8. Documentation

- [x] 8.1 Update `docs/data-model/` (or the appropriate section) to mention the new admin screen as the operator-facing inspector for derived RMU data.

## 9. Pre-merge Checks

- [x] 9.1 `pnpm format`
- [x] 9.2 `pnpm lint`
- [x] 9.3 `pnpm type-check`
- [x] 9.4 `pnpm test --filter=api -- /getAllRateMeasurementUnits --coverage=false` (13/13 passed.)
- [x] 9.5 `pnpm test --filter=api -- /carbonInventories --coverage=false` (sanity check that the EmissionEditor consumer is unaffected) (284/284 passed.)
- [x] 9.6 Manual smoke test: navigate to `/admin/rate-measurement-units` as a SUPERADMIN; verify the screen renders the full ACTIVE list with reference-count totals and the tooltip breakdown. **(Manual — requires running the dev server in a browser; not automatable by Claude. Pending user verification.)**

## 1. Types — Shared Schemas (`packages/types`)

- [ ] 1.1 Update `packages/types/src/measurementUnits/getAllRateMeasurementUnits/schemas.ts`:
  - Add a querystring schema:
    ```ts
    z.object({
      numeratorMagnitudeId: IdSchema.optional(),
      denominatorMagnitudeId: IdSchema.optional(),
      search: z.string().trim().min(1).max(100).optional(),
    });
    ```
  - Update each response item to include `referenceCounts: { emissionFactors: z.number().int().nonnegative(), lineInputsAsManualFactor: z.number().int().nonnegative(), lineFactorsAsApplied: z.number().int().nonnegative() }` and `totalReferenceCount: z.number().int().nonnegative()`.
  - Each response item already exposes joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` — confirm they include the joined `magnitude: MagnitudeBaseSchema` per the response shape established by `add-magnitudes-maintainer`.
- [ ] 1.2 Re-export the new querystring type from `packages/types/src/measurementUnits/index.ts`.

## 2. API — List Endpoint Extensions

- [ ] 2.1 Update `apps/api/src/features/measurementUnits/getAllRateMeasurementUnits/route.ts`:
  - Add the querystring schema from task 1.1 to Fastify's `schema.querystring`. Update the response schema to include the new fields.
- [ ] 2.2 Update `handler.ts` to forward the querystring to the service.
- [ ] 2.3 Update `service.ts`:
  - Build a `Prisma.RateMeasurementUnitWhereInput`:
    - `status: "ACTIVE"` (already present).
    - If `numeratorMagnitudeId`: `numeratorMeasurementUnit: { magnitudeId: <coerced bigint> }`.
    - If `denominatorMagnitudeId`: `denominatorMeasurementUnit: { magnitudeId: <coerced bigint> }`.
    - If `search`: `abbreviation: { contains: search, mode: "insensitive" }`.
  - Run the main `findMany` and three `groupBy` count queries in parallel via `Promise.all`:
    - `tx.emissionFactor.groupBy({ by: ["rateMeasurementUnitId"], _count: { _all: true } })`
    - `tx.carbonInventoryLineInput.groupBy({ by: ["manualFactorRateUnitId"], where: { manualFactorRateUnitId: { not: null } }, _count: { _all: true } })`
    - `tx.carbonInventoryLineFactor.groupBy({ by: ["appliedFactorRateUnitId"], _count: { _all: true } })`
  - Merge the three count maps into a single `Map<rmuId, { emissionFactors, lineInputsAsManualFactor, lineFactorsAsApplied }>`. Default missing entries to zeros.
  - For each row in the `findMany` result, attach `referenceCounts` and the derived `totalReferenceCount`. Map the joined numerator/denominator MUs (with their joined magnitudes) onto the response shape.
  - The number of queries is fixed at four (one main + three counts) regardless of row count.
- [ ] 2.4 Update `apps/api/src/features/measurementUnits/mappers.ts` (or wherever the rate-unit mapper lives) to project the new fields.

## 3. Frontend — Query Hook

- [ ] 3.1 Update `apps/web/src/api/query/measurementUnits/useRateMeasurementUnits.ts` (or create a dedicated hook in the maintainer area) to accept an optional `filters` argument matching the querystring schema. The hook SHALL include the filters in the query key for proper caching:
  ```ts
  queryKey: rateMeasurementUnitKeys.list(filters);
  ```
- [ ] 3.2 Add `rateMeasurementUnitKeys.list(filters)` to the corresponding keys file. Existing call sites that pass no filters MUST continue to work (the keys' `.all` form remains valid for cache invalidation).
- [ ] 3.3 Verify the existing consumers of `useRateMeasurementUnits` (the EmissionEditor flow) do not regress: they continue to call without filters, and the new `referenceCounts` field appears on each item but is unused (no UI surface, no type error since the field is added to the response).

## 4. Frontend — Screen

- [ ] 4.1 Create `apps/web/src/screens/Maintainer/screens/RateMeasurementUnitsScreen/RateMeasurementUnitsScreen.tsx`. Use `StylizedDataGrid` with the following columns:
  - `abbreviation` (e.g., `kg/km`).
  - `numeratorMeasurementUnit.abbreviation` (e.g., `kg`).
  - `numeratorMeasurementUnit.magnitude.name` (e.g., `Masa`).
  - `denominatorMeasurementUnit.abbreviation` (e.g., `km`).
  - `denominatorMeasurementUnit.magnitude.name` (e.g., `Distancia`).
  - `totalReferenceCount` (sortable; default sort DESC).
  - Optional: a tooltip on the count column that breaks down the three categories (`emissionFactors`, `lineInputsAsManualFactor`, `lineFactorsAsApplied`).
- [ ] 4.2 Disable row selection (`disableRowSelectionOnClick`), do NOT render an actions column, do NOT implement `processRowUpdate`. The grid is purely read-only.
- [ ] 4.3 Render a header strip above the grid with three filter controls, all driven by URL query params (`useSearch` from TanStack Router):
  - Numerator magnitude filter: an Autocomplete or Select populated from `useMagnitudes()`. Empty value = no filter.
  - Denominator magnitude filter: same.
  - Search input: a debounced text field (300ms via the existing debounce constant in `apps/web/src/config/constants.ts`). Empty value = no filter.
- [ ] 4.4 The filter controls write back to the URL with `useNavigate({ to: ".", search: (prev) => ({ ...prev, ... }) })` — use the same pattern as other admin browse screens.
- [ ] 4.5 The query hook reads the filters from `useSearch` and passes them to `useRateMeasurementUnits(filters)`.
- [ ] 4.6 Default sort model: `[{ field: "totalReferenceCount", sort: "desc" }]`. Native column header sorting is enabled for all sortable columns.
- [ ] 4.7 Use Spanish for column headers, filter labels, placeholder text, and any empty-state messages.

## 5. Frontend — Route Wiring & Sidebar

- [ ] 5.1 Create `apps/web/src/routes/admin/rate-measurement-units.tsx`. `beforeLoad` guard: `requireRole([SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. Component: `RateMeasurementUnitsScreen`. Validate the `search` parameter type with a Zod schema in `validateSearch` so TanStack Router types it correctly.
- [ ] 5.2 Add `Routes.ADMIN_RATE_MEASUREMENT_UNITS = "/admin/rate-measurement-units"` (or equivalent) to wherever existing admin route constants live.
- [ ] 5.3 In `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`, add a new top-level sidebar entry "Tasas" linked to the new route. Place it adjacent to "Magnitudes" and "Unidades". Do NOT introduce a "Unidades" collapsible group — that is `regroup-units-sidebar`'s scope.

## 6. Testing — API

- [ ] 6.1 Integration test for `getAllRateMeasurementUnits` with no filters: returns all ACTIVE rate units, each with `referenceCounts` and `totalReferenceCount`. Verify `totalReferenceCount = sum of breakdowns`.
- [ ] 6.2 Integration test with `numeratorMagnitudeId` filter: response only includes RMUs whose numerator MU's magnitude id matches.
- [ ] 6.3 Integration test with `denominatorMagnitudeId` filter: same for denominator.
- [ ] 6.4 Integration test with both magnitude filters combined.
- [ ] 6.5 Integration test with `search`: case-insensitive substring match on `abbreviation` (set up rate units `kg/km`, `kg/L`, `ton/km`; search `"kg"` returns the first two; search `"KG"` returns the same; search `"foo"` returns empty).
- [ ] 6.6 Integration test for the count fields: insert known counts of `EmissionFactor`, `CarbonInventoryLineInput.manualFactorRateUnitId`, and `CarbonInventoryLineFactor.appliedFactorRateUnitId` against a specific RMU; assert each count is reported correctly and the total matches.
- [ ] 6.7 Integration test for response shape: the joined `numeratorMeasurementUnit` and `denominatorMeasurementUnit` each carry their own `magnitude: { id, code, name, isSystem, status }` per the contract introduced by `add-magnitudes-maintainer`.

## 7. Testing — Frontend

- [ ] 7.1 Smoke-test the screen in the dev server: load with no filters, apply a numerator filter, apply a denominator filter, type into the search box (verify debounce — only one API call after stopping typing), clear filters via URL navigation, refresh the page (verify URL state is restored).
- [ ] 7.2 Verify the existing carbon-inventory `EmissionEditor` rate-unit picker still works (the underlying endpoint contract has been extended, not changed).

## 8. Documentation

- [ ] 8.1 Update `docs/data-model/` (or the appropriate section) to mention the new admin screen as the operator-facing inspector for derived RMU data.

## 9. Pre-merge Checks

- [ ] 9.1 `pnpm format`
- [ ] 9.2 `pnpm lint`
- [ ] 9.3 `pnpm type-check`
- [ ] 9.4 `pnpm test --filter=api -- /getAllRateMeasurementUnits --coverage=false`
- [ ] 9.5 `pnpm test --filter=api -- /carbonInventories --coverage=false` (sanity check that the EmissionEditor consumer is unaffected)
- [ ] 9.6 Manual smoke test: navigate to `/admin/rate-measurement-units`, apply each filter, verify the URL updates, share the URL with another admin and verify state is reproduced.

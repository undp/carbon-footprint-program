## 1. Database schema and migration

- [ ] 1.1 In `packages/database/src/prisma/schema.prisma`, add `year Int?` to `model EmissionFactor` (mapped as `@map("year")` is unnecessary — the column name already matches).
- [ ] 1.2 In the same model's trailing comment, replace the note about the partial unique index with the new key: `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "year") WHERE status <> 'DELETED'`, `NULLS NOT DISTINCT`.
- [ ] 1.3 In `model CarbonInventoryLineFactor`, add `appliedFactorYear Int? @map("applied_factor_year")` and `appliedFactorYearMatchesInventory Boolean? @map("applied_factor_year_matches_inventory")`. Both nullable: a line whose factor is transversal, or an own factor, has no year to record.
- [ ] 1.4 Confirm the deployment target runs PostgreSQL 15 or newer (required by `NULLS NOT DISTINCT`). If it does not, express the index with `COALESCE(...)` expressions instead and note it in the migration header.
- [ ] 1.5 Create the migration under `packages/database/src/prisma/migrations/<timestamp>_add_emission_factor_year/migration.sql`:
  - `ALTER TABLE "emission_factor" ADD COLUMN "year" INTEGER;`
  - `ALTER TABLE "carbon_inventory_line_factor"` add the two columns from 1.3.
  - `DROP INDEX "emission_factor_unique_subcategory_dims_source";`
  - `CREATE UNIQUE INDEX "emission_factor_unique_subcategory_dims_year" ON "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "year") NULLS NOT DISTINCT WHERE "status" <> 'DELETED';`
- [ ] 1.6 In the same migration, backfill: for every row whose `source` ends in a four-digit year, set `year` to that number and trim the year (and the separating whitespace) from `source`. Rows with no trailing year keep `year = null`. Include a header comment stating that a null year means transversal.
- [ ] 1.7 Run `pnpm exec prisma migrate dev` against a local database, then verify by hand: `DEFRA 2025` rows became `DEFRA` + 2025, `IPCC` and `Kool, A.` rows kept a null year, and inserting a duplicate `(subcategory, dims, year)` is rejected while a different year is accepted.

## 2. Shared types

- [ ] 2.1 In `packages/types/src/baseSchemas/emissionFactor.ts`, add `year` to `EmissionFactorBaseSchema` as a nullable integer, described as the reporting year the factor applies to (null = transversal).
- [ ] 2.2 In `packages/types/src/emissionFactors/createEmissionFactor/schemas.ts`, add `year` to the request schema and to `EmissionFactorFormSchema`. Validate it as an integer within a sane range and allow null.
- [ ] 2.3 Mirror 2.2 in `packages/types/src/emissionFactors/updateEmissionFactor/schemas.ts` and add `year` to the `getAllEmissionFactors` response schema.
- [ ] 2.4 In the carbon-inventory methodology schemas, add `year` to the emission-factor shape returned by `getCarbonInventoryMethodology`, and add the applied year plus the year-match flag to the line-factor shapes used by `syncCarbonInventoryLines` and `getEmissionFactors`.

## 3. API — emission factor maintenance

- [ ] 3.1 In `apps/api/src/features/emissionFactors/helpers.ts`, extend `checkDuplicateEmissionFactor` with a `year` parameter and add `year` to the `where` clause (matching `null` explicitly, not skipping the field).
- [ ] 3.2 In the same file, extend `validateSourceConsistency` with a `year` parameter and scope its lookup to that year, so a subcategory can hold different sources across years but only one within a year.
- [ ] 3.3 Update `createEmissionFactor/service.ts` and `updateEmissionFactor/service.ts` to pass the year to both helpers and to persist it. Keep the existing `P2002` mapping to `EmissionFactorDuplicateError` — the new index raises the same code.
- [ ] 3.4 Update `apps/api/src/features/emissionFactors/mappers.ts` and `getAllEmissionFactors/service.ts` so the year is returned in every emission-factor response.
- [ ] 3.5 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year` to the payload built by `cloneEmissionFactors`.

## 4. API — methodology payload

- [ ] 4.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`, add `year: true` to the `emissionFactors` select.
- [ ] 4.2 In the sibling `helper.ts`, add `year` to `EmissionFactorWithRateUnit` and to `ConvertedEmissionFactor`, and carry it through `generateConvertedEmissionFactors` so every converted copy reports the year of the factor it derives from.
- [ ] 4.3 Check `apps/api/src/features/carbonInventories/getCarbonInventoryMethodologyExport` and the methodology export mappers (`apps/api/src/features/methodologies/mappers.ts`) and add the year wherever the source is already exposed.

## 5. API — capture and recording

- [ ] 5.1 In `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts`, accept the applied year and the year-match flag from the request and map them onto the `carbon_inventory_line_factor` create/update payloads, next to `appliedFactorValue` and `appliedFactorSource`.
- [ ] 5.2 Derive the year-match flag server-side from the inventory's year rather than trusting the client, so the recorded flag cannot disagree with the recorded year.
- [ ] 5.3 In `apps/api/src/features/carbonInventories/getEmissionFactors/service.ts`, select the applied year from the line factor and add it (plus the fallback indication) to `GetEmissionFactorsResponse`.
- [ ] 5.4 In `apps/api/src/features/carbonInventories/duplicateCarbonInventory/service.ts`, copy the applied year and flag along with the rest of the line factor, so a duplicate starts as a faithful copy.

## 6. Seed

- [ ] 6.1 In `tools/seed/src/scripts/seedMethodologyData/shared.ts`, add an optional `year` to the emission-factor entry of `FullMethodologyDataSchema`.
- [ ] 6.2 In `tools/seed/src/scripts/seedMethodologyData/seedEmissionFactors.ts`, carry the year from the JSON into the created rows.
- [ ] 6.3 In `tools/seed/src/data/base/methodologies.json` (246 factors), split every source: `"DEFRA 2025"` becomes `"source": "DEFRA", "year": 2025`; `"EcoAct 2020"` becomes `"source": "EcoAct", "year": 2020`; `"IPCC"` and `"Kool, A."` keep their source and omit the year.
- [ ] 6.4 Repeat 6.3 in `tools/seed/src/data/testing/methodologies.json` (245 factors) so the testing dataset mirrors `base`.
- [ ] 6.5 Run the seed against a fresh database and confirm the result matches a migrated one: same sources, same years, no duplicate-key failures.

## 7. Web — vintage resolution and selection

- [ ] 7.1 In `apps/web/src/screens/CarbonInventory/types/index.tsx`, add `year` to `MethodologyEmissionFactor`.
- [ ] 7.2 In `apps/web/src/screens/CarbonInventory/components/EmissionEditor/services/emissionFactorService.ts`, add a pure `resolvePreselectedFactor(availableFactors, inventoryYear)` implementing the four-step rule (exact year, transversal, most recent below, closest above) and returning both the chosen factor and why it was chosen, so the caller can decide whether to show the other-year notice. Add a companion `getAvailableYears` for the selector's options.
- [ ] 7.3 Replace `determineAutoLoadFactorSource` in `apps/web/src/screens/CarbonInventory/components/EmissionEditor/hooks/useEmissionEditorForm.ts` with year-based resolution. The current "auto-fill only when exactly one source survives" heuristic goes away; sources with more than one candidate for the resolved year keep the existing behavior of asking the organization to choose.
- [ ] 7.4 Thread the inventory year into the editor. `useEmissionCaptureData` already exposes `year` on the merged capture data — pass it down rather than fetching it again.
- [ ] 7.5 Extend the factor cells (`EmissionEditorFactorSourceCell.tsx`, and the factor/value cells beside it) so the vintage is selectable and the applied year is visible on the row, with the other-year notice when the resolved year is not the footprint's. Every status indicator needs a tooltip, per the project's UI convention.
- [ ] 7.6 Send the applied year with each line when saving, so the API can record it.

## 8. Web — year change and duplication

- [ ] 8.1 When the measurement year changes on a footprint that already has captured lines, show a notice offering to update the factors, and re-resolve every editable line with the rule from 7.2 before submitting through the existing sync endpoint. Never recalculate without the explicit action.
- [ ] 8.2 Make the same offer after duplicating a footprint and re-dating the copy.
- [ ] 8.3 Suppress the offer for footprints that are not editable (self-declared or under verification) — the existing `isEditable` gate already covers the screens; confirm it covers this path too.

## 9. Web — maintainer, summary and export

- [ ] 9.1 Add a year column to the emission-factors maintainer grid (`apps/web/src/screens/Maintainer/hooks/useEmissionFactorColumns.tsx`) and to its form (`useEmissionFactorsForm.ts`), allowing an empty value to mean transversal.
- [ ] 9.2 Surface the maintainer-side error messages for the two validators, including the source conflict, now scoped per year (`getApiErrorMessage` mapping).
- [ ] 9.3 Add the year column to the factors sheet in `apps/web/src/utils/exportMethodologyToExcel.ts`, rendering a transversal factor as an empty cell.
- [ ] 9.4 Show the year in the factors-used summary (`apps/web/src/screens/CarbonInventory/components/EmissionSummary/useEmissionFactorsColumns.tsx`), marking the rows that used a factor from another year.

## 10. Tests

- [ ] 10.1 API: extend the `emissionFactors` integration tests — a second vintage is accepted, a duplicate within the same year is rejected, two transversal factors collide, and the source-conflict error fires within a year but not across years.
- [ ] 10.2 API: assert the year is present in the methodology payload, including on converted factors.
- [ ] 10.3 API: assert `syncCarbonInventoryLines` persists the applied year and derives the match flag from the inventory's year, and that `getEmissionFactors` returns both.
- [ ] 10.4 Web: unit-test `resolvePreselectedFactor` in `emissionFactorService.test.ts` — one case per branch of the rule, plus the no-factor and no-inventory-year cases.
- [ ] 10.5 Run `pnpm test:api -- /emissionFactors --coverage=false`, `pnpm test:api -- /carbonInventories --coverage=false` and `pnpm test:web`.

## 11. Wrap-up

- [ ] 11.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [ ] 11.2 Confirm with the methodology team which factors are genuinely transversal before loading any real vintage, and correct the backfilled classification if they disagree. This is the change's one open question.
- [ ] 11.3 Load the first real vintages, starting with the activities where the year moves the result (electricity, fuels), and check the payload size of `getCarbonInventoryMethodology` against the warning already noted in that service.

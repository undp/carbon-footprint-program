## 1. Pre-conditions

- [ ] 1.1 Sync the working tree with `main`, run `pnpm install`.
- [ ] 1.2 Confirm the backfill year with the methodology team. The design proposes **2025**, on the evidence that 195 of the 284 seeded sources say `DEFRA 2025` and that this catalogue is the one serving 2025 footprints. This is a yes/no on a stated proposal, not an open investigation — but it must be answered before the migration is written, because the column ends up `NOT NULL`.
- [ ] 1.3 Query how many editable footprints exist with `year < 2025`. Those will find no catalogue for their year after this change and will have to use a manual factor. If the count is material, agree the communication before rolling out.
- [ ] 1.4 Note that `fix/mati/activity-unit-factor-mismatch` is **postponed**, not a dependency: it was deferred because no normal user flow reaches that path, though it still needs fixing. This change therefore owns the introduction of the factor lookup in `syncCarbonInventoryLines` (section 6), and must leave it in a shape that fix can extend.

## 2. Database

- [ ] 2.1 In `packages/database/src/prisma/schema.prisma`, add `year Int` (required) to `EmissionFactor` (~line 672). No column is added to `CarbonInventoryLineFactor` — see design Decision 7.
- [ ] 2.2 Write the migration in three steps: add `year` nullable, `UPDATE emission_factor SET year = <confirmed year>` over every row, then `ALTER COLUMN year SET NOT NULL`.
- [ ] 2.3 In the same migration, drop and recreate `emission_factor_unique_subcategory_dims_source` as `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", "year") WHERE "status" <> 'DELETED'`. No `COALESCE` wrapper: the column is `NOT NULL`, so Postgres' default `NULLS DISTINCT` behaviour does not apply to it. (`dimension_value_1_id` and `dimension_value_2_id` remain nullable — a pre-existing gap, out of scope here.)
- [ ] 2.4 Comment the backfill value in the migration, naming the evidence and the confirmation from 1.2, so a future reader knows the year was chosen deliberately rather than defaulted.
- [ ] 2.5 Add a TODO next to the index's `WHERE "status" <> 'DELETED'` recording that it must become `WHERE "status" = 'ACTIVE'` if and when a draft factor state is introduced, since a draft would otherwise occupy the index and collide with the active row it is meant to replace.
- [ ] 2.6 Update the two schema comments that describe the partial index so they mention the year.

## 3. Types

- [ ] 3.1 Add `year` (required int) to `EmissionFactorBaseSchema` in `packages/types/src/baseSchemas/emissionFactor.ts`, with a wide static bound (roughly 1990 to 2100). `packages/types` is already consumed by both apps, so this needs no new shared constant and no `packages/constants` change — see design Decision 8.
- [ ] 3.2 Add the year to `CreateEmissionFactorRequestSchema`, `CreateEmissionFactorResponseSchema` and `EmissionFactorFormSchema` in `packages/types/src/emissionFactors/createEmissionFactor/schemas.ts`, required.
- [ ] 3.3 Add the year to `UpdateEmissionFactorRequestSchema` and `UpdateEmissionFactorResponseSchema`. The request schema is `.partial()`, so an update that omits the year leaves it unchanged; when present it is validated against the same static bound.
- [ ] 3.4 Add the year to the `GetAllEmissionFactorsResponseSchema` row shape, so the maintainer grid can render the column.
- [ ] 3.5 Add the year to the emission-factor entry of `GetMethodologyExportResponseSchema`. Note that `GetCarbonInventoryMethodologyExportResponseSchema` is a literal re-export of it, so the footprint-scoped export is covered with no further edit.
- [ ] 3.6 Add the year to the row shape of `GetEmissionFactorsResponse` (the verifier's per-footprint report). Do **not** add it to `GetCarbonInventoryMethodologyResponse`: every factor there is of the footprint's year by construction.

## 4. API — emission factor write path

- [ ] 4.1 In `apps/api/src/features/emissionFactors/helpers.ts`, extend `checkDuplicateEmissionFactor` to take the year and include it in its `where`. Keep its existing semantics otherwise: it keys on the subcategory plus the values of the dimensions marked required, and ignores `source`.
- [ ] 4.2 In the same file, narrow `validateSourceConsistency` from "one source per subcategory" to "one source per subcategory and year" by adding the year to its lookup.
- [ ] 4.3 Add a TODO on `validateSourceConsistency` recording that multi-source per `(subcategory, year)` was deliberately deferred, that neither GHG Protocol nor ISO requires a single source, and that lifting it means deleting this function and adding `source` to the key in 4.1 — validation only, no migration.
- [ ] 4.4 Thread the year through `createEmissionFactor/service.ts`: require it, pass it to both checks, persist it, return it.
- [ ] 4.5 Thread the year through `updateEmissionFactor/service.ts`, including the case where the year alone changes and both checks must re-run against the new year.

## 5. API — capture read path

- [ ] 5.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`, add `year` to the `carbonInventory.findUnique` select — it currently selects only `methodologyVersionId`.
- [ ] 5.2 Filter the `emissionFactors` `where` by `year: <footprint year>`. A footprint with a null year matches nothing, which is the intended degradation; no special branch is needed. Confirm the filter sits in the Prisma query, ahead of `generateConvertedEmissionFactors`.
- [ ] 5.3 Do not add `year` to the factor `select` and do not touch `ConvertedEmissionFactor` in the helper. The response carries no per-factor year.
- [ ] 5.4 Add the year to `getAllEmissionFactors/service.ts`'s select and mapped response.

## 6. API — line synchronization

- [ ] 6.1 In `syncCarbonInventoryLines/service.ts`, add `year` to the `carbonInventory.findUnique` select.
- [ ] 6.2 Introduce the emission-factor lookup this service has never had: one `findMany` over every `baseFactorId` referenced by the create and update items, keyed into a map. This is new ground — `createLineFactor` currently persists `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` straight from the payload, with no query against the factor table anywhere in the service.
- [ ] 6.3 Select `year`, `rateMeasurementUnitId` and the rate unit's `denominatorMeasurementUnit` in that lookup. Only the year is used by this change; the denominator is selected so the postponed `activity-unit-factor-mismatch` fix can add its check to the same query instead of opening a second one. Leave a TODO at the lookup naming that fix and what it will need.
- [ ] 6.4 Reject the request when a referenced factor's year differs from the footprint's year, on create and on update alike. Add a dedicated error class in `apps/api/src/features/carbonInventories/errors.ts` following the shared error-class conventions, with a Spanish user-facing message.
- [ ] 6.5 Leave `createLineFactor` otherwise untouched: no year is persisted on the line.

## 7. API — duplication, exports and the verifier report

- [ ] 7.1 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year: ef.year` to the `createMany` inside `cloneEmissionFactors` and to the `findMany` select that feeds it. This enumerates columns by hand; with the column required, omitting it now fails loudly instead of silently erasing the dating, but it still has to be added.
- [ ] 7.2 Add the year to `methodologyExportSelect` in `apps/api/src/features/methodologies/helpers.ts` and to the emission-factor mapper in `apps/api/src/features/methodologies/mappers.ts`. This covers `getMethodologyExport` and `getCarbonInventoryMethodologyExport` at once, since the latter reuses the same select, mapper and response schema.
- [ ] 7.3 In `apps/api/src/features/carbonInventories/getEmissionFactors/service.ts`, invert the source fallback chain so the frozen `factor.appliedFactorSource` wins over the live `emissionFactor.source`, and add the footprint's year to the response row. The service already loads the inventory through `fetchInventory`, so the year needs no new query.
- [ ] 7.4 Add a TODO at the `gasBreakdownLines` computation recording that the gas breakdown is still read live because it is not frozen anywhere, and that freezing it would mean a JsonB column beside `derivationDetails`, populated in sync and carried in `duplicateCarbonInventory`.
- [ ] 7.5 Leave `duplicateCarbonInventory` unchanged: with no year on the line factor, its hand-enumerated `carbonInventoryLineFactor.create` needs no new field.

## 8. API — clearing the stale factors on a year change

- [ ] 8.1 In `apps/api/src/features/carbonInventories/updateCarbonInventory/service.ts`, wrap the update in `prisma.$transaction`. It is a single `update` today.
- [ ] 8.2 When `data.year` is present and differs from the stored year, delete inside that transaction the `carbonInventoryLineFactor` rows belonging to that footprint's active line inputs **where `emissionFactorId` is not null**, together with their matching `carbonInventoryLineResult` rows.
- [ ] 8.3 Leave manual-factor lines untouched: their snapshot row (`emissionFactorId` null) stays, and so do `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the input. A catalogue factor is one click to restore from the methodology; a manual one is typed work with nothing to restore it from.
- [ ] 8.4 Leave every line's subcategory, dimension selections, measurement unit and quantity intact, and never pick a replacement factor.
- [ ] 8.5 Add `CarbonInventoryQueryKey.AttributesUpdateDependency` to `carbonInventoryKeys.methodology(id)` in `apps/web/src/api/query/carbonInventories/keys.ts`. Today that key is `[Root, id, Methodology]`, and `useUpdateCarbonInventory` invalidates by the predicate `queryKey.includes(inventoryId) && queryKey.includes(AttributesUpdateDependency)` — which never matches it. Harmless while the methodology response ignores the year; once it is year-filtered, a year change would leave capture serving the previous year's factors from cache for the whole `staleTime`. This is the primary fix for that path; the validation in section 6 is the backstop behind it.
- [ ] 8.6 Make sure the emission-editor line data is refetched after a year change, so the cleared lines appear as needing a factor.

## 9. Web — maintainer

- [ ] 9.1 Add the year to `toFormEmissionFactor` and to the form defaults in `apps/web/src/screens/Maintainer/hooks/useEmissionFactorsForm.ts`. A new row should default to the current year rather than to empty.
- [ ] 9.2 Add a required «Año» column to `apps/web/src/screens/Maintainer/hooks/useEmissionFactorColumns.tsx`, rendered as a select over `[currentYear - 4 .. currentYear + 1]`, derived beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT` in `apps/web/src/config/constants.ts`. There is no "sin año" option. Follow the existing cell patterns in that file.
- [ ] 9.3 Add a TODO at `EmissionFactorsMaintainerScreen` recording that a year filter was deferred: the grid only becomes unwieldy once a second year exists, which is when the bulk import is also needed, and filtering is risky here because rows are addressed by field-array index.

## 10. Web — capture and step 1

- [ ] 10.1 In `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx`, add a confirmation modal shown when the year is changed while the footprint already has declared lines. The Spanish copy must say plainly that the lines using a catalogue factor will be left without one and will have to be reassigned, that their quantities and units are kept, and that manually entered factors are kept as they are.
- [ ] 10.2 Verify the cleared lines render through the existing "line without a factor" state, the same one a newly added line uses, and that `useLineValidation` and `fieldValidationService` already flag them as incomplete. No new empty state should be needed.
- [ ] 10.3 Check what capture shows when a footprint's year has no catalogue at all — the pre-2025 case from 1.3. The subcategory should still be usable through the manual factor, without a confusing empty dropdown.

## 11. Seed

- [ ] 11.1 Add the year to the emission-factor entry of the seed schema in `tools/seed/src/scripts/shared.ts` (~line 62), as a required field.
- [ ] 11.2 Thread it through `tools/seed/src/scripts/seedMethodologyData/seedEmissionFactors.ts`, which currently flattens a fixed list of factor properties.
- [ ] 11.3 Set the year on every factor in `tools/seed/src/data/base/methodologies.json` to the year confirmed in 1.2, leaving all `source` strings untouched. Mirror the change in the testing dataset.
- [ ] 11.4 Add a TODO alongside `getMethodologyExport` recording the deferred bulk/atomic import of a year's set, and noting that with no undated factors the whole catalogue must be restated annually, which is what makes that import worth building.

## 12. Tests

- [ ] 12.1 Extend `apps/api/test/factories/emissionFactorFactory.ts` to take a year, defaulting to something explicit rather than leaving it unset.
- [ ] 12.2 Review the four existing suites under `apps/api/test/features/emissionFactors/` — several assert on duplicate and source-conflict behaviour and will shift once the year enters both keys.
- [ ] 12.3 Add integration coverage for `createEmissionFactor` / `updateEmissionFactor`: same key different years succeeds; same key same year is rejected; different sources in the same subcategory and year is rejected; different sources across years succeeds; a missing year is rejected; a factor older than the UI window stays editable when its year is not being changed.
- [ ] 12.4 Add integration coverage for `getCarbonInventoryMethodology`: only the footprint's year is offered; a year with no catalogue offers nothing; a footprint with a null year offers nothing.
- [ ] 12.5 Add integration coverage for `syncCarbonInventoryLines`: a create referencing a factor from another year is rejected and persists nothing; an update to such a factor is rejected too; a line of the footprint's year is accepted.
- [ ] 12.6 Add integration coverage for `duplicateCarbonInventory` plus a year change: the copy keeps every snapshot verbatim; changing its year clears the catalogue-factor snapshots and their results while keeping subcategory, dimensions, unit and quantity; manual-factor lines survive untouched; no replacement factor is ever chosen; and the whole thing is atomic with the year update. These tests are what keep design Decision 7 honest — the reported year is only derivable while this behaviour holds.
- [ ] 12.7 Add integration coverage for `duplicateMethodology`: cloned factors keep their year.
- [ ] 12.8 Add integration coverage for `getEmissionFactors`: editing a factor's source afterwards does not change what an existing footprint reports.
- [ ] 12.9 Add a migration check: against a database seeded with the undated catalogue, every factor ends dated, no `source` string changed, and the column is `NOT NULL`.

## 13. Verification

- [ ] 13.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [ ] 13.2 Run the API suites for the touched domains: `pnpm test:api -- /emissionFactors --coverage=false`, `/carbonInventories`, `/methodologies`.
- [ ] 13.3 Run `pnpm test:web`.
- [ ] 13.4 Before rolling out, re-confirm 1.2 and 1.3 with their answers written down: which year the catalogue was dated to, and what happens to the footprints that predate it.

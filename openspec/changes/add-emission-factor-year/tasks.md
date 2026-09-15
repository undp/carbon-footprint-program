## 1. Pre-conditions

- [ ] 1.1 Sync the working tree with `main`, run `pnpm install`.
- [ ] 1.2 Note that `fix/mati/activity-unit-factor-mismatch` is **postponed**, not a dependency: it was deferred because no normal user flow reaches that path, though it still needs fixing. This change therefore owns the introduction of the factor lookup in `syncCarbonInventoryLines` (section 7), and must leave it in a shape that fix can extend.

## 2. Shared year-range constant

- [ ] 2.1 Add the emission-factor year bounds to `packages/constants/src/carbonInventory.ts` (or a sibling module), expressed relative to the current year: `[currentYear - 4 .. currentYear + 1]`. Document in a comment that the lower bound mirrors `CALCULATOR_YEARS_RANGE_FROM_CURRENT` so every declarable footprint year is datable, and that the `+1` covers sets published ahead of their validity.
- [ ] 2.2 Export it from `packages/constants/src/index.ts`.
- [ ] 2.3 Re-point `CALCULATOR_YEARS_RANGE_FROM_CURRENT` in `apps/web/src/config/constants.ts:13` at the shared constant, or leave it and have the shared one derive the same lower bound — whichever keeps a single source of truth. Do not let the two drift.

## 3. Database

- [ ] 3.1 In `packages/database/src/prisma/schema.prisma`, add `year Int?` to `EmissionFactor` (~line 672).
- [ ] 3.2 In the same file, add `appliedFactorYear Int? @map("applied_factor_year")` to `CarbonInventoryLineFactor` (~line 839).
- [ ] 3.3 Create the migration. It SHALL add both columns as nullable, then drop and recreate `emission_factor_unique_subcategory_dims_source` as `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", COALESCE("year", 0)) WHERE "status" <> 'DELETED'`.
- [ ] 3.4 Add a comment on the index recreation explaining both choices: `COALESCE` rather than `NULLS NOT DISTINCT` because the latter requires PG15+ and the on-prem Dominican Republic database version is unconfirmed; and that without it, Postgres' default `NULLS DISTINCT` would make every existing undated row non-duplicable against any other, silently voiding the catalogue's uniqueness.
- [ ] 3.5 Add a TODO next to the index's `WHERE "status" <> 'DELETED'` recording that it must become `WHERE "status" = 'ACTIVE'` if and when a draft factor state is introduced, since a draft would otherwise occupy the index and collide with the active row it is meant to replace.
- [ ] 3.6 Update the two schema comments that describe the partial index so they mention the year.

## 4. Types

- [ ] 4.1 Add `year` (nullable int) to `EmissionFactorBaseSchema` in `packages/types/src/baseSchemas/emissionFactor.ts`.
- [ ] 4.2 Add the year to `CreateEmissionFactorRequestSchema`, `CreateEmissionFactorResponseSchema` and `EmissionFactorFormSchema` in `packages/types/src/emissionFactors/createEmissionFactor/schemas.ts`, validated against the shared range from 2.1.
- [ ] 4.3 Add the year to `UpdateEmissionFactorRequestSchema` and `UpdateEmissionFactorResponseSchema`.
- [ ] 4.4 Add the year to the `GetAllEmissionFactorsResponseSchema` row shape, so the maintainer grid can render the column.
- [ ] 4.5 Add the year to the emission-factor entry of `GetMethodologyExportResponseSchema`. Note that `GetCarbonInventoryMethodologyExportResponseSchema` is a literal re-export of it, so the footprint-scoped export is covered with no further edit.
- [ ] 4.6 Add the year to the factor shape inside `GetCarbonInventoryMethodologyResponse`, so capture can display it and the frontend types derived from the response pick it up.
- [ ] 4.7 Add `appliedFactorYear` to the line response schema used by `mapLineToResponse`, so the emission editor can display the year frozen on each line. No mismatch boolean — see design Decision 5.
- [ ] 4.8 Add the year to the row shape of `GetEmissionFactorsResponse` (the verifier's per-footprint report).

## 5. API — emission factor write path

- [ ] 5.1 In `apps/api/src/features/emissionFactors/helpers.ts`, extend `checkDuplicateEmissionFactor` to take the year and include it in its `where`. Keep its existing semantics otherwise: it keys on the subcategory plus the values of the dimensions marked required, and ignores `source`.
- [ ] 5.2 In the same file, narrow `validateSourceConsistency` from "one source per subcategory" to "one source per subcategory and year" by adding the year to its lookup.
- [ ] 5.3 Add a TODO on `validateSourceConsistency` recording that multi-source per `(subcategory, year)` was deliberately deferred, that neither GHG Protocol nor ISO requires a single source, and that lifting it means deleting this function and adding `source` to the key in 5.1 — validation only, no migration.
- [ ] 5.4 Thread the year through `createEmissionFactor/service.ts`: accept it, pass it to both checks, and persist it.
- [ ] 5.5 Thread the year through `updateEmissionFactor/service.ts`, including the case where the year alone changes and the duplicate check must re-run against the new year.
- [ ] 5.6 Return the year in both services' responses.

## 6. API — capture read path

- [ ] 6.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`, add `year` to the `carbonInventory.findUnique` select — it currently selects only `methodologyVersionId`.
- [ ] 6.2 Add the year filter to the `emissionFactors` `where`: when the footprint has a year, `OR [{ year: null }, { year: <footprint year> }]`; when it is null, `year: null`. Confirm the filter sits in the Prisma query, ahead of `generateConvertedEmissionFactors`.
- [ ] 6.3 Add `year: true` to the factor `select`.
- [ ] 6.4 Apply the precedence rule: for each `(subcategoryId, dimensionValue1Id, dimensionValue2Id, rateMeasurementUnitId)` key, if a factor with the footprint's year is present, drop the undated one. Do this before the conversion expansion.
- [ ] 6.5 Carry the year onto `ConvertedEmissionFactor` in `getCarbonInventoryMethodology/helper.ts`, so every expanded rate-unit variant keeps the year of the factor it came from.
- [ ] 6.6 Add the year to `getAllEmissionFactors/service.ts`'s select and mapped response.

## 7. API — line synchronization

- [ ] 7.1 In `syncCarbonInventoryLines/service.ts`, add `year` to the `carbonInventory.findUnique` select.
- [ ] 7.2 Introduce the emission-factor lookup this service has never had: one `findMany` over every `baseFactorId` referenced by the create and update items, keyed into a map. This is new ground — `createLineFactor` currently persists `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` straight from the payload, with no query against the factor table anywhere in the service.
- [ ] 7.3 Select `year`, `rateMeasurementUnitId` and the rate unit's `denominatorMeasurementUnit` in that lookup. Only the year is used by this change; the denominator is selected so the postponed `activity-unit-factor-mismatch` fix can add its check to the same query instead of opening a second one. Leave a TODO at the lookup naming that fix and what it will need.
- [ ] 7.4 Reject the request when a referenced factor's year is neither null nor equal to the footprint's year. Add a dedicated error class in `apps/api/src/features/carbonInventories/errors.ts` following the shared error-class conventions, with a Spanish user-facing message.
- [ ] 7.5 In `syncCarbonInventoryLines/helper.ts`, extend `ItemData` and `createLineFactor` to persist `appliedFactorYear`. Source it from the fetched database row for catalogue factors — never from the request payload.
- [ ] 7.6 For custom-source lines (`CUSTOM_FACTOR_SOURCES`), persist the footprint's year as `appliedFactorYear`. Note that `createLineFactor` already creates a snapshot row for these, with `emissionFactorId` null.

## 8. API — duplication, exports and the verifier report

- [ ] 8.1 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year: ef.year` to the `createMany` inside `cloneEmissionFactors` and to the `findMany` select that feeds it. Without this, duplicating a methodology erases the dating of every factor with no error and no warning.
- [ ] 8.2 Add the year to `methodologyExportSelect` in `apps/api/src/features/methodologies/helpers.ts` and to the emission-factor mapper in `apps/api/src/features/methodologies/mappers.ts`. This covers `getMethodologyExport` and `getCarbonInventoryMethodologyExport` at once, since the latter reuses the same select, mapper and response schema.
- [ ] 8.3 In `apps/api/src/features/carbonInventories/duplicateCarbonInventory/service.ts`, add `appliedFactorYear` to the `carbonInventoryLineFactor.create` that copies each line's snapshot. It enumerates columns by hand, like `cloneEmissionFactors`.
- [ ] 8.4 In `apps/api/src/features/carbonInventories/getEmissionFactors/service.ts`, invert the source fallback chain so the frozen `factor.appliedFactorSource` wins over the live `emissionFactor.source`, and add the frozen year to the response row.
- [ ] 8.5 Add a TODO at the `gasBreakdownLines` computation recording that the gas breakdown is still read live because it is not frozen anywhere, and that freezing it would mean a JsonB column beside `derivationDetails`, populated in sync and carried in `duplicateCarbonInventory`.
- [ ] 8.6 In `apps/api/src/features/carbonInventories/mappers.ts`, expose `appliedFactorYear` in `mapLineToResponse`. It is read straight off the line's factor snapshot, so no extra argument and no call-site changes are needed.

## 9. API — clearing the stale factors on a year change

- [ ] 9.1 In `apps/api/src/features/carbonInventories/updateCarbonInventory/service.ts`, wrap the update in `prisma.$transaction`. It is a single `update` today.
- [ ] 9.2 When `data.year` is present and differs from the stored year, delete inside that transaction the `carbonInventoryLineFactor` rows belonging to that footprint's active line inputs **where `emissionFactorId` is not null**, together with their matching `carbonInventoryLineResult` rows.
- [ ] 9.3 Leave manual-factor lines untouched: their snapshot row (`emissionFactorId` null) stays, and so do `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the input. A catalogue factor is one click to restore from the methodology; a manual one is typed work with nothing to restore it from.
- [ ] 9.4 Leave every line's subcategory, dimension selections, measurement unit and quantity intact, and never pick a replacement factor.
- [ ] 9.5 Add `CarbonInventoryQueryKey.AttributesUpdateDependency` to `carbonInventoryKeys.methodology(id)` in `apps/web/src/api/query/carbonInventories/keys.ts`. Today that key is `[Root, id, Methodology]`, and `useUpdateCarbonInventory` invalidates by the predicate `queryKey.includes(inventoryId) && queryKey.includes(AttributesUpdateDependency)` — which never matches it. Harmless while the methodology response ignores the year; once it is year-filtered, a year change would leave capture serving the previous year's factors from cache for the whole `staleTime`. This is the primary fix for that path; the validation in section 7 is the backstop behind it.
- [ ] 9.6 Make sure the emission-editor line data is refetched after a year change, so the cleared lines appear as needing a factor.

## 10. Web — maintainer

- [ ] 10.1 Add the year to `toFormEmissionFactor` and to the form defaults in `apps/web/src/screens/Maintainer/hooks/useEmissionFactorsForm.ts`.
- [ ] 10.2 Add an «Año» column to `apps/web/src/screens/Maintainer/hooks/useEmissionFactorColumns.tsx`, rendered as a select bounded by the shared constant plus an empty option for "sin año". Follow the existing cell patterns in that file.
- [ ] 10.3 Make sure an empty selection round-trips as null rather than `0` or `""`.

## 11. Web — capture and step 1

- [ ] 11.1 In `apps/web/src/screens/CarbonInventory/BusinessProfilingScreen.tsx`, add a confirmation modal shown when the year is changed while the footprint already has declared lines. The Spanish copy must say plainly that the lines using a catalogue factor will be left without one and will have to be reassigned, that their quantities and units are kept, and that manually entered factors are kept as they are.
- [ ] 11.2 Display the line's `appliedFactorYear` in the emission editor, next to the source. This is the entire temporal signal in the UI — no chip, no tooltip, no computed flag. It is what shows a surviving manual factor as being from 2025 inside a 2026 footprint, which is the one case the clearing does not cover.
- [ ] 11.3 Verify the cleared lines render through the existing "line without a factor" state, the same one a newly added line uses, and that `useLineValidation` and `fieldValidationService` already flag them as incomplete. No new empty state should be needed.

## 12. Seed

- [ ] 12.1 Add the year to the emission-factor entry of the seed schema in `tools/seed/src/scripts/shared.ts` (~line 62), as an optional field.
- [ ] 12.2 Thread it through `tools/seed/src/scripts/seedMethodologyData/seedEmissionFactors.ts`, which currently flattens a fixed list of factor properties.
- [ ] 12.3 Leave the year absent in `tools/seed/src/data/base/methodologies.json` for now, with a TODO recording that the catalogue must be born dated and that the blocker is the methodology team confirming which year the current catalogue corresponds to. Do not guess the year.
- [ ] 12.4 Add a TODO for the legacy backfill: an `UPDATE` setting the year on the existing undated rows, to be written once that answer arrives. Record that the `source` strings (`"DEFRA 2025"`) are today the only clue and must not be rewritten before then.

## 13. Tests

- [ ] 13.1 Extend `apps/api/test/factories/emissionFactorFactory.ts` to accept an optional year.
- [ ] 13.2 Review the four existing suites under `apps/api/test/features/emissionFactors/` — several assert on duplicate and source-conflict behaviour and will shift once the year enters both keys.
- [ ] 13.3 Add integration coverage for `createEmissionFactor` / `updateEmissionFactor`: same key different years succeeds; same key same year is rejected; different sources in the same subcategory and year is rejected; different sources across years succeeds; out-of-range year is rejected.
- [ ] 13.4 Add integration coverage for `getCarbonInventoryMethodology`: the dated factor displaces the undated one on the same key; the undated factor still serves a year with no dated factor; a footprint with no year gets only undated factors.
- [ ] 13.5 Add integration coverage for `syncCarbonInventoryLines`: a payload referencing a factor from another year is rejected and persists nothing; the frozen year comes from the database and not the payload; a custom-source line freezes the footprint's year.
- [ ] 13.6 Add integration coverage for `duplicateCarbonInventory` plus a year change: the copy keeps every snapshot verbatim; changing its year clears the catalogue-factor snapshots and their results while keeping subcategory, dimensions, unit and quantity; manual-factor lines survive untouched; no replacement factor is ever chosen; and the whole thing is atomic with the year update.
- [ ] 13.7 Add integration coverage for `duplicateMethodology`: cloned factors keep their year.
- [ ] 13.8 Add integration coverage for `getEmissionFactors`: editing a factor's source afterwards does not change what an existing footprint reports.

## 14. Verification

- [ ] 14.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [ ] 14.2 Run the API suites for the touched domains: `pnpm test:api -- /emissionFactors --coverage=false`, `/carbonInventories`, `/methodologies`.
- [ ] 14.3 Run `pnpm test:web`.
- [ ] 14.4 Manually verify the accepted risk is understood before handing over: while a year's set is being loaded row by row, capture shows it half-populated. Confirm this is still acceptable to the product owner, or promote the deferred import to its own change first.

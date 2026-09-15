## 1. Pre-conditions

- [ ] 1.1 Sync the working tree with `main`, run `pnpm install`.
- [ ] 1.2 Confirm the backfill year with the methodology team. The design proposes **2025**, on the evidence that 195 of the 284 seeded sources say `DEFRA 2025`. Note that this evidence describes the shipped catalogue, not necessarily the production table: factors an administrator added by hand get swept in too. Must be answered before the migration is written, because the column ends up `NOT NULL`.
- [ ] 1.3 Count what the migration's data transition will clear: editable footprints whose year differs from the catalogue year — **every** such year, not only those before 2025, since 2026 and any other year are equally affected. Break the count down by year and by submission state, and agree the communication before rolling out. This is a destructive bulk operation over user data.
- [ ] 1.4 Note that `fix/mati/activity-unit-factor-mismatch` is **postponed**, not a dependency. This change owns the introduction of the factor lookup in `syncCarbonInventoryLines` (section 6) and must leave it in a shape that fix can extend.

## 2. Database

- [ ] 2.1 In `packages/database/src/prisma/schema.prisma`, add `year Int` (required) to `EmissionFactor` (~line 672). No column is added to `CarbonInventoryLineFactor` — see design Decision 9.
- [ ] 2.2 Write the migration: add `year` nullable, `UPDATE emission_factor SET year = <confirmed year>` over every row, then `ALTER COLUMN year SET NOT NULL`. Do **not** add a column default — a default would let a factor be created without stating its year, which Decision 1 exists to prevent.
- [ ] 2.3 In the same migration, drop and recreate `emission_factor_unique_subcategory_dims_source` as `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", "year") WHERE "status" <> 'DELETED'`. No `COALESCE` wrapper: the column is `NOT NULL`. (`dimension_value_1_id` and `dimension_value_2_id` remain nullable — a pre-existing gap, out of scope.)
- [ ] 2.4 In the same migration, apply the data transition (design Decision 2): for every **editable** footprint whose `year` differs from the catalogue year, delete the `carbon_inventory_line_factor` rows of its lines where `emission_factor_id` is not null, together with their `carbon_inventory_line_result` rows. Cover parked (`OUTDATED`) lines as well as active ones. Leave submitted and verified footprints untouched.
- [ ] 2.5 Comment both the backfill value and the transition in the migration, naming the evidence, the confirmation from 1.2 and the count from 1.3, so a future reader knows neither was a default.
- [ ] 2.6 Add a TODO next to the index's `WHERE "status" <> 'DELETED'` recording that it must become `WHERE "status" = 'ACTIVE'` if a draft factor state is ever introduced.
- [ ] 2.7 Update the two schema comments that describe the partial index so they mention the year.

## 3. Types

- [ ] 3.1 Add `year` (required int) to `EmissionFactorBaseSchema` in `packages/types/src/baseSchemas/emissionFactor.ts`, with a wide static bound (roughly 1990 to 2100). `packages/types` is already consumed by both apps, so this needs no new shared constant and no `packages/constants` change.
- [ ] 3.2 Add the year to `CreateEmissionFactorRequestSchema`, `CreateEmissionFactorResponseSchema` and `EmissionFactorFormSchema`, required.
- [ ] 3.3 Add the year to `UpdateEmissionFactorRequestSchema` and `UpdateEmissionFactorResponseSchema`. The request schema is `.partial()`, so an update that omits the year leaves it unchanged.
- [ ] 3.4 Add the year to the `GetAllEmissionFactorsResponseSchema` row shape, so the maintainer grid can render the column.
- [ ] 3.5 Add the year to the emission-factor entry of `GetMethodologyExportResponseSchema`. `GetCarbonInventoryMethodologyExportResponseSchema` is a literal re-export, so the footprint-scoped export is covered with no further edit.
- [ ] 3.6 Do **not** add a year to `GetCarbonInventoryMethodologyResponse` nor to `GetEmissionFactorsResponse`. Both are deliberate omissions — see design Decisions 9 and 12.
- [ ] 3.7 Check whether the carbon-inventory line response already carries the line's `emissionFactorId`. Section 9 needs it on the client to hydrate `baseFactorId`; if it is absent, add it.

## 4. API — emission factor write path

- [ ] 4.1 In `apps/api/src/features/emissionFactors/helpers.ts`, extend `checkDuplicateEmissionFactor` to take the year and include it in its `where`. Keep its existing semantics: it keys on the subcategory plus the values of the dimensions marked required, and ignores `source`.
- [ ] 4.2 In the same file, narrow `validateSourceConsistency` to "one source per subcategory and year" by adding the year to its lookup.
- [ ] 4.3 Add a TODO on `validateSourceConsistency` recording that multi-source per `(subcategory, year)` was deliberately deferred, and that lifting it means deleting this function and adding `source` to the key in 4.1 — validation only, no migration.
- [ ] 4.4 Thread the year through `createEmissionFactor/service.ts`: require it, pass it to both checks, persist it, return it.
- [ ] 4.5 Thread the year through `updateEmissionFactor/service.ts`, including the case where the year alone changes and both checks must re-run against the new year.

## 5. API — capture read path

- [ ] 5.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`, add `year` to the `carbonInventory.findUnique` select — it currently selects only `methodologyVersionId`.
- [ ] 5.2 Filter the `emissionFactors` `where` by `year: <footprint year>`, ahead of `generateConvertedEmissionFactors`.
- [ ] 5.3 Add an explicit branch for a footprint whose `year` is null: return the methodology with no emission factors, without building a year filter. With `year` non-nullable, Prisma's generated `where` type does not accept `null`, so there is no filter value that means "matches nothing"; do not reach for a sentinel year either, since the wide schema bound does not forbid any particular value.
- [ ] 5.4 Do not add `year` to the factor `select` and do not touch `ConvertedEmissionFactor`. The response carries no per-factor year.
- [ ] 5.5 Add the year to `getAllEmissionFactors/service.ts`'s select and mapped response.

## 6. API — line synchronization

- [ ] 6.1 Move the `carbonInventory.findUnique` in `syncCarbonInventoryLines/service.ts` **inside** the `$transaction`, and add `year` to its select. Today it reads before the transaction opens, which leaves a window where a request validates against 2025, a concurrent request changes the year to 2026 and clears the lines, and the first one then writes a 2025 factor into a 2026 footprint.
- [ ] 6.2 Introduce the emission-factor lookup this service has never had: one `findMany` over every `baseFactorId` referenced by the create and update items, keyed into a map. `createLineFactor` currently persists everything straight from the payload, with no query against the factor table anywhere in the service.
- [ ] 6.3 Select `year`, `rateMeasurementUnitId` and the rate unit's `denominatorMeasurementUnit` in that lookup. Only the year is used here; the denominator is selected so the postponed `activity-unit-factor-mismatch` fix can add its check to the same query. Leave a TODO naming that fix.
- [ ] 6.4 Reject the request when a referenced factor's year differs from the footprint's year, on create and on update alike. Add a dedicated error class in `apps/api/src/features/carbonInventories/errors.ts`, with a Spanish user-facing message.
- [ ] 6.5 Leave `createLineFactor` otherwise untouched: no year is persisted on the line.

## 7. API — duplication, exports and the verifier report

- [ ] 7.1 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year: ef.year` to the `createMany` inside `cloneEmissionFactors` and to the `findMany` select that feeds it.
- [ ] 7.2 Add the year to `methodologyExportSelect` in `apps/api/src/features/methodologies/helpers.ts` and to the emission-factor mapper in `apps/api/src/features/methodologies/mappers.ts`. This covers both export endpoints at once.
- [ ] 7.3 In `apps/api/src/features/carbonInventories/getEmissionFactors/service.ts`, invert the source fallback chain so the frozen `factor.appliedFactorSource` wins over the live `emissionFactor.source`. No year is added to the rows.
- [ ] 7.4 In the same service, change the de-duplication key from the factor id alone to the frozen snapshot — factor id plus frozen source plus applied value — and adjust the row identifier to match. Once the frozen source wins, two lines that used the same factor either side of an administrative source edit hold different frozen sources, and keying on the id alone would drop one of them silently, by line order.
- [ ] 7.5 Add a TODO at the `gasBreakdownLines` computation recording that the gas breakdown is still read live because it is not frozen anywhere.
- [ ] 7.6 In `apps/api/src/features/carbonInventories/duplicateCarbonInventory/service.ts`, skip copying the `carbonInventoryLineFactor` and `carbonInventoryLineResult` of catalogue-backed lines when the source footprint's year has no catalogue, so the copy does not begin by rejecting its first save. Manual-factor lines are copied intact.

## 8. API and Web — clearing the stale factors on a year change

- [ ] 8.1 In `apps/api/src/features/carbonInventories/updateCarbonInventory/service.ts`, wrap the update in `prisma.$transaction`. It is a single `update` today.
- [ ] 8.2 When `data.year` is present and differs from the stored year, delete inside that transaction the `carbonInventoryLineFactor` rows of that footprint's lines **where `emissionFactorId` is not null**, together with their matching `carbonInventoryLineResult` rows.
- [ ] 8.3 Cover parked lines, not only active ones. `toggleManualTotalEmissions` holds non-direct lines as `OUTDATED` and reactivates them later without passing through `sync`, so an `OUTDATED` line left untouched would carry a factor from another year back into an active footprint.
- [ ] 8.4 Leave manual-factor lines untouched: their snapshot (`emissionFactorId` null) stays, and so do `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the input.
- [ ] 8.5 Leave every line's subcategory, dimension selections, measurement unit and quantity intact, and never pick a replacement factor.
- [ ] 8.6 Add `CarbonInventoryQueryKey.AttributesUpdateDependency` to `carbonInventoryKeys.methodology(id)` in `apps/web/src/api/query/carbonInventories/keys.ts`. Today that key is `[Root, id, Methodology]` and `useUpdateCarbonInventory`'s invalidation predicate never matches it, so after a year change capture would keep serving the previous year's factors for the whole `staleTime`.
- [ ] 8.7 In `useUpdateCarbonInventory`, also invalidate `EmissionsUpdateDependency` when the payload carries a year. Clearing results invalidates the emissions summary, the subcategory and sector rankings, the factor report and the reduction plan, all of which hang off that token and none of which the mutation touches today.

## 9. Web — factor identity

- [ ] 9.1 In `apps/web/src/screens/CarbonInventory/hooks/useEmissionCaptureData.ts:50`, hydrate `baseFactorId` from the line's existing factor snapshot instead of setting it to `null`. This is what makes a catalogue-backed line stay catalogue-backed across edits; without it, saving any edit — a comment is enough — writes a snapshot with no `emissionFactorId`, which the clearing would treat as manual and the validation would skip.
- [ ] 9.2 Verify the whole round trip by hand: load a footprint, edit only a comment on a catalogue-backed line, save, and confirm the new snapshot still references the factor.
- [ ] 9.3 Decide and record what happens to snapshots that already lost their reference. They cannot be recovered from the line alone; the practical options are to leave them as manual-looking rows, or to re-link them where subcategory, dimensions, unit and frozen source identify exactly one factor. Whichever is chosen, write it into the change rather than leaving it implicit.
- [ ] 9.4 Note in the PR description that this also fixes a live defect unrelated to the year: `getEmissionFactors` derives both the gas breakdown and the row identity from the `emissionFactor` relation, so edited lines currently lose their breakdown and appear as `manual-<id>` rows in the verifier's report.

## 10. Web — maintainer

- [ ] 10.1 Add the year to `toFormEmissionFactor` and to the form defaults in `useEmissionFactorsForm.ts`. A new row should default to the current year rather than to empty.
- [ ] 10.2 Add a required «Año» column to `useEmissionFactorColumns.tsx`, as a select over `[currentYear - 4 .. currentYear + 1]` derived beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT` in `apps/web/src/config/constants.ts`. No "sin año" option.
- [ ] 10.3 Add `year` to the create payload in `EmissionFactorsMaintainerScreen.tsx`, which enumerates the fields it sends.
- [ ] 10.4 Add `year` to the update payload in the same file, and — the one that is easy to miss — to the `hasRealChanges` comparison. Without it, an administrator who corrects only the year sees the row close with no error and nothing saved.
- [ ] 10.5 Add a TODO at `EmissionFactorsMaintainerScreen` recording that a year filter was deferred, and why filtering is risky here: rows are addressed by field-array index.

## 11. Web — capture and step 1

- [ ] 11.1 In `BusinessProfilingScreen.tsx`, add a confirmation modal shown when the year is changed while the footprint already has declared lines. The Spanish copy must say plainly that the lines using a catalogue factor will be left without one and will have to be reassigned, that their quantities and units are kept, and that manually entered factors are kept as they are.
- [ ] 11.2 Verify the cleared lines render through the existing "line without a factor" state, the same one a newly added line uses, and that `useLineValidation` and `fieldValidationService` already flag them as incomplete.
- [ ] 11.3 Check what capture shows when a footprint's year has no catalogue at all. The subcategory should still be usable through the manual factor, without a confusing empty dropdown.

## 12. Seed

- [ ] 12.1 Add the year to the emission-factor entry of the seed schema in `tools/seed/src/scripts/shared.ts` (~line 62), as a required field.
- [ ] 12.2 Thread it through `seedEmissionFactors.ts`, which currently flattens a fixed list of factor properties.
- [ ] 12.3 Set the year on every factor in `tools/seed/src/data/base/methodologies.json` to the year confirmed in 1.2, leaving all `source` strings untouched. Mirror the change in the testing dataset.
- [ ] 12.4 Add a TODO alongside `getMethodologyExport` recording the deferred bulk/atomic import, and noting that with no undated factors the whole catalogue must be restated annually.

## 13. Tests

- [ ] 13.1 Extend `apps/api/test/factories/emissionFactorFactory.ts` to take a year, defaulting to something explicit.
- [ ] 13.2 Review the four existing suites under `apps/api/test/features/emissionFactors/` — several assert on duplicate and source-conflict behaviour and will shift once the year enters both keys.
- [ ] 13.3 `createEmissionFactor` / `updateEmissionFactor`: same key different years succeeds; same key same year is rejected; different sources in the same subcategory and year is rejected; different sources across years succeeds; a missing year is rejected; a factor older than the UI window stays editable when its year is not being changed.
- [ ] 13.4 `getCarbonInventoryMethodology`: only the footprint's year is offered; a year with no catalogue offers nothing; a footprint with a null year offers nothing.
- [ ] 13.5 `syncCarbonInventoryLines`: a create referencing a factor from another year is rejected and persists nothing; an update to such a factor is rejected too; a line of the footprint's year is accepted.
- [ ] 13.6 `duplicateCarbonInventory` plus a year change: the copy keeps every snapshot verbatim; changing its year clears the catalogue-factor snapshots and their results while keeping subcategory, dimensions, unit and quantity; manual lines survive untouched; parked (`OUTDATED`) lines are cleared too; no replacement factor is chosen; and the whole thing is atomic with the year update. These tests are what keep design Decision 9 honest — the reported year is only derivable while this behaviour holds.
- [ ] 13.7 Duplicating a footprint whose year has no catalogue: the copy arrives with its catalogue-backed snapshots already cleared and its manual lines intact.
- [ ] 13.8 `duplicateMethodology`: cloned factors keep their year.
- [ ] 13.9 `getEmissionFactors`: editing a factor's source afterwards does not change what an existing footprint reports; and two lines that froze different snapshots of the same factor both appear.
- [ ] 13.10 Migration: against a database seeded with the undated catalogue plus footprints of several years, every factor ends dated, no `source` string changed, the column is `NOT NULL`, editable footprints of other years are cleared, and submitted ones are untouched.
- [ ] 13.11 Factor identity: a line edited without touching its factor keeps its `emissionFactorId`, and is still cleared as catalogue-backed when the year changes.

## 14. Verification

- [ ] 14.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [ ] 14.2 Run the API suites for the touched domains: `pnpm test:api -- /emissionFactors --coverage=false`, `/carbonInventories`, `/methodologies`.
- [ ] 14.3 Run `pnpm test:web`.
- [ ] 14.4 Before rolling out, re-confirm 1.2 and 1.3 with their answers written down, and announce the deployment window: while migrations have run and the previous container is still serving, creating an emission factor from the maintainer fails against the new `NOT NULL` column. Admin-only and retryable, but it should not be a surprise mid-catalogue-load.

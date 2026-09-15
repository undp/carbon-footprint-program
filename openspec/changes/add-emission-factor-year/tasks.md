## 1. Pre-conditions

- [ ] 1.1 Sync the working tree with `main`, run `pnpm install`.
- [ ] 1.2 Tell the methodology team the catalogue is being dated **2025**, and do not wait for an answer. The evidence is that 195 of the 284 seeded sources say `DEFRA 2025`; it describes the shipped catalogue rather than the production table, so a factor an administrator added by hand for some other period is swept into 2025 along with the rest. Accepted: correcting one afterwards is editing a row in the maintainer, and the year being explicit is what makes that correction possible at all.
- [ ] 1.3 Take a `pg_dump` immediately before running the migration. The clearing is destructive and irreversible in place; this is the whole rollback plan, and it is deliberately not built into the migration.
- [ ] 1.4 Note that `fix/mati/activity-unit-factor-mismatch` is **postponed**, not a dependency. This change owns the introduction of the factor lookup in `syncCarbonInventoryLines` (section 6) and must leave it in a shape that fix can extend.

## 2. Database

- [ ] 2.1 In `packages/database/src/prisma/schema.prisma`, add `year Int` (required) to `EmissionFactor` (~line 672). No column is added to `CarbonInventoryLineFactor` — see design Decision 9.
- [ ] 2.2 Write the migration: add `year` nullable, `UPDATE emission_factor SET year = 2025` over every row, then `ALTER COLUMN year SET NOT NULL`. Do **not** add a column default — a default would let a factor be created without stating its year, which Decision 1 exists to prevent.
- [ ] 2.3 In the same migration, drop and recreate `emission_factor_unique_subcategory_dims_source` as `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", "year") WHERE "status" <> 'DELETED'`. No `COALESCE` wrapper: the column is `NOT NULL`. (`dimension_value_1_id` and `dimension_value_2_id` remain nullable — a pre-existing gap, out of scope.)
- [ ] 2.4 In the same migration, apply the data transition (design Decision 2): for **every** footprint whose `year` differs from 2025 — editable, submitted and verified alike — delete the `carbon_inventory_line_factor` rows of its lines together with their `carbon_inventory_line_result` rows. Do not attempt to reproduce the "editable" state in SQL: it is derived from the footprint's submissions, and `carbon_inventory.is_editable` is a free-floating flag nothing maintains against them.
- [ ] 2.5 Scope that delete to the **active** input of each line (`carbon_inventory_line_input.is_active = true`), covering `ACTIVE` and `OUTDATED` lines. Superseded input versions keep their snapshots: every reader filters `isActive: true`, so they are audit trail nothing consults.
- [ ] 2.6 Select the rows to delete as those whose `emission_factor_id` is not null **or** whose `applied_factor_source` is not one of the custom sources. The second half is what reaches the snapshots damaged by the identity defect: they lost their factor id but kept the real catalogue source, which is what tells them apart from a manual line, whose snapshot has a null id and a custom source. Manual lines are left untouched, `manual_factor` and `manual_factor_source` on the input included.
- [ ] 2.7 Comment the backfill value, the transition, and — in its own paragraph — that erasing the factors of a submitted footprint destroys the record of what was declared, is contrary to what GHG Protocol and ISO 14064-1 ask to preserve, and is admissible here only because no footprint on the platform holds data declared in earnest. It must not read as precedent.
- [ ] 2.8 Add a TODO next to the index's `WHERE "status" <> 'DELETED'` recording that it must become `WHERE "status" = 'ACTIVE'` if a draft factor state is ever introduced.
- [ ] 2.9 Update the two schema comments that describe the partial index so they mention the year.

## 3. Types

- [ ] 3.1 Add `year` (required int) to `EmissionFactorBaseSchema` in `packages/types/src/baseSchemas/emissionFactor.ts`, with a wide static bound (roughly 1990 to 2100). `packages/types` is already consumed by both apps, so this needs no new shared constant and no `packages/constants` change.
- [ ] 3.2 Add the year to `CreateEmissionFactorRequestSchema`, `CreateEmissionFactorResponseSchema` and `EmissionFactorFormSchema`, required.
- [ ] 3.3 Add the year to `UpdateEmissionFactorRequestSchema` and `UpdateEmissionFactorResponseSchema`. The request schema is `.partial()`, so an update that omits the year leaves it unchanged.
- [ ] 3.4 Add the year to the `GetAllEmissionFactorsResponseSchema` row shape, so the maintainer grid can render the column.
- [ ] 3.5 Add the year to the emission-factor entry of `GetMethodologyExportResponseSchema`. `GetCarbonInventoryMethodologyExportResponseSchema` is a literal re-export, so the footprint-scoped export is covered with no further edit.
- [ ] 3.6 Do **not** add a year to `GetCarbonInventoryMethodologyResponse` nor to `GetEmissionFactorsResponse`. Both are deliberate omissions — see design Decisions 9 and 12.
- [ ] 3.7 Nothing to do for the line's factor id — PR 647 landed it as `baseFactorId`, the same name the sync request already uses, so a line round-trips unchanged. Read the note in section 9 before touching anything that reads it.
- [ ] 3.8 Add the ids of the lines left without a factor to the `syncCarbonInventoryLines` response schema, so the client can tell the user which ones need a factor again (section 6). **Two schemas, not one**: `syncCarbonInventoryLines/schemas.ts` declares its own `.strict()` `LineItemSchema` that the sync response uses, structurally parallel to the one in `getCarbonInventoryById/schemas.ts`, and `mapLineToResponse` feeds both. A field added to only one is stripped by the serializer on the other. PR 647 hit exactly this.

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

- [ ] 6.1 Add `year` to the `carbonInventory.findUnique` select in `syncCarbonInventoryLines/service.ts`. Leave the read where it is, before the transaction opens: with the interleaving accepted (design Decision 7), moving it buys nothing at `READ COMMITTED`.
- [ ] 6.2 Introduce the emission-factor lookup this service has never had: one `findMany` over every `baseFactorId` referenced by the create and update items, keyed into a map. Those ids are always the numeric id of a real `emission_factor` row: `useEmissionEditorForm` sends `factor.originalEmissionFactorId ?? factor.id`, so the composite id of a converted factor (`123-1`) never reaches the payload. `createLineFactor` currently persists everything straight from the payload, with no query against the factor table anywhere in the service.
- [ ] 6.3 Select `year`, `rateMeasurementUnitId` and the rate unit's `denominatorMeasurementUnit` in that lookup. Only the year is used here; the denominator is selected so the postponed `activity-unit-factor-mismatch` fix can add its check to the same query. Leave a TODO naming that fix.
- [ ] 6.4 When a referenced factor's year differs from the footprint's, persist the line **without** calling `createLineFactor` or `createLineResult` for it, on create and on update alike. The line keeps its subcategory, dimension selections, measurement unit, quantity, comment and files. Do not reject the request and do not touch the other lines. There is no new error class: this is reconciliation, not validation — see design Decision 7.
- [ ] 6.5 Collect the affected line ids and return them in the response (schema in 3.8).
- [ ] 6.6 Leave manual-factor lines out of the rule entirely: their `baseFactorId` is null, so they never enter the lookup.
- [ ] 6.7 Leave `createLineFactor` otherwise untouched: no year is persisted on the line.

## 7. API — duplication and exports

- [ ] 7.1 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year: ef.year` to the `createMany` inside `cloneEmissionFactors` and to the `findMany` select that feeds it.
- [ ] 7.2 Add the year to `methodologyExportSelect` in `apps/api/src/features/methodologies/helpers.ts` and to the emission-factor mapper in `apps/api/src/features/methodologies/mappers.ts`. This covers both export endpoints at once.
- [ ] 7.3 Leave `duplicateCarbonInventory` alone. It copies snapshots verbatim, which is correct once the migration has cleared every footprint of another year: the copy inherits something already consistent. Leave `reviewSubmission` alone for the same reason — a footprint returned with observations comes back editable holding factors that are already of its own year. Both were candidates for a clearing helper; neither has a source of mismatched data left. See design Decision 2.
- [ ] 7.4 Leave `getEmissionFactors` alone as well, beyond not adding a year to its rows. It still reads the factor's source and gas breakdown live, so an administrator editing a factor changes what an already-verified footprint reports. Out of scope by decision — see design Decision 12 — and nothing about the year makes it worse: a new year's factors are new rows, not edits to existing ones.

## 8. API and Web — clearing the stale factors on a year change

- [ ] 8.1 In `apps/api/src/features/carbonInventories/updateCarbonInventory/service.ts`, wrap the update in `prisma.$transaction`. It is a single `update` today, and the year change and the clearing have to land together or not at all.
- [ ] 8.2 When `data.year` is present and differs from the stored year, delete inside that transaction the `carbonInventoryLineFactor` rows of that footprint's lines **where `emissionFactorId` is not null**, together with their matching `carbonInventoryLineResult` rows.
- [ ] 8.3 Cover parked lines, not only active ones. `toggleManualTotalEmissions` holds non-direct lines as `OUTDATED` and reactivates them later without passing through `sync`, so an `OUTDATED` line left untouched would carry a factor from another year back into an active footprint.
- [ ] 8.4 Leave manual-factor lines untouched: their snapshot (`emissionFactorId` null) stays, and so do `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the input.
- [ ] 8.5 Leave every line's subcategory, dimension selections, measurement unit and quantity intact, and never pick a replacement factor.
- [ ] 8.6 Add `CarbonInventoryQueryKey.AttributesUpdateDependency` to `carbonInventoryKeys.methodology(id)` in `apps/web/src/api/query/carbonInventories/keys.ts`. Today that key is `[Root, id, Methodology]` and `useUpdateCarbonInventory`'s invalidation predicate never matches it, so after a year change capture would keep serving the previous year's factors for the whole `staleTime`.
- [ ] 8.7 In `useUpdateCarbonInventory`, also invalidate `EmissionsUpdateDependency` when the payload carries a year. Clearing results invalidates the emissions summary, the subcategory and sector rankings, the factor report and the reduction plan, all of which hang off that token and none of which the mutation touches today.

## 9. Factor identity — landed in PR 647, not in this change

- [x] 9.1 PR 647 (`fix/mati/line-factor-identity`) is merged, landing on `main` as f989cbdc. It is a hard dependency: the reconciliation looks the year up through the line's factor id, so without it the edited lines — the ones most likely to hold a stale factor — are exactly the ones skipped.
- [ ] 9.2 What it did, for reference: `mapLineToResponse` now returns `baseFactorId`, both line schemas carry it, and `useEmissionCaptureData` hydrates it instead of nulling it. It also fixed a live defect unrelated to the year — `getEmissionFactors` derives the gas breakdown and the row identity from the `emissionFactor` relation, so edited lines were losing their breakdown and showing as `manual-<id>` in the verifier's report.
- [ ] 9.3 Nothing to decide about the snapshots already damaged: task 2.6 clears them along with the rest, identifying them by a null `emission_factor_id` with a non-custom frozen source. No attempt is made to re-link them — with no real data behind it, a reconciliation query would be written and justified to rescue nothing.
- [ ] 9.4 Note that nothing reads `baseFactorId` as a manual-factor signal, verified in PR 647: it is only ever written, and every manual check is `factorSource ∈ CUSTOM_FACTOR_SOURCES`. The clearing and the reconciliation can rely on the id without contradicting that.

## 10. Web — maintainer

- [ ] 10.1 Add the year to `toFormEmissionFactor` and to the form defaults in `useEmissionFactorsForm.ts`. A new row should default to the current year rather than to empty.
- [ ] 10.2 Add a required «Año» column to `useEmissionFactorColumns.tsx`, as a select over `[currentYear - 4 .. currentYear + 1]` derived beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT` in `apps/web/src/config/constants.ts`. No "sin año" option.
- [ ] 10.3 When a row's year falls outside that window, add it to that row's options. A MUI `Select` whose value is not among its options renders blank and warns on the console, so without this the grid misreports the data it exists to show. Per row, so an obsolete year cannot be assigned to a different factor.
- [ ] 10.4 Add `year` to the create payload in `EmissionFactorsMaintainerScreen.tsx`, which enumerates the fields it sends.
- [ ] 10.5 Add `year` to the update payload in the same file, and — the one that is easy to miss — to the `hasRealChanges` comparison. Without it, an administrator who corrects only the year sees the row close with no error and nothing saved.
- [ ] 10.6 Add a TODO at `EmissionFactorsMaintainerScreen` recording that a year filter was deferred, and why filtering is risky here: rows are addressed by field-array index.

## 11. Web — capture and step 1

- [ ] 11.1 Put the confirmation inside `useBusinessProfilingSubmit`, not in the screen. `BusinessProfilingScreen` instantiates that hook twice — once for advancing, once for saving on the way out — and both exits funnel through the same `submit`, so guarding there covers both and covers a third exit if one is ever added.
- [ ] 11.2 The Spanish copy must say plainly that the lines using a catalogue factor will be left without one and will have to be reassigned, that their quantities and units are kept, and that manually entered factors are kept as they are. It is shown only when the year actually changed and the footprint already has declared lines.
- [ ] 11.3 Show the lines the server reports as left without a factor (task 6.6) after a capture save, so a reconciliation is never silent on screen.
- [ ] 11.4 Verify the cleared lines render through the existing "line without a factor" state, the same one a newly added line uses, and that `useLineValidation` and `fieldValidationService` already flag them as incomplete.
- [ ] 11.5 Check what capture shows when a footprint's year has no catalogue at all. The subcategory should still be usable through the manual factor, without a confusing empty dropdown.

## 12. Seed

- [ ] 12.1 Add the year to the emission-factor entry of the seed schema in `tools/seed/src/scripts/shared.ts` (~line 62), as a required field.
- [ ] 12.2 Thread it through `seedEmissionFactors.ts`, which currently flattens a fixed list of factor properties.
- [ ] 12.3 Set `year: 2025` on every factor in `tools/seed/src/data/base/methodologies.json`, leaving all `source` strings untouched. Mirror the change in the testing dataset.
- [ ] 12.4 The 2026 set is tracked as issue 651, not part of this one. With the catalogue dated 2025, footprints of the current year are cleared by the migration and find nothing to choose from until it lands; the manual factor is the documented path in between. Loading it as seed data plus a script sidesteps the deferred bulk import instead of typing 284 rows into the grid.
- [ ] 12.5 Add a TODO alongside `getMethodologyExport` recording the deferred bulk/atomic import, and noting that with no undated factors the whole catalogue must be restated annually.

## 13. Tests

- [ ] 13.1 Extend `apps/api/test/factories/emissionFactorFactory.ts` to take a year, defaulting to something explicit.
- [ ] 13.2 Review the four existing suites under `apps/api/test/features/emissionFactors/` — several assert on duplicate and source-conflict behaviour and will shift once the year enters both keys.
- [ ] 13.3 `createEmissionFactor` / `updateEmissionFactor`: same key different years succeeds; same key same year is rejected; different sources in the same subcategory and year is rejected; different sources across years succeeds; a missing year is rejected; a factor older than the UI window stays editable when its year is not being changed.
- [ ] 13.4 `getCarbonInventoryMethodology`: only the footprint's year is offered; a year with no catalogue offers nothing; a footprint with a null year offers nothing.
- [ ] 13.5 `syncCarbonInventoryLines`: a create referencing a factor of another year persists the line with no snapshot and no result and reports it in the response; the rest of the payload is persisted normally; an update to such a factor behaves the same; a line of the footprint's year is persisted with its snapshot and result; a manual line is untouched.
- [ ] 13.6 `duplicateCarbonInventory` plus a year change: the copy keeps every snapshot verbatim; changing its year clears the catalogue-factor snapshots and their results while keeping subcategory, dimensions, unit and quantity; manual lines survive untouched; parked (`OUTDATED`) lines are cleared too; no replacement factor is chosen; and the whole thing is atomic with the year update. These tests are what keep design Decision 9 honest — the reported year is only derivable while this behaviour holds.
- [ ] 13.7 `duplicateMethodology`: cloned factors keep their year.
- [ ] 13.8 Migration: against a database seeded with the undated catalogue plus footprints of several years and states, every factor ends dated, no `source` string changed, the column is `NOT NULL`, every footprint of another year is cleared whatever its state, footprints of 2025 are untouched, superseded input versions keep their snapshots, manual lines survive, and a damaged snapshot — null factor id with a catalogue source — is cleared too.
- [ ] 13.9 Factor identity: PR 647 covers the round trip in the sync integration suite. What is left for this change is that a line edited without touching its factor is still treated as catalogue-backed when the year changes — assert it in the year-change test rather than duplicating 647's.

## 14. Verification

- [ ] 14.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [ ] 14.2 Run the API suites for the touched domains: `pnpm test:api -- /emissionFactors --coverage=false`, `/carbonInventories`, `/methodologies`.
- [ ] 14.3 Run `pnpm test:web`.
- [ ] 14.4 Before rolling out, take the `pg_dump` from 1.3 and announce the deployment window. While the migration has run and the previous container is still serving, creating an emission factor from the maintainer fails against the new `NOT NULL` column, and that container's `sync` still accepts a factor of any year, so it can write back what the migration just cleared. Both are accepted rather than closed with a maintenance window.
- [ ] 14.5 After the deployment settles, run a verification query listing every `carbon_inventory_line_factor` on an active input whose factor's year differs from its footprint's year. It should return nothing; anything it returns is residue written during the window, which would otherwise sit unnoticed until someone happened to save that subcategory again. Record the result.

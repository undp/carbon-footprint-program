## 1. Pre-conditions

- [x] 1.1 Sync the working tree with `main`, run `pnpm install`.
- [ ] 1.2 Tell the methodology team the catalogue is being dated **2025**, and do not wait for an answer. The evidence is that 195 of the 284 seeded sources say `DEFRA 2025`; it describes the shipped catalogue rather than the production table, so a factor an administrator added by hand for some other period is swept into 2025 along with the rest. Accepted: correcting one afterwards is editing a row in the maintainer, and the year being explicit is what makes that correction possible at all.
- [ ] 1.3 Take a `pg_dump` immediately before running the migration. The clearing is destructive and irreversible in place; this is the whole rollback plan, and it is deliberately not built into the migration.
- [x] 1.4 Note that `fix/mati/activity-unit-factor-mismatch` is **postponed**, not a dependency. This change owns the introduction of the factor lookup in `syncCarbonInventoryLines` (section 6) and must leave it in a shape that fix can extend.

## 2. Database

- [x] 2.1 In `packages/database/src/prisma/schema.prisma`, add `year Int` (required) to `EmissionFactor` (~line 672). No column is added to `CarbonInventoryLineFactor` — see design Decision 9.
- [x] 2.2 Write the migration: add `year` nullable, `UPDATE emission_factor SET year = 2025` over every row, then `ALTER COLUMN year SET NOT NULL`. Do **not** add a column default — a default would let a factor be created without stating its year, which Decision 1 exists to prevent.
- [x] 2.3 In the same migration, drop and recreate `emission_factor_unique_subcategory_dims_source` as `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", "year") WHERE "status" <> 'DELETED'`. No `COALESCE` wrapper: the column is `NOT NULL`. (`dimension_value_1_id` and `dimension_value_2_id` remain nullable — a pre-existing gap, out of scope.)
- [x] 2.4 In the same migration, apply the data transition (design Decision 2): for **every** footprint whose `year` differs from 2025 — editable, submitted and verified alike — delete the `carbon_inventory_line_factor` rows of its lines together with their `carbon_inventory_line_result` rows. Do not attempt to reproduce the "editable" state in SQL: it is derived from the footprint's submissions, and `carbon_inventory.is_editable` is a free-floating flag nothing maintains against them.
- [x] 2.5 Scope that delete to the **active** input of each line (`carbon_inventory_line_input.is_active = true`), covering `ACTIVE` and `OUTDATED` lines. Superseded input versions keep their snapshots: every reader filters `isActive: true`, so they are audit trail nothing consults.
- [x] 2.6 Select the rows to delete as those whose `emission_factor_id` is not null **or** whose `applied_factor_source` is not one of the custom sources. The second half is what reaches the snapshots damaged by the identity defect: they lost their factor id but kept the real catalogue source, which is what tells them apart from a manual line, whose snapshot has a null id and a custom source. Manual lines are left untouched, `manual_factor` and `manual_factor_source` on the input included.
- [x] 2.7 Comment the backfill value, the transition, and — in its own paragraph — that erasing the factors of a submitted footprint destroys the record of what was declared, is contrary to what GHG Protocol and ISO 14064-1 ask to preserve, and is admissible here only because no footprint on the platform holds data declared in earnest. It must not read as precedent.
- [x] 2.8 Add a TODO next to the index's `WHERE "status" <> 'DELETED'` recording that it must become `WHERE "status" = 'ACTIVE'` if a draft factor state is ever introduced.
- [x] 2.9 Update the two schema comments that describe the partial index so they mention the year.

## 3. Types

- [x] 3.1 Add `year` (required int) to `EmissionFactorBaseSchema` in `packages/types/src/baseSchemas/emissionFactor.ts`, with a wide static bound (roughly 1990 to 2100). `packages/types` is already consumed by both apps, so this needs no new shared constant and no `packages/constants` change.
- [x] 3.2 Add the year to `CreateEmissionFactorRequestSchema`, `CreateEmissionFactorResponseSchema` and `EmissionFactorFormSchema`, required.
- [x] 3.3 Add the year to `UpdateEmissionFactorRequestSchema` and `UpdateEmissionFactorResponseSchema`. The request schema is `.partial()`, so an update that omits the year leaves it unchanged.
- [x] 3.4 Add the year to the `GetAllEmissionFactorsResponseSchema` row shape, so the maintainer grid can render the column.
- [x] 3.5 Add the year to the emission-factor entry of `GetMethodologyExportResponseSchema`. `GetCarbonInventoryMethodologyExportResponseSchema` is a literal re-export, so the footprint-scoped export is covered with no further edit.
- [x] 3.6 Do **not** add a year to `GetCarbonInventoryMethodologyResponse` nor to `GetEmissionFactorsResponse`. Both are deliberate omissions — see design Decisions 9 and 12.
- [x] 3.7 Nothing to do for the line's factor id — PR 647 landed it as `baseFactorId`, the same name the sync request already uses, so a line round-trips unchanged. Read the note in section 9 before touching anything that reads it. If this change ever does add a field to a line, note that there are **two** parallel `.strict()` line schemas — `getCarbonInventoryById` and `syncCarbonInventoryLines`, both fed by `mapLineToResponse` — and a field added to only one is stripped by the serializer on the other.

## 4. API — emission factor write path

- [x] 4.1 In `apps/api/src/features/emissionFactors/helpers.ts`, extend `checkDuplicateEmissionFactor` to take the year and include it in its `where`. Keep its existing semantics: it keys on the subcategory plus the values of the dimensions marked required, and ignores `source`.
- [x] 4.2 In the same file, narrow `validateSourceConsistency` to "one source per subcategory and year" by adding the year to its lookup.
- [x] 4.3 Add a TODO on `validateSourceConsistency` recording that multi-source per `(subcategory, year)` was deliberately deferred, and that lifting it means deleting this function and adding `source` to the key in 4.1 — validation only, no migration.
- [x] 4.4 Thread the year through `createEmissionFactor/service.ts`: require it, pass it to both checks, persist it, return it.
- [x] 4.5 Thread the year through `updateEmissionFactor/service.ts`, including the case where the year alone changes and both checks must re-run against the new year.

## 5. API — capture read path

- [x] 5.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`, add `year` to the `carbonInventory.findUnique` select — it currently selects only `methodologyVersionId`.
- [x] 5.2 Filter the `emissionFactors` `where` by `year: <footprint year>`, ahead of `generateConvertedEmissionFactors`.
- [x] 5.3 Add an explicit branch for a footprint whose `year` is null: return the methodology with no emission factors, without building a year filter. With `year` non-nullable, Prisma's generated `where` type does not accept `null`, so there is no filter value that means "matches nothing"; do not reach for a sentinel year either, since the wide schema bound does not forbid any particular value.
- [x] 5.4 Do not add `year` to the factor `select` and do not touch `ConvertedEmissionFactor`. The response carries no per-factor year.
- [x] 5.5 Add the year to `getAllEmissionFactors/service.ts`'s select and mapped response.

## 6. API — line synchronization

- [x] 6.1 Add `year` to the `carbonInventory.findUnique` select in `syncCarbonInventoryLines/service.ts`. Leave the read where it is, before the transaction opens: with the interleaving accepted (design Decision 7), moving it buys nothing at `READ COMMITTED`.
- [x] 6.2 Introduce the emission-factor lookup this service has never had: one `findMany` over every `baseFactorId` referenced by the create and update items, keyed into a map. Those ids are always the numeric id of a real `emission_factor` row: `useEmissionEditorForm` sends `factor.originalEmissionFactorId ?? factor.id`, so the composite id of a converted factor (`123-1`) never reaches the payload. `createLineFactor` currently persists everything straight from the payload, with no query against the factor table anywhere in the service.
- [x] 6.3 Select `year`, `rateMeasurementUnitId` and the rate unit's `denominatorMeasurementUnit` in that lookup. Only the year is used here; the denominator is selected so the postponed `activity-unit-factor-mismatch` fix can add its check to the same query. Leave a TODO naming that fix.
- [x] 6.4 When a referenced factor's year differs from the footprint's, persist the line **without** calling `createLineFactor` or `createLineResult` for it, on create and on update alike. The line keeps its subcategory, dimension selections, measurement unit, quantity, comment and files. Do not reject the request and do not touch the other lines. There is no new error class and no report of what was cleared: this is reconciliation, not validation — see design Decision 7.
- [x] 6.5 Split the three shapes that arrive with a null `baseFactorId` instead of reading all of them as manual: nothing frozen yet (no applied factor value — a line being filled in, or a direct-total line) is persisted as before; a custom source is a manual factor and is left alone; a _catalogue_ source with no reference is a snapshot damaged before PR 647, or a forged payload, and is reconciled like a factor of another year. Reading the third as manual is what would make it permanent — it round-trips as `baseFactorId: null`, so no later save looks at it again, while the non-null source keeps `fieldValidationService` from flagging the line. `createLineResult` takes the verdict so a direct total, typed rather than computed, is never dropped with a reconciled factor.
- [x] 6.7 Check the referenced factor belongs to the line's subcategory, reconciling the line the same way when it does not. Nothing else ties `baseFactorId` to the line, so a crafted payload could otherwise freeze a factor of an unrelated subcategory onto it — the same gap the year check closes, and the lookup is already paying for the round trip. An update reads its line's subcategory from the validation query rather than a second one. A subcategory belongs to one category of one methodology version, so the version is covered by the same comparison.
- [x] 6.6 Leave `createLineFactor` otherwise untouched: no year is persisted on the line.
- [x] 6.8 Give `clearCatalogueFactorsOfLines` the migration's definition of catalogue-backed, not the `emissionFactorId` half of it. The migration only clears the damaged snapshots on footprints of another year, so the ones on the catalogue's own year reach the year change intact; missing them there is permanent, and the footprint reports a total from the previous year's factors while `carbon_inventory_subtotals_view` counts the line as completed.
- [x] 6.9 Read only ACTIVE factors in the lookup, the status the capture selector already filters on. A deleted factor stays out of the map and the line is reconciled like one of another year — the catalogue row is gone, so nothing is left to check the frozen value and source against, and a client holding a page opened before the deletion would otherwise freeze them onto the line verbatim. Covered on create and on update.

## 7. API — duplication and exports

- [x] 7.1 In `apps/api/src/features/methodologies/duplicateMethodology/helpers.ts`, add `year: ef.year` to the `createMany` inside `cloneEmissionFactors` and to the `findMany` select that feeds it.
- [x] 7.2 Add the year to `methodologyExportSelect` in `apps/api/src/features/methodologies/helpers.ts` and to the emission-factor mapper in `apps/api/src/features/methodologies/mappers.ts`. This covers both export endpoints at once.
- [x] 7.3 Leave `duplicateCarbonInventory` alone. It copies snapshots verbatim, which is correct once the migration has cleared every footprint of another year: the copy inherits something already consistent. Leave `reviewSubmission` alone for the same reason — a footprint returned with observations comes back editable holding factors that are already of its own year. Both were candidates for a clearing helper; neither has a source of mismatched data left. See design Decision 2.
- [x] 7.4 Leave `getEmissionFactors` alone as well, beyond not adding a year to its rows. It still reads the factor's source and gas breakdown live, so an administrator editing a factor changes what an already-verified footprint reports. Out of scope by decision — see design Decision 12 — and nothing about the year makes it worse: a new year's factors are new rows, not edits to existing ones.
- [x] 7.5 Scope `getCarbonInventoryMethodologyExport` to the footprint's year. It shared the unfiltered select with the administrator's export, so the workbook bundled in the footprint's ZIP listed factors of every year — rows capture never offers. `findMethodologyExportByVersionId` now takes the year and both call sites state their intent. A footprint with no year yet keeps the whole catalogue, unlike the capture selector which offers it nothing: a selector offering an unusable factor is a defect, a document listing one is context.

## 8. API and Web — clearing the stale factors on a year change

- [x] 8.1 In `apps/api/src/features/carbonInventories/updateCarbonInventory/service.ts`, wrap the update in `prisma.$transaction`. It is a single `update` today, and the year change and the clearing have to land together or not at all.
- [x] 8.2 When `data.year` is present and differs from the stored year, delete inside that transaction the `carbonInventoryLineFactor` rows of that footprint's lines **where `emissionFactorId` is not null**, together with their matching `carbonInventoryLineResult` rows.
- [x] 8.3 Cover parked lines, not only active ones. `toggleManualTotalEmissions` holds non-direct lines as `OUTDATED` and reactivates them later without passing through `sync`, so an `OUTDATED` line left untouched would carry a factor from another year back into an active footprint.
- [x] 8.4 Leave manual-factor lines untouched: their snapshot (`emissionFactorId` null) stays, and so do `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the input.
- [x] 8.5 Leave every line's subcategory, dimension selections, measurement unit and quantity intact, and never pick a replacement factor.
- [x] 8.6 Add `CarbonInventoryQueryKey.AttributesUpdateDependency` to `carbonInventoryKeys.methodology(id)` in `apps/web/src/api/query/carbonInventories/keys.ts`. Today that key is `[Root, id, Methodology]` and `useUpdateCarbonInventory`'s invalidation predicate never matches it, so after a year change capture would keep serving the previous year's factors for the whole `staleTime`.
- [x] 8.7 In `useUpdateCarbonInventory`, also invalidate `EmissionsUpdateDependency` when the payload carries a year. Clearing results invalidates the emissions summary, the subcategory and sector rankings, the factor report and the reduction plan, all of which hang off that token and none of which the mutation touches today.

## 9. Factor identity — landed in PR 647, not in this change

- [x] 9.1 PR 647 (`fix/mati/line-factor-identity`) is merged, landing on `main` as f989cbdc. It is a hard dependency: the reconciliation looks the year up through the line's factor id, so without it the edited lines — the ones most likely to hold a stale factor — are exactly the ones skipped.
- [x] 9.2 What it did, for reference: `mapLineToResponse` now returns `baseFactorId`, both line schemas carry it, and `useEmissionCaptureData` hydrates it instead of nulling it. It also fixed a live defect unrelated to the year — `getEmissionFactors` derives the gas breakdown and the row identity from the `emissionFactor` relation, so edited lines were losing their breakdown and showing as `manual-<id>` in the verifier's report.
- [x] 9.3 Nothing to decide about the snapshots already damaged: task 2.6 clears them along with the rest, identifying them by a null `emission_factor_id` with a non-custom frozen source. No attempt is made to re-link them — with no real data behind it, a reconciliation query would be written and justified to rescue nothing.
- [x] 9.4 Note that nothing reads `baseFactorId` as a manual-factor signal, verified in PR 647: it is only ever written, and every manual check is `factorSource ∈ CUSTOM_FACTOR_SOURCES`. The clearing and the reconciliation can rely on the id without contradicting that.

## 10. Web — maintainer

- [x] 10.1 Add the year to `toFormEmissionFactor` and to the form defaults in `useEmissionFactorsForm.ts`. A new row should default to the current year rather than to empty.
- [x] 10.2 Add a required «Año» column to `useEmissionFactorColumns.tsx`, as a select over `[currentYear - 4 .. currentYear + 1]` derived beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT` in `apps/web/src/config/constants.ts`. No "sin año" option.
- [x] 10.3 Add `year` to the create payload in `EmissionFactorsMaintainerScreen.tsx`, which enumerates the fields it sends.
- [x] 10.4 Add `year` to the update payload in the same file, and — the one that is easy to miss — to the `hasRealChanges` comparison. Without it, an administrator who corrects only the year sees the row close with no error and nothing saved.
- [x] 10.5 Add a TODO at `EmissionFactorsMaintainerScreen` recording that showing a year which has fallen outside the offered window was deferred — a MUI `Select` renders a value that is not among its options as blank, which will not bite until the sliding window passes 2025 — recording that a year filter was deferred, and why filtering is risky here: rows are addressed by field-array index.

## 11. Web — capture and step 1

- [x] 11.1 Put the confirmation inside `useBusinessProfilingSubmit`, not in the screen. `BusinessProfilingScreen` instantiates that hook twice — once for advancing, once for saving on the way out — and both exits funnel through the same `submit`, so guarding there covers both and covers a third exit if one is ever added.
- [x] 11.2 The Spanish copy must say plainly that the lines using a catalogue factor will be left without one and will have to be reassigned, that their quantities and units are kept, and that manually entered factors are kept as they are. It is shown only when the year actually changed and the footprint already has declared lines.
- [x] 11.3 Verify the cleared lines render through the existing "line without a factor" state, the same one a newly added line uses, and that `useLineValidation` and `fieldValidationService` already flag them as incomplete. This is what carries the whole notice: nothing tells the user a factor was removed, so the line has to look unfinished on its own.
- [x] 11.4 Check what capture shows when a footprint's year has no catalogue at all. The subcategory should still be usable through the manual factor, without a confusing empty dropdown.

- [x] 11.5 Say in capture when the footprint's year has no catalogue at all: one notice for the whole footprint, naming the year and the two ways out (the manual factor, and changing the year in step 1). Until the 2026 set lands, every footprint of the current year meets an empty «Fuente» dropdown on every line, which reads as a broken screen rather than as something not yet available. Derived from the methodology already in memory — no new endpoint, and not the per-line collection declined in Decision 7.
- [x] 11.6 Announce the source a row adopts when its year changes. The lock groups by `(subcategoría, año)` and the year is editable, so the write-back effect can replace a source the user typed. The server would answer the alternative with a 409, so the end state is right, but a silent replacement is indistinguishable from the field not having saved. Only a non-empty value that differs is announced.

## 12. Seed

- [x] 12.1 Add the year to the emission-factor entry of the seed schema in `tools/seed/src/scripts/shared.ts` (~line 62), as a required field.
- [x] 12.2 Thread it through `seedEmissionFactors.ts`, which currently flattens a fixed list of factor properties.
- [x] 12.3 Set `year: 2025` on every factor in `tools/seed/src/data/base/methodologies.json`, leaving all `source` strings untouched. Mirror the change in the testing dataset.
- [x] 12.4 The 2026 set is tracked as issue 651, not part of this one. With the catalogue dated 2025, footprints of the current year are cleared by the migration and find nothing to choose from until it lands; the manual factor is the documented path in between. Loading it as seed data plus a script sidesteps the deferred bulk import instead of typing 284 rows into the grid.
- [x] 12.5 Add a TODO alongside `getMethodologyExport` recording the deferred bulk/atomic import, and noting that with no undated factors the whole catalogue must be restated annually.
- [x] 12.6 Carry the reworked `emission-factors-maintainer` help panel to already-seeded databases with a migration. `seedStandaloneExplanations` upserts, but `seed.ts` aborts on the country-count gate before reaching it, so an installed deployment would keep the pre-year text behind the (i) of the very screen this change reworks. Same shape as `20260915140000_rename_reduction_help_to_initiatives`: guarded on the previous seeded value, so a deployment that rewrote the panel keeps its own text and a re-run touches zero rows.

## 13. Tests

- [x] 13.1 Extend `apps/api/test/factories/emissionFactorFactory.ts` to take a year, defaulting to something explicit.
- [x] 13.2 Review the four existing suites under `apps/api/test/features/emissionFactors/` — several assert on duplicate and source-conflict behaviour and will shift once the year enters both keys.
- [x] 13.3 `createEmissionFactor` / `updateEmissionFactor`: same key different years succeeds; same key same year is rejected; different sources in the same subcategory and year is rejected; different sources across years succeeds; a missing year is rejected; a factor older than the UI window stays editable when its year is not being changed.
- [x] 13.4 `getCarbonInventoryMethodology`: only the footprint's year is offered; a year with no catalogue offers nothing; a footprint with a null year offers nothing.
- [x] 13.5 `syncCarbonInventoryLines`: a create referencing a factor of another year persists the line with no snapshot and no result, with nothing announcing it — the empty factor cell is the message; the rest of the payload is persisted normally; an update to such a factor behaves the same; a line of the footprint's year is persisted with its snapshot and result; a manual line is untouched.
- [x] 13.6 `duplicateCarbonInventory` plus a year change: the copy keeps every snapshot verbatim; changing its year clears the catalogue-factor snapshots and their results while keeping subcategory, dimensions, unit and quantity; manual lines survive untouched; parked (`OUTDATED`) lines are cleared too; no replacement factor is chosen; and the whole thing is atomic with the year update. These tests are what keep design Decision 9 honest — the reported year is only derivable while this behaviour holds.
- [x] 13.7 `duplicateMethodology`: cloned factors keep their year.
- [x] 13.8 Migration: against a database seeded with the undated catalogue plus footprints of several years and states, every factor ends dated, no `source` string changed, the column is `NOT NULL`, every footprint of another year is cleared whatever its state, footprints of 2025 are untouched, superseded input versions keep their snapshots, manual lines survive, and a damaged snapshot — null factor id with a catalogue source — is cleared too.
- [x] 13.9 Factor identity: PR 647 covers the round trip in the sync integration suite. What is left for this change is that a line edited without touching its factor is still treated as catalogue-backed when the year changes — assert it in the year-change test rather than duplicating 647's.

- [x] 13.10 `getCarbonInventoryMethodologyExport`: a dated footprint gets only the factors of its year; an undated one gets every year, which is also what keeps the parity test against the administrator's export meaningful.
- [x] 13.11 The damaged shape — no `emissionFactorId`, a catalogue source — in `buildFootprintWithFrozenFactors` and in the sync suite, plus a direct-total line that must keep its result and a factor of another subcategory that must not be frozen. Both new suites were checked against the previous predicates and fail there.

## 14. Verification

- [x] 14.1 Run `pnpm format && pnpm lint && pnpm type-check`.
- [x] 14.2 Run the API suites for the touched domains: `pnpm test:api -- /emissionFactors --coverage=false`, `/carbonInventories`, `/methodologies`.
- [x] 14.3 Run `pnpm test:web`.
- [ ] 14.4 Before rolling out, take the `pg_dump` from 1.3 and announce the deployment window. While the migration has run and the previous container is still serving, creating an emission factor from the maintainer fails against the new `NOT NULL` column, and that container's `sync` still accepts a factor of any year, so it can write back what the migration just cleared. Both are accepted rather than closed with a maintenance window.
- [ ] 14.5 After the deployment settles, run a verification query listing every `carbon_inventory_line_factor` on an active input whose factor's year differs from its footprint's year. It should return nothing; anything it returns is residue written during the window, which would otherwise sit unnoticed until someone happened to save that subcategory again. Record the result.

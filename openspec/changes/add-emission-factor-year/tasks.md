## 1. Confirm and prepare catalog data

- [x] 1.1 Produce a reviewed mapping for every existing factor with explicit `source` and reporting `year` (`integer` or confirmed `null`). A missing suffix SHALL remain an error until classified; do not infer that `IPCC` or `Kool, A.` is transversal from its name alone.
- [x] 1.2 Audit factors by the proposed business key `(subcategory, normalized required dimensions, year, source, numerator magnitude, denominator magnitude)` and list exact-unit rows that collapse into the same family (for example `kg/kg` and `kg/ton`).
- [x] 1.3 Convert same-family values to a common unit and automatically consolidate only mathematically equivalent rows. Send non-equivalent values to methodology review; model real wet/dry or similar distinctions as dimensions before migration.
- [x] 1.4 Update both `tools/seed/src/data/base/methodologies.json` and `tools/seed/src/data/testing/methodologies.json` with the reviewed classification: provider-only `source` and an explicit `year` value, including `"year": null` for confirmed transversal factors.

## 2. Database schema and migration

- [x] 2.1 In `packages/database/src/prisma/schema.prisma`, add `year Int?`, `numeratorMagnitudeId BigInt @map("numerator_magnitude_id")` and `denominatorMagnitudeId BigInt @map("denominator_magnitude_id")` to `EmissionFactor`, with named relations to `Magnitude`. The magnitude IDs are required and server-derived.
- [x] 2.2 In `CarbonInventoryLineFactor`, add only `appliedFactorYear Int? @map("applied_factor_year")`. Do not add `isFallback` or `appliedFactorYearMatchesInventory`; mismatch is derived from the current inventory year.
- [x] 2.3 Create `packages/database/src/prisma/migrations/<timestamp>_add_emission_factor_year/migration.sql`. Add `year` plus temporarily nullable `numerator_magnitude_id` and `denominator_magnitude_id`; split recognized provider/year values using the reviewed map and fail the preflight if any factor is unclassified.
- [x] 2.4 Backfill both magnitude IDs by joining the factor rate unit with its numerator and denominator measurement units, then make both magnitude columns non-null and add their foreign keys. Leave dimension slots exactly as stored: normalization applies to the uniqueness comparison, not to the data, so the migration SHALL NOT erase a value entered in a non-required slot.
- [x] 2.5 Drop `emission_factor_unique_subcategory_dims_source` and create a partial unique index over `("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "year", "source", "numerator_magnitude_id", "denominator_magnitude_id") NULLS NOT DISTINCT WHERE "status" <> 'DELETED'`.
- [x] 2.6 Add `applied_factor_year` and backfill it from each linked `emission_factor`. Do not recompute or overwrite existing applied value, unit, source or result snapshots.
- [x] 2.7 Run the migration on both a current-data database and a fresh seeded database. Verify: different years succeed; different sources in the same year succeed; different families succeed; the same source/year/family under compatible exact units is rejected; null dimensions/year cannot bypass uniqueness.

## 3. Shared schemas and request contracts

- [x] 3.1 Add nullable integer `year` to `packages/types/src/baseSchemas/emissionFactor.ts`, factor create/update forms and responses. Do not expose `numeratorMagnitudeId` or `denominatorMagnitudeId` as writable client fields, and do not add a blocking API validation solely because `source` contains a likely year.
- [x] 3.2 Make seed `year` required-but-nullable in `tools/seed/src/scripts/seedMethodologyData/shared.ts` and propagate it in `seedEmissionFactors.ts`; omitted year entries SHALL fail validation.
- [x] 3.3 Add `year` and a stable canonical/base factor ID to the carbon-inventory methodology factor shape, including converted representations.
- [x] 3.4 Replace the ambiguous sync factor fields in `packages/types/src/carbonInventories/syncCarbonInventoryLines/schemas.ts` with a discriminated union equivalent to `CATALOG { emissionFactorId, appliedRateMeasurementUnitId }`, `CUSTOM { source, value, rateMeasurementUnitId }`, and `DIRECT { totalEmissions }`, alongside common line fields.
- [x] 3.5 Add `appliedFactorYear` to saved-line and factors-used response schemas. Do not add a persisted match/fallback boolean.

## 4. API — emission-factor maintenance and uniqueness

- [x] 4.1 Add a shared helper that loads and returns a rate unit's numerator/denominator magnitude IDs; reuse it for create, update, seed/migration verification and catalog sync validation.
- [x] 4.2 Update `checkDuplicateEmissionFactor` in `apps/api/src/features/emissionFactors/helpers.ts` to use normalized required dimensions plus `year`, `source` and unit family, matching null explicitly.
- [x] 4.3 Remove `validateSourceConsistency`, its error type/message mapping and all call sites. Multiple sources in the same dated or transversal rank are valid.
- [x] 4.4 Update `createEmissionFactor/service.ts` and `updateEmissionFactor/service.ts` to validate dimensions, derive both magnitude IDs from the selected rate unit and persist them with `year`. Keep `P2002` mapped to the duplicate-factor error.
- [x] 4.5 Return `year` from factor mappers/listing and preserve `year` plus both magnitude IDs in `duplicateMethodology/helpers.ts`.

## 5. API — methodology payload, exports and seed

- [x] 5.1 In `getCarbonInventoryMethodology/service.ts`, select factor `id`, `year`, `source` and rate-unit magnitude data needed by the client contract.
- [x] 5.2 In its conversion helper, carry the canonical/base factor ID, source and year through every compatible converted representation. Never turn converted units into separate catalog identities.
- [x] 5.3 Update methodology API exports and `apps/web/src/utils/exportMethodologyToExcel.ts` so year is a separate column and transversal renders with an empty year cell.
- [x] 5.4 Update `seedEmissionFactors.ts` to derive both magnitude IDs server-side from each seed rate unit and persist the explicit year; confirm fresh and migrated databases have equivalent catalog keys.

## 6. API — server-authoritative line sync and snapshots

- [x] 6.1 Refactor `syncCarbonInventoryLines` to branch on the discriminated `CATALOG`, `CUSTOM` and `DIRECT` variants instead of inferring custom factors from source strings.
- [x] 6.2 For `CATALOG`, load the factor inside the sync transaction and validate ACTIVE status, inventory methodology/subcategory membership, required dimension values and applied-unit family compatibility.
- [x] 6.3 Derive catalog source, year and canonical value on the server, perform the unit conversion on the server, calculate the line result and persist the applied value/unit/source/year snapshot. Remove client-authored catalog value/source/year from the write path.
- [x] 6.4 Keep dedicated validations for `CUSTOM` and `DIRECT`; persist `emissionFactorId = null` and `appliedFactorYear = null` for custom factors, and do not create a catalog-factor snapshot for direct totals.
- [x] 6.5 Update saved-line reads and `getEmissionFactors/service.ts` to return `emissionFactorId`/base factor ID and `appliedFactorYear`, so reload restores the exact catalog choice and warning state can be derived.
- [x] 6.6 Update `duplicateCarbonInventory/service.ts` to copy `appliedFactorYear` with the other immutable snapshots. Updating `carbon_inventory.year` SHALL NOT rewrite factors or results and SHALL NOT invoke a bulk resolution path.

## 7. Web — ranking in the existing Factor selector

- [x] 7.1 Add factor `year` and canonical/base factor ID to `MethodologyEmissionFactor` and the emission-editor models.
- [x] 7.2 In `EmissionEditor/services/emissionFactorService.ts`, implement pure helpers to filter by activity/dimensions and unit family and rank by exact year, transversal, nearest earlier, then nearest later.
- [x] 7.3 Return a recommendation only when the winning rank has exactly one canonical factor. If multiple sources tie, return the complete winning candidates with no selection; never break ties by array order, source or ID.
- [x] 7.4 Replace `determineAutoLoadFactorSource` with the new ranking and thread the already-available inventory year into it.
- [x] 7.5 Keep the current single control labeled `Factor`. Render dated catalog options as `DEFRA (2025)` and transversal options with only their source, such as `IPCC`; do not write `Transversal` in the option or create a separate year/vintage selector. Preserve the existing `Otro` option in the same list and its custom-factor fields.
- [x] 7.6 When saving a catalog selection, send only its canonical `emissionFactorId` and desired compatible applied rate unit. Adapt custom and direct lines to their discriminated variants.
- [x] 7.7 On reload, restore the selected canonical factor by ID and display the snapshotted source/year. Do not silently replace it with the newly recommended candidate.

## 8. Web — subcategory year-mismatch warning

- [x] 8.1 Add a pure warning-summary helper. Eligible rows are active lines with `emissionFactorId != null`, `appliedFactorYear != null` and a non-null inventory year; affected rows have `appliedFactorYear !== inventory.year`.
- [x] 8.2 Exclude transversal catalog factors, custom/manual factors, direct totals, incomplete/no-factor rows and inactive/deleted inputs from both affected and eligible dated-catalog counts.
- [x] 8.3 Render at most one warning per subcategory with affected/eligible counts, sorted distinct mismatching years, the current inventory year and the statement that calculations were not modified.
- [x] 8.4 Keep the warning informational: it SHALL NOT block save, navigation or submission. Recompute it from current line snapshots after reload, individual factor edits and inventory-year changes.
- [x] 8.5 Remove or do not implement any notice/action that offers bulk factor re-resolution after a year change or duplicated inventory re-date. Preserve all choices and results.

## 9. Web — maintainer and factors-used summary

- [x] 9.1 Add a nullable year field/column to the emission-factor maintainer form and grid. Show source and year separately there; require an explicit blank/null choice for transversal. Add persistent helper text recommending that the factor/source name omit the year, plus a non-blocking warning when a four-digit year is detected.
- [x] 9.2 Update maintainer duplicate errors to explain conflicts by source, year, required dimensions and unit family. Remove source-conflict messaging.
- [x] 9.3 Show the applied year in the factors-used summary. Derive mismatch styling from the current inventory year; transversal and custom factors SHALL not be marked as mismatches.

## 10. Tests

- [x] 10.1 Database/API maintenance: cover different years, multiple sources in the same year, multiple transversal sources, same-source duplicates with nulls, compatible exact-unit duplicates and coexistence of non-convertible unit families.
- [x] 10.2 Migration/seed: fail on unclassified year, verify explicit transversal rows, verify provider/year splitting and detect non-equivalent same-family collisions.
- [x] 10.3 Methodology payload: assert source/year/base factor ID survive compatible conversions and methodology duplication/export.
- [x] 10.4 Sync API: assert valid catalog selection is server-derived; reject inactive, cross-methodology, wrong-dimension and incompatible-family selections; prove spoofed catalog value/source/year cannot be persisted.
- [x] 10.5 Snapshot API: assert `appliedFactorYear` is saved/returned/copied and remains stable after catalog edits and inventory-year changes.
- [x] 10.6 Web ranking and selector: one case for every year rank, exact-year and transversal provider ties, no inventory year, no factors, unit-family filtering, parentheses only on dated labels, source-only transversal labels and `Otro` remaining in the same `Factor` selector.
- [x] 10.7 Maintainer guidance: detect a likely four-digit year in the factor/source name, show the recommendation and prove it does not block saving.
- [x] 10.8 Web year-mismatch warning: exact affected/eligible counts; distinct sorted years; exclusions for transversal/custom/direct/incomplete/inactive lines; clearing after individual correction; no blocking behavior.
- [x] 10.9 Year change/duplication regression: verify factor IDs, snapshots and calculated results remain byte-for-byte unchanged after re-dating.

## 11. Validation and rollout

- [x] 11.1 Run targeted API and web tests, then `pnpm format`, `pnpm lint` and `pnpm type-check`.
- [x] 11.2 Run `openspec validate add-emission-factor-year --strict` and resolve every artifact/spec inconsistency.
- [ ] 11.3 Deploy schema and server-authoritative contract before the web client that sends the new union, using the repository's compatible rollout strategy.
- [ ] 11.4 Load additional vintages/providers only after production classification, migration checks and payload-size observation pass.

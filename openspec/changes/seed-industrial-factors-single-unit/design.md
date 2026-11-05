## Context

Capture resolves a line's library factor in two steps.

1. `getCarbonInventoryMethodology` returns every `ACTIVE` factor of the footprint's year, and `generateConvertedEmissionFactors` (`getCarbonInventoryMethodology/helper.ts:153`) expands each one into every active rate unit with the same numerator and denominator magnitudes. A derived factor has a composite id (`<originalId>-<rateUnitId>`) and `originalEmissionFactorId` set to the original.
2. The web (`useEmissionEditorForm.handleFactorSourceChange`) filters these by dimension values, by the rate unit whose denominator is the declared unit, and by source. It auto-fills only when exactly one factor remains. With two, it logs _"There are multiple available factors…"_ and leaves the factor empty.

#619 seeded each industrial-process factor as a `kg/ton` row and a `kg/kg` row. After step 1, each declaration unit has two candidates of the same source:

```
 seeded                                  derived by the API
 A  Clinker 520  kg/ton  IPCC 2025  ──▶  A(kg/ton)   A'(kg/kg)=0.52   A''(kg/g)
 B  Clinker 0.52 kg/kg   IPCC 2025  ──▶  B(kg/kg)    B'(kg/ton)=520   B''(kg/g)

 ton → [A, B']   kg → [A', B]   g → [A'', B'']      → never auto-filled
```

The database did not stop this. The partial unique index `emission_factor_unique_subcategory_dims_source` covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source, year)` without `NULLS NOT DISTINCT`, and `dimension_value_2_id` is NULL on every industrial-process row.

Constraints:

- #666 consolidated the migration history and required every database to be reset once. Every installed database was therefore seeded after #619 and holds up to 70 `kg/kg` rows: 35 per seeded year. A database reset before #667 has only the 2025 set, because #667 shipped no migration.
- The factor seed only inserts (`createMany({ skipDuplicates: true })` followed by a row-count check). It cannot remove rows from an installed database, and with NULL dimensions it would insert duplicates.
- Emission factors are soft-deleted (`status`). `carbon_inventory_line_factor.emission_factor_id` is `ON DELETE SET NULL`. `assertFactorReferenceIsValid` refuses a save whose `baseFactorId` points at a `DELETED` factor (422, "catalogue changed, reload").

## Goals / Non-Goals

**Goals:**

- One candidate per declaration for every industrial-process factor, in g, kg and ton, for 2025 and 2026.
- Installed databases reach the same catalogue as the seed, with no loss of line data.
- A catalogue that reintroduces a conversion collision fails CI before merge.
- The country guide stops stating counts that are no longer true, and states the rule #619 got wrong.

**Non-Goals:**

- Changing how capture converts or resolves factors.
- Hardening the unique index (see Decision 5).
- Reconciling conversion collisions a maintainer may have created in other subcategories.
- The empty unit menu in calculator mode for subcategories without factors (separate ticket).

## Decisions

### 1. Keep `kg/ton`, drop `kg/kg`

The IPCC defaults are tonnes of CO₂ per tonne of product, and the subcategory guides teach declaring in tonnes. The `kg/ton` value is the number a user can match against the IPCC tables and the guides. Every dropped `kg/kg` value is exactly its twin ÷ 1000 (verified by script on both datasets), so nothing is lost.

_Alternative_: keep `kg/kg`. It is numerically equivalent but reads as 0.52 instead of 520, which is not how any guide or source quotes the factor.

### 2. Migration: re-point line references, then soft-delete

For each duplicated `kg/kg` row, every `carbon_inventory_line_factor.emission_factor_id` that references it is moved to its `kg/ton` twin. Then the row is set to `status = 'DELETED'` and `updated_at = now()`. The snapshot (`applied_factor_value`, `applied_factor_rate_unit_id`, `applied_factor_source`, `derivation_details`) and the line result are not touched. They describe the factor actually applied, in the unit actually applied, and the twin is the same factor. In the editor, the twin's derived `kg/kg` carries `originalEmissionFactorId` = twin, so `isSelectedFactorAvailable` keeps recognizing the line's selection.

In practice, no reference is expected. The web sets `baseFactorId` only by auto-fill, which these factors never reached after the reset, and the only other writer (`duplicateCarbonInventory`) copies an existing reference. The re-point costs one statement and covers a forged or unforeseen reference without failing.

_Alternatives_:

- Hard `DELETE`. The FK nulls the reference, leaving a "damaged snapshot" that the next save of the subcategory clears (`isFactorKeptOnLine`), and it breaks the soft-delete convention.
- Soft-delete only. A referencing line would be refused with 422 on its next save until the user re-selected the factor.
- Soft-delete plus detach, mirroring `deleteEmissionFactor`. It throws away a value and a result that an equivalent active factor backs.
- Abort when a reference exists. A theoretical case would block `migrate deploy` (P3009) and need manual intervention.

### 3. Scope: seven subcategory names AND an equivalent twin

The migration acts only on `ACTIVE` `kg/kg` rows of the seven subcategories, matched by name across methodology versions, and only when an `ACTIVE` `kg/ton` twin exists: same subcategory, `dimension_value_1_id` and `dimension_value_2_id` (`IS NOT DISTINCT FROM`), source, year, and `value = kg/kg value × 1000`. Both values are `numeric(28,10)`, so the comparison is exact.

The twin condition protects a `kg/kg` row a maintainer created by hand with a different value: it stays, and its references never point at nothing. If a maintainer renamed one of the seven subcategories, the migration is a no-op there, which is the safe failure.

_Alternatives_:

- Any `kg/kg` with an equivalent `kg/ton` twin, in any subcategory. It survives renames, but it changes maintainer data outside this ticket and imposes the `kg/ton` convention where nobody chose it.
- Every `kg/kg` of the seven, with no twin required. A hand-made `kg/kg` would be deleted with nowhere to re-point its references.

Sketch (the shipped SQL may differ in form, not in predicate):

```sql
WITH pairs AS (
  SELECT kgkg.id AS kgkg_id, kgton.id AS kgton_id
  FROM emission_factor kgkg
  JOIN subcategory s            ON s.id = kgkg.subcategory_id
  JOIN rate_measurement_unit rk ON rk.id = kgkg.rate_measurement_unit_id AND rk.abbreviation = 'kg/kg'
  JOIN emission_factor kgton    ON kgton.subcategory_id = kgkg.subcategory_id
                               AND kgton.dimension_value_1_id IS NOT DISTINCT FROM kgkg.dimension_value_1_id
                               AND kgton.dimension_value_2_id IS NOT DISTINCT FROM kgkg.dimension_value_2_id
                               AND kgton.source = kgkg.source AND kgton.year = kgkg.year
                               AND kgton.status = 'ACTIVE' AND kgton.value = kgkg.value * 1000
  JOIN rate_measurement_unit rt ON rt.id = kgton.rate_measurement_unit_id AND rt.abbreviation = 'kg/ton'
  WHERE kgkg.status = 'ACTIVE' AND s.name IN (/* the seven */)
)
-- 1) UPDATE carbon_inventory_line_factor SET emission_factor_id = kgton_id ... FROM pairs
-- 2) UPDATE emission_factor SET status = 'DELETED', updated_at = now() ... FROM pairs
```

The two updates run as separate statements, each re-deriving `pairs`, and the re-point comes first, because the soft-delete removes rows from `pairs`. A second run finds no `ACTIVE` `kg/kg` row with a twin and changes nothing.

### 4. Re-point every reference, not only live ones

All `carbon_inventory_line_factor` rows referencing a duplicated factor are re-pointed, including superseded inputs and lines of deleted footprints. `detachFactorFromUnclaimedLines` leaves those alone because detaching rewrites what they say. Re-pointing to an equivalent factor rewrites nothing they say, and it leaves no reference anywhere to a `DELETED` factor that `duplicateCarbonInventory` or a later reader could trip over. The predicate also stays simple.

### 5. Guard as a seed data test, not an index or a runtime check

A pure function (`findConversionCollisions`) partitions the factors by subcategory, source, year and the magnitudes of the rate unit's numerator and denominator. Within each partition it compares the factors pairwise and reports a pair when, for each of the two dimensions, the values are equal or either one is NULL. This mirrors `getAvailableFactors` (`emissionFactorService.ts`), where a factor with a NULL dimension is a candidate for any value of it, so "no collision" means exactly "capture never sees two candidates". Partitions are small (≤ ~30 factors per subcategory and year), so the pairwise pass costs nothing.

A `tools/seed` test loads `measurement_units.json`, `rate_measurement_units.json` and `methodologies.json` for `base` and `testing`, resolves each rate unit's numerator and denominator by splitting its abbreviation on `/` (as `seedMeasurementUnits` does), and asserts that no pair is reported. The test also covers the function on synthetic rows: a same-magnitude pair is reported; a NULL-dimension factor and a specific one with the same source are reported; different magnitudes, different years and different sources are not.

No subcategory mixes NULL and non-NULL values in one dimension today, so the wildcard case does not occur in the shipped data. It is covered so the guard stays faithful to capture as the catalogue grows. Banning such a mix outright was rejected: a generic factor under a different source is legitimate, and the source comparison already allows it.

_Alternatives_:

- `NULLS NOT DISTINCT` on `emission_factor_unique_subcategory_dims_source`. It would reject legitimate data: Combustiones estacionarias and móviles hold several factors per key in different magnitudes (`kg/L`, `kg/kWh`, …), 30 such keys in `base`. The index cannot see magnitudes.
- A runtime check in `seedEmissionFactors`, like `checkPositionsAreContiguous`. CI seeds only `testing` (the API global setup), so a collision in `base` would still merge. The test runs in the `seed-test` job on every PR, without a database.

### 6. Verify the migration against its own SQL

An API integration test (`apps/api/test/features/emissionFactors/dropDuplicatedIndustrialProcessFactorsMigration/integration.test.ts`, named after the migration `<timestamp>_drop_duplicated_industrial_process_factors`) reads the shipped `migration.sql` and executes it, following the year migration test #666 removed. After this change the `testing` dataset has no `kg/kg` rows, so the test creates them with `createTestEmissionFactor`, along with line factors referencing them. It covers re-point plus delete with snapshot and result unchanged, the untouched no-twin row, an untouched pair outside the seven subcategories, and idempotency.

Separately, as evidence for the PR, a manual replay inside a transaction on a database seeded with `base` from `main`: 70 rows `DELETED`, 70 `kg/ton` rows unchanged, and the collision check over the active catalogue returns nothing.

### 7. Documentation

`docs/country-implementation-guide/README.md` ("284 emission factors per year") and `02-seed-content.md` ("568 factors… 86 IPCC") move to 249 per year, 498 in total and 51 IPCC. Point 5 of `02-seed-content.md` ("Unit abbreviations") gains the rule: load each factor in a single rate unit; the platform derives the others of the same magnitude, and seeding a factor in two units of one magnitude leaves capture with two candidates and no factor. The guide is where a country loads its own factors, so it is where #619's mistake would be repeated. The PR description references #619, which gives that PR an automatic backlink.

## Risks / Trade-offs

- [A maintainer renamed one of the seven subcategories] → The migration skips it and its collisions remain. Accepted as the safe failure. The scenario is unlikely, and the maintainer can delete the `kg/kg` rows from the screen (the edit guard applies).
- [Re-pointing changes the factor identity on claimed or verified footprints] → Only the identity moves, to an equivalent factor of the same subcategory, year and source. No applied value, unit or result changes. In practice no such reference is expected (Decision 2).
- [A hand-made `kg/kg` equals its `kg/ton` × 1000 but was meant to stay] → It is indistinguishable from the seeded duplicate and is handled as one, which is the correct outcome: it collides the same way.
- [Rollback] → Data-only. The migration's rows are the `DELETED` `kg/kg` factors of the seven subcategories whose `updated_at` falls between the migration's `started_at` and `finished_at` in `_prisma_migrations`. A predicate on status and twin alone would also restore a `kg/kg` a maintainer had deleted earlier. Setting those rows back to `ACTIVE` reverts the migration. The re-point needs no revert, because both ids are equivalent. Restoring brings the bug back.

## Migration Plan

1. Deploy as usual: `prisma migrate deploy` applies the new migration on top of the seven consolidated ones. No reset or downtime, and no change to the seeding procedure.
2. Fresh installs get the corrected seed. The migration finds nothing and is a no-op.

## Open Questions

None. The calculator-mode unit menu for subcategories without factors is tracked separately.

## Context

Capture resolves a line's library factor in two steps.

1. `getCarbonInventoryMethodology` returns every `ACTIVE` factor of the footprint's year. `generateConvertedEmissionFactors` (`getCarbonInventoryMethodology/helper.ts:153`) then expands each one into every active rate unit with the same numerator and denominator magnitudes. A derived factor has a composite id (`<originalId>-<rateUnitId>`), and its `originalEmissionFactorId` points to the original.
2. The web (`useEmissionEditorForm.handleFactorSourceChange`) filters these by dimension values (a factor with a NULL dimension matches any value), by the rate unit whose denominator is the declared unit, and by source. It auto-fills only when exactly one factor remains. With two, it logs _"There are multiple available factors…"_ and leaves the factor empty.

#619 seeded each industrial-process factor as a `kg/ton` row and a `kg/kg` row. After step 1, each declaration unit has two candidates from the same source:

```
 seeded                                  derived by the API
 A  Clinker 520  kg/ton  IPCC 2025  ──▶  A(kg/ton)   A'(kg/kg)=0.52   A''(kg/g)
 B  Clinker 0.52 kg/kg   IPCC 2025  ──▶  B(kg/kg)    B'(kg/ton)=520   B''(kg/g)

 ton → [A, B']   kg → [A', B]   g → [A'', B'']      → never auto-filled
```

The database did not stop this. The partial unique index `emission_factor_unique_subcategory_dims_source` covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source, year)` without `NULLS NOT DISTINCT`, and `dimension_value_2_id` is NULL on every industrial-process row.

Before #619 every one of these factors had a single row, and the same conversion made it resolve in g, kg and ton. `generateConvertedEmissionFactors` and the rate units `kg/g`, `kg/kg` and `kg/ton` already existed at `1f195a26^`.

Constraints:

- The factor seed only inserts (`createMany({ skipDuplicates: true })` followed by a row-count check). It cannot remove rows from an installed database, and with NULL dimensions it would insert duplicates.
- Upstream content migrations are scoped to the demo country (`country.iso_code = 'PD'`). Country deployments get content corrections by reviewing the seed diff (`docs/development/country-onboarding.md`, "Content migrations do not reach your methodology").
- Since #666, installed databases are expected to be reset (`pnpm db:restore:keep-users`), and #667 corrected factor values through the seed alone.

## Goals / Non-Goals

**Goals:**

- One candidate per declaration for every industrial-process factor, in g, kg and ton, for 2025 and 2026.
- A catalogue that reintroduces a conversion collision fails CI before merge.
- The country guide stops stating counts that are no longer true, and states the rule #619 got wrong.

**Non-Goals:**

- A data migration for installed databases (Decision 2).
- Changing how capture converts or resolves factors.
- Hardening the unique index (Decision 3).
- The empty unit menu in calculator mode for subcategories without factors (separate ticket).

## Decisions

### 1. Keep `kg/ton`, drop `kg/kg`

The IPCC defaults are tonnes of CO₂ per tonne of product, and the subcategory guides teach users to declare in tonnes. The `kg/ton` value is the number a user can match against the IPCC tables and the guides. Every dropped `kg/kg` value is exactly its twin ÷ 1000 (verified by script on both datasets), so nothing is lost.

_Alternative_: keep `kg/kg`. It is numerically equivalent, but it reads 0.52 instead of 520, which is not how any guide or source quotes the factor.

### 2. No data migration: installed databases are reset

The only databases a migration would reach are demo-country (`PD`) ones: dev, QA and the demo. Country deployments are outside the content-migration scope by convention and take this correction from the seed diff, where the guide's new single-unit rule (Decision 5) tells them what to check. The deployment owner has confirmed that the `PD` databases hold no data that must survive. That is the premise of this decision. Given it, `pnpm db:restore:keep-users` brings them to the corrected seed while keeping their users. That is the same path #667's factor corrections took.

_Alternative explored and dropped_: a Postgres data migration scoped to `PD`, the seven subcategory names and an equivalent twin (an `ACTIVE` `kg/ton` factor with the same dimensions, source and year, value × 1000). It would re-point `carbon_inventory_line_factor.emission_factor_id` from each `kg/kg` row to its twin and then soft-delete the row. Its integration test would execute the shipped SQL. That design is sound, and it is the one to take up again if a `PD` database ever holds data that cannot be lost. Without such a database it adds a migration, a test and a convention debate (whether to scope by methodology version name) and buys nothing.

### 3. Guard as a seed data test, not an index or a runtime check

A pure function (`findConversionCollisions`) partitions the factors by subcategory, source, year and the magnitudes of the rate unit's numerator and denominator. Within each partition it compares the factors pairwise and reports a pair when each of the two dimensions is either equal or NULL on one side. This mirrors `getAvailableFactors` (`emissionFactorService.ts`), where a factor with a NULL dimension is a candidate for any value of it, so "no collision" means exactly "capture never sees two candidates". Partitions are small (≤ ~30 factors per subcategory and year), so the pairwise pass is cheap.

A `tools/seed` test loads `measurement_units.json`, `rate_measurement_units.json` and `methodologies.json` for `base` and `testing`, and resolves each rate unit's numerator and denominator by splitting its abbreviation on `/`, as `seedMeasurementUnits` does. It then asserts that no pair is reported. The test also covers the function on synthetic rows:

- reported: a same-magnitude pair; a NULL-dimension factor and a specific one with the same source;
- not reported: different magnitudes, different years, different sources.

No subcategory mixes NULL and non-NULL values in one dimension today, so the shipped data never exercises the wildcard case. It is covered so that the guard stays faithful to capture as the catalogue grows. Banning such a mix outright was rejected: a generic factor under a different source is legitimate, and the source comparison already allows it.

_Alternatives_:

- `NULLS NOT DISTINCT` on `emission_factor_unique_subcategory_dims_source`. It would reject legitimate data: Combustiones estacionarias and móviles hold several factors per key in different magnitudes (`kg/L`, `kg/kWh`, …), 30 such keys in `base`. The index cannot see magnitudes.
- A runtime check in `seedEmissionFactors`, like `checkPositionsAreContiguous`. CI only seeds `testing` (in the API global setup), so a collision in `base` would still get merged. The test runs in the `seed-test` job on every PR, without a database.

### 4. Verification

- The data test is checked against `main`'s data before it is trusted. With the two `methodologies.json` files from `main` checked out, it must report 70 pairs in `base` and 35 in `testing`, and that output is the PR's evidence.
- A manual check in the running app, on a database freshly restored from the corrected seed: the IPCC factor auto-fills in g, kg and ton for 2025 and 2026, and the unit menu in calculator mode still offers all three.

### 5. Documentation

- `docs/country-implementation-guide/README.md` says "284 emission factors per year"; it becomes 249.
- `02-seed-content.md` says "568 factors… 86 IPCC"; it becomes 498 in total and 51 IPCC.
- Point 5 of `02-seed-content.md` ("Unit abbreviations") gains the rule: load each factor in a single rate unit, because the platform derives the others of the same magnitude, and seeding a factor in two units of one magnitude leaves capture with two candidates and no factor. The guide is where a country loads its own factors, so it is where #619's mistake would be repeated.

The PR description references #619, which gives that PR an automatic backlink. It also states that installed databases need `pnpm db:restore:keep-users`.

## Risks / Trade-offs

- [An installed database that cannot be reset] → It keeps the duplicates, and capture keeps leaving these lines empty, until someone deletes the 70 `kg/kg` rows (35 per seeded year) from the emission-factor maintainer. Nothing references them in practice, because the web only sets a factor reference by auto-fill, which these factors never reached. The edit guard therefore allows each delete. If such a database turns out to hold real data, the migration in Decision 2 is the fallback.
- [The reset loses everything but users] → Organizations, footprints, submissions, badges and reduction projects are lost. This is acceptable only for the `PD` databases, which is why the PR states it explicitly rather than leaving it implicit.

## Migration Plan

1. Merge. Fresh installs get the corrected seed.
2. Every installed `PD` database (dev, QA, demo): `pnpm db:restore:keep-users`, per `docs/operations/migration-history-reset.md`.
3. Country deployments: nothing ships to them. They review the seed diff as usual.

## Open Questions

None. The calculator-mode unit menu for subcategories without factors is tracked separately.

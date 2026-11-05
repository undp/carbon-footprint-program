## 1. Seed data (commit: `fix(seed): …`)

- [ ] 1.1 Before touching the data, run the scratch collision scan over `base` and `testing` on `main` and record the result as PR evidence: 70 colliding pairs in `base`, 35 in `testing`, all industrial-process `kg/ton` ↔ `kg/kg`.
- [ ] 1.2 Remove the 70 industrial-process `kg/kg` factors from `tools/seed/src/data/base/methodologies.json`: 35 for 2025 and 35 for 2026, across Cinc, Cemento, Vidrio, Acero, Cal, Aluminio and Ferroaleaciones y otros metales. Remove them with a script that applies an exact predicate, not by hand, and preserve the file's formatting.
- [ ] 1.3 Remove the 35 industrial-process `kg/kg` factors (2025) from `tools/seed/src/data/testing/methodologies.json`.
- [ ] 1.4 Verify with a script that the remaining `kg/ton` factors match the ones before the change (dimension value, source, year and value), and that `base` holds 498 factors: 249 per year, 51 of them IPCC per year.

## 2. Seed collision guard (commit: `test(seed): …`)

- [ ] 2.1 Add a pure `findConversionCollisions` under `tools/seed/src/utils/`, exported from `utils/index.ts`. Input: the flattened factors (subcategory path, both dimension values, rate-unit abbreviation, source, year) and a lookup from rate-unit abbreviation to numerator/denominator magnitude codes. Output: every pair of factors with the same subcategory, source, year and both magnitudes that also match on both dimensions, where a dimension matches if the values are equal or either is NULL (design Decision 5). Each pair carries its rate units.
- [ ] 2.2 Unit-test the function on synthetic rows. Reported: a `kg/ton` + `kg/kg` pair; a NULL-dimension factor and a specific one with the same source. Not reported: the same pair at `kg/L` + `kg/kWh`; the same key in 2025 and 2026; a NULL-dimension factor under a different source. The error message must name the subcategory, dimension values, source, year and rate units.
- [ ] 2.3 Add a data test that loads `measurement_units.json`, `rate_measurement_units.json` and `methodologies.json` for `base` and `testing` (via `generateSeedDataPath` or a direct path). It resolves each rate unit's numerator and denominator by splitting the abbreviation on `/`, and asserts there are no collisions. Sanity check: with the section 1 data reverted in the working tree, it reports 70 pairs in `base` and 35 in `testing`. Run `pnpm test:seed`.
- [ ] 2.4 Update the comment in `tools/seed/vitest.config.ts` that lists what the seed tests cover.

## 3. Data migration (commit: `fix(database): …`)

- [ ] 3.1 Create `packages/database/src/prisma/migrations/<timestamp>_drop_duplicated_industrial_process_factors/migration.sql`, data only. First, re-point `carbon_inventory_line_factor.emission_factor_id` from each duplicated `kg/kg` factor to its `kg/ton` twin. Then soft-delete the `kg/kg` factor (`status = 'DELETED'`, `updated_at = now()`). Use the predicate from design Decision 3: the seven names, both factors `ACTIVE`, same dimension values (`IS NOT DISTINCT FROM`), same source and year, and a value × 1000. Add a header comment explaining the why, with no references to specific deployments.
- [ ] 3.2 Confirm that `prisma migrate diff` reports no schema drift (the migration must not change the schema).
- [ ] 3.3 Add `apps/api/test/features/emissionFactors/dropDuplicatedIndustrialProcessFactorsMigration/integration.test.ts`. It reads the shipped `migration.sql` and executes it, using `emissionFactorYearMigration` from git history (38fa5f32) as the pattern. Fixtures, all for the 2025 catalogue:
  - a `kg/kg` twin of a seeded `kg/ton` industrial factor, referenced by a line factor that has a result;
  - a `kg/kg` with no equivalent twin, also referenced;
  - a `kg/kg` + `kg/ton` pair in a non-industrial subcategory whose factors have `dimension_value_2_id` NULL. Without that, the partial unique index rejects the second insert.

  Assertions:
  - the twin's reference is re-pointed, `applied_*` and the line result are unchanged, the `kg/kg` is `DELETED` and the `kg/ton` is untouched;
  - the no-twin row and its reference are untouched;
  - the non-industrial pair is untouched;
  - a second execution changes no row.

  Clean up the fixtures.

- [ ] 3.4 In the same test, assert that a sync of the re-pointed line's subcategory is accepted (no `InvalidEmissionFactorReferenceError`).
- [ ] 3.5 Run `pnpm test:api -- /emissionFactors --coverage=false` and `pnpm test:api -- /carbonInventories --coverage=false`.

## 4. Manual replay (PR evidence)

- [ ] 4.1 On a database seeded with `base` from `main` (before section 1), run the migration SQL inside a transaction. Record: 70 rows changed to `DELETED`, 70 `kg/ton` rows unchanged, 0 line factors affected, and no conversion collisions left in the `ACTIVE` catalogue (same rule as `findConversionCollisions`, applied in SQL). Run it a second time and confirm 0 rows change. Roll back.
- [ ] 4.2 In the running app, for 2025 and 2026 footprints, declare "Clinker" under Procesos industriales - Cemento in `ton`, `kg` and `g`, and one dimension value each of Cal, Aluminio and Ferroaleaciones. The IPCC factor auto-fills in every unit and the results match. In calculator mode, the unit menu still offers g, kg and ton.

## 5. Documentation (commit: `docs: …`)

- [ ] 5.1 `docs/country-implementation-guide/README.md`: change "284 emission factors per year" to 249.
- [ ] 5.2 `docs/country-implementation-guide/02-seed-content.md:72`: change "568 factors: the same 284 … 86 IPCC" to 498 / 249 / 51 IPCC.
- [ ] 5.3 In point 5 of `02-seed-content.md` ("Unit abbreviations"), add the single-rate-unit rule (design Decision 7).
- [ ] 5.4 Grep `docs/` and `openspec/specs/` for any other mention of factor counts or of capture doing "no unit conversion", and fix it.

## 6. Ship

- [ ] 6.1 Run `pnpm format && pnpm lint && pnpm type-check`. Commit in this order: seed data → guard → migration → docs. One Conventional Commit per section, no Co-Authored-By. Every commit stays green.
- [ ] 6.2 Open the PR against `main`, in English, titled `fix(seed): …`. The description explains that #619 was a regression built on a false premise and references #619. It includes the evidence from 1.1 and section 4, and lists the calculator-mode unit menu as out of scope without linking any ticket. No references to downstream tickets. Ask for the priority label.
- [ ] 6.3 Draft the follow-up as a Jira subtask of RD-28 and show it to the user before creating it. Scope: in calculator mode, show every allowed unit for the 7 subcategories with no factors, and align the CASO 1 guides.

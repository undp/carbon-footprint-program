## 1. Seed data (commit: `fix(seed): …`)

- [x] 1.1 Remove the 70 industrial-process `kg/kg` factors from `tools/seed/src/data/base/methodologies.json`: 35 for 2025 and 35 for 2026, across Cinc, Cemento, Vidrio, Acero, Cal, Aluminio and Ferroaleaciones y otros metales. Use a script with an exact predicate, not hand edits, and keep the file's formatting.
- [x] 1.2 Remove the 35 industrial-process `kg/kg` factors (2025) from `tools/seed/src/data/testing/methodologies.json`.
- [x] 1.3 Verify by script that the remaining `kg/ton` factors are identical to before (dimension value, source, year, value), and that `base` holds 498 factors: 249 per year, 51 of them IPCC per year.
- [x] 1.4 The API global setup seeds `testing` for the whole integration suite. Using the `test-check` skill first, run `pnpm test:api -- /carbonInventories --coverage=false`, `pnpm test:api -- /emissionFactors --coverage=false` and `pnpm test:api -- /methodologies --coverage=false`, and confirm that nothing depended on the removed rows.

## 2. Seed collision guard (commit: `test(seed): …`)

- [x] 2.1 Add a pure `findConversionCollisions` under `tools/seed/src/utils/` and export it from `utils/index.ts`.
  - Input: the flattened factors (subcategory path, both dimension values, rate-unit abbreviation, source, year) and a lookup from rate-unit abbreviation to numerator/denominator magnitude codes.
  - Output: every pair with the same subcategory, source, year and both magnitudes that matches on both dimensions. A dimension matches if the values are equal or either one is NULL (design Decision 3). Each pair carries its rate units.
- [x] 2.2 Unit-test the function on synthetic rows.
  - Reported: a `kg/ton` + `kg/kg` pair; a NULL-dimension factor and a specific one with the same source.
  - Not reported: `kg/L` + `kg/kWh` with the same key; the same key in 2025 and 2026; a NULL-dimension factor under another source.
  - The error message names subcategory, dimension values, source, year and rate units.
- [x] 2.3 Add a data test that loads `measurement_units.json`, `rate_measurement_units.json` and `methodologies.json` for `base` and `testing`, via `generateSeedDataPath` or a direct path. It resolves each rate unit's numerator and denominator by splitting the abbreviation on `/`, and asserts there are no collisions.
- [x] 2.4 Check the test against the old data, without `git stash`, since the stash stack is shared across worktrees:
  1. `git checkout origin/main -- tools/seed/src/data/base/methodologies.json tools/seed/src/data/testing/methodologies.json`
  2. Run `pnpm test:seed`. It must fail with 70 pairs in `base` and 35 in `testing`. Keep that output as PR evidence.
  3. `git checkout HEAD -- <same files>`
  4. Run `pnpm test:seed` again. It must pass.
- [x] 2.5 Update the comment in `tools/seed/vitest.config.ts` that lists what the seed tests cover.

## 3. Documentation (commit: `docs: …`)

- [x] 3.1 `docs/country-implementation-guide/README.md`: "284 emission factors per year" → 249.
- [x] 3.2 `docs/country-implementation-guide/02-seed-content.md:72`: "568 factors: the same 284 … 86 IPCC" → 498 / 249 / 51 IPCC.
- [x] 3.3 In point 5 of `02-seed-content.md` ("Unit abbreviations"), add the single-rate-unit rule (design Decision 5).
- [x] 3.4 Grep `docs/` and `openspec/specs/` for any other statement of factor counts or of "no unit conversion" in capture, and fix each one.

## 4. Manual check in the app

- [ ] 4.1 Restore a local database from the corrected seed (`pnpm db:restore`). For 2025 and 2026 footprints, declare "Clinker" under Procesos industriales - Cemento in `ton`, `kg` and `g`, plus one dimension value each of Cal, Aluminio and Ferroaleaciones. Expected: the IPCC factor auto-fills in each unit, the results match across units, and the calculator-mode unit menu still offers g, kg and ton.

## 5. Ship

- [ ] 5.1 Run `pnpm format && pnpm lint && pnpm type-check`. Commit in this order: seed data → guard → docs, one Conventional Commit per section, no Co-Authored-By. Every commit stays green.
- [ ] 5.2 Open the PR against `main` in English, titled `fix(seed): …`. The description must:
  - explain that #619 was a regression built on a false premise, and reference #619;
  - include the 2.4 evidence;
  - state that installed databases need `pnpm db:restore:keep-users` (users kept; organizations, footprints, submissions, badges and reduction projects lost), or deletion of the 70 `kg/kg` rows from the emission-factor maintainer;
  - list the calculator-mode unit menu as out of scope, without linking any ticket.

  Do not reference downstream tickets. Ask the user for the priority label.

- [ ] 5.3 Draft the follow-up as a Jira subtask of RD-28 and show it to the user before creating it. Scope: in calculator mode, show every allowed unit for the 7 subcategories with no factors, and align the CASO 1 guides.
- [ ] 5.4 After merge, reset the installed `PD` databases (dev, QA, demo) with `pnpm db:restore:keep-users`, following `docs/operations/migration-history-reset.md`. Each reset wipes everything except users, so confirm each database with the user before running it. Never run it automatically during apply.

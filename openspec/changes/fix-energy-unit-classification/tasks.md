## 1. Pre-conditions

- [ ] 1.1 Confirm `add-magnitudes-maintainer` has been merged to `main` and archived under `openspec/changes/archive/`. Do not start subsequent tasks until this is done — the `magnitude` table and `measurement_unit.magnitude_id` FK must exist in the schema.
- [ ] 1.2 Sync the local working tree with `main`, run `pnpm install`, and run `pnpm exec prisma generate` so the Prisma client reflects the post-archive schema.

## 2. Seed JSON — measurement units

- [ ] 2.1 In `packages/database/src/prisma/seeds/data/base/measurement_units.json`, add two new entries at the end of the array:
  - `{ "name": "vatio", "magnitudeCode": "power", "abbreviation": "W", "baseFactor": 1.0, "isBase": true }`
  - `{ "name": "kilovatio", "magnitudeCode": "power", "abbreviation": "kW", "baseFactor": 1000.0, "isBase": false }`
- [ ] 2.2 In the same file, modify the existing `kWh` entry: set `magnitudeCode` to `"energy"`, `baseFactor` to `0.0036`, `isBase` to `false`.
- [ ] 2.3 In the same file, modify the existing `MWh` entry: set `magnitudeCode` to `"energy"`, `baseFactor` to `3.6`. (`isBase` is already `false`.)
- [ ] 2.4 Repeat 2.1–2.3 in `packages/database/src/prisma/seeds/data/testing/measurement_units.json` so the testing dataset mirrors `base`.
- [ ] 2.5 Validate that the canonical-RMU coverage check in `seedMeasurementUnits.ts` is still satisfied by the changes (it will be after step 3, which adds `kg/W` and `kg/kW`).

## 3. Seed JSON — rate measurement units

- [ ] 3.1 In `packages/database/src/prisma/seeds/data/base/rate_measurement_units.json`, add two entries:
  - `{ "name": "kg por vatio", "abbreviation": "kg/W" }`
  - `{ "name": "kg por kilovatio", "abbreviation": "kg/kW" }`
- [ ] 3.2 Repeat 3.1 in `packages/database/src/prisma/seeds/data/testing/rate_measurement_units.json`.

## 4. One-off SQL fix script

- [ ] 4.1 Create the directory `packages/database/scripts/` if it does not already exist.
- [ ] 4.2 Create `packages/database/scripts/fix-energy-classification.sql`. The script SHALL:
  - Open a single transaction (`BEGIN; … COMMIT;`).
  - Include a header comment naming the bug, summarizing the changes, and explicitly stating the assumption that the operator has not customized the affected rows.
  - Resolve the `power` magnitude id and the `energy` magnitude id via subqueries against `magnitude.code`.
  - `INSERT INTO "measurement_unit"` rows for `W` (`is_base = true, base_factor = 1.0`) and `kW` (`is_base = false, base_factor = 1000.0`), both with the resolved `power` `magnitude_id`. Use `ON CONFLICT ("abbreviation") DO NOTHING` to make the script idempotent.
  - `INSERT INTO "rate_measurement_unit"` rows for `kg/W` and `kg/kW`, looking up numerator (`kg` MU id) and denominator (`W` / `kW` MU id) via subqueries. Use `ON CONFLICT ("abbreviation") DO NOTHING`.
  - `UPDATE "measurement_unit"` where `abbreviation = 'kWh'`: set `magnitude_id` to the energy id, `base_factor = 0.0036`, `is_base = false`.
  - `UPDATE "measurement_unit"` where `abbreviation = 'MWh'`: set `magnitude_id` to the energy id, `base_factor = 3.6`. (Do not touch `is_base` — it is already `false`.)
- [ ] 4.3 Manually run the script against a local development database (after running `pnpm exec prisma migrate reset --force` from `main`'s baseline), then issue a few `SELECT` statements to verify: `kWh`/`MWh` now point at energy with the expected `base_factor`/`is_base`; `W`/`kW` exist under power; `kg/W`/`kg/kW` exist as RMUs. Document the result in the PR description.

## 5. Test helper

- [ ] 5.1 Create `apps/api/test/utils/seedCounts.ts` exporting:
  - `SEED_COUNTS = { measurementUnits, rateMeasurementUnits, magnitudes }` computed at module-import time by reading the three testing-dataset JSON files (`measurement_units.json`, `rate_measurement_units.json`, `magnitudes.json`).
  - `SEED_MAGNITUDE_CODES: readonly string[]` computed at import time from `testing/magnitudes.json` by mapping each entry to its `code` field.
  - Use strict typing: `as const` on the counts object, `readonly` on the magnitude codes array.
- [ ] 5.2 Confirm the import path from the test file resolves under the existing `apps/api/tsconfig*.json` and `vitest.config.ts`. If it does not, fall back to a relative path from `apps/api/test/utils/seedCounts.ts` to `packages/database/src/prisma/seeds/data/testing/`.

## 6. Test refactor — measurement units

- [ ] 6.1 In `apps/api/test/features/measurementUnits/getAllMeasurementUnits/integration.test.ts`:
  - Replace the hardcoded `MAGNITUDES` constant (currently 10 string literals at lines ~17–28) with an import of `SEED_MAGNITUDE_CODES` from the new helper. Adjust types so any `readonly string[]` consumer still compiles.
  - Replace `toHaveLength(18)` (or whatever literal is currently there) with `toHaveLength(SEED_COUNTS.measurementUnits)`. Update the test title to "should return all seeded measurement units" or similar — remove the specific number from the title.
  - Verify the "every magnitude has units" assertion still iterates `SEED_MAGNITUDE_CODES` (it was iterating `MAGNITUDES` before — the substitution is mechanical).
- [ ] 6.2 In `apps/api/test/features/measurementUnits/getAllRateMeasurementUnits/integration.test.ts`:
  - Replace the hardcoded count assertion with `SEED_COUNTS.rateMeasurementUnits`. Update the test title to remove the specific number.

## 7. Test refactor — magnitudes

- [ ] 7.1 In `apps/api/test/features/magnitudes/getAllMagnitudes/integration.test.ts`:
  - Replace any hardcoded magnitude-code list (e.g. the array of 10 codes around line ~133) with `SEED_MAGNITUDE_CODES`.
  - Replace any hardcoded count assertion with `SEED_COUNTS.magnitudes`. Update the test title to remove the specific number.

## 8. Methodology sanity check

- [ ] 8.1 Read `apps/api/test/features/carbonInventories/getCarbonInventoryMethodology/integration.test.ts` (and any sibling test files in that directory) to confirm none of them assert on the OLD `(power, mass)` grouping bucket existing as a separate bucket from `(energy, mass)`. Look for fixtures or assertions that explicitly name `kg/kWh` or `kg/MWh` in a different bucket from `kg/GJ`.
- [ ] 8.2 If a test fixture or assertion encodes the broken grouping, update it to expect the unified `(energy, mass)` bucket. Document the change clearly in the test file's relevant `describe` block so a future reader sees why the fixture was adjusted.

## 9. Validation

- [ ] 9.1 Run `pnpm format` (mandatory before commit per project conventions).
- [ ] 9.2 Run `pnpm lint` and confirm zero warnings.
- [ ] 9.3 Run `pnpm type-check` and confirm no errors.
- [ ] 9.4 Run `pnpm test --filter=api -- measurementUnits --coverage=false` — all measurement-unit integration tests pass.
- [ ] 9.5 Run `pnpm test --filter=api -- magnitudes --coverage=false` — all magnitude integration tests pass.
- [ ] 9.6 Run `pnpm test --filter=api -- carbonInventories --coverage=false` — methodology grouping tests still pass.
- [ ] 9.7 Run `pnpm exec prisma migrate reset --force` against the local dev DB to confirm the seed runs cleanly end-to-end with the new JSON.

## 10. Live deployment

- [ ] 10.1 After the PR is merged to `main`, manually run `packages/database/scripts/fix-energy-classification.sql` against the live database (within a maintenance window if desired, though the script is single-transaction and runs in well under a second).
- [ ] 10.2 Run verification `SELECT` statements against the live DB confirming kWh/MWh now point at energy with correct base_factor/is_base, and W/kW/kg/W/kg/kW exist with the expected values. Record the output in the PR thread or a follow-up note for traceability.
- [ ] 10.3 Smoke-test the admin "Unidades" maintainer screen on the live deployment: confirm `W`, `kW`, `kWh`, `MWh`, and `GJ` appear with the correct magnitude labels and `baseFactor` values.

## 11. Archive

- [ ] 11.1 Once all checks pass and the live deployment is verified, archive this change with `openspec archive fix-energy-unit-classification` so the ADDED requirement is folded into the live `openspec/specs/measurement-unit-management/spec.md`.

## Why

The seed file `measurement_units.json` classifies `kWh` and `MWh` under the `power` magnitude, but kilowatt-hour and megawatt-hour are physically units of energy (energy = power × time). The methodology seeds already list `["GJ", "kWh", "MWh"]` together as `allowedMeasurementUnitsAbbreviations` for the same field, but because the three units sit in different magnitudes, the conversion logic at `getCarbonInventoryMethodology/helper.ts` cannot translate between `kg/kWh`, `kg/MWh`, and `kg/GJ`. Fixing the classification unlocks the conversions and resolves a latent correctness bug that has shipped since the early days of the seed data.

The integration tests around measurement-unit and magnitude listing currently hardcode entity counts (`toHaveLength(18)`, `toHaveLength(11)`, etc.) and a hardcoded `MAGNITUDES` constant. Every seed addition forces a brittle test update; deriving those values from the seed JSON keeps the tests in sync automatically.

## What Changes

- Move `kWh` and `MWh` from the `power` magnitude to the `energy` magnitude, with `baseFactor` recomputed against the existing `GJ` energy base: `kWh` becomes `0.0036` (non-base), `MWh` becomes `3.6` (non-base). `GJ` remains the energy base unit.
- Populate the `power` magnitude with real power units so it is no longer empty after the reclassification: add `W` (vatio, base = `1.0`) and `kW` (kilovatio, `1000.0`).
- Add canonical rate measurement units `kg/W` and `kg/kW` to satisfy the existing canonical-RMU coverage check in `seedMeasurementUnits.ts`.
- Commit a one-off SQL script at `packages/database/scripts/fix-energy-classification.sql` that applies the same changes to the live single-deployment database. No Prisma migration file — the live deployment is solely under the maintainer's control, so the script is run manually once.
- Refactor the affected integration tests to derive `SEED_COUNTS` and `SEED_MAGNITUDE_CODES` from the testing dataset JSON files via a new helper at `apps/api/test/utils/seedCounts.ts`. Replace hardcoded counts and magnitude lists in `getAllMeasurementUnits`, `getAllRateMeasurementUnits`, and `getAllMagnitudes` integration tests.

This change has **no breaking API contracts**. The methodology helper begins producing a single `(energy, mass)` bucket for `kg/kWh + kg/MWh + kg/GJ` instead of separate `(power, mass)` and `(energy, mass)` buckets — a behavior change that is the intended correctness improvement.

## Capabilities

### New Capabilities

<!-- None — this is a seed-data correction and test refactor. -->

### Modified Capabilities

- `measurement-unit-management`: ADD a single requirement that codifies the implicit rule "seeded measurement-unit classifications align with their magnitude's physical definition". The change does not modify any existing API or DB contract; it makes explicit a property the platform has always relied on, so future contributors don't re-introduce a kWh-under-power-style misclassification.

## Impact

- **Seed data**: 4 JSON files (`measurement_units.json` and `rate_measurement_units.json` in both the `base` and `testing` datasets).
- **One-off script**: new `packages/database/scripts/fix-energy-classification.sql`, applied manually to the single live deployment.
- **Tests**: new helper `apps/api/test/utils/seedCounts.ts`; three integration test files updated to consume it. Existing assertions on "every magnitude has units" and "exactly one base unit per magnitude" continue to hold (W is the new base of `power`, GJ stays the base of `energy`).
- **Behavior change**: methodology grouping at `getCarbonInventoryMethodology` will now produce a unified `(energy, mass)` bucket for kWh, MWh, and GJ rate units. Existing emission factors stored as `kg/kWh` or `kg/MWh` keep working; only the magnitude classification of the underlying MU changes.
- **Dependency**: this change requires `add-magnitudes-maintainer` (currently in-progress) to be merged to `main` first, because it relies on the `magnitude` table and `measurement_unit.magnitude_id` FK introduced by that change.
- **Out of scope**: re-adding the `unique_base_per_magnitude` partial index (dropped implicitly by `add-magnitudes-maintainer`), reclassifying any other units, adding new energy units (MJ, BTU, therms), and any deeper test-content comparison beyond count and magnitude-code derivation.

## ADDED Requirements

### Requirement: Seeded measurement-unit classifications align with their magnitude's physical definition

The seeded `MeasurementUnit` rows shipped in `packages/database/src/prisma/seeds/data/<dataset>/measurement_units.json` SHALL classify each unit under the magnitude that matches its physical-quantity definition. Units of energy (joule, watt-hour, kilowatt-hour, megawatt-hour, gigajoule, etc.) SHALL be classified under `magnitudeCode = "energy"`. Units of power (watt, kilowatt, etc.) SHALL be classified under `magnitudeCode = "power"`. The same rule applies symmetrically to every other system magnitude (mass, volume, distance, time, animals, area, distance_mass, rooms).

Within a magnitude, every non-base unit's `baseFactor` SHALL be calibrated relative to the magnitude's base unit so that conversion math at `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/helper.ts` produces physically correct results. The "exactly one base unit per magnitude" rule (defined elsewhere in this capability) bounds the choice of base; this requirement bounds the choice of magnitude.

#### Scenario: kWh and MWh seeded under the energy magnitude

- **WHEN** the seed script runs from the `base` or `testing` dataset
- **THEN** the seeded rows for `kWh` and `MWh` SHALL have `magnitudeCode = "energy"`, AND their `baseFactor` values SHALL be calibrated relative to the seeded energy base unit `GJ` such that `kWh.baseFactor = 0.0036` and `MWh.baseFactor = 3.6`, AND both SHALL have `isBase = false`

#### Scenario: W and kW seeded under the power magnitude

- **WHEN** the seed script runs from the `base` or `testing` dataset
- **THEN** the seeded rows SHALL include `W` with `magnitudeCode = "power"`, `baseFactor = 1.0`, `isBase = true`, AND `kW` with `magnitudeCode = "power"`, `baseFactor = 1000.0`, `isBase = false`

#### Scenario: Cross-magnitude conversion between energy rate units becomes possible

- **WHEN** an emission factor stored as `kg/kWh` is requested in a methodology context that expresses the same factor as `kg/GJ` (or vice versa, or `kg/MWh`)
- **THEN** the methodology helper SHALL convert the value correctly using the calibrated `baseFactor` values within the shared `energy` magnitude — this conversion was impossible before the reclassification because the units lived in different magnitudes

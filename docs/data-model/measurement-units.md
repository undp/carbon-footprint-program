# Measurement Units Data Model

## Overview

Measurement units represent physical quantities (mass, volume, distance, etc.) used throughout the carbon accounting workflow. Every activity input, emission factor, and applied factor references a measurement unit.

## Core Tables

### `measurement_unit`

| Column         | Type                      | Notes                                        |
| -------------- | ------------------------- | -------------------------------------------- |
| `id`           | `bigint`                  | Primary key                                  |
| `name`         | `text`                    | Human-readable name                          |
| `abbreviation` | `text`                    | Symbol (e.g. `kg`, `m³`), unique             |
| `magnitude_id` | `bigint`                  | FK → `magnitude` (physical dimension)        |
| `base_factor`  | `double precision`        | Conversion factor to the base unit           |
| `is_base`      | `boolean`                 | True for the SI-like base unit per magnitude |
| `status`       | `measurement_unit_status` | `ACTIVE` or `DELETED` (soft-delete)          |

There is exactly one base unit per magnitude (e.g. `g` for `mass`, `L` for `volume`). The `kg` unit is additionally system-protected and can never be modified or deleted.

### `magnitude`

Magnitudes classify the physical dimension of a measurement unit. They are reference data: ten magnitudes are seeded (`mass`, `volume`, `distance`, `time`, `animals`, `area`, `power`, `energy`, `distance_mass`, `rooms`), and country deployments may add more via the admin maintainer screen. Only `mass` is system-protected (`is_system = true`); every other seeded magnitude is admin-managed.

| Column      | Type               | Notes                                                                                                              |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `id`        | `bigint`           | Primary key                                                                                                        |
| `code`      | `text`             | Stable lowercase identifier matching `^[a-z][a-z0-9_]*$`, unique, immutable                                        |
| `name`      | `text`             | Admin-editable Spanish display label                                                                               |
| `is_system` | `boolean`          | `true` only for `mass` (set by the seed script); `false` for every other row, including the rest of the seeded set |
| `status`    | `magnitude_status` | `ACTIVE` or `DELETED` (soft-delete)                                                                                |

System magnitudes (`is_system = true`) can be relabeled but never soft-deleted or have their `code` changed. Only `mass` is system-protected; every other magnitude (seeded or admin-created) has `is_system = false` and is soft-deletable when no `measurement_unit` references it.

#### Seeded magnitudes

The platform seeds the following ten magnitudes (source: `packages/database/src/prisma/seeds/data/base/magnitudes.json`). Only `mass` is created with `is_system = true`; the remaining nine are seeded with `is_system = false` and behave like admin-managed magnitudes from then on:

| `code`          | `name` (Spanish) | Base unit    | `is_system` | Notes                                                         |
| --------------- | ---------------- | ------------ | ----------- | ------------------------------------------------------------- |
| `mass`          | Masa             | `g`          | `true`      | `kg` is system-protected — never modifiable or deletable      |
| `volume`        | Volumen          | `L`          | `false`     |                                                               |
| `distance`      | Distancia        | `m`          | `false`     |                                                               |
| `time`          | Tiempo           | `h`          | `false`     |                                                               |
| `animals`       | Animales         | `cant anim`  | `false`     |                                                               |
| `area`          | Área             | `ha`         | `false`     |                                                               |
| `power`         | Potencia         | `kWh`        | `false`     |                                                               |
| `energy`        | Energía          | `GJ`         | `false`     |                                                               |
| `distance_mass` | Distancia · Masa | `km-ton`     | `false`     | Composed magnitude for transport activities                   |
| `rooms`         | Habitaciones     | `pieza arre` | `false`     | Hospitality occupancy (renamed locally per country if needed) |

`mass` is pinned as the lone system magnitude because the calculation pipeline normalizes every emission to `kg` (CO₂e), so removing or relabeling the `mass` magnitude would break the engine. The other nine codes are conventions, not invariants, and country deployments may evolve them freely.

**Protection rules:**

- `is_system = true` is set only by the seed script — never by API endpoints — and currently applies only to `mass`.
- `code` is immutable for every magnitude (system and non-system). Country deployments that need a different display label SHALL edit `name`, not `code`.
- The DELETE endpoint refuses any system magnitude with HTTP 422 (`MagnitudeIsSystemError`) regardless of reference count.
- The PATCH endpoint accepts only `name` for system magnitudes; sending `code`, `is_system`, or `status` is rejected at validation time.

**Country adaptation:** countries that need a magnitude beyond the seeded ten (e.g. `vehicles`, `persons`) create it via the maintainer screen at `/admin/magnitudes` with `is_system = false`. Non-system magnitudes — both the nine seeded with `is_system = false` and any admin-created ones — follow the standard reference-count rule for deletion.

### `rate_measurement_unit`

Rate units represent ratios of two measurement units (e.g. `kg/km`, `t CO₂e/kWh`). The canonical rate unit for every measurement unit `X` is `kg/X`, which is used internally by the emission factor system.

| Column                            | Notes                                |
| --------------------------------- | ------------------------------------ |
| `numerator_measurement_unit_id`   | FK → `measurement_unit`              |
| `denominator_measurement_unit_id` | FK → `measurement_unit`              |
| `abbreviation`                    | Derived as `<num_abbr>/<denom_abbr>` |
| `status`                          | `ACTIVE` or `DELETED` (soft-delete)  |

## Soft-Delete Semantics

Deleting a measurement unit soft-deletes both the unit and its canonical rate unit. The data is preserved for historical reporting. A soft-deleted unit can be restored if the same abbreviation is re-created.

Restore behavior:

- **`referenceCount = 0`** → full restore: all fields (name, magnitude, baseFactor, isBase) overwritten from the new request (`action: "fullyRestored"`).
- **`referenceCount > 0`** → labels-only restore: only `name` and `abbreviation` are updated; physical fields are locked to protect data integrity (`action: "restoredLabelsOnly"`).

## Field Locking

When a measurement unit has `referenceCount > 0` (at least one `CarbonInventoryLineInput`, `SubcategoryMeasurementUnit`, `EmissionFactor`, or applied factor row references it), the following fields become immutable:

- `magnitude`
- `baseFactor`
- `isBase`

Attempting to modify these fields via the PATCH endpoint returns HTTP 422 with error code `MEASUREMENT_UNIT_FIELDS_LOCKED`. The locked `magnitude` field is the FK `magnitude_id`.

## Reference Count Computation

The reference count for a measurement unit is computed as the sum of:

1. `CarbonInventoryLineInput` rows referencing the MU directly
2. `SubcategoryMeasurementUnit` rows referencing the MU
3. `EmissionFactor` rows referencing the canonical rate unit (`kg/<MU>`)
4. `CarbonInventoryLineInput` rows referencing the canonical rate unit via `manualFactorRateUnitId`
5. `CarbonInventoryLineFactor` rows referencing the canonical rate unit via `appliedFactorRateUnitId`

This is computed with 5 parallel `groupBy` queries in `getAllMeasurementUnits/service.ts` to avoid N+1 issues.

## Invariants

1. Every `ACTIVE` measurement unit must have exactly one canonical `ACTIVE` rate unit with `numerator.abbreviation = "kg"`.
2. The `kg` unit is immutable (HTTP 422 on modify/delete attempts).
3. Any unit with `isBase = true` is immutable.
4. Exactly one base unit per magnitude must exist at all times.
5. The canonical RMU seed coverage is checked at seed time — missing RMUs cause seed failure.

## Picker vs. Display Rule

> **Pickers** (selection dropdowns): query `WHERE status = 'ACTIVE'` only — users should not be able to assign deleted units to new data.
>
> **Display** (existing records): query without status filter — show the historical unit even if it was later deleted.

All current read endpoints (`getAllMeasurementUnits`, `getAllRateMeasurementUnits`) are picker-context endpoints and filter to `ACTIVE`. The `getCarbonInventoryMethodology` helper also filters to `ACTIVE` in its rate-unit map. Display-context reads (inside carbon inventory calculations) use the stored IDs directly and do not call these list endpoints.

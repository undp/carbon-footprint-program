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

Magnitudes classify the physical dimension of a measurement unit. They are reference data: ten system magnitudes are seeded (`mass`, `volume`, `distance`, `time`, `animals`, `area`, `power`, `energy`, `distance_mass`, `rooms`), and country deployments may add custom magnitudes via the admin maintainer screen.

| Column      | Type               | Notes                                                                       |
| ----------- | ------------------ | --------------------------------------------------------------------------- |
| `id`        | `bigint`           | Primary key                                                                 |
| `code`      | `text`             | Stable lowercase identifier matching `^[a-z][a-z0-9_]*$`, unique, immutable |
| `name`      | `text`             | Admin-editable Spanish display label                                        |
| `is_system` | `boolean`          | `true` for platform-seeded magnitudes (set only by the seed script)         |
| `status`    | `magnitude_status` | `ACTIVE` or `DELETED` (soft-delete)                                         |

System magnitudes (`is_system = true`) can be relabeled but never soft-deleted or have their `code` changed. Custom magnitudes are soft-deletable only when no `measurement_unit` references them.

#### Seeded system magnitudes

The platform seeds the following ten magnitudes with `is_system = true` (source: `packages/database/src/prisma/seeds/data/base/magnitudes.json`):

| `code`          | `name` (Spanish) | Base unit    | Notes                                                         |
| --------------- | ---------------- | ------------ | ------------------------------------------------------------- |
| `mass`          | Masa             | `g`          | `kg` is system-protected — never modifiable or deletable      |
| `volume`        | Volumen          | `L`          |                                                               |
| `distance`      | Distancia        | `m`          |                                                               |
| `time`          | Tiempo           | `h`          |                                                               |
| `animals`       | Animales         | `cant anim`  |                                                               |
| `area`          | Área             | `ha`         |                                                               |
| `power`         | Potencia         | `kWh`        |                                                               |
| `energy`        | Energía          | `GJ`         |                                                               |
| `distance_mass` | Distancia · Masa | `km-ton`     | Composed magnitude for transport activities                   |
| `rooms`         | Habitaciones     | `pieza arre` | Hospitality occupancy (renamed locally per country if needed) |

**Protection rules:**

- `is_system = true` is set only by the seed script — never by API endpoints.
- `code` is immutable for every magnitude (system and custom). Country deployments that need a different display label SHALL edit `name`, not `code`.
- The DELETE endpoint refuses any system magnitude with HTTP 422 (`MagnitudeIsSystemError`) regardless of reference count.
- The PATCH endpoint accepts only `name` for system magnitudes; sending `code`, `is_system`, or `status` is rejected at validation time.

**Country adaptation:** countries that need a magnitude beyond these ten (e.g. `vehicles`, `persons`) create it via the maintainer screen at `/admin/magnitudes` with `is_system = false`. Custom magnitudes follow the standard reference-count rule for deletion.

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

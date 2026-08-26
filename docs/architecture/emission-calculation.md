# Emission Calculation Logic

This document describes how the platform computes carbon emissions: the data model, the formulas applied, unit handling, aggregation, and the end-to-end flow from user input to displayed tCO₂e.

---

## Core Principle

```
emissions (kg CO₂e) = quantity × applied emission factor
```

Quantities and factors are captured immutably once a line is calculated, so any past result can be reproduced exactly. All intermediate emissions are stored in **kilograms** CO₂e; conversion to **tonnes** happens only at the display and aggregation layer.

### Unit contract

- **Database**: kg CO₂e.
- **API responses**: **tCO₂e** — every emission value the API returns is already converted (`kgToTon`), including derived values such as the main-activity equivalence (`rate` is tCO₂e per activity unit). The only exception is **emission factors**, which are returned in their own `kg CO₂e/<unit>` rate unit, since that is the unit the factor libraries publish.
- **Frontend**: formats only, never converts. A component that renders an API emission value must label it `tCO₂e` (`kg CO₂e` labels belong to emission factors alone).

---

## Data Model

Five tables cooperate to represent one calculated inventory line. All live in `packages/database/src/prisma/schema.prisma`.

### `CarbonInventoryLine`

Structural anchor linking an inventory to a subcategory. No numeric data.

```prisma
model CarbonInventoryLine {
  id                 BigInt     @id
  carbonInventoryId  BigInt
  subcategoryId      BigInt
  status             LineStatus // ACTIVE | DELETED
  inputs             CarbonInventoryLineInput[]
}
```

### `CarbonInventoryLineInput`

The user's input for the line: a quantity, a unit, dimension selections, and an input type. The `isActive` flag supports versioning — only the latest input per line is active.

```prisma
model CarbonInventoryLineInput {
  lineId                  BigInt
  quantity                Decimal?   // null for DIRECT
  measurementUnitId       BigInt?
  selection1Id            BigInt?    // dimension value 1
  selection2Id            BigInt?    // dimension value 2
  inputType               InputType  // SIMPLIFIED | EXPERT | DIRECT
  directTotalEmissions    Decimal?   // used only for DIRECT
  manualFactor            Decimal?   // used only for custom factors
  manualFactorSource      String?
  manualFactorRateUnitId  BigInt?
  isActive                Boolean
  factors                 CarbonInventoryLineFactor?
  result                  CarbonInventoryLineResult?
}
```

### `CarbonInventoryLineFactor`

The emission factor actually applied to this input — stored so the calculation is reproducible even if the master `EmissionFactor` table later changes.

```prisma
model CarbonInventoryLineFactor {
  lineInputId            BigInt   @unique
  appliedFactorValue     Decimal  // the coefficient used
  appliedFactorRateUnitId BigInt  // e.g., kgCO₂e / liter
  emissionFactorId       BigInt?  // null if custom factor
  appliedFactorSource    String
}
```

### `CarbonInventoryLineResult`

The computed result.

```prisma
model CarbonInventoryLineResult {
  lineInputId    BigInt   @unique
  totalEmissions Decimal  // stored in KILOGRAMS CO₂e
}
```

Decimals are stored with 28 digits and 10 decimal places to avoid precision loss.

---

## Supporting Tables

### `EmissionFactor`

The library of available factors, scoped to a subcategory and (optionally) up to two dimension values:

```prisma
model EmissionFactor {
  subcategoryId         BigInt
  dimensionValue1Id     BigInt?
  dimensionValue2Id     BigInt?
  value                 Decimal
  rateMeasurementUnitId BigInt    // e.g., kgCO₂e / liter
  source                String    // "GHG Protocol", "IPCC", etc.
  gasDetails            Json      // breakdown: co2Fossil, ch4, n2o, hfc, pfc, sf6, nf3
}
```

### `EmissionFactorDimension` and `EmissionFactorDimensionValue`

Dimensions (e.g., "Fuel Type") and their values (e.g., "Diesel", "Gasoline") let a single subcategory have multiple factors for different contexts. Values can be hierarchical via `parentValue`.

### `MeasurementUnit` and `RateMeasurementUnit`

```prisma
model Magnitude {
  id       BigInt  @id @default(autoincrement())
  code     String  @unique // lowercase, e.g. mass | volume | distance | time | area | power | energy | ...
  name     String           // admin-editable Spanish label
  isSystem Boolean @default(false)
}

model MeasurementUnit {
  name         String
  abbreviation String
  magnitudeId  BigInt   // FK → Magnitude
  baseFactor   Decimal  // conversion factor to the base unit of this magnitude
  isBase       Boolean
}

model RateMeasurementUnit {
  numeratorId   BigInt   // e.g., kg (of CO₂e)
  denominatorId BigInt   // e.g., liter
}
```

A `RateMeasurementUnit` expresses the shape of a factor (mass-per-volume, mass-per-distance, etc.).

---

## Input Types

Set per line in `CarbonInventoryLineInput.inputType`:

| Type         | Meaning                                                                                | Formula                         |
| ------------ | -------------------------------------------------------------------------------------- | ------------------------------- |
| `SIMPLIFIED` | User provides quantity + dimension selections; system resolves factor from the library | `quantity × resolvedFactor`     |
| `EXPERT`     | User provides quantity + custom factor value and source                                | `quantity × manualFactor`       |
| `DIRECT`     | User bypasses calculation and enters the final emissions value directly                | `directTotalEmissions` (stored) |

`UsageMode` (inventory-level: `SIMPLIFIED` or `EXPERT`) is a default; each line's `InputType` may override it, including the line-only `DIRECT` option.

---

## Calculation Service

The calculation happens in `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts` — specifically the `createLineResult` function:

```typescript
if (inputType === InputType.DIRECT && item.manualTotalEmissions !== null) {
  // User-provided tCO₂e, converted to kg for storage
  totalEmissions = mapDecimalField(tonToKg(item.manualTotalEmissions));
} else if (
  (inputType === InputType.SIMPLIFIED || inputType === InputType.EXPERT) &&
  item.quantity !== null &&
  item.appliedFactorValue !== null
) {
  // quantity × factor = kg CO₂e
  totalEmissions = mapDecimalField(item.quantity).mul(
    mapDecimalField(item.appliedFactorValue)
  );
}
```

The `appliedFactorValue` is **pre-normalized** to match the quantity's unit before being stored. Unit alignment is the API client's responsibility: it submits the factor in the same units as the quantity it resolved against.

---

## Emission Factor Resolution

There is **no server-side "find the right factor" function**. The web client resolves the factor from the `EmissionFactor` library (via `GET /emission-factors?...`) using:

- `subcategoryId`
- `dimensionValue1Id` (if applicable)
- `dimensionValue2Id` (if applicable)

The client then submits the resolved factor value and rate unit as part of the line input. The API validates consistency (no duplicate active factors per unique key, dimension values belong to the subcategory) but does not perform the final lookup.

This design keeps the server stateless about factor preferences and lets the UI adapt lookup logic per country or methodology version.

---

## Custom Factors

Users may enter their own factor if none in the library fits. Supported sources:

```typescript
// packages/utils/src/constants.ts
export const CUSTOM_FACTOR_SOURCES = ["Otro"];
```

When `manualFactorSource` is one of these values:

- `CarbonInventoryLineInput.manualFactor` stores the value
- `CarbonInventoryLineInput.manualFactorSource` stores the source label
- `CarbonInventoryLineInput.manualFactorRateUnitId` stores the rate unit
- `CarbonInventoryLineFactor.emissionFactorId` is **null** (custom, not in library)

---

## Aggregation

### Subtotals (per subcategory)

A PostgreSQL view aggregates active results per subcategory per inventory:

```sql
CREATE VIEW carbon_inventory_subtotals_view AS
SELECT
  ci.id             AS carbon_inventory_id,
  s.category_id,
  l.subcategory_id,
  COALESCE(SUM(r.total_emissions), 0) AS value
FROM carbon_inventory ci
INNER JOIN carbon_inventory_line l
  ON l.carbon_inventory_id = ci.id AND l.status = 'ACTIVE'
INNER JOIN subcategory s ON l.subcategory_id = s.id
LEFT JOIN carbon_inventory_line_input i
  ON i.line_id = l.id AND i.is_active = true
LEFT JOIN carbon_inventory_line_result r
  ON r.line_input_id = i.id
GROUP BY ci.id, s.category_id, l.subcategory_id;
```

(See migration `20260202171505_add_carbon_inventory_subtotals_view`.)

### Category totals and inventory totals

Higher-level sums are computed in application code by iterating the view's rows. `apps/api/src/features/carbonInventories/helpers.ts` builds a `Map<subcategoryId, tCO₂e>` by converting each stored kilogram value via `kgToTon`, then aggregates per category and per inventory.

---

## Display Precision

### The precision chain, end to end

Precision is lost at exactly one place, and it is not the one most people assume:

| Stage        | Representation              | What happens to precision                                                                                                                                                                                                                                                                 |
| ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database     | `Decimal(28, 10)`           | 10 decimal places, exact base-10. Quantities, factors and emissions all use it.                                                                                                                                                                                                           |
| API compute  | `Decimal.js`                | Multiplication and aggregation run in decimal arithmetic; no rounding.                                                                                                                                                                                                                    |
| API response | `number` (IEEE-754 float64) | **The one lossy step.** Serializing calls `Decimal.toNumber()`, so a value is snapped to the nearest double. It is not a _rounding_ — no digits are dropped on purpose — but decimal fidelity beyond ~15–17 significant digits is gone, and binary artefacts appear in computed operands. |
| Web compute  | `number` (float64)          | Step 3 recomputes line totals in the browser, inheriting float64 (see [float64 vs Decimal](../development/manual-testing-emission-capture.md#float64-vs-decimal)).                                                                                                                        |
| Web display  | `Intl.NumberFormat`         | Rounding for legibility, per kind of number — see below.                                                                                                                                                                                                                                  |

Two consequences worth stating plainly, because both have been reported as bugs:

- The API **never rounds**, but "unrounded" is a float64 guarantee, not decimal fidelity to the stored `Decimal`. For values of the magnitude this domain stores the two coincide; the unrounded formatter is capped at `DB_DECIMAL_SCALE` (10) decimals precisely so a computed operand renders `1.231,2` and not its binary tail.
- Emissions in **tCO₂e** are always `kg / 1000` — the storage unit is kilograms, the response unit is tonnes. Emission **factors** are the exception: they travel in their own `kg CO₂e/<unit>` rate unit, since that is how factor libraries publish them.

### Display rules by kind of number

Rounding is a frontend concern, owned by the `Formatter` in `apps/web/src/utils/formatting.ts` with its thresholds in `apps/web/src/config/constants.ts`. There is no single app-wide precision — each kind of number has its own rule, and the differences are deliberate:

| Kind               | Method                | Rule                                                                                                                                                               | Why                                                                                                                                              |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Emissions (tCO₂e)  | `emissions()`         | 2 decimals; widens to at most `MAX_DISPLAY_DECIMALS` below `0,01`; `<0,000001` under that.                                                                         | tCO₂e is the unit of report and comparison — its precision must not vary between inventories, screens or rankings.                               |
| Quantity           | `quantity()`          | Same as above.                                                                                                                                                     | The user typed it; echoing it back in a different precision is confusing.                                                                        |
| Emission factor    | `emissionFactor()`    | **4 significant digits**, floored at 2 and capped at 6 decimals: `0,05694` · `2,68` · `1.164,49`. Floor and cap take precedence over the significant-digit target. | A factor rounded to 2 decimals stops reproducing the emissions shown next to it. The floor guarantees no regression against the previous format. |
| Emission intensity | `emissionIntensity()` | Adaptive mass unit keeping the number in `[1, 1000)` — `tCO₂e` / `kgCO₂e` / `gCO₂e`; max 2 decimals; floor `<0,01 gCO₂e`. Returns `{ value, unit }`.               | A rate of `0,000057 tCO₂e` per unit is illegible in a hero typography; `57 gCO₂e` is the same number, readable.                                  |
| Unrounded (audit)  | `exact()`             | No display rounding, capped at `DB_DECIMAL_SCALE` (10) decimals.                                                                                                   | Backs the audit affordances; the cap suppresses float64 binary tails.                                                                            |

### Audit affordances

Because the display rounds and the calculation does not, two places in the UI expose the underlying numbers on demand — via hover, keyboard focus **or** tap, never mouse-only:

- **Exact factor.** A factor cell whose display rounds reveals `Valor usado en el cálculo: <unrounded>`. It appears **only** when the rounding actually hides digits: a tooltip that repeats the cell teaches users to ignore the affordance. Present in the step-3 capture grid and the step-4 `Factores utilizados` table.
- **Calculation chain.** A detailed line's emissions cell reveals `21.600 h × 0,057 kg/h = 1.231,2 kg = 1,2312 t`, every operand unrounded so the multiplication actually checks out. This is the audit path when a large quantity makes even a 4-significant-digit factor insufficient to reproduce the total.

The Excel export carries the same intent by different means: the factor is written as a **numeric** cell with a number format derived from these constants (out to the database's 10 decimals), not as a preformatted string — a spreadsheet has no tooltip to compensate a rounded display.

Full normative rules, including threshold edge cases and the rationale for each bound, live in the `emission-factor-precision` and `emission-intensity-units` specs under `openspec/specs/`.

---

## End-to-End Example

**Scenario:** An organization records 500 liters of diesel burned in a stationary combustion source.

1. **User input** — In the UI, the user selects the subcategory "Combustiones estacionarias", picks "Diesel" as the dimension value, enters `500` as the quantity, and selects `liters` as the unit.

2. **Factor lookup (client)** — The UI calls `GET /emission-factors?subcategoryId=...&dimensionValue1Id=...`. The library returns an `EmissionFactor` with `value = 2.38` and `rateMeasurementUnit = kgCO₂e / liter` (source: IPCC).

3. **Line input submission** — The UI posts to the inventory API with:

   ```json
   {
     "subcategoryId": "42",
     "inputType": "SIMPLIFIED",
     "quantity": "500",
     "measurementUnitId": "7", // liters
     "selection1Id": "13", // diesel
     "appliedFactorValue": "2.38",
     "appliedFactorRateUnitId": "21", // kgCO₂e / liter
     "appliedFactorSource": "IPCC",
     "emissionFactorId": "99"
   }
   ```

4. **Storage** — The API creates:
   - `CarbonInventoryLineInput` with the quantity, unit, and dimension selection.
   - `CarbonInventoryLineFactor` with `appliedFactorValue = 2.38`, referencing `emissionFactorId = 99`.
   - `CarbonInventoryLineResult` with `totalEmissions = 500 × 2.38 = 1190` (kilograms).

5. **Aggregation** — The subtotals view now reports 1190 kg under this inventory's "Combustiones estacionarias" subcategory.

6. **Display** — When the inventory is fetched, the API converts 1190 kg → 1.19 tCO₂e and returns that value. The UI renders `1.19 tCO₂e`.

7. **Reproducibility** — Even if IPCC later updates the diesel factor to 2.40, this line's result remains 1190 kg because `appliedFactorValue` was snapshotted at creation time.

---

## Direct-entry Example

For organizations that already have calculated emissions (e.g., from a prior consultant), the `DIRECT` input type bypasses the formula:

```json
{
  "inputType": "DIRECT",
  "manualTotalEmissions": "3.50" // tonnes CO₂e
}
```

The API stores `3.50 × 1000 = 3500` kg in `CarbonInventoryLineResult.totalEmissions`. No factor record is created.

---

## Related Files

| Concern               | Path                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Data model            | `packages/database/src/prisma/schema.prisma`                                                               |
| Calculation helper    | `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts`                               |
| Unit conversion       | `packages/utils/src/number.ts` (`kgToTon`, `tonToKg`)                                                      |
| Custom factor sources | `packages/utils/src/constants.ts`                                                                          |
| Subtotals view        | `packages/database/src/prisma/migrations/20260202171505_add_carbon_inventory_subtotals_view/migration.sql` |
| Display precision     | `apps/web/src/utils/formatting.ts` (`Formatter`), `apps/web/src/config/constants.ts`                       |
| Number formatting API | [Number Formatting](../development/number-formatting.md)                                                   |

---

## Verifying the calculation by hand

[Manual Testing — Emission Capture](../development/manual-testing-emission-capture.md) is a pinned acceptance case for the capture screen: a fixture inventory covering all three categories and seven magnitudes, the exact inputs to type, and the expected per-line, per-subcategory and per-category totals. Use it after touching factor resolution, unit conversion, aggregation, or display formatting.

Two behaviours documented there are worth knowing when reading this page:

- The capture screen resolves factors from `GET /carbon-inventories/:id/methodology`, which returns each stored factor **plus a pre-generated variant per compatible rate unit**, rather than from `GET /emission-factors`.
- Step 3 computes line totals in the browser with float64, while the persisted result is a `Decimal`. A single line can therefore differ by 0.01 tCO₂e between step 3 and step 4. This is the one gap the audit affordances above cannot close, since both numbers are internally consistent with their own arithmetic.

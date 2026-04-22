# Emission Calculation Logic

This document describes how the platform computes carbon emissions: the data model, the formulas applied, unit handling, aggregation, and the end-to-end flow from user input to displayed tCO₂e.

---

## Core Principle

```
emissions (kg CO₂e) = quantity × applied emission factor
```

Quantities and factors are captured immutably once a line is calculated, so any past result can be reproduced exactly. All intermediate emissions are stored in **kilograms** CO₂e; conversion to **tonnes** happens only at the display and aggregation layer.

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
model MeasurementUnit {
  name       String
  abbreviation String
  magnitude  Magnitude  // MASS | VOLUME | DISTANCE | TIME | AREA | POWER | ENERGY | ...
  baseFactor Decimal    // conversion factor to the base unit of this magnitude
  isBase     Boolean
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

| Type | Meaning | Formula |
|---|---|---|
| `SIMPLIFIED` | User provides quantity + dimension selections; system resolves factor from the library | `quantity × resolvedFactor` |
| `EXPERT` | User provides quantity + custom factor value and source | `quantity × manualFactor` |
| `DIRECT` | User bypasses calculation and enters the final emissions value directly | `directTotalEmissions` (stored) |

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
    mapDecimalField(item.appliedFactorValue),
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
export const CUSTOM_FACTOR_SOURCES = ["Factor Propio", "Otro"];
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

- Storage: Decimal(28, 10).
- API returns tCO₂e with full precision (the conversion is `kg / 1000`).
- UI displays 2 decimals (`EMISSIONS_PRECISION = 2` in `apps/api/src/config/constants.ts`).

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
     "measurementUnitId": "7",         // liters
     "selection1Id": "13",             // diesel
     "appliedFactorValue": "2.38",
     "appliedFactorRateUnitId": "21",  // kgCO₂e / liter
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
  "manualTotalEmissions": "3.50"   // tonnes CO₂e
}
```

The API stores `3.50 × 1000 = 3500` kg in `CarbonInventoryLineResult.totalEmissions`. No factor record is created.

---

## Related Files

| Concern | Path |
|---|---|
| Data model | `packages/database/src/prisma/schema.prisma` |
| Calculation helper | `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts` |
| Unit conversion | `packages/utils/src/number.ts` (`kgToTon`, `tonToKg`) |
| Custom factor sources | `packages/utils/src/constants.ts` |
| Subtotals view | `packages/database/src/prisma/migrations/20260202171505_add_carbon_inventory_subtotals_view/migration.sql` |
| Display precision | `apps/api/src/config/constants.ts` (`EMISSIONS_PRECISION`) |

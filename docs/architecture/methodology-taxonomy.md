# Methodology and Emission Factor Taxonomy

This document describes how the platform organises the emission factor library: the data model from `MethodologyVersion` down to individual `EmissionFactor` records, how dimensions work, how the seed format is structured, and how the taxonomy connects to carbon inventories.

---

## Overview

Every carbon inventory references a **methodology version** — a complete, country-specific taxonomy of emission categories, subcategories, dimensional axes, and factors. The full hierarchy is:

```
MethodologyVersion  (one per active country deployment)
  └── Category[]              (e.g., "Emisiones directas")
        └── Subcategory[]     (e.g., "Combustiones estacionarias")
              ├── EmissionFactorDimension[]   (e.g., "Tipo de combustible")
              │     └── EmissionFactorDimensionValue[]  (e.g., "Diesel", "Gas natural")
              ├── EmissionFactor[]            (one per dimension-value combination)
              ├── SubcategoryMeasurementUnit[] (allowed input units)
              └── SubcategoryRecommendation[] (sector/subsector applicability hints)
```

---

## Data Model

### `MethodologyVersion`

The root container. Each country has one `PUBLISHED` version at a time.

```prisma
model MethodologyVersion {
  id          BigInt                   @id @default(autoincrement())
  countryId   BigInt                   @map("country_id")
  name        String
  description String
  regulation  String                   // e.g., "GHG Protocol"
  version     String                   // e.g., "2004"
  status      MethodologyVersionStatus
  createdAt   DateTime                 @default(now()) @map("created_at")
  updatedAt   DateTime?                @updatedAt @map("updated_at")

  categories        Category[]
  carbonInventories CarbonInventory[]

  @@map("methodology_version")
}

enum MethodologyVersionStatus {
  PUBLISHED
  UNPUBLISHED
  DELETED
}
```

A carbon inventory stores a `methodologyVersionId` foreign key, so the taxonomy that was active at data-entry time is preserved even if the methodology is later superseded.

> **Note:** There is no standalone `Methodology` model. `MethodologyVersion` is the atomic unit; versioning is expressed by creating a new `MethodologyVersion` record. A database-level uniqueness constraint (partial, `status <> 'DELETED'`) prevents two published versions with the same name per country, and a convention (enforced via application logic) limits each country to one `PUBLISHED` version at a time.

---

### `Category`

A top-level grouping of emission sources, displayed with a colored icon in the UI.

```prisma
model Category {
  id                   BigInt         @id @default(autoincrement())
  methodologyVersionId BigInt         @map("methodology_version_id")
  name                 String
  synonyms             String         // e.g., "CATEGORIA 1 / ALCANCE 1" (GHG Protocol scope label)
  description          String
  examples             String?
  position             Int            // display order; must be > 0; unique per methodologyVersion
  icon                 String         // icon key used by the frontend (e.g., "DIRECT_EMISSION")
  color                String         // hex color for UI (e.g., "#FFB74D")
  status               CategoryStatus @default(ACTIVE)

  subcategories Subcategory[]

  @@map("category")
}
```

Categories are ordered by `position` ascending. The `synonyms` field maps to GHG Protocol scope terminology (Scope 1 / Scope 2 / Scope 3) or local equivalents, displayed alongside the category name.

---

### `Subcategory`

A specific emission source type within a category. This is the level at which users enter inventory data.

```prisma
model Subcategory {
  id          BigInt            @id @default(autoincrement())
  categoryId  BigInt            @map("category_id")
  name        String
  description String
  examples    String?
  icon        String            // icon key (e.g., "FACTORY")
  status      SubcategoryStatus @default(ACTIVE)

  dimensions              EmissionFactorDimension[]
  emissionFactors         EmissionFactor[]
  inventoryLines          CarbonInventoryLine[]
  subcategoryMeasurementUnits SubcategoryMeasurementUnit[]
  recommendations         SubcategoryRecommendation[]
  reductionPlanInitiatives ReductionPlanInitiative[]
  reductionProjects       ReductionProject[]

  @@map("subcategory")
}
```

Subcategory names are unique within a category (partial unique index, excluding deleted records).

---

### `EmissionFactorDimension`

A dimensional axis for a subcategory — for example, "Fuel Type" or "Vehicle Category". A subcategory can have up to two dimensions (`dimension_value_1_id` and `dimension_value_2_id` on `EmissionFactor`).

```prisma
model EmissionFactorDimension {
  id            BigInt                        @id @default(autoincrement())
  subcategoryId BigInt                        @map("subcategory_id")
  code          String                        // machine-readable identifier (e.g., "Combustibles_Tipo")
  name          String                        // human-readable label (e.g., "Tipo de combustible")
  position      Int                           // 1 or 2 — controls which slot on EmissionFactor
  isRequired    Boolean                       @map("is_required")
  status        EmissionFactorDimensionStatus @default(ACTIVE)

  values EmissionFactorDimensionValue[]

  @@map("emission_factor_dimension")
}
```

`isRequired` indicates whether a user must select a value for this dimension before the emission factor can be resolved. If `false`, the dimension is optional — the factor applies when the user does not make a selection.

---

### `EmissionFactorDimensionValue`

A concrete option within a dimension. Values can be hierarchical — a value may have a `parentValueId`, allowing the UI to render nested dropdowns (e.g., "Vehicles" → "Cars" → "Diesel cars").

```prisma
model EmissionFactorDimensionValue {
  id            BigInt                              @id @default(autoincrement())
  dimensionId   BigInt                              @map("dimension_id")
  parentValueId BigInt?                             @map("parent_value_id")
  value         String
  status        EmissionFactorDimensionValueStatus  @default(ACTIVE)

  parentValue EmissionFactorDimensionValue?  @relation("dimension_value_hierarchy", ...)
  childValues EmissionFactorDimensionValue[] @relation("dimension_value_hierarchy")

  @@map("emission_factor_dimension_value")
}
```

---

### `EmissionFactor`

The coefficient used to convert a quantity into kg CO₂e. Each factor is scoped to a subcategory and (optionally) up to two dimension values.

```prisma
model EmissionFactor {
  id                    BigInt               @id @default(autoincrement())
  subcategoryId         BigInt               @map("subcategory_id")
  dimensionValue1Id     BigInt?              @map("dimension_value_1_id")
  dimensionValue2Id     BigInt?              @map("dimension_value_2_id")
  rateMeasurementUnitId BigInt               @map("rate_measurement_unit_id")  // e.g., kgCO₂e/liter
  source                String               // "GHG Protocol", "IPCC AR6", "DEFRA 2025", etc.
  gasDetails            Json                 @db.JsonB   // per-gas breakdown
  value                 Decimal              @db.Decimal(28, 10)
  status                EmissionFactorStatus @default(ACTIVE)

  @@map("emission_factor")
}
```

A null `dimensionValue1Id` means the factor applies regardless of dimension 1; similarly for dimension 2. This enables a fallback factor for a subcategory that requires no dimension selection.

#### `gasDetails` structure

The `gasDetails` JSONB field breaks down the total factor value by greenhouse gas. All fields default to `0`.

```typescript
// packages/types/src/baseSchemas/gasDetails.ts
{
  CO2_FOSSIL: number,  // fossil CO₂ contribution
  CH4:        number,  // methane
  N2O:        number,  // nitrous oxide
  HFC:        number,  // hydrofluorocarbons
  PFC:        number,  // perfluorocarbons
  SF6:        number,  // sulfur hexafluoride
  NF3:        number,  // nitrogen trifluoride
}
```

Example — a diesel factor of 2.68 kgCO₂e/liter:

```json
{
  "CO2_FOSSIL": 2.65,
  "CH4": 0.002,
  "N2O": 0.028,
  "HFC": 0,
  "PFC": 0,
  "SF6": 0,
  "NF3": 0
}
```

The sum of all gas values equals the factor's `value`. Validation is performed by `parseGasDetails()` in `@repo/utils`.

---

### `SubcategoryMeasurementUnit`

Defines which measurement units are valid input for a subcategory (e.g., a "Combustiones estacionarias" subcategory may accept `g`, `kg`, and `ton` but not `km` or `m²`).

```prisma
model SubcategoryMeasurementUnit {
  id                BigInt @id @default(autoincrement())
  subcategoryId     BigInt @map("subcategory_id")
  measurementUnitId BigInt @map("measurement_unit_id")

  @@unique([subcategoryId, measurementUnitId])
  @@map("subcategory_measurement_unit")
}
```

---

### `SubcategoryRecommendation`

Maps a subcategory to an organization sector (and optionally subsector), indicating that organizations in that sector should typically include data for this subcategory. Used to pre-populate suggested subcategories when creating a carbon inventory.

```prisma
model SubcategoryRecommendation {
  id            BigInt           @id @default(autoincrement())
  subcategoryId BigInt           @map("subcategory_id")
  sectorId      BigInt           @map("sector_id")
  subsectorId   BigInt?          @map("subsector_id")

  @@unique([subcategoryId, sectorId, subsectorId])
  @@map("subcategory_recommendation")
}
```

The `SUBCATEGORY_RECOMMENDATION_MODE` system parameter controls how these recommendations are resolved:

| Mode | Behaviour |
|---|---|
| `SPECIFIC` | Return subcategories where `sectorId` AND `subsectorId` match exactly |
| `GENERIC` | Return subcategories matching the sector, where `subsectorId` is null or matches |

See [System Parameters Reference](../development/system-parameters.md) for full details.

---

## Measurement Units

Two models handle unit-related data:

```prisma
model MeasurementUnit {
  id           BigInt    @id @default(autoincrement())
  name         String
  abbreviation String
  magnitude    Magnitude // MASS | VOLUME | DISTANCE | TIME | AREA | POWER | ENERGY | ANIMALS | ROOMS | DISTANCE_MASS
  baseFactor   Decimal   // conversion factor to the base unit of this magnitude
  isBase       Boolean
}

model RateMeasurementUnit {
  numeratorId   BigInt  // e.g., kg (CO₂e)
  denominatorId BigInt  // e.g., liter
}
```

`Magnitude` classifies the physical dimension of a unit. `baseFactor` enables unit conversions (e.g., 1 ton = 1000 × baseFactor of kg). `RateMeasurementUnit` expresses the shape of an emission factor (mass-per-volume, mass-per-distance, etc.).

---

## Seed Data Format

The methodology data is seeded from `packages/database/src/prisma/seeds/data/base/methodologies.json`. The file is an array of methodology definitions, one per country:

```jsonc
[
  {
    "countryIsoCode": "CL",
    "name": "Metodología inicial",
    "description": "Metodología inicial para Chile",
    "regulation": "GHG Protocol",
    "version": "2004",
    "categories": [
      {
        "name": "Emisiones directas",
        "synonyms": "CATEGORIA 1 / ALCANCE 1",
        "description": "Generadas dentro de tu empresa",
        "position": 1,
        "icon": "DIRECT_EMISSION",
        "color": "#FFB74D",
        "subcategories": [
          {
            "name": "Combustiones estacionarias",
            "description": "Equipos no móviles bajo control de la empresa...",
            "icon": "FACTORY",
            "allowedMeasurementUnitsAbbreviations": ["g", "kg", "ton"],
            "emissionFactorDimensions": [
              {
                "code": "Combustiones_estacionarias_Combustible",
                "name": "Combustible",
                "position": 1,
                "isRequired": true,
                "values": [
                  { "name": "Biodiésel", "parentValue": null },
                  { "name": "Diesel",    "parentValue": null }
                ]
              }
            ],
            "emissionFactors": [
              {
                "dimensionValue1": {
                  "dimensionCode": "Combustiones_estacionarias_Combustible",
                  "valueName": "Diesel"
                },
                "dimensionValue2": null,
                "rateMeasurementUnitAbbreviation": "kg/liter",
                "source": "DEFRA 2025",
                "value": 2.68
              }
            ]
          }
        ]
      }
    ]
  }
]
```

**Key conventions in the seed format:**

| Field | Convention |
|---|---|
| `countryIsoCode` | ISO 3166-1 alpha-2 (e.g., `"CL"`) — must match a row in the `country` table |
| `position` | Integer ≥ 1; determines display order of categories |
| `icon` | String key resolved by the frontend to an SVG or icon component |
| `color` | Hex color string for category card backgrounds |
| `synonyms` | Free text, often the GHG Protocol scope label (used for display only) |
| `allowedMeasurementUnitsAbbreviations` | Must match `MeasurementUnit.abbreviation` values already seeded |
| `emissionFactors[].dimensionValue1 / dimensionValue2` | References a value by dimension code + value name; null means no dimension constraint |
| `rateMeasurementUnitAbbreviation` | Must resolve to a `RateMeasurementUnit` by matching numerator and denominator abbreviations |

---

## API Endpoints

These endpoints expose the taxonomy to the frontend. All require authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/categories?methodologyVersionId=` | All active categories for a version, ordered by position |
| `GET` | `/subcategories?methodologyVersionId=` | All active subcategories with their allowed measurement units |
| `GET` | `/emission-factor-dimensions?methodologyVersionId=` | Dimension configurations with values and in-use status |
| `GET` | `/emission-factors?methodologyVersionId=` | All active factors with resolved dimension names and gas details |

The `methodologyVersionId` query parameter is required for all four endpoints. The frontend resolves the active version from the current carbon inventory.

---

## How the Taxonomy Connects to Carbon Inventories

When a user creates a carbon inventory, they select (or inherit) a `methodologyVersionId`. This pins the full taxonomy for that inventory:

1. The UI loads categories and subcategories via the endpoints above.
2. The user selects a subcategory and one or two dimension values.
3. The UI queries `GET /emission-factors` filtered by the subcategory and selected dimension values to resolve the applicable factor.
4. The resolved `factorValue` and `rateMeasurementUnitId` are submitted with the line input and stored in `CarbonInventoryLineFactor` — snapshotted at submission time.

Changing the active methodology version (publishing a new one) does not affect existing inventories, which remain bound to their original version.

See [Emission Calculation Logic](./emission-calculation.md) for how the factor value is applied to produce tCO₂e.

---

## Adding a New Country's Methodology

See [Country Onboarding Guide](../development/country-onboarding.md) for the full procedure. The methodology JSON is the most complex seed artifact and must define:

1. The complete category → subcategory → dimension → dimension-value tree.
2. One emission factor per (subcategory, dimensionValue1, dimensionValue2) combination.
3. Allowed measurement unit abbreviations (must match pre-seeded units).
4. Subcategory recommendations linking subcategories to country sector/subsector codes.

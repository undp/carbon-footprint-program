# Country Onboarding Guide

This guide explains what needs to be configured to deploy Huella Latam in a new country. The platform is country-agnostic by design — all country-specific data lives in seed JSON files, not in application code.

---

## Overview

Each country deployment requires:

1. A **country record** with an ISO code
2. **Lookup tables** — job positions, organization sizes, sectors/subsectors
3. A **carbon accounting methodology** — categories, subcategories, emission factor dimensions, and emission factor values
4. **Subcategory recommendations** — curated emission sources per sector
5. **Organization main activities** — KPI metrics per sector
6. An **OIDC-compatible IdP** (e.g. Entra External ID, Keycloak) for authentication
7. A dedicated Azure **infrastructure deployment** per environment

All data in items 1–5 is loaded from declarative JSON seed files under `tools/seed/src/data/base/`.

---

## Step 1 — Add the Country Record

**File:** `tools/seed/src/data/base/countries.json`

```json
[
  { "name": "Chile", "isoCode": "CL" },
  { "name": "Colombia", "isoCode": "CO" }
]
```

Use the [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) code. All subsequent seed files reference the country by this code.

---

## Step 2 — Job Positions

**File:** `tools/seed/src/data/base/country_job_positions.json`

Job positions are the roles that organization representatives hold. They appear in user registration and organization data forms.

```json
[
  { "name": "Director Ejecutivo (CEO)", "countryIsoCode": "CO" },
  { "name": "Director de Sostenibilidad", "countryIsoCode": "CO" },
  { "name": "Analista de Huella de Carbono", "countryIsoCode": "CO" },
  { "name": "Otro", "countryIsoCode": "CO" }
]
```

Localize titles to the country's professional nomenclature. Always include an "Otro" (Other) entry as a fallback.

---

## Step 3 — Organization Size Categories

**File:** `tools/seed/src/data/base/country_organization_size.json`

Size categories classify organizations by employee count or revenue. Each country may use a different official classification (e.g., Colombia's MIPYME classification differs from Chile's).

```json
[
  { "name": "Microempresa (1-10 empleados)", "countryIsoCode": "CO" },
  { "name": "Pequeña empresa (11-50 empleados)", "countryIsoCode": "CO" },
  { "name": "Mediana empresa (51-200 empleados)", "countryIsoCode": "CO" },
  { "name": "Gran empresa (más de 200 empleados)", "countryIsoCode": "CO" }
]
```

---

## Step 4 — Sectors and Subsectors

**File:** `tools/seed/src/data/base/country_sector_subsectors.json`

Sectors classify organizations by economic activity. Subsectors provide finer-grained classification within each sector.

```json
[
  {
    "countryIsoCode": "CO",
    "sector": "Manufactura / Industria Manufacturera",
    "subsectors": [
      "Alimentos y Bebidas - Procesamiento de carnes",
      "Textil y Vestuario - Tejidos",
      "Otro"
    ]
  },
  {
    "countryIsoCode": "CO",
    "sector": "Servicios",
    "subsectors": ["Servicios Financieros", "Tecnología y Software", "Otro"]
  }
]
```

Each subsector should end with an "Otro" option. Sectors drive the subcategory recommendation logic — the more precisely they map to real industry groups, the more useful the recommendations will be.

---

## Step 5 — Organization Main Activities

**File:** `tools/seed/src/data/base/organization_main_activities.json`

Main activities are KPI metrics used to normalize emissions (e.g., tCO₂e per employee, per ton produced). They appear when organizations configure their reporting baseline.

```json
[
  {
    "countryIsoCode": "CO",
    "sector": null,
    "mainActivities": [
      "millones de COP de ingresos",
      "empleados",
      "m² construidos",
      "vehículos"
    ]
  },
  {
    "countryIsoCode": "CO",
    "sector": "Manufactura / Industria Manufacturera",
    "mainActivities": [
      "toneladas producidas",
      "unidades fabricadas",
      "horas de operación de planta"
    ]
  }
]
```

When `sector` is `null`, the activities apply to all sectors (global metrics). Sector-specific entries supplement the global list.

---

## Step 6 — Carbon Accounting Methodology

**File:** `tools/seed/src/data/base/methodologies.json`

This is the most complex seed file. It defines the country's carbon accounting standard: which emission categories and sources to track, how to measure them, and what emission factors to use.

### Structure

```json
[
  {
    "countryIsoCode": "CO",
    "name": "Metodología GHG Protocol Colombia",
    "description": "Metodología basada en el GHG Protocol para Colombia",
    "regulation": "GHG Protocol",
    "version": "2004",
    "categories": [...]
  }
]
```

The **first methodology in the array** for a country is seeded with status `PUBLISHED`. Additional methodologies start as `UNPUBLISHED`.

### Category structure

```json
{
  "name": "Emisiones directas",
  "synonyms": "CATEGORIA 1 / ALCANCE 1",
  "description": "Generadas dentro de tu empresa",
  "position": 1,
  "icon": "DIRECT_EMISSION",
  "color": "#FFB74D",
  "subcategories": [...]
}
```

Standard GHG Protocol categories:

| Position | Name                             | Scope   |
| -------- | -------------------------------- | ------- |
| 1        | Emisiones directas               | Scope 1 |
| 2        | Emisiones indirectas por energía | Scope 2 |
| 3        | Otras emisiones indirectas       | Scope 3 |

### Subcategory structure

```json
{
  "name": "Combustiones estacionarias",
  "description": "...",
  "emissionFactorDimensions": [
    {
      "code": "Combustiones estacionarias_Tipo",
      "name": "Tipo",
      "position": 1,
      "isRequired": false,
      "values": [
        { "name": "Caldera", "parentValue": null },
        { "name": "Generador", "parentValue": null }
      ]
    }
  ],
  "emissionFactors": [
    {
      "dimensionValue1": {
        "dimensionCode": "Combustiones estacionarias_Tipo",
        "valueName": "Caldera"
      },
      "rateMeasurementUnitAbbreviation": "kg CO2e/m3",
      "source": "MMA Chile 2020",
      "value": 2.31
    }
  ]
}
```

**Emission factor dimensions** define the axes along which factors vary (e.g., fuel type, vehicle type). Each dimension has a list of valid values that may be hierarchical (child values reference a `parentValue`).

**Emission factors** associate a numeric value with a specific combination of dimension values, a measurement unit, and a source citation.

> **Important:** Emission factor values must be sourced from the country's official environmental authority or an internationally recognized standard (GHG Protocol, IPCC, IEA). Document the source and year in the `source` field.

---

## Step 7 — Subcategory Recommendations

**File:** `tools/seed/src/data/base/subcategory_recommendations.json`

Recommendations guide organizations toward the emission sources most relevant to their sector, reducing the initial setup burden.

```json
[
  {
    "countryIsoCode": "CO",
    "sectorName": "Manufactura / Industria Manufacturera",
    "subsectorName": null,
    "subcategoryNames": [
      "Combustiones estacionarias",
      "Electricidad",
      "Emisiones fugitivas"
    ]
  },
  {
    "countryIsoCode": "CO",
    "sectorName": "Manufactura / Industria Manufacturera",
    "subsectorName": "Alimentos y Bebidas - Procesamiento de carnes",
    "subcategoryNames": [
      "Consumo de agua y tratamiento de aguas residuales",
      "Disposición de residuos sólidos"
    ]
  }
]
```

`subsectorName: null` means the recommendation applies to the entire sector. Subsector-specific entries add to (or override, depending on the `SUBCATEGORY_RECOMMENDATION_MODE` system parameter) the sector-level list.

---

## Step 8 — Initial Superadmin User

After seeding, create the first SUPERADMIN user by:

1. Having the intended admin log in once via the configured IdP (creates a `User` record with `systemRole = USER`).
2. Updating their role directly in the database:

```sql
UPDATE "User"
SET "systemRole" = 'SUPERADMIN', "updatedAt" = now()
WHERE email = 'admin@example.co';
```

---

## Step 9 — OIDC IdP Setup (Entra, Keycloak, …)

Authentication requires any OIDC-compatible IdP. The platform supports any OIDC issuer (Keycloak is the development IdP; Entra External ID, Auth0, Okta, and Google are also supported) — Entra is not mandatory.

Whichever IdP is used, the client IT team must register two clients (one for the API, one for the frontend) and configure the frontend's redirect URIs.

**Azure Entra path (one option).** When deploying against an Entra External ID (CIAM) tenant or an organizational Azure AD tenant:

1. Create an Entra External ID tenant (or use an existing organizational AD).
2. Register two app registrations: one for the API, one for the frontend.
3. Configure redirect URIs for the frontend app registration.
4. Provide the following values (deploy inputs — the deploy derives the API's `JWKS_*` and the frontend's `VITE_OIDC_*` from them):

| Variable                 | Source                              |
| ------------------------ | ----------------------------------- |
| `AZURE_TENANT_ID`        | Tenant GUID                         |
| `AZURE_TENANT_SUBDOMAIN` | Subdomain (CIAM only)               |
| `AZURE_API_CLIENT_ID`    | API app registration client ID      |
| `AZURE_FRONT_CLIENT_ID`  | Frontend app registration client ID |

For a non-Azure IdP (e.g. Keycloak), set the API's `JWKS_*` and the frontend's `VITE_OIDC_*` variables directly.

See [Environment Variables](./environment-variables.md) and [OIDC authentication setup](../infrastructure/GenericOidcAuthenticationSetup.md) (which links to the provider-specific Azure Entra and Keycloak guides) for full details.

---

## Step 10 — Infrastructure Deployment

Each country environment (staging + production) runs on its own Azure subscription or resource group. Follow the infrastructure deployment guide:

1. Set the `infra/.envrc` variables for the target environment (subscription, resource group, location).
2. Run the Bicep deployment: see [Deployment Guide](../infrastructure/Deployment.md).
3. Deploy the API container: see [API Deployment](../infrastructure/ApiDeployment.md).
4. Deploy the frontend: see [Frontend Deployment](../infrastructure/StaticWebAppDeployment.md).
5. Set authentication variables in App Service configuration (they are not injected by Bicep automatically).

---

## Step 11 — Apply Seeds to the New Environment

Run migrations and seeds against the production database:

```bash
# Apply pending migrations
DATABASE_URL="postgresql://..." pnpm --filter @repo/database prod:deploy

# Seed the production database
DATABASE_URL="postgresql://..." SEEDS_DATASET=base pnpm --filter @repo/seed seed
```

> The seed only runs against a fresh database. If the target database already contains data, the seed logs a message and exits without changes — so it is safe to run by mistake, but it will **not** apply seed updates to an already-populated environment. Updating reference data in an existing environment must be done through the admin UI or a migration.

> Never run `db:restore` against a production database — it drops all data first.

---

## Seed Data Testing

Before deploying to production, verify the seed data locally:

```bash
pnpm db:restore      # Resets local DB, runs all migrations, applies base seeds
```

Check:

- All sectors and subsectors are loading correctly
- Methodology categories and subcategories are complete
- Emission factors have valid unit abbreviations (must match `MeasurementUnit.abbreviation` in the seed)
- Subcategory recommendations reference valid subcategory names

---

## Country-Specific Parameters

The `CountryParameter` model allows per-country configuration that differs from the global `SystemParameter`. As of the current release, no country parameters are seeded — the model is available for future use when country-level feature toggles are needed.

---

## Seeding Order Summary

The seed scripts must run in this order (enforced by `seed.ts`):

1. Measurement units (global)
2. System parameters (global)
3. Countries
4. Country job positions
5. Country organization sizes
6. Country sectors/subsectors
7. Organization main activities
8. Users (optional, for local dev)
9. Methodology data (methodology → categories → subcategories → dimensions → factors)
10. Explanations
11. Subcategory recommendations
12. Reduction plan initiatives
13. Badges

Adding a new country only requires modifying the JSON files in steps 3–9, 11, and 12. No code changes are needed.

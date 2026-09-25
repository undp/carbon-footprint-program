# 2. Seed content

The country replaces 15 data files and about 70 Markdown texts; no code changes are needed.
Everything lives in [`tools/seed/src/data/base/`](../../tools/seed/src/data/base/) except the
chatbot corpus. This is the longest phase: we estimate 6–10 weeks of methodology-team work,
dominated by the emission factors and the 30 subcategory guides.

The field-by-field format of each file is in
[`../development/country-onboarding.md`](../development/country-onboarding.md). This document says
**what** to replace, **who** does it and **what to decide**.

← [1. Institutional decisions](./01-institutional-decisions.md) · [Index](./README.md) · Next: [3. Configuration and branding](./03-configuration-and-branding.md) →

---

## The rule behind everything: the seed runs only once

The seed is applied only to an empty database. If the country table already has rows, it exits
without changes. After the first boot, any adjustment is made through the platform's maintainer
screens, not by editing JSON.

So we propose this order:

1. Prepare the full country content in the seed, on the country's own branch or fork, reviewed like
   code.
2. Validate it locally or in staging with `pnpm db:restore`, which resets the database and re-seeds
   every time.
3. Seed production once, with the approved version.
4. From then on, maintain the catalogue through the maintainer screens (see
   [what can be changed after the first boot](#what-can-be-changed-after-the-first-boot)).

## Upfront decision: keep the `PD` code or use your own

The upstream project fixes methodology content (guides, labels, dimensions, factors) with data
migrations that only touch the `PD` country with the "Metodología inicial" methodology. This
decision determines whether the country receives them.

| Option                                                                    | Receives upstream corrections                                         | Risk                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Own ISO code (e.g. `DO`, `PE`) and own methodology name **(recommended)** | No: each correction is reviewed and applied by hand in the maintainer | Every release's migrations must be read as a changelog            |
| Keep `PD` and "Metodología inicial"                                       | Yes, automatically on migrate                                         | An upstream correction can overwrite a national decision silently |

To list those migrations:

```bash
grep -l "iso_code.*= 'PD'" packages/database/src/prisma/migrations/*/migration.sql
```

## Seed inventory

Paths are relative to `tools/seed/src/data/base/` unless stated otherwise.

| File or folder                                                             | What it holds today                                         | What the country must do                                                                    | Owner                 | Effort |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------ |
| `methodologies.json` — factors                                             | 284 factors: 195 DEFRA 2025, 83 IPCC, 6 from other sources  | Replace with official national factors; record `source` and `year` on each                  | Methodology           | High   |
| `methodologies.json` — structure                                           | 3 categories, 30 subcategories, dimensions and their values | Fit to the national framework; rename, remove or add subcategories                          | Methodology           | Medium |
| `explanations/subcategories/*.md`                                          | 30 guides, one per subcategory                              | Rewrite examples with local currency, prices and realities                                  | Methodology + content | High   |
| `explanations/categories/*.md`                                             | 3 texts, one per category                                   | Review wording and regulatory references                                                    | Methodology           | Low    |
| `explanations/standalone/*.md` + `standalone_explanations.json`            | 35 screen help texts ("i" icon)                             | Review tone and terms; adjust if a flow changes (e.g. manual review)                        | Content               | Medium |
| `country_sector_subsectors.json`                                           | 18 generic sectors with subsectors                          | Align with the official economic classification (national ISIC)                             | Methodology           | Medium |
| `subcategory_recommendations.json`                                         | Suggested subcategories per sector and subsector            | Redo after changing sectors or subcategories; names must match exactly                      | Methodology           | Medium |
| `organization_main_activities.json`                                        | Intensity indicators, with amounts in CLP                   | Switch to local currency; add sector-specific indicators                                    | Methodology           | Low    |
| `country_organization_size.json`                                           | 8 brackets by headcount                                     | Use the country's official MSME classification                                              | Authority             | Low    |
| `country_job_positions.json`                                               | Generic job titles                                          | Adapt to local naming; keep "Otro" (Other)                                                  | Content               | Low    |
| `initiatives.json`                                                         | Reduction initiatives for 28 subcategories                  | Adapt to national programs and incentives; subcategory names must match                     | Methodology           | Medium |
| `countries.json`                                                           | "País Demo" (`PD`)                                          | Country name and ISO 3166-1 alpha-2 code                                                    | Authority             | Low    |
| `tools/seed/src/data/badges/*.svg`                                         | 4 generic badges                                            | Official artwork for the national badges                                                    | Authority + design    | Medium |
| `tools/seed/src/data/legal/terms_conditions.pdf`                           | Generic terms                                               | Terms and conditions reviewed under national law                                            | Legal                 | Medium |
| `systemParameters.json`                                                    | Automatic recognition; `UNION` recommendation mode          | Reflect the decisions from [phase 1](./01-institutional-decisions.md)                       | Authority             | Low    |
| `measurement_units.json`, `rate_measurement_units.json`, `magnitudes.json` | Global units (kg, L, kWh, km, ha…)                          | Usually nothing; add one only if a national factor needs a new unit                         | Methodology           | Low    |
| [`corpus/`](../../corpus/) (repo root)                                     | GHG Protocol PDF + links to the explanations                | Add national guides and regulations if the chatbot is enabled; list them in `manifest.json` | Methodology           | Low    |

## The five critical points in the catalogue

1. **Grid electricity factor.** Electricity has a single value, "Sistema nacional" (national grid),
   at 0.177 kg CO₂e/kWh from DEFRA 2025: that is the UK grid. It is often the largest source in an
   organization's footprint; it must be the country's official factor, with one value per grid if
   there are several.
2. **Subcategories with no factors.** Química (chemicals), Papel y celulosa (pulp and paper),
   Cerámica y otros carbonatos (ceramics and other carbonates) and Procesos industriales – Otros
   (other industrial processes) have 0 factors. The country decides whether to fill or remove them.
3. **Foreign factors by default.** Fuels, waste and transport come from DEFRA. Wherever a national
   factor exists (GHG inventory, energy balance), replace it.
4. **Business-travel accommodation.** The "País" (country) dimension lists 21 hotel countries;
   check that it includes the country itself and frequent destinations.
5. **Unit abbreviations.** Each factor references its rate unit by abbreviation (`kg/kWh`, not
   `kg CO2e/kWh`). An abbreviation that does not exist in the seed breaks the load.

## Reporting years depend on the factors

The footprint year selector is built from the years the factor catalogue covers. If the country
loads only 2025 factors, organizations can only report 2025. To accept reports for earlier years,
load the factors for those years too.

## Rules for the explanations

- **The file name binds the guide to its subcategory:**
  `c{category position}_{normalized name}.md` (lowercase, no accents, spaces and punctuation as
  `_`). If a subcategory is renamed but its file is not, the seed only logs a warning
  (`No subcategory match`) and the guide stays empty.
- **They are end-user texts.** They render behind the "i" icon; do not include technical,
  architecture or deployment notes.
- **The worked example ends at the number the user types into "Cantidad" (quantity),** not at the
  emissions the platform already computes. What declarants get wrong is the input, not the
  calculation.
- **Localize.** Three guides currently use CLP amounts (Electricidad, Combustiones estacionarias,
  Combustiones móviles) and several mention local services (Uber, Cabify, DiDi). Change currency,
  prices and examples.
- **Keep the corpus in sync.** The `corpus/categories` and `corpus/subcategories` folders are links
  to these explanations: the chatbot answers with the same content the app shows.

## What can be changed after the first boot

| Content                                  | Maintainer screen                                                           | If there is no screen                                               |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Methodologies, categories, subcategories | `/admin/methodologies`, `/admin/categories`, `/admin/subcategories`         | —                                                                   |
| Dimensions and emission factors          | `/admin/dimensions`, `/admin/emission-factors`                              | —                                                                   |
| Explanations                             | `/admin/explanations`                                                       | —                                                                   |
| Sectors, subsectors, recommendations     | `/admin/sectors`, `/admin/subsectors`, `/admin/subcategory-recommendations` | —                                                                   |
| Organization sizes, main activities      | `/admin/organization-sizes`, `/admin/main-activities`                       | —                                                                   |
| Units, rate units, magnitudes            | `/admin/units`, `/admin/rate-measurement-units`, `/admin/magnitudes`        | —                                                                   |
| Reduction initiatives                    | `/admin/reduction-plan-initiatives`                                         | —                                                                   |
| Badges                                   | `/admin/badges`                                                             | —                                                                   |
| System parameters                        | `/admin/parameters` (under construction)                                    | SQL ([`system-parameters.md`](../development/system-parameters.md)) |
| Job positions, country                   | —                                                                           | SQL, or seed a fresh environment                                    |
| Terms and conditions                     | —                                                                           | The API's legal-file upload endpoint                                |

## Helper tool for loading factors

A Python script ([`load_methodologies/`](../../load_methodologies/)) converts an Excel workbook with
Metodologías, Categorías, Subcategorías and Factores de emisión sheets into the seed JSON. Its paths
are currently hard-coded in [`environment.py`](../../load_methodologies/environment.py) and must be
adjusted before use. It lets the methodology team work in a spreadsheet instead of editing JSON by
hand.

---

← [1. Institutional decisions](./01-institutional-decisions.md) · [Index](./README.md) · Next: [3. Configuration and branding](./03-configuration-and-branding.md) →

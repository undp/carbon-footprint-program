# 2. Seed content

The country replaces about a dozen JSON files, the badge artwork, the terms-and-conditions PDF and
about 70 Markdown texts. All of it lives under [`tools/seed/src/data/`](../../tools/seed/src/data/),
plus the chatbot corpus at the repo root. This phase needs no application-code changes, but a
developer runs the validation. It is the longest phase: we estimate 6–10 weeks of methodology-team
work, dominated by the emission factors and the 30 subcategory guides.

The field-by-field format of each file is in
[`../development/country-onboarding.md`](../development/country-onboarding.md). This document says
**what** to replace, **who** does it and **what to decide**.

← [1. Institutional decisions](./01-institutional-decisions.md) · [Index](./README.md) · Next: [3. Configuration and branding](./03-configuration-and-branding.md) →

---

## The rule behind everything: the seed runs only once

The seed is applied only to an empty database. If the country table already has rows, it writes
nothing and logs:

```
Database already contains data — skipping seed for dataset 'base'.
```

After production is seeded, most adjustments are made through the platform's maintainer screens
(the admin screens where system administrators edit the catalogue), and a few need SQL. So we
propose this order:

1. Prepare the full country content in the seed, on the country's own branch or fork, reviewed like
   code.
2. Validate it locally with `pnpm db:restore`, which resets a local database and re-seeds it every
   time (see the [validation gate](#validation-gate-before-seeding-production)). The seed uploads
   the badges and the terms PDF, so local object storage must be running first: start MinIO with
   `docker compose -f docker-compose.minio.yml up -d` and set `STORAGE_PROVIDER=minio` with its
   `MINIO_*` variables.
3. Seed production once, with the approved version ([phase 4B](./04-infrastructure.md#first-production-deploy-sequence)).
4. From then on, maintain the catalogue through the maintainer screens (see
   [what can be changed after production is seeded](#what-can-be-changed-after-production-is-seeded)).

## Upfront decision: keep the `PD` code or use your own

The upstream project corrects methodology content (guides, labels, dimensions, factors) in the seed
data. A release may also ship a data migration that applies a correction to databases already
seeded, and such a migration only touches rows matching **both** the country code `PD` and the
methodology name "Metodología inicial". This decision determines whether the country receives
those migrations.

| Option                                                                    | Receives upstream corrections                                         | Risk                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Own ISO code (e.g. `DO`, `PE`) and own methodology name **(recommended)** | No: each correction is reviewed and applied by hand in the maintainer | Every release's seed-data changes must be read as a changelog                 |
| Keep `PD` and "Metodología inicial"                                       | Only the ones that also ship as a data migration                      | A migration can overwrite a national decision silently; the rest never arrive |

Changing either value (the code or the methodology name) stops the automatic corrections. The
country name shown to users comes from the `name` field and can be the real name in both options.

Either way, the seed data is the complete record of upstream content changes. To review a release:

```bash
git diff <previous-release>..<new-release> -- tools/seed/src/data/base/
```

The details are in
[`country-onboarding.md`](../development/country-onboarding.md#content-migrations-do-not-reach-your-methodology).

## Seed inventory

Paths are relative to `tools/seed/src/data/base/` unless stated otherwise.

| File or folder                                                             | What it holds today                                                                                                                                              | What the country must do                                                                                                                                          | Owner                 | Effort |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| `methodologies.json` — factors                                             | 568 factors: the same 284 for 2025 and for 2026 (per year: 195 DEFRA of that year's edition, 86 IPCC, 3 EcoAct 2020)                                             | Replace with official national factors; record `source` and `year` on each                                                                                        | Methodology           | High   |
| `methodologies.json` — structure                                           | 3 categories, 30 subcategories, dimensions and their values                                                                                                      | Fit to the national framework; rename, remove or add subcategories                                                                                                | Methodology           | Medium |
| `explanations/subcategories/*.md`                                          | 30 guides, one per subcategory                                                                                                                                   | Rewrite examples with local currency, prices and realities                                                                                                        | Methodology + content | High   |
| `explanations/categories/*.md`                                             | 3 texts, one per category                                                                                                                                        | Review wording and regulatory references                                                                                                                          | Methodology           | Low    |
| `explanations/standalone/*.md` + `standalone_explanations.json`            | 35 screen help texts ("i" icon)                                                                                                                                  | Review tone and terms; adjust if a flow changes (e.g. `MANUAL` recognition)                                                                                       | Content               | Medium |
| `country_sector_subsectors.json`                                           | 18 generic sectors with subsectors                                                                                                                               | Align with the official economic classification (national ISIC)                                                                                                   | Methodology           | Medium |
| `subcategory_recommendations.json`                                         | Suggested subcategories per sector and subsector                                                                                                                 | Redo after changing sectors or subcategories; names must match exactly                                                                                            | Methodology           | Medium |
| `organization_main_activities.json`                                        | Intensity indicators, with amounts in CLP                                                                                                                        | Switch to local currency; add sector-specific indicators                                                                                                          | Methodology           | Low    |
| `country_organization_size.json`                                           | 8 brackets by headcount                                                                                                                                          | Use the country's official MSME classification                                                                                                                    | Authority             | Low    |
| `country_job_positions.json`                                               | Generic job titles                                                                                                                                               | Adapt to local naming; keep "Otro" (Other)                                                                                                                        | Content               | Low    |
| `initiatives.json`                                                         | Reduction initiatives for 28 subcategories                                                                                                                       | Adapt to national programs and incentives; subcategory names must match                                                                                           | Methodology           | Medium |
| `countries.json`                                                           | "País Demo" (`PD`)                                                                                                                                               | Country name and ISO 3166-1 alpha-2 code                                                                                                                          | Authority             | Low    |
| `systemParameters.json`                                                    | `AUTOMATIC` recognition; `UNION` recommendation mode; users inactive after 90 days; dashboard "measuring organizations" window of 2 years (current and previous) | Reflect the decisions from [phase 1](./01-institutional-decisions.md)                                                                                             | Authority             | Low    |
| `measurement_units.json`, `rate_measurement_units.json`, `magnitudes.json` | Global units (kg, L, kWh, km, ha…)                                                                                                                               | Usually nothing; add one only if a national factor needs a new unit                                                                                               | Methodology           | Low    |
| `tools/seed/src/data/badges/*.svg`                                         | 4 generic badges                                                                                                                                                 | Official artwork for the national badges                                                                                                                          | Authority + design    | Medium |
| `tools/seed/src/data/legal/terms_conditions.pdf`                           | Generic terms                                                                                                                                                    | Terms and conditions reviewed under national law, including the legal contacts ([phase 5](./05-validation-and-go-live.md#obligations-before-the-first-real-user)) | Legal                 | Medium |
| [`corpus/`](../../corpus/) (repo root)                                     | GHG Protocol PDF + links to the explanations                                                                                                                     | Add national guides and regulations if the chatbot is enabled; list them in `manifest.json`                                                                       | Methodology           | Low    |

## The critical points in the catalogue

1. **Grid electricity factor.** Electricity has a single dimension value, "Sistema nacional"
   (national grid), at 0.177 kg CO₂e/kWh for 2025 (DEFRA 2025) and 0.131 for 2026 (DEFRA 2026):
   that is the UK grid. It is often the largest source in an organization's footprint; it must be
   the country's official factor. If the country has several grids, add one value per grid to the
   "Sistema eléctrico" dimension, each with its own factor; users pick their grid when capturing
   electricity.
2. **Subcategories with no factors.** Seven subcategories have 0 factors: four industrial
   processes (Química, Papel y celulosa, Cerámica y otros carbonatos, Procesos industriales -
   Otros), both "Emisiones provenientes de otras fuentes" (other sources, in categories 1 and 3)
   and "Uso de productos de la organización" (use of sold products). If they are kept empty, users
   can only enter a custom factor there. The country decides whether to fill or remove them.
3. **Foreign factors by default.** Fuels, waste and transport come from DEFRA. Wherever a national
   factor exists (GHG inventory, energy balance), replace it. Factors are stored in CO₂e, so the
   GWP set (AR5 or AR6) is whatever the source used; the demo uses AR5 throughout. Keep sources
   consistent with the national inventory and name the edition in `source`. All active factors of
   one subcategory in one year must share the same `source` (the maintainer refuses a second one),
   so replace a subcategory's factors for a year as a whole, not one row at a time. The
   maintainer's source field suggests a fixed list (`SOURCE_OPTIONS` in
   [`apps/web/src/screens/Maintainer/constants.ts`](../../apps/web/src/screens/Maintainer/constants.ts))
   but accepts any text.
4. **Business-travel accommodation.** The "País" (country) dimension lists 21 hotel countries;
   check that it includes the country itself and frequent destinations.
5. **Unit abbreviations.** Each factor references its rate unit by abbreviation (`kg/kWh`, not
   `kg CO2e/kWh`). An abbreviation that does not exist in the seed breaks the load.
6. **Keep the "Otro" escape hatch.** A dimension value named "Otro" (or "Otros", "Otra", "Otras")
   lets users enter a custom factor when no catalogue value fits. Keep it in dimensions where the
   catalogue cannot be exhaustive.

## Factors are per year

A factor is valid for exactly one footprint year: a 2025 footprint only offers 2025 factors. Factors
do not carry forward. The demo seed ships a full set for 2025 and another for 2026 (DEFRA factors
from each year's edition; IPCC and EcoAct factors copied unchanged), so the national seed must also
decide which years it covers.

- The footprint year selector offers a year as soon as the methodology has **at least one** active
  factor for it. Expert mode also offers the current year and the four before it, with or without
  factors, and warns when the chosen year has none.
- A subcategory with no factor for the chosen year offers no catalogue factor that year, only a
  custom one.
- So every reporting year needs its own full set of factors. To accept reports for past years,
  load those years' factors too. The yearly update is covered in
  [phase 5](./05-validation-and-go-live.md#yearly-cycle).

## Factor corrections and past footprints

Every calculated line stores the factor value, unit and source it used. Editing or deleting a
factor in the maintainer therefore **never changes footprints already calculated**, including
approved ones; only lines calculated afterwards use the new value. If a correction must reach past
footprints, the affected organizations have to re-enter those lines. Announce corrections before
the reporting season, not during it.

## Loading factors after launch

There is no bulk import after the first seed. Once production is running, the maintainers add
factors **one row at a time** in `/admin/emission-factors`; there is no spreadsheet upload and no
"copy last year's factors" action. The seed tool cannot help either: it only runs on an empty
database.

Plan for it, because the yearly cycle needs a full set of factors every year (about 280 rows with
the current catalogue):

- Budget maintainer time for the yearly load, and have a second person check each value against
  the source.
- Keep the catalogue as small as the national framework allows: every factor is a row to restate
  each year.
- Duplicating a methodology copies all its factors but keeps their original years; it does not roll
  a set forward to the next year.
- A factor's year can be edited only while no claimed footprint uses it.
- A bulk insert straight into the database is possible, but it bypasses the maintainer's validation
  and must be done by a developer and a DBA, rehearsed in staging first.

## Changing the structure after launch

Footprints are pinned to the methodology version that was published when they were created. How a
structural change in that version affects existing footprints depends on the change:

| Change in the maintainer                          | Effect on existing footprints                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rename a category, subcategory or dimension value | The new name appears everywhere, including past and approved footprints: names are not snapshotted                                                                |
| Delete a category or subcategory                  | Allowed even if footprints use it. Its factors are deleted too; past lines still count in totals but drop out of the capture screen and the admin dashboard chart |
| Delete a dimension value or a whole dimension     | Refused while factors, footprints or initiatives use it                                                                                                           |
| Delete a measurement unit                         | Refused while anything references it                                                                                                                              |
| Edit or delete a factor                           | Calculated lines keep their stored value ([above](#factor-corrections-and-past-footprints))                                                                       |

So, once organizations are reporting, **do not rename or delete structure in the published
version**. Duplicate the methodology in `/admin/methodologies`, make the changes in the copy, and
publish it. New footprints use the new version; existing ones stay on theirs.

## Limits of the catalogue structure

Check these against the national framework (decision 2) before designing the catalogue:

- **Categories.** There is no limit on their number: ISO 14064-1's six categories are possible. Each
  category needs an icon from a fixed list of 23 and a hex color. Charts, summaries and the Excel
  export adapt to any number of categories.
- **Two dimensions per subcategory.** A factor is defined by at most two dimension values (for
  example fuel type × equipment).
- **Emissions are reported in CO₂e only.** A factor can carry a per-gas breakdown (fossil CO₂, CH₄,
  N₂O, HFC, PFC, SF₆, NF₃), which appears in the methodology export, but footprints and reports show
  CO₂e totals only. There is no field for biogenic CO₂.
- **Scope 2 is location-based only.** Electricity is an ordinary subcategory where the user picks a
  grid. There is no market-based method (certificates, supplier-specific factors); a user who needs
  one can only enter a custom factor.
- **Custom factors are not flagged.** When a user enters their own factor, the only trace is the
  source "Otro" in the summary and the Excel export. Reviewers should look for it when approving a
  footprint.

## Rules for the explanations

- **The file name binds the text to its category or subcategory.** Both use
  `c{category position}_{name}.md`, where the position is the `position` of the category in
  `methodologies.json` (1, 2, 3…):
  - a category file uses the category's own position and name, e.g.
    `categories/c1_emisiones_directas.md`;
  - a subcategory file uses its **parent category's** position and the subcategory's name, e.g.
    `subcategories/c1_procesos_industriales_otros.md` for "Procesos industriales - Otros".

  Names are compared after normalizing both sides: lowercase, accents removed (ñ becomes n), and
  every run of spaces or punctuation collapsed into one `_`. Reordering categories or renaming
  anything in the seed therefore means renaming the matching files. The rule only applies to the
  seed: after production is seeded, explanations live in the database and are edited in
  `/admin/explanations`.

- **Screen help texts** are `explanations/standalone/{slug}.md`, where the slug must also be listed
  in `standalone_explanations.json`.
- **A mismatch fails silently.** If a subcategory is renamed but its file is not, the seed only
  logs `No subcategory match` and the guide stays empty.
- **They are end-user texts.** They render behind the "i" icon; do not include technical,
  architecture or deployment notes.
- **The worked example ends at the number the user types into "Cantidad" (quantity),** not at the
  emissions the platform already computes. What declarants get wrong is the input, not the
  calculation.
- **Do not copy factor values into the guides.** The capture form already shows each factor for the
  footprint year, and a table in the text goes stale with the next year's factors. Where a worked
  example needs a factor to reach its number, say that the value is illustrative.
- **Localize.** Three guides currently use CLP amounts (Electricidad, Combustiones estacionarias,
  Combustiones móviles) and Viajes de negocios - traslado mentions local services (Uber, Cabify,
  DiDi). Change currency, prices and examples.
- **Keep the corpus in sync.** The `corpus/categories` and `corpus/subcategories` folders are links
  to these explanations: the chatbot answers with the same content the app shows.

## Validation gate (before seeding production)

Production is seeded only after all of these pass:

- [ ] A developer runs `pnpm db:restore` locally with no `No subcategory match` warnings and no
      missing-unit errors.
- [ ] Every subcategory has its guide, and every worked example ends at the "Cantidad" value.
- [ ] A GHG specialist recomputes one line per subcategory by hand and the result matches the
      platform.
- [ ] The grid electricity factor, the main fuels and waste are national and cite source and year.
- [ ] Every reporting year the country will accept has its full set of factors.
- [ ] Sector recommendations show sensible subcategories for 3 test sectors.
- [ ] No CLP amounts or "País Demo" references remain in visible texts.
- [ ] The terms and conditions PDF is final: reviewed by legal, with the legal contacts and the
      transparency notice ([phase 5](./05-validation-and-go-live.md#obligations-before-the-first-real-user)).
      It is seeded with production; replacing it later needs a developer and the API.

## What can be changed after production is seeded

| Content                                  | Maintainer screen                                                           | If there is no screen                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Methodologies, categories, subcategories | `/admin/methodologies`, `/admin/categories`, `/admin/subcategories`         | —                                                                                                                                                                                                                                                                                                      |
| Dimensions and emission factors          | `/admin/dimensions`, `/admin/emission-factors`                              | —                                                                                                                                                                                                                                                                                                      |
| Explanations                             | `/admin/explanations`                                                       | —                                                                                                                                                                                                                                                                                                      |
| Sectors, subsectors, recommendations     | `/admin/sectors`, `/admin/subsectors`, `/admin/subcategory-recommendations` | —                                                                                                                                                                                                                                                                                                      |
| Organization sizes, main activities      | `/admin/organization-sizes`, `/admin/main-activities`                       | —                                                                                                                                                                                                                                                                                                      |
| Units, rate units, magnitudes            | `/admin/units`, `/admin/rate-measurement-units`, `/admin/magnitudes`        | —                                                                                                                                                                                                                                                                                                      |
| Reduction initiatives                    | `/admin/reduction-plan-initiatives`                                         | —                                                                                                                                                                                                                                                                                                      |
| Badges                                   | `/admin/badges`                                                             | —                                                                                                                                                                                                                                                                                                      |
| System parameters                        | `/admin/parameters` exists but does not edit yet                            | SQL, e.g. `UPDATE system_parameter SET value = 'MANUAL', updated_at = now() WHERE key = 'CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR';`                                                                                                                                                        |
| Job positions, country                   | —                                                                           | SQL by a developer, e.g. `INSERT INTO country_job_position (country_id, name) SELECT id, 'Gerente de Sostenibilidad' FROM country WHERE iso_code = 'DO';` or `UPDATE country SET name = 'República Dominicana' WHERE iso_code = 'DO';`. Re-seeding is **not** an option: it requires an empty database |
| Terms and conditions                     | —                                                                           | A developer with a system `ADMIN` token calls `POST /api/files/legal/request-upload`, uploads the PDF to the returned URL, then calls `POST /api/files/legal/confirm-upload`; the previous version is retired                                                                                          |

## Historical data from an existing program

There is no import for organizations or footprints from a previous national program. Past years
can only be entered by the organizations themselves, as footprints for those years (which requires
loading those years' factors), or through a one-off database migration written by a developer.
Decide early whether history matters for the launch.

## Helper tool for loading factors

A Python script ([`load_methodologies/`](../../load_methodologies/)) converts an Excel workbook with
Metodologías, Categorías, Subcategorías and Factores de emisión sheets into the seed JSON. Its paths
are currently hard-coded in [`environment.py`](../../load_methodologies/environment.py) and must be
adjusted before use. It lets the methodology team work in a spreadsheet instead of editing JSON by
hand.

---

← [1. Institutional decisions](./01-institutional-decisions.md) · [Index](./README.md) · Next: [3. Configuration and branding](./03-configuration-and-branding.md) →

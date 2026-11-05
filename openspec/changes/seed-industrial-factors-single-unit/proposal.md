## Why

Capture never auto-fills an IPCC factor for the seven industrial processes that have one (Cinc, Cemento, Vidrio, Acero, Cal, Aluminio, Ferroaleaciones y otros metales). The line is left with an empty factor and 0 tCO₂e, whether the quantity is declared in grams, kilograms or tonnes.

#619 seeded every one of their factors twice, in `kg/ton` and in `kg/kg`, on the premise that the emission editor matches the rate unit exactly and performs no unit conversion. That premise is false. Since #46, `getCarbonInventoryMethodology` expands each factor into every rate unit of the same magnitudes (`generateConvertedEmissionFactors`, `getCarbonInventoryMethodology/helper.ts`). The seeded `kg/ton` row derives a `kg/kg` that collides with the seeded `kg/kg` row, and the other way round. Every declaration then has two candidates from the same source, and `useEmissionEditorForm` refuses to pick one (_"There are multiple available factors…"_). `docs/development/manual-testing-emission-capture.md` already documents the conversion for LPG (`kg/ton` → `kg/kg`).

#619 is therefore a regression. Before it, each of these factors had a single row (Cemento and Vidrio in `kg/kg`, Cinc and Acero in `kg/ton`) and resolved in every unit. #619 corrected the Cinc and Acero values but made every declaration of all four ambiguous. #609 then extended the same pattern to Cal, Aluminio and Ferroaleaciones.

A scan of the seed confirms the exact scope: 70 colliding pairs in `base` (35 per year, 2025 and 2026) and 35 in `testing` (2025). Every one is an industrial-process `kg/ton` ↔ `kg/kg` pair whose `kg/kg` value is the `kg/ton` value ÷ 1000. No other subcategory collides.

## What Changes

- **Seed each industrial-process factor once, in `kg/ton`.** Remove the 70 `kg/kg` rows from `base/methodologies.json` and the 35 from `testing/methodologies.json`. No value is lost: each was its `kg/ton` twin ÷ 1000, and capture derives `kg/kg` and `kg/g` from the `kg/ton` row. Declarations in g, kg and ton again resolve to a single IPCC factor each, as they did before #619.
- **Guard the seed against conversion collisions.** A pure check, run by a `tools/seed` unit test over the `base` and `testing` JSON, fails when two factors of one subcategory share source, year and numerator/denominator magnitudes and would both match the same dimension selection. A NULL dimension matches any value, as it does in capture. The test runs in the existing `seed-test` CI job on every PR, with no database. This is the check that would have stopped #619.
- **No data migration.** The correction reaches installed databases through a reset (`pnpm db:restore:keep-users`), as #667's factor corrections did. A content migration would only ever reach demo-country (`PD`) databases, because country deployments receive upstream content corrections by reviewing the seed diff (`docs/development/country-onboarding.md`). The demo-country databases can be reset. A database that cannot be reset can drop the 70 `kg/kg` rows from the emission-factor maintainer instead.
- **Correct the documentation.** The country implementation guide states factor counts that this change alters (568 → 498 in total, 284 → 249 per year, IPCC 86 → 51). It also gains the rule #619 got wrong: each factor is loaded in a single rate unit, and the platform derives the other units of the same magnitude.

## Capabilities

### New Capabilities

- `emission-factor-unit-uniqueness`: the seeded factor catalogue never offers capture two candidates for the same declaration through unit conversion. Covers how the industrial-process factors are seeded and the seed-time check that enforces it.

### Modified Capabilities

<!-- None. No archived spec covers the emission-factor catalogue or capture's factor resolution, and capture's conversion behaviour is unchanged. -->

## Impact

- **Seed data**: `tools/seed/src/data/base/methodologies.json` (−70 factors) and `tools/seed/src/data/testing/methodologies.json` (−35 factors).
- **Seed tool**: a collision check and its unit test under `tools/seed/src`. The seeder's behaviour is unchanged.
- **Database / API / Web**: no change. In calculator mode the unit menu is built from the derived factors, so g, kg and ton are still offered.
- **Installed databases**: keep the duplicated rows until reset with `pnpm db:restore:keep-users`. The reset keeps users and loses organizations, footprints, submissions, badges and reduction projects. The PR states this.
- **Docs**: `docs/country-implementation-guide/README.md`, `docs/country-implementation-guide/02-seed-content.md`.
- **Out of scope**: in calculator mode, the unit menu is empty for the seven subcategories that carry no factor at all: four industrial processes, both "Emisiones provenientes de otras fuentes", and "Uso de productos de la organización". This is tracked separately, with a proposed fix of showing every allowed unit there.

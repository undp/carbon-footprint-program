## Why

Capture never auto-fills an IPCC factor for the seven industrial processes that have one (Cinc, Cemento, Vidrio, Acero, Cal, Aluminio, Ferroaleaciones y otros metales): the line is left with an empty factor and 0 tCO₂e, whether declared in grams, kilograms or tonnes.

#619 seeded every one of their factors twice, in `kg/ton` and in `kg/kg`, on the premise that the emission editor matches the rate unit exactly and performs no unit conversion. The premise is false. Since #46, `getCarbonInventoryMethodology` expands each factor into every rate unit of the same magnitudes (`generateConvertedEmissionFactors`, `getCarbonInventoryMethodology/helper.ts`), so the seeded `kg/ton` row derives a `kg/kg` that collides with the seeded `kg/kg` row, and vice versa. Every declaration then has two candidates of the same source, and `useEmissionEditorForm` refuses to pick one (_"There are multiple available factors…"_). `docs/development/manual-testing-emission-capture.md` already documents the conversion for LPG (`kg/ton` → `kg/kg`).

#619 is therefore a regression. Before it, each of these factors had a single row (Cemento and Vidrio in `kg/kg`, Cinc and Acero in `kg/ton`) and resolved in every unit. #619 corrected the Cinc and Acero values, but made every declaration of all four ambiguous. #609 then extended the same pattern to Cal, Aluminio and Ferroaleaciones.

Scanning the seed confirms the scope exactly: 70 colliding pairs in `base` (35 per year, 2025 and 2026) and 35 in `testing` (2025), every one of them an industrial-process `kg/ton` ↔ `kg/kg` pair whose `kg/kg` value is the `kg/ton` value ÷ 1000. No other subcategory collides.

## What Changes

- **Seed each industrial-process factor once, in `kg/ton`.** Remove the 70 `kg/kg` rows from `base/methodologies.json` and the 35 from `testing/methodologies.json`. No value is lost: each was its `kg/ton` twin ÷ 1000, and capture derives `kg/kg` and `kg/g` from the `kg/ton` row. Declarations in g, kg and ton once again each resolve to a single IPCC factor, as they did before #619.
- **Guard the seed against conversion collisions.** A pure check, run by a `tools/seed` unit test over the `base` and `testing` JSON, fails when two factors of one subcategory share source, year and numerator/denominator magnitudes and would both match the same dimension selection. A NULL dimension matches any value, as it does in capture. It runs in the existing `seed-test` CI job on every PR, with no database. This is the check that would have stopped #619.
- **Migrate installed databases.** A Postgres data migration, scoped to the seven subcategories by name, finds each `ACTIVE` `kg/kg` factor that has an `ACTIVE` `kg/ton` twin (same subcategory, dimension values, source and year, value × 1000). It re-points every `carbon_inventory_line_factor` referencing the `kg/kg` row to the twin, then soft-deletes the `kg/kg` row (`status = 'DELETED'`). Snapshots (`applied_factor_value`, its rate unit) and results are untouched. A `kg/kg` row without an equivalent twin is left alone. The migration is idempotent. Re-seeding cannot fix an installed database: the factor seed only inserts, and `dimension_value_2_id IS NULL` on these rows means the partial unique index never applies.
- **Correct the documentation.** The country implementation guide states the factor counts this change alters (568 → 498 in total, 284 → 249 per year, IPCC 86 → 51), and gains the rule #619 got wrong: a factor is loaded in a single rate unit, and the platform derives the others of the same magnitude.

## Capabilities

### New Capabilities

- `emission-factor-unit-uniqueness`: a factor catalogue never offers capture two candidates for the same declaration through unit conversion. Covers how the industrial-process factors are seeded, the seed-time check that enforces it, and the migration that brings installed databases into line.

### Modified Capabilities

<!-- None. No archived spec covers the emission-factor catalogue or capture's factor resolution; capture's conversion behaviour is unchanged. -->

## Impact

- **Seed data**: `tools/seed/src/data/base/methodologies.json` (−70 factors) and `tools/seed/src/data/testing/methodologies.json` (−35 factors).
- **Seed tool**: a collision check and its unit test under `tools/seed/src`. The seeder's behaviour is unchanged.
- **Database**: one new data-only migration on top of the seven consolidated ones. No schema change. It touches `emission_factor.status` / `updated_at` and `carbon_inventory_line_factor.emission_factor_id`.
- **API**: no code change. A new integration test executes the shipped `migration.sql` against the Testcontainers database, following the pattern of the year migration test that #666 removed along with its migration.
- **Web**: none. The unit menu in calculator mode is built from the derived factors, so g, kg and ton are still offered.
- **Docs**: `docs/country-implementation-guide/README.md`, `docs/country-implementation-guide/02-seed-content.md`.
- **Out of scope**: in calculator mode, the unit menu of the seven subcategories that carry no factor at all (four industrial processes, both "Emisiones provenientes de otras fuentes", "Uso de productos de la organización") is empty. This is tracked separately; the proposed fix is to show every allowed unit there.

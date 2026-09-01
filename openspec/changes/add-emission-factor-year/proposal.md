## Why

An organization measuring its 2022 footprint today can be offered the newest factor in the catalog because the reporting year is not part of the factor model or its selection rule:

- `emission_factor` has no year. The vintage is embedded in free-text `source` values such as `"DEFRA 2025"` and `"EcoAct 2020"`.
- `checkDuplicateEmissionFactor` keys uniqueness on subcategory and required dimension values, so a second vintage for the same activity is rejected.
- `validateSourceConsistency` forces every active factor of a subcategory to share one source, preventing both historical vintages and alternative transversal providers.
- The database index, application checks and unit-conversion behavior use different identities. In particular, exact units are not the right boundary: `kg/kg` and `kg/ton` are convertible representations of the same mass/mass factor family, while `kg/kWh`, `kg/m3` and `kg/ton` belong to different families and must be allowed to coexist.
- The capture client currently sends catalog value, source and unit snapshots back to the API. Those fields can disagree with the selected catalog factor unless the server derives and validates them.

`carbon_inventory.year` is already known before emission capture, so the platform has enough context to recommend a relevant vintage and to explain when saved choices differ from the footprint year.

## What Changes

**Year and source identify a catalog vintage.**

- Add `emission_factor.year Int?`. `null` explicitly means _transversal_: the factor applies to every reporting year.
- Store provider and reporting year separately, for example `source: "DEFRA"` plus `year: 2025`.
- In the maintainer, advise users not to include the reporting year in the factor/source name. A likely four-digit year produces a non-blocking warning, not a save restriction.
- Allow several sources for the same dated or transversal activity. Remove `validateSourceConsistency`; source is part of the factor's identity rather than a subcategory-wide restriction.
- Do not infer that a source without a year is transversal. Existing data must be classified explicitly by the methodology team before migration.

**Uniqueness uses a physical unit family, not the exact unit.**

- The active-factor identity is `(subcategory, normalized required dimension values, year, source, numerator magnitude, denominator magnitude)`.
- `EmissionFactor` persists `numeratorMagnitudeId` and `denominatorMagnitudeId`, derived by the server from its rate unit, so PostgreSQL can enforce that identity without joining other tables.
- `kg/kg` and `kg/ton` are both mass/mass, so the catalog stores one canonical factor and generates the other representation by conversion.
- `kg/kWh`, `kg/m3` and `kg/ton` are mass/energy, mass/volume and mass/mass respectively, so they may coexist for the same activity, source and year.
- If two factors in the same unit family represent genuinely different scientific bases, such as wet mass versus dry mass, that distinction must be modeled as a dimension rather than hidden in the unit.

**Capture recommends, but the organization chooses.**

- Keep the existing `Factor` selector and its `Otro` option. Dated catalog labels append the year, for example `DEFRA (2025)`; transversal factors show only their source, for example `IPCC` or `Kool, A.`. No separate year/vintage selector is introduced.
- For footprint year `Y`, candidates are ranked by exact year, transversal, nearest earlier year and nearest later year.
- A candidate is automatically selected only when exactly one factor remains at the winning rank. If several sources tie, the platform asks the organization to choose instead of choosing arbitrarily.
- The organization can keep or replace any saved choice regardless of the footprint year.

**The API is authoritative when a line is saved.**

- A catalog-factor request sends the selected `emissionFactorId` and desired compatible applied rate unit, not client-authored source, year or value.
- The API validates that the factor is active, belongs to the inventory methodology, matches the activity dimensions and belongs to the required unit family. It then derives the value, conversion, source and year and persists their snapshot.
- Custom factors and direct totals use explicit, separate request variants so catalog validation cannot be bypassed accidentally.

**Changing the footprint year preserves the organization's work.**

- Changing or re-dating an inventory keeps every selected factor and every computed result unchanged. There is no bulk re-resolution or update offer.
- At subcategory level, show a non-blocking warning when at least one active saved line uses a dated catalog factor whose recorded factor year differs from the current footprint year.
- Transversal catalog factors, custom/manual factors, direct totals, incomplete lines and inactive/deleted lines do not trigger the warning.
- The warning reports the affected count and distinct applied years and states that calculations were not modified. It never blocks save, navigation or submission.

**The applied vintage remains reproducible.**

- `carbon_inventory_line_factor` snapshots `appliedFactorYear` next to the existing value, unit and source snapshots.
- A year mismatch is derived at read/render time by comparing the saved applied year with the current inventory year. No persisted fallback/match flag is added because it would become stale whenever the inventory year changes.
- The applied year is shown in capture, the factors-used summary and methodology exports.

## Capabilities

### New Capabilities

- `emission-factor-vintages`: explicit year/source vintages, transversal meaning, dimensional unit-family uniqueness, multiple providers, seed/migration rules and exports.
- `emission-factor-year-selection`: recommendation ranking, source/year selection, server-authoritative snapshots and the subcategory mismatch warning.

### Modified Capabilities

<!-- None. No existing capability spec covers emission-factor vintages. -->

## Impact

- **Database**: add `emission_factor.year`, server-derived numerator/denominator magnitude IDs usable by the partial unique index, and `carbon_inventory_line_factor.applied_factor_year`; rebuild the factor index with `NULLS NOT DISTINCT`.
- **API and shared types**: remove source-consistency validation; update factor CRUD, methodology duplication and exports; introduce discriminated `CATALOG`, `CUSTOM` and `DIRECT` sync payloads; validate and derive catalog snapshots server-side.
- **Web**: keep the existing `Factor` selector, enrich its catalog labels with the year in parentheses, retain `Otro`, add non-blocking source-name guidance in the maintainer, and apply deterministic ranking; show the derived warning at subcategory level and do not re-resolve lines after a year change.
- **Seed and migration**: split provider from reporting year, require an explicit integer or `null` in seed data, classify sources without a year before migration, and consolidate duplicate exact-unit rows within a unit family.
- **Out of scope**: bulk maintainer import, reduction-plan behavior, and warnings about year-over-year reductions caused by catalog changes.

## Open Questions

- The methodology team must explicitly classify each existing factor as dated or transversal before the production migration. A missing year or a provider name such as `IPCC`/`Kool, A.` is not enough evidence by itself.

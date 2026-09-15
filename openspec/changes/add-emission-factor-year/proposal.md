## Why

The platform ships a single emission-factor catalogue (DEFRA 2025) and applies it to footprints of any year. Declare a 2024 footprint and it is still computed with 2025 factors; nothing in the schema can date a factor.

CYCLO, the verifier, found this in a project feedback session: _"tienen la del DEFRA 2025 y es la única base que está; si yo quisiera declarar una huella del 2024, igual me va a utilizar [la 2025]"_. Their principle is not that newer data is better measured — it is that reality changed: _"un camión que se movió el 2025 es distinto a los camiones que se movieron el 2024, el 2023, el 2022"_, because European and Chilean efficiency norms tighten over time. They also rejected offering a dropdown of other years: _"si existe el factor de emisión de 2025 y tú usas el de 2023, te lo voy a rechazar. Que tengas esa opción no te aporta valor porque los otros años no los debes usar"_.

Normative backing:

- **GHG Protocol** (Corporate Standard, Base Year Adjustments, Scope 2 Guidance): temporal representativeness — use the factor appropriate to the reported period, not the most recent available. Method consistency over time, with transparent documentation of any factor or methodology change. Base-year recalculation policy when an updated factor or GWP crosses the significance threshold.
- **ISO 14064-1:2018**: select factors appropriate to the source, of recognized origin, documented and reproducible; report which were used and where they came from. Principles of relevance, completeness, consistency, accuracy and transparency.
- **ISO 14067 / 14044**: data quality with explicit temporal, geographic and technological representativeness. This is what drives the column being mandatory: an undated factor asserts _"unknown"_, not _"time-invariant"_, and the standard asks for that distinction to be explicit, with deviations documented rather than silenced.
- **ISO 14064-3**: the verifier must be able to trace which factor was applied to each line and judge whether it corresponded to the period. Today that judgment cannot be made from the data at all.

Competitive note: the Huella Chile programme uses a single database for every year. This puts the platform ahead.

## What Changes

- **Add `emission_factor.year` as a required column.** Every factor states which footprint year it is valid for. There is no undated factor: an administrator who believes an IPCC default still applies to 2026 has to say so, which is the assertion a verifier can then check. `source` stays a free-text name carrying the edition (`"DEFRA 2025"`, `"IPCC"`), so name and validity answer different questions.
- **Backfill the existing catalogue to 2025.** All 284 seeded factors become `year = 2025` — the year this catalogue serves. 195 of them already say `DEFRA 2025` in their source, and the remaining ones (83 `IPCC`, 3 `EcoAct 2020`, 3 `Kool, A.`) keep their edition in the name while stating 2025 as their validity. The migration adds the column nullable, backfills, then sets `NOT NULL`.
- **Add `carbon_inventory_line_factor.applied_factor_year` (`int null`).** The snapshot table already freezes value, source and rate unit for reproducibility; the year joins them. A real column, not a key inside `derivation_details`, because it is an auditable attribute that gets filtered and displayed. It stays nullable because a manual factor freezes the footprint's year, and `carbon_inventory.year` is itself nullable.
- **Filter the capture selector** to the footprint's year and nothing else. The filter runs in the Prisma `where` of `getCarbonInventoryMethodology`, before `generateConvertedEmissionFactors` expands each factor across compatible rate units.
- **Validate the year server-side in `syncCarbonInventoryLines`.** Filtering is not validating: a stale client payload would otherwise write a factor from another year and the filter would never notice.
- **Add the year to the maintainer**: a required field in the emission-factor form and a column in the grid. The dropdown offers `[currentYear - 4 .. currentYear + 1]`; the API validates only a wide absolute bound, so a factor does not become uneditable simply because the sliding window moved past it.
- **Clear the stale factors on a year change**: editing a footprint's year clears the frozen factor and result of every line that used a catalogue factor, after a confirmation modal in step 1. Lines keep their subcategory, dimensions, unit and quantity, and simply ask for a factor again. Lines with a manual factor are kept, because their value and source were typed by the user and no catalogue can restore them.
- **Carry the year through** methodology duplication, both methodology exports, and the per-footprint factor report the verifier reads — which additionally switches from reading the live `emission_factor.source` to the frozen `applied_factor_source`.

No breaking API contract for existing clients: `applied_factor_year` is additive and nullable, and `emission_factor.year` is populated by the migration before it is required.

## Capabilities

### New Capabilities

- `emission-factor-year-scoping`: how an emission factor is scoped to a footprint year, how that scoping is enforced across the write path, the read path and the frozen snapshot, and what happens to a footprint's lines when its year changes.

### Modified Capabilities

<!-- None. No existing capability spec covers emission factors. -->

## Impact

- **Database**: one required column, one nullable column, one migration in three steps (add nullable, backfill to 2025, set `NOT NULL`). The existing partial unique index `emission_factor_unique_subcategory_dims_source` is recreated with `year` as a fifth column. Because the column is `NOT NULL`, Postgres' default `NULLS DISTINCT` behaviour is not in play for it and no `COALESCE` wrapper is needed.
- **API write path**: `createEmissionFactor`, `updateEmissionFactor`, `checkDuplicateEmissionFactor`, `validateSourceConsistency`, `syncCarbonInventoryLines`, `updateCarbonInventory`.
- **API read path**: `getCarbonInventoryMethodology`, `getAllEmissionFactors`, `getMethodologyExport` (and therefore `getCarbonInventoryMethodologyExport`, which re-uses the same select, mapper and response schema), `getEmissionFactors`, `cloneEmissionFactors`.
- **Web**: maintainer emission-factor form and columns, business-profiling step 1 (confirmation modal), emission editor (the applied year is displayed per line). The methodology query key gains the attribute-update token so changing the year actually refetches the year-filtered catalogue — today `carbonInventoryKeys.methodology(id)` omits it, so `useUpdateCarbonInventory`'s invalidation predicate never matches it.
- **Shared**: a year-range constant moves to `@repo/constants` because both the web selector and the API need it.
- **Seed**: every factor in the methodology dataset gains a year. This satisfies the requirement that the base catalogue be born dated.
- **Operational consequence**: with no undated factors, the whole catalogue has to be restated every year — the ~195 DEFRA rows change anyway, but the ~86 IPCC and academic ones now also need an explicit yearly assertion. This is the intended cost of making the claim conscious, and it is what turns the deferred bulk import from a convenience into the thing that makes the annual cycle viable.
- **Disruption to check before deploying**: a footprint in progress for a year before 2025 will find no catalogue for its year and will have to use a manual factor. Those footprints are today computed with 2025 factors, which is the defect this change exists to remove, and falling back to a documented manual factor is the path the verifier prescribed. Confirm how many editable footprints exist with `year < 2025` before rolling out.

**Out of scope**, each deliberately deferred with a TODO in the code:

- Bulk loading a year's set (~284 factors, today one grid row at a time). The drip of a half-loaded set into capture is an accepted risk.
- A year filter on the maintainer grid, which only starts hurting once a second year exists — the same moment the bulk import is needed, and a safer thing to build together than to bolt onto a grid whose rows are addressed by field-array index.
- A draft/active state on the factor, to decouple loading from publishing.
- More than one source per `(subcategory, year)`.
- Freezing the gas breakdown in the snapshot; the verifier report keeps reading it live, as a documented exception.
- Any immutability guard or admin warning when editing factors of an active methodology. Explicitly rejected: the admin is responsible for those changes and understands the risk.
- Ranking by year proximity, per-year methodology versions, new catalogue/set tables, or re-resolving a line's factor when the year changes.

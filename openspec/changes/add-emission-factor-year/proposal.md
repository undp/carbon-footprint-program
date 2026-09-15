## Why

The platform ships a single emission-factor catalogue (DEFRA 2025) and applies it to footprints of any year. Declare a 2024 footprint and it is still computed with 2025 factors; nothing in the schema can date a factor.

CYCLO, the verifier, found this in a project feedback session: _"tienen la del DEFRA 2025 y es la única base que está; si yo quisiera declarar una huella del 2024, igual me va a utilizar [la 2025]"_. Their principle is not that newer data is better measured — it is that reality changed: _"un camión que se movió el 2025 es distinto a los camiones que se movieron el 2024, el 2023, el 2022"_, because European and Chilean efficiency norms tighten over time. They also rejected offering a dropdown of other years: _"si existe el factor de emisión de 2025 y tú usas el de 2023, te lo voy a rechazar. Que tengas esa opción no te aporta valor porque los otros años no los debes usar"_.

Normative backing:

- **GHG Protocol** (Corporate Standard, Base Year Adjustments, Scope 2 Guidance): temporal representativeness — use the factor appropriate to the reported period, not the most recent available. Method consistency over time, with transparent documentation of any factor or methodology change. Base-year recalculation policy when an updated factor or GWP crosses the significance threshold.
- **ISO 14064-1:2018**: select factors appropriate to the source, of recognized origin, documented and reproducible; report which were used and where they came from. Principles of relevance, completeness, consistency, accuracy and transparency.
- **ISO 14067 / 14044**: data quality with explicit temporal, geographic and technological representativeness. A factor with no year asserts _"unknown"_, not _"time-invariant"_ — and the standard asks for the distinction to be explicit, with deviations documented rather than silenced.
- **ISO 14064-3**: the verifier must be able to trace which factor was applied to each line and judge whether it corresponded to the period. Today that judgment cannot be made from the data at all.

Competitive note: the Huella Chile programme uses a single database for every year. This puts the platform ahead.

## What Changes

- **Add `emission_factor.year` (`int null`).** With a year, the factor applies to that footprint year. Without one, it applies to any year — which is exactly how the whole catalogue behaves today, so existing rows keep working untouched.
- **Add `carbon_inventory_line_factor.applied_factor_year` (`int null`).** The snapshot table already freezes value, source and rate unit for reproducibility; the year joins them. A real column, not a key inside `derivation_details`, because it is an auditable attribute that gets filtered and displayed.
- **Filter the capture selector** to the footprint's year plus the undated factors, giving precedence to the dated one when both compete for the same `(subcategory, dimensions, rate unit)` key. The filter runs in the Prisma `where` of `getCarbonInventoryMethodology`, before `generateConvertedEmissionFactors` expands each factor across compatible rate units.
- **Validate the year server-side in `syncCarbonInventoryLines`.** Filtering is not validating: a stale client payload would otherwise write a factor from another year and the filter would never notice.
- **Add the year to the maintainer**: a field in the emission-factor form and a column in the grid, bounded to `[currentYear - 4 .. currentYear + 1]`.
- **Clear the stale factors on a year change**: editing a footprint's year clears the frozen factor and result of every line that used a catalogue factor, after a confirmation modal in step 1. Lines keep their subcategory, dimensions, unit and quantity, and simply ask for a factor again. Lines with a manual factor are kept, because their value and source were typed by the user and no catalogue can restore them.
- **Carry the year through** methodology duplication, both methodology exports, and the per-footprint factor report the verifier reads — which additionally switches from reading the live `emission_factor.source` to the frozen `applied_factor_source`.
- **Seed the catalogue with a year**, pending the methodology team confirming which year the current catalogue corresponds to.

No breaking API contract: every new field is nullable or additive. The behavioural change is the intended one — capture stops offering factors from other years.

## Capabilities

### New Capabilities

- `emission-factor-year-scoping`: how an emission factor is scoped to a footprint year, how that scoping is enforced across the write path, the read path and the frozen snapshot, and how a temporal mismatch surfaces to the user and the verifier.

### Modified Capabilities

<!-- None. No existing capability spec covers emission factors. -->

## Impact

- **Database**: two nullable columns, one Prisma migration. The existing partial unique index `emission_factor_unique_subcategory_dims_source` is recreated with `COALESCE(year, 0)` as a fifth column, so the new NULLs do not silently evaporate the uniqueness of the undated catalogue (Postgres defaults to `NULLS DISTINCT`). `COALESCE` rather than `NULLS NOT DISTINCT` because the latter needs PG15+ and the on-prem Dominican Republic box is unconfirmed.
- **API write path**: `createEmissionFactor`, `updateEmissionFactor`, `checkDuplicateEmissionFactor`, `validateSourceConsistency`, `syncCarbonInventoryLines`.
- **API read path**: `getCarbonInventoryMethodology`, `getAllEmissionFactors`, `getMethodologyExport` (and therefore `getCarbonInventoryMethodologyExport`, which re-uses the same select, mapper and response schema), `getEmissionFactors`, `cloneEmissionFactors`.
- **Web**: maintainer emission-factor form and columns, business-profiling step 1 (confirmation modal), emission editor (the applied year is displayed per line). The methodology query key gains the attribute-update token so changing the year actually refetches the year-filtered catalogue — today `carbonInventoryKeys.methodology(id)` omits it, so `useUpdateCarbonInventory`'s invalidation predicate never matches it.
- **Shared**: a year-range constant moves to `@repo/constants` because both the web selector and the API validation need it.
- **Seed**: the methodology dataset gains a year per factor.
- **New query in the write path**: `syncCarbonInventoryLines` does not read `emission_factor` at all today — it writes value, source and factor id verbatim from the request payload. This change introduces the first server-side fetch of the referenced factors. It is built so the postponed `activity-unit-factor-mismatch` fix can extend the same lookup rather than adding a second one: the select includes the factor's rate measurement unit and its denominator, which that fix needs to catch a `kg/kg` factor applied to a quantity in tonnes.
- **External blocker**: the methodology team must state which year the current catalogue corresponds to. Until then the legacy rows stay NULL and the backfill is deferred.

**Out of scope**, each deliberately deferred with a TODO in the code:

- Bulk loading a year's set (~284 factors, today one grid row at a time). The drip of a half-loaded set into capture is an accepted risk.
- A draft/active state on the factor, to decouple loading from publishing.
- More than one source per `(subcategory, year)`.
- Backfilling the legacy catalogue's year.
- Freezing the gas breakdown in the snapshot; the verifier report keeps reading it live, as a documented exception.
- An in-app mismatch mark on the line. Clearing the catalogue factors removes the case it existed for; for the surviving manual lines the displayed applied year carries the signal, and the verifier report carries it for the auditor.
- Any immutability guard or admin warning when editing factors of an active methodology. Explicitly rejected: the admin is responsible for those changes and understands the risk.
- Ranking by year proximity, per-year methodology versions, new catalogue/set tables, or re-resolving a line's factor when the year changes. The line already keeps its snapshot.

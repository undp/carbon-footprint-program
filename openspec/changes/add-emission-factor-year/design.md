## Context

`emission_factor` currently stores one row per subcategory/dimension combination and carries its vintage informally in `source`. Application validation prevents both a second year and a second provider, while the database index enforces a different identity. Capture then expands a base factor into compatible rate units on the client and sends the selected value/source/unit back to the API.

The design has to preserve four properties:

- several dated and transversal sources may coexist for one activity;
- compatible units are representations of one physical factor, not separate catalog identities;
- saved calculations remain reproducible;
- changing the footprint year does not override an organization's saved choices.

`carbon_inventory.year` is available before capture. `carbon_inventory_line_factor` already snapshots the applied value, rate unit and source, so adding the applied year follows the existing reproducibility model.

## Goals / Non-Goals

**Goals:**

- Make reporting year explicit, with `null` reserved for factors confirmed as transversal.
- Define one uniqueness rule shared by the database, application and seed.
- Allow multiple providers for the same year, including multiple transversal providers.
- Recommend a source/year deterministically without choosing arbitrarily between equally ranked providers.
- Make the API authoritative for catalog values and conversions.
- Preserve saved lines after an inventory-year change and surface only a derived, non-blocking subcategory warning.

**Non-Goals:**

- No bulk Excel import in the maintainer.
- No implicit or bulk re-resolution after changing an inventory year.
- No change to the reduction plan.
- No modeling of wet/dry basis or other scientific distinctions as units; those belong in factor dimensions.

## Decisions

### Decision 1 — A factor row is a logical `(source, year)` vintage

**Choice**: add `year Int?` directly to `emission_factor`; each provider/year combination remains a complete factor row.

The logical vintage is `(source, year)`. Two providers may publish a factor for the same year, and two providers may both publish transversal factors. A separate vintage table is not introduced because the current catalog has no shared vintage metadata beyond these fields.

**Rationale**: this is the smallest model that represents the product rule while preserving current foreign keys and complete per-row values/gas details. If richer publication metadata is needed later, `(source, year)` can be extracted into its own entity.

### Decision 2 — `year = null` means confirmed transversal, never unknown

**Choice**: `null` means the factor is scientifically applicable to any reporting year.

Seed entries must provide `year` explicitly as either an integer or `null`. Migration may safely parse a recognized trailing year such as `DEFRA 2025`, but the absence of a suffix does not prove transversality. Every remaining factor must be classified by the methodology team before production migration.

The maintainer recommends entering only the provider/factor name in `source`, because the UI appends `year` to the displayed label. A simple four-digit-year detector reinforces that guidance with a non-blocking warning. It does not reject the save: this is data-quality guidance rather than a domain prohibition.

**Rationale**: one nullable field expresses the domain without an artificial year plus boolean, while explicit classification prevents missing metadata from silently becoming an all-years rule.

### Decision 3 — Uniqueness is based on dimensional unit family

**Choice**: the active-factor business key is:

`(subcategory, normalized required dimension values, year, source, numerator magnitude, denominator magnitude)`.

`kg/kg` and `kg/ton` share the `mass/mass` family. Only one canonical factor is stored for that key; compatible representations are calculated from measurement-unit base factors. In contrast, `kg/kWh`, `kg/m3` and `kg/ton` belong to `mass/energy`, `mass/volume` and `mass/mass`, so they may coexist.

The database cannot include magnitudes reached through `rate_measurement_unit` in a unique index. Therefore `emission_factor` gains required `numeratorMagnitudeId` and `denominatorMagnitudeId` columns, each referencing `Magnitude`. The server derives them from the selected rate unit through its numerator/denominator measurement units. The API never accepts these fields from the client and recomputes them on factor create/update. Dimension slots not required by the subcategory are normalized to `null` before persistence.

No `unitFamilyKey` string or unit-family table is introduced. The magnitude pair is intentionally denormalized on the factor to keep the schema change small; consistency is entrusted to the supported server write paths and migration backfill.

The partial unique index is:

`(subcategory_id, dimension_value_1_id, dimension_value_2_id, year, source, numerator_magnitude_id, denominator_magnitude_id) NULLS NOT DISTINCT WHERE status <> 'DELETED'`.

**Rationale**: exact units would recreate the original duplicate problem (`kg/kg` versus `kg/ton`), while omitting the magnitudes would incorrectly merge non-convertible domains. The denormalized pair allows database enforcement without a cross-table index and is more explicit than an opaque string key.

### Decision 4 — Multiple sources coexist; source consistency validation is removed

**Choice**: remove `validateSourceConsistency` and its error mapping/tests rather than scoping it by year.

Source participates in the uniqueness key, so transversal factors from `IPCC` and `Kool, A.`, or dated factors labeled `DEFRA (2025)` and `IPCC (2025)`, are valid alternatives for the same activity and unit family. A second factor with the same source, year, dimensions and family is still a duplicate.

**Rationale**: provider choice is product-visible information, not a subcategory invariant. Enforcing one source would prevent the accepted multi-provider use case.

### Decision 5 — Rank by year, then require an explicit choice on provider ties

**Choice**: for footprint year `Y`, filter candidates to the selected activity/dimensions and compatible unit family, then choose the first non-empty rank:

1. `year = Y`;
2. `year = null` (transversal);
3. the maximum year below `Y`;
4. the minimum year above `Y`.

If the winning rank contains exactly one canonical factor, preselect it. If it contains factors from several sources, preselect none and ask the organization to choose. Do not use row order, database ID or source alphabetically as a hidden tie-breaker.

The current selector remains a single control labeled `Factor`; no separate year or vintage selector is added. Its dated catalog options combine source and year as `DEFRA (2025)`. A transversal option displays only its source, such as `IPCC`; transversality is inferred from its null year and is not written in the option text. The existing `Otro` option remains in that same selector and continues opening the custom-factor fields. Compatible applied units remain a separate presentation/conversion choice, not separate factor options.

If the inventory year is absent through a bypassed flow, only a unique transversal candidate may be preselected; dated candidates require an explicit choice.

**Rationale**: the ranking provides useful defaults, while the tie rule respects the organization's responsibility for selecting between legitimate providers.

### Decision 6 — The server derives every catalog snapshot

**Choice**: make factor selection a discriminated request:

```text
CATALOG { emissionFactorId, appliedRateMeasurementUnitId }
CUSTOM  { source, value, rateMeasurementUnitId }
DIRECT  { totalEmissions }
```

Line dimensions, quantity and other common fields remain outside that discriminated factor selection.

For `CATALOG`, the server loads the factor and inventory methodology inside the sync transaction and validates:

- the factor exists and is ACTIVE;
- it belongs to the inventory's methodology version and selected subcategory;
- its required dimension values match the line;
- the requested applied rate unit has the same numerator/denominator magnitude family;
- all units needed for the conversion are active and valid.

The server then converts the canonical catalog value into the requested applied unit, calculates the result and snapshots `emissionFactorId`, applied value, applied unit, source and year. Client-provided catalog value/source/year fields are removed from the contract. `CUSTOM` and `DIRECT` keep their own validation paths and cannot impersonate a catalog factor.

**Rationale**: the client may recommend and display factors, but it must not be the authority for catalog data or calculations.

### Decision 7 — Snapshot only the applied year; derive mismatch state

**Choice**: add `appliedFactorYear Int?` to `carbon_inventory_line_factor`. Do not persist `isFallback` or `appliedFactorYearMatchesInventory`.

The applied year is copied from the selected catalog row at save time and travels with the existing value/source/unit snapshots. A mismatch is calculated whenever data is read/rendered:

`emissionFactorId != null && appliedFactorYear != null && inventory.year != null && appliedFactorYear != inventory.year`.

**Rationale**: the year is historical data and must not change with later catalog edits. Match/fallback is contextual state and would become stale when `carbon_inventory.year` changes.

### Decision 8 — A year change preserves lines and produces a subcategory warning

**Choice**: updating or re-dating `carbon_inventory.year` never re-resolves factors and never recalculates results.

For each subcategory, evaluate current editor/read-model lines. An eligible line is an active line input with a saved catalog factor (`emissionFactorId != null`) and a dated snapshot (`appliedFactorYear != null`). Show the warning iff at least one eligible line differs from the current non-null inventory year.

The warning reports:

- affected count;
- total eligible dated-catalog line count;
- distinct mismatching factor years;
- the current footprint year;
- the fact that calculations were not modified.

Example: `3 de 8 líneas con factor de catálogo fechado usan factores de 2021 y 2022, distintos del año 2023 de la huella. Los cálculos no fueron modificados; revisa las fuentes si corresponde.`

Transversal factors, custom/manual factors, direct totals, incomplete lines and inactive/deleted inputs are excluded. The warning disappears when no eligible mismatch remains and never blocks save, navigation or submission.

**Rationale**: the organization retains responsibility for its choices, while the platform makes stale dated choices visible at the level where they can be reviewed efficiently.

## Risks / Trade-offs

- **Classification is a migration gate.** Incorrectly assigning `null` makes a factor eligible for all years. The production migration must not guess from a missing source suffix.
- **Canonical-unit consolidation can reveal inconsistent catalog values.** Existing same-family factors expressed in different units must be converted and compared. Disagreements require methodology review; the migration must not silently choose one.
- **The methodology payload grows with each vintage.** The endpoint already expands factors into compatible units. A later optimization may send canonical factors plus conversion metadata, but it does not change this feature's selection contract.
- **More valid providers means fewer automatic selections.** This is intentional: equal-ranked scientific sources require an explicit organization choice unless a separate preferred-source policy is introduced later.
- **The magnitude pair is denormalized.** API writes and migration backfill must derive both IDs from the selected rate unit. Drift caused by unsupported direct database edits or future rate-unit relationship changes is an accepted trade-off for avoiding another table.
- **Old selections can mismatch a newly edited inventory year.** This is accepted behavior; snapshots and results remain stable and the derived warning exposes the mismatch.

## Migration Plan

1. Obtain and review an explicit `year`/`null` classification for every seed and production factor. Parse only recognized trailing years, then block if any row remains unclassified.
2. Detect rows that collapse to the same new business key after unit conversion. Automatically consolidate only mathematically equivalent values; send discrepancies for methodology review.
3. Add nullable `year`, `numerator_magnitude_id` and `denominator_magnitude_id`; backfill the magnitude pair, normalize non-required dimension slots, then make both magnitude IDs required.
4. Replace the old partial index with the source/year/family index using `NULLS NOT DISTINCT`.
5. Add `carbon_inventory_line_factor.applied_factor_year` and backfill it from the linked catalog factor without changing existing value/source/unit/result snapshots.
6. Update shared contracts and API writes so catalog factor snapshots are server-derived; remove source-consistency validation.
7. Update seed, maintainer, methodology payload/duplication/export and the capture selector.
8. Add the derived subcategory warning. Do not add any year-change re-resolution flow.
9. Load additional vintages and providers only after migration and contract tests pass.

## Rollback

Application rollback is safe before new vintages are loaded because the added columns are additive. After multiple sources/years/families are stored, rolling back code would make those rows unselectable under the old logic; rollback then requires keeping the new read contract or temporarily disabling affected catalog rows. Existing saved calculations remain reproducible because their applied snapshots are not rewritten.

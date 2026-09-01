## Context

`emission_factor` stores one row per (subcategory, dimension values) and no year. The vintage is carried informally in the free-text `source`: the seed ships `"DEFRA 2025"`, `"EcoAct 2020"`, `"IPCC"` and `"Kool, A."`. Three mechanisms conspire to make a second vintage impossible today:

- `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) keys uniqueness on subcategory + the dimension values of the _required_ dimensions only. A 2026 row for the same activity is a duplicate.
- `validateSourceConsistency` (`helpers.ts:109`) rejects any factor whose `source` differs from the source already used anywhere in that subcategory. `"DEFRA 2026"` next to `"DEFRA 2025"` fails.
- The partial unique index `emission_factor_unique_subcategory_dims_source` (`packages/database/src/prisma/migrations/20251227203015_create_methodology_tables/migration.sql:170`) covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source)`. It disagrees with the application checks in both directions: it includes `source` (which the app ignores) and omits the rate unit (which the app also ignores) and the optional dimensions' role.

On the capture side, `getCarbonInventoryMethodology` ships every active factor of the methodology — each one expanded into every compatible rate unit by `generateConvertedEmissionFactors` — and the frontend picks one by filtering on `(dimensionValue1Id, dimensionValue2Id, rateMeasurementUnitId)` and then collapsing to the distinct `source` values (`emissionFactorService.ts:30`). The auto-fill in `determineAutoLoadFactorSource` (`useEmissionEditorForm.ts:275`) only fires when exactly one source survives; with two vintages loaded it silently stops recommending and lists both in a control labelled "Fuente".

Constraints driving the design:

- **The footprint's year is already known before capture.** `carbon_inventory.year` is set in step 1 (business profiling), the field is `required` with real React Hook Form validation, and `useEmissionCaptureData` already merges `inventory.year` into the capture screen's data.
- **Results must stay reproducible.** `carbon_inventory_line_factor` freezes `appliedFactorValue`, `appliedFactorRateUnitId` and `appliedFactorSource` per line; recomputation never happens implicitly.
- **The organization picks the vintage.** The Product Owner asked for a visible selector defaulting to the footprint's year, not a silent resolution rule.
- **The catalog is loaded by file.** Historical vintages are seeded by the technical team; the maintainer screen handles point corrections.

## Goals / Non-Goals

**Goals:**

- Make the year a first-class, queryable attribute of an emission factor, with `null` meaning "applies to any year".
- Let several vintages of the same activity coexist, and align the DB index with the application-level uniqueness rule instead of leaving them contradictory.
- Preselect the vintage that matches the footprint's year, degrade predictably when it is missing, and always let the organization override the choice.
- Record which year was actually applied to each line, and whether it came from a fallback, so a verifier can reproduce the number.
- Keep every already-computed result exactly as it is.

**Non-Goals:**

- No bulk Excel import in the maintainer screen. Vintages arrive by seed/file; the grid stays for corrections.
- No warning that a year-over-year drop may come from a factor change rather than a real reduction (rankings, admin dashboard, public transparency). Known risk, deferred.
- No change to the reduction plan: `getSuggestedReductionPlanService` ranks subcategories by their already-computed subtotals and returns qualitative initiatives (`reduction_plan_initiative` is title + description). It never computes with factors.
- No route guard for a footprint that reaches capture with `year = null`. The year is already required to leave step 1; only a hand-typed URL can bypass it, and the fallback covers it.
- No conversion of `gasDetails` or any other factor attribute into a per-vintage structure beyond the year.

## Decisions

### Decision 1 — A `year` column on `emission_factor`, not a separate vintage table

**Choice**: add `year Int?` to `emission_factor`. Each vintage is a row.

**Alternatives considered**:

- **Split identity from vintage** (`emission_factor` keyed by subcategory + dimensions + source, with an `emission_factor_value` child carrying year, value, gasDetails and rate unit) — the cleaner temporal model, and the right shape if a vintage ever needs several attributes of its own. But it moves the `carbon_inventory_line_factor.emission_factor_id` FK to the child table, rewrites every read path, and buys nothing today: a vintage differs only in its value and its gas breakdown, both already columns of the row.
- **One methodology version per year** (`duplicateMethodology` already deep-clones a whole catalog) — zero schema change. But subcategory ids differ per version, so two footprints from different years stop being comparable at the id level, and the maintainer has to keep N parallel catalogs in sync by hand. It trades a one-column migration for a permanent maintenance cost.

**Rationale**: the row-per-vintage model is the smallest change that satisfies the definition, and it leaves the door open to the split model later — the split becomes a mechanical extraction once there is a reason for it.

### Decision 2 — `year = null` means transversal, rather than a separate flag

**Choice**: a `null` year declares that the factor does not depend on the reporting year.

**Alternatives considered**:

- **`isTransversal Boolean` + non-null `year`** — more explicit, but forces every transversal factor to invent a year that must then be ignored everywhere, and creates a second source of truth to keep consistent.
- **Every factor must declare a year** — rejected by the definition: industrial-process factors (cement, glass, steel, zinc) come from process chemistry, and stamping them with a publication year would be inventing information.

**Rationale**: `null` is the honest encoding of "no year applies", and it makes the migration trivial — the 246 factors already loaded stay valid while their years are backfilled.

### Decision 3 — Resolution stays on the client, the server ships the year

**Choice**: `getCarbonInventoryMethodology` adds `year` to each factor (originals and converted copies alike); the emission editor resolves the default and renders the selector.

**Alternatives considered**:

- **Server-side resolution** — the endpoint already receives the inventory id, so it could return only the winning factor per activity. But the selector needs every vintage anyway, so the server would have to ship them all _and_ a resolved pointer; the resolution would then live in two places the moment the organization changes the year of a line.

**Rationale**: one resolution, in the layer that owns the selector. The payload already carries every factor of the methodology, so adding a small integer per factor costs nothing new.

### Decision 4 — Preselection order: exact, transversal, nearest earlier, nearest later

**Choice**: for a footprint of year `Y` — the factor whose year is `Y`; else the transversal factor; else the most recent factor with a year `< Y`; else the closest factor with a year `> Y`, flagged as coming from another year.

**Alternatives considered**:

- **Transversal after the nearest earlier dated factor** — the dated row is arguably more specific. Rejected: a factor with no year _declares_ that the year is irrelevant to it, which is a stronger statement than a stale vintage of a factor that does vary.
- **Most recent overall as the fallback** — literally what the Product Owner first wrote, but for a 2022 footprint with 2021 and 2025 loaded it preselects 2025, which is further from the measured year. Clarified with the Product Owner: the default is the most recent year that does not exceed the footprint's year.
- **No preselection when the exact year is missing** — safest, but pushes work onto every organization in the common case of a partially loaded catalog.

**Rationale**: steps 2 and 3 only compete when a subcategory mixes dated and transversal factors, which the catalog is not expected to do; the order is written down so the behavior is defined if it ever happens.

### Decision 5 — `validateSourceConsistency` is scoped per year, not removed

**Choice**: the rule becomes "all active factors of a subcategory _and year_ share one source".

**Alternatives considered**:

- **Remove the rule** — it is the reason a second vintage fails today, so deleting it is tempting. But it is also what guarantees the "Fuente" control shows one coherent provider per activity; without it a subcategory could end up half DEFRA and half IPCC for the same year with no way for the organization to tell which is which.

**Rationale**: the rule was never about years; scoping it restores its original intent.

### Decision 6 — The DB index gains the year and `NULLS NOT DISTINCT`

**Choice**: rebuild the partial unique index as `(subcategory_id, dimension_value_1_id, dimension_value_2_id, year) WHERE status <> 'DELETED'`, declared `NULLS NOT DISTINCT`.

**Rationale**: three of the four columns are nullable, and PostgreSQL's default treats `NULL` values as distinct — which is why the current index never actually prevented duplicate rows for factors with no dimension values. `NULLS NOT DISTINCT` (PostgreSQL 15+) makes the index enforce what the application check already enforces. `source` leaves the index: with Decision 5 in place it is functionally dependent on (subcategory, year), and keeping it would let two vintages of the same year slip through under different source strings.

### Decision 7 — The applied year is denormalized onto the line factor

**Choice**: `carbon_inventory_line_factor` gains the year of the applied factor and a flag recording that it did not match the footprint's year.

**Alternatives considered**:

- **Derive it from `emission_factor_id`** — no new column. But the row already denormalizes value, rate unit and source precisely so a later catalog edit cannot rewrite history, and `emission_factor_id` is null for own factors. Deriving would make the year the one attribute that silently changes under the organization's feet.

**Rationale**: consistency with the columns beside it, and it is the only encoding that survives a maintainer correcting the catalog.

### Decision 8 — "Update factors to the new year" reuses the existing sync endpoint

**Choice**: when the footprint's year changes (directly, or by duplicating last year's footprint and re-dating it), the web app offers to re-resolve every line's factor and submits the result through `syncCarbonInventoryLines`. No new endpoint, no server-side recalculation.

**Rationale**: the resolution lives on the client (Decision 3) and the sync endpoint already accepts a full set of lines with their applied values. The offer is an explicit user action, which is what the definition asks for.

### Decision 9 — Backfill parses the trailing year out of `source`

**Choice**: a data migration extracts a trailing four-digit year from `emission_factor.source`, writes it to `year`, and trims it from the source string. Sources with no trailing year keep `year = null`.

**Rationale**: the four sources in the catalog today split cleanly — `"DEFRA 2025"` → `DEFRA` + 2025, `"EcoAct 2020"` → `EcoAct` + 2020, `"IPCC"` and `"Kool, A."` → transversal, which is exactly the intended classification for the IPCC process factors. The seed JSON is edited in the same change so fresh deployments never see the concatenated form.

## Risks / Trade-offs

- **Which factors are genuinely transversal is unconfirmed.** The backfill treats "no year in the source string" as transversal. That matches the intent for the IPCC process factors, but the Product Owner answered this question with an explicit "not sure" — it needs a pass from the methodology team before the backfill runs. If a factor is wrongly marked transversal it will keep being preselected for every year, silently.
- **The methodology payload grows with every vintage.** `getCarbonInventoryMethodology` already carries a comment warning about response size, because each factor is expanded into every compatible rate unit. Multiplying by the number of loaded vintages compounds it. Mitigation for this change: only load vintages where the year matters (electricity, fuels). If the payload becomes a problem, the endpoint can start filtering to the vintages relevant to the footprint's year — a server-side change that does not alter the contract.
- **Two vintages of the same activity can disagree in rate unit.** The uniqueness key does not include the rate unit (neither does today's application check), so a 2025 factor in `kg/GJ` and a 2026 one in `kg/kWh` are both legal. The conversion helper already normalizes across compatible units, so the selector still works; it is worth watching in the maintainer UI.
- **`NULLS NOT DISTINCT` requires PostgreSQL 15+.** Confirm against the deployment target before the migration lands; otherwise the index has to be expressed with `COALESCE` expressions.
- **Older footprints see their recommendation change.** An organization that re-opens a 2022 footprint after the vintages are loaded will be offered a different default than the one it captured with. The frozen line values do not move, and the offer to update is explicit — but the difference will be visible, which is the point.

## Migration Plan

1. Schema: add `emission_factor.year`, add the applied-year columns to `carbon_inventory_line_factor`, and replace the partial unique index. All additive — no existing row becomes invalid, since `year` starts null and null means transversal.
2. Backfill in the same migration: parse and strip the trailing year from `source`.
3. API: scope both validators by year, expose the year in the factor payloads, and persist the applied year on the line.
4. Seed: split source and year in both datasets so a fresh database matches a migrated one.
5. Web: the selector, the resolution, the fallback notice, the maintainer column, the summary and the Excel export.
6. Only then load real vintages, starting with electricity and fuels.

Steps 1–5 ship a platform that behaves exactly as it does today while the catalog holds a single vintage per activity: the exact-year branch is unreachable until step 6, and the transversal branch resolves to the factor that is already being used.

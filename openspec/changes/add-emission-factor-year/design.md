## Context

Emission factors live in `emission_factor`, keyed by `(subcategory, dimensionValue1, dimensionValue2, rateMeasurementUnit)` with a free-text `source` and a `gas_details` JsonB breakdown. A footprint line freezes what it used in `carbon_inventory_line_factor`: `emissionFactorId`, `appliedFactorValue`, `appliedFactorRateUnitId`, `appliedFactorSource`, `derivationDetails`. `carbon_inventory.year` is `Int?` although the UI requires it in step 1.

Four findings from `main` @ `20cb9864` drive every decision below.

**1. Uniqueness is enforced in three places, not one.** The partial unique index `emission_factor_unique_subcategory_dims_source` (`packages/database/src/prisma/migrations/20251227203015_create_methodology_tables/migration.sql:169`) covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source) WHERE status <> 'DELETED'`. `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) rejects a second ACTIVE factor for the same subcategory and required-dimension combination — it never looks at `source`, so it is **stricter than the index** and is what actually blocks. `validateSourceConsistency` (same file, line 109) forces every ACTIVE factor of a subcategory to share one source. Two factors for the same subcategory and dimensions in different years are impossible today whether or not the index is touched.

**2. The capture selector keys on `source`, not on the factor.** `EmissionEditorFactorSourceCell` builds its dropdown from `[...new Set(factors.map(f => f.source))]`; `useEmissionEditorForm` then resolves the chosen string back to a factor. When more than one factor matches, it emits a `console.warn` and **silently leaves the cell empty** — a defensive branch that is unreachable today precisely because of finding 1. Dating factors makes it reachable: a legacy undated factor coexisting with a dated one under the same source string produces exactly that silent failure.

**3. `syncCarbonInventoryLines` never reads `emission_factor`.** `createLineFactor` writes `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` verbatim from the request payload. There is not a single query against the factor table in the whole service. Any server-side year validation, and any server-sourced `applied_factor_year`, requires introducing the first such fetch.

**4. Silent data loss on methodology duplication.** `cloneEmissionFactors` (`apps/api/src/features/methodologies/duplicateMethodology/helpers.ts:275`) enumerates columns by hand in its `createMany`. A column not listed there is dropped, without error and without warning.

Two further facts shape the UX: `duplicateCarbonInventory` copies `year: source.year`, so a duplicate starts in the same year and the mismatch only appears once the user edits it; and the footprint's year selector offers `[currentYear - 4 .. currentYear]`, driven by `CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5` in `apps/web/src/config/constants.ts:13` — **not** by `MEASURING_ORGANIZATIONS_YEAR_RANGE`, which is the dashboard KPI window.

## Goals / Non-Goals

**Goals:**

- Let a factor state which footprint year it applies to, without invalidating the undated catalogue already in production.
- Stop offering a factor from another year in capture, and stop trusting the client to respect that.
- Give the verifier a per-line, frozen answer to "which factor, from which source, for which year".
- Surface a temporal mismatch when a footprint is duplicated into a different year, without ever re-resolving a line automatically.

**Non-Goals:**

- No ranking by year proximity. The verifier explicitly rejected offering other years as options.
- No methodology version per year. Adding factors to an active methodology stays allowed and is indispensable: forcing a duplicate would create one version per year, which is the design already discarded.
- No new set/catalogue tables, no mandatory upfront classification by the methodology team.
- No re-resolution of a line's factor when the footprint's year changes. Stale catalogue factors are cleared so the user picks again; a replacement is never chosen automatically.
- No immutability guard and no admin warnings when editing factors of an active methodology.
- No bulk load, no draft state, no multi-source, no legacy backfill — all deferred (see Deferred work).

## Decisions

### Decision 1 — `NULL` means "not yet dated", and loses to a dated factor

**Choice**: an undated factor keeps serving any year, but when a factor for the footprint's year exists on the same `(subcategory, dimensions, rate unit)` key, the filter drops the undated one. `checkDuplicateEmissionFactor` is not made to reject the coexistence.

**Alternatives considered**:

- **`NULL` as a wildcard that collides with everything** — one invariant, capture never ambiguous, no precedence logic on read. But it forces dating all 284 legacy factors before any new year can be loaded, putting an external blocker (the methodology team) on the feature's critical path.
- **`year NOT NULL`** — kills the ambiguity at the root: no wildcard, no precedence rule, no `COALESCE` in the index, and the filter becomes `year = footprint.year` and nothing else. The most defensible option in front of a verifier and the least code. But it reopens the agreed rule that an undated factor serves any year, and it blocks hard until the legacy year is known.
- **Coexistence with no tie-break** — zero code, but leaves the silent-empty-cell failure of finding 2 live in the main user-facing screen.

**Rationale**: the precedence rule is three lines in the service and it decouples shipping from the external blocker. Crucially, `NULL` is documented as a **transition shim**, not a modelling category: it means "pending dating", not "timeless". The end state has no NULLs.

**Consequence worth naming**: the tie-break also covers a real operational window. DEFRA publishes the year N set around June of year N, so between January and June there is no factor for the year in progress; the undated legacy row keeps capture working until the new set lands and then quietly loses. After the backfill, that window is covered instead by the admin carrying the previous edition forward — a row with `source = "DEFRA 2025"` and `year = 2026`.

### Decision 2 — `source` is a free name; the year lives in the column

**Choice**: `source` stays an arbitrary label. The admin decides whether to put the year inside it. Applicability is determined solely by `year`.

**Rationale**: `year` and `source` answer different questions — "which footprint year is this valid for" versus "what is it called / which edition did it come from". Keeping them independent lets an admin decide that a factor named `"DEFRA 2025"` is valid for 2026, which is exactly how the January–June window is covered. It also avoids rewriting the 284 existing `source` strings, which today carry the **only** record of the catalogue's year and are therefore the methodology team's best clue for the pending backfill.

### Decision 3 — One source per `(subcategory, year)`, for now

**Choice**: `validateSourceConsistency` is narrowed from "one source per subcategory" to "one source per subcategory **and year**". `checkDuplicateEmissionFactor` adds only the year to its key. A TODO records how to lift the restriction.

**Alternatives considered**:

- **Allow multi-source** — drop `validateSourceConsistency` entirely and key `checkDuplicateEmissionFactor` on `(subcategory, required dimensions, year, source)`, which is almost exactly what the index already does, finally aligning the three layers. Neither GHG Protocol nor ISO requires a single source; both presuppose choosing among sources and documenting the choice, and Scope 2 Guidance actually mandates two parallel methods for electricity. But the capture dropdown would then present real options and a non-expert user would be making an undocumented methodological choice.
- **Multi-source with a recommended factor** — the most literal reading of CYCLO (_"debería recomendarte el factor que tiene ese país para ese año"_), but it costs a column, its own uniqueness rule, and carry-through in clone/seed/export.

**Rationale**: the restriction is a product decision, not a compliance requirement, and this is purely validation — no schema. Lifting it later costs no migration and touches no data.

### Decision 4 — Accept the drip; defer the draft state

**Choice**: ship the year on its own. Loading a year's set stays one grid row at a time, and during that load capture shows a half-populated set. A TODO records the active/inactive state.

**Alternatives considered**:

- **Draft state plus mass activation** — decouples loading from publishing. Verified cost: the index's `WHERE status <> 'DELETED'` must become `status = 'ACTIVE'`; `getAllEmissionFactors` filters ACTIVE and its response does not expose `status`, so drafts would be invisible in the very grid where they get activated; `checkDuplicateEmissionFactor` and `validateSourceConsistency` already filter ACTIVE, so drafts accumulate collisions freely and the constraint only bites at activation, requiring a transactional mass-activate plus a conflict-resolution screen; `cloneEmissionFactors` hardcodes ACTIVE and would publish every draft on duplication; and the seed must be born active. The typing of 284 rows is unchanged.
- **An atomic set import** — an endpoint mirroring `getMethodologyExport`, whose shape already mirrors the seed JSON. Removes the drip by construction, with no new state and no index change, and solves the annual load, which is the underlying problem.

**Rationale**: the drip is a bounded, accepted risk on an operation that happens once a year. The draft state solves the symptom, not the manual typing; the import solves both but is its own change.

### Decision 5 — Changing the year clears the catalogue factors; manual ones survive; there is no mark

**Choice**: when a footprint's year changes, every line whose frozen factor came from the catalogue has its factor snapshot and its result deleted, after a confirmation modal. The line keeps its subcategory, dimension values, measurement unit and quantity, and goes back to asking for a factor. Lines using a custom source are left untouched. No mismatch flag is computed, stored or rendered.

**What forced the rethink**: keeping a stale factor on the line does not merely look odd, it renders wrong. `EmissionEditorFactorSourceCell` is a MUI `Select` whose options come from the sources available for the footprint's year. A line frozen with `"DEFRA 2025"` inside a 2026 footprint holds a value that is no longer among the options, so MUI treats it as out of range and paints the cell **blank** with a console warning. The "marked" line would not even display what it used — strictly worse than either clearing it or teaching the selector to show it.

**Alternatives considered**:

- **Keep the factors and make the selector tolerate them** — inject the frozen source as an extra, disabled option for that line so it renders honestly, alongside a mismatch chip. This is the most faithful reading of "the copy is born with the origin year's factors frozen, marked, and the user or the verifier decides", and it keeps last year's totals visible as a reference while the user updates. Cost: line-dependent options in a cell that today only depends on the subcategory, the full mark apparatus (computed boolean threaded into `mapLineToResponse`, chip, mandatory tooltip), and a `sync` validation that must tell "keeping the factor it already had" apart from "switching to another stale one" — which needs an extra read of the line's current snapshot.
- **A computed mismatch mark without clearing** — the same apparatus, without solving the blank cell.
- **A persisted mark with an acceptance state** — lets the user record "reviewed, kept on purpose", which is what ISO asks when documenting a deviation. Adds a column, an endpoint and a small state machine, and the acceptance goes stale when the year or the factor changes again.
- **Clear everything, manual factors included** — marginally simpler still (no condition on the delete), but it also needs an `updateMany` nulling `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the inputs, and it destroys a value and a source the user typed by hand with nothing to restore them from.

**Rationale**: pragmatism, deliberately chosen over the nicety. If no line can hold a factor from another year, the entire mark apparatus disappears, the selector can never go out of range, and the `sync` validation collapses to one unconditional rule. Sparing the manual lines costs a single `emissionFactorId: { not: null }` condition and protects the only data that cannot be recovered.

**Safety bounds**: the year is only editable on an editable footprint (`validateCarbonInventoryIsEditable`), so clearing never touches a submitted or verified one — which is what makes a destructive operation acceptable here at all.

**Residual signal**: `applied_factor_year` is stored regardless, and the emission editor displays it per line. A manual factor entered for 2025 therefore shows `2025` inside a 2026 footprint, with no boolean, no chip and no tooltip config — the cheap remainder of what the mark would have given.

### Decision 5b — The `sync` year validation is unconditional

**Choice**: `syncCarbonInventoryLines` rejects any line whose referenced catalogue factor has a year that is neither NULL nor the footprint's year, on create and on update alike.

**Rationale**: it is only tenable because of Decision 5. While stale factors were allowed to survive on a line, a blanket rejection would have made those very lines uneditable — a user could not fix a quantity without first swapping the factor, and between January and June there may be no factor of the new year to swap to. With the stale factors cleared, no legitimate request ever carries a mismatched year, so the rule needs no create/update distinction and no extra read.

**What it actually guards**: the reachable path is a stale client cache, not a crafted payload. `carbonInventoryKeys.methodology(id)` is `[Root, id, Methodology]` and carries no `AttributesUpdateDependency`, while `useUpdateCarbonInventory` invalidates by the predicate `queryKey.includes(inventoryId) && queryKey.includes(AttributesUpdateDependency)` — so today changing the year does not invalidate the methodology cache. That is harmless only because the response does not yet depend on the year. The primary fix is the query key; this validation is the backstop behind it.

### Decision 6 — Year range is `[currentYear - 4 .. currentYear + 1]`

**Choice**: share the footprint's year range and extend it one year forward. The constant moves to `@repo/constants` (alongside the existing `carbonInventory.ts`) because the API validates it too.

**Rationale**: the two real publication patterns both fall inside the window — DEFRA publishes the year N set during year N (~June), and national grid factors publish year N's factor during N+1. The extra forward year costs nothing and covers early publication or a factor whose regulatory validity starts next year; a 2027 factor created in 2026 is simply not yet reachable from capture, which is anticipated rather than dead data. Making the field a dropdown also stops a `2205` typo.

**Note**: this is a **write** validation, which fails loudly. It is not the same failure mode as `MEASURING_ORGANIZATIONS_YEAR_RANGE`, a **read** filter that silently hid organizations from a grid.

### Decision 7 — A manual factor stamps the footprint's year at capture

**Choice**: when a line uses a custom source (`CUSTOM_FACTOR_SOURCES`, currently `["Otro"]`) there is no catalogue factor behind it, so `applied_factor_year` is populated with the footprint's year at the moment the line is created.

**Alternatives considered**:

- **Ask the user for the year** — the most faithful record when someone knowingly enters a 2024 factor into a 2026 footprint, but it adds a field to the most crowded screen in the product and one more decision for an SME user.
- **Leave it NULL** — zero change, but a manual factor entered for 2023 then rides into the 2026 copy with nothing flagging it, which is the exact silent carry-over this change exists to remove.

**Rationale**: it is free, it needs no UI, it is consistent with `year` meaning "the year this is valid for", and it makes manual lines fall into the computed mark automatically.

**Adjacent gap, recorded but out of scope**: `manualFactorSource` stores the literal string `"Otro"`, not a citation. CYCLO asked specifically for _"espacio para poner cuál es la fuente, porque el verificador después llega a ese factor y dice ... ¿de dónde lo sacaste?"_. That is a source problem, not a year problem, and deserves its own issue.

### Decision 8 — A footprint with no year is offered only undated factors

**Choice**: when `carbon_inventory.year` is NULL, only factors with a NULL year are offered.

**Rationale**: it falls out of the natural filter expression — `OR [year IS NULL, year = footprint.year]` with a NULL footprint year collapses to the undated rows — so it needs no special branch. It degrades gently: after the backfill such a footprint sees no factors, which pushes the user to complete step 1, exactly what the UI already demands. Only legacy rows can be affected, since the UI no longer allows creating a footprint without a year. Offering the whole catalogue instead would reintroduce the silent-empty-cell ambiguity of finding 2.

### Decision 9 — The verifier's report reads year and source from the snapshot

**Choice**: in `getEmissionFactors`, the source's fallback chain is inverted so `appliedFactorSource` wins over the live `emissionFactor.source`, and the year comes from the new snapshot column. The gas breakdown keeps reading live, as a documented exception.

**Context**: the report currently mixes origins — `factorValue` comes from the snapshot, while `source` and `gasBreakdownLines` come from the live table. An admin editing a factor's source therefore changes what an already-verified footprint reports, next to a value that did not change.

**Alternatives considered**:

- **Freeze everything, gas breakdown included** — a JsonB column beside `derivationDetails` would make the report fully reproducible and is the most defensible under ISO 14064-3. But it is a third new column plus its migration, population in sync, and carry-through in `duplicateCarbonInventory`.
- **Only add the year** — smallest diff, but leaves a frozen year displayed next to a source that may have changed, on the one screen that exists so the verifier can trace the factor's origin.

**Rationale**: `appliedFactorSource` is already stored; it is merely second in the fallback chain. Fixing the order is free and makes the report internally consistent. This is a read-order correction, not the immutability guard that was explicitly rejected.

## Risks

- **Drip during the annual load** (Decision 4). A user capturing while the set is half-loaded may pick the wrong factor or not find theirs. Accepted; mitigated later by the deferred import or draft state.
- **Deferred backfill** (Decision 1). Until the legacy rows are dated, `NULL` keeps meaning two things at once and the ISO non-conformity survives, hidden behind a feature that appears to work.
- **Live gas breakdown** (Decision 9) in the verifier's report.
- **No immutability guard** on factors of an active methodology — a standing, previously accepted risk that this change does not address.

## Deferred work

Each of these gets an explicit TODO at the site that would otherwise silently hide it:

| Deferred                                        | TODO site                                               |
| ----------------------------------------------- | ------------------------------------------------------- |
| Multi-source per `(subcategory, year)`          | `validateSourceConsistency`                             |
| Draft / active state on the factor              | `EmissionFactorStatus`, plus the index's `WHERE` clause |
| Bulk / atomic import of a year's set            | alongside `getMethodologyExport`                        |
| Legacy catalogue backfill                       | the migration, and the seed dataset                     |
| Frozen gas breakdown                            | `getEmissionFactors`                                    |
| A real source field for manual factors          | `CUSTOM_FACTOR_SOURCES` handling in `createLineInput`   |
| Activity-unit vs rate-unit denominator mismatch | the new factor lookup in `syncCarbonInventoryLines`     |

### On the postponed unit-mismatch fix

`syncCarbonInventoryLines` never cross-checks a line's `measurementUnitId` against the denominator of the applied factor's rate unit, so a `kg/kg` factor over a quantity expressed in tonnes yields a result a thousand times too large, silently. That fix was postponed on the grounds that no normal user flow reaches the path — it still needs fixing.

It lands in the same service as the year validation, and both need the same thing: a server-side read of the referenced emission factors, which this service has never done. This change introduces that lookup and deliberately selects the rate measurement unit and its denominator alongside the year, even though only the year is consumed here, so the postponed fix becomes a check added to an existing query rather than a second round trip. A TODO at the lookup records this.

## Open question

The methodology team must state which year the current catalogue corresponds to. Until then the backfill cannot run, and the `source` strings (`"DEFRA 2025"`) remain the only clue — which is a further reason Decision 2 leaves them untouched.

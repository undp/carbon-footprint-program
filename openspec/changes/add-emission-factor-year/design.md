## Context

Emission factors live in `emission_factor`, keyed by `(subcategory, dimensionValue1, dimensionValue2, rateMeasurementUnit)` with a free-text `source` and a `gas_details` JsonB breakdown. A footprint line freezes what it used in `carbon_inventory_line_factor`: `emissionFactorId`, `appliedFactorValue`, `appliedFactorRateUnitId`, `appliedFactorSource`, `derivationDetails`. `carbon_inventory.year` is `Int?` although the UI requires it in step 1.

Findings from `main` @ `20cb9864` that drive every decision below.

**1. Uniqueness is enforced in three places, not one.** The partial unique index `emission_factor_unique_subcategory_dims_source` (`packages/database/src/prisma/migrations/20251227203015_create_methodology_tables/migration.sql:169`) covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source) WHERE status <> 'DELETED'`. `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) rejects a second ACTIVE factor for the same subcategory and required-dimension combination — it never looks at `source`, so it is **stricter than the index** and is what actually blocks. `validateSourceConsistency` (same file, line 109) forces every ACTIVE factor of a subcategory to share one source. Two factors for the same subcategory and dimensions in different years are impossible today whether or not the index is touched.

**2. The capture selector keys on `source`, not on the factor.** `EmissionEditorFactorSourceCell` builds its dropdown from `[...new Set(factors.map(f => f.source))]`; `useEmissionEditorForm` then resolves the chosen string back to a factor. When more than one factor matches, it emits a `console.warn` and **silently leaves the cell empty**. That branch is unreachable today precisely because of finding 1, and any design that lets two factors match the same line resurrects it.

**3. `syncCarbonInventoryLines` never reads `emission_factor`.** `createLineFactor` writes `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` verbatim from the request payload. There is not a single query against the factor table in the whole service. Any server-side year validation, and any server-sourced `applied_factor_year`, requires introducing the first such fetch.

**4. Silent data loss on methodology duplication.** `cloneEmissionFactors` (`apps/api/src/features/methodologies/duplicateMethodology/helpers.ts:275`) enumerates columns by hand in its `createMany`. A column not listed there is dropped, without error and without warning.

**5. The catalogue already half-states its own year.** Of the 284 seeded factors, the `source` strings are `DEFRA 2025` (195), `IPCC` (83), `EcoAct 2020` (3) and `Kool, A.` (3). Seventy per cent name their edition; the rest are IPCC defaults and an academic reference — exactly the factors someone would have called "time-invariant".

Two further facts shape the UX: `duplicateCarbonInventory` copies `year: source.year`, so a duplicate starts in the same year and a mismatch only appears once the user edits it; and the footprint's year selector offers `[currentYear - 4 .. currentYear]`, driven by `CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5` in `apps/web/src/config/constants.ts:13` — **not** by `MEASURING_ORGANIZATIONS_YEAR_RANGE`, which is the dashboard KPI window.

## Goals / Non-Goals

**Goals:**

- Make every factor state which footprint year it is valid for, as an explicit assertion rather than an omission.
- Stop offering a factor from another year in capture, and stop trusting the client to respect that.
- Give the verifier a per-line, frozen answer to "which factor, from which source, for which year".
- Keep a footprint from silently carrying last year's factors when its year changes.

**Non-Goals:**

- No ranking by year proximity. The verifier explicitly rejected offering other years as options.
- No methodology version per year. Adding factors to an active methodology stays allowed and is indispensable: forcing a duplicate would create one version per year, which is the design already discarded.
- No new set/catalogue tables.
- No re-resolution of a line's factor when the footprint's year changes. Stale catalogue factors are cleared so the user picks again; a replacement is never chosen automatically.
- No immutability guard and no admin warnings when editing factors of an active methodology.
- No bulk load, no maintainer grid filter, no draft state, no multi-source — all deferred (see Deferred work).

## Decisions

### Decision 1 — The year is mandatory; the existing catalogue is backfilled to 2025

**Choice**: `emission_factor.year` is `NOT NULL`. The migration adds it nullable, sets every existing row to `2025`, then applies the constraint. There is no undated factor and no wildcard.

**Rationale**: an omitted year asserts _"unknown"_, not _"time-invariant"_, and ISO 14067/14044 ask for temporal representativeness to be explicit. Forcing the column makes an administrator who believes an IPCC default still applies to 2026 say so — which is the claim a verifier can then accept or challenge. It is the difference between a silence and a documented deviation.

**Why 2025 answers the backfill**: Decision 2 separates the name from the validity, which makes the question tractable. The current catalogue is the one that serves 2025 footprints; 195 of its 284 rows already say `DEFRA 2025` in their source. Dating an `EcoAct 2020` row as `year = 2025` reads correctly under that split: the 2020 edition of EcoAct, applied to 2025. No source string is rewritten, so the edition information survives.

**What it removes**: a nullable year would have needed a precedence rule (dated beats undated on the same key), a `COALESCE(year, 0)` wrapper in the unique index to stop Postgres' `NULLS DISTINCT` from voiding the catalogue's uniqueness, and a ruling on whether the undated rows form their own source-consistency group. All three disappear. So does the case that broke the precedence rule: with every factor dated, a 2026 footprint sees only 2026 factors, and two of them matching the same line would be a duplicate the uniqueness check already forbids.

**Alternatives considered**:

- **Nullable, as a transition shim** — an undated factor keeps serving any year but loses to a dated one on the same key. Ships without waiting on the backfill and leaves every existing footprint working unchanged. Rejected once the precedence rule turned out not to hold: the key it used, an exact dimension tuple, does not match the wildcard semantics of `getAvailableFactors`, where a null dimension value on the factor matches any line value. A legacy `Tipo = null / Diésel` row and a new `Tipo = Camión / Diésel / 2026` row have different tuples, so precedence never fires, both survive the filter, and a `Tipo = Camión` line matches both — the blank cell of finding 2. That is not a corner case: the seed has two optional dimensions, and a catalogue becoming _more specific_ per year is exactly what the verifier described with the truck example. Fixing it meant either replicating the wildcard semantics server-side or moving precedence into the client; a mandatory year removes the problem instead of relocating it.
- **Nullable, and replicate the catalogue backwards** to every year in the capture window so no footprint is disrupted. Rejected: it would make the platform assert that DEFRA 2025 is valid for 2022, which is the exact claim a verifier rejects and the defect this change exists to remove. It swaps a silence for an explicit falsehood, and quadruples the catalogue someone has to maintain.

**Cost accepted**: a footprint in progress for a year before 2025 finds no catalogue for its year and falls back to a manual factor. Those footprints are today computed with 2025 factors — the defect itself — and a documented manual factor is the path the verifier prescribed for when no factor exists for the year: _"debería recomendarte el factor que tiene ese país para ese año y si no, darte la opción de meter uno manual. Poner uno manual siempre es muy valioso"_. How many such editable footprints exist is worth checking before rollout.

**Recurring cost accepted**: with no undated factors, the entire catalogue must be restated every year. The DEFRA rows change anyway; the ~86 IPCC and academic ones now need a yearly assertion too. That is the point of the decision, and it raises the value of the deferred bulk import from convenience to necessity.

### Decision 2 — `source` is a free name; the year lives in the column

**Choice**: `source` stays an arbitrary label. The administrator decides whether to put a year inside it. Applicability is determined solely by `year`.

**Rationale**: the two answer different questions — "what is it called / which edition did it come from" versus "which footprint year is it valid for". Keeping them independent is what lets an administrator declare that a factor named `"DEFRA 2025"` is valid for 2026, which is how the January-to-June window is covered before a new set is published. It is also what makes Decision 1's backfill coherent rather than a lie: the edition stays in the name, the validity goes in the column, and no source string has to be rewritten.

### Decision 3 — One source per `(subcategory, year)`, for now

**Choice**: `validateSourceConsistency` is narrowed from "one source per subcategory" to "one source per subcategory **and year**". `checkDuplicateEmissionFactor` adds the year to its key. A TODO records how to lift the restriction.

**Alternatives considered**:

- **Allow multi-source** — drop `validateSourceConsistency` entirely and key `checkDuplicateEmissionFactor` on `(subcategory, required dimensions, year, source)`, which is almost exactly what the index already does, finally aligning the three layers. Neither GHG Protocol nor ISO requires a single source; both presuppose choosing among sources and documenting the choice, and Scope 2 Guidance actually mandates two parallel methods for electricity. But the capture dropdown would then present real options and a non-expert user would be making an undocumented methodological choice.
- **Multi-source with a recommended factor** — the most literal reading of CYCLO (_"debería recomendarte el factor que tiene ese país para ese año"_), but it costs a column, its own uniqueness rule, and carry-through in clone/seed/export.

**Rationale**: the restriction is a product decision, not a compliance requirement, and this is purely validation — no schema. Lifting it later costs no migration and touches no data.

### Decision 4 — Accept the drip; defer the draft state and the grid filter

**Choice**: ship the year on its own. Loading a year's set stays one grid row at a time, and during that load capture shows a half-populated set. The maintainer grid keeps its pagination and gains no year filter. TODOs record both.

**Alternatives considered**:

- **Draft state plus mass activation** — decouples loading from publishing. Verified cost: the index's `WHERE status <> 'DELETED'` must become `status = 'ACTIVE'`; `getAllEmissionFactors` filters ACTIVE and its response does not expose `status`, so drafts would be invisible in the very grid where they get activated; `checkDuplicateEmissionFactor` and `validateSourceConsistency` already filter ACTIVE, so drafts accumulate collisions freely and the constraint only bites at activation, requiring a transactional mass-activate plus a conflict-resolution screen; `cloneEmissionFactors` hardcodes ACTIVE and would publish every draft on duplication; and the seed must be born active. The typing of 284 rows is unchanged.
- **An atomic set import** — an endpoint mirroring `getMethodologyExport`, whose shape already mirrors the seed JSON. Removes the drip by construction, with no new state and no index change, and solves the annual load. Decision 1 makes this the highest-value deferred item, since the full catalogue now has to be restated yearly.
- **A year filter on the grid, now** — the grid only becomes unwieldy once a second year exists, which is the same moment the import is needed. Bolting a filter on first is also riskier than it looks: rows are addressed by index (`handleCellChange(rowIndex, …)`, `fieldArray.update(rowIndex, …)`), so filtering what is visible while editing by index is a classic source of edits landing on the wrong row.

**Rationale**: the drip is a bounded risk on an operation that happens once a year, and the grid and the load are the same problem seen twice. Solving them together, with the real catalogue in front of you, beats two partial fixes.

### Decision 5 — Changing the year clears the catalogue factors; manual ones survive; there is no mark

**Choice**: when a footprint's year changes, every line whose frozen factor came from the catalogue has its factor snapshot and its result deleted, after a confirmation modal. The line keeps its subcategory, dimension values, measurement unit and quantity, and goes back to asking for a factor. Lines using a custom source are left untouched. No mismatch flag is computed, stored or rendered.

**What forced the rethink**: keeping a stale factor on the line does not merely look odd, it renders wrong. `EmissionEditorFactorSourceCell` is a MUI `Select` whose options come from the sources available for the footprint's year. A line frozen with `"DEFRA 2025"` inside a 2026 footprint holds a value that is no longer among the options, so MUI treats it as out of range and paints the cell **blank** with a console warning. The "marked" line would not even display what it used — strictly worse than either clearing it or teaching the selector to show it.

**Alternatives considered**:

- **Keep the factors and make the selector tolerate them** — inject the frozen source as an extra, disabled option for that line so it renders honestly, alongside a mismatch chip. Keeps last year's totals visible as a reference while the user updates. Cost: line-dependent options in a cell that today only depends on the subcategory, the full mark apparatus (computed boolean threaded into `mapLineToResponse`, chip, mandatory tooltip), and a `sync` validation that must tell "keeping the factor it already had" apart from "switching to another stale one".
- **A computed mismatch mark without clearing** — the same apparatus, without solving the blank cell.
- **A persisted mark with an acceptance state** — lets the user record "reviewed, kept on purpose", which is what ISO asks when documenting a deviation. Adds a column, an endpoint and a small state machine, and the acceptance goes stale when the year or the factor changes again.
- **Clear everything, manual factors included** — marginally simpler (no condition on the delete), but it also needs an `updateMany` nulling `manualFactor`, `manualFactorSource` and `manualFactorRateUnitId` on the inputs, and it destroys a value and a source the user typed by hand with nothing to restore them from.

**Rationale**: pragmatism, deliberately chosen over the nicety. If no line can hold a factor from another year, the selector can never go out of range, the mark apparatus disappears, and the `sync` validation collapses to one unconditional rule. Sparing the manual lines costs a single `emissionFactorId: { not: null }` condition and protects the only data that cannot be recovered.

**The decisive argument**: keeping the factors produces a footprint that displays a complete, plausible total for the new year computed entirely from the previous year's factors. A user can look at it and believe they are done. Clearing makes the incompleteness impossible to miss.

**Safety bounds**: the year is only editable on an editable footprint (`validateCarbonInventoryIsEditable`), so clearing never touches a submitted or verified one — which is what makes a destructive operation acceptable here at all. A cleared catalogue factor is also one click to restore, since selecting the source auto-fills the value from the methodology; a manual factor is not.

**Residual signal**: `applied_factor_year` is stored regardless, and the emission editor displays it per line. A manual factor entered for 2025 therefore shows `2025` inside a 2026 footprint — the cheap remainder of what the mark would have given, covering the one case clearing does not.

### Decision 6 — The `sync` year validation is unconditional

**Choice**: `syncCarbonInventoryLines` rejects any line whose referenced catalogue factor has a year different from the footprint's, on create and on update alike.

**Rationale**: it is only tenable because of Decision 5. While stale factors were allowed to survive on a line, a blanket rejection would have made those very lines uneditable — a user could not fix a quantity without first swapping the factor, and between January and June there may be no factor of the new year to swap to. With the stale factors cleared, no legitimate request ever carries a mismatched year, so the rule needs no create/update distinction and no extra read.

**What it actually guards**: the reachable path is a stale client cache, not a crafted payload. `carbonInventoryKeys.methodology(id)` is `[Root, id, Methodology]` and carries no `AttributesUpdateDependency`, while `useUpdateCarbonInventory` invalidates by the predicate `queryKey.includes(inventoryId) && queryKey.includes(AttributesUpdateDependency)` — so today changing the year does not invalidate the methodology cache. That is harmless only because the response does not yet depend on the year. The primary fix is the query key; this validation is the backstop behind it.

### Decision 7 — Year range: `[currentYear - 4 .. currentYear + 1]` in the UI, a wide bound in the API

**Choice**: the maintainer's year field is a dropdown offering `[currentYear - 4 .. currentYear + 1]`, sharing its lower bound with the footprint's year selector. The API validates only a wide absolute range (roughly `1990 .. currentYear + 1`). The shared constant lives in `@repo/constants`.

**Rationale for the range**: the two real publication patterns both fall inside it — DEFRA publishes the year N set during year N (around June), and national grid factors publish year N's factor during N+1. The forward year covers early publication or a factor whose regulatory validity starts next year; a 2027 factor created in 2026 is simply not yet reachable from capture, which is anticipated rather than dead data.

**Rationale for the split**: the window slides every 1 January. Enforcing it in the API would make every factor of the year that drops out of the window uneditable overnight — including for correcting its value, with an error about a field the administrator never touched. A dropdown is where typos are actually prevented; a wide server bound still stops a `2205` from a broken payload.

**Alternatives considered**:

- **Sliding window in the API, but only when the year changes** — compares against the stored value, so editing other fields of an old factor keeps working. Still leaves an old factor's year uncorrectable, and makes the rule depend on prior state, which is harder to explain and to test.
- **Sliding window always** — one rule for both verbs, trivial to express in Zod, but it is the annual time bomb described above.

**Note**: this is a write validation, which fails loudly. It is not the failure mode of `MEASURING_ORGANIZATIONS_YEAR_RANGE`, a read filter that silently hid organizations from a grid.

### Decision 8 — A manual factor stamps the footprint's year at capture

**Choice**: when a line uses a custom source (`CUSTOM_FACTOR_SOURCES`, currently `["Otro"]`) there is no catalogue factor behind it, so `applied_factor_year` is populated with the footprint's year at the moment the line is created.

**Alternatives considered**:

- **Ask the user for the year** — the most faithful record when someone knowingly enters a 2024 factor into a 2026 footprint, but it adds a field to the most crowded screen in the product and one more decision for an SME user.
- **Leave it NULL** — zero change, but a manual factor entered for 2023 then rides into the 2026 copy with nothing marking it, and it is the one line type that Decision 5 does not clear.

**Rationale**: it is free, it needs no UI, it is consistent with `year` meaning "the year this is valid for", and it is what makes the displayed year meaningful on the lines that survive a year change.

**Adjacent gap, recorded but out of scope**: `manualFactorSource` stores the literal string `"Otro"`, not a citation. CYCLO asked specifically for _"espacio para poner cuál es la fuente, porque el verificador después llega a ese factor y dice ... ¿de dónde lo sacaste?"_. That is a source problem, not a year problem, and deserves its own issue.

### Decision 9 — A footprint with no year is offered no factors

**Choice**: when `carbon_inventory.year` is NULL, the year filter matches nothing and the footprint sees an empty catalogue.

**Rationale**: it falls out of the filter with no special branch, and it degrades in the direction that pushes the user to complete step 1 — which the UI already demands, so only legacy rows can reach this state. `carbon_inventory.year` is left nullable rather than tightened in the same change; making it required is a separate migration with its own legacy-data risk and no bearing on this capability.

### Decision 10 — The verifier's report reads the frozen snapshot

**Choice**: in `getEmissionFactors`, the source's fallback chain is inverted so `appliedFactorSource` wins over the live `emissionFactor.source`, and the year comes from the snapshot column. The gas breakdown keeps reading live, as a documented exception.

**Context**: the report currently mixes origins — `factorValue` comes from the snapshot, while `source` and `gasBreakdownLines` come from the live table. An admin editing a factor's source therefore changes what an already-verified footprint reports, next to a value that did not change.

**Alternatives considered**:

- **Freeze everything, gas breakdown included** — a JsonB column beside `derivationDetails` would make the report fully reproducible and is the most defensible under ISO 14064-3. But it is a third new column plus its migration, population in sync, and carry-through in `duplicateCarbonInventory`.
- **Only add the year** — smallest diff, but leaves a frozen year displayed next to a source that may have changed, on the one screen that exists so the verifier can trace the factor's origin.

**Rationale**: `appliedFactorSource` is already stored; it is merely second in the fallback chain. Fixing the order is free and makes the report internally consistent. This is a read-order correction, not the immutability guard that was explicitly rejected.

## Risks

- **Old footprints lose their catalogue** (Decision 1). Anything in progress for a year before 2025 falls back to a manual factor. Check the count of editable footprints with `year < 2025` before rolling out.
- **Drip during the annual load** (Decision 4), now on a catalogue that must be fully restated each year.
- **Live gas breakdown** (Decision 10) in the verifier's report.
- **No immutability guard** on factors of an active methodology — a standing, previously accepted risk that this change does not address.

## Deferred work

Each of these gets an explicit TODO at the site that would otherwise silently hide it:

| Deferred                                        | TODO site                                               |
| ----------------------------------------------- | ------------------------------------------------------- |
| Bulk / atomic import of a year's set            | alongside `getMethodologyExport`                        |
| Year filter on the maintainer grid              | `EmissionFactorsMaintainerScreen`                       |
| Multi-source per `(subcategory, year)`          | `validateSourceConsistency`                             |
| Draft / active state on the factor              | `EmissionFactorStatus`, plus the index's `WHERE` clause |
| Frozen gas breakdown                            | `getEmissionFactors`                                    |
| A real source field for manual factors          | `CUSTOM_FACTOR_SOURCES` handling in `createLineInput`   |
| Activity-unit vs rate-unit denominator mismatch | the new factor lookup in `syncCarbonInventoryLines`     |

### On the postponed unit-mismatch fix

`syncCarbonInventoryLines` never cross-checks a line's `measurementUnitId` against the denominator of the applied factor's rate unit, so a `kg/kg` factor over a quantity expressed in tonnes yields a result a thousand times too large, silently. That fix was postponed on the grounds that no normal user flow reaches the path — it still needs fixing.

It lands in the same service as the year validation, and both need the same thing: a server-side read of the referenced emission factors, which this service has never done. This change introduces that lookup and deliberately selects the rate measurement unit and its denominator alongside the year, even though only the year is consumed here, so the postponed fix becomes a check added to an existing query rather than a second round trip. A TODO at the lookup records this.

## To confirm before rollout

The backfill year is set to **2025** by decision, on the evidence that 195 of 284 source strings say `DEFRA 2025` and that the catalogue is the one serving 2025 footprints. This should be confirmed with the methodology team — it is now a yes/no on a stated proposal, not an open question.

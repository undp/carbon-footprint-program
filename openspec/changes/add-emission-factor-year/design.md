## Context

Emission factors live in `emission_factor`, keyed by `(subcategory, dimensionValue1, dimensionValue2, rateMeasurementUnit)` with a free-text `source` and a `gas_details` JsonB breakdown. A footprint line freezes what it used in `carbon_inventory_line_factor`: `emissionFactorId`, `appliedFactorValue`, `appliedFactorRateUnitId`, `appliedFactorSource`, `derivationDetails`. `carbon_inventory.year` is `Int?` although the UI requires it in step 1.

Findings from `main` @ `20cb9864` that drive every decision below.

**1. Uniqueness is enforced in three places, not one.** The partial unique index `emission_factor_unique_subcategory_dims_source` (`packages/database/src/prisma/migrations/20251227203015_create_methodology_tables/migration.sql:169`) covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source) WHERE status <> 'DELETED'`. `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) rejects a second ACTIVE factor for the same subcategory and required-dimension combination — it never looks at `source`, so it is **stricter than the index** and is what actually blocks. `validateSourceConsistency` (same file, line 109) forces every ACTIVE factor of a subcategory to share one source.

**2. The capture selector keys on `source`, not on the factor.** `EmissionEditorFactorSourceCell` builds its dropdown from `[...new Set(factors.map(f => f.source))]`; `useEmissionEditorForm` then resolves the chosen string back to a factor. When more than one factor matches, it emits a `console.warn` and **silently leaves the cell empty**. That branch is unreachable today precisely because of finding 1, and any design that lets two factors match the same line resurrects it.

**3. `syncCarbonInventoryLines` never reads `emission_factor`.** `createLineFactor` writes `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` verbatim from the request payload. There is not a single query against the factor table in the whole service. Server-side year validation requires introducing the first such fetch. The service also reads the footprint **before** opening its transaction.

**4. Silent data loss on methodology duplication.** `cloneEmissionFactors` (`apps/api/src/features/methodologies/duplicateMethodology/helpers.ts:275`) enumerates columns by hand in its `createMany`. A column not listed there is dropped, without error and without warning.

**5. The catalogue already half-states its own year.** Of the 284 seeded factors, the `source` strings are `DEFRA 2025` (195), `IPCC` (83), `EcoAct 2020` (3) and `Kool, A.` (3).

**6. A line loses its factor identity the first time it is edited.** `useEmissionCaptureData.ts:50` initialises every line recovered from the server with `baseFactorId: null`. Saving any edit — even changing only a comment — therefore writes a snapshot whose `emissionFactorId` is null, while keeping the frozen value and source. This is a live defect independent of the year: in `getEmissionFactors`, `gasBreakdownLines` and the row identifier both derive from the `emissionFactor` relation, so an edited line already loses its gas breakdown in the verifier's report and shows up as a `manual-<id>` row.

**7. Lines can be parked and restored outside `sync`.** `toggleManualTotalEmissions` flips lines between `ACTIVE` and `OUTDATED`; an `OUTDATED` line keeps its snapshot and can be reactivated later without passing through `syncCarbonInventoryLines`.

Two further facts shape the UX: `duplicateCarbonInventory` copies `year: source.year`, so a duplicate starts in the same year and a mismatch only appears once the user edits it; and the footprint's year selector offers `[currentYear - 4 .. currentYear]`, driven by `CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5` in `apps/web/src/config/constants.ts:13` — **not** by `MEASURING_ORGANIZATIONS_YEAR_RANGE`, which is the dashboard KPI window.

## Goals / Non-Goals

**Goals:**

- Make every factor state which footprint year it is valid for, as an explicit assertion rather than an omission.
- Stop offering a factor from another year in capture, and stop trusting the client to respect that.
- Leave the existing data in a state the new rules describe, instead of assuming the rules retroactively hold.
- Keep a footprint from silently carrying last year's factors when its year changes.

**Non-Goals:**

- No ranking by year proximity. The verifier explicitly rejected offering other years as options.
- No methodology version per year.
- No new set/catalogue tables.
- No re-resolution of a line's factor when the footprint's year changes.
- No immutability guard and no admin warnings when editing factors of an active methodology.
- No bulk load, no maintainer grid filter, no draft state, no multi-source — all deferred.
- No launch procedure for loading the 2026 catalogue. Coordinated outside this change.

## Decisions

### Decision 1 — The year is mandatory; the existing catalogue is backfilled to 2025

**Choice**: `emission_factor.year` is `NOT NULL`. The migration adds it nullable, sets every existing row to `2025`, then applies the constraint. There is no undated factor and no wildcard.

**Rationale**: an omitted year asserts _"unknown"_, not _"time-invariant"_, and ISO 14067/14044 ask for temporal representativeness to be explicit. Forcing the column makes an administrator who believes an IPCC default still applies to 2026 say so — the claim a verifier can accept or challenge.

**Why 2025 answers the backfill**: Decision 3 separates the name from the validity. The current catalogue is the one that serves 2025 footprints; 195 of its 284 rows already say `DEFRA 2025` in their source. Dating an `EcoAct 2020` row as `year = 2025` reads correctly under that split. No source string is rewritten.

**What it removes**: a nullable year would have needed a precedence rule, a `COALESCE(year, 0)` wrapper in the unique index, and a ruling on whether undated rows form their own source-consistency group. All three disappear, as does the case that broke the precedence rule.

**Alternatives considered**:

- **Nullable, as a transition shim** — rejected once the precedence rule turned out not to hold: its exact-tuple key does not match the wildcard semantics of `getAvailableFactors`, where a null dimension value on the factor matches any line value. A legacy `Tipo = null / Diésel` row and a new `Tipo = Camión / Diésel / 2026` row have different tuples, so precedence never fires, both survive the filter, and a `Tipo = Camión` line matches both — the blank cell of finding 2. The seed has two optional dimensions, and a catalogue becoming _more specific_ per year is exactly what the verifier described with the truck example.
- **Nullable, and replicate the catalogue backwards** — rejected: it would make the platform assert that DEFRA 2025 is valid for 2022, the exact claim a verifier rejects.

**Recurring cost accepted**: with no undated factors, the entire catalogue must be restated every year, including the ~86 IPCC and academic rows. That raises the value of the deferred bulk import from convenience to necessity.

**Caveat on the backfill evidence**: the seed counts describe the shipped catalogue, not necessarily the production table. Factors an administrator added by hand are also swept into 2025. Task 1.2 is where that gets confirmed rather than assumed.

### Decision 2 — The migration carries a data transition, not just a column

**Choice**: dating the catalogue does not retroactively fix the footprints that used it. In the same migration, every **editable** footprint whose year differs from the catalogue year has the factor snapshots and results of its catalogue-backed lines removed — the same rule as a year change, applied to history. Submitted and verified footprints are left untouched as the record of what was declared. Duplicating a footprint whose year has no catalogue produces a copy with those factors already cleared, so it does not start life rejecting its first save.

**What forced it**: after the backfill, a 2024 footprint still holds snapshots and a total computed from factors now dated 2025, which the selector no longer offers it. Nothing clears them, because no year change occurred. If the line still carries its factor id, the new sync validation then rejects the next save with an error about a field the user never touched. The exposure is not `year < 2025`: it is every year other than the catalogue year, 2026 included.

**Alternatives considered**:

- **Touch no data, document the inherited state** — no writes over user data during deployment and nobody loses work overnight. Rejected: the defect survives intact in exactly the data it was meant to fix, and the user meets an inexplicable rejection the first time they edit any line.
- **Exempt pre-existing footprints from the validation** — a grace flag so they stay editable with their inherited factors. Rejected: it means modelling, persisting and eventually retiring a second rule inside the same service, and it keeps footprints that declare one year and compute with another alive indefinitely.

**Cost accepted**: this is a destructive bulk operation at deploy time. It has to be communicated beforehand, and task 1.3 has to count what it will touch — across all years, not just the ones before 2025.

### Decision 3 — `source` is a free name; the year lives in the column

**Choice**: `source` stays an arbitrary label. The administrator decides whether to put a year inside it. Applicability is determined solely by `year`.

**Rationale**: the two answer different questions — "what is it called / which edition did it come from" versus "which footprint year is it valid for". Keeping them independent lets an administrator declare that a factor named `"DEFRA 2025"` is valid for 2026, which is how the January-to-June window is covered before a new set is published. It is also what makes Decision 1's backfill coherent rather than a lie.

### Decision 4 — One source per `(subcategory, year)`, for now

**Choice**: `validateSourceConsistency` is narrowed from "one source per subcategory" to "one source per subcategory **and year**". `checkDuplicateEmissionFactor` adds the year to its key. A TODO records how to lift the restriction.

**Alternatives considered**:

- **Allow multi-source** — neither GHG Protocol nor ISO requires a single source; both presuppose choosing among sources and documenting the choice, and Scope 2 Guidance actually mandates two parallel methods for electricity. But the capture dropdown would then present real options and a non-expert user would be making an undocumented methodological choice.
- **Multi-source with a recommended factor** — the most literal reading of CYCLO, but it costs a column, its own uniqueness rule, and carry-through in clone/seed/export.

**Rationale**: the restriction is a product decision, not a compliance requirement, and this is purely validation. Lifting it later costs no migration and touches no data.

### Decision 5 — Accept the drip; defer the draft state, the grid filter and the bulk import

**Choice**: ship the year on its own. Loading a year's set stays one grid row at a time. The maintainer grid keeps its pagination and gains no year filter. TODOs record all three.

**Alternatives considered**:

- **Draft state plus mass activation** — verified cost: the index's `WHERE status <> 'DELETED'` must become `status = 'ACTIVE'`; `getAllEmissionFactors` filters ACTIVE and does not expose `status`, so drafts would be invisible in the grid where they get activated; `checkDuplicateEmissionFactor` and `validateSourceConsistency` already filter ACTIVE, so collisions only bite at activation, requiring a transactional mass-activate plus a conflict screen; `cloneEmissionFactors` hardcodes ACTIVE and would publish every draft on duplication. The typing of 284 rows is unchanged.
- **An atomic set import** — removes the drip by construction and solves the annual load. Decision 1 makes it the highest-value deferred item.
- **A year filter on the grid, now** — riskier than it looks: rows are addressed by index (`handleCellChange(rowIndex, …)`), so filtering what is visible while editing by index is a classic source of edits landing on the wrong row.

### Decision 6 — Changing the year clears the catalogue factors; manual ones survive; there is no mark

**Choice**: when a footprint's year changes, every line whose frozen factor came from the catalogue has its factor snapshot and its result deleted, after a confirmation modal. The line keeps its subcategory, dimension values, measurement unit and quantity. Lines using a custom source are left untouched. No mismatch flag is computed, stored or rendered.

The clearing covers `OUTDATED` lines as well as active ones. `toggleManualTotalEmissions` parks non-direct lines as `OUTDATED` and can reactivate them later without passing through `sync`, so a clearing that only looked at active lines would let a stale factor walk back in.

**What forced the rethink**: keeping a stale factor on the line renders wrong, not merely odd. `EmissionEditorFactorSourceCell` is a MUI `Select` whose options come from the sources available for the footprint's year. A line frozen with `"DEFRA 2025"` inside a 2026 footprint holds a value no longer among the options, so MUI treats it as out of range and paints the cell **blank** with a console warning.

**Alternatives considered**:

- **Keep the factors and make the selector tolerate them** — inject the frozen source as a disabled option plus a mismatch chip. Cost: line-dependent options in a cell that today depends only on the subcategory, the full mark apparatus, and a `sync` validation that must tell "keeping what it had" from "switching to another stale one".
- **A persisted mark with an acceptance state** — what ISO asks when documenting a deviation, but it adds a column, an endpoint and a small state machine that goes stale on the next change.
- **Clear everything, manual included** — marginally simpler, but it destroys a value and a source the user typed by hand with nothing to restore them from.

**The decisive argument**: keeping the factors produces a footprint that displays a complete, plausible total for the new year computed entirely from the previous year's factors. A user can look at it and believe they are done. Clearing makes the incompleteness impossible to miss.

**Safety bounds**: the year is only editable while the footprint is editable, so clearing never touches a submitted or verified one. A cleared catalogue factor is one click to restore; a manual one is not.

### Decision 7 — The `sync` year validation is unconditional, and reads inside its transaction

**Choice**: `syncCarbonInventoryLines` rejects any line whose referenced catalogue factor has a year different from the footprint's, on create and on update alike. The footprint is read **inside** the transaction that writes the lines, and the year compared is the one read there.

**Rationale for unconditional**: it is only tenable because of Decision 6. While stale factors survived on a line, a blanket rejection would have made those lines uneditable — a user could not fix a quantity without first swapping the factor, and between January and June there may be no factor of the new year to swap to.

**Rationale for the transaction**: the service currently reads the footprint before opening its transaction. That leaves a window where a request validates against 2025, another request changes the year to 2026 and clears the lines, and the first one then writes a 2025 factor into a 2026 footprint — producing exactly the state the design declares impossible. Wrapping the clearing alone does not close it; the read has to move.

**What it actually guards**: the reachable path is a stale client cache, not a crafted payload. `carbonInventoryKeys.methodology(id)` is `[Root, id, Methodology]` and carries no `AttributesUpdateDependency`, while `useUpdateCarbonInventory` invalidates by the predicate `queryKey.includes(inventoryId) && queryKey.includes(AttributesUpdateDependency)` — so today changing the year does not invalidate the methodology cache. That is harmless only because the response does not yet depend on the year. The primary fix is the query key; this validation is the backstop behind it.

### Decision 8 — A line keeps its factor identity through editing

**Choice**: `useEmissionCaptureData` hydrates `baseFactorId` from the line's existing factor snapshot instead of nulling it, so a catalogue-backed line stays catalogue-backed across edits. The change also has to state what happens to snapshots that already lost their id.

**Why it is in scope**: the whole design rests on telling a catalogue line from a manual one and on having an id to validate the year against. Today, `useEmissionCaptureData.ts:50` sets `baseFactorId: null` on every recovered line, so editing anything — a comment is enough — writes a snapshot with `emissionFactorId` null while keeping the frozen value and source. Under the rules above, that line would be treated as manual by the clearing and skipped by the validation. Both guarantees would fall through an ordinary edit.

**It is also a live defect**: in `getEmissionFactors`, the gas breakdown and the row identifier both derive from the `emissionFactor` relation, so an edited line already loses its gas breakdown in the verifier's report and appears as a `manual-<id>` row. Fixing the identity fixes that too, independently of the year.

**Alternatives considered**:

- **Classify by the source instead of the id** — ask whether `factorSource` is in `CUSTOM_FACTOR_SOURCES`, as the frontend already does in `isFactorValueEditable`. Works on today's data and classifies the damaged lines correctly. Rejected: the year validation still has no id to look up, so it would have to re-resolve the factor from subcategory, dimensions, unit and source, and the gas-breakdown defect stays.
- **Accept the loss and lower the guarantees** — smallest scope, but Decision 9 falls with it and an edited line keeps a factor from another year forever.

**Cost accepted**: an integrity fix that is not about the year enters this change, together with a decision about the rows already damaged.

### Decision 9 — No frozen year on the line; it is derived, within stated limits

**Choice**: `carbon_inventory_line_factor` gains no `applied_factor_year` column. Wherever a line's year is needed, it is the footprint's year.

**Rationale**: Decisions 6, 7 and 8 together keep a catalogue-backed line on its footprint's year — the clearing removes stale ones, the validation refuses new ones, and the identity fix keeps the classification honest. For a manual line, which survives a year change, the footprint's year is still the right answer under our own definition: `year` means validity, not provenance, and a user who keeps their manual factor in a 2026 footprint is asserting it is valid for 2026.

**Stated limit**: an administrator may move a factor's year while lines already point at it. Nothing prevents that, deliberately — no guards are built over an active methodology. The derived year survives it, because it answers _"which period was this line reporting"_, not _"how is the factor dated today"_; the footprint's period does not change when the catalogue is edited underneath. What degrades is the quality of the factor for that period, which is a judgement the verifier makes, not a lie in the data.

**What it removes**: a column and its migration, two entries in the type schemas, its population in `sync`, its carry-through in `duplicateCarbonInventory`, its exposure in `mapLineToResponse`, and the tests for all of it.

**Alternatives considered**:

- **Keep the column** — stays correct even if someone later relaxes the clearing or the validation, and would let the editor show a surviving manual factor as coming from another year. Rejected as paying for a column to carry a derivable value.
- **Keep it only for manual lines** — the only case where it carries information, but a column populated for some rows and null for others invites the "what does null mean here" ambiguity Decision 1 removed.

**Adjacent gap, recorded but out of scope**: `manualFactorSource` stores the literal string `"Otro"`, not a citation. CYCLO asked specifically for _"espacio para poner cuál es la fuente ... ¿de dónde lo sacaste?"_. A source problem, not a year problem.

### Decision 10 — Sliding window in the maintainer dropdown, a static bound in the shared schema

**Choice**: the maintainer's year field is a dropdown offering `[currentYear - 4 .. currentYear + 1]`, kept in `apps/web` beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT`. The Zod request schemas in `packages/types` carry a wide static bound (roughly `1990 .. 2100`).

**Rationale for the range**: DEFRA publishes the year N set during year N (around June), and national grid factors publish year N's factor during N+1; both fall inside it. The forward year covers early publication or a validity that starts next year.

**Rationale for the split**: the window slides every 1 January. Enforcing it server-side would make every factor of the year that drops out uneditable overnight — including for correcting its value, with an error about a field the administrator never touched. A dropdown is where typos are prevented; a static bound in `packages/types`, already consumed by both apps, still stops a `2205` and needs no new shared constant.

**Note**: this is a write validation, which fails loudly. It is not the failure mode of `MEASURING_ORGANIZATIONS_YEAR_RANGE`, a read filter that silently hid organizations from a grid.

### Decision 11 — A footprint with no year is guarded explicitly

**Choice**: when `carbon_inventory.year` is NULL, the service returns the methodology with no emission factors, via an explicit branch that never builds a year filter.

**Why it is not free**: an earlier draft claimed this fell out of the filter. It does not — with `year` non-nullable in Prisma, the generated `where` type does not accept `null`, so there is nothing to "match nothing" with. The options were an explicit branch or a sentinel year no factor can hold; the branch says what it means and skips the query, while a sentinel relies on nobody ever dating a factor with that value, which the wide schema bound does not forbid.

`carbon_inventory.year` is left nullable rather than tightened here: that is a second `NOT NULL` migration over user data, and unlike the catalogue there is no evidence from which to infer the year of a footprint that never declared one.

### Decision 12 — The verifier's report: frozen source, snapshot-keyed rows, no year

**Choice**: in `getEmissionFactors`, the source's fallback chain is inverted so `appliedFactorSource` wins over the live `emissionFactor.source`. The de-duplication key becomes the frozen snapshot — factor id plus frozen source plus applied value — rather than the factor id alone. No year is added to the rows. The gas breakdown keeps reading live, as a documented exception.

**Context**: the report mixes origins today — `factorValue` comes from the snapshot, `source` and `gasBreakdownLines` from the live table. An admin editing a factor's source changes what an already-verified footprint reports, next to a value that did not change.

**Why the de-duplication key changes**: the report is a list of factors used, not of lines, and collapsing repeats is intentional. But once the frozen source wins, two lines that used the same factor before and after an administrative edit hold different frozen sources, and keying on the factor id alone would drop one of them silently, picking by line order. Keying on the snapshot keeps identical uses collapsed and distinct ones visible. The requirement is worded as "each factor used", which is what the report always was.

**Why no year**: the report is scoped to a single footprint, so the year is constant across rows and established by the footprint itself. ISO 14064-3 asks the verifier to judge whether the factor corresponded to the period; knowing the period and which factor each line used satisfies that.

**Alternatives considered**:

- **A year on every row** — self-describing once exported to a spreadsheet where a header can be lost. Rejected as repeating in every row what the footprint already determines.
- **A single year at the response root** — `GetEmissionFactorsResponse` is a bare `z.array`, so a root field means changing the response shape and its consumer: more work than either alternative.
- **Freeze everything, gas breakdown included** — fully reproducible under ISO 14064-3, but a new column plus migration, population and carry-through.

## Risks

- **The migration performs a destructive bulk operation** (Decision 2) over editable footprints of other years. It needs a count and a heads-up before deployment, not just a changelog line.
- **The derived year depends on three guarantees holding** (Decision 9): the clearing, the sync validation and the identity fix. If any is later relaxed, a line could sit on a factor from another year with nothing to catch it. The tests for Decisions 6, 7 and 8 are what keep it honest.
- **A deployment window where factor creation fails**: migrations run before containers are replaced, so the previous API version briefly faces a `NOT NULL` column it does not populate. Creating an emission factor from the maintainer fails until the new container is up. Admin-only, low frequency, visible and retryable — accepted, not mitigated with a column default, because a default would let a factor be created without stating its year, which is what Decision 1 exists to prevent.
- **Drip during the annual load** (Decision 5), on a catalogue that must be fully restated each year.
- **Live gas breakdown** (Decision 12) in the verifier's report.
- **No immutability guard** on factors of an active methodology — a standing, previously accepted risk.

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

Outside the code entirely: loading and verifying the 2026 catalogue at launch. With the year mandatory, a footprint of the current year has no factors until that set exists. Deliberately left out of this change and coordinated separately.

### On the postponed unit-mismatch fix

`syncCarbonInventoryLines` never cross-checks a line's `measurementUnitId` against the denominator of the applied factor's rate unit, so a `kg/kg` factor over a quantity in tonnes yields a result a thousand times too large, silently. That fix was postponed because no normal user flow reaches the path — it still needs fixing.

It lands in the same service as the year validation, and both need a server-side read of the referenced emission factors, which this service has never done. This change introduces that lookup and deliberately selects the rate measurement unit and its denominator alongside the year, even though only the year is consumed here, so the postponed fix becomes a check added to an existing query rather than a second round trip.

## To confirm before rollout

The backfill year is set to **2025** by decision, on the evidence that 195 of 284 seeded source strings say `DEFRA 2025`. That evidence describes the shipped catalogue, not necessarily the production table — factors added by administrators are swept in too. Confirm with the methodology team, and count what Decision 2's transition will clear, across every year rather than only those before 2025.

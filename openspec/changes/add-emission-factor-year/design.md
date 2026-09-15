## Context

Emission factors live in `emission_factor`, keyed by `(subcategory, dimensionValue1, dimensionValue2, rateMeasurementUnit)` with a free-text `source` and a `gas_details` JsonB breakdown. A footprint line freezes what it used in `carbon_inventory_line_factor`: `emissionFactorId`, `appliedFactorValue`, `appliedFactorRateUnitId`, `appliedFactorSource`, `derivationDetails`. `carbon_inventory.year` is `Int?` although the UI requires it in step 1.

Findings from `main` @ `f989cbdc` that drive every decision below.

**1. Uniqueness is enforced in three places, not one.** The partial unique index `emission_factor_unique_subcategory_dims_source` (`packages/database/src/prisma/migrations/20251227203015_create_methodology_tables/migration.sql:169`) covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source) WHERE status <> 'DELETED'`. `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) rejects a second ACTIVE factor for the same subcategory and required-dimension combination — it never looks at `source`, so it is **stricter than the index** and is what actually blocks. `validateSourceConsistency` (same file, line 109) forces every ACTIVE factor of a subcategory to share one source.

**2. The capture selector keys on `source`, not on the factor.** `EmissionEditorFactorSourceCell` builds its dropdown from `[...new Set(factors.map(f => f.source))]`; `useEmissionEditorForm` then resolves the chosen string back to a factor. When more than one factor matches, it emits a `console.warn` and **silently leaves the cell empty**. That branch is unreachable today precisely because of finding 1, and any design that lets two factors match the same line resurrects it.

**3. `syncCarbonInventoryLines` never reads `emission_factor`.** `createLineFactor` writes `appliedFactorValue`, `appliedFactorSource` and `emissionFactorId` verbatim from the request payload. There is not a single query against the factor table in the whole service. Any server-side rule about the factor's year requires introducing the first such fetch. The service also reads the footprint **before** opening its transaction, and no transaction in the repository's carbon-inventory paths raises its isolation level — `Serializable` appears in five services, none of them here — so they run at `READ COMMITTED`.

**4. Silent data loss on methodology duplication.** `cloneEmissionFactors` (`apps/api/src/features/methodologies/duplicateMethodology/helpers.ts:275`) enumerates columns by hand in its `createMany`. A column not listed there is dropped, without error and without warning.

**5. The catalogue already half-states its own year.** Of the 284 seeded factors, the `source` strings are `DEFRA 2025` (195), `IPCC` (83), `EcoAct 2020` (3) and `Kool, A.` (3).

**6. A line used to lose its factor identity the first time it was edited — fixed in PR 647.** `useEmissionCaptureData` initialised every line recovered from the server with `baseFactorId: null`, so saving any edit — even changing only a comment — wrote a snapshot whose factor reference was null while keeping the frozen value and source. It was a live defect independent of the year: in `getEmissionFactors`, `gasBreakdownLines` and the row identifier both derive from the `emissionFactor` relation, so an edited line lost its gas breakdown in the verifier's report and showed up as a `manual-<id>` row. The line now carries `baseFactorId` through `mapLineToResponse` and both line schemas, and the hook hydrates it. This design depends on that: without it, the clearing would read edited lines as manual and the reconciliation would skip them.

**7. Lines can be parked and restored outside `sync`.** `toggleManualTotalEmissions` flips lines between `ACTIVE` and `OUTDATED`; an `OUTDATED` line keeps its snapshot and can be reactivated later without passing through `syncCarbonInventoryLines`.

**8. A footprint's editable state is derived, not stored.** It is computed from the footprint's submissions (`apps/api/src/features/carbonInventories/helpers.ts:388-406`): a `REVIEWED` calculation or verification submission yields `CALCULATION_REVIEWED` or `VERIFICATION_REVIEWED`, both of which `isCarbonInventoryEditable` treats as editable. `reviewSubmissionService` only flips the submission's status, so returning a footprint with observations makes it editable again without any code path touching its lines. The `carbon_inventory.is_editable` column exists but is a free-floating flag set through `updateCarbonInventory` and never reconciled with the submission state, so no SQL predicate can rely on it.

**9. Line inputs are versioned, and only the active one is read.** Each save deactivates the current input and inserts a replacement, under a unique index of one active input per line. Every reader — the mappers, the summaries, the verifier's report, duplication — filters `isActive: true`, so the superseded versions are audit trail that nothing in the application consults.

**10. A manual line also has a factor snapshot.** `createLineFactor` is called unconditionally, so a line with a custom source produces a `carbon_inventory_line_factor` row too, with `emission_factor_id` null and `applied_factor_source` holding that custom source. A snapshot damaged by finding 6 has the same null id but keeps the real catalogue source, which is what separates the two.

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
- No 2026 factor set. The catalogue is dated 2025 and the 2026 factors arrive in a follow-up PR.

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

### Decision 2 — The migration carries a data transition, and it spares nothing

**Choice**: dating the catalogue does not retroactively fix the footprints that used it. In the same migration, **every** footprint whose year differs from the catalogue year has the factor snapshots and results of its catalogue-backed lines removed — regardless of whether it is editable, submitted or verified. The clearing acts on the active input of each line, leaving the superseded input versions as they are.

**Why it spares nothing**: the platform has no real data. The requests grid shows eleven requests in total, of which the only two verification recognitions belong to test organizations, there are no pending requests, and every live period is 2025 or 2026. Nothing being erased was declared in earnest.

That matters because sparing submitted footprints is what created the two re-entry routes found in review. A submitted 2024 footprint keeping its 2025 factors can be duplicated once a 2024 catalogue exists, or be returned with observations and become editable again — in both cases arriving at an editable footprint holding factors the selector will not offer. `reviewSubmissionService` only flips the submission's status, and the editable state is derived from the submissions (`carbonInventories/helpers.ts:400`), so nothing in that path could clear anything. Clear everything once and neither route has a source of mismatched data: duplication copies something already consistent, and a return restores something already consistent. Neither needs code.

**This is a one-time exception and the migration must say so.** Erasing the factors of a submitted footprint destroys the record of what was declared, which is exactly what GHG Protocol and ISO 14064-1 require to be preserved. It is defensible here and only here, because there is nothing real behind it. A comment in the migration states that, so nobody reads it as precedent.

**Reversibility**: a `pg_dump` before running the migration, which is standard practice and costs no code. The alternative considered was versioning the clearing the way `sync` does — deactivating each input and inserting a replacement without a factor — so the previous state stayed queryable in the database. Rejected: that is building a backup into a migration.

**Scope of the delete**: every reader of line inputs filters `isActive: true`, so the superseded versions are audit trail that nothing in the application consults. The clearing therefore touches the active input of `ACTIVE` and `OUTDATED` lines and leaves the history alone.

**Alternatives considered**:

- **Touch no data, document the inherited state** — no writes over user data during deployment. Rejected: the defect survives intact in exactly the data it was meant to fix.
- **Spare submitted footprints and pay for it in code** — the conservative reading, which respects the declared record and pays with a clearing helper invoked from the migration, the year change, `duplicateCarbonInventory` and `reviewSubmission`, plus a test per route. Rejected on the evidence above: it is a correctness argument about data that does not exist, and its correctness depends on having enumerated every route into an editable state — a list that breaks silently the day someone adds a fifth.

**What it removes**: the per-line catalogue check in `duplicateCarbonInventory`, any change to `reviewSubmission`, and the "editable" SQL predicate the migration would otherwise need — which could not have keyed on `carbon_inventory.is_editable` anyway, since that column is a free-floating flag nothing maintains against the submission state.

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

**Where the confirmation lives**: inside `useBusinessProfilingSubmit`, not in the screen. Step 1 has two exits that save — advancing and saving on the way out — and `BusinessProfilingScreen` instantiates the hook twice, once for each, but both funnel through the same `submit`. Putting the confirmation there covers both, and covers a third exit if one is ever added. The alternative, a modal at each call site, duplicates the condition and leaves that future exit uncovered; warning at the moment the field changes was rejected because a user who reverts the year or abandons without saving would have been alarmed about something that never happened.

### Decision 7 — Line synchronization reconciles rather than rejects, under a row lock

**Choice**: when `syncCarbonInventoryLines` finds a line referencing a catalogue factor whose year differs from the footprint's, it writes that line **without** a factor snapshot and without a result — keeping its subcategory, dimension values, measurement unit, quantity, comment and files — and returns the ids of the lines left without a factor so the client can say so in Spanish. Manual-factor lines are untouched.

**Why reconcile instead of reject**: rejecting produces a state with no way out. The user is told that a factor they never touched is invalid, on a line they may not even have edited, and the whole subcategory refuses to save. Reconciling reaches the same invariant — no line keeps a catalogue factor from another year — through the same outcome the year change already produces, which the user has seen before and knows how to resolve: the cell is empty and asks for a factor.

**What it absorbs**, each of which would otherwise need its own mechanism:

- an administrator moving a factor's year while lines point at it — the line is cleared on its next save instead of becoming unsavable, which is why Decision 9's stated limit is now a described behaviour rather than an accepted hazard;
- a stale client cache, the reachable path this validation existed for in the first place;
- any route into an editable footprint that this design failed to enumerate;
- a lost race, which degrades from "an incompatible factor persists forever" to "it is corrected on the next save of that subcategory".

**The interleaving is accepted, not closed.** These transactions run at `READ COMMITTED` — the repository sets no global isolation level and uses `Serializable` only in five small services, none of them here — so a `sync` can read year 2025, a concurrent year change to 2026 can commit its clearing, and the first can then write a 2025 factor into a 2026 footprint. Closing it means a `SELECT … FOR UPDATE` on `carbon_inventory` taken by both paths: one statement, and cheaper than raising the isolation level of the heaviest transaction in the application, which would mean a retry loop around `40001`.

It is not taken, for two reasons. The case requires two people editing the same footprint at the same moment, or one person in two tabs, and that is rare enough to accept. And the honest test for it is expensive — two real connections forced to interleave, not a simulation — to close a window narrower than the deployment window this change already accepts, where the previous API version can write a factor of any year with nothing watching. Under the reconciliation the residue is also self-correcting: the line loses its stale factor the next time that subcategory is saved. Reaching for the lock later costs the same one statement.

**Cost accepted**: the clearing is silent at the moment it happens. The response carries the affected line ids precisely so it is not silent on screen, but a client that ignores that field will drop a factor without saying anything. That is the trade against an error the user cannot act on.

**Alternatives considered**:

- **Reject unconditionally** — what this design said before. Tenable only while Decision 6 guarantees no legitimate request carries a mismatched factor, and that guarantee turned out to have holes on every side: a duplicated historical footprint, a footprint returned with observations, an administrator editing a factor's year, a lost race.
- **Reject, with an exemption for pre-existing footprints** — a grace flag so inherited factors stay editable. Rejected: a second rule to model, persist and eventually retire inside the same service.

### Decision 8 — A line keeps its factor identity through editing (landed in PR 647)

**Choice**: the line response gains the referenced factor's id, `useEmissionCaptureData` hydrates `baseFactorId` from it instead of nulling it, and the snapshots already damaged are cleared by the migration rather than recovered.

**Where it lives**: the first two halves shipped separately, in PR 647 (`fix/mati/line-factor-identity`, commit 21cb3db6), because they fix a live defect that has nothing to do with the year and deserved to be reviewed on their own. This change depends on that PR being merged; the reasoning below is kept because the design rests on it. The field is named `baseFactorId`, matching the name the sync request already used, and it had to be added to two parallel `.strict()` line schemas — `getCarbonInventoryById` and `syncCarbonInventoryLines`, both fed by `mapLineToResponse` — since a field present in only one is stripped by the serializer on the other. Worth remembering if this change adds another line field.

**Why it is in scope**: the whole design rests on telling a catalogue line from a manual one and on having an id to validate the year against. Today, `useEmissionCaptureData.ts:50` sets `baseFactorId: null` on every recovered line, so editing anything — a comment is enough — writes a snapshot with `emissionFactorId` null while keeping the frozen value and source. Under the rules above, that line would be treated as manual by the clearing and skipped by the reconciliation. Both guarantees would fall through an ordinary edit.

**It is also a live defect**: in `getEmissionFactors`, the gas breakdown and the row identifier both derive from the `emissionFactor` relation, so an edited line already loses its gas breakdown in the verifier's report and appears as a `manual-<id>` row. Fixing the identity fixes that too, independently of the year.

**Alternatives considered**:

- **Classify by the source instead of the id** — ask whether `factorSource` is in `CUSTOM_FACTOR_SOURCES`, which is in fact how every manual check in the frontend works; PR 647 confirmed that nothing reads `baseFactorId` as a manual signal, so the two classifications do not contradict each other. Works on today's data and classifies the damaged lines correctly. Rejected: the year validation still has no id to look up, so it would have to re-resolve the factor from subcategory, dimensions, unit and source, and the gas-breakdown defect stays.
- **Accept the loss and lower the guarantees** — smallest scope, but Decision 9 falls with it and an edited line keeps a factor from another year forever.

**The API has to expose the id first.** `mapLineToResponse` returns the frozen value, source and rate unit but not `emissionFactorId`, so there is nothing for the hook to hydrate from. Fixing this on the client alone is impossible; `packages/types` and the mapper are part of the fix.

**The damaged rows are identifiable, and they are cleared.** `createLineFactor` runs for every line, so a manual line also has a snapshot — with `emission_factor_id` null and `applied_factor_source` holding a custom source such as `"Otro"`. A damaged catalogue line has the same null id but keeps the real catalogue source, which separates the two without ambiguity. Decision 2's migration uses that discriminator to clear them along with everything else. No attempt is made to recover the reference by matching subcategory, dimensions, unit and frozen source: with no real data behind it, a reconciliation query would be written, tested and justified to rescue nothing.

**Cost accepted**: none, now that it ships separately — what remains here is a dependency on PR 647 rather than a widening of this change.

### Decision 9 — No frozen year on the line; it is derived, within stated limits

**Choice**: `carbon_inventory_line_factor` gains no `applied_factor_year` column. Wherever a line's year is needed, it is the footprint's year.

**Rationale**: Decisions 6, 7 and 8 together keep a catalogue-backed line on its footprint's year — the clearing removes stale ones, the reconciliation strips new ones, and the identity fix keeps the classification honest. For a manual line, which survives a year change, the footprint's year is still the right answer under our own definition: `year` means validity, not provenance, and a user who keeps their manual factor in a 2026 footprint is asserting it is valid for 2026.

**An administrator may move a factor's year while lines point at it.** Nothing prevents that, deliberately — no guards are built over an active methodology. The derived year survives it, because it answers _"which period was this line reporting"_, not _"how is the factor dated today"_; the footprint's period does not change when the catalogue is edited underneath. Under Decision 7 the affected lines are cleared on their next save and the user is told which ones, so this is a described behaviour rather than a hazard to accept. Warning the administrator with a count of the lines that would be affected was considered and deferred: it informs without blocking, but it costs a count query per row in the maintainer, and nothing is lost by adding it later.

**What it removes**: a column and its migration, two entries in the type schemas, its population in `sync`, its carry-through in `duplicateCarbonInventory`, its exposure in `mapLineToResponse`, and the tests for all of it.

**Alternatives considered**:

- **Keep the column** — stays correct even if someone later relaxes the clearing or the reconciliation, and would let the editor show a surviving manual factor as coming from another year. Rejected as paying for a column to carry a derivable value.
- **Keep it only for manual lines** — the only case where it carries information, but a column populated for some rows and null for others invites the "what does null mean here" ambiguity Decision 1 removed.

**Adjacent gap, recorded but out of scope**: `manualFactorSource` stores the literal string `"Otro"`, not a citation. CYCLO asked specifically for _"espacio para poner cuál es la fuente ... ¿de dónde lo sacaste?"_. A source problem, not a year problem.

### Decision 10 — Sliding window in the maintainer dropdown, a static bound in the shared schema

**Choice**: the maintainer's year field is a dropdown offering `[currentYear - 4 .. currentYear + 1]`, kept in `apps/web` beside `CALCULATOR_YEARS_RANGE_FROM_CURRENT`. The Zod request schemas in `packages/types` carry a wide static bound (roughly `1990 .. 2100`).

**Rationale for the range**: DEFRA publishes the year N set during year N (around June), and national grid factors publish year N's factor during N+1; both fall inside it. The forward year covers early publication or a validity that starts next year.

**Out-of-window rows keep their year visible**: when a factor's year falls outside the offered window, that year is added as an option of its own row. A MUI `Select` whose value is not among its options renders blank and warns on the console, so without this the grid would misreport the data it exists to show. Injecting it per row keeps the factor editable and cannot leak an obsolete year into another row, since the option only exists where the value already is. Showing it as read-only text was the alternative — truer to the window's intent, at the cost of having to go to the database to correct a year typed wrong years earlier.

**Rationale for the split**: the window slides every 1 January. Enforcing it server-side would make every factor of the year that drops out uneditable overnight — including for correcting its value, with an error about a field the administrator never touched. A dropdown is where typos are prevented; a static bound in `packages/types`, already consumed by both apps, still stops a `2205` and needs no new shared constant.

**Note**: this is a write validation, which fails loudly. It is not the failure mode of `MEASURING_ORGANIZATIONS_YEAR_RANGE`, a read filter that silently hid organizations from a grid.

### Decision 11 — A footprint with no year is guarded explicitly

**Choice**: when `carbon_inventory.year` is NULL, the service returns the methodology with no emission factors, via an explicit branch that never builds a year filter.

**Why it is not free**: an earlier draft claimed this fell out of the filter. It does not — with `year` non-nullable in Prisma, the generated `where` type does not accept `null`, so there is nothing to "match nothing" with. The options were an explicit branch or a sentinel year no factor can hold; the branch says what it means and skips the query, while a sentinel relies on nobody ever dating a factor with that value, which the wide schema bound does not forbid.

`carbon_inventory.year` is left nullable rather than tightened here: that is a second `NOT NULL` migration over user data, and unlike the catalogue there is no evidence from which to infer the year of a footprint that never declared one.

### Decision 12 — The verifier's report: frozen source, snapshot-keyed rows, no year

**Choice**: in `getEmissionFactors`, the source's fallback chain is inverted so `appliedFactorSource` wins over the live `emissionFactor.source`. The de-duplication key becomes the frozen snapshot — factor id plus frozen source plus applied value plus applied rate unit — rather than the factor id alone. No year is added to the rows. The gas breakdown keeps reading live, as a documented exception.

**Context**: the report mixes origins today — `factorValue` comes from the snapshot, `source` and `gasBreakdownLines` from the live table. An admin editing a factor's source changes what an already-verified footprint reports, next to a value that did not change.

**Why the de-duplication key changes**: the report is a list of factors used, not of lines, and collapsing repeats is intentional. But once the frozen source wins, two lines that used the same factor before and after an administrative edit hold different frozen sources, and keying on the factor id alone would drop one of them silently, picking by line order. Keying on the snapshot keeps identical uses collapsed and distinct ones visible. The rate unit belongs in that key because an applied value means nothing without it: `0.21 kg/L` and `0.21 kg/kWh` are different factors that a value-and-source key would collapse into one row. Grouping by factor id alone was reconsidered and rejected for the opposite reason — the same factor expanded into two rate units is precisely what the verifier needs to see broken out. The requirement is worded as "each factor used", which is what the report always was.

**Why no year**: the report is scoped to a single footprint, so the year is constant across rows and established by the footprint itself. ISO 14064-3 asks the verifier to judge whether the factor corresponded to the period; knowing the period and which factor each line used satisfies that.

**Alternatives considered**:

- **A year on every row** — self-describing once exported to a spreadsheet where a header can be lost. Rejected as repeating in every row what the footprint already determines.
- **A single year at the response root** — `GetEmissionFactorsResponse` is a bare `z.array`, so a root field means changing the response shape and its consumer: more work than either alternative.
- **Freeze everything, gas breakdown included** — fully reproducible under ISO 14064-3, but a new column plus migration, population and carry-through.

## Risks

- **The migration performs a destructive bulk operation** (Decision 2) over every footprint of another year, submitted and verified ones included. It needs a `pg_dump`, a count and a heads-up before deployment, not just a changelog line.
- **The derived year depends on three guarantees holding** (Decision 9): the clearing, the sync reconciliation and the identity fix. If any is later relaxed, a line could sit on a factor from another year with nothing to catch it. The tests for Decisions 6, 7 and 8 are what keep it honest.
- **A deployment window in which the previous API version is still serving.** Migrations run before containers are replaced, so for a few minutes the old code faces a `NOT NULL` column it does not populate — creating a factor from the maintainer fails — and, worse, its `sync` still accepts a factor of any year, so it can write back exactly what the migration has just cleared. A maintenance window would close both, and with no real users it would cost nothing; it was considered and not taken. What is accepted instead: creation failures are admin-only, visible and retryable, and a factor written back during the window is cleared on the next save of that subcategory under Decision 7. The residue that survives is a footprint nobody saves again, which would keep an incompatible factor unnoticed — so a verification query after the deployment lists any line factor whose year differs from its footprint's, making that residue visible rather than hypothetical. No column default is added: a default would let a factor be created without stating its year, which is what Decision 1 exists to prevent.
- **The current year has no catalogue on day one.** The backfill dates everything 2025, so footprints for 2026 — the year in progress — are cleared by Decision 2's migration and find nothing to choose from until the 2026 set is loaded by a follow-up PR. The manual factor is the documented path in the meantime, which is what the verifier prescribes, but it is a real gap in the product between the two deployments.
- **A year change interleaving with a line save** (Decision 7): rare enough to accept, self-correcting on the next save, and closable later with a single `FOR UPDATE` statement.
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

Outside this change: the 2026 factor set. With the year mandatory and the catalogue dated 2025, a footprint of the current year has no factors until that set exists. It arrives in a follow-up PR — most naturally as seed data plus a script, which sidesteps the missing bulk import instead of typing 284 rows into the grid.

### On the postponed unit-mismatch fix

`syncCarbonInventoryLines` never cross-checks a line's `measurementUnitId` against the denominator of the applied factor's rate unit, so a `kg/kg` factor over a quantity in tonnes yields a result a thousand times too large, silently. That fix was postponed because no normal user flow reaches the path — it still needs fixing.

It lands in the same service as the year validation, and both need a server-side read of the referenced emission factors, which this service has never done. This change introduces that lookup and deliberately selects the rate measurement unit and its denominator alongside the year, even though only the year is consumed here, so the postponed fix becomes a check added to an existing query rather than a second round trip.

## To confirm before rollout

The backfill year is **2025**, on the evidence that 195 of 284 seeded source strings say `DEFRA 2025`. That evidence describes the shipped catalogue, not necessarily the production table — factors added by administrators are swept in too, and should be confirmed with the methodology team rather than assumed.

Decision 2's clearing is destructive and irreversible in place, so the migration is run behind a `pg_dump`. Counting what it will touch is no longer a precondition — it touches everything of another year — but it is worth having the number, by year and by submission state, to know what to say afterwards and to size the 2026 gap the follow-up PR has to close.

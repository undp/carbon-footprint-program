## Context

Findings that drive every decision below. All verified on `mrivas00/append-factors-active-methodology`, which branches off `feat/mati/add-emission-factor-year` (PR 652, open and mergeable).

**1. `PUBLISHED` has no write semantics anywhere in the API.** `createEmissionFactor`, `updateEmissionFactor` and `deleteEmissionFactor` never read the methodology's status. `createCategory/service.ts:40` and `swapCategoryPositions` guard `DELETED` only. The single place the status decides anything on the write path is `createCarbonInventory/service.ts:18-27`, which picks `findFirst({ where: { status: PUBLISHED }, orderBy: { id: "asc" } })` as the version a new footprint is bound to. Everything else that treats the published version as frozen is maintainer UI.

**2. A footprint never changes version.** `methodologyVersionId` is set at creation and `updateCarbonInventory/service.ts:87` states it is not updatable. `duplicateCarbonInventory` copies it. So the cohort of footprints reading a version is fixed once that version stops being published.

**3. Publishing v2 frees v1.** `updateMethodology/service.ts:65-77` unpublishes every other published version of the same country. `isViewOnly`'s `|| PUBLISHED` term then evaluates false for v1, so v1 — read by every footprint created while it was live, verified ones included — becomes fully editable in the same maintainer that refuses to touch v2. The UI freezes the version with the newest dependents and frees the ones with the oldest.

**4. The block is reachable around, through the UI.** Duplicate v1 → publish v2 → v1 unpublishes → edit v1's factors → republish v1 (which unpublishes v2). Cost: a junk v2; a `cloneEmissionFactors` pass whose hand-enumerated `createMany` drops any column not listed, silently, and has already done so once (`add-emission-factor-year` design, finding 4); and every footprint created during the window permanently bound to v2.

**5. Line inputs are versioned; line factors hang off the input, not the line.** `CarbonInventoryLineInput` carries `isActive` under a DB constraint of one active input per line, and `CarbonInventoryLineFactor` has `@@unique([lineInputId])`. Every reader in the application filters `isActive: true` — the mappers, the summaries, the verifier's report, duplication — so superseded inputs and their factor snapshots are audit trail nothing consults. A factor can therefore accumulate references that exist only in history.

**6. `carbon_inventory_line_factor` has no index on `emission_factor_id`.** The only index is `@@unique([lineInputId])`. Postgres does not index foreign keys automatically. The table gains a row on every line save, because the inputs are versioned.

**7. Lines can be parked outside `sync`.** `toggleManualTotalEmissions` flips lines between `ACTIVE` and `OUTDATED`; an `OUTDATED` line keeps its snapshot and can be reactivated later without passing through `syncCarbonInventoryLines`. Its input stays `isActive`.

**8. The actions column disappears with `viewOnly`.** `useEmissionFactorColumns.tsx:617` appends the actions column only when `!viewOnly`, so a screen that stays "view only" while allowing a write has no save and no cancel button for the row being written.

**9. Three write paths leave the grid, not one.** `handleStopEditRow`'s `updateMutation` branch (`EmissionFactorsMaintainerScreen.tsx:284`), `handleSaveGEIBreakdown`'s `updateMutation` for existing rows (`:468`), and `handleDelete` (`:405`). The GEI modal's own `readOnly` is wired to `scope.isViewOnly` (`:577`), screen-wide rather than per row.

## Goals / Non-Goals

**Goals:**

- Let a factor be added to the version a live footprint already reads, which is the only version that can reach it.
- Make "you cannot change a factor footprints depend on" true, instead of approximately true on one screen.
- Key the rule on the dependency, not on a status that correlates with it badly in both directions.
- Keep the blast radius to the emission-factor screen.

**Non-Goals:**

- No change to what `PUBLISHED` means: one published version per country, new footprints bound to it, no version per year.
- No warning-with-override over a factor in use.
- No year filter, no bulk import, no draft state on the factor.
- No attempt to make an unpublished version behave differently from a published one. The whole point is that the rule stops caring.

## Decisions

### Decision 1 — The predicate is line usage, not methodology status

**Choice**: a factor may be updated or deleted while no active line input references it. Once one does, it is immutable. The methodology version's status is not consulted.

**Rationale**: `methodology.status === PUBLISHED` is a proxy for "a footprint depends on this factor", and it is wrong in both directions. Over-inclusive: a v2 published yesterday has zero footprints and is frozen. Under-inclusive: an unpublished v1 with hundreds of verified footprints is wide open (findings 2 and 3). Building the status guard would buy the feeling of a guarantee while leaving the real exposure untouched, and would cost the only cheap way to correct a wrong row in the live catalogue — on a catalogue that `add-emission-factor-year` now requires to be restated every year.

**What it removes**: the asymmetry in finding 3 disappears without a second rule; the workaround in finding 4 stops being the only route; and nothing in the change has to walk factor → subcategory → category → methodologyVersion, which is what a status guard would need since a factor carries no version of its own.

**Alternatives considered**:

- **A guard on the methodology's status** — the literal reading of the maintainer's current behaviour. Rejected on the proxy argument above.
- **Keep the UI block and change nothing else** — rejected: it is the premise `add-emission-factor-year` shipped on, and it is false.
- **Session-scoped editability of rows added in this mount** — enough to fix a typo in a row just created, and cheap. Rejected once the usage predicate was chosen: it answers the same need with a rule that survives a refresh and means something.

### Decision 2 — "In use" means a live line references it

**Choice**: a factor is in use when a `carbon_inventory_line_factor` row points at it **from an input whose `isActive` is true, on a line in `ACTIVE` or `OUTDATED`, under a footprint in `ACTIVE`**. Superseded input versions, deleted lines and deleted footprints do not count.

**Rationale**: finding 5 — the superseded snapshots are audit trail nothing reads. Under a UI-only rule, counting them would merely be conservative; under a hard 409 it would be permanent, freezing a factor forever because of a row no reader of the application ever looks at.

`OUTDATED` lines are included because of finding 7: they keep their snapshot and can be reactivated without passing through `sync`, so a rule that ignored them would let an edited factor walk back into a live footprint through the back door.

`DELETED` lines and deleted footprints are excluded for the mirror image of that reason. Both deletions are soft — `syncCarbonInventoryLines` sets `line.status = DELETED` and `deleteCarbonInventory` sets `carbonInventory.status = DELETED`, neither touching the input or its snapshot — and no code path returns either to `ACTIVE`. The back door finding 7 guards against does not exist here, so counting them would only lock a factor permanently against a line nobody can see, restore or point at. This was missed in the first cut of the guard and corrected before merge; `updateCarbonInventory/helpers.ts` already carried the right line predicate.

**Cost accepted**: the count needs a join to `carbon_inventory_line_input` and on through the line to the footprint, so it is not the one-line `count` over a foreign key. With the index from Decision 6 doing the coarse narrowing, the rest is primary-key lookups.

**Kept in one place**: the predicate lives in `activeLineReferenceWhere` and is shared by the guard and the listing's `_count`, rather than restated at each site. The grid decides whether to offer an edit and the API decides whether to refuse one; if the two drift, the maintainer either locks rows the API would accept or offers edits that will come back a 409. This is the `satisfies`-const case the repo's soft-delete convention carves out, not a builder function.

**Alternatives considered**:

- **Any row in `carbon_inventory_line_factor`** — the cheapest count and the easiest sentence. Rejected on the permanence argument above.
- **Only lines belonging to a submitted or verified footprint** — the most precise statement of what the guard protects, and it would leave a factor touched only by drafts correctable, which is the common case while a set is being loaded. Rejected on cost: it means walking input → line → carbonInventory → submissions, and the editable state is derived from the submissions (`carbonInventories/helpers.ts:388-406`) rather than a filterable column, so the predicate cannot be expressed as one `where`.

### Decision 3 — The guard is enforced server-side; the UI only stops offering

**Choice**: `updateEmissionFactor` and `deleteEmissionFactor` return `EMISSION_FACTOR_IN_USE` (409) for a referenced factor. The maintainer disables the row and explains why, but the UI is not where the rule lives.

**Rationale**: the rule has to hold for a hand-rolled PATCH, which is exactly how the current convention is bypassed today. A UI-only version would reproduce the thing this change was written to fix: a convention that reads as a guarantee and is not one.

**This reverses a decision taken deliberately.** `add-emission-factor-year` rejected any immutability guard over an active methodology (`proposal.md:57`, `design.md:44`), described an administrator moving a factor's year under live lines as a described behaviour rather than a hazard (Decision 9), and closed its Risks list on _"No immutability guard on factors of an active methodology — a standing, previously accepted risk."_ Those statements were about a guard keyed on the methodology's status. This one is keyed on the dependency. The amendment lives in that change's design, not here, so there is one account of it.

**What it does not cover**: `syncCarbonInventoryLines` can attach a line to a factor between the usage check and the write. Both run at `READ COMMITTED`, and the repository raises the isolation level nowhere on these paths. The result is an edit to a factor that became referenced a moment ago — exactly what happens today, unguarded, on every path. Closing it means a `SELECT … FOR UPDATE` on the factor row taken by both paths; it is one statement and costs the same later. Not taken, on the same reasoning `add-emission-factor-year` applied to the year-change race.

**Cost accepted, and it is the real one**: a factor that is wrong **and** already in use becomes uncorrectable by any route. Today a PATCH fixes it. The guard is worth having only if that is true, so it is stated rather than softened; the escape hatch, if one is ever wanted, is Decision 4's count in a warning, not a hole in the rule.

**Alternatives considered**:

- **Gate in the UI, leave the API open** — cheapest, and it keeps the correction path for a referenced factor. Rejected: it is the status quo with a better predicate, and the exploration's own objection to the status gate was that it was never enforced.
- **Warn with the count and let the administrator continue** — the aviso `add-emission-factor-year` deferred; informs without blocking, and makes the consequence visible instead of hiding it. Rejected here because it reintroduces editing factors that footprints depend on. It stays available as a later relaxation, and Decision 4 already ships its data.

### Decision 4 — The listing carries a count, not a boolean

**Choice**: `GetAllEmissionFactorsResponse` rows gain `referencedLineCount: number`, produced by a filtered relation count in the existing `findMany` (Prisma 7.9.1; filtered relation counts need no preview flag).

**Rationale**: the `_count` returns the number either way, so the boolean would throw information away for nothing. The count turns an opaque disabled row into _"Usado por 12 líneas"_, and it is the exact datum the deferred warning would need, so that relaxation becomes a UI change with no contract change.

**Alternatives considered**:

- **A boolean `isReferenced`** — narrower to maintain and impossible to misread as live. Rejected: the number is already in hand, and the tooltip is the whole reason the signal is exposed.
- **Expose nothing; let the 409 speak** — zero contract change and no extra work in the listing, which was the attraction of the original estimate. Rejected: the administrator types a whole row and loses it to an error that was knowable, and the actions column cannot disable anything, so the rule stays invisible until it is hit.

**Freshness is not guaranteed and that is fine.** The count is as old as the last refetch; a factor can become referenced between the render and the click. The 409 is what makes the rule true, and the count is what makes it legible.

### Decision 5 — Only the emission-factor screen is unlocked

**Choice**: `isViewOnly` keeps its `|| PUBLISHED` term. The emission-factor screen derives its own permission from the scope hook and ignores that term; Categories, Subcategories and Dimensions are untouched and keep behaving exactly as today.

**Rationale**: the guard only exists for factors. Nothing checks whether a category, a subcategory or a dimension is depended upon, and a subcategory delete cascades to its emission factors (`onDelete: Cascade`) whether or not those factors are in use. Removing the term from the shared hook would unlock three screens that have no rule behind them.

**Cost accepted**: the maintainer is now inconsistent across its four methodology screens — one of them edits the published version, three refuse. That is the honest shape of it: one of them has a guarantee behind it.

### Decision 6 — The index is part of this change

**Choice**: one migration adding an index on `carbon_inventory_line_factor(emission_factor_id)`. No data is touched.

**Rationale**: finding 6. Without it, the listing's filtered count is a sequential scan per row over ~284 rows in one query, and each guarded update or delete is another. The table grows with every line save because the inputs are versioned, so this degrades with use rather than staying small.

Plain `CREATE INDEX`, not `CONCURRENTLY`: Prisma runs a migration inside a transaction, and the table is small enough today that the lock is not worth the split migration.

### Decision 7 — Per-row `canEditRow` in the grid, not a dialog and not a mode flag

**Choice**: the `viewOnly` boolean handed to `useEmissionFactorColumns` becomes a `canEditRow(rowId)` callback the screen computes once. The actions column renders whenever the screen can write at all, and gates its buttons per row. `GEIBreakdownModal`'s `readOnly` moves from the screen-wide `scope.isViewOnly` to the row.

**Rationale**: the rule is per row, so the parameter is per row. The cells already call `getFormRow(params.row.id)` in every `renderCell`, so the substitution is mechanical.

**Alternatives considered**:

- **A dedicated "Agregar factor" dialog, leaving the grid read-only** — it would not touch `useEmissionFactorColumns` at all, which is where the risk is concentrated, and it reads better for loading a set ("save and add another", no pagination, no rows jumping to their sorted position). It was the stronger option while the rule was "only brand-new rows". It stops working under Decision 1: an unreferenced existing row is editable, and a dialog cannot express that.
- **A `mode: "view" | "append" | "edit"` on the scope hook** — rejected with Decision 5: the other three screens read that hook, and a third mode would need them all to opt out of it.

**The three write paths of finding 9 get early returns, not disabled buttons.** The server backstops them, so they are assertions of the screen's own rule rather than the rule itself.

### Decision 8 — Creation stays unguarded, and that is the point

**Choice**: `createEmissionFactor` is not touched.

**Rationale**: nothing can reference a factor that does not exist. Adding a year's set to the live catalogue therefore needs no exception, no append mode and no flag — it falls out of the rule. The drip `add-emission-factor-year` accepted is unchanged: appending a factor only ever **adds** an option to the capture selector for footprints of that year. It invalidates nothing a user has already entered, and a manual factor survives it.

## Risks

- **A wrong factor already in use is uncorrectable** (Decision 3). Accepted knowingly; it is what makes the guard a guard. The mitigation, if it is ever needed, is the deferred warning-with-count rather than an exemption.
- **The check and the write are not atomic** (Decision 3). A line can attach between them. No worse than today, self-limiting, and closable later with one `FOR UPDATE`.
- **The count can be stale in the grid** (Decision 4). The 409 is the authority; the count is the explanation.
- **The maintainer becomes inconsistent across its four methodology screens** (Decision 5).
- **`add-emission-factor-year` carries four statements this change falsifies**, and they are load-bearing for its Decision 7. If PR 652 merges without the amendment, the archived record of that change asserts the opposite of what ships.
- **The index is the only thing standing between this and a per-row sequential scan** on a table that grows with every save (Decision 6).

## Deferred work

| Deferred                                        | TODO site                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Warning with a line count that does not block   | the usage helper in `emissionFactors/helpers.ts`                                  |
| `FOR UPDATE` on the factor row across the check | the guard in `updateEmissionFactor`                                               |
| Year filter on the maintainer grid              | already recorded in `EmissionFactorsMaintainerScreen` — correct its stated reason |

## Before rollout

Nothing to coordinate: the migration touches no data and the guard refuses only what the maintainer already refused. The one thing that must not slip is the amendment in PR 652 — it has to land in the same review cycle, because once that change archives, its design is the account of record.

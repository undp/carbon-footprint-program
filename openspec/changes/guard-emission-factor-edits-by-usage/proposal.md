## Why

`add-emission-factor-year` assumes an administrator can load a year's set into the live catalogue one grid row at a time, and accepts the consequences: _"Bulk loading a year's set (~284 factors, today one grid row at a time). The drip of a half-loaded set into capture is an accepted risk."_ (`proposal.md:52`), _"Loading a year's set stays one grid row at a time."_ (`design.md:109`).

The maintainer makes it impossible. Two independent gates, both verified:

1. `apps/web/src/screens/Maintainer/hooks/useMethodologyColumns.tsx:211` — `editDisabled={isPublished || actionsLocked}`. The published version cannot enter edit mode at all; the row offers only "Ver".
2. `apps/web/src/screens/Maintainer/hooks/useMaintainerMethodologyScope.tsx:70` — `isViewOnly: !editingMethodology || targetMethodology?.status === PUBLISHED`, and `MaintainerScreenLayout.tsx:89` drops `onAddRow` when `isViewOnly`. Lifting gate 1 alone leaves the grid read-only.

This matters beyond the annual load. `carbon_inventory.methodologyVersionId` is set at creation (`createCarbonInventory/service.ts:44`) and cannot be changed by PATCH, so duplicating the methodology and publishing a new version does **not** reach footprints that already exist. A factor a live footprint needs has to enter the version it already references — which, for every recent footprint, is the published one.

**The gate is not a guarantee, and it protects the wrong cohort.** In the data model, `PUBLISHED` means exactly one thing: the version `createCarbonInventory` binds new footprints to. It carries no write semantics anywhere in the API — `createEmissionFactor`, `updateEmissionFactor` and `deleteEmissionFactor` never read it, and `createCategory/service.ts:40` guards only `DELETED`. Publishing v2 unpublishes v1 (`updateMethodology/service.ts:65-77`), at which point v1 — the version hundreds of existing, possibly verified footprints still read — becomes **fully editable** in the same maintainer. So the UI freezes the version whose dependents are newest and frees every version whose dependents are older. The block is also reachable around through the UI today: duplicate v1, publish v2, edit v1 freely, republish v1 — at the cost of a junk v2, a `cloneEmissionFactors` pass whose hand-enumerated `createMany` has already dropped a column silently once, and any footprint created in that window permanently bound to v2.

The question is therefore not whether to relax a guarantee. It is that the guard keys on the wrong thing.

## What Changes

- **Replace the methodology-status gate with a usage gate.** An emission factor SHALL be editable and deletable while **no active line input references it**, and SHALL be immutable once one does — whatever the status of the methodology version it hangs off. The rule is the same on the published version and on an unpublished one.
- **Enforce it server-side.** `updateEmissionFactor` and `deleteEmissionFactor` reject a referenced factor with a new `EMISSION_FACTOR_IN_USE` (409). This is a deliberate change of posture: `add-emission-factor-year` explicitly rejected any immutability guard over an active methodology (`proposal.md:57`, `design.md:44`, Decision 9, Risks). That decision keyed on the methodology's status, which is a poor proxy for "a footprint depends on this"; this one keys on the dependency itself. The reversal is recorded in that change's own design — see Impact.
- **Creation is never guarded.** Nothing can reference a factor that does not exist yet, so `createEmissionFactor` is untouched. Adding a year's set to the live catalogue works by construction.
- **Expose the usage on the maintainer listing.** `GetAllEmissionFactorsResponse` gains `referencedLineCount`, so the grid can disable the row and say *"Usado por N líneas"* instead of offering an edit that will 409.
- **Unlock the emission-factor screen on the published version, and only that screen.** Categories, Subcategories and Dimensions keep the `PUBLISHED` block: they have no usage rule behind them, and a subcategory delete cascades to its factors (`onDelete: Cascade`) whether or not those factors are in use.
- **Index `carbon_inventory_line_factor(emission_factor_id)`.** The only schema change, and not optional: the table has just `@@unique([lineInputId])` today, it grows with every line save because line inputs are versioned, and the listing's filtered relation count is a correlated subquery per row over ~284 rows.

## Capabilities

### New Capabilities

- `emission-factor-edit-guard`: when an emission factor may be changed or removed, what "in use" means, where the rule is enforced, and what the maintainer does with it.

### Modified Capabilities

<!-- None. `emission-factor-year-scoping` is still an in-flight change, not an archived spec; the statements this change reverses are amended in that change's own design (see Impact). -->

## Impact

- **Database**: one migration, index only, no data touched — `CREATE INDEX` on `carbon_inventory_line_factor(emission_factor_id)`. Plain, not `CONCURRENTLY`: Prisma runs a migration in a transaction, and the table is small today.
- **Types**: `referencedLineCount` on the `GetAllEmissionFactorsResponse` row shape; the `EMISSION_FACTOR_IN_USE` code in the shared error surface.
- **API**: a usage helper in `emissionFactors/helpers.ts`; an early return in `updateEmissionFactor` and `deleteEmissionFactor`; a filtered `_count` in `getAllEmissionFactors`. `createEmissionFactor` is untouched.
- **Web**: gate 1 in `useMethodologyColumns`; the `editActive` tooltip in `Maintainer/constants.ts`; a derived permission in `useMaintainerMethodologyScope` leaving `isViewOnly` untouched; five consumers of `isViewOnly` in `MaintainerScreenLayout` (`onAddRow` 89, subtitle 88, toolbar 103, padding 97, plus the call site's `GEIBreakdownModal readOnly`); `viewOnly` replaced by a per-row `canEditRow` across eight cells and the actions column in `useEmissionFactorColumns`; the three write paths in `EmissionFactorsMaintainerScreen` (`handleSaveGEIBreakdown`'s `updateMutation`, the `updateMutation` branch of `handleStopEditRow`, `handleDelete`); the `EMISSION_FACTOR_IN_USE` message in `getApiErrorMessage`.
- **`add-emission-factor-year` (PR 652, open)**: Decision 9's _"An administrator may move a factor's year while lines point at it. Nothing prevents that, deliberately"_ becomes false for active lines, and it is load-bearing — Decision 7 lists that case among the four the sync reconciliation absorbs, the Risks list closes on it, and `proposal.md:57` rejects the guard outright. All four are rewritten **in that change**, as a forward reference: no guard ships there, one is introduced here. This change does not restate the reasoning.
- **Operational consequence**: a factor that is wrong **and already in use** stops being fixable by any route, API included. Today it is fixable by a PATCH or by the unpublish dance. This is the accepted cost of the guard being real rather than advisory; the escape hatch, if one is ever wanted, is the warning-with-count below rather than a hole in the rule.

**Out of scope**:

- **A warning with a line count that informs without blocking**, the softer rule `add-emission-factor-year`'s Decision 9 deferred. `referencedLineCount` is exactly the datum it needs, so it becomes a UI change with no contract change. Not taken here because it reintroduces editing factors that footprints depend on, which is what this change exists to stop.
- **A year filter on the maintainer grid.** Still deferred, but **the reason recorded in `add-emission-factor-year` does not hold** and should not be repeated: that change feared filtering a grid whose rows are addressed by field-array index, and this grid resolves the index by id (`useEmissionFactorColumns.tsx:229`, `getFormRow`) against the unfiltered form array, while `MaintainerDataGrid.tsx:102-115` already filters by Fuse **during** editing and re-inserts the edited row when the query hides it. The `year` column is also already `filterable` under a toolbar that renders a `FilterPanelTrigger` (`MaintainerToolbar.tsx:44`). It stays out because it is orthogonal to the guard, not because it is risky.
- **Bulk / atomic import of a year's set**, unchanged from `add-emission-factor-year`.
- **The source lock ignoring the year** (`useEmissionFactorColumns.tsx:553`, which `EmissionFactorSourceCell.tsx:52-65` then writes into the form): appending a 2026 row to a subcategory holding 2025 factors silently overwrites the source you typed, although `validateSourceConsistency` is keyed on `(subcategory, year)`. It is a defect of `add-emission-factor-year` and is fixed **there**, in PR 652.
- **Any change to how `PUBLISHED` behaves** — one published version per country, new footprints bound to it, no version-per-year.

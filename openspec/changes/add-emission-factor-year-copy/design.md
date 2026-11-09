## Context

`add-emission-factor-year` scoped every emission factor to a footprint year, so each year needs its full set. After the seed, the only way to add a year is one grid row at a time in `/admin/emission-factors`.

**How catalogue changes are made.** The factor maintainer writes in any methodology version that is in edit mode, the published one included: under the usage guard, `useMaintainerMethodologyScope` returns `canEditEmissionFactors: !!editingMethodology`, and what can change is decided per factor, by whether a live line depends on it. Publishing a version unpublishes the country's other versions, new footprints take the published one, and an existing footprint stays bound to the version it was created with (the help text's «Sobre duplicar la Metodología»). Methodology duplication (`cloneEmissionFactors`, `methodologies/duplicateMethodology/helpers.ts`) copies every factor and keeps its year. A new year therefore reaches footprints in one of two ways:

- added to the published version, where it is live at once, for the footprints already in progress too;
- added to a duplicated draft that is published afterwards, which reaches only the footprints created after publishing.

This change replaces "added", in both.

**What the data says** (base seed, `tools/seed/src/data/base/methodologies.json`):

- 249 factors per year, for 2025 and 2026, citing «DEFRA 2025»/«DEFRA 2026» (195), «IPCC» (51) and «EcoAct 2020» (3).
- From 2025 to 2026, 169 values stayed and 80 changed; the DEFRA source changed edition, the others did not.
- 40 factors in 15 groups differ only by rate unit (the fuels of «Combustiones estacionarias» and «Combustiones móviles (flota propia)»). 63 factors per year have both dimension values.
- The seed writes `gasDetails: {}` for every factor: no seeded factor has a gas breakdown. Only factors an administrator broke down by hand have one.

**Rules that already exist.**

- `checkDuplicateEmissionFactor` keys on subcategory, year, the _required_ dimension values and the source. It ignores the rate unit and the optional dimensions. It compares sources in the application, after trimming, collapsing whitespace and lower-casing both sides (`normalizeSourceForComparison`, private to `emissionFactors/helpers.ts`).
- `EmissionFactorSourceSchema` (`packages/types`) stores the source trimmed with each whitespace run collapsed. The create and update requests, the maintainer form schema and the seed all use it. Letter case is stored as entered.
- The partial unique index `emission_factor_unique_subcategory_dims_source` covers `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source, year) WHERE status <> 'DELETED'`. PostgreSQL treats NULLs as distinct, so it only binds factors with both dimension values, and it compares `source` byte for byte. The status is `ACTIVE` or `DELETED`.
- `validateGasDetailsSum` requires a gas breakdown whose sum is above zero to match the value within `EMISSION_FACTOR_GAS_DETAILS_TOLERANCE`; it throws a 400 on the first mismatch.
- Deleting a subcategory, a category or a methodology soft-deletes their factors in the same transaction (`softDeleteSubcategoryDependents`). Removing a dimension value an ACTIVE factor uses is refused (`DimensionValueInUseError`). Deleting a whole dimension soft-deletes its factors when the dimension is required, and sets their reference to NULL when it is optional. Through the maintainer, an ACTIVE factor therefore never references deleted structure. The «visible factor» filter, written identically in the listing (`getAllEmissionFactors/service.ts`) and in methodology duplication (`cloneEmissionFactors`), only guards against data written outside it.
- Creating and updating a factor accept any number as its value. The column is `Decimal(28, 10)`; the listing returns the value as a string.

**Maintainer UI.**

- Number cells read and display numbers in the app locale (`APP_LOCALE`, decimal comma, dot as thousands separator) through `NumericInput` with `FACTOR_INPUT_DECIMAL_SCALE`, and display stored values with `formatter` without rounding (`maintainer-decimal-input`). The grid shows «1.000.000», not «1000000».
- `StylizedDataGrid` is the single source of the grid's Spanish texts (`docs/development/datagrid.md`); screens never instantiate `DataGrid` directly. `MaintainerDataGrid` adds row pinning for grids backed by `useFieldArray`.
- The grid's route (`routes/admin/emission-factors.tsx`) renders no `<Outlet>` and is guarded with `requireRole([SUPERADMIN])`. Edit mode lives in the non-persisted maintainer store. Other maintainer screens guard unsaved edits with the router's `useBlocker` and `enableBeforeUnload`.

**Platform.** PostgreSQL at READ COMMITTED. The global Prisma error handler answers P2002 with a 409 `DATABASE_UNIQUE_CONSTRAINT` and any driver-level failure (P2034 included) with a generic 500. There is no transaction-conflict code. The maintainer grid is MUI X DataGrid community edition: no row grouping, one column filter at a time.

## Goals / Non-Goals

**Goals:**

- Load a year from another year in one atomic operation, correcting values and sources while copying.
- See all factors of the year at once, filter by subcategory, and see at a glance what was edited.
- Never overwrite an existing factor and never change the source year.
- Apply the same rules on the page and on the server, and the same source comparison as the single-row duplicate check.
- Read and show numbers exactly as the maintainer grid does.
- Leave the contract open for the next needs (bulk source edits, pasting values, saved drafts) without redesigning the copy.

**Non-Goals:**

- Review steps, "mark as reviewed", or a second approver.
- Editing the gas breakdown on the copy page.
- Saving a copy in progress, or pasting or importing spreadsheets.
- Copying between methodology versions.
- A year filter on the maintainer grid.
- Changing the duplicate check's key or the unique index.

## Decisions

### D1. The copy page

A route of its own next to the grid: `/admin/emission-factors/copy`, as `routes/admin/emission-factors_.copy.tsx`, because the grid's route renders no `<Outlet>`. It has the grid's guard (`requireRole([SUPERADMIN])`); the endpoint also admits ADMIN, as every factor route does. It is reached from a «Copiar factores» button that the factor maintainer shows only in edit mode, disabled while a grid row is being edited, and it carries the methodology version being edited as a search parameter. Without edit mode on that version (a reload clears the store), the route returns to the grid. The page shows a skeleton of its layout while it reads the factors, through the maintainer's `useEmissionFactors(methodologyVersionId)` (`api/query/maintainer/useEmissionFactors.ts`), which returns every year.

```
┌ Copiar factores de un año        [Metodología v2 (borrador) ▾] [← Volver] ┐
│ Origen [2026 ▾]  →  Destino [2027 ▾]                   5 de 249 con cambios │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              [columnas] [filtros] [buscar] │
├──────────────┬──────────┬──────┬───────────┬───────────┬─────────────┬────────┬──┤
│ Sub-categoría│ Variable │Unidad│Fuente 2026│Fuente 2027│ Valor 2026  │V. 2027 │  │
├──────────────┼──────────┼──────┼───────────┼───────────┼─────────────┼────────┼──┤
│▌Electricidad │ Nacional │kg/kWh│ DEFRA 2026│[Red 2027 ]│0,177 (+17 %)│[0,207 ]│🗑│
│▌Procesos…    │ Cemento  │kg/ton│ IPCC      │[IPCC     ]│1.720 (÷1000)│[1,72  ]│🗑│
│ Combustiones │ Diésel   │kg/l  │ DEFRA 2026│ DEFRA 2027│ 2,51        │ 2,55   │🔒│
├─────────────────────────────────────────────────────────────────────────────┤
│ No se copian: 1 ya existe · 0 quitados │ De los que se copian: 2 con valor │
│ nuevo · 0 con fuente nueva · 1 alerta          [Copiar 248 factores a 2027] │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Methodology.** The header carries the maintainer's methodology selector, locked on the version being edited, as the maintainer's other screens do. Over the published version, the subtitle adds that the copy is live at once.
- **Years.** «Origen» offers the years with factors in the version. «Destino» offers the «Año» column's window minus the source year. The window (`YEAR_OPTIONS`) moves out of `useEmissionFactorColumns.tsx` into `screens/Maintainer/utils/emissionFactorYearOptions.ts`.
  - Changing «Origen» with edits asks for confirmation and discards them, because they belong to other factors.
  - Changing «Destino» keeps the edits and recomputes which rows already exist in the target year.
  - The default years are the latest source year and the next one; when the next one is outside the window, the target defaults to the newest window year other than the source. They are pinned on the first listing, so a listing read later with a newer year does not move them under the edits.
- **Table.** One `StylizedDataGrid`, re-enabling sorting, the column filter and the quick search, with no row selection. It sits in a bounded-height container (`70vh`), so it virtualizes and mounts only the rows in view, and it shows every row on one page by default: the page size is MUI X's documented "all results" value (`-1`, «Todos»), the one value the community edition accepts above its 100-row page cap (it forces pagination on). The pager stays visible with pages of 25, 50 and 100 as well, so the rows stay reachable if a release stops honouring `-1`; a screen test with more than 100 factors fails on that upgrade. Hiding the footer instead would leave every row past the 100th out of reach while still copying it. It is not `MaintainerDataGrid`: there is no `useFieldArray` and no editing row to pin. Columns: subcategory, both dimension values (headed by the dimension names when the subcategory filter names exactly one subcategory), rate unit, source and target source, source and target value. A changed target value shows its variation as a chip beside the source value («+17 %», or «÷1000» in warning colour), with a tooltip that explains it without repeating the values («El valor 2027 cambia +17 % respecto al de 2026.»). The chip shows at most four digits; the tooltip has the whole number. Rows are keyed by source factor id, so filtering, sorting or changing page cannot land an edit on another row or lose it. The subcategory is a column, not a group row, because the community edition has no grouping.
- **Numbers.** The target value cell is a `NumericInput` with `FACTOR_INPUT_DECIMAL_SCALE`, committed on blur, and every value on the page (source values, the target values of existing rows, chips and tooltips) is displayed with `formatter` in the app locale. Typing «1.000» therefore means one thousand, as it does in the grid. Edits hold a `number | null`, never text: an emptied cell is `null` and blocks (D4). A row counts as edited when its target value differs numerically from the source value, or its target source, normalized, differs from the stored source.
- **Sources.** The target source is a free-text autocomplete with the sources already in the version as suggestions. It is normalized as `EmissionFactorSourceSchema` stores it (trimmed, whitespace runs collapsed), so a stray space neither blanks a source nor becomes a second one.
- **Gas breakdown.** A row whose source factor has a gas breakdown summing above zero has its value locked, with a tooltip: change the value in the maintainer after copying, together with the breakdown. No seeded factor has one.
- **Marks.** A row whose target value differs gets a tinted background and a left bar; a changed source is marked in its own cell. A cell that blocks the copy shows its reason in a tooltip.
- **Rows already in the target year** are read-only and not copied (D5). A lock icon in the action column says so.
  - With one target factor on the row, its source and value show as text, so both years sit side by side.
  - With several target factors (alternative sources), none is taken as "the" copy. The source cell reads «2 fuentes en 2027» with each source and value in its tooltip, and the value cell stays empty. The planner's `indexYearCopyTargetRows` finds them, the same lookup that decides the outcome.
- **Leaving a factor out.** Each row has a delete icon that sends `exclude` for its factor (D3). The row stays, struck through, with its source and value as text and its edits kept. A circular-arrow icon in the primary colour brings it back.
- **Variation warnings.** A changed value more than `EMISSION_FACTOR_COPY_WARNING_PERCENT` (25) away from its source value, or `EMISSION_FACTOR_COPY_WARNING_RATIO` (10) times larger or smaller, shows a warning in its row and a count in the footer. Warnings never block. Both thresholds are app constants in `apps/web/src/config/constants.ts`.
- **Footer.** Two groups of counts: what is not copied (already in the target year, left out) and, among what is copied, the new values, new sources and warnings. The total is on the copy button only. The button is disabled while the planner reports violations (D4) and when nothing would be copied. Factors that would end duplicated are marked in their source cell and counted in a notice above the grid.
- **State** lives in a reducer keyed by source factor id, never by row index. The request is checked against the Zod contract before it is sent.
- **Leaving the page** with edits asks for confirmation through `useBlocker` with `enableBeforeUnload`. On success the page returns to the grid with a snackbar summary.

- _Alternative_: a dialog over the grid. Rejected: 249 editable rows do not fit.
- _Alternative_: a plain MUI `Table` with a group row per subcategory. Rejected: rendering every editable row blocks the page for seconds, and its own filters re-render the whole table. The grid virtualizes and brings its filters; losing the group rows is the trade-off.
- _Alternative_: a text input with its own comma-or-dot parser. Rejected: it reads «1.000» as 1 where the grid means 1000, and shows «1000000» where the grid shows «1.000.000». A unit error of ×1000 would only raise a warning that does not block.
- _Alternative_: label the action «Duplicar factores». Rejected: «Duplicar» already names the methodology duplication in the same maintainer, which copies a version, not a year.

### D2. Any methodology version in edit mode, the published one included

The page is offered wherever the factor grid writes. The API accepts every version that exists and is not `DELETED`, and refuses a missing or `DELETED` one with `METHODOLOGY_NOT_FOUND` (`methodologies/errors.ts`). The single-row endpoints take no version, only a subcategory, and refuse none: the copy, which names the version, is the first factor write that checks it.

It is safe over the published version for the same reason a grid edit is. The copy only creates factors: it never changes or deletes an existing one, so nothing a footprint depends on moves, and the usage guard applies to the copied factors as to any other. Footprints of other years are not affected, because capture filters factors by year. Footprints of the target year keep what they saved and are offered the new factors when they capture again. That is the point: an existing footprint stays bound to its version, so copying into the published version is the only way a footprint already in progress gets the new year.

- _Alternative_: only unpublished versions, with the yearly flow duplicate, copy, publish. Rejected: footprints already in progress would never get the year, and the grid already writes the published version factor by factor.

### D3. The contract is per factor

`packages/types/src/emissionFactors/duplicateEmissionFactorYear/`:

```ts
// request
{
  methodologyVersionId: string;
  sourceYear: number; // EMISSION_FACTOR_YEAR_MIN..MAX
  targetYear: number; // same bounds, refined !== sourceYear
  changes: Array<{
    // at most one entry per sourceFactorId; at most 2000 entries
    sourceFactorId: string;
    value?: number; // any number, as the create schema
    source?: string; // EmissionFactorSourceSchema
    gasDetails?: GasDetails; // accepted and validated; the page does not send it yet
    exclude?: true; // wins: the other fields of the entry are ignored
  }>;
}
// 200
{
  copiedCount: number;
  editedCount: number; // copied with a changed value, source or gas breakdown
  excludedCount: number;
  skipped: {
    existingCount: number;
  }
}
```

`skipped` stays an object so a future reason adds a field instead of changing the shape. The source has no length limit, as the column and the create schema have none.

A source applied in bulk, once the page offers it, becomes one `source` per factor. Changing a single factor's source, sending a breakdown, pasting values or loading a saved list of changes all fit this contract.

- _Alternative_: a source per subcategory in the request. Rejected: it hard-codes a grouping into the API that the next need would have to undo.

### D4. One planner, shared by the page and the API

`packages/utils/src/emissionFactorYearCopy.ts` exports pure functions over plain data (ids and values as strings, as the listing returns them):

```ts
planEmissionFactorYearCopy({ sourceFactors, targetFactors, changes }) => {
  rows: Array<{ sourceFactorId; outcome: "COPY" | "EXCLUDED" | "EXISTS_IN_TARGET"; result }>;
  violations: Array<{ sourceFactorId; reason:
    "DUPLICATE_TARGET_FACTOR" | "EMPTY_SOURCE" | "EMPTY_VALUE"
    | "UNKNOWN_SOURCE_FACTOR" | "DUPLICATE_CHANGE" }>;
}
// the API adds "GAS_DETAILS_MISMATCH" itself (D6)
emissionFactorRowKey(factor)      // D5
indexYearCopyTargetRows(targets)  // D1, D5
```

The page runs it on every edit for the blockers. The API runs it inside the transaction before writing, and stays authoritative. Values are compared as numbers.

| Reason                                | Page                 | API                                              |
| ------------------------------------- | -------------------- | ------------------------------------------------ |
| `DUPLICATE_TARGET_FACTOR` (D5)        | blocks               | 422                                              |
| `EMPTY_SOURCE`                        | blocks               | never: the contract refuses it first (400)       |
| `EMPTY_VALUE`                         | blocks an empty cell | never: the contract carries a number or no value |
| `UNKNOWN_SOURCE_FACTOR`               | cannot happen        | 422                                              |
| `DUPLICATE_CHANGE`                    | cannot happen        | 422                                              |
| `GAS_DETAILS_MISMATCH` (API-side, D6) | avoided by the lock  | 422                                              |

The variation warnings are web-only and stay out of the planner: they inform and never block. The gas breakdown check stays on the server, where its tolerance lives.

- _Alternative_: rules only in the API, with a dry-run endpoint for the page. Rejected: a round trip per edit and a second endpoint to maintain, for the result the shared planner gives locally.

### D5. A factor is "already there" only when the exact row matches

A source factor is `EXISTS_IN_TARGET`, skipped and counted in `existingCount`, in two cases:

- the target year has an ACTIVE, visible factor with the same subcategory, dimension values (NULL equal to NULL) and rate unit, whatever its value or source;
- the source factor has both dimension values and the target year has a factor with the same subcategory and both dimension values in any rate unit. The unique index leaves out the rate unit, so a copy with the same source would collide.

Both keys leave out the source: a copy never adds a second source to a row the target year holds. Alternatives with another source are added in the maintainer.

Everything else is copied. So the 40 rate-unit variants are all copied, the alternatives of one row (same subcategory, dimension values and rate unit, different sources) are copied each with its source, and a partially loaded target year gets completed.

Two copied factors may not end on the same row with the same source, sources compared with the shared key (D7). For factors with both dimension values, the index's key counts too, which leaves out the rate unit. The planner reports `DUPLICATE_TARGET_FACTOR` on each factor of such a group. The comparison is stricter than the index, which compares bytes: «DEFRA 2026» and «defra 2026» would pass the index and reach capture as two options the user cannot tell apart, as the single-row duplicate check already prevents. A copied factor cannot collide with a target factor, because the target's rows are skipped first.

`checkDuplicateEmissionFactor` is not used for the copy. It ignores the rate unit, so it would copy one factor per rate-unit group and silently drop 25 of the 40 variants. It stays the single-row check, unchanged.

### D6. What the copy reads and writes

```
$transaction:
  methodology version exists, not DELETED -> else 404
  findMany source-year factors   (visibility filter)
  findMany target-year factors   (visibility filter)
  planEmissionFactorYearCopy(...)
  + GAS_DETAILS_MISMATCH for each copied row whose breakdown sums above zero
    and does not match its value (same sum and tolerance as validateGasDetailsSum)
  any violation -> 422 EMISSION_FACTOR_YEAR_COPY_INVALID, details = all violations
  createMany(rows with outcome COPY)
return summary
```

- **Visibility filter.** One helper, `visibleEmissionFactorWhere`, in `apps/api/src/helpers/`: ACTIVE factor, and each dimension value NULL or ACTIVE under an ACTIVE dimension. The listing and `cloneEmissionFactors` replace their identical inline copies with it, and the copy uses it. It goes to the shared folder because two features use it, which the api-backend convention requires before promoting a helper. A hidden factor is neither copied nor reported.
  - _Alternative_: share it only between the listing and the copy, inside `emissionFactors/helpers.ts`. Rejected: methodology duplication would keep its own definition, and the day one of them changes, duplicating a version and copying a year would disagree on which factors exist.
- **Gas breakdown.** The sum and tolerance of `validateGasDetailsSum` are extracted as a non-throwing predicate that both use, so every mismatch is reported in the same 422 as the planner's violations instead of a 400 on the first one.
- **`createMany`** lists every column by hand, as `cloneEmissionFactors` does:
  - `subcategoryId`, both dimension value ids and `rateMeasurementUnitId` from the source factor;
  - `source` and `value` from the change or the source factor, and `gasDetails` from the change or the source factor's stored JSON (`?? Prisma.JsonNull`, as `cloneEmissionFactors` writes it);
  - `year: targetYear`, `status: ACTIVE`, `createdById: user.id` and `updatedAt: null`, as the single-row create and `cloneEmissionFactors` write it: the column is `@updatedAt`, and leaving it out would stamp every copied factor as edited at creation.

  A full year is about 250 rows, far below PostgreSQL's bind-parameter limit; Prisma splits larger inserts anyway.

- There is no explicit lock, no raw SQL and no manual batching. The transaction uses the default timeout, and a test copies the full testing catalogue.
- **Concurrency.** P2002 means a concurrent write created a factor of the same index key first. The service maps it to `409 EMISSION_FACTOR_YEAR_COPY_CONFLICT`, which the page explains as "retry": nothing was written, and a retry recomputes the plan. Other driver failures keep the global handler's answer, as for every other write. The transaction only reads and inserts at READ COMMITTED, so serialization failures do not occur, and adding a transaction-conflict code for this endpoint alone is not worth it. Two simultaneous copies into the same year can still both pass the reads and duplicate factors the index does not bind. Single-row creates have the same window, accepted in `add-emission-factor-year` (admin-only, rare, visible in the grid).
- **Errors.** The 422 carries `details: { violations }` through `attachDetails`. The page maps each reason to its row or group, for example when another admin changed the target year after the page loaded. They stand until the next edit, or until a listing read after the error differs; an identical listing keeps them, since a gas breakdown mismatch is only known to the API.

### D7. One definition of "the same source"

The duplicate check's private `normalizeSourceForComparison` moves to `packages/utils` as `emissionFactorSourceKey(source)`: trim, collapse each whitespace run to one space, lower-case. `checkDuplicateEmissionFactor` and the planner both import it. It lands as its own `refactor` commit, with the single-row tests unchanged and passing.

The stored form stays `EmissionFactorSourceSchema`'s (case kept). A unit test pins that the key of a source equals the key of its stored form, so the two cannot drift.

- _Alternative_: the planner keeps its own key. Rejected: two definitions of one rule, and a page that blocks what the API accepts, or the reverse, the day one changes.
- _Alternative_: move the key in the several-sources pull request, which introduced it. Rejected: there it has one consumer; it becomes shared with the copy, so the copy's pull request carries the move and its reason.

### D8. Help text through the seed

`emission-factors-maintainer.md` gains a «Copiar factores de un año» action under «Acciones disponibles»:

- its two uses: in the published version, live at once for the target year's footprints, or in a duplicated version published afterwards;
- what is copied, what is skipped, what blocks and what only warns;
- that the source year does not change.

The seed upserts standalone explanations by slug, so a new deployment gets the text. A deployment already in production does not re-run the seed; its administrator adds the section by hand in the explanations maintainer (`PATCH /api/admin/explanations/:slug`), with the text the pull request carries, as the several-sources change did.

### D9. Implementation guide and user manual

- `docs/country-implementation-guide/02-seed-content.md`, «Loading factors after launch», stops saying there is no "copy last year's factors" action: the yearly load becomes copy and correct, and the second-person check now reviews the edited rows and the warnings. The «about 280 rows» figure becomes the current 249.
- `user_manual/mantenedor_metodologia/` gains one or two slides in the factors section («Abrir un año nuevo: copiar factores») and a line in the checklist, with screenshots of the copy page. The chapter's PDF is exported again with the `user-manual:manual-slides` export. The same screenshots go into the pull request description.

### D10. `packages/utils` gets its first tests

The package already runs `vitest run --passWithNoTests` but has no test file. Today both its `build` and its `type-check` use `tsconfig.build.json`, which includes all of `src`. The change splits them: `tsconfig.build.json` excludes `*.test.ts`, so `dist` ships no tests, and `type-check` moves to `tsconfig.json`, so the tests are still type-checked.

No CI job runs these tests today: CI runs the API, web and seed suites only. A `Utils Unit Tests` job, a copy of `Seed Unit Tests` gated on the same `code` filter, runs them through turbo (`pnpm test:utils`), and it is marked as a required check on `main`. Without it, the planner's rules, the ones the page and the API share, would be tested only locally.

- _Alternative_: a step inside `Test (web)`, already required. Rejected: a planner failure would be reported under the web's name.
- _Alternative_: a job that is not required, as `Seed Unit Tests` is. Rejected: a broken shared rule could merge green.

## Risks / Trade-offs

- **[A copy into the published version is live at once]** A wrong value reaches the footprints of the target year as soon as it is copied. → The same exposure a grid edit has. The page states it under its title, a factor nobody uses yet can still be corrected in the grid, and the variation warnings flag likely unit errors before copying.
- **[Two places evaluate the rules]** The page and the API both run them. → They share the planner and the source key; the API recomputes inside the transaction and is authoritative.
- **[Large editable table]** About 250 rows with inputs on one page. → The bounded height lets the grid virtualize them, and an edit commits on blur.
- **[The all-rows page size could close]** The community edition caps a page at 100 rows; `-1` is documented as "all results" but sits next to that cap. → The pager stays visible as a fallback, and the screen test with more than 100 factors fails on an upgrade that closes it.
- **[One column filter at a time]** → The quick search combines with the column filter.
- **[A new source edition is typed row by row]** Moving «DEFRA 2026» to «DEFRA 2027» means editing about 195 rows. → Accepted for now; a bulk "replace source" is the first follow-up, and the contract already takes it.
- **[Precision]** Values travel as JSON numbers, as in the single-row create, into `Decimal(28, 10)`. `NumericInput` limits input to `FACTOR_INPUT_DECIMAL_SCALE` decimals. → Same behaviour as the grid.
- **[Concurrent copies duplicate factors outside the index]** → Accepted. Admin-only and rare.
- **[A value of 0 is copied]** The copy accepts any number, as the single-row API does, although the maintainer form refuses 0. → The base seed has real zero factors (walking and cycling commutes, two fertilizer components) that a yearly copy must carry; a value changed to 0 shows a «−100 %» warning.
- **[Rows with a gas breakdown cannot change value on the page]** → Change them in the maintainer after copying. No seeded factor has a breakdown, so this only touches factors broken down by hand.
- **[A target row with another source blocks the copied alternative]** → Intended: the copy completes a year and never adds alternatives.
- **[Exact-row matching lets the target hold rows the single-row create refuses]** → Intended. It is the seed's shape (rate-unit variants), and that single-row limitation already exists.

## Migration Plan

- No schema change and no migration.
- New deployments get the help text through the seed; deployments in production add it by hand (D8).
- Rollback: revert the pull request. Copied factors are ordinary rows.

## Open Questions

1. Copying into a year that already has some factors is allowed: it fills what is missing and never overwrites. Confirm with the deployments' methodology teams.
2. The warning thresholds (25 % and a 10× jump) are assumed. They are constants and easy to change.

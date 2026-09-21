## 1. Pre-conditions

- [ ] 1.1 **Not met yet** — PR 652 is open, not merged; this branch is stacked on it. This change depends on PR 652 (`feat/mati/add-emission-factor-year`) being merged. Nothing here needs the `year` column, but the branch is cut from it and the maintainer files diverge heavily.
- [x] 1.2 Rename the branch to `feat/mati/guard-emission-factor-edits-by-usage`. The openspec directory is already renamed; the worktree path is deliberately left as it is.
- [x] 1.3 Run `pnpm install` before any format / lint / type-check.

## 2. Companion work outside this change

These land in their own places and are not part of this change's diff. They are listed here so the change is not reviewed as if it stood alone.

- [x] 2.1 **In PR 652**, fix the source lock ignoring the year: `useEmissionFactorColumns.tsx:553` filters `otherRowsWithSameSubcategory` by subcategory alone, and `EmissionFactorSourceCell.tsx:52-65` then writes the locked source into the form, so adding a 2026 row to a subcategory holding 2025 factors silently overwrites the source that was typed. `validateSourceConsistency` is keyed on `(subcategory, year)`, so the server would have accepted it. Add the year to the filter, with a test.
- [x] 2.2 **In PR 652**, rewrite Decision 9 so it no longer says _"An administrator may move a factor's year while lines point at it. Nothing prevents that, deliberately"_. Write it as a forward reference: no guard ships in that change, one is introduced in `guard-emission-factor-edits-by-usage`. Do not assert the guard exists — at the moment 652 merges, it does not.
- [x] 2.3 **In PR 652**, carry that rewrite into the three places that depend on it: the list of cases Decision 7 says the sync reconciliation absorbs (the administrator moving a factor's year is no longer one of them for active lines), the last bullet of the Risks list, and the out-of-scope bullet at `proposal.md:57` that rejects an immutability guard outright.
- [x] 2.4 Comment on issue 651 (the 2026 factor set): the loader must validate through the API's rules rather than the database index, because `createMany({ skipDuplicates: true })` respects only the partial unique index — which includes `source` — while `checkDuplicateEmissionFactor` ignores `source` and `validateSourceConsistency` allows one source per `(subcategory, year)`. A hand-added 2026 row with a different source is a different tuple, so it is not skipped, and two active factors for the same `(subcategory, year)` result. Also note the loader cannot hang off the normal seed entry: `tools/seed/src/seed.ts:40-46` skips the entire run once `country` has rows, so `seedEmissionFactors`'s global count assertion is unreachable on any already-seeded database and cannot be relied on either way.

## 3. Database

- [x] 3.1 Add an index on `CarbonInventoryLineFactor.emissionFactorId` in `packages/database/src/prisma/schema.prisma`. Today the model carries only `@@unique([lineInputId])`, and Postgres does not index foreign keys on its own.
- [x] 3.2 Write the migration. Plain `CREATE INDEX`, not `CONCURRENTLY`: Prisma runs a migration inside a transaction and the table is small today. No data is touched.
- [x] 3.3 Comment the index with what needs it — a filtered relation count per row in the maintainer listing, and a lookup per guarded update or delete — and that the table grows with every line save because line inputs are versioned.

## 4. Types

- [x] 4.1 Add `referencedLineCount` (required, non-negative int) to the row shape of `GetAllEmissionFactorsResponseSchema` in `packages/types`.
- [x] 4.2 Do **not** add it to `CreateEmissionFactorResponseSchema` or `UpdateEmissionFactorResponseSchema`. A freshly created factor is unreferenced by construction, and an update only succeeds while it is unreferenced, so in both responses the value is known to be zero and carrying it invites it being read as live.
- [x] 4.3 Do **not** add it to `GetCarbonInventoryMethodologyResponse` or to the verifier's `GetEmissionFactorsResponse`. Neither has a reason to know, and both are on hot read paths.

## 5. API — the usage rule

- [x] 5.1 In `apps/api/src/features/emissionFactors/errors.ts`, add `EmissionFactorInUseError` as `EMISSION_FACTOR_IN_USE`, 409, with the line count in the message.
- [x] 5.2 In `apps/api/src/features/emissionFactors/helpers.ts`, add `countActiveLineReferences(tx, emissionFactorId)` over a shared `activeLineReferenceWhere`: rows of `carbonInventoryLineFactor` whose `emissionFactorId` matches, whose `lineInput.isActive` is true, whose line is `ACTIVE` or `OUTDATED`, and whose footprint is `ACTIVE`. Keep `OUTDATED` — a parked line keeps its snapshot and is reactivated without passing through `sync`, so excluding it would let an edited factor return through the back door. Exclude `DELETED` lines and deleted footprints — both deletions are soft and leave the input and its snapshot in place, and neither is reversible, so counting them would lock the factor against a line nobody can reach.
- [x] 5.2b Export that predicate rather than restating it at each site. The grid decides whether to offer an edit and the API decides whether to refuse one; if the two drift, the maintainer locks rows the API would accept or offers edits that come back a 409.
- [x] 5.3 Document on that helper why superseded inputs are excluded: every reader in the application filters `isActive: true`, so those snapshots are audit trail nothing consults, and counting them under a hard 409 would freeze a factor permanently on the strength of a row nothing reads.
- [x] 5.4 Add a TODO on the same helper recording the deferred softer rule: the same count, surfaced as a warning that informs without blocking, is what `add-emission-factor-year` Decision 9 deferred. Lifting the block to a warning is a UI change plus deleting the guard — no contract change, since the count already ships.
- [x] 5.5 In `updateEmissionFactor/service.ts`, call the helper inside the existing transaction, before any validation or write, and throw `EmissionFactorInUseError` when the count is non-zero. An early return, not a conditional around the update.
- [x] 5.6 In `deleteEmissionFactor/service.ts`, the same guard, before the soft delete.
- [x] 5.7 Add a TODO at the guard in `updateEmissionFactor` recording the accepted race: a `sync` can attach a line between the check and the write, both at `READ COMMITTED`, and closing it means a `SELECT … FOR UPDATE` on the factor row taken by both paths — one statement, costs the same later.
- [x] 5.8 Leave `createEmissionFactor` untouched. Nothing can reference a factor that does not exist; this is what makes adding to the live catalogue fall out of the rule instead of needing an exception.
- [x] 5.9 Declare `409` on `deleteEmissionFactor`'s route, as `updateEmissionFactor` already does. Fastify serializes an undeclared status without a schema, so the guard works and the integration test passes either way — what is wrong without it is the generated contract, which describes one of the two endpoints enforcing the rule as never refusing.

## 6. API — the listing

- [x] 6.1 In `getAllEmissionFactors/service.ts`, add a filtered relation count for `lineFactors` using the shared `activeLineReferenceWhere`. Prisma 7.9.1 supports filtered relation counts with no preview flag, so this stays one query.
- [x] 6.2 Map it to `referencedLineCount` in the response.
- [x] 6.3 **Measured, and the original claim was imprecise.** The emitted SQL shows Prisma compiling the filtered count into the main `SELECT` as one uncorrelated `LEFT JOIN (SELECT emission_factor_id, COUNT(*) … GROUP BY emission_factor_id)`, so the count costs **zero additional queries**. The listing was never a _single_ round trip, though: the `include` of subcategory, rate unit and both dimension values loads each with its own `SELECT … WHERE id IN (…)`, five statements in total, exactly as before this change. Two consequences recorded: the count adds no round trip, and the index from section 3 is not what makes the listing cheap — the derived table has no predicate on `emission_factor_id`, so it passes over the table whatever indexes exist. The index earns its keep on the guard's point lookup. The comment on `@@index([emissionFactorId])` was corrected to say so.

## 7. Web — opening the screen

- [x] 7.1 In `useMethodologyColumns.tsx:211`, drop `isPublished` from `editDisabled`, leaving `actionsLocked`. The published version can now be entered.
- [x] 7.2 Rewrite `METHODOLOGY_ACTION_TOOLTIPS.editActive` in `Maintainer/constants.ts`. It currently reads "No se puede ajustar la metodología activa", which becomes false. If entering is never blocked for a published version, remove the tooltip rather than leaving a message that never shows.
- [x] 7.3 In `useMaintainerMethodologyScope.tsx`, add a derived permission for the emission-factor screen and leave `isViewOnly` exactly as it is, `|| PUBLISHED` included. Categories, Subcategories and Dimensions read the same hook and must keep behaving as today — they have no dependency rule behind them, and a subcategory delete cascades to its factors.
- [x] 7.4 In `MaintainerScreenLayout.tsx`, take that permission as a prop and use it at all five sites that read `isViewOnly` today: `onAddRow` (line 89), the subtitle (88), the `EditModeToolbar` render (103) and its bottom padding (97). Wire it from the emission-factor screen only, so the other three screens keep the current behaviour without a flag.
- [x] 7.5 Adjust the `EditModeToolbar` label and the exit dialog copy for the published version. The toolbar says "Editando: {nombre}" and the dialog in `MethodologiesMaintainerScreen` promises "Podrás volver a ajustarla desde esta pantalla cuando quieras" — check both read correctly when the methodology being edited is the live one.
- [x] 7.6 Send `handleEdit` to `ADMIN_EMISSION_FACTORS` when the version being entered is `PUBLISHED`. Entering is now possible but Categorías, Sub-categorías and Dimensiones stay read-only over the live version, so the old target puts the maintainer in edit mode on the screens where nothing can be done. `handleView` keeps Categorías: browsing a version should start there.

## 8. Web — the per-row rule

- [x] 8.1 In `EmissionFactorsMaintainerScreen.tsx`, compute `canEditRow(rowId)` once: false when the screen is read-only; otherwise true for a row not yet saved, and for a saved row when its `referencedLineCount` is zero.
- [x] 8.2 Replace the `viewOnly` parameter of `useEmissionFactorColumns` with that callback and substitute it in the eight cells that read `viewOnly` today (subcategory, both dimensions, value, unit, gas breakdown, source, year). Each already resolves its row through `getFormRow(params.row.id)`, so the change is mechanical.
- [x] 8.3 Render the actions column whenever the screen can write at all — `useEmissionFactorColumns.tsx:617` appends it only when `!viewOnly`, so without this the row being added has no save and no cancel — and gate its buttons per row.
- [x] 8.4 Move the `GEIBreakdownModal`'s `readOnly` from `scope.isViewOnly` (`:577`) to the row the modal is open on.
- [x] 8.5 Add the tooltip for a row in use, naming the count: _"Usado por N líneas"_. It is the whole reason the count is exposed.
- [x] 8.6 Close the three write paths with early returns rather than UI-only gating: the `updateMutation` branch of `handleStopEditRow` (`:284`), `handleSaveGEIBreakdown`'s `updateMutation` for existing rows (`:468`), and `handleDelete` (`:405`). The server backstops them, so these assert the screen's own rule.
- [x] 8.7 Add the `EMISSION_FACTOR_IN_USE` message to `ERROR_MESSAGES` in `apps/web/src/utils/getApiErrorMessage.ts`, in Spanish, so a 409 lost to a stale count reads as an explanation rather than a generic failure.
- [x] 8.8 Condition the `handleStopEditRow` check on `hasRealChanges`. A row can become locked while it is open — saving the GEI breakdown invalidates the listing without closing the row — and an unconditional refusal then refuses to close a row nobody edited. Because `handleStartEditRow` bails when stop-edit returns false, that also blocks every other row, leaving Cancelar (which discards the edit) as the only way out.

## 9. Tests — API

- [x] 9.1 Update an unreferenced factor → 200, and the row changes.
- [x] 9.2 Update a factor referenced by an active line input → 409 `EMISSION_FACTOR_IN_USE`, and the stored row is byte-for-byte unchanged.
- [x] 9.3 Update with only `gasDetails` on a referenced factor → 409. This is the path the GEI modal takes, and it is the one most likely to be forgotten.
- [x] 9.4 Delete a referenced factor → 409, and its status stays `ACTIVE`.
- [x] 9.5 **Update a factor whose only reference lives in a superseded input → 200.** This is the test that anchors Decision 2; without it, `isActive` is the first thing a refactor drops.
- [x] 9.6 Update a factor referenced by an `OUTDATED` line whose input is active → 409.
- [x] 9.7 Create a factor for a subcategory of the published methodology version → 201. The guard must not have leaked into the create path.
- [x] 9.8 The listing returns `referencedLineCount` matching the live references, including zero for an untouched factor, and ignoring the same dead references the guard ignores.
- [x] 9.9 **Update a factor whose only reference is on a `DELETED` line → 200.** Deleting a line is soft and no path returns one to `ACTIVE`, so counting it would lock the factor forever.
- [x] 9.10 **Update a factor whose only reference is under a `DELETED` footprint → 200.** Same reasoning one level up; deleting a footprint touches only its own status.

## 10. Tests — web

The rule was extracted to `utils/emissionFactorRowLock.ts` and tested there rather than through a rendered grid: it is where the logic lives, and rendering the screen would have tested the DataGrid instead. `resolveEmissionFactorRowLock(canEditScreen, referencedLineCount)`.

- [x] 10.1 A count above zero locks the row, and no count at all (a row the listing does not know) leaves it editable.
- [x] 10.2 A read-only screen locks every row and gives no reason — the subtitle already says why, and a tooltip on every cell would be noise.
- [x] 10.3 The reason names the count, singular and plural.

## 11. Closing

- [x] 11.1 `pnpm format && pnpm lint && pnpm type-check`, then the API suite for `emissionFactors` and `pnpm test:web`.
- [x] 11.2 Review `tools/seed/src/data/base/explanations/standalone/emission-factors-maintainer.md`: it is user-facing, rendered in the (i) icon, and it describes a screen that could not touch the active methodology.
- [x] 11.3 Confirm PR 652's amendment (tasks 2.2 and 2.3) landed. Once that change archives, its design is the account of record for a posture this change reverses.

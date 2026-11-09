# Several emission-factor sources per subcategory and year (`feat/mati/multiple-emission-factor-sources`, base `main`)

## 0. Setup

- [ ] 0.1 Branch `feat/mati/multiple-emission-factor-sources` from the current `origin/main`.
- [ ] 0.2 Apply the reference implementation's patch, without its `openspec/` files, with `git apply --3way`. It applied cleanly on `818a06a1`. Commit nothing yet: the sections below review each area and split it into its own commit (7.3).

## 1. Types: source normalization (D4)

- [ ] 1.1 Add `EmissionFactorSourceSchema` to `packages/types/src/baseSchemas/emissionFactor.ts`: trim, collapse each whitespace run to one space, keep the type a string, then `min(1, "Fuente es requerida")`. Export it. Its comment explains the whitespace and names no database.
- [ ] 1.2 Use it for `source` in `CreateEmissionFactorRequestSchema` and `UpdateEmissionFactorRequestSchema`. Leave `EmissionFactorFormSchema` as is.
- [ ] 1.3 Check that the base and testing seed `methodologies.json` sources have no leading, trailing or repeated whitespace, and no two sources that differ only in letter case. Report any hit, and do not rewrite seed data in this change.

## 2. API

- [ ] 2.1 Delete `validateSourceConsistency` from `apps/api/src/features/emissionFactors/helpers.ts`, with its import and call in the create and update services. Delete `EmissionFactorSourceConflictError` from `errors.ts`.
- [ ] 2.2 Add a `source` parameter to `checkDuplicateEmissionFactor` (D2, D3). Leave the source out of the `where`: select `source` from the active factors of the key without it, and refuse when one matches the incoming source after trimming, collapsing whitespace and lower-casing both sides. Rewrite its doc comment: the key, the comparison and why it runs in the application (PostgreSQL compares `text` exactly; `mode: "insensitive"` compiles to `ILIKE`). No mention of SQL Server.
- [ ] 2.3 Create service: pass `data.source`.
- [ ] 2.4 Update service: pass the effective source, and run the check when the source changes too. Update the comment above the detach block that cites `validateSourceConsistency`, and the one in `apps/api/test/features/emissionFactors/emissionFactorUsageGuard/integration.test.ts` ("detaches them when the source is renamed"): a factor's source can now be renamed unless the new name collides with the same key.
- [ ] 2.5 Update the `EmissionFactorDuplicateError` message to name the required dimension values, the year and the source.
- [ ] 2.6 Fix the stale comment in `apps/api/test/features/methodologies/duplicateMethodology/integration.test.ts` ("trigger enforces single source per subcategory").

## 3. API tests

- [ ] 3.1 `createEmissionFactor/integration.test.ts`:
  - turn "409 for a different source in the same subcategory and year" into a success for the same activity with another source;
  - add a success for different activities with different sources;
  - keep the existing same-key, same-source duplicate tests as they are;
  - add a duplicate for a source differing only in letter case (`"defra 2025"` against `"DEFRA 2025"`);
  - add a duplicate for a stored source that differs only in whitespace (insert it through Prisma, since the API now normalizes);
  - add a success for `"IPCC_2006"` next to `"IPCC-2006"` on the same key, which pins down that the comparison is not a pattern match.
- [ ] 3.2 Create: the source is stored normalized (`"  DEFRA   2025 "` → `"DEFRA 2025"`), and a whitespace-only source answers 400 with nothing written.
- [ ] 3.3 `updateEmissionFactor/integration.test.ts`: turn both `EMISSION_FACTOR_SOURCE_CONFLICT` cases around:
  - a source-only change to another source in the subcategory becomes a success;
  - a year-only move into a year whose factor has another source becomes a success.

  Then add:
  - a source-only change onto an existing key and source, answered as a duplicate;
  - the same with the source differing only in letter case;
  - an update that stores the normalized source;
  - an update with a whitespace-only source, answered with 400 and nothing changed.

- [ ] 3.4 Run `pnpm test:api -- /emissionFactors --coverage=false` (after the `test-check` skill). Check that no ported test depends on SQL Server behaviour (collation, error text, SQL).

## 4. Maintainer (D6)

- [ ] 4.1 Delete `apps/web/src/screens/Maintainer/utils/emissionFactorSourceLock.ts` and its test.
- [ ] 4.2 `EmissionFactorSourceCell.tsx`: remove `isSourceLocked`, `lockedSource`, the write-back effect, the snackbar, both lock renders and the imports they used. Keep the free-text autocomplete with its error.
- [ ] 4.3 `useEmissionFactorColumns.tsx`: remove `resolveLockedSource`, the `getPersistedRows` parameter and its doc comment, and the lock props on the source cell.
- [ ] 4.4 `EmissionFactorsMaintainerScreen.tsx`: remove `persistedEmissionFactors`, `getPersistedEmissionFactors` and the `getPersistedRows` argument, if nothing else reads them.
- [ ] 4.5 Manual check in the maintainer on the local stack, for a subcategory and year that already hold factors with one source:
  - add a row with another source;
  - move an existing row's year into that group;
  - check that the typed source stays, with no lock icon and no replacement snackbar;
  - check that saving succeeds, and that the same key with the source in other letter case is refused with the duplicate message.

## 5. Capture (D5)

- [ ] 5.1 Add `resolveFactorSource` to `EmissionEditor/services/emissionFactorService.ts`. It takes the catalogue sources offered to a line and the line's current source, and returns the action from the table in design D5 (select a source, clear, or nothing).
- [ ] 5.2 Unit tests in `emissionFactorService.test.ts`, one per row of the D5 table, plus a single offered source that differs from the line's current one, and no source offered with none held (nothing).
- [ ] 5.3 `useEmissionEditorForm.ts`: `tryToLoadDetermineFactorPlatform` uses the helper and maps its actions to `handleFactorSourceChange` and `resetFactorRelatedFields`. Remove `determineAutoLoadFactorSource` if nothing else uses it. Own-factor lines and lines missing a required field keep returning early.
- [ ] 5.4 Manual check on the local stack with two sources for one activity (two factors loaded in the maintainer on a test year):
  - a new line selects nothing and stays incomplete;
  - choosing a source loads its factor;
  - changing the unit keeps the source and reloads its factor;
  - with a single source, the source is selected automatically.

## 6. Web messages and help text

- [ ] 6.1 `getApiErrorMessage.ts` and its test: remove `EMISSION_FACTOR_SOURCE_CONFLICT`. Set `EMISSION_FACTOR_DUPLICATE` to «Ya existe un factor de emisión con la misma sub-categoría, variables, fuente y año.»
- [ ] 6.2 `tools/seed/src/data/base/explanations/standalone/emission-factors-maintainer.md`: rewrite the «Fuente» row (design D8). Check that no other text in that file, `dimensions-maintainer.md` or `docs/` states the one-source rule (`rg -n -i "misma fuente|compartir la fuente|compartir la Fuente|one source|single source"`).
- [ ] 6.3 Run `pnpm test:web` (after the `test-check` skill).

## 7. Finish

- [ ] 7.1 Check that `rg -n "validateSourceConsistency|SOURCE_CONFLICT|SourceConflict|SQL Server|collation" apps packages tools` returns nothing related to this change.
- [ ] 7.2 `pnpm format && pnpm lint && pnpm type-check`, with no warnings.
- [ ] 7.3 Small Conventional Commits, one per area: openspec change, types, api (with its tests), web maintainer, web capture, seed help and web messages. No tracker references.
- [ ] 7.4 Pull request against `main`, title and description in English. The description states cases A and B, the methodology costs (proposal), that a deployment keeping one source loads one source, the case-insensitive duplicate check and why it runs in the application, no migration, and the archive order after `add-emission-factor-year` (design D9).

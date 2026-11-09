## 1. Branch and preconditions

- [x] 1.1 Base this branch on `main` with the several-sources change and the maintainer decimal comma (`NumericInput` in `EditableNumberCell`, `FACTOR_INPUT_DECIMAL_SCALE`, the Spanish texts in `StylizedDataGrid`).
- [x] 1.2 Check what `getApiErrorMessage.ts` maps: `METHODOLOGY_NOT_FOUND` has no message today (task 7.8).
- [x] 1.3 Set up tests in `packages/utils` (design D10): `tsconfig.build.json` excludes `*.test.ts`, `type-check` moves to `tsconfig.json` so it still covers them, and a root `test:utils` script runs them through turbo. Confirm `apps/api` and `apps/web` resolve a new export after the build.
- [x] 1.4 Add the `Utils Unit Tests` job to `.github/workflows/ci.yml`, a copy of `seed-test` running `pnpm test:utils`, gated on the `code` filter. After the PR's first run, mark it as a required check in the protection of `main` (repository admin).

## 2. Shared source comparison

- [x] 2.1 Move `normalizeSourceForComparison` out of `apps/api/src/features/emissionFactors/helpers.ts` into `packages/utils` as `emissionFactorSourceKey` (design D7), export it, and import it in `checkDuplicateEmissionFactor`.
- [x] 2.2 Unit-test it: case, inner and outer whitespace, and that the key of a source equals the key of `EmissionFactorSourceSchema.parse` of it.
- [x] 2.3 Run the create and update factor integration tests unchanged (after `test-check`). Commit as its own `refactor`.

## 3. Types

- [x] 3.1 Add `packages/types/src/emissionFactors/duplicateEmissionFactorYear/` (`schemas.ts`, `types.ts`) per design D3:
  - the request, with years bounded and refined so they differ, and `changes[]` (at most 2000 entries) with the optional `value` (any number, as the create schema), `source` (`EmissionFactorSourceSchema`), `gasDetails` (the create schema's gas details) and `exclude`;
  - the 200 response (`copiedCount`, `editedCount`, `excludedCount`, `skipped.existingCount`).

  Export both from `emissionFactors/index.ts`.

- [x] 3.2 Add the violation reason enum (`DUPLICATE_TARGET_FACTOR`, `EMPTY_SOURCE`, `EMPTY_VALUE`, `GAS_DETAILS_MISMATCH`, `UNKNOWN_SOURCE_FACTOR`, `DUPLICATE_CHANGE`) and the details shape the 422 carries. Every reason carries `sourceFactorId`. Document on the enum which reasons are page-only and which is API-only, as the table in design D4 shows.

## 4. Shared planner

- [x] 4.1 Add `packages/utils/src/emissionFactorYearCopy.ts` with `emissionFactorRowKey`, `indexYearCopyTargetRows` and `planEmissionFactorYearCopy`, over plain data with ids and values as strings (design D4, D5). Sources compare through `emissionFactorSourceKey`; a changed source is normalized as `EmissionFactorSourceSchema` stores it. Export it from `packages/utils/src/index.ts`.
- [x] 4.2 Add `emissionFactorYearCopy.test.ts`, covering:
  - exact-row matching with NULL dimensions;
  - the three Biodiésel rate units;
  - the both-dimension index case;
  - exclusion, including an excluded change whose other fields are ignored;
  - a change to a skipped factor being ignored;
  - a second source in a subcategory accepted, the alternatives of one row copied, a target row with another source skipped, and two copied factors ending with one source (case and spaces aside), also on the both-dimension key, reported on each;
  - an empty source and an empty value;
  - a negative value accepted;
  - a value written differently but numerically equal (`"0.177"` against `0.1770`) not counted as edited;
  - a change with only a different gas breakdown counted as edited;
  - unknown and duplicate changes.

## 5. API

- [x] 5.1 Add `EmissionFactorYearCopyInvalidError` (422, with `details: { violations }` through `attachDetails`) and `EmissionFactorYearCopyConflictError` (409, retryable) to `emissionFactors/errors.ts`.
- [x] 5.2 Add `visibleEmissionFactorWhere` to `apps/api/src/helpers/` and replace the identical inline filters of `getAllEmissionFactors` and `cloneEmissionFactors` with it (design D6). Behaviour must stay the same; the existing listing and methodology duplication tests prove it. Commit as its own `refactor`.
- [x] 5.3 Extract the sum and tolerance of `validateGasDetailsSum` into a non-throwing predicate that `validateGasDetailsSum` itself uses.
- [x] 5.4 Add `duplicateEmissionFactorYear/service.ts` per design D6. It runs in one `$transaction`:
  - check the version: 404 when it is missing or DELETED; a published version is accepted (design D2);
  - read both years with the visibility filter;
  - map them to the planner's input and run `planEmissionFactorYearCopy`;
  - add a `GAS_DETAILS_MISMATCH` violation for each copied row whose breakdown sums above zero and does not match its value;
  - if there is any violation, answer one 422 with all of them in its details;
  - `createMany` with every column listed by hand (`gasDetails` from the change or the source factor's stored JSON, `?? Prisma.JsonNull`; `updatedAt: null`);
  - map P2002 to `EmissionFactorYearCopyConflictError` through a small function in `helpers.ts`; leave other errors to the global handler.

  No explicit lock, no raw SQL.

- [x] 5.5 Add `route.ts` (`POST /duplicate-year`, 200/400/404/409/422) and `handler.ts` answering 200. Register the route in `apps/api/src/routes/api/emission-factors/index.ts`.

## 6. API tests

- [x] 6.1 Add `apps/api/test/features/emissionFactors/duplicateEmissionFactorYear/integration.test.ts`, covering the API scenarios of the spec:
  - authorization;
  - validation (including a blank source), the unknown and the deleted version;
  - a copy into the published version;
  - a second source in a subcategory, stored normalized;
  - the alternatives of one row copied, and two that end with one source refused with 422;
  - field-by-field equality, gas breakdown included;
  - a change of value and source;
  - the source year, other versions and other years untouched;
  - exclusion;
  - the exact-row skip, the three rate units, the partial target and the both-dimension case;
  - each API 422 reason, with nothing written, and several violations reported together;
  - a negative value accepted;
  - a deleted subcategory not copied;
  - an ACTIVE factor referencing a deleted dimension value, set up directly with Prisma, not copied;
  - the repeated copy and the empty source year;
  - a copied factor edited and deleted;
  - a source factor locked by the usage guard still copied, and its copy editable;
  - the full testing catalogue in one call.
- [x] 6.2 Unit-test the P2002 → `EMISSION_FACTOR_YEAR_COPY_CONFLICT` mapping function. A real collision needs a concurrent write and would make the test flaky.
- [x] 6.3 Add the route to `apps/api/test/features/emissionFactors/authorization/integration.test.ts`.
- [x] 6.4 Run `test-check`, then `pnpm test:api -- /emissionFactors --coverage=false` and `pnpm test:api -- /methodologies --coverage=false`.

## 7. Web

- [x] 7.1 Move the «Año» window (`YEAR_OPTIONS`) out of `useEmissionFactorColumns.tsx` into `screens/Maintainer/utils/emissionFactorYearOptions.ts`, used by the column and the copy page, with a unit test.
- [x] 7.2 Add `EMISSION_FACTOR_COPY_WARNING_PERCENT = 25` and `EMISSION_FACTOR_COPY_WARNING_RATIO = 10` to `apps/web/src/config/constants.ts`, and a pure `getCopyValueWarning(sourceValue, targetValue)` util with a unit test.
- [x] 7.3 Add `useDuplicateEmissionFactorYear` to `apps/web/src/api/query/maintainer/useEmissionFactors.ts`. It posts to `emission-factors/duplicate-year` and invalidates `MaintainerQueryKey.EmissionFactorsUpdateDependency`.
- [x] 7.4 Add the route `/admin/emission-factors/copy` as `routes/admin/emission-factors_.copy.tsx` (plus `routes.const.ts` and the generated route tree), with `requireRole([SUPERADMIN])` and the methodology version as a search parameter. It returns to the grid when that version is not the one in edit mode.
- [x] 7.5 Add `screens/Maintainer/screens/EmissionFactorYearCopyScreen.tsx` and its components under `screens/Maintainer/components/emissionFactorYearCopy/` (one component per file), per design D1:
  - the header with the locked methodology selector and, over the published version, the "live at once" note;
  - the year selects: changing «Origen» with edits asks and discards, changing «Destino» keeps the edits and recomputes the rows already in the target;
  - a `StylizedDataGrid` with sorting, column filter and quick search re-enabled, no row selection, and a subcategory column;
  - the target source as a free-text autocomplete with the version's sources as suggestions;
  - the target value as a `NumericInput` with `FACTOR_INPUT_DECIMAL_SCALE`, committed on blur, and every value shown with `formatter`;
  - tinted edited rows, marked changed sources, read-only rows already in the target (one or several target factors), and struck-through excluded rows with their restore icon;
  - the value lock for rows with a gas breakdown summing above zero;
  - duplicated factors marked in their source cell and counted in a notice above the grid;
  - the footer counts and the copy button, disabled on violations and when nothing would be copied;
  - a skeleton while the factors load.

  State lives in a reducer keyed by source factor id, and the blockers come from `planEmissionFactorYearCopy`.

- [x] 7.6 Guard unsent edits with `useBlocker` and `enableBeforeUnload`. On success, return to the grid with a snackbar summary. On 409 or 422, keep the edits, show the message, and map 422 details to their rows or groups.
- [x] 7.7 Add the «Copiar factores» button to `EmissionFactorsMaintainerScreen.tsx` (through `MaintainerScreenLayout` if it owns the toolbar). It is shown only in edit mode, disabled while a grid row is being edited, and links to the copy page.
- [x] 7.8 Add Spanish messages to `getApiErrorMessage.ts`, with cases in its test, for `EMISSION_FACTOR_YEAR_COPY_INVALID`, `EMISSION_FACTOR_YEAR_COPY_CONFLICT` and `METHODOLOGY_NOT_FOUND` (the version deleted by another admin while copying).
- [x] 7.9 Add component tests for the copy screen:
  - filtering the subcategory column, with its dimension names as headers, and the quick search;
  - typing «1.000» posts 1000 and typing «0,207» posts 0.207; a stored 1000000 shows «1.000.000»;
  - an emptied value blocks;
  - a changed value tints its row;
  - a ÷1000 change warns and does not block;
  - a second source in a subcategory is copied, and two alternatives of one row that end with one source disable the button and mark both cells;
  - an existing target row is read-only;
  - changing «Origen» with edits asks and discards, and changing «Destino» keeps them;
  - the button is disabled when nothing would be copied;
  - a 409 keeps the edits;
  - the published version is offered and says the copy is live at once.

## 8. Help text and docs

- [x] 8.1 Add the «Copiar factores de un año» action to `tools/seed/src/data/base/explanations/standalone/emission-factors-maintainer.md` (design D8). The testing seed has no help texts.
- [x] 8.2 Update «Loading factors after launch» in `docs/country-implementation-guide/02-seed-content.md` (design D9).
- [ ] 8.3 Add the copy to `user_manual/mantenedor_metodologia/` with the `user-manual:manual-slides` skill: one or two slides in the factors section, a checklist line, annotated screenshots of the copy page from a local stack, and the PDF exported again.

## 9. Verification and PR

- [ ] 9.1 Manual check on a local stack seeded with the base catalogue, in a duplicated, unpublished methodology version, and once in the published one:
  - copy 2026 into 2027, with the «Electricidad» value corrected (typed with a decimal comma) and the DEFRA rows of one subcategory moved to «DEFRA 2027»;
  - confirm the rate-unit variants are all copied and the other version has no 2027;
  - in the published version, confirm a 2027 footprint is offered the copied factors right after the copy;
  - copy again and see everything as already there;
  - give two alternatives of one row the same source and see the button disabled;
  - check that the page stays responsive with every row on one page, and that the grid mounts only the rows in view.
- [x] 9.2 Run `pnpm test:web` and `pnpm test:utils` (after `test-check`), then `pnpm format && pnpm lint && pnpm type-check`.
- [x] 9.3 Before pushing, check that no commit, file or PR text mentions another deployment by name.
- [ ] 9.4 Write small Conventional Commits per area (utils refactor, types, api helper refactor, ci, utils planner, api, api tests, web, seed help text, docs, user manual). Open the PR in English against `main`, with the screenshots, the upgrade note for deployments in production (help text), and a short review guide (the planner and D5 first). Ask for the priority label.
- [ ] 9.5 Send the open questions of the design to the deployments' methodology teams, stating the implemented assumptions.

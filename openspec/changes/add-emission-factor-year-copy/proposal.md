## Why

Emission factors are scoped to a footprint year, so every new year starts with no factors and the whole catalogue (249 rows per year with the current seed) has to be restated one maintainer grid row at a time. The country implementation guide says so in «Loading factors after launch»: there is no "copy last year's factors" action. A factor that is not updated, such as a national grid factor, still has to be typed again.

The seeded 2025 → 2026 load shows how a year changes in practice: 169 of 249 values stayed the same and 80 changed. The source changed edition per subcategory: «DEFRA 2025» became «DEFRA 2026» in 195 factors, while «IPCC» (51) and «EcoAct 2020» (3) stayed. So the copy has to let the admin correct values and sources while copying, not only clone rows. The seed already covers 2025 and 2026, so the first year loaded through the copy is 2027.

## What Changes

- A new **copy page** in the emission factor maintainer, opened with a «Copiar factores» action from edit mode of any methodology version, the published one included, as the grid itself writes there under the usage guard. The page:
  - takes a source year and a target year;
  - lists every factor of the source year in one data grid (`StylizedDataGrid`), with a subcategory column and the grid's own sorting, quick search and column filter;
  - lets the admin edit each factor's **target value and target source**. Values are read and shown in the app locale (decimal comma, dot as thousands separator), as the maintainer's number cells do;
  - tints a row whose target value differs from its source value, and warns, without blocking, about large changes (more than 25 %, or a 10× jump) that usually mean a unit error;
  - lets the admin leave a factor out, row by row;
  - blocks the copy only for what the server would refuse: two copied factors that end with the same subcategory, variables, unit and source, plus an empty source or value. A subcategory may cite several sources in a year.
- A new endpoint `POST /api/emission-factors/duplicate-year`, for SUPERADMIN and ADMIN. It receives the years and a list of **changes per factor**. It recomputes the result inside one transaction and creates every target factor or none. It never overwrites a factor that already exists in the target year, never changes the source year, and refuses a deleted methodology version.
- A **shared planner** in `packages/utils` decides, for each source factor, whether it is copied, excluded or already in the target, and which rules the result breaks. The page uses it for live feedback and the API uses it before writing.
- The rule that decides when two sources are the same one (whitespace and letter case aside) moves from the API's duplicate check into `packages/utils`, so the duplicate check and the planner share one definition.
- The maintainer help text, the country implementation guide and the methodology maintainer chapter of the user manual explain the copy.
- No schema change and no migration.

## Capabilities

### New Capabilities

- `emission-factor-year-copy`: copying the factors of one year into another within a methodology version, published or not, with per-factor value and source changes, what is copied, excluded and skipped, the blocking rules and the warnings, the result summary, authorization, and the copy page.

### Modified Capabilities

None. The copy relies on the per-year and per-source rules of `emission-factor-year-scoping` without changing them: the duplicate check keeps its key and its source comparison, only the place where the comparison is defined moves.

## Impact

- **API**:
  - A new feature folder `apps/api/src/features/emissionFactors/duplicateEmissionFactorYear/` (route, handler, service, helpers), registered in the `emission-factors` route group.
  - Two new errors: `EMISSION_FACTOR_YEAR_COPY_INVALID` (422, with per-factor details) and `EMISSION_FACTOR_YEAR_COPY_CONFLICT` (409, retryable). It reuses `METHODOLOGY_NOT_FOUND`.
  - The listing's visibility filter moves into `emissionFactors/helpers.ts`, and the gas breakdown sum becomes a non-throwing predicate, so the copy reuses both.
  - `checkDuplicateEmissionFactor` imports the source comparison from `packages/utils`.
- **Types**: the request/response contract in `packages/types/src/emissionFactors/duplicateEmissionFactorYear/`.
- **Utils**: `packages/utils/src/emissionFactorYearCopy.ts` (the pure planner) and the source comparison key, with the package's first unit tests; tests are type-checked and kept out of `dist`.
- **Web**:
  - a new route and screen for the copy page, with its grid, cells and footer;
  - the «Copiar factores» entry point in the factor maintainer's edit mode;
  - a mutation hook;
  - the variation thresholds as app constants;
  - Spanish messages in `getApiErrorMessage.ts`;
  - the «Año» window moves into a shared util.
- **Seed**: the maintainer help text only.
- **Docs**: `docs/country-implementation-guide/02-seed-content.md` and `user_manual/mantenedor_metodologia/` (slides, screenshots, PDF).
- **Ordering**: it builds on the several-sources change (open pull request), and needs `main`'s maintainer decimal comma (`NumericInput` in the maintainer cells, Spanish texts in `StylizedDataGrid`) in its base.
- **Out of scope**, with the contract left open for each:
  - applying a source to many factors at once: the contract already takes a source per factor;
  - editing the gas breakdown on the copy page;
  - pasting values from a spreadsheet;
  - saving a copy in progress;
  - a second reviewer;
  - copying between methodology versions;
  - a year filter on the maintainer grid.

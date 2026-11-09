## Why

Each subcategory admits a single emission-factor source per year (`validateSourceConsistency`). The methodology administrator cannot load a national factor for one fuel and DEFRA for the rest of a subcategory, nor two alternative factors for the same activity. `add-emission-factor-year` narrowed the rule to subcategory and year and deferred lifting it as a product decision (its Decision 4 and the TODO on `validateSourceConsistency`): neither the GHG Protocol nor ISO 14064 requires a single source. A country deployment already runs this change. This change brings it upstream, so a subcategory can carry several sources in one year and the person capturing a footprint chooses when more than one applies.

Lifting the rule has methodology costs, which the pull request states:

- The user may pick the source that yields fewer emissions.
- Two organizations of one sector may compute the same activity with different factors, and the dashboard aggregates them together.
- The verifier must check the source of each line.
- It does not solve Scope 2 electricity, which needs both the location-based and the market-based method reported, not a choice between them.

A deployment that wants one source per subcategory keeps it by loading one source in its catalogue. The rule is removed, not made configurable.

## What Changes

- **API:**
  - `validateSourceConsistency` and the `EMISSION_FACTOR_SOURCE_CONFLICT` error are removed from creating and updating a factor.
  - `checkDuplicateEmissionFactor` adds the source to its key: `(subcategory, required dimension values, year, source)`. A second factor with the same key and another source is accepted, and one with the same source is still a duplicate. An update that changes only the source runs the check.
  - Sources that differ only in letter case or whitespace are the same source for the duplicate check. PostgreSQL compares text exactly, so the check compares the sources in the application rather than in the `where`.
  - Create and update trim `source` and collapse repeated whitespace before validating, so `"DEFRA  2025 "` is stored as `"DEFRA 2025"`.
- **Capture:**
  - With a single source for a line, the source is selected automatically, as today. With more than one, nothing is selected and the line needs the user's choice to be complete.
  - After a later edit (measurement unit, optional dimension), a line that holds a catalogue source re-resolves its factor against that source. Today it is left with the source and no factor, and choosing the same source again does nothing. A source no longer offered for the line is cleared.
- **Maintainer:** the source lock (`emissionFactorSourceLock.ts`) and its write-back, tooltip and snackbar are removed. The «Fuente» cell is free text with the existing suggestions.
- **Help text and messages:** `emission-factors-maintainer.md` no longer says that the factors of a subcategory share one source per year, and states the duplicate rule with the source. The duplicate error message names the source and the year.
- **No migration:** the partial unique index `emission_factor_unique_subcategory_dims_source` already includes `source`.

## Capabilities

### New Capabilities

- `emission-capture-factor-link`: how capture selects a line's catalogue source and keeps its factor resolved when a subcategory offers one source or several.

### Modified Capabilities

- `emission-factor-year-scoping`: the requirement "Uniqueness accounts for the year across all enforcement layers" loses the one-source rule. The duplicate key gains the source, compared without letter case or whitespace differences, and the source is normalized on write. The base of this capability lives in `add-emission-factor-year`, which is not archived yet: this change is archived after it.

## Impact

- **API:** `apps/api/src/features/emissionFactors/` (`helpers.ts`, `errors.ts`, the create and update services) and their integration tests, including `emissionFactorUsageGuard`.
- **Types:** a shared source schema in `packages/types/src/baseSchemas/emissionFactor.ts`, used by the create and update request schemas.
- **Web:**
  - Maintainer: `EmissionFactorSourceCell.tsx`, `useEmissionFactorColumns.tsx`, `EmissionFactorsMaintainerScreen.tsx`, and `emissionFactorSourceLock.ts` with its test (deleted).
  - Capture: `useEmissionEditorForm.ts` and `emissionFactorService.ts` with its test.
  - `getApiErrorMessage.ts` and its test.
- **Seed:** `tools/seed/src/data/base/explanations/standalone/emission-factors-maintainer.md`. The seeded catalogue has one source per subcategory and year, and no source with case or whitespace variants, so no seed data changes.
- **Unchanged, checked:**
  - Unit conversion: `getCarbonInventoryMethodology` keeps each factor's source, so overlaps between sources become options, not ambiguity.
  - The seed collision check (`emission-factor-unit-uniqueness`) already keys on the source.
  - The dashboard and aggregates, which group by subcategory and category.
  - The emission-factor report and export, which list one row per factor with its source.
  - The verifier's view, which already shows each line's source.
  - Line synchronization and the factor snapshot.
- **Out of scope:**
  - Copying factors between years, which upstream does not have.
  - A recommended source among several.
  - Showing the factor value in the capture source selector.
  - The rate unit in the duplicate key.
  - Subcategory help texts that tell users not to change «Fuente factor». They stay true until a subcategory gets alternative factors for one activity, and they change with that data.

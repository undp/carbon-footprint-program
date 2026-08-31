## Why

An organization measuring its 2022 footprint today is offered the newest factor in the catalog. The platform stores exactly one version of every emission factor, and the reporting year plays no part in how a factor is picked:

- `emission_factor` has no year. The vintage lives inside the free-text `source` — the seed ships `"DEFRA 2025"`, `"EcoAct 2020"`, `"IPCC"` and `"Kool, A."` across its 246 factors (245 in the testing dataset).
- `checkDuplicateEmissionFactor` (`apps/api/src/features/emissionFactors/helpers.ts:65`) keys uniqueness on subcategory + required dimension values, so a second vintage for the same activity is rejected as a duplicate.
- `validateSourceConsistency` (`helpers.ts:109`) forces **every active factor of a subcategory to share one source**, so loading "DEFRA 2026" next to "DEFRA 2025" fails outright. The partial unique index `emission_factor_unique_subcategory_dims_source` disagrees with both checks: it includes `source` but not the rate unit.
- The frontend auto-fills a factor only when the available factors collapse to a single `source` (`determineAutoLoadFactorSource`, `apps/web/src/screens/CarbonInventory/components/EmissionEditor/hooks/useEmissionEditorForm.ts:275`). Two vintages would silently disable the recommendation and dump both into a dropdown labelled "Fuente".

Meanwhile `CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5` lets an organization pick any of the last five years as its measurement year, and `carbon_inventory.year` is already known before emission capture. The gap is real and reachable today.

The product definition behind this change was closed with the Product Owner (16 questions answered, recorded at https://claude.ai/code/artifact/4e054f1b-12d3-4e29-9e24-a52459283e5c).

## What Changes

**The year becomes a first-class attribute of a factor.**

- Add `emission_factor.year Int?`. `null` means _transversal_: the factor does not depend on the year and serves any measurement year (industrial-process factors, driven by chemistry rather than by a published dataset).
- The uniqueness key gains the year: at most one active factor per (subcategory, required dimension values, year). `validateSourceConsistency` becomes "one source per subcategory **and year**", so a new vintage no longer collides with the previous one.
- The year stops living inside `source`. The catalog stores `source: "DEFRA"` + `year: 2025`; the UI keeps presenting them together ("DEFRA 2025").

**The capture screen selects a vintage instead of inferring one.**

- `getCarbonInventoryMethodology` ships `year` with every factor (originals and unit-converted copies alike).
- In the emission editor the year is an explicit selector listing every vintage available for that activity. The platform preselects one; the organization can always pick another.
- Preselection rule, for a footprint of year `Y`:
  1. the factor whose year is `Y`;
  2. otherwise the transversal factor (no year);
  3. otherwise the most recent factor with a year below `Y`;
  4. otherwise the closest factor with a year above `Y`, flagged as coming from another year.
- Steps 2 and 3 only compete when a subcategory mixes dated and transversal factors, which the catalog is not expected to do.

**The applied vintage is recorded and shown.**

- `carbon_inventory_line_factor` stores the year of the applied factor alongside `appliedFactorValue` / `appliedFactorSource`, plus whether it came from a fallback, so a verifier can tell "official 2022 factor" from "2024 factor used for lack of 2022".
- The year is surfaced in the emission editor, in the "factors used" summary (`getEmissionFactors`), and as its own column in the methodology Excel export.

**Existing footprints keep their numbers.**

- Results already computed never move: each line keeps the value, source, unit and now year that were actually applied.
- Changing a footprint's year, or duplicating last year's footprint and re-dating it, surfaces a notice offering to update the factors to the new year. The organization decides; nothing is recalculated behind its back.
- Footprints that are self-declared or under verification stay frozen (`isEditable` already gates this).

## Capabilities

### New Capabilities

- `emission-factor-vintages`: the year as an attribute of an emission factor — nullable (transversal), part of the uniqueness key, separate from `source`, maintained in the maintainer screen and in the seed, exported with the methodology.
- `emission-factor-year-selection`: how a vintage is chosen during emission capture — the preselection rule above, the selector that lets the organization override it, the fallback notice, and the recording of the applied year on the line.

### Modified Capabilities

<!-- None. No existing capability spec covers emission factors. -->

## Impact

- **Database**: new `emission_factor.year` column; the partial unique index is rebuilt to include the year (and to stop disagreeing with the application-level checks); new column(s) on `carbon_inventory_line_factor` for the applied year and the fallback flag. Backfill: split the year out of `source` for the factors already loaded.
- **API**: `emissionFactors` (create / update / getAll, plus `helpers.ts` — both validators), `getCarbonInventoryMethodology` (+ its converted-factor helper), `getEmissionFactors`, `syncCarbonInventoryLines`, `updateCarbonInventory` and `duplicateCarbonInventory` (the "update factors to the new year" offer), and the `packages/types` schemas for all of them.
- **Web**: the emission editor's factor cells and `useEmissionEditorForm` (the source-based auto-fill becomes year-based resolution), the emission-factors maintainer grid and form, the factors-used summary, and `exportMethodologyToExcel`.
- **Seed**: `methodologies.json` in both the `base` (246 factors) and `testing` (245) datasets gain a year per factor and lose it from the source string; `seedEmissionFactors.ts` and its Zod schema follow.
- **Who loads the vintages**: historical catalogs are loaded by file by the technical team; the maintainer screen stays for point corrections. A bulk Excel import for the maintainer is explicitly **not** part of this change.
- **Out of scope**: warning that a year-over-year drop may come from a factor change rather than a real reduction (rankings, admin dashboard, public transparency) — a known risk, deferred; bulk import from the maintainer screen; the reduction plan, which is qualitative and does not compute with factors.

## Open Questions

- Which factors are genuinely transversal has to be confirmed with the methodology team. The working assumption is the industrial-process ones (cement, glass, steel, zinc), which is how the seed's `IPCC` and `Kool, A.` factors are grouped today; the Product Owner answered this one with an explicit "not sure".

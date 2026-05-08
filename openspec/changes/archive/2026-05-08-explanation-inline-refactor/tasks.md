## 1. Pre-flight

- [x] 1.1 Verify migration `20260311150053_add_explanation_table` is NOT applied in any shared environment (`prisma migrate status` per env); if applied anywhere, stop and switch to an additive migration strategy before proceeding.
- [x] 1.2 Grep current state to inventory call sites: `rg 'explanationSlug|\.examples\b|ExplanationBaseSchema|openExplanation\(' apps/ packages/` and save the baseline for the Phase 7 diff.

## 2. Database — schema + migration + seed

- [x] 2.1 Edit `packages/database/src/prisma/schema.prisma` `Explanation` model: drop `visible` field; drop `categories[]` + `subcategories[]` back-relations.
- [x] 2.2 Edit `Category` model: drop `explanationSlug` field + relation + FK; drop `examples` field; add `explanation String? @db.Text`.
- [x] 2.3 Edit `Subcategory` model: drop `explanationSlug` field + relation + FK; drop `examples` field; add `explanation String? @db.Text`.
- [x] 2.4 Edit `packages/database/src/prisma/migrations/20260311150053_add_explanation_table/migration.sql` in place: (a) create `explanation` table without `visible`; (b) remove the `explanation_slug` columns + FKs on `category`/`subcategory`; (c) add `explanation TEXT` nullable to `category` and `subcategory`; (d) `DROP COLUMN examples` on `category` and `subcategory`.
- [x] 2.5 Rewrite `packages/database/src/prisma/seeds/scripts/seedExplanations.ts`: read `seeds/data/base/explanations/{categories,subcategories}/c<pos>_<name>.md` (only the `base` dataset carries explanation content today), match by position + normalized name, `UPDATE` the matching row's `explanation` column. Remove all slug generation and `Explanation` row inserts. Leave a short comment about future standalone explanations.
- [x] 2.5a Pre-flight the seed rewrite: list every `.md` under `seeds/data/base/explanations/{categories,subcategories}/` and confirm the `c<pos>_<name>` naming convention actually holds for every file. Flag any non-conforming filename or any authored category/subcategory that has no matching file (intentional null vs. gap). The new seed silently no-ops on mismatches, so this audit must pass before merge.
- [x] 2.6 Remove `examples` writes from `packages/database/src/prisma/seeds/scripts/seedMethodologyData/seedCategories.ts`.
- [x] 2.6b Remove `examples` writes from `packages/database/src/prisma/seeds/scripts/seedMethodologyData/seedSubcategories.ts`.
- [x] 2.7 Remove `examples` column/key from category and subcategory seed data files (CSV/TSV/JSON).
- [x] 2.8 Run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
- [x] 2.9 Run `pnpm --filter database db:seed` against a local DB; sanity-check that `category.explanation` / `subcategory.explanation` are populated and no `Explanation` rows exist for per-entity content.

## 3. Shared types / Zod schemas

- [x] 3.1 `packages/types/src/baseSchemas/category.ts`: drop `explanationSlug` and `examples`; add `explanation: z.string().nullable()`.
- [x] 3.2 `packages/types/src/baseSchemas/subcategory.ts`: same as 3.1.
- [x] 3.3 `packages/types/src/baseSchemas/explanation.ts`: drop `visible` from `ExplanationBaseSchema`.
- [x] 3.4 `packages/types/src/explanations/getExplanationBySlug/{schemas,types}.ts`: drop `visible` from response.
- [x] 3.5 `packages/types/src/categories/createCategory/{schemas,types}.ts`: add optional nullable `explanation`; remove `examples`.
- [x] 3.6 `packages/types/src/categories/updateCategory/{schemas,types}.ts`: same as 3.5.
- [x] 3.7 `packages/types/src/subcategories/createSubcategory/{schemas,types}.ts`: same as 3.5.
- [x] 3.8 `packages/types/src/subcategories/updateSubcategory/{schemas,types}.ts`: same as 3.5.
- [x] 3.9 Audit any `getAll*` response schemas that inline `explanationSlug` or `examples` for category/subcategory; update to include `explanation` and drop the removed fields.
- [x] 3.9a `packages/types/src/carbonInventories/getCarbonInventoryMethodology/schemas.ts`: drop `explanationSlug` and `examples` on both category and subcategory sub-schemas; add `explanation`.
- [x] 3.9b `packages/types/src/carbonInventories/getReductionPlan/schemas.ts`: drop `explanationSlug`; add `explanation`.
- [x] 3.9c `packages/types/src/subcategories/getAllSubcategories/schemas.ts`: drop `examples`; add `explanation`.
- [x] 3.10 Run `pnpm type-check`; fix compile errors downstream from the schema changes (will surface api + web call sites in later tasks).

## 4. API — endpoints and mappers

- [x] 4.1 `apps/api/src/features/categories/mappers.ts`: replace `explanationSlug` output with `explanation`; drop `examples`.
- [x] 4.2 `apps/api/src/features/categories/getAllCategories/service.ts`: select `explanation` in the Prisma query; confirm mapper carries it through.
- [x] 4.3 `apps/api/src/features/categories/createCategory/{service,handler}.ts`: accept `explanation` in input and persist; **remove the existing `examples: data.examples ?? null` write**.
- [x] 4.4 `apps/api/src/features/categories/updateCategory/service.ts`: build `updateData.explanation` from input; remove `examples` handling.
- [x] 4.5 `apps/api/src/features/subcategories/mappers.ts`: create if missing; include `explanation` in list + detail responses.
- [x] 4.6 `apps/api/src/features/subcategories/getAllSubcategories/service.ts`: drop `examples` from the Prisma `select` and response mapping, add `explanation` (closes the current gap).
- [x] 4.7 `apps/api/src/features/subcategories/createSubcategory/service.ts`: accept and persist `explanation`; **remove the existing `examples: data.examples` write**.
- [x] 4.8 `apps/api/src/features/subcategories/updateSubcategory/service.ts`: accept and persist `explanation`; remove `examples` writes.
- [x] 4.9 `apps/api/src/features/explanations/getExplanationBySlug/{service,handler}.ts`: drop `visible` from select and response; endpoint remains.
- [x] 4.10 `apps/api/src/features/carbonInventories/getReductionPlan/**`: swap `explanationSlug` output to `explanation` wherever category/subcategory surfaces.
- [x] 4.10a `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/service.ts`: drop `explanationSlug` and `examples` from the category + subcategory `select`; add `explanation` to both.
- [x] 4.10b `apps/api/src/features/methodologies/duplicateMethodology/service.ts`: remove the `examples` copy between rows; copy `explanation` instead so authored content survives duplication.
- [x] 4.11 Grep `rg 'explanationSlug|\bexamples\b' apps/api/src/features/` and update every remaining hit (emissionFactors, organization carbon-inventory reads, etc.).
- [x] 4.12 Run `pnpm type-check` and `pnpm lint`; resolve.

## 5. Frontend — data layer

- [x] 5.1 `apps/web/src/api/query/explanations/useExplanation.ts`: drop `visible` from response type; no behavioral change.
- [x] 5.2 `apps/web/src/api/query/explanations/keys.ts`: confirm no `visible` leakage.
- [x] 5.3 `apps/web/src/contexts/ExplanationContext.tsx`: replace `openExplanation(slug: string | null)` with `openExplanationBySlug(slug: string | null)` and `openExplanationContent(content: string)`. `openExplanationBySlug` MUST continue to accept `null` to preserve the existing "open modal in not-found state" behavior used by ReductionProject screens (see 6.9). Internal state is a discriminated union `{ mode: 'slug', slug: string | null } | { mode: 'content', content: string } | null`; Dialog `open` is `state !== null`; body renders fetched content when `mode==='slug'` (via `useExplanation`, which already handles null), direct string when `mode==='content'`; remove all `visible` checks. The `useExplanationDialog` hook name is retained.
- [x] 5.4 `apps/web/src/api/query/categories/**` and `subcategories/**`: confirm response types carry `explanation` through shared schemas; remove any hand-rolled types that drop it; remove `examples` consumers.

## 6. Frontend — screens and components

- [x] 6.1 `apps/web/src/screens/CarbonInventory/components/CategoryCard.tsx`: prop rename `explanationSlug` → `explanation: string | null`; info-icon click calls `openExplanationContent(explanation)` when non-null, icon hidden when null; remove any `examples` rendering.
- [x] 6.2 `apps/web/src/screens/CarbonInventory/components/CategoryCarousel.tsx`: pass `explanation={category.explanation}` instead of `explanationSlug`.
- [x] 6.3 `apps/web/src/screens/CarbonInventory/components/SubcategoryPreselectionCard.tsx`: prop rename + `openExplanationContent` call; remove `examples`.
- [x] 6.4 `apps/web/src/screens/CarbonInventory/components/SubcategoryPreselectionField.tsx`: swap `openExplanation(subcategory.explanationSlug)` → `openExplanationContent(subcategory.explanation)`.
- [x] 6.5 `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditor.tsx`: pass `explanation={subcategory.explanation}`.
- [x] 6.6 `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditorHeader.tsx`: prop rename + `openExplanationContent` call.
- [x] 6.6a `apps/web/src/screens/CarbonInventory/hooks/useSubcategoryPreselectionData.ts`: rename `explanationSlug` → `explanation` (string | null) in the returned shape.
- [x] 6.6b `apps/web/src/screens/CarbonInventory/types/SubcategoryPreselectionTypes.ts`: same rename in the local type.
- [x] 6.7 Maintainer / admin screens — add `explanation` textarea, remove `examples`:
  - [ ] 6.7a `apps/web/src/screens/Maintainer/hooks/useCategoriesForm.ts`: drop `examples`; add `explanation` field + validation.
  - [ ] 6.7b `apps/web/src/screens/Maintainer/hooks/useCategoryColumns.tsx`: drop the `examples` column; optionally render `explanation` preview.
  - [ ] 6.7c `apps/web/src/screens/Maintainer/hooks/useSubcategoriesForm.ts`: mirror 6.7a.
  - [ ] 6.7d `apps/web/src/screens/Maintainer/hooks/useSubcategoryColumns.tsx`: mirror 6.7b.
  - [ ] 6.7e `apps/web/src/screens/Maintainer/screens/CategoriesMaintainerScreen.tsx`: rename every `examples` field to `explanation`. Includes: row shape (`examples: row.examples || null` ×2 at init + optimistic update), new-row default (`examples: null`), `handleCellChange(rowIndex, "examples", …)` + its rollback, the `form.getValues(\`categories.${i}.examples\`)` path read, and the explanation-modal wiring that reads/writes this field. Roughly lines 159, 192, 264, 392, 399, 456.
  - [ ] 6.7f `apps/web/src/screens/Maintainer/screens/SubcategoriesMaintainerScreen.tsx`: mirror 6.7e. Includes the diff-check `row.examples !== original.examples`, `examplesModal`-style state keyed on the `examples` field, and the form-path read at line 365. Roughly lines 110, 139, 152, 228, 297, 299, 306, 314, 365.
  - [ ] 6.7g `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx`: audit only — component is column-agnostic (`{value, onSave, readOnly, …}`), no code change expected. Confirm no `examples` reference leaks in.
- [x] 6.8 Grep `rg 'explanationSlug|\bexamples\b|openExplanation\(' apps/web/src/screens/` and migrate every remaining call site.
- [x] 6.9 ReductionProject / ReductionProjects screens — migrate the retained slug-fetch callers to the renamed API. All five sites currently call `openExplanation(…)` with either `null` or a nullable explanation-id variable; swap each to `openExplanationBySlug(…)` and keep the null pass-through:
  - [ ] 6.9a `apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx:224` — `openExplanation(null)` → `openExplanationBySlug(null)`.
  - [ ] 6.9b `apps/web/src/screens/ReductionProjects/ReductionProjectsScreen.tsx:340` — same.
  - [ ] 6.9c `apps/web/src/screens/ReductionProject/components/ReportedElsewhereSection.tsx:33` — `openExplanation(reportedElsewhereExplanationId ?? null)` → `openExplanationBySlug(…)`.
  - [ ] 6.9d `apps/web/src/screens/ReductionProject/components/ReductionProjectFormFields.tsx:199` — `openExplanation(gwpExplanationId ?? null)` → `openExplanationBySlug(…)`.
  - [ ] 6.9e `apps/web/src/screens/ReductionProject/components/GeiConsideredSection.tsx:42` — `openExplanation(geiExplanationId ?? null)` → `openExplanationBySlug(…)`.

## 7. Tests

- [x] 7.1 `apps/api/test/factories/categoryFactory.ts`: drop `examples`; accept optional `explanation`.
- [x] 7.2 `apps/api/test/factories/subcategoryFactory.ts`: same.
- [x] 7.3 `apps/api/test/factories/explanationFactory.ts` (if exists): drop `visible`.
- [x] 7.4 `apps/api/test/features/categories/getAllCategories/integration.test.ts`: add assertion that when `explanation` is set, response includes it verbatim.
- [x] 7.5 `apps/api/test/features/categories/createCategory/integration.test.ts`: add cases creating with and without `explanation`.
- [x] 7.6 `apps/api/test/features/categories/updateCategory/integration.test.ts`: add case updating `explanation` (set, replace, clear to null); remove `examples` cases.
- [x] 7.7 Mirror 7.5–7.6 for subcategories (`createSubcategory`, `updateSubcategory`).
- [x] 7.7a `apps/api/test/features/subcategories/getAllSubcategories/integration.test.ts`: **new** — assert the list response now carries `explanation` for each item (closes the previously-omitted-explanation gap; this is a new requirement, not a mirror of prior behavior). Also assert `examples` is no longer in the response.
- [x] 7.8 `apps/api/test/features/carbonInventories/getReductionPlan/integration.test.ts`: replace `explanationSlug` assertions with `explanation`.
- [x] 7.9 `apps/api/test/features/explanations/getExplanationBySlug/integration.test.ts` (if exists): drop `visible` from expected response.
- [x] 7.10 Run: `pnpm test --filter=api -- /categories --coverage=false`, `pnpm test --filter=api -- /subcategories --coverage=false`, `pnpm test --filter=api -- /carbonInventories/getReductionPlan --coverage=false`, `pnpm test --filter=api -- /explanations --coverage=false`.

## 8. Final sweep and verification

- [x] 8.1 Greps must return zero hits under `apps/` + `packages/` (or only expected hits as noted):
  - `rg 'explanationSlug' apps/ packages/` → zero.
  - `rg 'ExplanationBaseSchema.*visible' apps/ packages/` → zero.
  - `rg '\.examples\b' apps/ packages/` → zero in category/subcategory contexts (skip unrelated `examples` in docs/tests for other features).
  - `rg 'openExplanation\(' apps/ packages/` → zero (every call site must have migrated to `openExplanationBySlug` or `openExplanationContent`).
  - `rg 'explanation_slug' packages/database/` → zero (catches lingering migration / raw-SQL hits).
- [x] 8.2 `pnpm type-check` clean.
- [x] 8.3 `pnpm lint` clean.
- [x] 8.4 Full API test suite for affected domains passes.
- [x] 8.5 Manual UI walkthrough: carbon inventory → open category explanation modal → open subcategory explanation modal → DevTools Network tab shows no `/explanations/{slug}` request for either → admin edit form persists updated `explanation`.

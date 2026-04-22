## Why

Category and Subcategory explanations are currently stored in a separate `Explanation` table and joined via `explanationSlug` FK. In practice every explanation is 1:1 with its owning Category/Subcategory, so the join adds an extra fetch, an extra query on the frontend, and a slug-management burden for zero reuse. Inlining the markdown as a nullable `explanation` column removes a round-trip, simplifies seeding, and kills the `visible` flag that no surface uses. The `examples` column on both tables is unused in product and is being dropped in the same pass to avoid a second migration churn.

## What Changes

- **BREAKING**: Drop `explanationSlug` FK on `Category` and `Subcategory`; replace with inline `explanation String? @db.Text`.
- **BREAKING**: Drop `examples` column from `Category` and `Subcategory` (destructive — seed/user data lost, confirmed in scope).
- **BREAKING**: Drop `visible` field from `Explanation` model and `getExplanationBySlug` response.
- Keep `Explanation` table and `GET /explanations/{slug}` endpoint for future standalone explanations — no current callers.
- Edit migration `20260311150053_add_explanation_table/migration.sql` in place (pre-deploy) rather than stacking an additive migration. Note: `examples` was introduced earlier in `20251227203015_create_methodology_tables`; the in-place edit just adds a `DROP COLUMN examples` step to `20260311150053` and leaves the prior migration untouched.
- Rewrite `seedExplanations.ts` to write markdown directly to `category.explanation` / `subcategory.explanation`, matching by position + normalized name. Same `.md` file layout.
- Extend `createCategory` / `updateCategory` / `createSubcategory` / `updateSubcategory` inputs with optional `explanation`; remove `examples` from those inputs.
- Include `explanation` in list/detail responses for categories and subcategories (fixes current gap in `getAllSubcategories` which omits it).
- Frontend `ExplanationContext`: split into `openExplanationBySlug(slug)` (fetch path, retained) and `openExplanationContent(content)` (direct render, no fetch). Category/Subcategory surfaces switch to the direct variant.
- Remove `examples` UI and `explanationSlug` props across carbon-inventory and admin screens.

## Capabilities

### New Capabilities

- `inline-explanations`: Category and Subcategory carry their explanation markdown inline; frontend renders without an extra fetch. Covers schema shape, API read/write contract, seed behavior, and the client context split between slug-fetch and direct-content modes.

### Modified Capabilities

<!-- No existing spec captures category/subcategory explanation behavior. -->

## Impact

- **Database**: `packages/database/src/prisma/schema.prisma`; migration `20260311150053_add_explanation_table/migration.sql` edited in place (safe only if not yet applied in any shared env — verify before merge); `seedExplanations.ts` rewritten; category/subcategory seed data files drop `examples`.
- **Shared types**: `packages/types/src/baseSchemas/{category,subcategory,explanation}.ts`; create/update schemas for categories + subcategories; `getExplanationBySlug` schemas.
- **API**: `apps/api/src/features/categories/*`, `apps/api/src/features/subcategories/*` (mappers, create/update/list services), `apps/api/src/features/explanations/getExplanationBySlug/*`, `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/*`, `apps/api/src/features/carbonInventories/getReductionPlan/*`, `apps/api/src/features/methodologies/duplicateMethodology/*`, plus any endpoint surfacing category/subcategory joins (audit via grep of `explanationSlug` + `examples` under `apps/api/src/features/`).
- **Frontend**: `apps/web/src/contexts/ExplanationContext.tsx`, `apps/web/src/api/query/explanations/useExplanation.ts`, carbon-inventory cards/carousels/editors, `apps/web/src/screens/CarbonInventory/hooks/useSubcategoryPreselectionData.ts`, `apps/web/src/screens/CarbonInventory/types/SubcategoryPreselectionTypes.ts`, Maintainer screens for category + subcategory admin tables (`apps/web/src/screens/Maintainer/**`; `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` audited, column-agnostic — no code change expected). Retained slug-fetch callers that must migrate to the renamed context API: `apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx`, `apps/web/src/screens/ReductionProjects/ReductionProjectsScreen.tsx`, `apps/web/src/screens/ReductionProject/components/{ReportedElsewhereSection,ReductionProjectFormFields,GeiConsideredSection}.tsx`.
- **Tests**: category + subcategory factories, integration tests for `createCategory`, `updateCategory`, `getAllCategories`, subcategory mirrors, `getReductionPlan`, `getExplanationBySlug`.
- **Risk**: in-place migration edit requires confirming no shared environment has applied `20260311150053_add_explanation_table`; fall back to additive migration if it has. `examples` drop is destructive.

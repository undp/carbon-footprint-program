# Plan: inline explanation on Category/Subcategory + drop examples

## Goal

Stop linking Category/Subcategory to Explanation via `explanationSlug` FK.
Store explanation markdown inline as `explanation` (Text, nullable) column on both tables.
Drop `examples` column on both tables.
Keep `Explanation` table + `getExplanationBySlug` endpoint alive for future standalone explanations (no current callers).
Remove `visible` flag everywhere (Explanation, schemas, frontend).

Resolved decisions (from clarifying Q&A):

- Column: `explanation String? @db.Text` on Category + Subcategory. No `visible`.
- Examples: removed from both tables + all frontend usages.
- Migration: **edit existing** `20260311150053_add_explanation_table/migration.sql` in place (pre-deploy).
- Endpoints: **no new endpoints**. Explanation returned inline on list/detail responses.
- `getExplanationBySlug`: kept, but response loses `visible`.
- Frontend modal: `ExplanationContext` adapted with two methods — `openExplanationBySlug(slug)` (fetch path, unchanged) + `openExplanationContent(content)` (direct, no fetch).
- Seed: rewrite `seedExplanations.ts` to write to `category.explanation` / `subcategory.explanation` directly, same `.md` file paths + naming.
- Create: `explanation` optional on createCategory + createSubcategory inputs.
- Update: `explanation` accepted on updateCategory + updateSubcategory, replacing the (now removed) `examples`.
- Tests: update all broken tests + factories; add integration coverage asserting `explanation` round-trips through list endpoints.

---

## Phase 1 — Database schema + migration + seed

**Files**

- `packages/database/src/prisma/schema.prisma`
  - `Explanation` model (lines ~376–390): drop `visible` field.
  - `Category` model (lines ~392–420): drop `explanationSlug` + `explanation` relation + FK; drop `examples`; add `explanation String? @db.Text`.
  - `Subcategory` model (lines ~422–451): drop `explanationSlug` + relation + FK; drop `examples`; add `explanation String? @db.Text`.
  - `Explanation.categories[]` + `Explanation.subcategories[]` back-relations: remove.

- `packages/database/src/prisma/migrations/20260311150053_add_explanation_table/migration.sql` (edit in place)
  - Create `explanation` table without `visible` column (keep slug PK, content, audit, timestamps).
  - Do **not** add `explanation_slug` columns or FKs to category/subcategory.
  - Add `explanation` TEXT nullable to `category` and `subcategory`.
  - Drop `examples` from `category` and `subcategory` (the prior migration that created them must be left as-is; this one drops).

- `packages/database/src/prisma/seeds/scripts/seedExplanations.ts`
  - Stop inserting `Explanation` rows for per-category/per-subcategory content.
  - Keep reading `seeds/data/{dataset}/explanations/{categories|subcategories}/c{pos}_{name}.md`.
  - Match by position + normalized name → update `category.explanation` / `subcategory.explanation` with file content.
  - Slug-generation logic removed; no Explanation rows created.
  - Standalone/future explanations (non-entity-linked) remain a TBD — leave a short comment, not code.

- `packages/database/src/prisma/seeds/scripts/seedMethodologyData.ts` (or wherever category/subcategory seed lives)
  - Remove `examples` field writes if present.

- Category/subcategory seed data files (CSV/TSV/JSON): drop `examples` column/key.

**Commands**

```
pnpm --filter database dev:generate && pnpm --filter database dev:build
pnpm --filter database db:seed  # sanity check
```

---

## Phase 2 — Shared types / schemas

**Files**

- `packages/types/src/baseSchemas/category.ts`
  - Drop `explanationSlug`.
  - Drop `examples`.
  - Add `explanation: z.string().nullable()`.

- `packages/types/src/baseSchemas/subcategory.ts`
  - Drop `explanationSlug`.
  - Drop `examples`.
  - Add `explanation: z.string().nullable()`.

- `packages/types/src/baseSchemas/explanation.ts`
  - Drop `visible` from `ExplanationBaseSchema`.

- `packages/types/src/explanations/getExplanationBySlug/schemas.ts` + `types.ts`
  - Drop `visible` from response schema + type.

- `packages/types/src/categories/createCategory/schemas.ts` (+ `types.ts`)
  - Add optional `explanation: z.string().nullable().optional()`.
  - Remove `examples` from input.

- `packages/types/src/categories/updateCategory/schemas.ts` (+ `types.ts`)
  - Add optional `explanation`.
  - Remove `examples` from input.

- `packages/types/src/subcategories/createSubcategory/schemas.ts` (+ `types.ts`)
  - Add optional `explanation`.
  - Remove `examples`.

- `packages/types/src/subcategories/updateSubcategory/schemas.ts` (+ `types.ts`)
  - Add optional `explanation`.
  - Remove `examples`.

- Any `getAll*` response schemas that inline `explanationSlug` or `examples`: update.

**Commands**

```
pnpm type-check
```

---

## Phase 3 — API endpoints

**Files**

- `apps/api/src/features/categories/mappers.ts`
  - Replace `explanationSlug` output field with `explanation`.
  - Drop `examples` from mapped output.

- `apps/api/src/features/categories/getAllCategories/service.ts`
  - Select `explanation`. Already returns through mapper.

- `apps/api/src/features/categories/createCategory/service.ts` + `handler.ts`
  - Accept `explanation` in input. Persist.

- `apps/api/src/features/categories/updateCategory/service.ts` (lines ~16–71)
  - Build `updateData.explanation` from input.
  - Remove `examples` from buildout.

- `apps/api/src/features/subcategories/mappers.ts` (create if absent — currently inline in service)
  - Include `explanation` in list + detail responses. This fixes the current gap where `getAllSubcategories` omits explanation entirely.

- `apps/api/src/features/subcategories/getAllSubcategories/service.ts` (lines ~10–61)
  - Select `explanation` in Prisma query. Include in response (lines 41–60).

- `apps/api/src/features/subcategories/createSubcategory/service.ts`
  - Accept + persist `explanation`.

- `apps/api/src/features/subcategories/updateSubcategory/service.ts` (lines ~19–159)
  - Accept + persist `explanation`. Remove `examples` writes.

- `apps/api/src/features/explanations/getExplanationBySlug/service.ts` + `handler.ts`
  - Drop `visible` from selection and response. Endpoint stays; now only returns `{ slug, content }`.

- `apps/api/src/features/carbonInventories/getReductionPlan/**` (if it surfaces category/subcategory explanation)
  - Swap `explanationSlug` → `explanation`.

- Any other endpoint returning category/subcategory with explanation/examples: audit + update. Candidates: organization carbon-inventory reads, emission-factor joins under `apps/api/src/features/emissionFactors/*`. Grep `explanationSlug` and `examples` across `apps/api/src/features/` and fix every hit.

**Commands**

```
pnpm type-check
pnpm lint
```

---

## Phase 4 — Frontend data layer (hooks + context)

**Files**

- `apps/web/src/api/query/explanations/useExplanation.ts`
  - Remove `visible` from response type. Hook still calls `GET /explanations/{slug}`. No other change.

- `apps/web/src/api/query/explanations/keys.ts`
  - No change unless `visible` leaks into key.

- `apps/web/src/contexts/ExplanationContext.tsx`
  - Current API: `openExplanation(slug)`.
  - New API: two separate methods.
    - `openExplanationBySlug(slug: string)` → sets `{ mode: 'slug', slug }`; existing `useExplanation(slug)` fetch path.
    - `openExplanationContent(content: string)` → sets `{ mode: 'content', content }`; no fetch, content used directly.
  - Dialog `open={state !== null}`. Body: if mode=slug render `data?.content` from hook; if mode=content render state.content.
  - Remove any `visible` checks.

- `apps/web/src/api/query/categories/**` + `subcategories/**`
  - Response types pick up `explanation` field automatically via shared schemas; verify no hand-rolled type drops it.
  - Remove `examples` field consumption.

---

## Phase 5 — Frontend screens / components

**Files**

- `apps/web/src/screens/CarbonInventory/components/CategoryCard.tsx`
  - Replace `explanationSlug: string | null` prop with `explanation: string | null`.
  - On info-icon click: `openExplanationContent(explanation)` when non-null; hide icon when null.
  - Remove any `examples` rendering.

- `apps/web/src/screens/CarbonInventory/components/CategoryCarousel.tsx`
  - Pass `explanation={category.explanation}` instead of `explanationSlug`.

- `apps/web/src/screens/CarbonInventory/components/SubcategoryPreselectionCard.tsx`
  - Same prop rename + `openExplanationContent` call.
  - Remove `examples` display.

- `apps/web/src/screens/CarbonInventory/components/SubcategoryPreselectionField.tsx`
  - Swap `openExplanation(subcategory.explanationSlug)` → `openExplanationContent(subcategory.explanation)`.

- `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditor.tsx`
  - Pass `explanation={subcategory.explanation}`.

- `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditorHeader.tsx`
  - Prop rename + `openExplanationContent` invocation.

- Admin / methodology screens (if any) that edit category/subcategory:
  - Form field: add `explanation` textarea. Remove `examples` field + validation.
  - Grep `examples` across `apps/web/src/screens/` — confirm every usage is covered (cards, forms, tooltips, chips).

- Any place calling old `openExplanation(slug)` for category/subcategory: migrate to `openExplanationContent`.
- Places still using `openExplanationBySlug`: only standalone explanations (none today → should be zero call sites after this refactor; that's fine, context method preserved for future use).

---

## Phase 6 — Tests

**Files**

- `apps/api/test/factories/categoryFactory.ts`
  - Drop `examples`. Accept optional `explanation`.

- `apps/api/test/factories/subcategoryFactory.ts`
  - Same.

- `apps/api/test/factories/explanationFactory.ts` (if exists)
  - Drop `visible`.

- `apps/api/test/features/carbonInventories/getReductionPlan/integration.test.ts`
  - Replace `explanationSlug` assertions with `explanation` (string | null).

- `apps/api/test/features/categories/getAllCategories/integration.test.ts`
  - Add assertion: when category has `explanation` set, response contains it verbatim.

- `apps/api/test/features/categories/updateCategory/integration.test.ts`
  - Add case: update `explanation`, assert persisted + returned.
  - Remove `examples` cases.

- `apps/api/test/features/categories/createCategory/integration.test.ts`
  - Create with and without `explanation`.

- Mirror for subcategories: `getAllSubcategories`, `updateSubcategory`, `createSubcategory`.

- `apps/api/test/features/explanations/getExplanationBySlug/integration.test.ts` (if exists, else skip)
  - Drop `visible` from expected response.

**Commands**

```
pnpm test --filter=api -- /categories --coverage=false
pnpm test --filter=api -- /subcategories --coverage=false
pnpm test --filter=api -- /carbonInventories/getReductionPlan --coverage=false
pnpm test --filter=api -- /explanations --coverage=false
```

---

## Phase 7 — Final sweep + verification

1. Grep checklist (must return zero hits in `apps/` + `packages/`):
   - `explanationSlug`
   - `\.examples` (category/subcategory context only — be careful with unrelated `examples`)
   - `ExplanationBaseSchema.*visible` / `visible.*Explanation`
2. `pnpm type-check` — clean.
3. `pnpm lint` — clean.
4. Full API test suite for affected domains.
5. Manual UI walkthrough: carbon inventory → open category + subcategory explanation modals → confirm content renders without network call for these (DevTools Network tab) → confirm admin edit form updates `explanation`.

---

## Out of scope

- No new endpoints (per decision).
- Standalone (non-entity-linked) explanations: Explanation table preserved but no new create/update endpoints. Future work.
- Slug rename / Explanation PK migration: untouched.
- i18n of explanation content.

## Risks

- Migration edited in place: only safe if no shared env has applied `20260311150053_add_explanation_table` yet. **Verify before merging** — if already deployed anywhere, switch to additive migration.
- `examples` removal is destructive: any seed data or user-entered examples lost. Confirmed with user scope.
- Any endpoint we miss that still returns `explanationSlug` will 500 or emit unknown-field. Phase 7 grep is the gate.

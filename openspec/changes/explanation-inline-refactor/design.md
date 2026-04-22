## Context

Category and Subcategory explanations live in a standalone `Explanation` table joined by `explanationSlug` FK on both entities. The shape was built anticipating explanation reuse across entities, which never materialized — every explanation is 1:1 with its owning Category or Subcategory. The join forces an extra frontend fetch each time the info-icon modal opens, and seeding requires generating stable slugs that exist only to satisfy the FK.

Additionally, a parallel `examples` column on both tables is unused in the product surface and has no active seed data worth preserving. An `Explanation.visible` flag exists but no code branches on it.

Migration `20260311150053_add_explanation_table` is the one that introduced the `Explanation` table and the `explanation_slug` FKs. The `examples` columns on `category` and `subcategory` come from an earlier migration (`20251227203015_create_methodology_tables`); the in-place edit only adds a `DROP COLUMN examples` step to `20260311150053` and does not touch the prior migration. Migration `20260311150053` has not yet been applied in shared environments (per scope decision), so it can be edited in place rather than stacked with a follow-up.

Frontend consumes explanations through `ExplanationContext.openExplanation(slug)` which triggers `useExplanation(slug)` to fetch `GET /explanations/{slug}` on demand. All current callers are Category/Subcategory surfaces.

## Goals / Non-Goals

**Goals:**

- Remove the `explanationSlug` FK on Category and Subcategory; inline markdown as `explanation String? @db.Text`.
- Drop `examples` from both tables (destructive, scoped).
- Drop `Explanation.visible` everywhere.
- Keep `Explanation` table + `getExplanationBySlug` endpoint viable for future standalone explanations without adding new endpoints now.
- Preserve the explanation modal UX on the frontend; remove the extra fetch for category/subcategory.
- Fix the current `getAllSubcategories` gap where explanation content is not returned.

**Non-Goals:**

- No new create/update endpoints for standalone `Explanation` rows. The table is dormant until future work.
- No i18n of explanation content.
- No slug rename / Explanation PK migration.
- No backfill job: `examples` data is dropped, explanations are re-populated by re-running the seed.

## Decisions

### Decision: Inline `explanation` as nullable Text column rather than 1:1 relation

**Choice:** `explanation String? @db.Text` on both Category and Subcategory.
**Alternatives considered:**

- Keep FK but switch to embedded 1:1 relation — still requires a join, does not simplify seeding.
- Copy content into `Category` + leave `Explanation` row as source of truth — dual-write complexity for zero benefit.
  **Rationale:** All reads of category/subcategory already fetch the parent row; inlining guarantees content ships in the same payload. Nullable because not every category/subcategory has authored explanation content.

### Decision: Edit existing migration in place

**Choice:** Modify `20260311150053_add_explanation_table/migration.sql` to (a) omit `visible` on `explanation`, (b) skip the `explanation_slug` columns + FKs on category/subcategory, (c) add `explanation TEXT` nullable to both tables, (d) drop `examples` from both tables.
**Alternatives considered:**

- Stack an additive migration — safer under deployed environments, but would leave the unused `explanation` table shape (with `visible`) permanently in history.
  **Rationale:** Migration has not been applied in any shared environment (verification is a merge-gate, called out in proposal risks). In-place keeps the history linear.
  **Risk:** If someone has applied this migration in a shared/preview env before the edit lands, Prisma's shadow DB comparison will fail and resolving requires a reset. Mitigation: explicit verification step before merge; fallback to additive migration if any shared env has it applied.

### Decision: Keep `Explanation` table and `getExplanationBySlug` endpoint

**Choice:** Preserve both. Strip `visible` from the model and endpoint response. No current callers for the endpoint remain after the refactor; that is acceptable.
**Alternatives considered:**

- Delete the table and endpoint entirely — reclaims cleanup but forces reintroduction work when standalone explanations return.
  **Rationale:** Table is empty-ish post-refactor and cheap to keep. Endpoint survives as a stable surface for future standalone-explanation use cases.

### Decision: Split frontend context into `openExplanationBySlug` + `openExplanationContent`

**Choice:** Replace single `openExplanation(slug)` with two methods. Slug variant preserves the fetch path via `useExplanation`. Content variant takes a string and skips the network entirely.
**Alternatives considered:**

- Keep `openExplanation(value)` and branch internally on whether `value` looks like a slug — brittle and type-unsafe.
- Preload all explanations on the category list and hand-roll a local lookup — unnecessary coupling.
  **Rationale:** Category and Subcategory surfaces already hold the inlined `explanation` string on the row they render; handing it directly to the context avoids a round-trip and lets the slug path remain a pure pass-through for future standalone callers. Two methods make the two flows explicit at call-sites.

### Decision: `explanation` is optional on create + update inputs, replacing `examples`

**Choice:** Zod schemas: `explanation: z.string().nullable().optional()` on `createCategory`, `updateCategory`, `createSubcategory`, `updateSubcategory`. Remove `examples` from those inputs.
**Rationale:** Matches the DB column (`String?`). Optional at the input layer so partial updates do not need to carry the field. Replacing the `examples` slot keeps the admin form shape roughly parity.

### Decision: Seed writes content directly to category/subcategory rows

**Choice:** Rewrite `seedExplanations.ts` to read existing `seeds/data/<dataset>/explanations/{categories,subcategories}/c<pos>_<name>.md` files and `UPDATE` the matching row's `explanation` column by position + normalized name. No `Explanation` rows are created for per-entity content.
**Alternatives considered:**

- Delete the seed entirely — loses the authored markdown corpus.
  **Rationale:** Preserves existing content authoring workflow. Slug generation is no longer needed and is removed.

## Risks / Trade-offs

- **In-place migration edit** → verify `20260311150053_add_explanation_table` has not been applied in any shared environment before merging. Checked via `prisma migrate status` in each env. If it has been applied anywhere, fall back to a new additive migration that: (1) adds `explanation TEXT` nullable to `category` + `subcategory`, (2) drops `explanation_slug` FKs and columns on both tables, (3) drops `examples` columns on both tables, (4) drops `visible` from `explanation`. The seed re-run in step 3 of the Migration Plan below then populates the new column.
- **Destructive `examples` drop** → any existing `examples` data (seed or user-entered) is lost. Confirmed in scope; no backfill.
- **Missed endpoint still returning `explanationSlug`** → would surface as an unknown field on the client or a runtime error if the column is accessed. Mitigation: Phase 7 grep checklist (`explanationSlug`, `\.examples` in category/subcategory contexts, `ExplanationBaseSchema.*visible`) must return zero hits under `apps/` and `packages/` before merge.
- **Dormant `Explanation` endpoint** → has no callers post-refactor; could rot. Acceptable: documented in proposal as future-work anchor. Integration test coverage retained.
- **Context API break** → every `openExplanation` call site must migrate. No backwards alias provided, so missed call sites fail at type-check. That is the intended safety net.

## Migration Plan

1. Merge schema + migration + seed edits; run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
2. Deploy DB change (pre-deploy migration): adds `explanation` TEXT to both tables, drops `examples`, creates `explanation` table without `visible`, does not create FKs on category/subcategory.
3. Re-run `pnpm --filter database db:seed` in each env to repopulate `category.explanation` / `subcategory.explanation` from `.md` files.
4. Deploy API + web changes together (shared schema; atomic).
5. Post-deploy: smoke test — open carbon inventory, click info icon on a category and a subcategory, confirm markdown renders with no `/explanations/{slug}` network call.

**Rollback:** revert the deploy. Migration rollback requires a manual follow-up migration (restore `examples` column as nullable Text, re-add `explanation_slug` FKs) — destructive `examples` data is gone either way. Given the migration has not been applied in shared envs at edit time, rollback complexity is low; after first shared deploy, rollback is forward-only.

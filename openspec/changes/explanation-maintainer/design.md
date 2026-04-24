## Context

The `Explanation` model (`packages/database/src/prisma/schema.prisma:376-387`) currently holds a `slug`, `content`, and author/updater metadata. Only `GET /api/explanations/:slug` consumes it (public). The table is empty in every deployment; no admin UI exists, so operators cannot edit contextual help content without a code/seed redeploy.

Reduction-project screens (`ReductionProjectsScreen`, `ReductionProjectScreen`, `ReductionProjectFormFields`, `GeiConsideredSection`, `ReportedElsewhereSection`) already render `InfoButton` components with `null` slug props — infrastructure-ready placeholders waiting for concrete slugs.

Existing maintainer screens (categories, subcategories, badges) under `apps/web/src/screens/Maintainer/` establish the UI patterns: `MaintainerLayout`, `MaintainerPageHeader`, `MaintainerDataGrid`, `useCategories`-style query hooks, and an already-existing `ExplanationModal` component used by categories/subcategories for content editing.

Constraints:

- **Country-agnosticism**: catalog lives in code (TypeScript const) so each deployment can reseed without branching; rows are data, not schema.
- **Table currently empty**: schema-breaking column removal is safe.
- **No i18n**: all user-facing strings in Spanish.
- **Zero-warning lint + 80% coverage** enforced.

## Goals / Non-Goals

**Goals:**

- Provide admin + superadmin read/update UI over a fixed, code-declared explanation catalog.
- Keep public `GET /api/explanations/:slug` response lean (slug + content only).
- Make `ExplanationSlug` a compile-time type across web (no string typos at `InfoButton` call sites).
- Preserve existing `content` on re-seed; refresh only `name`/`description` from the catalog.
- Reuse existing `ExplanationModal`, `MaintainerDataGrid`, and query-hook patterns with minimum churn.

**Non-Goals:**

- No create/delete in UI (catalog is code-owned).
- No edit of `slug`, `name`, or `description` from UI.
- No versioning/history of content edits.
- No rich-text editor — plain markdown in a multiline textarea.
- No migration of the existing `getExplanationBySlug` folder to an `app/` subfolder (stays at feature root).

## Decisions

### 1. Split admin routes under a separate route file

Register admin endpoints via a new `apps/api/src/routes/api/admin/explanations/index.ts` with file-level `requireAuth` + `requireRoles([SUPERADMIN, ADMIN])`, mirroring `admin/dashboard/index.ts` and `admin/organizations/index.ts`. The public `apps/api/src/routes/api/explanations/index.ts` stays unchanged.

**Why not** a single route file with mixed auth? Mixing public and admin handlers in one file would force per-route hooks and diverge from the existing admin-scope convention. Splitting keeps auth declarative at the file boundary.

### 2. Catalog as TypeScript const in `@repo/constants`

Introduce `ExplanationSlug` as a `const` object + derived union, plus `EXPLANATION_CATALOG: Record<ExplanationSlug, { name; description? }>`. Web imports the union for `InfoButton` / context types; seeds iterate the record.

**Why not** a Prisma enum? The catalog carries human labels (`name`, `description`) — not just identifiers — and must live in shared code so both seeds and the frontend resolve it without round-tripping through the DB. Prisma enums can't carry metadata.

**Why not** put the catalog in the API only? The web layer needs the union for `openExplanationBySlug` typing; duplicating would let the two drift.

### 3. Drop `createdById` (and `creator` relation)

Rows are system-seeded — `createdById` is always null, and no feature uses it. Removing it now (while the table is empty) avoids carrying a permanently-null column and a dead FK. Keep `updatedById` + `updater` — "who edited this explanation last" is meaningful audit metadata.

**Why not** keep the column nullable? A field that is null by design is noise in every query and in Prisma types. The audit signal lives entirely in `updatedById`.

### 4. Extend `ExplanationBaseSchema` with `name`/`description`; do not extend public response

Add fields to the shared base schema so the admin list response can `z.array(ExplanationBaseSchema)`. The public `getExplanationBySlug` response already picks only `{ slug, content }` from the base, so it's unaffected.

**Why not** extend the public response too? Public consumers (`ExplanationContext` dialog) only render `content`. Leaking `name`/`description` expands the public surface and would bind country deployments to admin-facing copy.

### 5. Immediate commit on save (no dirty-row state)

Each "Editar" opens the modal; "Guardar" fires `PATCH` + invalidates the list query. No multi-row edit mode, no cancel-pending-changes flow.

**Why not** a batch edit mode like categories? Categories need ordering + multi-row add/remove. Explanations have neither — the simpler pattern removes a whole class of form state. Fewer moving parts = fewer bugs in a maintainer screen used rarely.

### 6. Rename `*ExplanationId` props to `*ExplanationSlug` while wiring

Props pre-date the slug refactor and now carry slugs. Rename during wiring to prevent future confusion and to align with `openExplanationBySlug`.

**Why not** defer the rename? All 3 callers ship in the same PR; the cost is grep-and-replace across 4 files. Deferring leaves type-lies in the tree.

### 7. Narrow `openExplanationBySlug: (slug: ExplanationSlug | null) => void`

Cascade to section-component props (`*ExplanationSlug?: ExplanationSlug | null`). TypeScript now rejects any stringly-typed slug at a call site.

**Why not** keep `string | null`? The whole point of the catalog is a closed set — typing it as `string` defeats the catalog's purpose.

### 8. Upsert-based standalone seed that preserves `content`

`seedStandaloneExplanations` iterates `EXPLANATION_CATALOG` with `upsert({ where: { slug }, create: { slug, name, description, content: "" }, update: { name, description } })`. The update clause omits `content`, so operator-authored content survives a reseed.

**Why not** `createMany({ skipDuplicates: true })`? It would never refresh `name`/`description` when we add or rename catalog entries, producing drift between code and DB.

The admin read/write endpoints mirror this same catalog filter (`where: { slug: { in: EXPLANATION_CATALOG slugs } }` on list, `404` on update for unknown slugs), so the catalog is the sole source of truth end-to-end — a slug removed from code immediately disappears from the admin surface while its content stays intact in DB.

### 9. Content validation: empty allowed, max 10 000 chars

Empty is a legal "not yet authored" state (operator hasn't filled it in). 10 000 chars is a pragmatic upper bound — well above any realistic markdown blurb, far below payload-size concerns.

### 10. Admin nav visibility: SUPERADMIN + ADMIN

Categories maintainer is SUPERADMIN-only. Explanations is intentionally broader: content editing is lower-risk than taxonomy changes, and ADMIN operators in-country typically author help text.

## Risks / Trade-offs

- **Schema column drop on a shipped model** → Safe today because the table is empty in all deployments; verify pre-deploy by checking row count in each environment. If any row existed, we'd need a data migration.
- **Catalog drift between code and DB** → Reseed upserts every slug in `EXPLANATION_CATALOG`, so adding a slug provisions the row. Removing a slug leaves an orphan row in DB, but the admin list query filters with `where: { slug: { in: EXPLANATION_CATALOG slugs } }` (and `updateExplanation` rejects unknown slugs with `404`), so orphans are never returned from the API or rendered in the maintainer screen. Orphans are inert and their `content` is preserved; if the slug is re-added later, the existing row is picked up by the upsert. No manual `DELETE` needed for correctness.
- **Empty-content rows visible in the UI** → By design. Operators see empty entries and fill them in. `InfoButton` in reduction-project screens must handle empty `content` gracefully — render no button (or a neutral disabled state) rather than opening an empty modal. Verify during manual QA with a catalog slug whose DB row has `content = ""`.
- **Prop rename churn** → Contained to 4 web files (3 components + 1 caller). Grep-verified scope.
- **`ExplanationModal` extension** → Only adds optional `loading?: boolean`; existing category/subcategory call sites unchanged.
- **10 000-char limit** → If operators later need longer content, bumping the limit is a one-line Zod change + DB column is already `Text` (unbounded).

## Migration Plan

1. Merge schema change → `pnpm --filter database dev:generate && pnpm --filter database dev:build` locally; Prisma migration SQL auto-generated.
2. Apply migration (drops `createdById` column + FK, adds `name` NOT NULL with no default).
3. Run seed (or `seedExplanations` alone) to populate the 5 catalog rows.
4. Deploy API + web together (admin routes require the new types package and vice versa).
5. Smoke-test `/admin/explanations` as ADMIN and as USER (redirect to dashboard).

**Rollback**: if the migration fails or content needs reverting, the reverse migration is `ALTER TABLE` restoring `createdById` and dropping `name`/`description`. Because `content` edits are the only user-generated data, a `pg_dump` of the `Explanation` table before deploy is a sufficient safety net.

## Open Questions

- None blocking. Future consideration: if the catalog grows beyond ~20 slugs, we may want pagination and server-side search instead of client-side filtering — out of scope for v1.

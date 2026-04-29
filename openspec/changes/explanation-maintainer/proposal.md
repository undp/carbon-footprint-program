## Why

The `Explanation` table exists in the schema but is empty and has no admin UI — content cannot be edited post-deploy. Reduction-project screens already have `InfoButton` placeholders waiting to resolve slugs, so end users currently see no contextual help. An admin/superadmin-facing maintainer is needed so operators can author markdown content per country deployment without code changes, keeping the platform country-agnostic.

## What Changes

- Add an admin-only explanations maintainer screen at `/admin/explanations` (SUPERADMIN + ADMIN) with a searchable, sortable table and per-row edit via a reused `ExplanationModal`.
- Extend the `Explanation` model with `name` (required) and `description` (optional) columns, seeded from a new shared code catalog; slug stays immutable.
- **BREAKING** (internal, table currently empty): remove `createdById` + `creator` relation from `Explanation` (rows are system-seeded, never user-created); drop the matching back-relation on `User`.
- Introduce a shared `ExplanationSlug` union + `EXPLANATION_CATALOG` in `@repo/constants` with 5 initial reduction-project slugs.
- Add admin API endpoints: `GET /api/admin/explanations` (list sorted by name ASC) and `PATCH /api/admin/explanations/:slug` (update content only, max 10 000 chars, empty allowed).
- Extend `seedExplanations` to upsert standalone catalog entries on re-seed while preserving existing `content`.
- Wire the 5 existing `null` `InfoButton` slots in reduction-project screens to concrete slugs, renaming legacy `*ExplanationId` props to `*ExplanationSlug` and narrowing `openExplanationBySlug` to `ExplanationSlug | null` for compile-time safety.
- Public `GET /api/explanations/:slug` endpoint response stays unchanged (`{ slug, content }`).

## Capabilities

### New Capabilities

- `explanation-maintainer`: admin-facing read+update workflow over the system-seeded `Explanation` catalog, including the shared slug catalog, admin endpoints, and maintainer screen.

### Modified Capabilities

<!-- None — no existing spec requirements change. -->

## Impact

- **Database**: `Explanation` schema change (add `name`, `description`; drop `createdById` + `creator`); matching `User` back-relation removal. Migration via `pnpm --filter database dev:generate && pnpm --filter database dev:build`. Safe because the table is empty in all deployments.
- **Shared packages**: new `packages/constants/src/explanations.ts`; extended `packages/types/src/baseSchemas/explanation.ts`; new `packages/types/src/explanations/admin/**`.
- **API**: new `apps/api/src/features/explanations/admin/**`; new admin route file `apps/api/src/routes/api/admin/explanations/index.ts`; new `explanationFactory` for tests.
- **Web**: new maintainer screen, route, query hooks, `Routes.ADMIN_EXPLANATIONS` constant, sidebar entry; minor `ExplanationModal` extension (`loading?: boolean`); prop renames across 3 reduction-project components + 1 caller.
- **Seeds**: new `seedStandaloneExplanations` helper called from `seedExplanations`.
- **Tests**: integration tests for both new admin endpoints.
- **No changes to** public `getExplanationBySlug` endpoint, reduction-project domain logic, or existing category/subcategory maintainers.

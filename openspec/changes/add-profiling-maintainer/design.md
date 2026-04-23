## Context

`country_sector` and `country_subsector` are the backbone of organization profiling: every organization's `OrganizationData` references a sector (rubro) and optionally a subsector (subrubro), and `OrganizationMainActivity` rows hang off both. Today the catalog is managed exclusively via seed files and SQL — there is one read-only endpoint (`GET /country-sectors`) that populates the org-creation form, but no admin surface to create, rename, or retire rows without a redeploy. For a country-agnostic platform meant to be operated by each country's own team, this is an operational bottleneck.

The admin sidebar already reserves a "Rubros" branch with a single `Under Construction` child ("Actividades Principales"). That placeholder is inert and visible only to SUPERADMIN. The path forward is to fold it into a new, higher-level "Perfilamiento" group, open to `[ADMIN, SUPERADMIN]`, that houses all catalog maintainers tied to organization profiling.

The Categorías / Sub-categorías pair is the reference pattern for hierarchical maintainers in this codebase: two separate screens, separate sidebar entries, subsector rows carry a `categoryId` foreign key rendered as a dropdown column, editing happens inline row-by-row in a `MaintainerDataGrid`, and navigation is blocked while a row is dirty. That pattern maps cleanly here, with one caveat: Categorías / Sub-categorías are scoped to a `MethodologyVersion` (published vs. draft → view-only vs. editable); sectors / subsectors are not scoped to anything.

## Goals / Non-Goals

**Goals:**

- Provide admin CRUD over `country_sector` and `country_subsector` consistent with the existing maintainer UX.
- Add a `description` field to both tables, visible in the UI and round-tripped through the API.
- Restructure the admin sidebar to introduce a "Perfilamiento" group that houses the two new maintainers plus the existing "Actividades Principales" placeholder.
- Widen access to `[ADMIN, SUPERADMIN]` for the entire "Perfilamiento" group.
- Keep the existing app-facing `getAllCountrySectors` endpoint working unchanged for the organization-creation form.
- Block destructive deletes: refuse to delete a sector or subsector that is still referenced.
- Preserve country-agnosticism: no hardcoded country values, single-country singleton resolved via `country.findFirst()`.

**Non-Goals:**

- No soft-delete or archival mechanism (`deletedAt`). If a row cannot be deleted due to references, the user must clear them first.
- No bulk import / CSV upload. Admins edit row-by-row.
- No reordering (no `sortOrder` column). Rows sort alphabetically, matching the existing read endpoint.
- No translation of `name` or `description` (country-agnostic ≠ multi-language; each deployment picks one language).
- No implementation of the "Actividades Principales" screen — it remains `UnderConstructionScreen`, only its auth gate and sidebar location change.
- No change to `country_sector` / `country_subsector` usage at the organization-profiling (`OrganizationData`) layer.

## Decisions

### Decision: Two separate screens, not master-detail

**Choice:** Mirror the Categorías / Sub-categorías pattern — `/admin/sectors` and `/admin/subsectors` each render their own `MaintainerDataGrid`. The Subsectors screen has a `Rubro` dropdown column for the parent.

**Alternatives considered:**

- Master-detail single screen (list on the left, children on the right) — gives the clearest jerarchy view but requires a brand-new component with no precedent in the codebase, and the user explicitly selected "Opción A".
- Expandable tree grid — MUI DataGrid's tree-data support is clunky and would force a custom component.

**Rationale:** Maximum reuse of the existing maintainer pattern (layout, DataGrid, hooks) and zero new UI concepts to learn. The "two sidebar entries" cost is the accepted trade-off.

### Decision: Decouple `MaintainerScreenLayout` from methodology scope

**Choice:** Make `scope: ScopedMethodologyContext` optional on `MaintainerScreenLayoutProps`. When absent, the header renders without the methodology selector and `isViewOnly` defaults to `false`. `useMaintainerEditingState` and `useMaintainerExitEditMode` accept `methodologyVersionId?: string | null`; when omitted, methodology-reset effects become no-ops.

**Alternatives considered:**

- Fork a `MaintainerSimpleScreenLayout` with no scope — duplicates ~150 lines of layout for no gain.
- Pass a stub `scope` object with neutralized values from the new screens — leaks the methodology concept into unrelated features.

**Rationale:** The layout's responsibility is "maintainer chrome" (title, add button, edit toolbar, exit-edit dialog); methodology scope is an orthogonal concern that only some maintainers have. Making it optional is a small, non-breaking change that existing callers tolerate without edits.

### Decision: Admin endpoints live under `admin/` subdirectory, separate from public read

**Choice:** New endpoints go under `apps/api/src/features/countrySectors/admin/` (and mirrored subsectors directory), not alongside the existing `getAllCountrySectors`. The existing `getAllCountrySectors` endpoint remains at `apps/api/src/features/countrySectors/getAllCountrySectors` and serves the organization form unchanged (no `description`, no auditor fields).

**Alternatives considered:**

- Extend the existing public endpoint to return `description` and add auditor fields conditionally — leaks admin-only columns to anonymous / non-admin callers.
- Put everything flat under `features/countrySectors/` — mirrors today's structure but hides the authorization boundary.

**Rationale:** `admin/` segregation matches the convention already in place for organizations (`apps/api/src/features/organizations/admin/` vs. `organizations/app/`). It also makes the authorization surface obvious at a glance — everything under `admin/` requires `ADMIN` or `SUPERADMIN`.

### Decision: Delete blocks on any reference; no cascade, no soft-delete

**Choice:** `deleteCountrySector` throws `DataIntegrityError` if any of the following exist:

- `CountrySubsector` with `countrySectorId = id`
- `OrganizationMainActivity` with `countrySectorId = id`
- `OrganizationData` with `countrySectorId = id`
- `SubcategoryRecommendation` referencing the sector

Mirror for `deleteCountrySubsector`: block on `OrganizationMainActivity`, `OrganizationData`, `SubcategoryRecommendation` referencing the subsector.

Reference existence checks happen inside an interactive Prisma transaction (read-then-write → TOCTOU) ahead of the delete call.

**Alternatives considered:**

- Cascade delete — catastrophic for `OrganizationData` (would erase organization profiling on sector deletion).
- Soft delete via `deletedAt` column — larger scope, requires plumbing through every consumer that reads sectors/subsectors and every unique constraint.
- `SET NULL` on the dependent columns — silently corrupts organization profiling data.

**Rationale:** Blocking puts the burden of data cleanup on the admin who initiated the delete, surfaces the real-world impact upfront, and keeps the schema shape unchanged. The UX cost is acceptable for a low-frequency admin operation.

### Decision: Unique-constraint violations → mapped Spanish messages

**Choice:** Wrap `create` / `update` service bodies in try/catch around Prisma P2002 errors; use `extractP2002Fields()` from `apps/api/src/errors/` to detect which unique constraint fired and map to a domain-specific `DatabaseUniqueConstraintViolationError` with a Spanish `userMessage`. Add error codes to `getApiErrorMessage` in the web app if not already generic-enough.

**Alternatives considered:**

- Pre-check for name uniqueness before insert — adds a query, still requires try/catch for the race.
- Surface raw Prisma error codes to the client — breaks the Spanish-UX requirement.

**Rationale:** Matches the error-handling convention already used across `categories` / `subcategories` / `organizations`. The extra `try/catch` is cheap and avoids TOCTOU.

### Decision: `description` nullable, optional on input, max 2000 chars

**Choice:** DB column `String?` (nullable). Zod: `description: z.string().trim().max(2000, { message: "La descripción no puede superar 2000 caracteres" }).nullable().optional()` on create + update inputs. UI renders a multi-line textarea that can be left blank. Empty string → persist as `null` (normalize in service). Existing rows without descriptions keep `null`.

**Alternatives considered:**

- Required description — breaks backward compatibility; every existing seed row would violate.
- `@db.Text` unbounded — no upper guardrail; lets admins paste arbitrarily large strings.

**Rationale:** Optional nullable is the only shape that preserves backward compatibility with existing data. 2000 chars is a soft-reasonable cap for a short explanatory blurb (matches the usage intent: "what this rubro covers"), far smaller than any realistic DB-level issue.

### Decision: Single-country resolution via `country.findFirst()`

**Choice:** Create endpoints resolve `countryId` via `prismaClient.country.findFirst({ orderBy: { id: "asc" } })` — same pattern as `createMethodology` and `createOrganization`. If no country exists, throw `NoCountryFoundError` (already defined).

**Alternatives considered:**

- Accept `countryId` in the request body — leaks the multi-country abstraction that no Huella Latam deployment uses.
- Inject via a server-side constant / env var — adds deployment friction and config surface.

**Rationale:** Every deployment has exactly one `Country` row today. The pattern is already established; being consistent beats inventing new country-resolution code.

### Decision: Sidebar restructure — "Rubros" disappears, "Perfilamiento" absorbs its child

**Choice:** `SIDEBAR_DEFS` in `MaintainerLayout.tsx`:

- Remove the `Rubros` top-level entry (parent of today's `Actividades Principales`).
- Insert `Perfilamiento` (icon `BusinessCenterOutlined`, `requiredRoles: [ADMIN, SUPERADMIN]`) in the same position, with three children in this order: `Rubros` (→ `/admin/sectors`), `Subrubros` (→ `/admin/subsectors`), `Actividades Principales` (→ `/admin/main-activities`, unchanged destination).
- Drop `Routes.ADMIN_ITEMS` from the routes constant and delete `apps/web/src/routes/admin/items.tsx`.

**Alternatives considered:**

- Keep "Rubros" and add "Perfilamiento" as a sibling group — produces two overlapping concepts ("Rubros" as top-level + "Rubro y Subrubro" inside "Perfilamiento") that would confuse admins.
- Rename "Rubros" → "Perfilamiento" in place — fine, but loses the opportunity to house subsectors and actividades principales under one coherent group.

**Rationale:** The user confirmed they wanted "Rubros" gone and "Actividades Principales" moved under "Perfilamiento" (decision 1). Drops an orphaned route file and keeps the information architecture clean.

### Decision: Query-key segregation between admin and app hooks

**Choice:** Admin-side hooks use a distinct key namespace — e.g. `countrySectorsKeys.admin.list()` vs. `countrySectorsKeys.app.list()`. Admin mutations invalidate the admin list; the app list is invalidated separately only where cross-effects matter (creating/deleting a sector could affect the org-creation form's dropdown, so admin mutations MUST also invalidate `countrySectorsKeys.app.all`).

**Alternatives considered:**

- Single shared key — forces admin and form consumers to share cache entries even though their response shapes differ (admin returns `description` + auditors, app does not).
- Admin mutations invalidate only admin keys — leaves stale dropdowns in the org-creation form until a hard refresh.

**Rationale:** Admin and app responses are intentionally different shapes; sharing keys would force a union type across consumers. Cross-invalidating on mutation is the right compromise — admin writes are low-frequency, so aggressive invalidation has negligible cost.

## Risks / Trade-offs

- **Sidebar refactor is a breaking UX change for SUPERADMINs** who currently navigate via "Rubros → Actividades Principales". The destination URL is unchanged (`/admin/main-activities`), so bookmarks still work, but the breadcrumb / menu path changes. Acceptable; no release-notes concern for an admin-only placeholder screen.
- **Widening "Actividades Principales" auth from SUPERADMIN to [ADMIN, SUPERADMIN]** is intentional, but the current screen is `UnderConstructionScreen` — no real behavior to guard. When that maintainer is actually implemented, it will need its own auth review.
- **Decoupling `MaintainerScreenLayout` from scope** touches a component used by 5 existing screens. Each existing caller must be re-tested to confirm the optional-scope refactor is truly non-breaking (the change is purely additive at the type level: existing callers still pass `scope`, new callers omit it).
- **Delete-blocking across 4 reference types on sector** and 3 on subsector means the integration test matrix is larger than for simpler features; any missed reference type silently enables accidental cascade deletes at the Prisma default-FK level. Mitigation: one integration test per reference type.
- **Shared `DatabaseUniqueConstraintViolationError` mapping** must be verified not to regress existing P2002 users; add a smoke test around categories/subcategories unique-violation messages during implementation to catch accidental message shadowing.
- **`country.findFirst()` silently picks the lowest-id country** in a multi-country DB. Huella Latam is single-country by deployment, so this is safe in practice, but the invariant should be documented inline.
- **No reordering / `sortOrder`** means admins cannot pin a particular rubro to the top of the organization-form dropdown. If product asks for this later, it is an additive migration + column; acceptable scope deferral.

## Migration Plan

1. Merge schema + migration: `packages/database/src/prisma/migrations/<timestamp>_add_description_to_country_sector_and_subsector/migration.sql` adds nullable `description TEXT` columns. Run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
2. Deploy DB change (pre-deploy migration). No seed re-run required; existing rows keep `description = NULL`.
3. Deploy API + web changes together (shared types, atomic).
4. Post-deploy smoke test: (a) log in as ADMIN, confirm "Perfilamiento" group is visible with three children; (b) create, rename, delete a test rubro; (c) attempt to delete a rubro that has associated organizations → confirm blocking error in Spanish; (d) create a subrubro under the test rubro; (e) confirm the organization-creation form in the app still shows the test rubro in its dropdown.
5. **Rollback**: revert the deploy. Migration rollback requires a manual follow-up migration (`DROP COLUMN description` on both tables) — no data loss since the column is admin-only and starts empty.

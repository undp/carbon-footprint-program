## Context

The four profiling catalogs — `country_sector`, `country_subsector`, `organization_main_activity`, `country_organization_size` — are the backbone of organization profiling: every `OrganizationData` record references them, every carbon inventory profiling screen depends on them, and they drive downstream artifacts like `SubcategoryRecommendation`. Today they are managed exclusively by seed files and SQL; the admin sidebar reserves a "Rubros" branch whose single child ("Actividades Principales") is an `UnderConstructionScreen`. For a country-agnostic platform, the absence of an admin UI is an operational bottleneck.

A first draft of this change proposed: hard-delete with reference blocking, reuse of `MaintainerScreenLayout` by making its methodology `scope` optional, and two maintainers (Rubros + Subrubros) leaving Actividades Principales as a placeholder. User review during exploration reversed three of those positions. This document captures both the original decisions (marked **superseded**) and the new ones, so reviewers can see the reasoning chain.

The Categorías / Sub-categorías pair remains the codebase reference for hierarchical maintainers, and this change still borrows its DataGrid / hooks skeleton. The divergence is at the layout level (see Decision: dedicated simpler layout) and at the data lifecycle level (see Decision: soft-delete replaces hard-delete).

## Goals / Non-Goals

**Goals:**

- Provide admin CRUD over all four profiling catalogs, consistent with each other and with the inline-edit DataGrid convention.
- Support soft-delete with restore; preserve historical references so consumer screens keep rendering human-readable labels.
- Gate edits that would propagate to existing users behind an explicit "in use" confirmation dialog.
- Restructure the admin sidebar into a single "Perfilamiento" group housing the four maintainers, open to `[ADMIN, SUPERADMIN]`.
- Keep public read endpoints backward-compatible in shape; filter DELETED rows at the service layer without changing response schemas.
- Preserve country-agnosticism: single-country singleton resolved via `country.findFirst()` for create endpoints that need it.

**Non-Goals:**

- No hard-delete. Once soft-delete is the model, there is no "purge" action. If a row must be physically removed, that is a DB-level operation outside this change.
- No bulk import / CSV upload.
- No reordering (no `sortOrder` column). Rows sort alphabetically.
- No translation of `name` or `description`.
- No cascade soft-delete. A sector with ACTIVE catalog children is blocked from soft-delete; the admin must clear the children first.
- No backend `?includeIds=` parameter on public endpoints; the union is computed on the frontend.

## Decisions

### Decision: Soft-delete replaces hard-delete (supersedes prior ADR)

**Choice:** Every `DELETE /admin/…/:id` transitions the target row to `status = DELETED` inside a transaction. Existing references keep pointing at the row. A sibling `POST /admin/…/:id/restore` endpoint reverses the transition.

**Supersedes:** The prior ADR "Delete blocks on any reference; no cascade, no soft-delete" (previous `design.md`). The prior rationale — "keeps the schema shape unchanged" and "burden of cleanup on the admin" — was overturned because (a) the burden is impractical in production (a sector used by thousands of organizations cannot realistically be cleaned up before retirement), and (b) the catalog is inherently versioned: an entry's obsolescence does not retroactively invalidate the data that was captured under it.

**Alternatives considered:**

- Keep hard-delete with reference blocking (the prior ADR) — blocks all meaningful deletions in production.
- Cascade hard-delete — catastrophic for historical `OrganizationData`.
- Coexist hard-delete + soft-delete as separate actions — doubles the UX surface with no clear rule for when each applies.

**Rationale:** Soft-delete matches the real-world lifecycle ("this is no longer selectable going forward") while preserving historical integrity. The cost — extra column, filter everywhere, partial indexes, selector union — is one-time and contained inside this change.

### Decision: `status` enum only; `updatedAt` doubles as the soft-delete timestamp

**Choice:** Add a `status` column, defaulting to `ACTIVE`, to each of the four tables, typed by a **dedicated enum per table**:

- `country_sector.status: CountrySectorStatus { ACTIVE, DELETED }`
- `country_subsector.status: CountrySubsectorStatus { ACTIVE, DELETED }`
- `organization_main_activity.status: OrganizationMainActivityStatus { ACTIVE, DELETED }`
- `country_organization_size.status: CountryOrganizationSizeStatus { ACTIVE, DELETED }`

**Do not** add a dedicated `deletedAt` column. When an admin soft-deletes, the service issues `status = 'DELETED'`; Prisma's `@updatedAt` automatically refreshes `updatedAt`, which becomes the implicit deletion timestamp.

**Alternatives considered:**

- Dedicated `deletedAt DateTime?` column — more explicit but duplicates `updatedAt` for DELETED rows; a status change is always an update, so the timestamp is already captured.
- Single `deletedAt DateTime?` column (no `status`) — classic Rails pattern; breaks the "status toggle" mental model and forces every query to use `WHERE deleted_at IS NULL` instead of the more readable `WHERE status = 'ACTIVE'`.
- **One shared `MaintainerRecordStatus` enum across the four tables** — tempting for reuse, but couples the four catalogs at the type level. If any one of them later needs a third state (e.g., `ARCHIVED` on `country_organization_size`), extending the shared enum drags all siblings into the change and forces unnecessary migrations on the others. Per-table enums keep each catalog evolvable independently at the cost of four near-identical type definitions — a cheap, local duplication.

**Rationale:** Status-as-enum reads naturally in filters and matches how admin UI thinks about the state ("Active" / "Deleted"). Reusing `updatedAt` is not lossy because every soft-delete IS an update — the timestamp semantics align. If we later need a distinct "last non-status update" vs. "deletion time" breakdown, we can add `deletedAt` additively without reworking the schema.

### Decision: Catalog-level references block soft-delete; user-data references do not

**Choice:** Soft-delete is blocked (throws `DeleteBlockedByReferencesError`, HTTP `409`) when another _catalog_ record still references the target in an ACTIVE state. User-data references (everything under `organization_data` and related carbon-inventory-profiling records) do NOT block — they are exactly what soft-delete is designed to tolerate.

Blocking matrix:

| Target soft-delete           | Blocked by (ACTIVE only)                                                                                                 | NOT blocked by                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `country_sector`             | `country_subsector.countrySectorId`, `organization_main_activity.countrySectorId`, `subcategory_recommendation.sectorId` | `organization_data.sectorId`                  |
| `country_subsector`          | `organization_main_activity.countrySubsectorId`, `subcategory_recommendation.subsectorId`                                | `organization_data.subsectorId`               |
| `organization_main_activity` | — (no catalog record references main activity)                                                                           | `organization_data.mainActivityId`            |
| `country_organization_size`  | —                                                                                                                        | `organization_data.countryOrganizationSizeId` |

**Alternatives considered:**

- Never block (even if a subsector is ACTIVE under a sector, soft-delete the sector and orphan the child) — produces a nonsensical state where the child is ACTIVE but its parent is DELETED. Selector behavior becomes undefined.
- Cascade soft-delete (deleting a sector soft-deletes all ACTIVE subsectors + main activities under it) — silently changes the state of entities the admin did not explicitly touch; a rename is irreversible without a separate restore pass per child. Too lossy.

**Rationale:** Blocking at the catalog boundary keeps the invariant "every ACTIVE record points at ACTIVE parents" without requiring explicit cascade semantics. The admin is guided to clear the catalog children first (itself a soft-delete), preserving intent at each step.

### Decision: Partial unique indexes scoped to `status = 'ACTIVE'`

**Choice:** Drop the existing full-table `@@unique` constraints and replace them with partial unique indexes on `(… , name) WHERE status = 'ACTIVE'`. Declared via raw SQL in the migration because Prisma does not support partial indexes natively. The Prisma schema retains the columns but removes the `@@unique(...)` attribute; a `@@index(..., map: "…")` or equivalent comment documents the partial index for future schema reviewers.

**Alternatives considered:**

- Composite unique including `status` (`@@unique([countryId, name, status])`) — enforces uniqueness across the full `(countryId, name, status)` triplet, so it correctly rejects a second ACTIVE row with the same `(countryId, name)` AND a second DELETED row with that same `(countryId, name)`. What it permits is one ACTIVE plus one DELETED sharing the same `(countryId, name)`, which is the part we want — but the cost is that the constraint applies symmetrically to the DELETED side, forcing a rename on every soft-delete pair. A partial unique index `(countryId, name) WHERE status = 'ACTIVE'` (the chosen approach) is the cleaner fit: only the ACTIVE subset is constrained, DELETED rows are free to share names with each other (audit history retains the original label without contortion), and restore-side collisions are handled at the endpoint with an explicit 409.
- Rename-on-delete (append `_deleted_<timestamp>` to name when soft-deleting) — corrupts the display label for historical references that still render the name.
- No uniqueness when DELETED — admin can create a new ACTIVE "Industria" while a DELETED "Industria" exists; restore collision handled at the endpoint level with a 409.

**Rationale:** Partial index is the exact semantic we want: "at most one ACTIVE row per name scope; DELETED rows are free to share names with each other or with the ACTIVE one." The operational cost (raw SQL, Prisma blind spot on future migrations) is mitigated by a CLAUDE.md note and a visible comment in the schema.

### Decision: Restore collision handling via 409 at the endpoint

**Choice:** `POST /admin/…/:id/restore` validates inside a transaction that no currently-ACTIVE row shares the target's unique scope (`(countryId, name)` for sector/size, `(countrySectorId, name)` for subsector, `(name, countrySectorId, countrySubsectorId)` for main activity). If a collision exists, respond `409` via `DatabaseUniqueConstraintViolationError` with a Spanish `userMessage` instructing the admin to first rename or soft-delete the colliding ACTIVE row.

**Alternatives considered:**

- Auto-rename the restored row on collision — produces silent semantic drift.
- Restore + hard-delete the ACTIVE colliding row — destructive, not reversible.

**Rationale:** Surfacing the collision lets the admin decide which label the live catalog should carry. The error is recoverable (they can rename either row and retry).

### Decision: Front-side union for selectors (no backend `?includeIds=`)

**Choice:** Public list endpoints return only `status = ACTIVE` rows. Forms that render these catalogs as selectors MUST merge the form's initial value (`{ id, name }`) into the options list, de-duplicated by `id`, before rendering. A small shared helper (`mergeSelectedOption(options, selected)`) goes into `apps/web/src/utils/` for reuse.

**Alternatives considered:**

- Backend `?includeIds=5,12` parameter — centralizes the logic server-side but requires every selector consumer to pass the right ids, couples the public API shape to a UI concern, and needs schema changes.
- Return DELETED rows in the public endpoint with a `status` field, let the front filter — regresses privacy of "retired" entries for non-edit consumers, and forces every public-API consumer to filter.
- Fetch the single DELETED entity separately by id — doubles the query count on every form mount.

**Rationale:** The front already has the `{ id, name }` of whatever the parent resource stored; merging is trivial and purely UI-scoped. Public API stays shape-stable, and the concern is contained to selector components.

### Decision: Dedicated simpler layout (supersedes prior ADR)

**Choice:** Introduce `ProfilingMaintainerScreenLayout` under `apps/web/src/screens/Maintainer/components/`. It wraps `MaintainerPageHeader` (reused via its `extra` slot to host the status filter) and `UnsavedChangesDialog`, with a `FormProvider` wrapper and a grid container. It does NOT include: methodology selector, InfoBanner, EditModeToolbar, or ExitEditModeDialog. The existing `MaintainerScreenLayout` is **not modified**.

**Supersedes:** The prior ADR "Decouple `MaintainerScreenLayout` from methodology scope" (previous `design.md`). That plan would have made `scope`, `isViewOnly`, and the exit-edit flow conditional on a non-profiling caller; the branching would touch ~5 existing callers and leak no-op branches throughout the component.

**Alternatives considered:**

- Make `scope` optional on the existing layout (the superseded plan) — fragile conditionals in a shared component used by five other screens.
- Inline the layout into each profiling screen — duplicates ~80 lines four times.

**Rationale:** The profiling maintainers have a genuinely simpler chrome (no methodology scope, no view-only mode, no edit-mode toolbar). A parallel component expresses that simplicity directly. The duplication vs. `MaintainerScreenLayout` is small and worth it to keep each component focused on its own lifecycle.

### Decision: "In use" edit-warning dialog — trigger rules

**Choice:** Introduce a shared `InUseWarningDialog` under `apps/web/src/screens/Maintainer/components/dialogs/`. The maintainer screens call it on row save, before issuing the PATCH, when **both** conditions hold:

1. The edit changes a **visible** field — `name` (all four domains), `countrySectorId` (subsector, main activity), or `countrySubsectorId` (main activity). `description` changes are exempt.
2. The target row has user-data references — the admin list endpoint returns `isInUse: boolean` per row, computed at query time as `OR` over the relevant `organization_data.*` counts (and `organization_main_activity.*` for sector/subsector, since those are admin-level references that still affect users transitively via the main activity dropdown).

If both hold, the dialog blocks the PATCH until the admin confirms. Confirm → PATCH; Cancel → stay in edit mode.

**Alternatives considered:**

- Always warn on any edit — noisy for description-only edits and for freshly-created rows that nobody uses yet.
- Warn only on rename, even if the row is not in use — misleading because no one is affected.
- Compute `isInUse` lazily per-click instead of in the list response — extra round-trip on every edit confirm; list-response computation is one query per row via Prisma `_count` select.

**Rationale:** The warning's value is proportional to the number of affected consumers; firing it only when consumers exist AND a visible field changes matches the dialog's copy ("afectará a todos los usuarios que lo tengan seleccionado").

### Decision: Admin list — toggle + restore (`?status=active|deleted|all`)

**Choice:** The admin `GET /admin/…` endpoints accept `?status=active|deleted|all`, defaulting to `active`. The maintainer screen exposes a tri-state toggle in the `MaintainerPageHeader`'s `extra` slot. DELETED rows render in a visually distinct style (dimmed row, `Chip` with "Eliminado") and expose a `Restore` action button in place of the usual edit / delete row actions. The edit-warning dialog does not apply to DELETED rows because they cannot be edited (restore first).

**Alternatives considered:**

- Two separate screens (one for ACTIVE, one for DELETED) — doubles sidebar entries.
- Inline DELETED rows with the ACTIVE ones, no toggle — clutters the default admin view.

**Rationale:** Default `active` keeps the primary workflow clean; the `all` option supports audit inspection; the `deleted` option makes restore discoverable. The admin stays on one screen.

### Decision: Admin endpoints live under `admin/` subdirectory, separate from public read

**Choice (carried forward, unchanged):** New endpoints go under `apps/api/src/features/{domain}/admin/`, not alongside the existing public endpoints. Admin responses carry `status`, `description`, auditor ids, and `isInUse`; public responses stay flat (`id`, `name`, and parent-name where applicable).

**Rationale:** Matches the existing `organizations/admin/` vs. `organizations/app/` segregation and makes the authorization boundary obvious.

### Decision: Single-country resolution via `country.findFirst()`

**Choice (carried forward):** Create endpoints resolve `countryId` via the singleton pattern. Create payloads do not accept `countryId`. Applies to sector, organization-size (both scoped to country); subsector scopes to `countrySectorId` instead; main activity has no country/sector scope in its unique constraint, but when creating it with a sector/subsector the server validates the parent exists.

### Decision: Sidebar restructure — four children under "Perfilamiento"

**Choice:** `SIDEBAR_DEFS` in `MaintainerLayout.tsx`:

- Remove the `Rubros` top-level entry.
- Insert `Perfilamiento` (icon `BusinessCenterOutlined`, `requiredRoles: [ADMIN, SUPERADMIN]`) in the same position.
- Four children in this order: `Rubros` (→ `/admin/sectors`), `Subrubros` (→ `/admin/subsectors`), `Actividades Principales` (→ `/admin/main-activities`), `Tamaño de la Organización` (→ `/admin/organization-sizes`).

The prior plan left `Actividades Principales` as an `UnderConstructionScreen`; this update swaps it for the real maintainer screen.

### Decision: `country_organization_size` gains auditor fields

**Choice:** Add `createdById BigInt?` and `updatedById BigInt?` to `country_organization_size`, with Prisma relations mirroring the other three models. No data migration for existing rows (they keep `NULL`).

**Rationale:** Consistency across the four profiling maintainers — same admin UX would otherwise expose auditor columns on three screens and blank on the fourth.

## Risks / Trade-offs

- **Schema change is cross-cutting.** Four tables gain a `status` column, four tables gain `description`, one gains auditors. The migration must be atomic; a partial rollout leaves the API expecting columns that don't exist. Coordinate deploy as a single pre-deploy migration + single API+web release.
- **Partial unique indexes are Prisma-invisible.** Any future migration that regenerates the unique constraint (e.g., via `prisma migrate dev` diffing against the schema) will silently recreate a full-table unique index, breaking the soft-delete invariant. Mitigations: (a) inline SQL comment in the migration file; (b) CLAUDE.md note; (c) PR-level checklist item "did you preserve the partial index?" when touching these tables.
- **`isInUse` count on every list row.** For sector this means counting across four reference tables per row. On a representative dataset (say 50 sectors × 4 counts × a few thousand organizations) this is not a concern, but if the list grows, move to an on-demand endpoint (`GET /admin/country-sectors/:id/usage`) and drop `isInUse` from the list. Not a day-one concern.
- **Widening `main-activities` auth AND swapping its component at once** is an intentional combined change; reviewers should verify (a) the real component works under ADMIN and SUPERADMIN, (b) no audit log expects SUPERADMIN-only writes to `organization_main_activity`.
- **Restore collision UX.** If an admin soft-deletes "Industria" and then creates a fresh "Industria", the soft-deleted row cannot be restored without first renaming or soft-deleting the new one. This is inherent to the chosen uniqueness model; the error message must be explicit so the admin knows what to do.
- **Union-on-front helper is easy to forget.** Every new selector that consumes these catalogs needs the merge call. Document the helper, add a linting convention (e.g., name the dropdown options `mergedSectorOptions`) and surface it in the new maintainers doc.
- **Delete-block status is HTTP 409 via a dedicated `DeleteBlockedByReferencesError`.** Blocking a soft-delete because of ACTIVE catalog references is business-rule validation, not a server failure, so it must surface as a 4xx (matches the repo's `DatabaseUniqueConstraintViolationError` precedent at 409). Introduce a new error class rather than repurposing `DataIntegrityError` (which stays at 500 for genuine integrity failures and must not change behavior for other callers). The frontend treats `code === "DELETE_BLOCKED_BY_REFERENCES"` as a domain-validation snackbar.
- **Dialog accuracy is bounded by `isInUse` freshness.** If two admins are editing simultaneously, one confirms "not in use" based on the list snapshot, and the other has meanwhile referenced the row, the first admin proceeds without warning. Acceptable for a low-frequency admin operation; the confirmation is advisory, not a lock.

## Migration Plan

1. **Edit existing migrations in place — do not generate a new follow-up migration.** The application is not yet in production, so editing the original `CREATE TABLE` migrations is acceptable and preferred over a forward-only diff:
   - `20251211144312_base/migration.sql` — declare `CountrySectorStatus`, `CountrySubsectorStatus`, `CountryOrganizationSizeStatus`; extend the three relevant `CREATE TABLE` blocks with `status`, `description`, and (for `country_organization_size`) auditor columns; replace the three full unique indexes with partial indexes scoped to `status = 'ACTIVE'`; add FKs for the new auditor columns.
   - `20251215191526_create_organization_main_activity_table/migration.sql` — declare `OrganizationMainActivityStatus`; extend the table's `CREATE TABLE` with `status` and `description`.
   - `20251215191534_create_organization_main_activity_unique_constraint/migration.sql` — append the `WHERE "status" = 'ACTIVE'` clause to the `NULLS NOT DISTINCT` unique index.
   - Run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
2. **Reset the local development DB** (`pnpm --filter database db:reset` or equivalent). Editing existing migration files invalidates Prisma's migration history hash; a clean replay from scratch is required. Existing rows in any local environment will be re-seeded; production has no data to lose because no production deployment exists yet.
3. Deploy API + web changes together.
4. Post-deploy verification walkthrough (manual, not scripted — no DB queries in tasks per project rule):
   a. Log in as ADMIN; confirm "Perfilamiento" group with four children.
   b. On each maintainer: create a row, rename, soft-delete, toggle to "Eliminados", restore, try to create a duplicate of a restored row (should 409), rename a row that has references (dialog appears).
   c. Open an organization-creation form and a carbon-inventory profiling screen; confirm dropdowns only list ACTIVE options.
   d. Pick an existing organization that references (manually, via UI) a catalog entry; soft-delete that entry; reopen the organization form → confirm the DELETED entry still renders by name in the selector (union pattern working).
5. **Rollback**: revert the deploy. Schema rollback requires editing the migration files back to their pre-change state and resetting the local DB (or, in any deployed environment, a follow-up migration that drops the new columns and restores the full unique constraints). **Base rows are preserved by soft-delete, but column-level metadata is NOT**: dropping `status`, `description`, and the `createdById` / `updatedById` columns on `country_organization_size` discards every value those columns hold, including soft-delete state and audit trail. If any deployed environment must retain that metadata across a rollback, capture a `pg_dump` (or per-table CSV export) of the four tables BEFORE running the rollback migration, and plan a follow-up restore migration that re-adds the columns and back-fills from the dump. Production has no data to lose today because no production deployment exists yet, but this caveat applies to any future rollback once the change is deployed.

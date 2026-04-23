## Why

The `SubcategoryRecommendation` table maps `(sectorId, subsectorId?) → subcategoryId` and drives `GET /carbon-inventories/:id/subcategory-recommendations`, which pre-selects subcategories during inventory creation based on an organization's sector and subsector. Today the table is seeded from JSON and has no admin UI: every edit to the recommendation matrix requires a code change, a redeploy, and a re-seed. That friction blocks country admins from tuning recommendations to local methodology and delays corrections when mismatches surface in production.

This change ships an in-app maintainer so admins can edit recommendations directly, reusing the existing Categories/Subcategories maintainer pattern (`MaintainerDataGrid`, `MaintainerScreenLayout`, sidebar) and extending the data model with a soft-delete audit trail so history is preserved across edits.

## What Changes

- Add a `status` field (`ACTIVE`/`DELETED`) and `createdById`/`updatedById` audit columns to `SubcategoryRecommendation`. **BREAKING (internal schema)**: drop the `@@unique([subcategoryId, sectorId, subsectorId])` constraint so DELETED history can accumulate without blocking new inserts of the same tuple. Uniqueness of ACTIVE rows per tuple is enforced by the services inside a transaction.
- Expose three admin-only endpoints for managing recommendations:
  - `GET /subcategory-recommendations` — returns ACTIVE rows grouped by `(sectorId, subsectorId)` with the resolved names and selected subcategory IDs.
  - `POST /subcategory-recommendations` with body `{ sectorId, subsectorId: number|null, subcategoryIds: number[] }` — creates a new group. Returns **409** if any ACTIVE row already exists for `(sectorId, subsectorId)`; the admin must edit the existing group instead. Body requires at least one subcategory.
  - `PUT /subcategory-recommendations?sectorId=&subsectorId=` with body `{ subcategoryIds: number[] }` — idempotent bulk-replace for an existing group. Diffs the provided `subcategoryIds` against existing ACTIVE rows and, inside a `prisma.$transaction`, soft-deletes removed rows and creates fresh ACTIVE rows for additions. An empty array soft-deletes every ACTIVE row in the group, making the row vanish from the grid on the next render; this is the only deletion path (no dedicated `DELETE` endpoint, no row-delete action in the grid).
- Update the consumer endpoint `GET /carbon-inventories/:id/subcategory-recommendations` to filter by `status = ACTIVE` so soft-deleted rows never reach inventory creation.
- Add a new admin screen under a top-level **"Recomendaciones de Subcategorías"** sidebar entry. The screen renders rows per `(sectorId, subsectorId|null)` in a `MaintainerDataGrid`. An "Agregar" button inserts a temp row at the top for inline creation; a transfer-list modal (opened per row) edits the selected subcategories (subcategory names are long and there can be many — inline chips don't scale).
- Branch the save flow by row state: temp rows submit via `POST` (409 conflict surfaces as a Spanish error message prompting the admin to edit the existing group); existing rows submit via `PUT`. Saving an existing row with an empty subcategory set fires a confirmation dialog before the `PUT { subcategoryIds: [] }` mutation.
- Label the null-subsector option dynamically based on the existing `SUBCATEGORY_RECOMMENDATION_MODE` system parameter: `UNION` → **"Todos los subsectores"** (wildcard); `SPECIFIC` → **"Sin subsector especificado"** (matches only inventories without a subsector). Mode flips post-deployment are out of scope; existing rows keep whatever semantic they were created under.

## Capabilities

### New Capabilities

- `subcategory-recommendations-admin`: admin maintainer endpoints and UI for managing the `(sector, subsector) → subcategories` recommendation matrix, including soft-delete semantics and audit fields.

### Modified Capabilities

<!-- No existing spec covers this surface; the consumer endpoint update is an internal filter tweak and does not change any documented requirement. -->

## Impact

- **Database**: `SubcategoryRecommendation` table — add `status`, `createdById`, `updatedById`; drop composite unique constraint. New Prisma enum `SubcategoryRecommendationStatus`. Direct migration edit (dev phase).
- **API**:
  - New feature folder `apps/api/src/features/subcategoryRecommendations/` with three subfolders: `listSubcategoryRecommendations/`, `createSubcategoryRecommendation/` (POST, 409 on conflict), `updateSubcategoryRecommendation/` (PUT, idempotent bulk-replace).
  - New route group `apps/api/src/routes/api/subcategory-recommendations/` guarded by `requireRoles([SUPERADMIN, ADMIN])`.
  - `apps/api/src/features/carbonInventories/getSubcategoryRecommendations/service.ts` — add `status = ACTIVE` filter in both `SPECIFIC` and non-specific branches.
- **Types**: new domain `packages/types/src/subcategoryRecommendations/` with base, list, create, and update schemas.
- **Web**:
  - New query/mutation hooks under `apps/web/src/api/query/subcategoryRecommendations/` (list, create, update — separate mutations so the form can branch on row state).
  - New admin route `apps/web/src/routes/admin/subcategory-recommendations.tsx` (TanStack Router regenerates `routeTree.gen.ts`).
  - New maintainer screen, column-defs hook, form hook, and transfer-list dialog under `apps/web/src/screens/Maintainer/`.
  - Sidebar entry added to `MaintainerLayout.tsx` / `SIDEBAR_DEFS`.
  - Reuse existing `apps/web/src/api/query/systemParameters/useSystemParameters.ts` to read `SUBCATEGORY_RECOMMENDATION_MODE`.
  - Map the new 409 error code in `apps/web/src/utils/getApiErrorMessage.ts` to a Spanish message prompting the admin to edit the existing group.
- **Tests**: integration tests for the three admin endpoints (including 409 on duplicate POST) plus an assertion in the consumer endpoint test that DELETED rows are excluded.
- **Country-scoping**: maintainer list/option queries scope `CountrySector` / `CountrySubsector` through `country.findFirst({ orderBy: { id: "asc" } })` (mirrors `createMethodology`/`createOrganization` precedent), with a `TODO` to migrate to a `DEFAULT_COUNTRY_ID` system parameter once available. Consumer endpoint is untouched — the organization's sector is already FK-bound to a country.

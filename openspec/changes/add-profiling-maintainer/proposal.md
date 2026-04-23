## Why

Admins need a UI to maintain the catalog of rubros (sectors) and subrubros (subsectors) used to profile organizations. Today the `country_sector` / `country_subsector` tables only expose a read-only `getAllCountrySectors` endpoint for form population, and the admin sidebar has a dormant "Rubros" branch whose only child ("Actividades Principales") is still an `UnderConstructionScreen`. Without CRUD, any change to the catalog requires a SQL migration or seed re-run per country deployment — an operational bottleneck that conflicts with the country-agnostic principle.

This change introduces a new "Perfilamiento" grouping in the admin panel that absorbs the existing "Rubros" branch and adds two new maintainers: Rubros and Subrubros. Both become editable via the standard maintainer pattern (inline-edit DataGrid with row-level validation) following the Categorías / Sub-categorías precedent.

## What Changes

- **Database**: add nullable `description String?` column to `country_sector` and `country_subsector`. Backward-compatible (no data migration required).
- **Sidebar**: remove the current `Rubros` group. Add a `Perfilamiento` group (icon `BusinessCenterOutlined`, position where `Rubros` was) with three children — `Rubros`, `Subrubros`, `Actividades Principales` — all gated to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`. Metodologías and its children stay SUPERADMIN-only.
- **Routes**: add `Routes.ADMIN_SECTORS` (`/admin/sectors`) and `Routes.ADMIN_SUBSECTORS` (`/admin/subsectors`). Remove `Routes.ADMIN_ITEMS` (the old `Rubros` parent) and its `admin/items.tsx` route file. Relax `beforeLoad` on `admin/main-activities.tsx` from `[SUPERADMIN]` to `[ADMIN, SUPERADMIN]`.
- **API — new endpoints** under `apps/api/src/features/countrySectors/admin/` and `apps/api/src/features/countrySubsectors/admin/`:
  - `createCountrySector`, `updateCountrySector`, `deleteCountrySector`, `getAllCountrySectors` (admin variant returning `description`, `createdAt`, `updatedAt`, auditor ids)
  - Same four for subsectors
  - All gated by `fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])`
- **API — existing app endpoint untouched**: the public `getAllCountrySectors` in `apps/api/src/features/countrySectors/getAllCountrySectors` (no description, used to populate organization forms) is preserved unchanged.
- **Delete semantics**: delete endpoints MUST throw `DataIntegrityError` when the row is referenced by `CountrySubsector`, `OrganizationMainActivity`, `OrganizationData`, or `SubcategoryRecommendation`. Error messages surface in Spanish via `getApiErrorMessage`.
- **Unique constraints**: `(countryId, name)` on sectors and `(countrySectorId, name)` on subsectors — P2002 violations mapped via `extractP2002Fields()` to a Spanish "Ya existe un rubro con ese nombre" / "Ya existe un subrubro con ese nombre" message.
- **Country resolution**: create endpoints use the singleton `country.findFirst()` pattern already established in `createMethodology` / `createOrganization` — admins do not pick a country.
- **Shared types**: new schemas under `packages/types/src/countrySectors/admin/{createCountrySector,updateCountrySector,deleteCountrySector,getAllCountrySectors}/` and mirrored tree for `countrySubsectors`. `CountrySectorBaseSchema` / `CountrySubsectorBaseSchema` gain a nullable `description` field.
- **Frontend — maintainer screens**: two new screens `SectorsMaintainerScreen` and `SubsectorsMaintainerScreen` under `apps/web/src/screens/Maintainer/screens/`, modeled on `CategoriesMaintainerScreen` / `SubcategoriesMaintainerScreen` but without the methodology-version scope (these rows are not methodology-scoped).
- **Frontend — query hooks**: new hook trees under `apps/web/src/api/query/countrySectors/` and `countrySubsectors/` with admin list + create/update/delete mutations, plus key factories for cache invalidation. Keys MUST segregate admin vs. app variants so the existing org-form consumer of `getAllCountrySectors` keeps working untouched.
- **Frontend — refactor**: make `scope` optional on `MaintainerScreenLayout` and `useMaintainerEditingState` (and their downstream dialogs) so the new non-methodology-scoped maintainers can reuse the layout without passing a `ScopedMethodologyContext`. Categorías / Sub-categorías callers keep passing scope unchanged.
- **Validation**: `name` required, trimmed, min 1, max 255 (match DB). `description` nullable, optional, max 2000 chars. Zod messages in Spanish.
- **Docs**: add `docs/development/maintainers/profiling.md` covering the new capability and the delete-blocking rules.
- **Tests**: integration tests for all 8 new endpoints following the `features/subcategories/` layout.

## Capabilities

### New Capabilities

- `profiling-maintainer`: admin CRUD over `country_sector` and `country_subsector` with hierarchical UX (two separate screens, subsector rows bound to a parent sector), delete-with-references blocking, and description support. Covers DB shape, API contract, authorization, sidebar/navigation placement, and the frontend maintainer screens.

### Modified Capabilities

<!-- No existing spec captures country_sector / country_subsector admin behavior. The read-only `getAllCountrySectors` app endpoint is preserved without change, so no existing capability is modified. -->

## Impact

- **Database**: `packages/database/src/prisma/schema.prisma` (`CountrySector.description`, `CountrySubsector.description`); new migration adding the two columns as nullable. No seed changes required (existing seeds keep working; `description` defaults to null).
- **Shared types**: `packages/types/src/baseSchemas/{countrySector,countrySubsector}.ts` gain `description`; new `packages/types/src/countrySectors/admin/**` and `packages/types/src/countrySubsectors/admin/**` trees; index re-exports.
- **API**: 8 new feature directories under `apps/api/src/features/countrySectors/admin/` and `apps/api/src/features/countrySubsectors/admin/`; route registration in the plugin/app wiring (follow the pattern used by `categories` / `subcategories`); shared errors reused from `apps/api/src/errors/`.
- **Frontend**:
  - `apps/web/src/interfaces/routes/routes.const.ts` — add `ADMIN_SECTORS`, `ADMIN_SUBSECTORS`; remove `ADMIN_ITEMS`.
  - `apps/web/src/routes/admin/sectors.tsx` (new), `apps/web/src/routes/admin/subsectors.tsx` (new), `apps/web/src/routes/admin/items.tsx` (deleted), `apps/web/src/routes/admin/main-activities.tsx` (auth widened).
  - `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` — sidebar def rewired: remove `Rubros` entry, insert `Perfilamiento` with 3 children, adjust `requiredRoles`.
  - `apps/web/src/screens/Maintainer/components/MaintainerScreenLayout.tsx` + `apps/web/src/screens/Maintainer/hooks/useMaintainerEditingState.ts` + `useMaintainerExitEditMode.ts` — make `scope`/`methodologyVersionId` optional.
  - `apps/web/src/screens/Maintainer/screens/SectorsMaintainerScreen.tsx`, `SubsectorsMaintainerScreen.tsx` (new).
  - `apps/web/src/screens/Maintainer/hooks/useSectorsForm.ts`, `useSectorColumns.tsx`, `useSubsectorsForm.ts`, `useSubsectorColumns.tsx` (new).
  - `apps/web/src/api/query/countrySectors/**`, `apps/web/src/api/query/countrySubsectors/**` (new). Admin hooks must NOT reuse keys from the existing app-side `getAllCountrySectors` consumer.
  - `apps/web/src/utils/getApiErrorMessage.ts` — map new error codes (unique-violation, integrity-block) to Spanish strings if not already covered.
- **Tests**: `apps/api/test/features/countrySectors/{createCountrySector,updateCountrySector,deleteCountrySector,getAllCountrySectors}/integration.test.ts` + mirror for subsectors. New factory helpers under `apps/api/test/factories/` if needed.
- **Docs**: `docs/development/maintainers/profiling.md` new; existing `docs/architecture/` index may need a reference entry.
- **Risk**:
  - Sidebar refactor must not break existing SUPERADMIN mental model for "Rubros → Actividades Principales" (same destination, new parent label + widened role).
  - Relaxing auth for `Actividades Principales` is an intentional widening — call out in PR description; confirm no audit log expects SUPERADMIN-only writes on that table (pre-merge grep).
  - Delete-blocking must be covered by integration tests against each dependency type to avoid accidental cascade deletes or orphaned rows.
  - Unique-constraint error mapping is a shared-message change; audit `getApiErrorMessage` to ensure no regression for other P2002 callers.

# SubcategoryRecommendation Maintainer

## Context

`SubcategoryRecommendation` join table maps `(sectorId, subsectorId?) → subcategoryId`, used by `GET /carbon-inventories/:id/subcategory-recommendations` to pre-select subcategories in inventory creation based on organization sector/subsector. Today the table is seeded from JSON and has no admin UI — changes require redeploys. Goal: ship an admin maintainer so admins edit recommendations in-app, reusing the existing Categories/Subcategories maintainer pattern (inline-edit `MaintainerDataGrid`, `MaintainerScreenLayout`, `SIDEBAR_DEFS`).

## Decisions (locked)

- **Row model:** row per `(sectorId, subsectorId|null)`. Subcategories column = multi-select edited via **transfer list modal** (two-column available/selected), not inline chips — subcategory names are long and there can be many.
- **Null subsector semantic:** depends on the `SUBCATEGORY_RECOMMENDATION_MODE` system parameter.
  - `UNION` → `null` means **"Todos los subsectores"** (wildcard).
  - `SPECIFIC` → `null` means **"Sin subsector especificado"** (matches only inventories with no subsector).
  - Admin grid reads the current mode via the existing system-parameters endpoint and picks the label accordingly.
  - **Mode flips post-deployment are out of scope.** Assume the mode is fixed for the country deployment; existing rows keep whatever semantic they were created under. No migration logic, no warnings on flip.
- **Create:** "Agregar" button adds empty row at top (temp id). Pick sector → pick subsector (with the mode-aware null option) → open transfer list → save.
- **Save:** bulk replace. `PUT /subcategory-recommendations?sectorId=&subsectorId=` with body `{ subcategoryIds: number[] }`. Service diffs in a `prisma.$transaction`: soft-delete removed ACTIVE rows, insert new rows. **No reactivation** — DELETED rows are left untouched and new additions always create fresh ACTIVE rows.
- **Delete:** soft delete via the same `PUT` with `{ subcategoryIds: [] }`. **No dedicated DELETE endpoint** — keeps the API surface single-source-of-truth. Frontend grid row delete action calls the PUT mutation with an empty array.
- **Empty-save UX:** if the admin saves a row with `subcategoryIds: []` (whether by clearing chips or via the delete action), show a **confirm dialog** ("¿Eliminar todas las recomendaciones de este grupo?") before firing the mutation, since this removes the row from the grid.
- **Unique constraint:** the existing `@@unique([subcategoryId, sectorId, subsectorId])` is **dropped**. Uniqueness of ACTIVE rows per tuple is enforced inside the transactional upsert (no insert when an ACTIVE row already exists for the tuple). DELETED rows accumulate historically and never block inserts.
- **Audit fields:** add `createdById` and `updatedById` to `SubcategoryRecommendation` (mirror `EmissionFactorDimension`). Populated from `request.currentUser` in the handler.
- **Consumer filter:** `getSubcategoryRecommendations/service.ts` adds `where: { status: ACTIVE }`.
- **Access:** `requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` at route registration.
- **Sidebar:** new top-level item "Recomendaciones" (not under Metodología).
- **Country scope:** mirror the precedent from `apps/api/src/features/methodologies/createMethodology/service.ts` and `createOrganization/service.ts` — `prismaClient.country.findFirst({ orderBy: { id: "asc" } })`, then scope `CountrySector` / `CountrySubsector` queries via `where: { countryId }`. Leave a `TODO` comment noting this should read a `DEFAULT_COUNTRY_ID` system parameter once one exists. **Consumer (`getSubcategoryRecommendations`) is left untouched** — the org's `sectorId` is already FK-bound to a country, so no country-scoping is needed there. The country filter applies only to the maintainer's option lists / list query.
- **No filters/pagination** in first pass (matches other maintainers).

## Files to modify / create

### Database — schema + seed

- `packages/database/src/prisma/schema.prisma` — changes to `SubcategoryRecommendation`:
  - Add enum `SubcategoryRecommendationStatus { ACTIVE, DELETED }`.
  - Add `status SubcategoryRecommendationStatus @default(ACTIVE)`.
  - Add `createdById BigInt? @map("created_by_id")` and `updatedById BigInt? @map("updated_by_id")` with corresponding `creator` / `updater` relations on `User`.
  - **Drop** `@@unique([subcategoryId, sectorId, subsectorId])`.
  - _Direct migration edit per memory rule — do not create an incremental migration._
- `packages/database/src/prisma/seeds/scripts/seedSubcategoryRecommendations.ts` — no changes needed (default `ACTIVE` applies; audit fields stay null on seeded rows).

### Types package — `packages/types/src/subcategoryRecommendations/`

Follow structure of `packages/types/src/categories/`:

- `baseSchemas/subcategoryRecommendation.ts` — `SubcategoryRecommendationBaseSchema` (id, sectorId, subsectorId nullable, subcategoryId, status, createdById, updatedById, timestamps).
- `admin/listSubcategoryRecommendations/schemas.ts` — response: array of `{ sectorId, subsectorId: number|null, sectorName, subsectorName: string|null, subcategoryIds: number[] }` (grouped by sector+subsector server-side, ACTIVE only).
- `admin/upsertSubcategoryRecommendations/schemas.ts`:
  - Query params: `{ sectorId: number, subsectorId: number|null }`.
  - Request body: `{ subcategoryIds: number[] }`.
  - 200 response: the updated group.
- Export via `subcategoryRecommendations/index.ts` and root `packages/types/src/index.ts`.

### API — `apps/api/src/features/subcategoryRecommendations/`

Two endpoints (follow Categories feature folder layout — `route.ts` → `handler.ts` → `service.ts` → `helpers.ts` if needed):

1. **listSubcategoryRecommendations** — `GET /subcategory-recommendations`. Service: `prisma.subcategoryRecommendation.findMany({ where: { status: ACTIVE }, include: { sector: true, subsector: true } })`, group by `(sectorId, subsectorId)` into rows with `subcategoryIds[]`. Prefer DB-side `groupBy`; fall back to in-memory `Map` if the grouping is awkward in Prisma.
2. **upsertSubcategoryRecommendations** — `PUT /subcategory-recommendations?sectorId=&subsectorId=`. Service in interactive `prisma.$transaction`:
   - Load existing ACTIVE rows for `(sectorId, subsectorId)`.
   - `toRemove = existingActive \ newIds` → `updateMany` setting `status = DELETED`, `updatedById = currentUser.id`.
   - `toAdd = newIds \ existingActive` → `createMany` with `status = ACTIVE`, `createdById = currentUser.id`.
   - Return the refreshed group (empty `subcategoryIds: []` when `newIds` is empty — equivalent to a delete).

**No DELETE endpoint.** Group deletion is expressed as `PUT { subcategoryIds: [] }`. The frontend row delete action calls the same upsert mutation with an empty array.

Shared helpers in `apps/api/src/features/subcategoryRecommendations/helpers.ts`:

- `buildGroupedResponse(rows)` — shared by list and upsert response shape.

Register under `apps/api/src/routes/api/subcategory-recommendations/index.ts` with `requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` (mirror `apps/api/src/routes/api/categories/index.ts`).

### API — consumer filter update

- `apps/api/src/features/carbonInventories/getSubcategoryRecommendations/service.ts` — add `status: SubcategoryRecommendationStatus.ACTIVE` to the existing `where` clauses (both `SPECIFIC` and non-specific branches).

### Web — query hooks `apps/web/src/api/query/subcategoryRecommendations/`

- `keys.ts` — `subcategoryRecommendationKeys.all`, `.list()`.
- `useSubcategoryRecommendations.ts` — list query hook.
- `useUpsertSubcategoryRecommendation.ts` — PUT mutation, invalidates list. Used for both save and delete-row (delete = upsert with empty `subcategoryIds`).
- Types derived from endpoint response via `z.infer` from `@repo/types`.

### Web — system parameter lookup for dynamic label

- Use (or add, if missing) a system-parameters query hook — e.g. `apps/web/src/api/query/systemParameters/useSystemParameter.ts` — that calls the existing `getSystemParameters` endpoint. The maintainer screen reads `SUBCATEGORY_RECOMMENDATION_MODE` to choose the null-subsector label.

### Web — maintainer screen

- `apps/web/src/screens/Maintainer/screens/SubcategoryRecommendationsMaintainerScreen.tsx` — mirrors `SubcategoriesMaintainerScreen.tsx`. Uses `MaintainerScreenLayout` + `MaintainerDataGrid`. Columns: Sector (select), Subsector (select with mode-aware null option), Subcategorías (read-only chip preview + "Editar" button opening transfer list modal), actions (delete).
- `apps/web/src/screens/Maintainer/hooks/useSubcategoryRecommendationsForm.ts` — React Hook Form + `zodResolver` using form schema from `@repo/types`. Row-level validation: require sector, require `subcategoryIds.length > 0`.
- `apps/web/src/screens/Maintainer/hooks/useSubcategoryRecommendationColumns.tsx` — column defs including sector/subsector `CategorySelectCell`-style cells. Reuse `useCountrySectors` and a `useCountrySubsectors` (if missing, check first) for dropdown options. Consumes the `SUBCATEGORY_RECOMMENDATION_MODE` value to label the null subsector option.
- `apps/web/src/screens/Maintainer/components/SubcategoryTransferListDialog.tsx` — new two-column transfer list modal (available subcategories on left grouped by category, selected on right). Backed by MUI `List` + `Checkbox`. Emits `subcategoryIds: number[]`. Reuses `useSubcategories` and `useCategories` to render groupings.
- Constants: add labels (ES) to `apps/web/src/screens/Maintainer/constants.ts` — `"Sector"`, `"Subsector"`, `"Todos los subsectores"`, `"Sin subsector especificado"`, `"Recomendaciones de Subcategorías"`, `"Agregar recomendación"`, `"Subcategorías"`, `"Editar subcategorías"`, `"¿Eliminar todas las recomendaciones de este grupo?"` (confirm-dialog title for empty save / row delete). New constant `ALL_SUBSECTORS_OPTION_ID = null` exposed as a sentinel in the select.
- Confirm-dialog component: reuse existing confirmation modal pattern (check `apps/web/src/components/` for an existing `ConfirmDialog` before creating a new one). Triggered when user clicks row delete OR saves a row with `subcategoryIds.length === 0`.

### Web — route + sidebar

- `apps/web/src/routes/admin/subcategory-recommendations.tsx` — new route. `beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN])`. Renders `SubcategoryRecommendationsMaintainerScreen`. Let TanStack Router regenerate `routeTree.gen.ts`.
- `apps/web/src/screens/Maintainer/MaintainerLayout.tsx` — add new top-level entry in `SIDEBAR_DEFS` (label **"Recomendaciones de Subcategorías"**, path `/admin/subcategory-recommendations`, appropriate icon e.g. `RecommendOutlined`, `requiredRoles: [ADMIN, SUPERADMIN]`).

### Tests

- `apps/api/test/features/subcategoryRecommendations/listSubcategoryRecommendations/integration.test.ts` — returns only ACTIVE, grouping correctness, auth guard.
- `apps/api/test/features/subcategoryRecommendations/upsertSubcategoryRecommendations/integration.test.ts`:
  - add-only, remove-only, mixed diff.
  - Previously DELETED row with the same tuple does **not** block a new insert (verifies the dropped unique constraint).
  - After a delete-then-readd cycle, there is exactly one ACTIVE row per tuple.
  - Audit fields populated on create and on soft-delete.
  - Auth guard, transaction atomicity.
  - **Empty `subcategoryIds: []`** → soft-deletes all ACTIVE rows in the group; subsequent list excludes the group.
- `apps/api/test/features/carbonInventories/getSubcategoryRecommendations/integration.test.ts` — extend existing file to assert DELETED rows excluded in both `SPECIFIC` and non-specific modes.
- Use `appFactory`, `userFactory`, `organizationFactory`; seed a few `SubcategoryRecommendation` rows via raw Prisma within tests.

## Key reused pieces

- `apps/web/src/screens/Maintainer/components/MaintainerDataGrid.tsx`
- `apps/web/src/screens/Maintainer/components/MaintainerScreenLayout.tsx`
- `apps/web/src/screens/Maintainer/components/cells/CategorySelectCell.tsx` (pattern for sector/subsector cell)
- `apps/api/src/features/categories/*` (reference for route wiring, handler/service layering)
- `apps/web/src/api/query/countrySectors/useCountrySectors.ts`
- Existing `getSystemParameters` endpoint + web hook (for dynamic null-subsector label)

## Constants / enums (no magic strings)

- Prisma enum: `SubcategoryRecommendationStatus { ACTIVE, DELETED }` in `schema.prisma`.
- Frontend uses enum imported from `@repo/database` Prisma types.
- Sentinel `ALL_SUBSECTORS_VALUE` (typed `null`) exported from `apps/web/src/screens/Maintainer/constants.ts`.
- System parameter key `SUBCATEGORY_RECOMMENDATION_MODE` is already defined in `SystemParameterKeyEnum` — reuse it.

## Verification

1. Ask user to run `pnpm install`, then regenerate Prisma client and apply migration edit (not run by the agent, per memory rule).
2. `pnpm type-check` — zero errors across monorepo.
3. `pnpm lint` — zero warnings.
4. `pnpm test --filter=api -- /subcategoryRecommendations --coverage=false` — all new integration tests pass.
5. `pnpm test --filter=api -- /getSubcategoryRecommendations/integration.test.ts --coverage=false` — ACTIVE filter test passes in both modes.
6. Manually in web:
   - Log in as ADMIN → sidebar shows "Recomendaciones" → open screen → grid lists grouped rows.
   - System parameter set to `UNION` → null subsector option labeled "Todos los subsectores". Flip to `SPECIFIC` → refetch shows "Sin subsector especificado".
   - "Agregar" → pick sector + null subsector → open transfer list → move subcategories right → save → row appears, PUT fires, list invalidates.
   - Edit existing row → remove one subcategory → save → reload, change persists; DB has one new DELETED row, ACTIVE set updated.
   - Delete-then-readd a row with the same tuple → succeeds (verifies the dropped unique constraint).
   - Delete row → row disappears from grid; DB rows for that group all have `status = DELETED`.
   - Navigate to a carbon inventory creation flow for an org with matching sector/subsector → pre-selection still works and excludes soft-deleted recs.
7. Run `pnpm format && pnpm lint && pnpm type-check` before commit.

## Commits (modular)

1. `feat(db): add status, audit fields to SubcategoryRecommendation and drop unique constraint`
2. `feat(types): add SubcategoryRecommendation admin schemas`
3. `feat(api): list/upsert SubcategoryRecommendations endpoints`
4. `fix(api): filter ACTIVE status in inventory subcategory recommendations`
5. `feat(web): SubcategoryRecommendations maintainer screen`
6. `feat(web): register admin route and sidebar entry for recommendations`
7. `test(api): integration tests for SubcategoryRecommendation maintainer`

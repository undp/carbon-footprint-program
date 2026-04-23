## 1. Pre-flight

- [ ] 1.1 Grep current call sites to inventory what must change: `rg 'ADMIN_ITEMS|Routes\.ADMIN_MAIN_ACTIVITIES|country_sector\b|CountrySector\b|country_subsector\b|CountrySubsector\b' apps/ packages/`. Save a baseline for later audit. Confirm `Routes.ADMIN_ITEMS` has a single consumer (the sidebar) before deletion — if any other site references it, resolve before proceeding.
- [ ] 1.2 Verify the singleton-country assumption: run `SELECT COUNT(*) FROM country;` against a representative shared env → confirm `1`. If any deployment reports >1, stop and revisit the `country.findFirst()` decision in design.md.
- [ ] 1.3 Confirm no audit log / row-level policy depends on "only SUPERADMIN writes to `organization_main_activity`"; `rg 'organization_main_activity|OrganizationMainActivity' apps/api/src/` and inspect all write paths. Relaxing to `[ADMIN, SUPERADMIN]` is only safe if no such policy exists.
- [ ] 1.4 Confirm no consumer of `getApiErrorMessage` depends on the current mapping for P2002 on `country_sector`/`country_subsector` unique violations (there should be none today — admin CRUD does not exist yet).

## 2. Database — schema + migration

- [ ] 2.1 Edit `packages/database/src/prisma/schema.prisma`: add `description String?` to `CountrySector` (place after `name`).
- [ ] 2.2 Edit the same file: add `description String?` to `CountrySubsector` (place after `name`).
- [ ] 2.3 Generate a new migration directory `packages/database/src/prisma/migrations/<timestamp>_add_description_to_country_sector_and_subsector/migration.sql` with `ALTER TABLE country_sector ADD COLUMN description TEXT;` and `ALTER TABLE country_subsector ADD COLUMN description TEXT;`. Both columns NULL-able, no default.
- [ ] 2.4 Run `pnpm --filter database dev:generate && pnpm --filter database dev:build`.
- [ ] 2.5 Run `pnpm --filter database db:seed` against a local DB to confirm seed still succeeds (no seed change required; existing seeds set `description` implicitly null).
- [ ] 2.6 Sanity-check: `SELECT description FROM country_sector LIMIT 5;` → all null. Same for `country_subsector`.

## 3. Shared types — Zod schemas

- [ ] 3.1 `packages/types/src/baseSchemas/countrySector.ts`: add `description: z.string().nullable().describe("CountrySector.description")` to `CountrySectorBaseSchema`. Include `createdAt`, `updatedAt`, `createdById`, `updatedById` on an extended admin schema, not the base.
- [ ] 3.2 `packages/types/src/baseSchemas/countrySubsector.ts`: mirror 3.1.
- [ ] 3.3 Create `packages/types/src/countrySectors/admin/` tree:
  - [ ] 3.3a `createCountrySector/schemas.ts` + `types.ts`: input `{ name: z.string().trim().min(1).max(255); description: z.string().trim().max(2000).nullable().optional() }` (trim BEFORE min/max so whitespace-only names fail validation). Response shape: admin sector (`id`, `name`, `description`, `createdAt`, `updatedAt`, `createdById`, `updatedById`).
  - [ ] 3.3b `updateCountrySector/schemas.ts` + `types.ts`: `params: { id }`; `body`: each of `name` / `description` optional BUT the body MUST be refined with `.refine(v => Object.keys(v).length > 0, { message: "Se requiere al menos un campo para actualizar" })` so empty-object PATCH returns 400. Response: admin sector shape.
  - [ ] 3.3c `deleteCountrySector/schemas.ts` + `types.ts`: `params: { id }`; no response body. Wire the route with `response: { 204: z.null() }` (or equivalent empty-response shape) — do NOT mirror `deleteCategory` which returns 200 with `{ message, id }`.
  - [ ] 3.3d `getAllCountrySectors/schemas.ts` + `types.ts` (admin variant): response is an array of the admin sector shape WITH nested admin-subsector summary.
  - [ ] 3.3e `index.ts` at each level re-exporting.
- [ ] 3.4 Create `packages/types/src/countrySubsectors/admin/` tree mirroring 3.3 (create/update/delete/getAll). Create endpoint requires `countrySectorId`.
- [ ] 3.5 Update `packages/types/src/index.ts` to re-export the new admin trees.
- [ ] 3.6 Run `pnpm type-check`; resolve any downstream compile hits (should be zero — existing app schema was not edited).

## 4. API — countrySectors admin endpoints

- [ ] 4.1 `apps/api/src/features/countrySectors/admin/createCountrySector/route.ts`: `POST /admin/country-sectors`, `requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])`, schema wired to Zod, uses `ApiErrorResponseSchema` for 400/409/500.
- [ ] 4.2 `apps/api/src/features/countrySectors/admin/createCountrySector/handler.ts` + `service.ts`: resolve `countryId` via `country.findFirst({ orderBy: { id: "asc" } })` (throw `NoCountryFoundError` if missing); normalize empty-string `description` → `null` (tri-state: `undefined` → omit from insert / DB default null; `null` → explicit null; `""` → null); persist; catch P2002 → `DatabaseUniqueConstraintViolationError` (HTTP 409) with Spanish `userMessage`. Stamp `createdById` from `request.currentUser`.
- [ ] 4.3 `apps/api/src/features/countrySectors/admin/updateCountrySector/` (route/handler/service): same auth; wrap in `prisma.$transaction` (read existing → apply partial update). Apply PATCH tri-state: `description: undefined` → field omitted from Prisma update data; `description: null` → set to null; `description: ""` → normalize to null. Catch P2002 (HTTP 409). Stamp `updatedById`.
- [ ] 4.4 `apps/api/src/features/countrySectors/admin/deleteCountrySector/` (route/handler/service): same auth; wrap reference-check + delete in `prisma.$transaction`; before deleting, count `CountrySubsector.countrySectorId`, `OrganizationMainActivity.countrySectorId`, `OrganizationData.sectorId`, `SubcategoryRecommendation.sectorId` referencing the id in parallel (`Promise.all`). If any count > 0, throw `DataIntegrityError` (HTTP 500 per `apps/api/src/errors/DataIntegrityError.ts`) with Spanish `userMessage` listing the blocking reference types. NOTE: READ COMMITTED isolation means the transaction does not fully prevent TOCTOU; the FK constraint is the final guardrail (surfacing as a P2003 Prisma error) — do not claim TOCTOU-proof in comments.
- [ ] 4.5 `apps/api/src/features/countrySectors/admin/getAllCountrySectors/` (route/handler/service): same auth; return admin shape including `description`, auditor ids, and nested `subsectors` with their admin fields. Sort by `name` ASC, subsectors by `name` ASC.
- [ ] 4.6 Register the four new routes under `apps/api/src/routes/api/admin/country-sectors/index.ts` following the `routes/api/admin/organizations/index.ts` pattern (`fastify.addHook("onRequest", fastify.requireAuth); fastify.addHook("preHandler", fastify.requireRoles([SUPERADMIN, ADMIN]));` then register the four route functions).
- [ ] 4.7 Ensure the existing public `apps/api/src/features/countrySectors/getAllCountrySectors` is untouched and still registered at its current mount point.

## 5. API — countrySubsectors admin endpoints

- [ ] 5.1 `apps/api/src/features/countrySubsectors/admin/createCountrySubsector/`: `POST /admin/country-subsectors`, same auth. Require `countrySectorId` in body; validate the parent sector exists inside the transaction — missing parent → throw `ResourceNotFoundError` (HTTP 404); P2002 on `(countrySectorId, name)` → `DatabaseUniqueConstraintViolationError` (HTTP 409) with Spanish message. Apply description tri-state normalization as in 4.2.
- [ ] 5.2 `apps/api/src/features/countrySubsectors/admin/updateCountrySubsector/`: same auth; PATCH body refined to require ≥1 field (empty body → 400). Allow changing `countrySectorId` (re-parenting); validate new parent exists inside the transaction — missing parent → `ResourceNotFoundError` (HTTP 404). Catch P2002 (HTTP 409). Apply description tri-state normalization as in 4.3.
- [ ] 5.3 `apps/api/src/features/countrySubsectors/admin/deleteCountrySubsector/`: same auth; wrap reference-check + delete in `prisma.$transaction`; count `OrganizationMainActivity.countrySubsectorId`, `OrganizationData.subsectorId`, `SubcategoryRecommendation.subsectorId` in parallel. Any count > 0 → `DataIntegrityError` (HTTP 500) with Spanish `userMessage`. Same TOCTOU caveat as 4.4.
- [ ] 5.4 `apps/api/src/features/countrySubsectors/admin/getAllCountrySubsectors/`: same auth; return admin shape including `description`, parent `countrySectorId` + parent name for display. Sort by parent name then subsector name.
- [ ] 5.5 Register the four new routes under `apps/api/src/routes/api/admin/country-subsectors/index.ts` following the `routes/api/admin/organizations/index.ts` pattern (same `onRequest` / `preHandler` hook wiring as 4.6).
- [ ] 5.6 Run `pnpm --filter api type-check && pnpm --filter api lint`; resolve.

## 6. API — integration tests

- [ ] 6.1 `apps/api/test/features/countrySectors/createCountrySector/integration.test.ts`: (a) 201 with full payload, (b) 201 with null description, (c) 400 on empty name, (d) 400 on whitespace-only name (trimmed below min(1)), (e) 409 on duplicate name within same country, (f) 401 for unauthenticated, 403 for USER role, (g) 201 for both ADMIN and SUPERADMIN.
- [ ] 6.2 `apps/api/test/features/countrySectors/updateCountrySector/integration.test.ts`: (a) 200 partial update of name, (b) 200 partial update of description, (c) 200 clearing description via null, (d) 200 with description: "" normalized to null, (e) 400 on empty body `{}`, (f) 409 when new name collides with another sector, (g) 404 on unknown id.
- [ ] 6.3 `apps/api/test/features/countrySectors/deleteCountrySector/integration.test.ts`: (a) 204 (no body) on clean row, (b) 500 via `DataIntegrityError` when referenced by a `CountrySubsector`, (c) 500 when referenced by `OrganizationMainActivity.countrySectorId`, (d) 500 when referenced by `OrganizationData.sectorId`, (e) 500 when referenced by `SubcategoryRecommendation.sectorId`, (f) 404 on unknown id. Assert response body's `code === "DATA_INTEGRITY_ERROR"` and a Spanish `userMessage` is present.
- [ ] 6.4 `apps/api/test/features/countrySectors/getAllCountrySectors/integration.test.ts` (admin variant): (a) returns sectors with description + auditor fields, (b) sorted alphabetically, (c) includes nested subsectors. Distinct from any existing app-side test to avoid cross-pollution.
- [ ] 6.5–6.8 Mirror 6.1–6.4 for `countrySubsectors`. For delete, block on `OrganizationMainActivity.countrySubsectorId`, `OrganizationData.subsectorId`, `SubcategoryRecommendation.subsectorId` (all 500). For create/update, test parent-sector validation: missing parent on create → 404; re-parenting to missing sector on update → 404; re-parenting into a name collision → 409.
- [ ] 6.9 Add a smoke test confirming that public `GET /country-sectors` (app endpoint) still returns the expected shape (no `description`), unchanged by this feature.
- [ ] 6.10 Add factory helpers `apps/api/test/factories/countrySectorFactory.ts` and `countrySubsectorFactory.ts` (they do not exist today) mirroring the conventions of existing factories under `apps/api/test/factories/`. These are required for the tests in 6.1–6.8.
- [ ] 6.11 Run `pnpm test --filter=api -- /countrySectors --coverage=false` and `/countrySubsectors --coverage=false`; fix failures.

## 7. Shared maintainer layout — optional scope refactor

- [ ] 7.1 `apps/web/src/screens/Maintainer/components/MaintainerScreenLayout.tsx`: make `scope?: ScopedMethodologyContext`. When undefined, skip `methodologySelector` rendering and treat `isViewOnly` as `false`. Preserve all existing behavior for callers that still pass `scope`.
- [ ] 7.2 `apps/web/src/screens/Maintainer/hooks/useMaintainerEditingState.ts`: make `methodologyVersionId?: string | null` optional. When undefined, the scope-change reset effect is a no-op.
- [ ] 7.3 `apps/web/src/screens/Maintainer/hooks/useMaintainerExitEditMode.ts`: make `effectiveMethodologyId`, `methodologies`, `selectMethodology`, `stopEditing` optional. When all undefined, `handleExitEditMode` just cancels the row edit without methodology fan-out.
- [ ] 7.4 `apps/web/src/screens/Maintainer/hooks/useMaintainerFormSync.ts` uses `methodologyVersionId` in a reset-on-change effect. Widen the prop type from `string | undefined` to keep accepting `undefined` (already the case) — no code change required; profiling maintainers will pass `undefined` and the effect runs once on mount (benign). Confirm behavior with a quick manual test; if the initial reset clobbers server-synced form state, guard the effect with `if (methodologyVersionId === undefined) return;`.
- [ ] 7.5 Smoke-test existing screens that still pass scope (Categories, Subcategories, Dimensions, EmissionFactors, Methodologies) to confirm no regression: `pnpm --filter web type-check && pnpm --filter web lint`; run affected screens manually in dev.

## 8. Frontend — routes and sidebar

- [ ] 8.1 `apps/web/src/interfaces/routes/routes.const.ts`: add `ADMIN_SECTORS: "/admin/sectors"` and `ADMIN_SUBSECTORS: "/admin/subsectors"`. Remove `ADMIN_ITEMS`.
- [ ] 8.2 Delete `apps/web/src/routes/admin/items.tsx`. Verify via grep that nothing else imports `ADMIN_ITEMS`; the sidebar is the only consumer.
- [ ] 8.3 Create `apps/web/src/routes/admin/sectors.tsx` with `createFileRoute(Routes.ADMIN_SECTORS)`, `beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`, `component: SectorsMaintainerScreen`.
- [ ] 8.4 Create `apps/web/src/routes/admin/subsectors.tsx` mirroring 8.3 with `SubsectorsMaintainerScreen`.
- [ ] 8.5 Edit `apps/web/src/routes/admin/main-activities.tsx`: widen `requireRole` to `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`. Component stays as `UnderConstructionScreen`.
- [ ] 8.6 Run TanStack Router codegen (`pnpm --filter web dev` will auto-regenerate `routeTree.gen.ts`, or trigger the codegen script explicitly) and commit the regenerated file.
- [ ] 8.7 `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`: remove the `Rubros` entry (lines ~66-78). Insert a `Perfilamiento` entry in the same position with:
  - `text: "Perfilamiento"`, `icon: <BusinessCenterOutlined />`, `path: Routes.ADMIN_SECTORS` (landing destination when clicked on parent), `requiredRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN]`.
  - Children (in order): `Rubros` (`Routes.ADMIN_SECTORS`, icon `CategoryOutlined`), `Subrubros` (`Routes.ADMIN_SUBSECTORS`, icon `AccountTreeOutlined`), `Actividades Principales` (`Routes.ADMIN_MAIN_ACTIVITIES`, icon `CategoryOutlined`).
- [ ] 8.8 Add the `BusinessCenterOutlined` import to `MaintainerLayout.tsx`.
- [ ] 8.9 Run `pnpm --filter web type-check` and `pnpm --filter web lint`; resolve.

## 9. Frontend — query hooks

- [ ] 9.1 Create `apps/web/src/api/query/countrySectors/` with: `keys.ts` (structured key factory with `app` and `admin` namespaces; admin subkeys for `list`), `useAdminCountrySectors.ts` (query), `useCreateCountrySector.ts`, `useUpdateCountrySector.ts`, `useDeleteCountrySector.ts` (all three mutations invalidate `countrySectorsKeys.admin.all` AND `countrySectorsKeys.app.all` on success).
- [ ] 9.2 Mirror for `apps/web/src/api/query/countrySubsectors/`. Subsector mutations invalidate both admin subsector keys AND admin sector keys (nested list) and the app-side sector key.
- [ ] 9.3 If the existing org-form hook already uses a `countrySectorsKeys` factory, migrate it to the new `.app` namespace without changing its return shape. Audit via grep: `rg 'useCountrySectors\|country-sectors'\|getAllCountrySectors' apps/web/src/`.
- [ ] 9.4 `apps/web/src/utils/getApiErrorMessage.ts`: ensure the function prefers the server-supplied `userMessage` when present, and add code-keyed Spanish fallbacks for `DATABASE_UNIQUE_CONSTRAINT_VIOLATION` (sector/subsector) and `DATA_INTEGRITY_ERROR` (delete-blocked) as a defense-in-depth fallback in case a future caller forgets to set `userMessage`. Do NOT shadow existing P2002 messages for other domains — key the fallback on error code + context if needed.

## 10. Frontend — Sectors maintainer screen

- [ ] 10.1 Create `apps/web/src/screens/Maintainer/hooks/useSectorsForm.ts` based on `useSubcategoriesForm.ts`: field array of `{ id, name, description: string | null }`; schema with Spanish messages (name required, trimmed, max 255; description nullable, max 2000).
- [ ] 10.2 Create `apps/web/src/screens/Maintainer/hooks/useSectorColumns.tsx`: columns for name (inline edit), description (inline edit or modal textarea — choose modal if pattern already exists for long text), actions (start/stop/cancel/delete). Read-only view when `viewOnly=true`.
- [ ] 10.3 Create `apps/web/src/screens/Maintainer/screens/SectorsMaintainerScreen.tsx` by adapting `SubcategoriesMaintainerScreen.tsx`:
  - Drop methodology scope / `useMaintainerMethodologyScope`.
  - Wire `useMaintainerEditingState` and `useMaintainerFormSync` without `methodologyVersionId`.
  - Use `useAdminCountrySectors` as the server source; `addMutation`, `updateMutation`, `deleteMutation` from step 9.1.
  - `handleStopEditRow`, `handleCancelEditRow`, `handleAddRow`, `handleDelete` — same structure, sector payload shape.
  - `MaintainerScreenLayout` called without `scope`; pass `title: "Rubros"`, `addLabel: "Agregar rubro"`.
  - Snackbar messages in Spanish ("Rubro creado exitosamente", "Cambios guardados satisfactoriamente", "Rubro eliminado", error fallbacks via `getApiErrorMessage`).
- [ ] 10.4 Export `SectorsMaintainerScreen` from `apps/web/src/screens/Maintainer/screens/index.ts`.

## 11. Frontend — Subsectors maintainer screen

- [ ] 11.1 Create `apps/web/src/screens/Maintainer/hooks/useSubsectorsForm.ts`: field array `{ id, countrySectorId, name, description }`. Schema includes `countrySectorId` required.
- [ ] 11.2 Create `apps/web/src/screens/Maintainer/hooks/useSubsectorColumns.tsx`: columns for parent-rubro dropdown (options from `useAdminCountrySectors`), name, description, actions.
- [ ] 11.3 Create `apps/web/src/screens/Maintainer/screens/SubsectorsMaintainerScreen.tsx` mirroring the Sectors screen but with the parent-sector dropdown column. Empty-state when no sectors exist: render an empty grid with a helper text "Crea primero un rubro" and disable the add button.
- [ ] 11.4 Export `SubsectorsMaintainerScreen` from `apps/web/src/screens/Maintainer/screens/index.ts`.

## 12. Frontend — smoke test

- [ ] 12.1 `pnpm format && pnpm lint && pnpm type-check` all green.
- [ ] 12.2 Run dev server; log in as ADMIN. Confirm:
  - Sidebar shows "Perfilamiento" with three children (Rubros, Subrubros, Actividades Principales).
  - Clicking "Rubros" → `/admin/sectors` renders the Sectors maintainer with existing seed data.
  - Clicking "Subrubros" → `/admin/subsectors` renders the Subsectors maintainer with the parent column populated.
  - Clicking "Actividades Principales" still renders `UnderConstructionScreen`.
  - CRUD round-trip on a rubro: create → rename → add a subrubro → try to delete the rubro (should block with Spanish error) → delete the subrubro → delete the rubro (succeeds).
- [ ] 12.3 Log out, log in as USER. Confirm no admin routes are reachable.
- [ ] 12.4 Log in as SUPERADMIN. Confirm "Metodologías" branch is still visible and "Perfilamiento" is visible.
- [ ] 12.5 App-level regression: open an organization-creation form and confirm the rubro dropdown still loads via the public `getAllCountrySectors` endpoint without description fields.

## 13. Docs

- [ ] 13.1 Create `docs/development/maintainers/profiling.md` describing the capability, the two-screen layout, the delete-blocking rules, the auth gate, and the single-country assumption.
- [ ] 13.2 Cross-link from `docs/` index / README where appropriate.

## 14. Pre-commit checklist

- [ ] 14.1 `pnpm format && pnpm lint && pnpm type-check` — all green.
- [ ] 14.2 Full test suite: `pnpm test --filter=api -- /countrySectors --coverage=false && pnpm test --filter=api -- /countrySubsectors --coverage=false`.
- [ ] 14.3 Build: `pnpm build`.
- [ ] 14.4 Grep cleanup: `rg 'ADMIN_ITEMS' apps/ packages/` returns zero hits.
- [ ] 14.5 Commit in modular chunks per CLAUDE.md (schema + migration, types, API per feature, frontend refactor, frontend screens, docs) with Conventional Commit messages.

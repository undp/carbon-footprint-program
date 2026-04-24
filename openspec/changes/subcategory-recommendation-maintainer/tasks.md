## 1. Database schema

- [x] 1.1 Add enum `SubcategoryRecommendationStatus { ACTIVE, DELETED }` to `packages/database/src/prisma/schema.prisma`
- [x] 1.2 Add `status SubcategoryRecommendationStatus @default(ACTIVE)` to the `SubcategoryRecommendation` model
- [x] 1.3 Add `createdById BigInt? @map("created_by_id")` and `updatedById BigInt? @map("updated_by_id")` to `SubcategoryRecommendation`, with `creator`/`updater` relations on `User`
- [x] 1.4 Remove the full `@@unique([subcategoryId, sectorId, subsectorId])` constraint on `SubcategoryRecommendation` and replace it with a **partial unique index** scoped to ACTIVE rows via raw SQL in the migration: `CREATE UNIQUE INDEX "subcategory_recommendation_active_unique" ON "subcategory_recommendation" ("subcategory_id", "sector_id", "subsector_id") WHERE "status" = 'ACTIVE';` (Prisma's schema DSL does not support partial unique indexes, so this must be added in the migration SQL directly)
- [x] 1.5 Edit the existing migration in place (no incremental migration) per project memory rule — include both the schema changes and the partial unique index DDL in the same migration file
- [x] 1.6 Ask user to regenerate the Prisma client and re-run `seedSubcategoryRecommendations.ts` (agent does not run build commands)

## 2. Shared types package

- [x] 2.1 Create `packages/types/src/subcategoryRecommendations/baseSchemas/subcategoryRecommendation.ts` with `SubcategoryRecommendationBaseSchema` (id, sectorId, subsectorId nullable, subcategoryId, status, createdById nullable, updatedById nullable, timestamps)
- [x] 2.2 Create `packages/types/src/subcategoryRecommendations/admin/listSubcategoryRecommendations/schemas.ts` with the grouped response schema: array of `{ sectorId, subsectorId: number|null, sectorName, subsectorName: string|null, subcategoryIds: number[] }`
- [x] 2.3 Create `packages/types/src/subcategoryRecommendations/admin/createSubcategoryRecommendation/schemas.ts` with the request body (`{ sectorId: number, subsectorId: number|null, subcategoryIds: number[].min(1) }` — values in `subcategoryIds` MUST be unique; enforce via `.refine((arr) => new Set(arr).size === arr.length, { message: "subcategoryIds must be unique" })` so duplicates are rejected at the schema layer with `400 Bad Request` before reaching the DB) and the 201 response schema (the created group)
- [x] 2.4 Create `packages/types/src/subcategoryRecommendations/admin/updateSubcategoryRecommendation/schemas.ts` with the query-params schema (`sectorId: z.coerce.number().int().positive()`, `subsectorId: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().positive().nullable())` — accepts both omitted param and empty-string as `null`; rejects the literal string `"null"` and any non-numeric token with `400`), the request body (`{ subcategoryIds: number[] }` — empty allowed, but non-empty arrays MUST contain only unique values; enforce via the same `.refine` used by 2.3 so duplicates are rejected with `400 Bad Request`), and the 200 response schema (the refreshed group)
- [x] 2.5 Export inferred types alongside each schema via `z.infer`
- [x] 2.6 Add barrel `packages/types/src/subcategoryRecommendations/index.ts` and re-export from `packages/types/src/index.ts`

## 3. API — admin endpoints

- [ ] 3.1 Create feature folder `apps/api/src/features/subcategoryRecommendations/` with `listSubcategoryRecommendations/`, `createSubcategoryRecommendation/`, and `updateSubcategoryRecommendation/` subfolders, each containing `route.ts`, `handler.ts`, and `service.ts`
- [ ] 3.2 Implement `listSubcategoryRecommendations/service.ts`: fetch `ACTIVE` rows with `include: { sector: true, subsector: true }` scoped to the resolved country's sectors/subsectors, group server-side by `(sectorId, subsectorId)`, and return the shape defined in task 2.2
- [ ] 3.3 Implement `createSubcategoryRecommendation/service.ts` inside a `prisma.$transaction`: check for any `ACTIVE` row matching `(sectorId, subsectorId)`; if found, throw a conflict error that maps to `409`; otherwise `createMany` one row per submitted `subcategoryId` with `status = ACTIVE` and `createdById`; wrap the `createMany` in a `try/catch` that maps Prisma `P2002` unique-constraint violations (raised by the partial unique ACTIVE index under concurrent inserts) into the same 409 conflict error so the race path and the pre-check path share a single error surface; return the refreshed group
- [ ] 3.4 Implement `updateSubcategoryRecommendation/service.ts` inside a `prisma.$transaction`: rely on the Zod schema from 2.4 to guarantee `subcategoryIds` is already unique (duplicates return `400` before this runs), read existing `ACTIVE` rows for `(sectorId, subsectorId)`, compute `toRemove` → `updateMany` to `DELETED` with `updatedById`, compute `toAdd` → `createMany` with `status = ACTIVE` and `createdById`; return the refreshed group (empty `subcategoryIds: []` when the submitted array is empty; no error when no ACTIVE rows existed before the call)
- [ ] 3.5 Create shared helper `apps/api/src/features/subcategoryRecommendations/helpers.ts` with `buildGroupedResponse(rows)` for reuse by list, create, and update
- [ ] 3.6 Reuse an existing error class from `apps/api/src/errors/` for the create conflict (e.g., `DatabaseUniqueConstraintViolationError` or an equivalent); if nothing fits, add a minimal `ResourceAlreadyExistsError` consistent with the existing error surface rather than a feature-specific class
- [ ] 3.7 Resolve the country in the list and create/update services using `prismaClient.country.findFirst({ orderBy: { id: "asc" } })` and add a `TODO` comment about migrating to a `DEFAULT_COUNTRY_ID` system parameter
- [ ] 3.8 Wire Zod schemas from `@repo/types` into each `route.ts` via Fastify's `schema` option (`querystring`, `body`, `response`, including `409: ApiErrorResponseSchema` on the POST route)
- [ ] 3.9 Create `apps/api/src/routes/api/subcategory-recommendations/index.ts` and register all three endpoints under `requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])`

## 4. API — consumer endpoint update

- [ ] 4.1 Update `apps/api/src/features/carbonInventories/getSubcategoryRecommendations/service.ts` to add `status: SubcategoryRecommendationStatus.ACTIVE` to both the `SPECIFIC` and non-specific `where` clauses

## 5. Web — query hooks and error mapping

- [ ] 5.1 Create `apps/web/src/api/query/subcategoryRecommendations/keys.ts` with `subcategoryRecommendationKeys.all` and `.list()`
- [ ] 5.2 Create `apps/web/src/api/query/subcategoryRecommendations/useSubcategoryRecommendations.ts` (list query hook)
- [ ] 5.3 Create `apps/web/src/api/query/subcategoryRecommendations/useCreateSubcategoryRecommendation.ts` (POST mutation; invalidates the list key on success; surfaces 409 so the caller can show a Spanish error and keep the temp row)
- [ ] 5.4 Create `apps/web/src/api/query/subcategoryRecommendations/useUpdateSubcategoryRecommendation.ts` (PUT mutation; invalidates the list key; used for both modify and empty-body delete flows)
- [ ] 5.5 Derive hook types from `@repo/types` request/response types via `z.infer`
- [ ] 5.6 Reuse the existing `apps/web/src/api/query/systemParameters/useSystemParameters.ts` hook — no new hook needed
- [ ] 5.7 Map the new 409 error code in `apps/web/src/utils/getApiErrorMessage.ts` to a Spanish message prompting the admin to edit the existing group (e.g., "Ya existe una recomendación para este sector y subsector. Edítala en lugar de crear una nueva.")

## 6. Web — maintainer screen

- [ ] 6.1 Add screen labels to `apps/web/src/screens/Maintainer/constants.ts` in Spanish: `"Sector"`, `"Subsector"`, `"Todos los subsectores"`, `"Sin subsector especificado"`, `"Recomendaciones de Subcategorías"`, `"Agregar recomendación"`, `"Subcategorías"`, `"Editar subcategorías"`, `"¿Eliminar todas las recomendaciones de este grupo?"`, and sentinel `ALL_SUBSECTORS_VALUE = null`
- [ ] 6.2 Create `apps/web/src/screens/Maintainer/hooks/useSubcategoryRecommendationsForm.ts` using React Hook Form + `zodResolver` and a schema from `@repo/types` that enforces sector required; temp-row creation schema also requires `subcategoryIds.min(1)`; existing-row update schema allows `subcategoryIds: []` (which triggers the confirmation dialog)
- [ ] 6.3 Create `apps/web/src/screens/Maintainer/hooks/useSubcategoryRecommendationColumns.tsx` with sector, subsector (with mode-aware null label), and subcategorías (chip preview + Editar button) columns; reuse `useCountrySectors` and add/reuse `useCountrySubsectors` as needed
- [ ] 6.4 Create `apps/web/src/screens/Maintainer/components/SubcategoryTransferListDialog.tsx`: two-column transfer list backed by MUI `List` + `Checkbox`, available subcategories grouped by category, emits `subcategoryIds: number[]`; reuses `useSubcategories` and `useCategories`; disables Save when `isNew && selection.length === 0`
- [ ] 6.5 Create `apps/web/src/screens/Maintainer/screens/SubcategoryRecommendationsMaintainerScreen.tsx` mirroring `SubcategoriesMaintainerScreen.tsx`, using `MaintainerScreenLayout` + `MaintainerDataGrid`; wire the Agregar button to insert a temp row (`id: "temp-${n}"`) at the top; branch save behavior by `isNew` (temp → create mutation / existing → update mutation); on create-mutation 409, keep the temp row visible with the mapped Spanish error; on successful save, invalidation removes the temp row via list refetch
- [ ] 6.6 Use the existing `ConfirmDialog` (or the app's established confirmation pattern) to wrap the empty-save flow on existing rows with the prompt "¿Eliminar todas las recomendaciones de este grupo?"
- [ ] 6.7 Read `SUBCATEGORY_RECOMMENDATION_MODE` via `useSystemParameters` and thread it into the column defs to render the correct null-subsector label

## 7. Web — route and sidebar

- [ ] 7.1 Create `apps/web/src/routes/admin/subcategory-recommendations.tsx` with `beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN])` rendering `SubcategoryRecommendationsMaintainerScreen`
- [ ] 7.2 Let TanStack Router regenerate `routeTree.gen.ts` (do not edit manually)
- [ ] 7.3 Add a top-level entry to `SIDEBAR_DEFS` in `apps/web/src/screens/Maintainer/MaintainerLayout.tsx` — label "Recomendaciones de Subcategorías", path `/admin/subcategory-recommendations`, icon `RecommendOutlined` (or equivalent), `requiredRoles: [ADMIN, SUPERADMIN]`

## 8. Tests

- [ ] 8.1 Create `apps/api/test/features/subcategoryRecommendations/listSubcategoryRecommendations/integration.test.ts` — assert only ACTIVE rows are returned, grouping shape is correct, and non-admin users are forbidden
- [ ] 8.2 Create `apps/api/test/features/subcategoryRecommendations/createSubcategoryRecommendation/integration.test.ts` covering: happy path (201 + rows created + `createdById` populated), **409 conflict** when at least one ACTIVE row exists for the tuple, successful creation after a full soft-delete of the same tuple (no ACTIVE rows left), 400 on empty `subcategoryIds`, auth guard, transaction atomicity
- [ ] 8.3 Create `apps/api/test/features/subcategoryRecommendations/updateSubcategoryRecommendation/integration.test.ts` covering: add-only, remove-only, mixed diff, auth guard, transaction atomicity, audit-field population on create and soft-delete
- [ ] 8.4 Add a test in the update file asserting that `PUT { subcategoryIds: [] }` soft-deletes all ACTIVE rows in the group and subsequent `GET` responses exclude the group, and that a second idempotent `PUT { subcategoryIds: [] }` on the already-empty group succeeds with no state change
- [ ] 8.5 Add a test in the update file asserting that a previously DELETED row with the same `(sectorId, subsectorId, subcategoryId)` tuple does not block re-insertion via update, and that after a delete-then-readd cycle there is exactly one ACTIVE row per tuple
- [ ] 8.6 Extend `apps/api/test/features/carbonInventories/getSubcategoryRecommendations/integration.test.ts` with assertions that DELETED rows are excluded in both `SPECIFIC` and `UNION` modes
- [ ] 8.7 Use `appFactory`, `userFactory`, `organizationFactory` for test setup; seed `SubcategoryRecommendation` rows via raw Prisma inside tests as needed

## 9. Verification and commits

- [ ] 9.1 Run `pnpm type-check` across the monorepo — zero errors
- [ ] 9.2 Run `pnpm lint` — zero warnings
- [ ] 9.3 Run the new API integration tests (`pnpm test --filter=api -- /subcategoryRecommendations --coverage=false`) — all green
- [ ] 9.4 Run the consumer-endpoint test (`pnpm test --filter=api -- /getSubcategoryRecommendations/integration.test.ts --coverage=false`) — all green
- [ ] 9.5 Manually verify the admin flow in the web app: sidebar entry visible for ADMIN; grid loads grouped rows; Agregar → pick sector + null subsector → transfer list save → new row appears; Agregar with duplicate tuple → 409 surfaces a Spanish error and the temp row stays; edit existing row → add/remove subcategories saves via PUT; clear all subcategories on existing row → confirm dialog → row vanishes on refetch; mode flip changes the null-subsector label on refetch; inventory creation still pre-selects correctly and excludes DELETED recs
- [ ] 9.6 Run `pnpm format && pnpm lint && pnpm type-check` before commit
- [ ] 9.7 Commit modularly per the plan: `feat(db)` schema + audit fields + dropped constraint; `feat(types)` admin schemas (list + create + update); `feat(api)` three endpoints; `fix(api)` ACTIVE filter in consumer; `feat(web)` query hooks + error mapping; `feat(web)` maintainer screen; `feat(web)` admin route + sidebar entry; `test(api)` integration tests

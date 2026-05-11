## 1. Database Schema & Migration

- [x] 1.1 In `packages/database/src/prisma/schema.prisma`, remove the `enum Magnitude { ... }` block (lines 375–388).
- [x] 1.2 In the same file, add a `Magnitude` model:
  ```prisma
  model Magnitude {
    id        BigInt                @id @default(autoincrement())
    code      String                @unique
    name      String
    isSystem  Boolean               @default(false)
    status    MeasurementUnitStatus @default(ACTIVE)
    createdAt DateTime              @default(now())
    updatedAt DateTime              @updatedAt
    measurementUnits MeasurementUnit[]
    @@map("Magnitude")
  }
  ```
- [x] 1.3 In the `MeasurementUnit` model, replace the field `magnitude Magnitude` with `magnitudeId BigInt` and add the relation `magnitude Magnitude @relation(fields: [magnitudeId], references: [id], onDelete: Restrict)`. Add an `@@index([magnitudeId])` to the model.
- [x] 1.4 Edit the original base migration (`packages/database/src/prisma/migrations/20251211144312_base/migration.sql`):
  - Drop the SQL definition of the `Magnitude` enum type and replace it with a `CREATE TABLE "Magnitude"` statement matching the model in 1.2.
  - Replace the `MeasurementUnit.magnitude` column definition with `magnitudeId BIGINT NOT NULL`, plus a foreign-key constraint to `"Magnitude"(id) ON DELETE RESTRICT` and an index on `magnitudeId`.
  - Do NOT create a new migration file.
- [x] 1.5 Update `packages/database/src/prisma/seeds/scripts/seedMeasurementUnits.ts`:
  - Replace `MeasurementUnitData`'s `magnitude: z.enum(Magnitude)` with `magnitudeCode: z.string()`. Update `measurement_units.json` (in every dataset under `packages/database/src/prisma/seeds/datasets/<dataset>/`) to switch the `magnitude` key to `magnitudeCode` with the same string value (e.g., `"MASS"`).
  - Add a new step at the start of `seedMeasurementUnits`: insert ten system magnitudes (`MASS, VOLUME, DISTANCE, TIME, ANIMALS, AREA, POWER, ENERGY, DISTANCE_MASS, ROOMS`) with the Spanish labels listed in the proposal. Use `tx.magnitude.upsert(...)` keyed on `code` so the seed is idempotent. Set `isSystem = true`, `status = ACTIVE`.
  - Before inserting MUs, build a `Map<code, magnitudeId>` from the magnitudes table. Resolve each MU's `magnitudeCode` to a `magnitudeId`; throw a descriptive error if a code is not found.
  - Keep the existing canonical-RMU coverage check.
- [x] 1.6 Run `pnpm prisma generate` to regenerate the Prisma client.
- [ ] 1.7 Run `pnpm test --filter=database -- seedMeasurementUnits --coverage=false` (if a seed unit test exists) and `pnpm exec prisma migrate reset --force` against a local DB to confirm the seed runs cleanly.

## 2. Types — Shared Schemas (`packages/types`)

- [x] 2.1 Remove the export of the `Magnitude` Prisma enum from `@repo/types`. (The enum no longer exists after task 1.1.)
- [x] 2.2 Create `packages/types/src/baseSchemas/magnitude.ts` with `MagnitudeBaseSchema`:
  ```ts
  z.object({
    id: IdSchema,
    code: z.string(),
    name: z.string(),
    isSystem: z.boolean(),
    status: z.nativeEnum(MeasurementUnitStatus),
  });
  ```
  Export the inferred type. Export from the package barrel.
- [x] 2.3 Update `packages/types/src/baseSchemas/measurementUnit.ts` (or wherever `MeasurementUnitBaseSchema` lives):
  - Remove the `magnitude: z.nativeEnum(Magnitude)` field.
  - Add `magnitudeId: IdSchema`.
  - Do NOT add a joined `magnitude` field to the base schema — base schemas mirror the DB table (per project memory). The joined `magnitude: MagnitudeBaseSchema` belongs on response shapes only.
- [x] 2.4 Update `packages/types/src/measurementUnits/getAllMeasurementUnits/schemas.ts`: each item in the response array SHALL include `magnitude: MagnitudeBaseSchema` (the joined object) in addition to `magnitudeId: IdSchema`.
- [x] 2.5 Update `packages/types/src/measurementUnits/admin/createMeasurementUnit/schemas.ts` and `.../updateMeasurementUnit/schemas.ts`: replace the request-body field `magnitude: z.nativeEnum(Magnitude)` with `magnitudeId: IdSchema`.
- [x] 2.6 Create `packages/types/src/magnitudes/admin/createMagnitude/schemas.ts` and `types.ts`:
  - Request body: `{ code: z.string().regex(/^[a-z][a-z0-9_]*$/, ...).min(1).max(MAGNITUDE_CODE_MAX_LENGTH), name: z.string().trim().min(1).max(MAGNITUDE_NAME_MAX_LENGTH) }`.
  - Response: `{ ...MagnitudeBaseSchema, referenceCount: z.number().int().nonnegative(), action: z.enum(["created", "fullyRestored"]) }`.
- [x] 2.7 Create `packages/types/src/magnitudes/admin/updateMagnitude/schemas.ts` and `types.ts`:
  - Path param: `id` (string-coerced bigint).
  - Request body: `{ name: z.string().trim().min(1).max(MAGNITUDE_NAME_MAX_LENGTH) }` — `code` and `isSystem` are not editable. Do NOT make this a `.partial()` — the only editable field is `name`, and an empty patch should be rejected.
- [x] 2.8 Create `packages/types/src/magnitudes/admin/deleteMagnitude/schemas.ts` and `types.ts`: path param `id`; response `{ id, status }`.
- [x] 2.9 Create `packages/types/src/magnitudes/getAllMagnitudes/schemas.ts` and `types.ts`: response is an array of `{ ...MagnitudeBaseSchema, referenceCount: z.number().int().nonnegative() }`.
- [x] 2.10 Re-export from `packages/types/src/magnitudes/index.ts` and update the package barrel.
- [x] 2.11 Add `MAGNITUDE_NAME_MAX_LENGTH` (suggested: `100`) and `MAGNITUDE_CODE_MAX_LENGTH` (suggested: `50`) to `packages/constants/src/` (e.g., a new `magnitude.ts` module exported via `packages/constants/src/index.ts`). The Zod schemas in 2.6/2.7 SHALL import from `@repo/constants` rather than re-declaring numeric literals.

## 3. API — Custom Errors

- [x] 3.1 Create `apps/api/src/features/magnitudes/errors.ts` with the error classes referenced below. Each extends the appropriate base error class in `apps/api/src/errors/` and maps to a code consumed by `getApiErrorMessage` on the frontend.
  - `MagnitudeNotFoundError` — target magnitude does not exist.
  - `MagnitudeIsSystemError` — attempt to soft-delete a magnitude with `isSystem = true`.
  - `MagnitudeReferencedError` — attempt to soft-delete a magnitude with `referenceCount > 0`.
  - `MagnitudeCodeAlreadyExistsError` — `code` collides with an ACTIVE row on create.
- [x] 3.2 Update `apps/api/src/features/measurementUnits/errors.ts` if any error message references the magnitude enum string (e.g., `"A base measurement unit already exists for this magnitude."`) — the message can stay (it is generic), but verify nothing branches on the old enum.

## 4. API — Helpers

- [x] 4.1 Create `apps/api/src/features/magnitudes/helpers.ts` with:
  - `getMagnitudeReferenceCount(tx, magnitudeId)`: returns `tx.measurementUnit.count({ where: { magnitudeId } })`. Note: counts ALL MU rows regardless of status — historical MUs still hold the FK.
  - `assertMagnitudeNotSystem(magnitude)`: throws `MagnitudeIsSystemError` if `magnitude.isSystem === true`.

## 5. API — List Endpoint

- [x] 5.1 Create `apps/api/src/features/magnitudes/getAllMagnitudes/route.ts`. GET `/magnitudes`. The route itself declares no auth hooks — they are applied by the parent scope in task 9, which gates the entire magnitudes module behind `[SUPERADMIN, ADMIN]` (per Decision 9, including the list endpoint).
- [x] 5.2 Create `handler.ts` and `service.ts`:
  - Filter `where: { status: "ACTIVE" }`, default order `[{ isSystem: "desc" }, { name: "asc" }]` (system magnitudes pinned to the top).
  - Compute `referenceCount` for all rows in a single pass: `tx.measurementUnit.groupBy({ by: ["magnitudeId"], _count: { _all: true } })`. Merge into a `Map<magnitudeId, number>` and attach to each row. The number of queries is fixed at two (magnitudes + groupBy) regardless of row count.

## 6. API — Create Endpoint

- [x] 6.1 Create `apps/api/src/features/magnitudes/createMagnitude/route.ts`. POST `/magnitudes`. Response schemas for HTTP 200, 400, 401, 403, 409 (code conflict), 500.
- [x] 6.2 Create `handler.ts` and `service.ts`:
  - Inside `prismaClient.$transaction`:
    - Look up an existing magnitude by `code` **including DELETED**.
    - **Not found**: insert with `isSystem = false`, `status = ACTIVE`. Action = `"created"`.
    - **Found, status = DELETED, isSystem = false**: restore — set `status = ACTIVE`, overwrite `name` from the new payload. Action = `"fullyRestored"`.
    - **Found, status = DELETED, isSystem = true**: should be unreachable (system magnitudes can't be soft-deleted) — throw `DataIntegrityError`.
    - **Found, status = ACTIVE**: throw `MagnitudeCodeAlreadyExistsError`.
- [x] 6.3 Catch P2002 on `code` and translate to `MagnitudeCodeAlreadyExistsError`.

## 7. API — Update Endpoint

- [x] 7.1 Create `apps/api/src/features/magnitudes/updateMagnitude/route.ts`. PATCH `/magnitudes/:id`. Response schemas for HTTP 200, 400, 401, 403, 404, 500.
- [x] 7.2 Create `handler.ts` and `service.ts`:
  - Resolve target magnitude by id; throw `MagnitudeNotFoundError` if missing.
  - Apply `name` update. Do NOT mutate `code`, `isSystem`, or `status` (the route schema already disallows them in the body, but the service mirrors the constraint defensively).
  - No reference-count check is needed — `name` is always editable.

## 8. API — Soft-Delete Endpoint

- [x] 8.1 Create `apps/api/src/features/magnitudes/deleteMagnitude/route.ts`. DELETE `/magnitudes/:id`. Response schemas for HTTP 200, 401, 403, 404, 422 (system or referenced), 500.
- [x] 8.2 Create `handler.ts` and `service.ts`:
  - Inside `$transaction`:
    - Resolve target magnitude by id; throw `MagnitudeNotFoundError` if missing.
    - `assertMagnitudeNotSystem(target)`.
    - Compute `referenceCount`. If `> 0`: throw `MagnitudeReferencedError`.
    - Set `status = DELETED`.
- [x] 8.3 Return `{ id, status: "DELETED" }`.

## 9. API — Route Registration

- [x] 9.1 Create `apps/api/src/routes/api/magnitudes/index.ts`. Single scope wrapping all four routes — there is no public list, so no split-scope is needed:
  - Register `requireAuth` (onRequest) + `requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` (preHandler) at the top of the function.
  - Register `getAllMagnitudesRoute`, `createMagnitudeRoute`, `updateMagnitudeRoute`, `deleteMagnitudeRoute` after the hooks. All four inherit the admin guard.
- [x] 9.2 Wire the new `magnitudes` module into the API root route registry (`apps/api/src/routes/api/index.ts` or wherever `measurement-units` is registered). Confirm the OpenAPI docs at `/docs` show the new endpoints after start-up.

## 10. API — Update Existing MU Endpoints

- [x] 10.1 `apps/api/src/features/measurementUnits/getAllMeasurementUnits/service.ts`: add `include: { magnitude: true }` to the query and update the response mapper to project the joined object onto the response shape (per task 2.4). Update `orderBy` from `[{ magnitude: "asc" }, { name: "asc" }]` to `[{ magnitude: { name: "asc" } }, { name: "asc" }]`.
- [x] 10.2 `apps/api/src/features/measurementUnits/createMeasurementUnit/service.ts`:
  - Replace `where: { magnitude: body.magnitude, isBase: true, ... }` with `where: { magnitudeId: body.magnitudeId, isBase: true, ... }`.
  - Replace `magnitude: body.magnitude` in the `tx.measurementUnit.create({ data: ... })` payload with `magnitudeId: body.magnitudeId`.
  - In the restore branch (full overwrite), replace `magnitude: body.magnitude` with `magnitudeId: body.magnitudeId` similarly.
- [x] 10.3 `apps/api/src/features/measurementUnits/updateMeasurementUnit/service.ts`:
  - Replace the lock check `(body.magnitude !== undefined && body.magnitude !== target.magnitude)` with `(body.magnitudeId !== undefined && body.magnitudeId !== target.magnitudeId)`.
  - Replace the "second base for the same magnitude" check (`effectiveMagnitude = body.magnitude ?? target.magnitude`) with `effectiveMagnitudeId = body.magnitudeId ?? target.magnitudeId`, and update the `where` clause similarly.
  - Replace `if (body.magnitude !== undefined) updateData.magnitude = body.magnitude;` with `if (body.magnitudeId !== undefined) updateData.magnitudeId = body.magnitudeId;`.
- [x] 10.4 `apps/api/src/features/measurementUnits/getAllRateMeasurementUnits/service.ts`: where the response mapper currently exposes `magnitude: item.numeratorMeasurementUnit.magnitude`, change to `magnitude: item.numeratorMeasurementUnit.magnitude` (now the joined object via `include`). Update the `select`/`include` to fetch the joined magnitude. Mirror for the denominator.
- [x] 10.5 `apps/api/src/features/measurementUnits/mappers.ts`: update the mapper that emits `magnitude: mu.magnitude` to project the joined `magnitude` object instead of an enum string.

## 11. API — Methodology Helper

- [x] 11.1 `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/helper.ts:272`: update the grouping key from `${num.magnitude}-${den.magnitude}` to `${num.magnitudeId}-${den.magnitudeId}` (BigInt → string via template literal). Update the `select`/`include` shapes (lines 14, 21, 43, 50, 252, 259) so the `magnitude` field on numerator/denominator returns the joined `Magnitude` row instead of the enum string. Confirm the consumer at line 189 / 191 still receives an addressable magnitude — adjust the `select` to `magnitude: { select: { id: true, code: true, name: true } }` if it currently selects only the scalar.
- [ ] 11.2 Re-run the methodology integration tests to confirm grouping correctness is preserved.

## 12. API — Cross-cutting Picker Audit

- [x] 12.1 Grep the API codebase for any remaining `Magnitude.` enum references (e.g., `Magnitude.MASS`, `Magnitude.ANIMALS`) and any `import { Magnitude }` imports from `@repo/database` or `@repo/types`. Replace each: lookups by `code` for any place that needs a specific magnitude row; type imports become irrelevant since the enum no longer exists. After the refactor, confirm `pnpm type-check` passes.
- [x] 12.2 Audit reads of `Magnitude` (the new model) across the API for the picker-vs-display rule: picker contexts (admin selecting a magnitude in any maintainer screen, or any list endpoint that feeds a picker) SHALL filter `status: ACTIVE`; display contexts (joining `magnitude` on an existing MU to render a label) SHALL NOT.

## 13. Frontend — Query Hooks

- [x] 13.1 Update `apps/web/src/api/query/maintainer/keys.ts`: add `magnitudes.all` and `magnitudes.detail(id)` query keys.
- [x] 13.2 Create `useMagnitudes`: fetches `GET /magnitudes`, returns the response shape with `referenceCount`. Default `staleTime` consistent with other reference-data hooks (e.g., 5 minutes).
- [x] 13.3 Create `useAddMagnitude`: posts to `magnitudes`, invalidates `magnitudes.all` on success.
- [x] 13.4 Create `useUpdateMagnitude`: PATCHes `magnitudes/:id`, invalidates on success.
- [x] 13.5 Create `useDeleteMagnitude`: DELETEs `magnitudes/:id`, invalidates on success.
- [x] 13.6 Update `useMeasurementUnits` (or wherever it lives) to handle the new response shape with `magnitude: MagnitudeBaseSchema` joined.

## 14. Frontend — Vocabulary & Constant Cleanup

- [x] 14.1 Remove `MAGNITUDE_LABELS` from `apps/web/src/config/vocab.ts` (added by the prior `add-measurement-units-maintainer` change). Magnitude labels now come from the API.
- [x] 14.2 Remove the local `MAGNITUDE_LABELS` constant from `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/constants.ts` (and the `// TODO: we should handle this magnitudes in a database table` comment). Replace consumers with the resolved `magnitude.name` from the joined response.

## 15. Frontend — Magnitudes Screen

- [x] 15.1 Create `apps/web/src/screens/Maintainer/screens/MagnitudesScreen/MagnitudesScreen.tsx`. Use `StylizedDataGrid` with columns: `code` (read-only after creation), `name` (editable), `isSystem` (read-only badge: "Sistema" / blank), `referenceCount` (read-only), plus an actions column.
- [x] 15.2 Implement the inline-edit pattern from `CategoriesMaintainerScreen` / `MeasurementUnitsScreen`: edit/save/cancel per row, temp ID for new rows, dirty-row tracking, `useBlocker` for unsaved-changes warning. New rows show an editable `code` cell; existing rows render `code` as read-only.
- [x] 15.3 Hide the delete action on rows where `isSystem === true`. Show a tooltip explaining that system magnitudes cannot be removed.
- [x] 15.4 Disable the delete action on rows where `referenceCount > 0`. Tooltip: "Esta magnitud está en uso por unidades de medida. Elimina o reasigna esas unidades primero.".
- [x] 15.5 Wire mutations to `useAddMagnitude` / `useUpdateMagnitude` / `useDeleteMagnitude`. Use `getApiErrorMessage` for snackbar messages, mapping the new error codes (`MagnitudeCodeAlreadyExistsError`, `MagnitudeIsSystemError`, `MagnitudeReferencedError`, `MagnitudeNotFoundError`) to Spanish strings.
- [x] 15.6 Use Spanish for all UI text: column headers, button labels, tooltips, error messages, snackbar messages.
- [x] 15.7 Add a help text near the form's "Código" field: "Identificador en minúsculas (p. ej. `vehicles`). No se puede modificar luego de la creación.".

## 16. Frontend — Route Wiring & Sidebar

- [x] 16.1 Create `apps/web/src/routes/admin/magnitudes.tsx`. `beforeLoad` guard: `requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. Component: `MagnitudesScreen`.
- [x] 16.2 Add `Routes.ADMIN_MAGNITUDES = "/admin/magnitudes"` (or equivalent constant) to wherever existing admin route constants live.
- [x] 16.3 In `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`, add a new top-level sidebar entry "Magnitudes" with the new route. Place it adjacent to the existing "Unidades" entry. The future `regroup-units-sidebar` change will collapse them into a "Unidades" group; do NOT introduce the group in this proposal.

## 17. Frontend — Update Measurement Units Screen

- [x] 17.1 In `MeasurementUnitsScreen/MeasurementUnitsScreen.tsx`, replace the new-row default `magnitude: Magnitude.ANIMALS` (line ~243) with the first ACTIVE magnitude returned by `useMagnitudes()` (or the user's last-selected magnitude held in component state). If the magnitudes list is empty (e.g., first deploy before seed runs), block the "Add row" action and show an explanatory snackbar.
- [x] 17.2 In `MeasurementUnitsScreen/hooks/useMeasurementUnitsForm.ts`, replace `magnitude: z.enum(Magnitude, ...)` with `magnitudeId: IdSchema` matching the new request body shape.
- [x] 17.3 Update the magnitude column rendering: read `row.magnitude.name` (joined from API) instead of `MAGNITUDE_LABELS[row.magnitude]`.
- [x] 17.4 Update the magnitude form picker (Autocomplete or Select): options come from `useMagnitudes()`, value is `magnitudeId` (string). Disable the picker entirely on rows where `referenceCount > 0` (existing field-locking rule from `add-measurement-units-maintainer`).

## 18. Testing — API

- [x] 18.1 Integration test for `getAllMagnitudes`: returns only ACTIVE rows, default order pins system magnitudes, every row carries `referenceCount`, and the endpoint enforces the admin guard (401 unauthenticated, 403 for non-admin authenticated users, 200 for ADMIN/SUPERADMIN).
- [x] 18.2 Integration test for `createMagnitude`: happy-path create with a valid lowercase `code`, code-collision (ACTIVE) → 409, restore-after-delete path, validation errors (uppercase code, invalid characters, name too long), auth checks (401, 403).
- [x] 18.3 Integration test for `updateMagnitude`: rename succeeds for system and custom magnitudes, attempt to send `code` or `isSystem` in body → 400 (route schema rejection), 404 path, auth checks.
- [x] 18.4 Integration test for `deleteMagnitude`: happy-path soft-delete of a custom magnitude with no MU references, blocked when `referenceCount > 0` → 422, blocked when `isSystem = true` → 422, 404 path, auth checks. Verify the magnitude row remains queryable when status filter is excluded.
- [x] 18.5 Integration test for the updated `getAllMeasurementUnits`: each row's `magnitude` is the joined `{ id, code, name, isSystem, status }` object; soft-deleted magnitudes are still returned on display reads (set up the test by seeding an MU whose magnitude is then soft-deleted, then read the MU list and verify the magnitude is present).
- [x] 18.6 Integration test for `createMeasurementUnit` and `updateMeasurementUnit`: the body now uses `magnitudeId` instead of `magnitude`. Re-run all existing test cases with the new shape; add a case where `magnitudeId` references a DELETED magnitude → 400 (route schema or service validation; pick one and document).
- [x] 18.7 Integration test for `getCarbonInventoryMethodology`: grouping by magnitude pair still produces correct buckets (numerator+denominator combinations match what the prior enum-based key produced).

## 19. Testing — Frontend

- [x] 19.1 Smoke-test the magnitudes screen in the dev server: create, edit, delete a custom magnitude; rename a system magnitude; attempt to delete a system magnitude (verify the action is hidden); attempt to delete a magnitude in use (verify the action is disabled).
- [x] 19.2 Smoke-test the measurement units screen: the magnitude column renders from the API, the form picker is populated from the screen-level `useMagnitudes()` query, the new-row default has `magnitudeId: null` (no preselection), the row cannot be saved until the user picks a magnitude, and the validation error is displayed in Spanish.

## 20. Documentation

- [x] 20.1 Update `docs/data-model/` with a section describing the new `Magnitude` model: stable `code`, admin-editable `name`, `isSystem` flag and its protections, soft-delete and reference count.
- [x] 20.2 Update `docs/development/` (or `apps/api/src/features/magnitudes/README.md`) with the country-extensibility recipe: how to add a new system magnitude via seed, vs. how admins add custom magnitudes via the screen.

## 21. Pre-merge Checks

- [x] 21.1 `pnpm format`
- [x] 21.2 `pnpm lint`
- [x] 21.3 `pnpm type-check`
- [x] 21.4 `pnpm test --filter=api -- /magnitudes --coverage=false`
- [x] 21.5 `pnpm test --filter=api -- /measurementUnits --coverage=false`
- [x] 21.6 `pnpm test --filter=api -- /carbonInventories --coverage=false` (covers the methodology helper change)
- [x] 21.7 `pnpm exec prisma migrate reset --force` against a local DB to confirm seed runs cleanly end-to-end.
- [x] 21.8 Manual smoke test of `/admin/magnitudes` and `/admin/units`: create a custom magnitude, then create a measurement unit referencing it; rename a system magnitude and confirm the MU screen reflects the new label; attempt to delete the custom magnitude (blocked because the MU references it); soft-delete the MU, then delete the custom magnitude (succeeds).

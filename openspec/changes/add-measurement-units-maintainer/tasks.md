## 1. Database Schema & Migration

- [ ] 1.1 Add a new Prisma enum `MeasurementUnitStatus { ACTIVE, DELETED }` (mapped to `measurement_unit_status`) in `packages/database/src/prisma/schema.prisma`.
- [ ] 1.2 Add `status MeasurementUnitStatus @default(ACTIVE)` to the `MeasurementUnit` model.
- [ ] 1.3 Add `status MeasurementUnitStatus @default(ACTIVE)` to the `RateMeasurementUnit` model.
- [ ] 1.4 Edit the original base migration (`packages/database/src/prisma/migrations/20251211144312_base/migration.sql`) where `measurement_unit` and `rate_measurement_unit` are created: add the `measurement_unit_status` enum type and add the `status` column (defaulting to `ACTIVE`) to both `CREATE TABLE` statements. Do NOT create a new migration file.
- [ ] 1.5 Update `packages/database/src/prisma/seeds/scripts/seedMeasurementUnits.ts` to assert canonical-RMU coverage at seed time. After the rate measurement units are inserted, resolve the `kg` MU and verify that for every `MeasurementUnit` there exists at least one `RateMeasurementUnit` with `numeratorMeasurementUnitId = kg.id AND denominatorMeasurementUnitId = MU.id`. Throw a descriptive error listing every MU that is missing its canonical RMU (and throw separately if the `kg` MU itself is missing). The check SHALL run for every dataset.
- [ ] 1.6 Run `pnpm prisma generate` to update the Prisma client types.

## 2. Types — Shared Schemas (`packages/types`)

- [ ] 2.0 Add `MEASUREMENT_UNIT_NAME_MAX_LENGTH` and `MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH` to `packages/constants/src/` (e.g., a new `measurementUnit.ts` module exported via `packages/constants/src/index.ts`). Suggested values: name = `100`, abbreviation = `30` (room for compound abbreviations like `tonelada-kilometro`); confirm during review. Both Zod schemas (task 2.3) and any frontend form-side validation SHALL import from `@repo/constants` rather than re-declaring numeric literals.
- [ ] 2.1 Export the `MeasurementUnitStatus` Prisma enum from `@repo/types` (alongside `Magnitude`).
- [ ] 2.2 Update the existing `packages/types/src/baseSchemas/category.ts` (or wherever `MeasurementUnitBaseSchema` lives) to include `status: z.nativeEnum(MeasurementUnitStatus)` and `referenceCount: z.number().int().nonnegative()` on the response shape.
- [ ] 2.3 Create `packages/types/src/measurementUnits/admin/createMeasurementUnit/schemas.ts` and `types.ts`. Request shape: `{ name, abbreviation, magnitude, baseFactor, isBase }`. Validations:
  - `name`: `z.string().trim().min(1, ...).max(MEASUREMENT_UNIT_NAME_MAX_LENGTH, ...)` with Spanish error messages.
  - `abbreviation`: `z.string().trim().min(1, ...).max(MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH, ...).regex(/^[^\s\/\x00-\x1F\x7F]+$/, ...)` to reject whitespace, ASCII control chars, and `/`.
  - `baseFactor`: `z.number().finite().positive()` (rejects `Infinity`/`-Infinity`/`NaN`/`<= 0`).
  - `magnitude`: `z.nativeEnum(Magnitude)`.
  - `isBase`: `z.boolean()`.
  - Response: full MU including `status`, `referenceCount`, and a discriminator (`"created" | "restored-full" | "restored-labels"`).
- [ ] 2.4 Create `packages/types/src/measurementUnits/admin/updateMeasurementUnit/schemas.ts` and `types.ts`. Request shape: derive from the create body schema via `.partial()` so the same per-field rules from 2.3 fire whenever a field is present (do NOT redefine validations — reuse the create schema as the source of truth). Path param: `id` as string-coerced bigint.
- [ ] 2.5 Create `packages/types/src/measurementUnits/admin/deleteMeasurementUnit/schemas.ts` and `types.ts`. Path param: `id`. Response: `{ id, status }`.
- [ ] 2.6 Update `packages/types/src/measurementUnits/getAllMeasurementUnits/schemas.ts` so each item includes `status` and `referenceCount`.
- [ ] 2.7 Update `packages/types/src/measurementUnits/getAllRateMeasurementUnits/schemas.ts` so each item includes `status`.
- [ ] 2.8 Re-export everything from `packages/types/src/measurementUnits/index.ts` and ensure the package barrel export is up to date.

## 3. API — Custom Errors

- [ ] 3.1 Create `apps/api/src/features/measurementUnits/errors.ts` with the error classes referenced below. Each extends the appropriate base error class in `apps/api/src/errors/` and maps to a code consumed by `getApiErrorMessage` on the frontend.
  - `KgMeasurementUnitNotFoundError` — `kg` MU lookup failed (system error).
  - `KgMeasurementUnitImmutableError` — attempt to update or soft-delete the `kg` row.
  - `BaseUnitImmutableError` — attempt to update or soft-delete a non-`kg` base unit.
  - `BaseUnitToggleNotAllowedError` — attempt to toggle `isBase` on any existing MU.
  - `MagnitudeAlreadyHasBaseUnitError` — attempt to create a second base for the same magnitude.
  - `MeasurementUnitAbbreviationAlreadyExistsError` — abbreviation collides with an ACTIVE row (create or rename).
  - `MeasurementUnitFieldsLockedError` — attempt to change `magnitude`/`baseFactor`/`isBase` on an MU with `referenceCount > 0`.
  - `MeasurementUnitNotFoundError` — target MU does not exist.

## 4. API — Helpers (`apps/api/src/features/measurementUnits/helpers.ts`)

- [ ] 4.1 Implement `resolveKgMeasurementUnit(tx)`: queries `tx.measurementUnit.findUnique({ where: { abbreviation: "kg" } })` and throws `KgMeasurementUnitNotFoundError` if missing.
- [ ] 4.2 Implement `getReferenceCount(tx, measurementUnitId)`: returns the number of references to the MU across `CarbonInventoryLineInput.measurementUnitId`, `SubcategoryMeasurementUnit.measurementUnitId`, plus references to its canonical RMU (`EmissionFactor.rateMeasurementUnitId`, `CarbonInventoryLineInput.manualFactorRateUnitId`, `CarbonInventoryLineFactor.appliedFactorRateUnitId`). Implementation runs all counts in parallel via `Promise.all`.
- [ ] 4.3 Implement `buildCanonicalRmuFields(mu)`: returns `{ abbreviation: "kg/" + mu.abbreviation, name: "kg por " + mu.name }`.
- [ ] 4.4 Implement `assertNotKgMu(mu)` and `assertNotBaseUnit(mu)`: throw the corresponding immutable errors when the row is system-protected.

## 5. API — Create Endpoint

- [ ] 5.1 Create `apps/api/src/features/measurementUnits/createMeasurementUnit/route.ts` with POST route, Zod schemas for body, and response schemas for HTTP 200, 400, 401, 403, 409 (abbreviation conflict / base conflict), 500.
- [ ] 5.2 Create `handler.ts` to parse and forward to the service.
- [ ] 5.3 Create `service.ts` with the following logic inside a `prismaClient.$transaction`:
  - Resolve `kg.id` via `resolveKgMeasurementUnit(tx)`.
  - If `body.isBase === true`, query for any existing ACTIVE MU with the same `magnitude` and `isBase = true`; throw `MagnitudeAlreadyHasBaseUnitError` on hit.
  - Look up an existing MU by abbreviation **including DELETED**.
    - **Not found**: `tx.measurementUnit.create(...)`. Cascade-create the canonical RMU with `numeratorMeasurementUnitId = kg.id`, `denominatorMeasurementUnitId = newMu.id`, status `ACTIVE`. Return `{ ...mapped, action: "created" }`.
    - **Found, status DELETED**:
      - Compute `referenceCount` via `getReferenceCount(tx, found.id)`.
      - If `referenceCount > 0`: update only `name`, `abbreviation`, set `status = ACTIVE`. Action = `"restored-labels"`.
      - Else: full overwrite of `{ name, abbreviation, magnitude, baseFactor, isBase }`, set `status = ACTIVE`. Action = `"restored-full"`.
      - Cascade-restore the RMU: find by `denominatorMeasurementUnitId = found.id`; rebuild `abbreviation`/`name` via `buildCanonicalRmuFields(updatedMu)`; set status `ACTIVE`. Throw `MeasurementUnitAbbreviationAlreadyExistsError` if a separate ACTIVE RMU already holds the new RMU abbreviation (P2002 trap).
    - **Found, status ACTIVE**: throw `MeasurementUnitAbbreviationAlreadyExistsError`.
- [ ] 5.4 Catch `Prisma.PrismaClientKnownRequestError` with `code === "P2002"` and translate into `MeasurementUnitAbbreviationAlreadyExistsError`.

## 6. API — Update Endpoint

- [ ] 6.1 Create `apps/api/src/features/measurementUnits/updateMeasurementUnit/route.ts` with PATCH `/measurement-units/:id`, Zod schemas for params and body, and response schemas for HTTP 200, 400, 401, 403, 404, 409, 422 (locked field), 500.
- [ ] 6.2 Create `handler.ts`.
- [ ] 6.3 Create `service.ts` inside a `$transaction`:
  - Resolve target MU by id; throw `MeasurementUnitNotFoundError` if missing.
  - `assertNotKgMu(target)`; if any field is being changed and `target.isBase === true`, `assertNotBaseUnit(target)`.
  - If `body.isBase` is present and differs from `target.isBase`: throw `BaseUnitToggleNotAllowedError`.
  - Compute `referenceCount`. If any of `magnitude`, `baseFactor` is in the body and `referenceCount > 0`: throw `MeasurementUnitFieldsLockedError`.
  - Apply the partial update to the MU.
  - Cascade-update RMU: if `name` or `abbreviation` changed, rebuild RMU `name`/`abbreviation` via `buildCanonicalRmuFields(updatedMu)`. Catch P2002 → `MeasurementUnitAbbreviationAlreadyExistsError`.
- [ ] 6.4 Catch and translate Prisma P2002 errors as in 5.4.

## 7. API — Soft-Delete Endpoint

- [ ] 7.1 Create `apps/api/src/features/measurementUnits/deleteMeasurementUnit/route.ts` with DELETE `/measurement-units/:id`, Zod schemas, and response schemas for HTTP 200, 401, 403, 404, 422 (protected row), 500.
- [ ] 7.2 Create `handler.ts`.
- [ ] 7.3 Create `service.ts` inside a `$transaction`:
  - Resolve target MU by id; throw `MeasurementUnitNotFoundError` if missing.
  - `assertNotKgMu(target)` and `assertNotBaseUnit(target)`.
  - Resolve `kg.id` via `resolveKgMeasurementUnit(tx)`.
  - Look up the canonical RMU via `tx.rateMeasurementUnit.findFirst({ where: { denominatorMeasurementUnitId: target.id, numeratorMeasurementUnitId: kg.id } })`.
    - **Not found**: abort the transaction and throw `DataIntegrityError` (log the target MU id + abbreviation for operator forensics). Per the spec scenario "Soft-deleting an MU whose canonical RMU is missing fails with data-integrity error", the endpoint MUST NOT silently flip the MU to `DELETED` without a corresponding RMU. This branch should be unreachable at runtime (seed coverage check + create cascade guarantee), but is defensive against database drift.
    - **Found, status `DELETED`**: idempotent path. Skip the RMU update entirely (do NOT re-issue an UPDATE that would no-op or trample audit columns). Continue to flip the MU.
    - **Found, status `ACTIVE`**: set `status = DELETED` on the RMU.
  - Set `status = DELETED` on the target MU (in the same transaction as the RMU branch above).
- [ ] 7.4 Return `{ id, status: "DELETED" }`.

## 8. API — Update Existing List Endpoints

- [ ] 8.1 Update `apps/api/src/features/measurementUnits/getAllMeasurementUnits/service.ts` to filter `where: { status: "ACTIVE" }`, apply default ordering `(magnitude ASC, name ASC)`, and include `referenceCount` per row. The implementation MUST NOT call `getReferenceCount` per row (that helper exists for single-row endpoints and would cause N+1 query fan-out). Instead, compute counts for all returned MUs in a single pass: run one `groupBy({ by: [<fk>], where: { <fk>: { in: muIds } }, _count: { _all: true } })` per referencing column — `CarbonInventoryLineInput.measurementUnitId`, `SubcategoryMeasurementUnit.measurementUnitId`, and the three canonical-RMU references via the joined RMU ids (`EmissionFactor.rateMeasurementUnitId`, `CarbonInventoryLineInput.manualFactorRateUnitId`, `CarbonInventoryLineFactor.appliedFactorRateUnitId`) — execute these `groupBy` queries in parallel via `Promise.all`, then merge the per-fk maps into a single `Map<muId, number>` and attach the count to each row before returning. The number of queries is fixed (one per referencing column) regardless of row count.
- [ ] 8.2 Update `getAllRateMeasurementUnits/service.ts` to filter `where: { status: "ACTIVE" }`.
- [ ] 8.3 Update both response schemas in `packages/types/src/measurementUnits/...` accordingly (covered in 2.6 and 2.7).

## 9. API — Route Registration

- [ ] 9.1 Update `apps/api/src/routes/api/measurement-units/index.ts` to register the new mutation routes without regressing the existing public-list endpoints. Keep `getAllMeasurementUnitsRoute(fastify)` and `getAllRateMeasurementUnitsRoute(fastify)` at the outer scope (no auth/role hooks), then call `fastify.register((f) => { ... })` to create a child scope that adds `f.addHook("onRequest", f.requireAuth)` and `f.addHook("preHandler", f.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN]))`, and inside that scope register `createMeasurementUnitRoute(f)`, `updateMeasurementUnitRoute(f)`, and `deleteMeasurementUnitRoute(f)`. Mirror the existing pattern from `apps/api/src/routes/api/badges/index.ts`. Do NOT apply the role guard at the module level — the list endpoints are consumed by the `EmissionEditor` (`apps/web/src/screens/CarbonInventory/components/EmissionEditor/hooks/useEmissionEditorData.ts`) for non-admin users.

## 10. API — Cross-cutting Picker Audit

- [ ] 10.1 Grep the API codebase for every read query that touches `measurementUnit` or `rateMeasurementUnit` (`prisma.measurementUnit.find*`, `prisma.rateMeasurementUnit.find*`, and any `include: { measurementUnit: ... }` or `include: { rateMeasurementUnit: ... }`).
- [ ] 10.2 Classify each call site: **picker** (admin/user about to select a unit for a NEW row) vs **display** (resolving an existing FK to render history).
- [ ] 10.3 Add `where: { status: "ACTIVE" }` to picker-context queries only. Display-context joins remain unfiltered.
- [ ] 10.4 Document the audit results in a comment block in `apps/api/src/features/measurementUnits/README.md` (or alongside the helpers) so future contributors see the rule.

## 11. Frontend — Query Hooks

- [ ] 11.1 Update `apps/web/src/api/query/maintainer/keys.ts` to add `measurementUnits.all` and `measurementUnits.detail(id)` query keys.
- [ ] 11.2 Update `useMeasurementUnits` (or create one under `apps/web/src/api/query/maintainer/`) to fetch the new shape (with `status`, `referenceCount`) and to use the new query key.
- [ ] 11.3 Create `useAddMeasurementUnit`: posts to `measurement-units`, invalidates `measurementUnits.all` on success.
- [ ] 11.4 Create `useUpdateMeasurementUnit`: PATCHes `measurement-units/:id`, invalidates on success.
- [ ] 11.5 Create `useDeleteMeasurementUnit`: DELETEs `measurement-units/:id`, invalidates on success.

## 12. Frontend — Vocabulary

- [ ] 12.1 Add `MAGNITUDE_LABELS: Record<Magnitude, string>` to `apps/web/src/config/vocab.ts` covering every value in the `Magnitude` enum, in Spanish, using the exact mapping specified in `specs/measurement-units-maintainer-screen/spec.md` (MASS → "Masa", VOLUME → "Volumen", DISTANCE → "Distancia", TIME → "Tiempo", ANIMALS → "Animales", AREA → "Área", POWER → "Potencia", ENERGY → "Energía", DISTANCE_MASS → "Distancia · Masa", ROOMS → "Habitaciones"). The `Record<Magnitude, string>` typing SHALL be preserved so that future enum additions cause a type error until labeled.

## 13. Frontend — Screen

- [ ] 13.1 Create `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/MeasurementUnitsScreen.tsx`. Use `StylizedDataGrid` with columns: `name`, `abbreviation`, `magnitude` (rendered via `MAGNITUDE_LABELS`), `baseFactor`, `isBase`, plus an actions column.
- [ ] 13.2 Enable native `StylizedDataGrid` column filtering and sorting. Default sort model: `[{ field: "magnitude", sort: "asc" }, { field: "name", sort: "asc" }]`.
- [ ] 13.3 Implement the inline-edit pattern from `CategoriesMaintainerScreen`: edit/save/cancel per row, temp ID for new rows, dirty-row tracking, `useBlocker` for unsaved-changes warning.
- [ ] 13.4 Disable cell editing for `magnitude`, `baseFactor`, `isBase` when `row.referenceCount > 0`. Render a tooltip explaining why on hover.
- [ ] 13.5 Hide the edit and delete actions for the row where `abbreviation === "kg"` and for any row where `isBase === true`. Render an info icon with a tooltip explaining the protection.
- [ ] 13.6 Wire mutations to `useAddMeasurementUnit` / `useUpdateMeasurementUnit` / `useDeleteMeasurementUnit`. Show a snackbar on success/error using `getApiErrorMessage` for the API error codes added in step 3.
- [ ] 13.7 When the create response action is `"restored-labels"` or `"restored-full"`, show a contextual confirmation snackbar (e.g., "Unidad restaurada").
- [ ] 13.8 Use Spanish for all UI text: column headers, button labels, tooltips, error messages, snackbar messages.

## 14. Frontend — Route Wiring

- [ ] 14.1 Update `apps/web/src/routes/admin/units.tsx`: replace `UnderConstructionScreen` with `MeasurementUnitsScreen`, change the `beforeLoad` guard to `requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`.

## 15. Frontend — Picker Audit

- [ ] 15.1 Mirror task 10 on the frontend: grep for every consumer of `useMeasurementUnits` / `useRateMeasurementUnits` and any direct unit picker. Classify as picker vs. display. Pickers SHALL drive their options off the list endpoint (already filtered to `ACTIVE` by step 8). Display-only consumers (rendering historical data) SHALL not be changed.

## 16. Testing — API

- [ ] 16.1 Integration test for `createMeasurementUnit`: happy-path create, abbreviation collision (ACTIVE) → 409, base collision → 409, restore-with-no-refs (full overwrite), restore-with-refs (label-only overwrite), `kg` lookup failure path, auth checks (401, 403). **Validation cases (all → HTTP 400, exercising the Zod schema from 2.3)**: empty `name`, empty `abbreviation`, name/abbreviation exceeding the `@repo/constants` max-length, abbreviation containing whitespace, abbreviation containing the `/` character, abbreviation containing an ASCII control character, `baseFactor = 0`, `baseFactor = -1`, `baseFactor = Infinity`, `baseFactor = NaN`, invalid `magnitude` string. The same validation cases SHALL also be exercised against the update endpoint in 16.2 (since the update body is `.partial()` of the create body, the rules apply when the field is present).
- [ ] 16.2 Integration test for `updateMeasurementUnit`: rename cascade to RMU, locked-field rejection when `referenceCount > 0`, `kg` row rejection, base-unit rejection, `isBase` toggle rejection, abbreviation collision on rename, 404 path, auth checks.
- [ ] 16.3 Integration test for `deleteMeasurementUnit`: happy-path soft-delete cascades the canonical RMU from `ACTIVE → DELETED`; idempotent path where the canonical RMU is already `DELETED` succeeds with HTTP 200, flips the MU to `DELETED`, and leaves the RMU row's status (and `updatedAt`) untouched; missing-canonical-RMU path (force the inconsistency in the test by deleting the RMU row directly) responds with HTTP 500, the MU's status remains `ACTIVE` (transaction rolled back), and a `DataIntegrityError` is logged; `kg` rejection, base rejection, 404 path, auth checks. Verify the row remains queryable when status is excluded from the filter.
- [ ] 16.4 Integration test for `getAllMeasurementUnits`: returns only `ACTIVE`, includes `referenceCount`, default order is `(magnitude, name)`.

## 17. Documentation

- [ ] 17.1 Update `docs/data-model/` (or the appropriate folder) with a section describing the MU/RMU lifecycle: status enum, cascade rule, derivation formula, reference-count lock, system-protected rows.
- [ ] 17.2 Mention the picker-vs-display rule in `docs/development/` so future contributors know to filter `status: ACTIVE` only in picker contexts.

## 18. Pre-merge Checks

- [ ] 18.1 `pnpm format`
- [ ] 18.2 `pnpm lint`
- [ ] 18.3 `pnpm type-check`
- [ ] 18.4 `pnpm test --filter=api -- /measurementUnits --coverage=false`
- [ ] 18.5 Manual smoke test of the screen: create, edit name, edit abbreviation (verify RMU cascade in DB), attempt locked field edit on a referenced row (verify 422), soft-delete an unreferenced row, re-create the same abbreviation (verify restore branch chosen).

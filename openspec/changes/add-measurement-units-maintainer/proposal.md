## Why

The admin route `/admin/units` currently shows an `UnderConstructionScreen`. Platform admins need the ability to manage measurement units (e.g., kg, ton, kWh, km) without database access, since each country deployment may need to add or adjust local units. Today, measurement units are seed-only; once deployed, they cannot be edited via the UI.

In addition, every `MeasurementUnit` is paired with a canonical `RateMeasurementUnit` of the form `kg/<MU.abbreviation>` (where `kg` is the standard numerator for emission factors expressed in kg CO₂e). This pairing must be preserved automatically whenever a measurement unit is created, modified, or removed — admins should not need to manage rate units manually.

## What Changes

- Replace the `UnderConstructionScreen` at `/admin/units` with a fully functional `MeasurementUnitsScreen` (inline-edit DataGrid mirroring `CategoriesMaintainerScreen`).
- Add API endpoints for measurement-unit CRUD: list (enhanced), create, update, soft-delete.
- Introduce a soft-delete model for `MeasurementUnit` and `RateMeasurementUnit` via a shared `MeasurementUnitStatus` enum (`ACTIVE`, `DELETED`). Hard delete is never used.
- Cascade rules: every create/update/soft-delete/restore on an MU automatically creates/updates/soft-deletes/restores its canonical RMU `kg/<MU.abbreviation>` in the same database transaction. RMU `name` is derived as `kg por <MU.name>` and is rebuilt on rename — the RMU has no admin-editable fields.
- Field locking: `magnitude`, `baseFactor`, and `isBase` become locked once any reference exists in `CarbonInventoryLineInput`, `CarbonInventoryLineFactor`, `EmissionFactor` (via its RMU), or `SubcategoryMeasurementUnit`. `name` and `abbreviation` remain editable always.
- System-protected rows: the `kg` MU and any MU with `isBase=true` cannot be modified or soft-deleted. Each `Magnitude` value SHALL have exactly one base unit; the system rejects any operation that would create a second base or remove the existing one.
- Re-create-after-delete: creating a unit whose abbreviation matches an existing soft-deleted row restores that row instead of inserting a new one. If references exist, only `name` and `abbreviation` are overwritten; otherwise the full payload is applied. Status flips back to `ACTIVE` and the cascade restores the RMU.
- Picker-vs-display read pattern: every endpoint that lists MUs/RMUs _for selection_ (pickers) SHALL filter `status: ACTIVE`. Read-through joins on stored references (history) resolve regardless of status so historical line inputs and factors continue to display the unit name.
- One-time backfill migration that creates the canonical `kg/<abbrev>` RMU for any existing MU lacking one.
- Authorization: `[SUPERADMIN, ADMIN]` on both client (`requireRole` in `beforeLoad`) and server (`fastify.requireRoles`).
- Add Spanish labels for the `Magnitude` enum to `apps/web/src/config/vocab.ts`.

## Capabilities

### New Capabilities

- `measurement-unit-management`: Backend CRUD + cascade + soft-delete + restore + lock + backfill for `MeasurementUnit` and the canonical `RateMeasurementUnit`. Includes the database schema additions (`MeasurementUnitStatus` enum, `status` columns, migration).
- `measurement-units-maintainer-screen`: Frontend admin screen at `/admin/units` providing the inline-edit DataGrid UI for measurement-unit management.

### Modified Capabilities

None as named OpenSpec capabilities. The existing read endpoints (`getAllMeasurementUnits`, `getAllRateMeasurementUnits`) are enhanced as part of `measurement-unit-management`. The audit task (see tasks) covers any other in-app picker that lists MUs/RMUs and ensures it filters `status: ACTIVE`.

## Impact

- **Database**: New shared enum `MeasurementUnitStatus { ACTIVE, DELETED }`. New `status` column on `MeasurementUnit` and `RateMeasurementUnit` (default `ACTIVE`). One forward-only migration plus a backfill step for missing canonical RMUs. No data is destroyed.
- **API**: New feature endpoints under `apps/api/src/features/measurementUnits/`: `createMeasurementUnit`, `updateMeasurementUnit`, `deleteMeasurementUnit`. Existing list endpoints gain `status: ACTIVE` filter and a `referenceCount` (or `isLocked`) field per row.
- **Types**: New schemas under `packages/types/src/measurementUnits/admin/<endpoint>/`. The `MeasurementUnitStatus` enum exported from `@repo/types`.
- **Frontend**: New `MeasurementUnitsScreen` at `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/`, new query/mutation hooks under `apps/web/src/api/query/maintainer/`, route component swap at `apps/web/src/routes/admin/units.tsx`, and `MAGNITUDE_LABELS` added to `apps/web/src/config/vocab.ts`. Nav already wired (`MaintainerLayout.tsx` → `Routes.ADMIN_UNITS`).
- **Cross-cutting audit**: Any other endpoint or screen that exposes MUs/RMUs as a _picker_ must add a `status: ACTIVE` filter. Read-through joins for stored historical data are left unchanged.
- **Dependencies**: None. Uses existing `StylizedDataGrid`, MUI v7, React Hook Form + Zod, TanStack Query.

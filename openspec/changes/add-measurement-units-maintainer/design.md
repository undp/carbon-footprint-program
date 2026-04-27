## Context

Measurement units (`MeasurementUnit`) and rate measurement units (`RateMeasurementUnit`) are foundational reference data in Huella Latam. They drive unit conversions, line-input quantities, emission-factor expressions, and downstream emissions calculations. Today they are seeded once at deploy time with no in-app management. The route `/admin/units` exists in routing and the admin sidebar already links to it (`MaintainerLayout.tsx` exposes "Unidades" → `Routes.ADMIN_UNITS`), but the route currently renders `UnderConstructionScreen`.

The closest existing maintainer pattern is `CategoriesMaintainerScreen`, which uses an inline-edit `StylizedDataGrid` with temp-ID rows for new entries, optimistic UI, and per-row mutations.

A central design constraint is that **every `MeasurementUnit` is paired with a canonical `RateMeasurementUnit`** of the form `kg/<MU.abbreviation>`. The `kg` numerator is always the standard unit for emission factors expressed in kg CO₂e — there is no other numerator. This means the RMU is fully derivable from the parent MU and should never be edited directly by an admin.

## Goals / Non-Goals

**Goals:**

- Allow admins (SUPERADMIN and ADMIN) to perform CRUD on `MeasurementUnit` from a single screen at `/admin/units`.
- Ensure the canonical `RateMeasurementUnit` (`kg/<abbreviation>`) is always in sync with its parent MU, with no admin action required.
- Preserve historical data: line inputs, factors, and emission factors that reference a unit must continue to resolve unit names even after the unit is deleted.
- Protect invariants of the unit-conversion system (a single base unit per magnitude; `kg` always present).
- Reuse existing patterns for routing, authorization, types, query hooks, and DataGrid UI.

**Non-Goals:**

- Managing non-canonical rate measurement units (e.g., `ton/kg`, `kg/MWh` other than as cascade outputs). These remain seed-managed.
- Hard-deleting any unit. All removals are soft-delete with status flags.
- Bulk import/export of units.
- Changing how units are resolved or formatted in display contexts (line inputs, factors, etc.) — only the _picker_ contexts get a status filter.
- Multi-locale labels for the `Magnitude` enum. Spanish-only, consistent with the rest of the app.

## Decisions

### 1. Soft-delete via shared `MeasurementUnitStatus` enum on both MU and RMU

**Decision**: Introduce a new Prisma enum `MeasurementUnitStatus { ACTIVE, DELETED }` and add a `status` column to both `MeasurementUnit` and `RateMeasurementUnit`, defaulting to `ACTIVE`. Soft-deleting an MU also soft-deletes its canonical RMU in the same transaction. Restoring an MU restores its RMU.

**Rationale**: Hard-deleting a unit referenced by historical line inputs, factors, or emission factors would corrupt past inventories. Soft-delete preserves history while letting admins retire units. Sharing one enum across both tables keeps the schema simple — both have identical lifecycle semantics.

**Alternatives considered**:

- **Block hard-delete if referenced**: simpler (no schema change), but admins can never reclaim an abbreviation slot, and there is no path to retire a unit while keeping its name resolvable for history. Rejected.
- **Hard cascade delete**: would shred historical inventories. Rejected outright.
- **Separate per-table status enums**: unnecessary divergence. Rejected.

### 2. Canonical RMU is fully derived

**Decision**: For every `MeasurementUnit X`, exactly one `RateMeasurementUnit` exists with:

```
abbreviation = `kg/${MU.abbreviation}`
name         = `kg por ${MU.name}`
numeratorMeasurementUnitId   = (lookup) MU where abbreviation = "kg"
denominatorMeasurementUnitId = MU.id
status                       = MU.status
```

Both string fields are rebuilt from the parent MU on every MU rename. The RMU has no admin-editable fields and is never shown in the maintainer screen.

**Rationale**: Anchoring on `kg` matches the convention that emission factors are expressed in kg CO₂e per activity unit. Treating the RMU as fully derived eliminates the possibility of MU/RMU drift and removes a class of UI complexity. Looking up `kg.id` at runtime via `findUnique({ abbreviation: "kg" })` (rather than hardcoding the id) keeps the cascade resilient to per-deployment id differences.

**Alternatives considered**:

- **Allow admin to override RMU `name`**: would require a separate UI affordance. The screen never shows RMU rows, so there is no place to edit them, making this purely theoretical. Rejected.
- **Use a stable boolean flag (e.g., `isCo2eUnit`) on MU instead of the abbreviation `"kg"`**: more decoupled but adds a column for a single-row use case. Rejected for simplicity. The `kg` row will be system-protected, which prevents the lookup string from being broken.

### 3. Re-create-after-delete behavior (B2: detect and restore)

**Decision**: The create endpoint first looks up an existing row by abbreviation **including DELETED rows**. Three branches:

| Found | Status  | Action                                                                                                  |
| ----- | ------- | ------------------------------------------------------------------------------------------------------- |
| no    | —       | Insert new MU + cascade insert canonical RMU                                                            |
| yes   | DELETED | Restore-with-overwrite respecting the lock (see Decision 4); flip status to ACTIVE; cascade restore RMU |
| yes   | ACTIVE  | Throw `MeasurementUnitAbbreviationAlreadyExistsError`                                                   |

**Rationale**: B2 gives admins a friendly path back ("the unit you wanted exists in deleted form — here it is again, with your new data"). Using abbreviation as the natural key works because abbreviation is unique and is what admins type to refer to a unit.

**Alternatives considered**:

- **B1: partial unique index** (`UNIQUE WHERE status='ACTIVE'`): cleanest model but Prisma lacks first-class support — would require raw SQL migration and removing `@unique` from the schema. Rejected for tooling friction.
- **B3: disallow reuse**: simplest server logic but an admin who deletes a unit by mistake can never restore it. Worst UX. Rejected.

### 4. Field-locking based on reference count

**Decision**: Once any of the following references an MU, the fields `magnitude`, `baseFactor`, and `isBase` become immutable on that MU:

- `CarbonInventoryLineInput.measurementUnitId` (any line input)
- `CarbonInventoryLineFactor.appliedFactorRateUnitId` (the canonical RMU as denominator's RMU id)
- `EmissionFactor.rateMeasurementUnitId` (the canonical RMU's id)
- `CarbonInventoryLineInput.manualFactorRateUnitId` (the canonical RMU's id)
- `SubcategoryMeasurementUnit.measurementUnitId`

The fields `name` and `abbreviation` remain editable always (they are cosmetic / labels, and the cascade rebuilds the RMU's derived strings on rename).

The list endpoint exposes `referenceCount: number` (or equivalently `isLocked: boolean`) per row so the UI can disable the locked cells without a second round-trip.

**Rationale**: `magnitude`, `baseFactor`, and `isBase` are physical-quantity definitions. Mutating them after data is collected silently corrupts every conversion that uses the unit. Locking them is the only safe rule. Allowing `name`/`abbreviation` edits gives admins room to correct typos and labels without risk.

**Alternatives considered**:

- **Always lock after creation**: simpler (no reference count) but blocks legitimate edits before any data is recorded. Rejected.
- **Allow edits with a hard-confirm dialog**: still risks silent corruption if admins click through. Rejected.

### 5. Restore overwrites only what the lock allows

**Decision**: When restoring a soft-deleted MU (Decision 3, "found, status=DELETED" branch), the service evaluates the lock as if for an update:

- If `referenceCount > 0`: overwrite only `name` and `abbreviation` from the new payload; preserve the soft-deleted row's existing `magnitude`, `baseFactor`, `isBase`.
- If `referenceCount == 0`: overwrite all fields with the new payload.

Then flip status to `ACTIVE` and cascade restore the RMU.

**Rationale**: A soft-deleted unit's references are not cleaned up — historical line inputs still point to it. Restoring with new physical values would retroactively change what those historical inputs mean. Respecting the lock during restore preserves history just as it does during update.

**Alternatives considered**:

- **Always full overwrite on restore**: corrupts history when references exist. Rejected.
- **Only allow restore if `referenceCount == 0`**: too restrictive — admins frequently want to restore a unit precisely _because_ historical data references it. Rejected.

### 6. System-protected rows: `kg` and every base unit

**Decision**: The following rows reject all update and soft-delete operations at the API layer (and have edit/delete controls hidden in the UI):

- The MU with `abbreviation = "kg"` — anchor of the cascade lookup.
- Any MU with `isBase = true` — anchor of the magnitude conversion table.

Errors:

- `KgMeasurementUnitImmutableError` — attempt to update or soft-delete the `kg` row.
- `BaseUnitImmutableError` — attempt to update or soft-delete a non-`kg` base unit.
- `MagnitudeAlreadyHasBaseUnitError` — attempt to create a new MU with `isBase = true` for a magnitude that already has a base.
- `BaseUnitToggleNotAllowedError` — attempt to toggle the `isBase` field on any existing MU.

The `isBase` invariant is therefore: **every `Magnitude` has exactly one base unit, and that unit is fixed for the lifetime of the deployment**. Replacing a base requires a schema-level migration, not an admin action.

**Rationale**: The cascade depends on `kg` always existing and being addressable by abbreviation. The conversion system depends on each magnitude having exactly one base. These are deployment-wide invariants; removing the ability to violate them through the maintainer screen eliminates an entire class of footguns.

### 7. Picker-vs-display read pattern

**Decision**: Two distinct read modes for MU/RMU data:

- **Picker mode** (admin selects a unit for new entry — line input forms, factor entry, the maintainer screen itself): query SHALL include `where: { status: "ACTIVE" }`.
- **Display mode** (resolving a stored FK to show a unit name on existing data — line input rows, factor rows, history): query joins via `include` SHALL **not** filter by status. Soft-deleted units must remain readable to preserve historical context.

**Rationale**: Without a picker filter, soft-delete has no functional effect — admins can't actually retire a unit. Without unfiltered displays, historical data appears broken when a unit is later removed. Splitting the rule by context preserves both ends.

**Implementation note**: This rule is cross-cutting. The implementation includes an audit step — grep the codebase for all reads of `measurementUnit` and `rateMeasurementUnit`, classify each as picker vs. display, and add the `status: ACTIVE` filter only where appropriate.

### 8. Schema additions in the base migration

**Decision**: The `MeasurementUnitStatus` enum and the `status` columns on `MeasurementUnit` and `RateMeasurementUnit` are added by editing the original base migration that creates these tables (`20251211144312_base/migration.sql`) — not by adding a new migration file. The columns default to `ACTIVE`, so seed data inserted by the base migration receives the correct status without any additional step.

No backfill step is needed: the seed already pairs every `MeasurementUnit` with its canonical `kg/<abbrev>` `RateMeasurementUnit`, and country deployments are responsible for keeping their own seeds consistent. The cascade rule (#2) only governs admin-driven CRUD going forward; pre-existing rows are trusted as-is.

To make that trust enforceable, `seedMeasurementUnits.ts` SHALL include a coverage check after inserting RMUs: for every `MeasurementUnit`, assert that at least one `RateMeasurementUnit` exists with `numeratorMeasurementUnitId = (kg).id` and `denominatorMeasurementUnitId = MU.id`. If any MU is missing its canonical RMU (or if the `kg` MU itself is missing), the seed throws with a descriptive list. This turns a silent seed-data drift into a loud failure at deploy time.

**Rationale**: Since this change has not yet been applied to any deployment, folding the schema additions into the base migration keeps the migration history clean and avoids a redundant follow-up. Skipping the canonical-RMU backfill removes a class of edge cases (overwriting a country's hand-tuned RMU label, ordering hazards around `kg` lookup) for no real benefit — the cascade rule applies to new admin actions, not to historical seed state.

### 9. Authorization

**Decision**: Both `SystemRole.SUPERADMIN` and `SystemRole.ADMIN` may use this screen and call its endpoints. Client-side: `beforeLoad: requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`. Server-side: route module declares `fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` as a `preHandler` hook covering all endpoints.

**Rationale**: Measurement units are a normal operational concern, not a privilege requiring the SUPERADMIN tier. The Categories maintainer is SUPERADMIN-only because category structure relates to methodology versions, which have a higher governance tier. Measurement units do not.

### 10. UI: inline-edit `StylizedDataGrid` with native column filters and sorting

**Decision**: Mirror the `CategoriesMaintainerScreen` pattern: a single `StylizedDataGrid` page with one row per MU, inline editing via toggle, temp-ID pattern for new rows (`temp_${Date.now()}`), per-row save/cancel/delete actions, and `useBlocker` to warn on unsaved changes. Native DataGrid column filtering and sorting are enabled — no custom filter UI. Default sort: `(magnitude ASC, name ASC)`.

**Rationale**: Reusing the established maintainer pattern keeps the UX consistent for admins and minimizes net-new component code. Native column filters cover the magnitude-filter use case without introducing a separate header dropdown.

### 11. Spanish labels for `Magnitude`

**Decision**: Add a `MAGNITUDE_LABELS: Record<Magnitude, string>` constant to `apps/web/src/config/vocab.ts`. The form's magnitude dropdown reads from this object.

**Rationale**: Per `CLAUDE.md`, `vocab.ts` is the home for "localized terminology that may vary per country deployment". The `Magnitude` enum values (`MASS`, `VOLUME`, etc.) are exactly that.

## Risks / Trade-offs

- **[Cross-cutting picker audit]** → Forgetting to add `status: ACTIVE` to one picker location would silently leak deleted units back into selection lists. Mitigation: an explicit task to grep all reads of `measurementUnit` / `rateMeasurementUnit`, classify each, and patch picker-context queries.
- **[Magnitude immutability is a hard rule]** → Once an admin picks the wrong magnitude on creation, they cannot fix it after data is recorded; their only recourse is to soft-delete and create a replacement under a different abbreviation. Mitigation: clear error messages, magnitude shown prominently in the create form, and a confirm step.
- **[Restore-with-partial-overwrite is asymmetric]** → A soft-deleted unit with no references restores fully; one with references restores only its labels. The screen's UX must communicate this clearly when admins re-create an existing abbreviation. Mitigation: the API response should indicate whether the operation was a fresh create, full restore, or label-only restore so the UI can show an appropriate confirmation.
- **[`kg.id` lookup at every cascade]** → Adds one query per create/update/restore. Negligible at admin scale (low traffic), but worth caching within the request transaction. Mitigation: resolve `kg` once at the start of each transaction.
- **[Pre-existing seed gaps go unfixed]** → Because we are not backfilling canonical RMUs, a country deployment that seeded an MU without its `kg/<abbrev>` RMU will keep that gap until an admin re-saves the MU through the maintainer screen (which re-triggers the cascade). Mitigation: country deployments are responsible for their own seed consistency; the cascade rule guarantees correctness from the first admin write forward.

## Context

The `Magnitude` enum is a Prisma database enum used by exactly one column: `MeasurementUnit.magnitude`. The platform's measurement-unit subsystem uses the magnitude to group conversions (each magnitude has one base unit; `baseFactor` converts to that base) and to validate compatible rate units (e.g., a `kg/km` rate unit composes a MASS numerator with a DISTANCE denominator).

A small but important detail: the canonical rate-measurement-unit cascade established by the prior `add-measurement-units-maintainer` change resolves `kg` by abbreviation (`findUnique({ where: { abbreviation: "kg" } })`) — it does NOT branch on magnitude. So the cascade does not depend on magnitudes being addressable by symbolic constant. The few code sites that actually reference magnitude values are:

- `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/constants.ts` — local Spanish label map (`MASS → "Masa"`, etc.).
- `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/MeasurementUnitsScreen.tsx:243` — a default value for new-row template (`magnitude: Magnitude.ANIMALS`).
- `apps/web/src/screens/Maintainer/screens/MeasurementUnitsScreen/hooks/useMeasurementUnitsForm.ts` — `z.enum(Magnitude)` in the form schema.
- `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/helper.ts:272` — uses magnitude as a grouping key (`${num.magnitude}-${den.magnitude}`).
- `apps/api/src/features/measurementUnits/{create,update}MeasurementUnit/service.ts` — the "one base unit per magnitude" check; treats magnitude as opaque.
- `apps/web/src/config/vocab.ts` — `MAGNITUDE_LABELS` added by the prior maintainer change (also a label map keyed by enum value).

Critically, no code branches on a specific magnitude (e.g., `if (m === Magnitude.MASS)`). Magnitudes are opaque grouping keys in every code path — which makes the enum→model conversion mostly mechanical.

The country-agnosticism principle (`CLAUDE.md`) requires that country deployments adjust reference data via seeds, not code forks. Today admins cannot translate `MASS → "Masa"` without a code change, and a country needing a new magnitude (say "VEHICLES" or "PERSONS") would have to fork the Prisma schema. Both are exactly the kind of friction the principle exists to eliminate.

## Goals / Non-Goals

**Goals:**

- Allow admins (SUPERADMIN and ADMIN) to perform CRUD on `Magnitude` from a single screen at `/admin/magnitudes`.
- Preserve the existing semantic stability of the system magnitudes: any platform code that wants to reference a magnitude symbolically (e.g., "the MASS magnitude") MAY do so via the immutable `code` field, regardless of admin label changes.
- Preserve all existing measurement-unit invariants: one base unit per magnitude (now keyed by FK id), `kg`-anchored canonical RMU, soft-delete cascade, picker-vs-display read pattern.
- Allow per-country extension: a country deployment can add custom magnitudes via the admin UI or via additional seed data, with `isSystem = false`.

**Non-Goals:**

- Multi-locale magnitude labels. Spanish-only, consistent with the rest of the app.
- Changing how magnitudes participate in unit conversion. The "base unit per magnitude" rule, the `baseFactor`, and the canonical RMU derivation are unchanged.
- Deleting system magnitudes. Even with no MU references, system magnitudes are blocked from soft-delete to prevent platform-wide drift.
- Bulk import/export of magnitudes.

## Decisions

### 1. Magnitude becomes a model with a stable `code` field

**Decision**: Replace `enum Magnitude` with a Prisma model:

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

`code` is the stable identifier (e.g., `MASS`, `VOLUME`, …, plus any custom codes admins create). `code` is **immutable** after creation — it is the platform's symbolic handle for the magnitude. `name` is admin-editable. `isSystem` is set to `true` only by the seed script (the maintainer endpoints SHALL never set it).

**Rationale**: A model with a `code` field gives us the best of both worlds: country-extensible reference data plus stable symbolic references for any platform code that needs them. Locking `code` immutability means a future deployment that hardcodes `magnitudeCode === "MASS"` somewhere stays correct even if an admin renames the label to "Masa total" — the symbolic identity is decoupled from the display label.

The `code` and `name` separation also opens future affordances (translations, alternative labels per audience) without further schema changes.

**Alternatives considered**:

- **Keep `magnitude` as a string column on MU, with no model**: would still require a "magnitudes" reference table for the maintainer screen to list them; a degenerate denormalized version of the same model. Rejected.
- **Use `name` as the stable identifier (no `code`)**: admins editing the label would silently rebind the identifier, breaking any code that still references magnitudes by string. Rejected.
- **Make `code` editable**: opens a footgun where a country renames `MASS → "MASA"` and breaks the canonical-RMU lookup or the methodology helper's grouping key (which would now key on a different string for the same physical magnitude, splitting historical groups). Rejected.

### 2. System magnitudes are seeded with `isSystem = true` and protected from soft-delete

**Decision**: The seed script inserts ten rows with `isSystem = true`, one per current enum value, using the existing Spanish labels. `isSystem` magnitudes:

- Cannot be soft-deleted (`MagnitudeIsSystemError` on DELETE).
- Can have `name` edited (admins can re-translate).
- Cannot have `code` edited (Decision 1).

Custom magnitudes (`isSystem = false`) follow the standard reference-count rule: deletable when `referenceCount = 0` (no MU references the magnitude); blocked otherwise (`MagnitudeReferencedError`).

**Rationale**: System magnitudes carry the platform's semantic baseline. Even when no MU currently references one (e.g., a country deletes all `ROOMS` MUs because hospitality isn't relevant), losing the magnitude row would prevent later reintroduction without database access. Treating system magnitudes as permanent-but-relabel-able captures the right invariant.

**Alternatives considered**:

- **Reference-count protection only (no `isSystem` flag)**: a country with no `ROOMS` MUs could delete the magnitude, then later run a national report that fails or duplicates. Rejected.
- **`isSystem` blocks all edits, not just delete/code**: prevents the actual benefit of relabeling (`ROOMS → "Habitaciones"`). Rejected.

### 3. `MeasurementUnit.magnitude` (enum) → `MeasurementUnit.magnitudeId` (FK)

**Decision**: Drop the `magnitude` enum column on `MeasurementUnit` and replace it with `magnitudeId BigInt` (FK to `Magnitude.id`, `onDelete: Restrict`). The `Magnitude` Prisma enum is removed.

**Rationale**: A FK is the only correct shape once magnitudes are a model. `Restrict` on delete is consistent with the soft-delete-only contract: hard-deleting a magnitude that has MUs would orphan them; the API soft-delete endpoint already rejects this case.

**Alternatives considered**:

- **Keep `magnitude` as a denormalized string column synced to `Magnitude.code`**: introduces a sync hazard (the helper `getCarbonInventoryMethodology` keys on this string) and adds storage with no real benefit. Rejected.

### 4. The seed change is folded into the base migration

**Decision**: The schema additions (new `Magnitude` model, new `MeasurementUnit.magnitudeId` column, removal of the `Magnitude` enum and `MeasurementUnit.magnitude` column) are folded into the original base migration (`packages/database/src/prisma/migrations/20251211144312_base/migration.sql`). No new migration file is added.

`seedMeasurementUnits.ts` is reordered: insert the system magnitudes first, then resolve `magnitudeId` per MU by `code` lookup before creating MUs. The current `magnitude: z.enum(Magnitude)` validation in the seed script becomes `magnitudeCode: z.string()`.

**Rationale**: This change has not been applied to any production deployment yet (`add-measurement-units-maintainer` was archived 2026-05-08, same date as this proposal's creation; the base migration has been rewritten before). Editing the base migration keeps the migration history clean. Country deployments that are already running an older base migration will receive both changes together when they upgrade.

**Alternatives considered**:

- **New migration file with online backfill**: required if any production deployment runs the prior base migration. Rejected based on the same reasoning as the prior `add-measurement-units-maintainer` change (which folded that schema into the same base migration).

### 5. Admin-created custom magnitude `code` validation

**Decision**: For magnitudes created via the maintainer endpoint, `code` SHALL match `^[a-z][a-z0-9_]*$` (lowercase snake_case, starting with a letter). System magnitudes seeded by the script use uppercase legacy codes (`MASS`, `VOLUME`, `DISTANCE_MASS`, …); the asymmetry is intentional and visually signals system-vs-custom origin.

**Rationale**: A strict slug pattern keeps custom codes URL-safe, log-safe, and visually distinct from labels. Uppercase legacy codes preserve the old enum values verbatim, which is what any backfill or country-specific seed script will look up.

The asymmetry is documented in the maintainer screen UI ("Codes are lowercase identifiers like `vehicles` or `bottles`") and in the deployment runbook.

**Alternatives considered**:

- **Auto-generate `code` from `name`**: brittle for non-ASCII Spanish (`"Área"` → `"area"`?), and the slug becomes a tightly-coupled invariant. Rejected.
- **Allow uppercase admin codes too**: blurs the system-vs-custom distinction; admins could create a `code = "MASS"` collision attempt. The `@unique` on `code` would catch it, but rejecting the slug pattern up front is friendlier. Rejected.

### 6. Field-locking based on reference count

**Decision**: The maintainer screen's reference count is the count of `MeasurementUnit` rows whose `magnitudeId` equals the magnitude's id (regardless of MU status — soft-deleted MUs still hold the FK). The fields locked for `referenceCount > 0` are: nothing on the magnitude itself. `name` is always editable; `code` is always immutable (Decision 1); `isSystem` is never editable.

**Rationale**: Magnitudes have no physical-quantity fields like `baseFactor`. Their only mutable field is `name` (a label), which admins can change at will. Reference count gates only the **delete** operation.

This is simpler than the `MeasurementUnit` lock: there, a stale `baseFactor` corrupts conversions. Here, there is no analog to corrupt.

### 7. Picker-vs-display read pattern

**Decision**: The picker-vs-display rule established by `add-measurement-units-maintainer` extends to magnitudes:

- **Picker mode** (admin selects a magnitude when creating/editing an MU; the magnitudes maintainer screen list): query SHALL include `where: { status: "ACTIVE" }`.
- **Display mode** (joining `magnitude` on a stored `MeasurementUnit.magnitudeId` to render a row's magnitude name): query SHALL NOT filter by status.

Soft-deleted custom magnitudes remain readable so historical MUs (also soft-deleted) continue to display their magnitude label. This case is rare (system magnitudes are undeletable) but consistent.

**Rationale**: Same as for measurement units — without a picker filter, soft-delete has no effect; without unfiltered displays, history breaks.

### 8. The "one base unit per magnitude" invariant is unchanged in semantics, FK in mechanics

**Decision**: The existing rule from `add-measurement-units-maintainer` ("each `Magnitude` has exactly one immutable base unit") continues to hold. The validator in `createMeasurementUnit/service.ts` now reads:

```ts
if (body.isBase === true) {
  const existing = await tx.measurementUnit.findFirst({
    where: { magnitudeId: body.magnitudeId, isBase: true, status: "ACTIVE" },
  });
  if (existing) throw new MagnitudeAlreadyHasBaseUnitError();
}
```

vs. the prior `where: { magnitude: body.magnitude, ... }`.

**Rationale**: Mechanical translation. The semantic remains "one base per magnitude" — what changes is the type of the join key.

### 9. Authorization

**Decision**: Magnitudes maintainer mutations require `[SUPERADMIN, ADMIN]`. The list endpoint (`GET /api/magnitudes`) is publicly accessible to any authenticated user, because the measurement-unit list is also public (used by the `EmissionEditor` flow), and the MU list now joins magnitudes — so non-admin users need to be able to fetch magnitude rows to render them.

- **Client-side**: `beforeLoad: requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })` on the `/admin/magnitudes` route only.
- **Server-side**: split-scope registration mirroring `apps/api/src/routes/api/measurement-units/index.ts` — list at the outer scope, mutations inside a child scope with `requireAuth + requireRoles`.

**Rationale**: Mirrors the established pattern.

### 10. UI: inline-edit `StylizedDataGrid` + new top-level sidebar entry

**Decision**: The `MagnitudesScreen` mirrors `MeasurementUnitsScreen`'s pattern (inline-edit DataGrid, temp-ID rows, per-row save/cancel/delete, `useBlocker` for unsaved changes). Columns: `code` (read-only after creation), `name` (editable), `isSystem` (read-only badge), `referenceCount` (derived).

The sidebar gets a new top-level entry "Magnitudes" placed near "Unidades" in `MaintainerLayout.tsx`. The future `regroup-units-sidebar` change collapses both into a "Unidades" group; doing so now would either ship dead UI (the group has only one or two children) or leak scope into this proposal. Keeping it as a top-level entry is intentional: this proposal stands alone.

**Rationale**: Consistency with established maintainer UX. The "leave the sidebar messy until change 3" trade-off is acceptable because the user-base (SUPERADMIN/ADMIN) is small and the gap is short-lived.

## Risks / Trade-offs

- **[Cross-cutting refactor surface]** → Replacing `Magnitude.X` enum references is mostly mechanical, but a missed call site silently widens type errors after the enum is removed (TypeScript will catch it; runtime risk is low). Mitigation: explicit task with a grep checklist for `Magnitude.` and `enum Magnitude`.
- **[`magnitudeId` is a BigInt]** → Adds the same `.toString()` discipline already used for other BigInt FKs throughout the codebase. Mitigation: the schemas in `packages/types/src/magnitudes/` use `IdSchema` (string-coerced) consistently with the rest of the project.
- **[Sidebar UX gap until change 3 ships]** → Top-level "Magnitudes" sits alongside "Unidades" until the regroup change collapses them. Acceptable because all relevant users have admin context.
- **[Empty seed for non-reseeded deployments]** → Country deployments that upgrade without re-running the seed will have an empty `Magnitude` table and a NOT NULL `magnitudeId` column with no defaults — every existing MU row will have a constraint violation. Mitigation: deployment runbook SHALL re-run `seedMeasurementUnits.ts` on upgrade. (This is the same posture as the prior measurement-units change.)
- **[Methodology grouping key changes type]** → `getCarbonInventoryMethodology/helper.ts:272` keys on `magnitudeId` (BigInt) instead of the enum string. Map keys become `${num.magnitudeId}-${den.magnitudeId}` (or pre-stringified) — same shape, different content. Mitigation: integration test for the methodology endpoint covers grouping correctness.

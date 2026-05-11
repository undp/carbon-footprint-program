# Magnitudes

Magnitudes classify the physical dimension of a `MeasurementUnit` (mass, volume, distance, …). They are reference data: a set of system magnitudes is seeded at deployment time, and country deployments may add more at runtime via the admin maintainer screen.

For the data model (fields, soft-delete rules, system protections, reference count), see [`docs/data-model/measurement-units.md`](../../data-model/measurement-units.md#magnitude).

## Country-Extensibility Recipe

There are two distinct ways to introduce a magnitude into a country deployment. The choice depends on whether the magnitude is part of the platform contract or a country-local extension.

### A) Add a system magnitude via seed

Use this path when the magnitude is part of the platform's standard taxonomy and must exist before any admin logs in (typically because seeded measurement units or methodology factors reference it).

1. Edit `packages/database/src/prisma/seeds/data/base/magnitudes.json` and append a new entry:

   ```json
   { "code": "vehicles", "name": "Vehículos" }
   ```

   - `code` is the stable, immutable identifier. Use lowercase snake_case. It must be unique.
   - `name` is the human-readable label shown in the UI. Spanish by convention.

2. Run the seed:

   ```bash
   pnpm --filter=@repo/database dev:seed
   ```

   The seed script (`packages/database/src/prisma/seeds/scripts/seedMagnitudes.ts`) `upsert`s by `code` with `isSystem: true` and `status: ACTIVE`. The `update: {}` clause is intentional: re-running the seed will **not** overwrite a `name` that an admin has since edited through the maintainer screen.

3. If the new magnitude needs a base measurement unit, also add the corresponding row to `measurement_units.json` referencing the new `code`.

**Properties of system magnitudes:**

- `isSystem = true`, set only by the seed script.
- `code` is locked: PATCH rejects any attempt to change it.
- `name` is editable through the admin screen (the seed will not clobber the edit on subsequent runs).
- DELETE is refused with HTTP 422 (`MagnitudeIsSystemError`) regardless of reference count.

### B) Add a custom magnitude via the admin screen

Use this path when a country needs a magnitude beyond the seeded ones (for example, `persons`, `vehicles`, or any local activity unit) and there is no need to ship it as part of the codebase.

1. Sign in as an `ADMIN` or `SUPERADMIN` and navigate to `/admin/magnitudes`.
2. Click **Crear** and provide:
   - `code` — lowercase, immutable. The API validates that no `ACTIVE` magnitude already uses this code (`MagnitudeCodeConflictError`, HTTP 409). If a `DELETED` row with the same code exists it is restored in place.
   - `name` — the display label.
3. The new row is persisted with `isSystem = false`, `status = ACTIVE`.

**Properties of custom magnitudes:**

- `isSystem = false`, so the row falls outside the seed's protection.
- `name` is editable. `code` is locked.
- DELETE is allowed only when `referenceCount = 0` (no `MeasurementUnit` references the magnitude). Otherwise the API returns HTTP 422 (`MagnitudeInUseError`). Soft-delete sets `status = DELETED`; the row remains queryable for display joins on existing measurement units.

### When to choose which

| Question                                                                  | Path              |
| ------------------------------------------------------------------------- | ----------------- |
| Is the magnitude required by the seeded methodology or measurement units? | A — Seed          |
| Should every country deployment have this magnitude out of the box?       | A — Seed          |
| Is it a one-off addition for a single country, decided post-deployment?   | B — Admin screen  |
| Does the platform team need to review/approve the addition?               | A — Seed (via PR) |
| Does a country admin need to add it without a code change or redeploy?    | B — Admin screen  |

Both paths produce rows in the same `magnitude` table — the only persistent distinction is the `isSystem` flag and the protections that follow from it.

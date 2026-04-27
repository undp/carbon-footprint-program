# Profiling Maintainers

Admin maintainers for the four profiling catalogs:

| Maintainer                | Path                        | Underlying table             |
| ------------------------- | --------------------------- | ---------------------------- |
| Rubros                    | `/admin/sectors`            | `country_sector`             |
| Subrubros                 | `/admin/subsectors`         | `country_subsector`          |
| Actividades Principales   | `/admin/main-activities`    | `organization_main_activity` |
| Tamaño de la Organización | `/admin/organization-sizes` | `country_organization_size`  |

All four sit under the **Perfilamiento** sidebar group, gated to `[ADMIN, SUPERADMIN]`.

## Soft-delete lifecycle

Each table has a dedicated `status` enum (`CountrySectorStatus`, `CountrySubsectorStatus`, `OrganizationMainActivityStatus`, `CountryOrganizationSizeStatus`) with values `ACTIVE` / `DELETED`. There is **no shared `MaintainerRecordStatus`**: each catalog evolves independently.

`DELETE /admin/…/:id` transitions `status` from `ACTIVE` to `DELETED` inside a transaction. `POST /admin/…/:id/restore` reverses it. Both endpoints return the updated row (HTTP 200 with body) — not 204.

### Catalog-reference blocking

Soft-delete is **blocked** (HTTP 409, error code `DELETE_BLOCKED_BY_REFERENCES`) when another **catalog** record still references the target as ACTIVE. User-data references on `organization_data` never block — they are exactly what soft-delete preserves.

| Target soft-delete           | Blocked by (ACTIVE only)                                                        | NOT blocked by                                |
| ---------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `country_sector`             | `country_subsector`, `organization_main_activity`, `subcategory_recommendation` | `organization_data.sectorId`                  |
| `country_subsector`          | `organization_main_activity`, `subcategory_recommendation`                      | `organization_data.subsectorId`               |
| `organization_main_activity` | —                                                                               | `organization_data.mainActivityId`            |
| `country_organization_size`  | —                                                                               | `organization_data.countryOrganizationSizeId` |

The thrown error carries a Spanish message naming the blocking type(s) so the FE snackbar surfaces context-specific copy via `getApiErrorMessage`.

### Restore collisions

`POST /admin/…/:id/restore` validates inside a transaction that no currently-ACTIVE row shares the unique scope:

- sector / size: `(countryId, name)`
- subsector: `(countrySectorId, name)`
- main activity: `(name, countrySectorId, countrySubsectorId)` (NULLS NOT DISTINCT)

A collision returns HTTP 409 (`DATABASE_UNIQUE_CONSTRAINT_VIOLATION`) with a Spanish message instructing the admin to rename or soft-delete the colliding ACTIVE row first. Restoring an already-ACTIVE row returns HTTP 400 (`RESTORE_ON_ACTIVE`).

## Partial unique indexes — Prisma blind spot

The four catalogs use **partial unique indexes** scoped to `status = 'ACTIVE'`:

```sql
CREATE UNIQUE INDEX … ON … WHERE "status" = 'ACTIVE';
```

Prisma does not support partial indexes natively. The schema retains the columns but **omits the `@@unique(...)` attribute**; the partial index is declared in raw SQL inside the migration files (`20251211144312_base/migration.sql` for sector / subsector / size; `20251215191534_create_organization_main_activity_unique_constraint/migration.sql` for main activity).

**Caveat:** any future migration that regenerates the unique constraint (e.g., via `prisma migrate dev` diffing against the schema) will silently recreate a full-table unique index, breaking the soft-delete invariant. When touching these tables:

1. Preserve the `WHERE "status" = 'ACTIVE'` clause manually.
2. The schema files contain inline `// NOTE` comments documenting this — do not remove them.
3. PR review checklist: did you preserve the partial index?

## In-use warning dialog

A shared `InUseWarningDialog` (`apps/web/src/screens/Maintainer/components/dialogs/InUseWarningDialog.tsx`) opens before the maintainer screen dispatches a PATCH **only when both** conditions hold:

1. The edit changes a **visible** field — `name` (all four), `countrySectorId` (subsector / main activity), or `countrySubsectorId` (main activity). `description` changes are exempt.
2. The target row has user-data references — the admin list endpoints return `isInUse: boolean` per row, computed at query time as `OR` over the relevant `organization_data.*` counts (and `organization_main_activity.*` for sector / subsector).

Confirm → PATCH; Cancel → return to edit. The dialog copy is parameterised by `entityLabel` (`"rubro"` / `"subrubro"` / `"actividad principal"` / `"tamaño"`).

## Selector union (`mergeSelectedOption`)

The four public list endpoints return only ACTIVE rows. To render the persisted selection by name when the catalog row has been soft-deleted on the admin side, every form that consumes a catalog as a selector merges the form's initial value into the option list using:

```ts
import { mergeSelectedOption } from "@/utils/mergeSelectedOption";

const mergedSectors = mergeSelectedOption(sectors, organization.sector);
```

The helper is identity-stable when no merge is needed. It sorts the result alphabetically (locale-aware Spanish).

**Wired consumers:**

- `apps/web/src/screens/MyOrganization/components/OrganizationForm/hooks/useOrganizationData.ts` — sectors, subsectors, main activities, organization sizes. Driven by the parent `OrganizationFormDialog` which passes `organization.sector / .subsector / .mainActivity / .countryOrganizationSize`.

**Not yet wired** (follow-up): `apps/web/src/screens/CarbonInventory/hooks/useBusinessProfilingData.ts`. The carbon inventory's `organizationData` payload currently carries only catalog ids — extending that response shape to include names is required before this consumer can apply the union.

## Admin list filter + restore

The admin `GET /admin/…` endpoints accept `?status=active|deleted|all` (default `active`). The maintainer screen exposes a tri-state toggle (`MaintainerStatusFilterToggle`) in the page header's `extra` slot. DELETED rows render with a distinct chip and a Restore action in place of the usual edit / delete buttons.

## Layout

The four screens use a dedicated `ProfilingMaintainerScreenLayout` (under `apps/web/src/screens/Maintainer/components/`). It reuses `MaintainerPageHeader` (with the status filter in `extra`) and `UnsavedChangesDialog` (navigation blocker), and intentionally omits the methodology selector, InfoBanner, EditModeToolbar, and ExitEditModeDialog used by the metodologías-scoped maintainers. The existing `MaintainerScreenLayout` is unmodified.

## Auditor fields

`country_organization_size` gained `createdById` / `updatedById` columns in this change — bringing it in line with the other three profiling tables. Existing rows have `NULL` auditors; new rows stamp the current user.

## Error handling

The API surfaces all soft-delete / restore / collision errors as 4xx responses with a Spanish `message` field on the thrown error. The frontend's `getApiErrorMessage` prefers the per-code static fallback for legacy error codes and falls back to the API message for new error codes — so context-specific copy round-trips end-to-end. New error code: `DELETE_BLOCKED_BY_REFERENCES` (HTTP 409).

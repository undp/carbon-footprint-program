## MODIFIED Requirements

### Requirement: Admin sidebar exposes a "Perfilamiento" group

The admin sidebar SHALL expose a single top-level entry for the organization-characterization catalogs, labelled `Datos generales`, occupying the position previously held by `Rubros`. The label `Perfilamiento` MUST NOT appear in the sidebar, in route metadata, or in the associated help text: it describes the step in terms the target audience does not use, and does not convey that the step collects basic characterization data. The entry SHALL:

- Render with the `BusinessCenterOutlined` MUI icon.
- Require role `[SystemRole.ADMIN, SystemRole.SUPERADMIN]`.
- Contain four children in this order: `Sectores` (→ `/admin/sectors`), `Actividades Económicas` (→ `/admin/subsectors`), `Unidades de Actividad` (→ `/admin/main-activities`), `Tamaño de la Organización` (→ `/admin/organization-sizes`).

The first two children are renamed from `Rubros` and `Subrubros`: the catalog they administer is the deployment's economic-activity classification, and `rubro` is neither the term used in the target country nor a term any national classifier uses.

The third child is renamed from `Actividades Principales` because that catalog holds intensity denominators (`toneladas producidas`, `MWh generados`), not economic activities. Leaving it named for activities would collide with the economic-activity fields introduced by `organization-economic-activity`, leaving the maintainer with two near-identically named entries carrying incompatible meanings.

Routes are unchanged: only labels change, so no redirects are required.

The Metodologías group and its children SHALL retain their existing `[SystemRole.SUPERADMIN]` gate.

#### Scenario: ADMIN sees Datos generales with four children

- **WHEN** a user with `SystemRole.ADMIN` loads the admin layout
- **THEN** the sidebar shows a `Datos generales` entry with exactly four children in the order above and no Metodologías entry

#### Scenario: The former label is absent

- **WHEN** the rendered admin layout is inspected
- **THEN** no sidebar entry, route label or help text contains `Perfilamiento`, `Rubros` or `Subrubros`

#### Scenario: USER sees neither group

- **WHEN** a user with `SystemRole.USER` loads the admin layout
- **THEN** Metodologías and Datos generales are hidden

### Requirement: Sectors and Subsectors maintainer screens

The screens at `/admin/sectors` and `/admin/subsectors` SHALL:

- Render inside the new `ProfilingMaintainerScreenLayout` (NOT `MaintainerScreenLayout`). The existing `MaintainerScreenLayout` MUST NOT be modified as part of this capability.
- Display a `MaintainerDataGrid` with inline-editable rows.
  - Sectors columns: `name`, `description`, row actions (start/stop/cancel/soft-delete OR restore, depending on row status).
  - Subsectors columns: parent-sector selector (populated from admin ACTIVE sectors), `name`, `description`, row actions.
- Surface a tri-state status filter toggle (`Activos` | `Eliminados` | `Todos`) inside `MaintainerPageHeader.extra`, defaulting to `Activos`. The filter value is passed through to the admin list query.
- Render DELETED rows in a visually distinct style (dimmed / `Chip` "Eliminado") and swap row actions to a single `Restore` button; edit is disabled for DELETED rows.
- Use the admin-side query hooks to fetch the list and run create / update / soft-delete / restore mutations. Successful mutations MUST invalidate both admin and public-side caches (`countrySectorsKeys.admin.all` AND `countrySectorsKeys.app.all`) so open forms see fresh ACTIVE options.
- Block navigation while a row is dirty (`useBlocker` against `form.formState.isDirty`).
- Surface server errors via snackbar using `getApiErrorMessage`.
- On save of an edit that changes `name` (sector) or `name` / `countrySectorId` (subsector), dispatch the PATCH directly. If the row is in use the server rejects it with `EDIT_BLOCKED_BY_REFERENCES` and the screen surfaces the localized reason (with the delete-then-recreate hint) in a `BlockedActionDialog`. There is no client-side "continue anyway" confirm step.
- Show Spanish snackbar messages on success: "Sector creado exitosamente", "Cambios guardados satisfactoriamente", "Sector eliminado", "Sector restaurado" (and the actividad económica equivalents). The words `rubro` and `subrubro` MUST NOT appear in any message.

#### Scenario: Admin restores a soft-deleted sector

- **WHEN** an ADMIN toggles the filter to "Eliminados", clicks Restore on a row, and the restore succeeds
- **THEN** the row is removed from the DELETED list, a Spanish snackbar "Sector restaurado" appears, and the row reappears when the filter switches to "Activos"

#### Scenario: Rename of an in-use sector is blocked

- **WHEN** an ADMIN edits the `name` of a sector referenced by user data (a live `organization_data` row or an ACTIVE carbon-inventory snapshot) and saves
- **THEN** the PATCH is rejected with `409` (`EDIT_BLOCKED_BY_REFERENCES`), the reason is shown in a `BlockedActionDialog`, and the name is unchanged

#### Scenario: Description-only edit is dispatched directly

- **WHEN** an ADMIN edits only the `description` of an in-use sector
- **THEN** the PATCH is dispatched and the row is saved with no blocking dialog

#### Scenario: Activity empty state when no sectors exist

- **WHEN** the Actividades Económicas screen loads and the admin ACTIVE sector list is empty
- **THEN** the grid shows the "Crea primero un sector" helper text and the add button is disabled

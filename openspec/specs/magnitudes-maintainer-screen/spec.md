# magnitudes-maintainer-screen Specification

## Purpose

Defines the admin maintainer screen at `/admin/magnitudes`: an inline-edit `StylizedDataGrid` over the magnitudes returned by `GET /api/magnitudes`, supporting inline create, rename, and soft-delete, with read-only `code` on existing rows, a hidden delete control on system magnitudes, a disabled delete control on referenced magnitudes, and a sidebar entry under the collapsible "Unidades" group. All UI text is Spanish.

## Requirements

### Requirement: Magnitudes maintainer screen at `/admin/magnitudes`

The system SHALL expose an admin maintainer screen at the route `/admin/magnitudes`, accessible only to users with system role `ADMIN` or `SUPERADMIN`. The screen SHALL render a `StylizedDataGrid` with one row per magnitude returned by `GET /api/magnitudes` and SHALL support inline create, inline rename, and soft-delete via the corresponding admin endpoints.

#### Scenario: Non-admin access

- **WHEN** an authenticated user with system role `USER` navigates to `/admin/magnitudes`
- **THEN** the route's `beforeLoad` guard SHALL redirect to `Routes.ADMIN_DASHBOARD`

#### Scenario: List rendering

- **WHEN** the screen mounts and `useMagnitudes()` resolves
- **THEN** the grid SHALL render columns `code`, `name`, `isSystem` (as a "Sistema" badge or blank), and `referenceCount`, with system magnitudes pinned to the top per the API ordering

### Requirement: Inline editing follows the established maintainer pattern

The screen SHALL implement the same inline-edit flow used by `MeasurementUnitsScreen` and `CategoriesMaintainerScreen`: per-row edit/save/cancel controls, temp-ID for new rows (`temp_${Date.now()}`), dirty-row tracking, and `useBlocker` to warn on unsaved changes when the user navigates away.

#### Scenario: Adding a new magnitude

- **WHEN** the admin clicks the "Add row" action
- **THEN** the grid SHALL prepend a temp-ID row with both `code` and `name` cells editable

#### Scenario: Code field is read-only on existing rows

- **WHEN** an existing row enters edit mode (the `id` is not a `temp_` id)
- **THEN** the `code` cell SHALL be read-only; only the `name` cell SHALL be editable

### Requirement: System magnitudes hide the delete action

The grid SHALL hide the delete control for any row where `isSystem === true`. An adjacent info icon SHALL render a tooltip explaining that system magnitudes cannot be removed (Spanish text, e.g., "Las magnitudes del sistema no se pueden eliminar").

#### Scenario: Delete control hidden on system row

- **WHEN** the grid renders a row whose `isSystem` is `true`
- **THEN** the actions column for that row SHALL NOT show a delete button

### Requirement: Referenced magnitudes disable the delete action

The grid SHALL disable (but render) the delete control for any non-system row where `referenceCount > 0`. The disabled control SHALL show a tooltip explaining that the magnitude is in use (Spanish text, e.g., "Esta magnitud está en uso por unidades de medida. Elimina o reasigna esas unidades primero.").

#### Scenario: Delete control disabled on referenced custom row

- **WHEN** the grid renders a row whose `isSystem` is `false` and `referenceCount` is greater than zero
- **THEN** the actions column for that row SHALL render a disabled delete button with the explanatory tooltip

### Requirement: Sidebar entry lives under the "Unidades" group

`MaintainerLayout.tsx` SHALL render the entry for `/admin/magnitudes` as a child of a collapsible "Unidades" group (alongside "Unidades de medida" and "Tasas"), with the leaf label "Magnitudes" — replacing the prior top-level entry labelled "Magnitudes".

The route path (`/admin/magnitudes`) and the route constant (`Routes.ADMIN_MAGNITUDES`) SHALL be unchanged. The route's existing `beforeLoad` role guard (`[ADMIN, SUPERADMIN]`) SHALL be unchanged.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** an admin user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Magnitudes" SHALL be visible, linking to `Routes.ADMIN_MAGNITUDES`, rendered as the first child in the group

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/magnitudes`
- **THEN** the "Unidades" parent group SHALL render in its expanded state and the "Magnitudes" child SHALL render with the active-child highlight

### Requirement: All UI text is in Spanish

The screen, its column headers, action labels, error messages, snackbar messages, and tooltips SHALL be in Spanish, consistent with the rest of the app. Magnitude labels rendered to the user SHALL be the API-resolved `name` field.

#### Scenario: Column headers and actions are in Spanish

- **WHEN** an admin user opens `/admin/magnitudes`
- **THEN** every visible column header, button label, tooltip, and snackbar message SHALL be rendered in Spanish

#### Scenario: Magnitude labels come from the API

- **WHEN** the grid renders any row
- **THEN** the `name` cell SHALL display the magnitude's API-resolved `name` field (e.g., "Masa", "Volumen") and SHALL NOT depend on any local label map

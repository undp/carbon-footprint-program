## ADDED Requirements

### Requirement: Rate measurement units screen at `/admin/rate-measurement-units`

The system SHALL expose an admin maintainer screen at the route `/admin/rate-measurement-units`, accessible only to users with system role `SUPERADMIN`. The screen SHALL render a paginated `StylizedDataGrid` of ACTIVE rate measurement units returned by `GET /api/measurement-units/rates`, with no mutation affordances (no edit toggle, no row actions, no add button) and no filter controls.

#### Scenario: Non-superadmin access

- **WHEN** an authenticated user with system role `ADMIN` or `USER` navigates to `/admin/rate-measurement-units`
- **THEN** the route's `beforeLoad` guard SHALL redirect to `Routes.ADMIN_DASHBOARD`

#### Scenario: List rendering

- **WHEN** the screen mounts and `useRateMeasurementUnits()` resolves
- **THEN** the grid SHALL render columns `abbreviation`, numerator's `abbreviation`, numerator's `magnitude.name`, denominator's `abbreviation`, denominator's `magnitude.name`, and `totalReferenceCount`, sorted by `totalReferenceCount` DESC by default

### Requirement: Read-only grid with no mutation affordances

The grid SHALL render with `disableRowSelectionOnClick`, no `processRowUpdate`, and no actions column. Cells SHALL NOT be editable. There SHALL NOT be a "Add row" or "Create" action anywhere on the screen.

#### Scenario: Cells are non-editable

- **WHEN** the admin double-clicks a cell or attempts to enter edit mode
- **THEN** the grid SHALL NOT enter edit mode and the cell SHALL remain non-editable

### Requirement: Reference count tooltip surfaces breakdown

The `totalReferenceCount` column SHALL render the integer total. On hover, a tooltip SHALL show the breakdown across the three categories using Spanish labels (e.g., "Factores de emisión: 47 / Inputs manuales: 3 / Factores aplicados: 12").

#### Scenario: Tooltip renders breakdown

- **WHEN** the admin hovers over the `totalReferenceCount` cell of any row
- **THEN** the tooltip SHALL show the three category counts using the Spanish labels above

### Requirement: Sidebar entry lives under the "Unidades" group

`MaintainerLayout.tsx` SHALL render the entry for `/admin/rate-measurement-units` as a child of a collapsible "Unidades" group (alongside "Magnitudes" and "Unidades de medida"), with the leaf label "Tasas" — replacing the prior top-level entry labelled "Tasas".

The route path (`/admin/rate-measurement-units`) and the route constant (`Routes.ADMIN_RATE_MEASUREMENT_UNITS`) SHALL be unchanged. The route's existing `beforeLoad` role guard (`[SUPERADMIN]`) SHALL be unchanged. The group itself SHALL be visible to any user reaching the admin layout; non-SUPERADMIN users who click "Tasas" continue to be redirected by the route's own guard.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** a SUPERADMIN user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Tasas" SHALL be visible, linking to `Routes.ADMIN_RATE_MEASUREMENT_UNITS`, rendered as the third (last) child in the group

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/rate-measurement-units`
- **THEN** the "Unidades" parent group SHALL render in its expanded state and the "Tasas" child SHALL render with the active-child highlight

#### Scenario: Group remains visible for non-SUPERADMIN admins

- **WHEN** a user with system role `ADMIN` opens the sidebar
- **THEN** the "Unidades" group and the "Tasas" child SHALL still be rendered (consistent with the existing pattern where role enforcement happens at the route level, not the sidebar level); clicking "Tasas" SHALL trigger the route's `beforeLoad` redirect

### Requirement: All UI text is in Spanish

The screen, its column headers, tooltips, and empty-state messages SHALL be in Spanish, consistent with the rest of the app.

#### Scenario: Column headers and tooltips are in Spanish

- **WHEN** a SUPERADMIN user opens `/admin/rate-measurement-units`
- **THEN** every visible column header, tooltip label, and empty-state message SHALL be rendered in Spanish

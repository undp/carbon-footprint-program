# measurement-units-maintainer-screen Specification

## Purpose

Defines the admin maintainer screen at `/admin/units` for managing measurement units: an inline-edit `StylizedDataGrid` over the active measurement units, with the magnitude column and picker sourced from the magnitudes API, field-locking for referenced and base units, disabled delete controls on system-protected rows, restore confirmations, and a sidebar entry nested under the collapsible "Unidades" group. All UI text is Spanish.

## Requirements

### Requirement: Admin units route renders the maintainer screen

The route `/admin/units` SHALL render `MeasurementUnitsScreen`. Access SHALL be guarded to system roles `SUPERADMIN` or `ADMIN` by the parent admin layout route (`admin.tsx`), which redirects any other user to `Routes.HOME`.

#### Scenario: SUPERADMIN navigates to /admin/units

- **WHEN** a user with system role `SUPERADMIN` navigates to `/admin/units`
- **THEN** the router SHALL render `MeasurementUnitsScreen`

#### Scenario: ADMIN navigates to /admin/units

- **WHEN** a user with system role `ADMIN` navigates to `/admin/units`
- **THEN** the router SHALL render `MeasurementUnitsScreen`

#### Scenario: Regular user navigates to /admin/units

- **WHEN** a user with system role `USER` navigates to `/admin/units`
- **THEN** the parent admin route guard SHALL redirect to `Routes.HOME`

### Requirement: Screen uses StylizedDataGrid with native filtering and sorting

The screen SHALL render a single `StylizedDataGrid` with one row per active measurement unit and the columns "Magnitud" (rendering the magnitude's name), "Nombre", "Abreviatura", "Factor base", "¿Unidad base?", and "Acciones". Native column filtering and sorting SHALL be enabled. Rows SHALL be presented in the API order (magnitude name, then unit name).

#### Scenario: Initial render

- **WHEN** the screen mounts and the list endpoint resolves
- **THEN** the grid SHALL display rows ordered first by magnitude name, then by unit name

#### Scenario: Native column filtering

- **WHEN** the admin opens the column header menu and applies a filter on "Magnitud"
- **THEN** the grid SHALL filter visible rows in-place using the DataGrid's native filter implementation, with no custom filter UI

### Requirement: Inline editing mirrors CategoriesMaintainerScreen

Each row SHALL toggle between view and edit modes. New rows SHALL use a temporary id of the form `temp_<timestamp>` until persisted by the create endpoint. The screen SHALL block navigation when there are unsaved changes by using TanStack Router's `useBlocker`.

#### Scenario: Adding a new row

- **WHEN** the admin clicks "Agregar unidad"
- **THEN** the grid SHALL add an editable row with a temp id; the row SHALL transition to a real persisted id after the create mutation succeeds

#### Scenario: Unsaved changes block navigation

- **WHEN** the admin has a row in dirty/edit state and attempts to navigate away from the screen
- **THEN** the screen SHALL show a confirmation dialog before allowing navigation

### Requirement: Magnitude column and form picker source from the API

The magnitude column and the magnitude picker SHALL source their data from the `useMagnitudes()` query hook (which calls `GET /api/magnitudes`), not from any local label constant.

#### Scenario: Magnitude column renders the API name

- **WHEN** the screen mounts and rows are returned from `getAllMeasurementUnits`
- **THEN** the magnitude column SHALL render the row's joined `magnitude.name`

#### Scenario: Magnitude form picker is populated from the API

- **WHEN** the admin opens the create/edit form for a measurement unit
- **THEN** the magnitude picker SHALL list options from `useMagnitudes()` (filtered to `status: ACTIVE`), with the option label being the magnitude's `name` and the option value being its `id` as a string

#### Scenario: New-row magnitude requires explicit selection

- **WHEN** the admin adds a new row while `useMagnitudes()` returns a non-empty list
- **THEN** the new row's `magnitudeId` SHALL be empty (no preselection) and the row SHALL NOT be saveable until the admin selects a magnitude (a Spanish required-field message is shown otherwise)

#### Scenario: New-row default with empty magnitudes list

- **WHEN** the admin attempts to add a new row and `useMagnitudes()` returns an empty list
- **THEN** the screen SHALL block the new-row creation and show a snackbar in Spanish explaining that magnitudes must exist before measurement units can be created

#### Scenario: Magnitude picker is disabled when the row is reference-locked

- **WHEN** the admin enters edit mode on a row whose `referenceCount > 0`
- **THEN** the magnitude picker SHALL be disabled

### Requirement: Locked cells for base units and referenced units

For any row that is system-protected (`abbreviation === "kg"` or a persisted `isBase` row) or whose `referenceCount > 0`, the "Magnitud", "Abreviatura", "Factor base", and "¿Unidad base?" cells SHALL be non-editable and SHALL render a lock icon with a hover tooltip in Spanish explaining the restriction. The "Nombre" cell SHALL remain editable. The "Factor base" cell SHALL additionally be locked on any base-unit row.

#### Scenario: Editing a referenced unit

- **WHEN** the admin enters edit mode on a row with `referenceCount > 0`
- **THEN** the "Magnitud", "Abreviatura", "Factor base", and "¿Unidad base?" cells SHALL be locked with an explanatory tooltip, and the "Nombre" cell SHALL remain editable

#### Scenario: Editing an unreferenced, non-protected unit

- **WHEN** the admin enters edit mode on a row with `referenceCount = 0` that is neither the `kg` unit nor a base unit
- **THEN** all editable fields ("Nombre", "Abreviatura", "Magnitud", "Factor base", "¿Unidad base?") SHALL be editable

### Requirement: System-protected rows disable the delete action

The screen SHALL disable the delete action on the row whose `abbreviation === "kg"`, on every persisted row whose `isBase === true`, and on any row whose `referenceCount > 0`. Each disabled delete control SHALL render a Spanish tooltip explaining why the unit cannot be deleted.

#### Scenario: kg or base row delete disabled

- **WHEN** the grid renders the `kg` row or a base-unit row
- **THEN** the delete control SHALL be disabled with a Spanish tooltip explaining the unit is system-protected (base unit of its magnitude)

#### Scenario: Referenced row delete disabled

- **WHEN** the grid renders a row whose `referenceCount > 0`
- **THEN** the delete control SHALL be disabled with a Spanish tooltip explaining the unit already has associated data

### Requirement: Restored-unit confirmation surfaces in the UI

When the create endpoint returns an action discriminator of `"fullyRestored"` or `"restoredLabelsOnly"`, the screen SHALL show a contextual Spanish snackbar indicating that a soft-deleted unit was restored. When the action is `"created"`, the snackbar SHALL show the standard creation confirmation.

#### Scenario: Restoring a previously deleted abbreviation

- **WHEN** the admin creates a row whose abbreviation matches a soft-deleted unit and the API returns action `"fullyRestored"` or `"restoredLabelsOnly"`
- **THEN** the screen SHALL show a Spanish snackbar indicating the unit was restored

#### Scenario: Creating a brand-new abbreviation

- **WHEN** the admin creates a row whose abbreviation does not match any existing unit and the API returns action `"created"`
- **THEN** the screen SHALL show the standard creation success snackbar

### Requirement: Sidebar entry lives under the "Unidades" group as "Unidades de medida"

`MaintainerLayout.tsx` SHALL render the entry for `/admin/units` as a child of a collapsible "Unidades" group (alongside "Magnitudes" and "Tasas"), with the leaf label "Unidades de medida". The route path (`/admin/units`), the route constant (`Routes.ADMIN_UNITS`), and the existing role guard (`[ADMIN, SUPERADMIN]`) SHALL be unchanged.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** an admin user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Unidades de medida" SHALL be visible, linking to `Routes.ADMIN_UNITS`

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/units`
- **THEN** the "Unidades" parent group SHALL render expanded and the "Unidades de medida" child SHALL render with the active-child highlight

### Requirement: Spanish UI text throughout

All user-facing text on the screen — column headers, button labels, action labels, tooltips, error snackbars, confirmation dialogs — SHALL be in Spanish. API error codes SHALL be translated via `getApiErrorMessage`.

#### Scenario: API error renders Spanish message

- **WHEN** any mutation fails with an API error code introduced by the management capability (e.g., `MeasurementUnitFieldsLockedError`, `BaseUnitImmutableError`)
- **THEN** the screen SHALL display the localized Spanish message returned by `getApiErrorMessage` for that code

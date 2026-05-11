## ADDED Requirements

### Requirement: Rate measurement units screen at `/admin/rate-measurement-units`

The system SHALL expose an admin maintainer screen at the route `/admin/rate-measurement-units`, accessible only to users with system role `SUPERADMIN`. The screen SHALL render a paginated `StylizedDataGrid` of ACTIVE rate measurement units returned by `GET /api/measurement-units/rates`, with no mutation affordances (no edit toggle, no row actions, no add button).

#### Scenario: Non-superadmin access

- **WHEN** an authenticated user with system role `ADMIN` or `USER` navigates to `/admin/rate-measurement-units`
- **THEN** the route's `beforeLoad` guard SHALL redirect to `Routes.ADMIN_DASHBOARD`

#### Scenario: List rendering

- **WHEN** the screen mounts and `useRateMeasurementUnits()` resolves
- **THEN** the grid SHALL render columns `abbreviation`, numerator's `abbreviation`, numerator's `magnitude.name`, denominator's `abbreviation`, denominator's `magnitude.name`, and `totalReferenceCount`, sorted by `totalReferenceCount` DESC by default

### Requirement: URL-driven filter state

The screen SHALL expose three optional filters whose state lives in the URL search params: `numeratorMagnitudeId`, `denominatorMagnitudeId`, and `search`. The query hook SHALL read these filters from `useSearch` (TanStack Router) and forward them to the API.

#### Scenario: Filter writes update URL

- **WHEN** the admin selects a numerator magnitude in the header filter strip
- **THEN** the URL SHALL be updated with `?numeratorMagnitudeId=<id>` and the API call SHALL include the same filter

#### Scenario: Search input is debounced

- **WHEN** the admin types into the search field
- **THEN** the URL update and the resulting API call SHALL be debounced (300ms via the existing debounce constant in `apps/web/src/config/constants.ts`); rapid typing produces a single eventual API call, not one per keystroke

#### Scenario: URL state persists across reloads

- **WHEN** an admin loads `/admin/rate-measurement-units?numeratorMagnitudeId=…&denominatorMagnitudeId=…&search=…`
- **THEN** the screen SHALL apply all three filters on first render and the filter controls SHALL reflect the values

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

### Requirement: Sidebar entry "Tasas"

`MaintainerLayout.tsx` SHALL include a new top-level sidebar entry "Tasas" linked to `/admin/rate-measurement-units`. The entry SHALL be placed adjacent to "Magnitudes" and "Unidades". (A future change, `regroup-units-sidebar`, will collapse all three into a "Unidades" group.)

#### Scenario: Sidebar surfaces the new entry

- **WHEN** a SUPERADMIN user opens the sidebar
- **THEN** a "Tasas" entry SHALL be visible, linking to `Routes.ADMIN_RATE_MEASUREMENT_UNITS`

### Requirement: All UI text is in Spanish

The screen, its column headers, filter labels, placeholders, tooltips, and empty-state messages SHALL be in Spanish, consistent with the rest of the app.

#### Scenario: Column headers and filter labels are in Spanish

- **WHEN** a SUPERADMIN user opens `/admin/rate-measurement-units`
- **THEN** every visible column header, filter label, placeholder, and empty-state message SHALL be rendered in Spanish

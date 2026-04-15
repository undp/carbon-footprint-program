## Visual Reference

The page layout SHALL match the design mockup at `openspec/files/admin-dashboard-page.png`. Key layout details from the mockup:

- Header: "Dashboard General" title with year filter dropdown at the top right
- Row 1: Three KPI summary cards (organizations, emissions, recognitions) with paired values separated by "|"
- Row 2: "Empresas por Rubro" vertical bar chart (left) and "Distribución por Alcance" donut/pie chart (right), side by side
- Row 3: "Resumen de Postulaciones" — 3 status cards (Pendientes, Aprobadas, Revisadas)
- Row 4: "Reconocimientos Otorgados" — 4 recognition type cards

## ADDED Requirements

### Requirement: Admin dashboard page renders at /admin/dashboard

The system SHALL render a fully functional dashboard page at the `/admin/dashboard` route, replacing the current `UnderConstructionScreen`. The page layout SHALL follow the visual reference mockup at `openspec/files/admin-dashboard-page.png`.

#### Scenario: Page loads successfully

- **WHEN** an admin user navigates to `/admin/dashboard`
- **THEN** the system SHALL display the dashboard page with a header, year filter, KPI cards, charts, and status sections

### Requirement: Year filter defaults to "Todas" and filters all sections

The page SHALL display a year selector in the header area. The default selection SHALL be "Todas" (all years, no filtering). When a year is selected, all KPI cards, charts, and status sections SHALL update to reflect data for that year only.

#### Scenario: Default state shows all data

- **WHEN** the page loads with no year selected
- **THEN** the year selector SHALL display "Todas" and all sections SHALL show unfiltered data

#### Scenario: Selecting a year filters data

- **WHEN** the user selects year "2025" from the year selector
- **THEN** all KPI cards, charts, and status sections SHALL reload with data filtered to year 2025

#### Scenario: Clearing year filter returns to "Todas"

- **WHEN** the user clears the year selection or selects "Todas"
- **THEN** all sections SHALL return to showing unfiltered data

### Requirement: Three summary KPI cards display organization, emissions, and recognition data

The page SHALL display 3 summary cards in a horizontal row:

1. Accredited organizations count and self-declared organizations count
2. Total emissions measured and verified emissions
3. Total recognitions given and recognitions under review

#### Scenario: KPI cards render with data

- **WHEN** the KPI data loads successfully
- **THEN** the page SHALL display 3 cards, each showing two related metrics with labels and numeric values

#### Scenario: KPI cards show loading state

- **WHEN** the KPI data is being fetched
- **THEN** the cards SHALL display a loading indicator

### Requirement: Bar chart shows top-5 organizations per sector

The page SHALL display a horizontal bar chart showing the top 5 sectors by organization count.

#### Scenario: Sector chart renders with data

- **WHEN** the chart data loads successfully
- **THEN** the page SHALL display a horizontal bar chart with sector names on the Y-axis and organization counts on the X-axis, showing up to 5 bars

### Requirement: Pie chart shows emissions distribution per category

The page SHALL display a pie chart showing emissions totals grouped by emission category.

#### Scenario: Category emissions chart renders with data

- **WHEN** the chart data loads successfully
- **THEN** the page SHALL display a pie chart with category slices and their corresponding emissions in tCO2e

### Requirement: Charts are displayed side by side

The sector ranking chart and category emissions chart SHALL be displayed in a side-by-side layout on desktop viewports.

#### Scenario: Desktop layout

- **WHEN** the viewport width is desktop-sized (md breakpoint and above)
- **THEN** both charts SHALL render side by side in a two-column grid

### Requirement: Submission status cards display counts by status

The page SHALL display cards showing the count of submissions by status: pending, approved, and reviewed. The data SHALL be sourced from the existing `useAdminRequestsKpis` hook (GET /api/admin/requests/kpis), aggregating counts across all submission types per status. The "Aprobadas" card SHALL only count submissions with status `APPROVED`, explicitly excluding `APPROVED_AUTOMATICALLY`.

#### Scenario: Status cards render

- **WHEN** the requests KPI data loads successfully
- **THEN** the page SHALL display 3 cards (pending, approved, reviewed) each with a label and the sum of counts across all submission types for that status, where "Aprobadas" only includes `APPROVED` (not `APPROVED_AUTOMATICALLY`)

### Requirement: Recognition type cards display counts by type

The page SHALL display cards showing the count of granted recognitions. The data SHALL be sourced from the existing `useAdminRequestsKpis` hook, counting submissions with status `APPROVED` or `APPROVED_AUTOMATICALLY`, grouped by submission type. The frontend SHALL exclude `ORGANIZATION_ACCREDITATION` from the rendered cards (even though the endpoint returns it). The section SHALL display 5 cards: one total card (sum of all 4 displayed types) and one card per type (measurement, verification, reduction, neutralization).

#### Scenario: Recognition cards render

- **WHEN** the requests KPI data loads successfully
- **THEN** the page SHALL display 5 cards: a total count card, plus one card each for CARBON_INVENTORY_CALCULATION (measurement), CARBON_INVENTORY_VERIFICATION (verification), REDUCTION_PLAN_VERIFICATION (reduction), and NEUTRALIZATION_PLAN_VERIFICATION (neutralization), each showing the sum of `APPROVED` and `APPROVED_AUTOMATICALLY` counts for that type

#### Scenario: ORGANIZATION_ACCREDITATION is excluded from display

- **WHEN** the requests KPI data includes counts for `ORGANIZATION_ACCREDITATION`
- **THEN** the frontend SHALL NOT render a card for that type, and it SHALL NOT be included in the total count

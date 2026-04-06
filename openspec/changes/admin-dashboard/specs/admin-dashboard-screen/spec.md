## ADDED Requirements

### Requirement: Admin dashboard screen renders at /admin/dashboard

The system SHALL render an admin dashboard screen at the route `/admin/dashboard`. The screen MUST use the existing admin layout with sidebar navigation. The sidebar MUST show "Dashboard" as the first item with active state styling (background `#d4f4ee`, text `#006e4d`).

#### Scenario: Navigate to admin dashboard

- **WHEN** an admin user navigates to `/admin/dashboard`
- **THEN** the system displays the "Dashboard General" screen with header, year selector, and all dashboard sections

### Requirement: Year selector filters all dashboard data

The screen SHALL display a year selector (dropdown) in the header bar, defaulting to the current year. Changing the year MUST re-fetch all dashboard data filtered by the selected year.

#### Scenario: Change year filter

- **WHEN** the admin selects a different year from the dropdown
- **THEN** all KPI cards, charts, submission summary, and recognition counts update to reflect the selected year's data

### Requirement: Top-level KPI cards display platform metrics with dual values

The screen SHALL display 3 KPI cards in a single row. Each card MUST show a label, icon (in a tinted circle), a large dual numeric value in `X | Y` format, and a subtitle explaining the two values. The cards are:

1. **Empresas inscritas** — blue tint (background: linear-gradient overlay with `#0288D1`), icon: building/business. Values: `total | midiendo en el año`. Subtitle: "Total | midiendo en el año".
2. **Huella tCO₂e** — green tint (background: `rgba(99, 228, 207, 0.2)`), icon: globe/south america. Values: `total | verificada`. Subtitle: "Total | Verificada".
3. **Reconocimientos** — orange tint (background: linear-gradient overlay with `#ED6C02`), icon: award/badge. Values: `entregados | en postulación`. Subtitle: "Entregados | en postulación".

Each card SHALL have `300px` width, `163px` height, `12px` border-radius, and a subtle shadow (`0px 2px 8px rgba(0,0,0,0.08)`). The icon container SHALL be `40px` square with rounded corners and a tinted background matching the card theme.

#### Scenario: KPI cards render with data

- **WHEN** the dashboard loads successfully
- **THEN** three KPI cards are visible with their respective dual values from the API response

#### Scenario: KPI cards show loading state

- **WHEN** the dashboard data is being fetched
- **THEN** the KPI cards display skeleton placeholders

### Requirement: Empresas por Rubro bar chart with toggle

The screen SHALL display a horizontal bar chart titled "Empresas por Rubro" with a toggle button group to switch between "Empresas" (organization count) and "Emisiones (tCO2e)" views. The chart MUST use MUI X Charts BarChart component. Bars SHALL be sorted by value descending with sector names on the X axis rotated -45 degrees.

#### Scenario: Toggle between empresas and emisiones view

- **WHEN** the admin clicks the "Emisiones (tCO2e)" toggle
- **THEN** the bar chart updates to show emission values per sector instead of organization counts

### Requirement: Distribución por Alcance donut chart

The screen SHALL display a donut (pie) chart titled "Distribución por Alcance" showing the percentage breakdown of emissions by Scope 1, 2, and 3. The chart MUST use MUI X Charts PieChart component with labels showing "Alcance N: X%" format. Colors: Scope 1 = `#ffb74d`, Scope 2 = `#64b5f6`, Scope 3 = `#82c784`.

#### Scenario: Donut chart renders percentages

- **WHEN** the dashboard loads with emission scope data
- **THEN** the donut chart shows three segments with percentages that sum to ~100%

### Requirement: Resumen de Postulaciones section

The screen SHALL display a section titled "Resumen de Postulaciones" with 3 metric cards in a row: En Revisión (orange tint), Aprobadas (green tint), Con Observaciones (purple tint). Each card MUST display a label, icon, and count value.

#### Scenario: Submission summary cards render

- **WHEN** the dashboard loads
- **THEN** three submission summary cards display with counts matching the API response

### Requirement: Reconocimientos summary is included in top KPI cards

The recognitions data (awarded vs. in application) SHALL be displayed as the third KPI card in the top row, not as a separate section. No standalone "Reconocimientos Otorgados" section is needed.

#### Scenario: Recognitions visible in KPI row

- **WHEN** the dashboard loads
- **THEN** the third KPI card shows recognition counts in dual format (awarded | in application)

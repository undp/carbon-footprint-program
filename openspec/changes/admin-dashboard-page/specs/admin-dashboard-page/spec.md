## Visual Reference

The page layout SHALL match the design mockup at `openspec/files/admin-dashboard-page.png`. Key layout details from the mockup:

- Header: "Dashboard General" title with year filter dropdown at the top right
- Row 1: Three KPI summary cards (organizations, emissions, recognitions) with paired values separated by "|"
- Row 2: "Empresas por Rubro" bar chart (left) and "Distribución por Alcance" pie chart with optional methodology selector (right), side by side
- Row 3: "Resumen de Postulaciones" — tab group ("Inscripción" / "Reconocimientos") in top-right corner, 3 status cards (Pendientes, Aprobadas, Revisadas)
- Row 4: "Reconocimientos Otorgados" — 5 cards: 1 total card followed by 4 recognition type cards (measurement, verification, reduction, neutralization)

## ADDED Requirements

### Requirement: Admin dashboard page renders at /admin/dashboard

The system SHALL render a fully functional dashboard page at the `/admin/dashboard` route, replacing the current `UnderConstructionScreen`. The page layout SHALL follow the visual reference mockup at `openspec/files/admin-dashboard-page.png`.

#### Scenario: Page loads successfully

- **WHEN** an admin user navigates to `/admin/dashboard`
- **THEN** the system SHALL display the dashboard page with a header, year filter, KPI cards, charts, and status sections

### Requirement: Year filter defaults to "Todas" and filters all sections

The page SHALL display a year selector in the header area. The selected year SHALL be stored in URL query parameters (e.g., `?year=2025`) so the filter state is shareable and persists on page refresh. The default selection SHALL be "Todas" (no `year` param in URL, no filtering). When a year is selected, all KPI cards, charts, and status sections SHALL update to reflect data for that year only.

#### Scenario: Default state shows all data

- **WHEN** the page loads with no `year` query parameter in the URL
- **THEN** the year selector SHALL display "Todas" and all sections SHALL show unfiltered data

#### Scenario: Selecting a year filters data and updates URL

- **WHEN** the user selects year "2025" from the year selector
- **THEN** the URL SHALL update to include `?year=2025` and all sections SHALL reload with data filtered to year 2025

#### Scenario: Clearing year filter returns to "Todas"

- **WHEN** the user clears the year selection or selects "Todas"
- **THEN** the `year` query parameter SHALL be removed from the URL and all sections SHALL return to showing unfiltered data

#### Scenario: Page loads with year in URL

- **WHEN** the page loads with `?year=2025` in the URL
- **THEN** the year selector SHALL display "2025" and all sections SHALL show data filtered to year 2025

#### Scenario: Page loads with invalid year in URL

- **WHEN** the page loads with an invalid `year` value in the URL (non-numeric, negative, future)
- **THEN** the year selector SHALL fallback to "Todas" and the invalid param SHALL be removed from the URL

### Requirement: Three summary KPI cards display organization, emissions, and recognition data

The page SHALL display 3 summary cards in a horizontal row:

1. Accredited organizations count and self-declared organizations count
2. Total emissions measured and verified emissions
3. Total recognitions given and recognitions under review

#### Scenario: KPI cards render with data

- **WHEN** the KPI data loads successfully
- **THEN** the page SHALL display 3 cards, each showing two related metrics with labels and numeric values

#### Scenario: KPI cards with zero data

- **WHEN** the KPI data loads successfully but all values are 0
- **THEN** the KPI cards SHALL display 0 values (no special empty message)

#### Scenario: KPI cards show loading state

- **WHEN** the KPI data is being fetched
- **THEN** the cards SHALL display skeleton placeholders matching the shape of the KPI cards

#### Scenario: KPI cards show error state

- **WHEN** the KPI data fetch fails (network error, 500, etc.)
- **THEN** the system SHALL display a snackbar communicating the error to the user, and the KPI cards SHALL display a friendly error message inside the cards

### Requirement: Sector card with tabs for "Empresas" and "Emisiones"

The page SHALL display a card with a bar chart and tabs in the upper-right corner to toggle between "Empresas" and "Emisiones" views. The "Empresas" tab (default) shows a vertical bar chart of the top-N sectors by organization count. The "Emisiones" tab shows a vertical bar chart of the top-N sectors by total emissions (tCO2e). The frontend SHALL pass `limit=5` as the default value to the sector chart endpoint.

#### Scenario: Empresas tab renders by default

- **WHEN** the chart data loads successfully
- **THEN** the page SHALL display the "Empresas" tab as active, showing a vertical bar chart with sector names on the X-axis and organization counts on the Y-axis

#### Scenario: Switching to Emisiones tab

- **WHEN** the user clicks the "Emisiones" tab
- **THEN** the page SHALL display a vertical bar chart with sector names on the X-axis and total emissions (tCO2e) on the Y-axis, using `sectorEmissions` from the same sector chart endpoint

#### Scenario: Tab state is independent of year filter

- **WHEN** the user changes the year filter while on the "Emisiones" tab
- **THEN** the "Emisiones" tab SHALL remain active and the chart SHALL reload with filtered data

#### Scenario: Sector chart loading state

- **WHEN** the sector chart data is being fetched
- **THEN** the card SHALL display skeleton placeholders matching the shape of the bar chart

#### Scenario: Sector chart error state

- **WHEN** the sector chart data fetch fails (network error, 500, etc.)
- **THEN** the system SHALL display a snackbar communicating the error to the user, and the card SHALL display a friendly error message inside the card

#### Scenario: Sector chart empty state

- **WHEN** the sector chart endpoint returns an empty array for the active tab
- **THEN** the card SHALL display a "Sin datos disponibles" message instead of the chart

### Requirement: Distribution card always shows category pie chart

The "Distribución por Alcance" card SHALL always display a pie chart showing emissions distribution by category, regardless of the year filter. When no year is selected ("Todas"), the chart aggregates emissions across all years. When a specific year is selected, it filters to that year. If multiple methodologies exist, a methodology selector is rendered.

#### Scenario: No year filter — all years aggregated

- **WHEN** the year selector is set to "Todas"
- **THEN** the card SHALL display a pie chart with category slices showing aggregated emissions across all years, with a methodology selector if multiple methodologies exist

#### Scenario: Year selected — single methodology

- **WHEN** a specific year is selected and the response contains exactly one methodology
- **THEN** the card SHALL display a pie chart with category slices and their corresponding emissions in tCO2e, without a methodology selector

#### Scenario: Year selected — multiple methodologies

- **WHEN** a specific year is selected and the response contains more than one methodology
- **THEN** the card SHALL display a methodology selector (defaulting to the first methodology) and a pie chart showing the category emissions for the selected methodology. The user can switch between methodologies using the selector to view each distribution independently

#### Scenario: Distribution card empty state

- **WHEN** the category chart endpoint returns an empty `methodologies` array (no active methodology versions exist)
- **THEN** the card SHALL display a "Sin datos disponibles" message instead of the pie chart

#### Scenario: Distribution card with methodologies but zero emissions

- **WHEN** the category chart endpoint returns methodologies with all categories at `totalEmissions: 0`
- **THEN** the card SHALL still render the pie chart area (and methodology selector if applicable) but display a "Sin datos disponibles" message since there are no emissions to chart

#### Scenario: Distribution card loading state

- **WHEN** the category chart data is being fetched
- **THEN** the card SHALL display skeleton placeholders matching the shape of the pie chart

#### Scenario: Distribution card error state

- **WHEN** the category chart data fetch fails (network error, 500, etc.)
- **THEN** the system SHALL display a snackbar communicating the error to the user, and the card SHALL display a friendly error message inside the card

### Requirement: Charts are displayed side by side

The sector ranking chart and category emissions chart SHALL be displayed in a side-by-side layout on desktop viewports.

#### Scenario: Desktop layout

- **WHEN** the viewport width is desktop-sized (md breakpoint and above)
- **THEN** both charts SHALL render side by side in a two-column grid

### Requirement: Submission summary card with tab group for "Inscripción" and "Reconocimientos"

The "Resumen de Postulaciones" card SHALL render a tab group in the top-right corner with two tabs: "Inscripción" and "Reconocimientos". The "Reconocimientos" tab SHALL be selected by default. The data SHALL be sourced from the existing `useAdminRequestsKpis` hook (GET /api/admin/requests/kpis). Both tabs display 3 status cards (pending, approved, reviewed), but filter by different submission types.

- **"Inscripción" tab**: counts submissions of type `ORGANIZATION_ACCREDITATION` only
- **"Reconocimientos" tab**: counts submissions of the other 4 types (`CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, `REDUCTION_PLAN_VERIFICATION`, `NEUTRALIZATION_PLAN_VERIFICATION`)

The "Aprobadas" card SHALL display both manual and automatic approval counts separated by a pipe character ("|"). The left value shows the count of submissions with status `APPROVED` (manual approvals) and the right value shows the count of submissions with status `APPROVED_AUTOMATICALLY`. Below the numbers, the labels "Manual" and "Automática" SHALL be displayed, also separated by "|", to clarify each value. This layout follows the same paired-value pattern used in the KPI summary cards.

#### Scenario: Default tab is "Reconocimientos"

- **WHEN** the card loads successfully
- **THEN** the "Reconocimientos" tab SHALL be selected by default, showing 3 status cards (pending, approved, reviewed) with counts aggregated from the 4 recognition submission types only

#### Scenario: Switching to "Inscripción" tab

- **WHEN** the user clicks the "Inscripción" tab
- **THEN** the card SHALL display 3 status cards (pending, approved, reviewed) with counts from `ORGANIZATION_ACCREDITATION` submissions only

#### Scenario: Switching back to "Reconocimientos" tab

- **WHEN** the user clicks the "Reconocimientos" tab while "Inscripción" is active
- **THEN** the card SHALL display 3 status cards with counts aggregated from the 4 recognition submission types, excluding `ORGANIZATION_ACCREDITATION`

#### Scenario: Tab state is independent of year filter

- **WHEN** the user changes the year filter while on the "Inscripción" tab
- **THEN** the "Inscripción" tab SHALL remain active and the cards SHALL reload with filtered data

#### Scenario: Status cards with zero data

- **WHEN** the requests KPI data loads but all counts for the active tab are 0
- **THEN** the cards SHALL display 0 values (no special empty message)

#### Scenario: Status cards loading state

- **WHEN** the requests KPI data is being fetched
- **THEN** the submission status cards SHALL display skeleton placeholders matching the card shapes

#### Scenario: Status cards error state

- **WHEN** the requests KPI data fetch fails (network error, 500, etc.)
- **THEN** the system SHALL display a snackbar communicating the error to the user, and the submission status cards SHALL display a friendly error message inside the cards

### Requirement: Recognition type cards display counts by type

The page SHALL display cards showing the count of granted recognitions. The data SHALL be sourced from the existing `useAdminRequestsKpis` hook, counting submissions with status `APPROVED` or `APPROVED_AUTOMATICALLY`, grouped by submission type. The frontend SHALL exclude `ORGANIZATION_ACCREDITATION` from the rendered cards (even though the endpoint returns it). The section SHALL display 5 cards: one total card (sum of all 4 displayed types) and one card per type (measurement, verification, reduction, neutralization). Each card SHALL display the combined total of `APPROVED` + `APPROVED_AUTOMATICALLY` as the main count. Additionally, the "Diploma Medición" card (CARBON_INVENTORY_CALCULATION) SHALL display manual and automatic approval counts separately, using the same paired-value layout as the "Aprobadas" card: both values separated by a pipe character ("|") with "Manual" and "Automática" labels below.

#### Scenario: Recognition cards render

- **WHEN** the requests KPI data loads successfully
- **THEN** the page SHALL display 5 cards: a total count card, plus one card each for CARBON_INVENTORY_CALCULATION (measurement), CARBON_INVENTORY_VERIFICATION (verification), REDUCTION_PLAN_VERIFICATION (reduction), and NEUTRALIZATION_PLAN_VERIFICATION (neutralization), each showing the sum of `APPROVED` and `APPROVED_AUTOMATICALLY` counts for that type. The CARBON_INVENTORY_CALCULATION card SHALL additionally show the manual (`APPROVED`) and automatic (`APPROVED_AUTOMATICALLY`) counts separated by "|" with "Manual" | "Automática" labels below

#### Scenario: ORGANIZATION_ACCREDITATION is excluded from display

- **WHEN** the requests KPI data includes counts for `ORGANIZATION_ACCREDITATION`
- **THEN** the frontend SHALL NOT render a card for that type, and it SHALL NOT be included in the total count

#### Scenario: Recognition cards with zero data

- **WHEN** the requests KPI data loads but all recognition counts are 0
- **THEN** the cards SHALL display 0 values (no special empty message)

#### Scenario: Recognition cards loading state

- **WHEN** the requests KPI data is being fetched
- **THEN** the recognition type cards SHALL display skeleton placeholders matching the card shapes

#### Scenario: Recognition cards error state

- **WHEN** the requests KPI data fetch fails (network error, 500, etc.)
- **THEN** the system SHALL display a snackbar communicating the error to the user, and the recognition type cards SHALL display a friendly error message inside the cards

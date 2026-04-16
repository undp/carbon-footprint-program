## Context

The admin section already has pages for organization management (`AdminOrganizationsScreen`) and request management (`AdminRequestsScreen`), both following a Header + KPI Cards + DataTable pattern. The dashboard route (`/admin/dashboard`) currently renders `UnderConstructionScreen` and needs to become the admin landing page — an aggregated overview pulling data from organizations, carbon inventories, and submissions.

Existing API endpoints already serve some of this data (e.g., `getOrganizationKpis`, `getRequestsKpis`, `getSectorRanking`, `getEmissionsSummaryCategories`), but there is no single aggregated dashboard endpoint. The frontend uses TanStack React Query hooks, MUI components, and `@mui/x-charts` (v8.20.0) for visualizations.

## Goals / Non-Goals

**Goals:**

- Provide a single admin dashboard page with year-filterable KPIs, charts, and status breakdowns
- Reuse existing database tables and views (no schema changes)
- Follow established admin page patterns (Header + content sections)
- Keep API responses lightweight — aggregate counts only, no row-level data

**Non-Goals:**

- Drill-down navigation from dashboard cards to filtered detail pages (future enhancement)
- Real-time / WebSocket updates
- Export or PDF generation of dashboard data
- Custom date ranges beyond year filtering

## Decisions

### 1. Single aggregated API endpoint vs multiple endpoints

**Decision**: Three new API endpoints under `apps/api/src/features/dashboard/admin/`:

- `GET /api/admin/dashboard/kpis?year=` — returns all KPI counts (organizations, emissions, recognitions)
- `GET /api/admin/dashboard/sector-chart?limit=&year=` — returns both top-N organizations per sector (`sectorRanking`) and top-N emissions per sector (`sectorEmissions`) in a single response, used by the "Empresas" and "Emisiones" tabs respectively
- `GET /api/admin/dashboard/category-chart?year=` — returns emissions distribution per category grouped by methodology. Each methodology entry includes its id, name, and category emissions. The frontend renders a methodology selector when multiple methodologies exist. Called with or without year filter (aggregates all years when no filter)

**Rationale**: Splitting into three keeps payloads focused. The sector chart endpoint returns both org counts and emissions in one call since the data shares the same filters (`limit`, `year`) and sector resolution logic — this avoids duplicating the sector lookup query. The "Distribución por Alcance" card always shows the category pie chart (aggregating all years when no filter is active, or filtering to a specific year). The yearly emissions chart endpoint was removed as the category chart now serves both filtered and unfiltered views.

**Alternatives considered**:

- Reusing existing endpoints (`getOrganizationKpis`, `getRequestsKpis`, etc.) — rejected because they don't return all the fields needed.
- Reusing `getEmissionsSummaryCategories` for the category pie chart — rejected because it fetches data for a single carbon inventory, not aggregated across all inventories for a given year. The dashboard needs the big picture for the entire year.

### 2. Year filter behavior

**Decision**: The year selector defaults to "Todas" (no filter applied). When a year is selected, it is passed as an optional `year` query parameter to all endpoints (three new + existing requests KPIs). Each data point filters differently:

- **Organization counts** (KPIs endpoint): Cumulative — counts organizations whose `ORGANIZATION_ACCREDITATION` submission was approved up to and including the selected year. This is an accumulative KPI.
- **Emissions totals** (KPIs endpoint): Filters by `CarbonInventory.year = selectedYear`.
- **Recognition counts** (KPIs endpoint): Filters by the `year` field of the carbon inventory associated to each submission. For submissions without a carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`), the year is determined from `Submission.approvedAt`.
- **Sector ranking by orgs** (sector chart endpoint): Cumulative — counts enrolled organizations (those with an approved `ORGANIZATION_ACCREDITATION` submission) whose enrollment was approved up to and including the selected year (same logic as organization KPIs).
- **Sector ranking by emissions** (sector chart endpoint): Filters by `CarbonInventory.year = selectedYear`.
- **Emissions by category** (category chart endpoint): Always called. Filters by `CarbonInventory.year = selectedYear` when a year is selected, or aggregates all years when "Todas" is active.
- **Submissions by status** (requests KPIs endpoint): Filters by the `year` field of the carbon inventory associated to each submission. For submissions without a carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`), the year is determined from `Submission.approvedAt`.

**Rationale**: Organization counts are cumulative (by enrollment approval date) because the platform grows over time and admins want to see the total enrolled base at a point in time. Emissions and recognitions filter by inventory year because that represents the measurement period. Submissions filter through their associated inventory year for consistency. Note: when no year filter is active ("Todas"), `measuringOrganizations` applies a last-2-years window (matching the `organization_carbon_inventories_summary` view) rather than counting all years.

### 3. Charts implementation

**Decision**: Use `@mui/x-charts/BarChart` for both sector ranking views (vertical, toggled via tabs) and `@mui/x-charts/PieChart` for the category emissions distribution. Data is pre-aggregated on the API side. The sector card includes "Empresas" / "Emisiones" tabs in the upper-right corner to switch between org count and emissions views.

**Rationale**: The project already depends on `@mui/x-charts` v8.20.0 (PieChart is already used in `EmissionsPieChart.tsx` for emissions results). Both chart types are included in the same package — no new dependencies. The pie chart is a natural fit for showing proportional category distribution. Pre-aggregating on the API avoids sending raw data to the frontend.

### 4. Page layout structure

**Decision**: Single-column layout with sections stacked vertically:

1. Header with year selector
2. 3 summary KPI cards (row)
3. Bar chart + pie chart side-by-side (row)
4. Submission status cards (row)
5. Recognition type cards (row)

**Rationale**: Follows the existing admin page pattern. The two charts are placed side-by-side to maximize horizontal space and allow visual comparison. Cards use the existing MUI Card + Grid pattern from `RequestScreenKpiSection`.

## Risks / Trade-offs

- **[Performance on large datasets]** → Aggregation queries on submissions and inventories may slow down as data grows. Mitigation: Use COUNT queries with WHERE clauses (no full table scans). If needed later, add database views or materialized aggregations.
- **[Stale data]** → Dashboard shows point-in-time counts, not live data. Mitigation: Standard React Query cache with reasonable staleTime (30s). Acceptable for admin overview use case.
- **[Year filter edge cases]** → A submission may have been created in a different calendar year than its associated inventory's measurement year. Mitigation: All endpoints use `CarbonInventory.year` as the single source of truth for year filtering — submission queries join through the inventory relationship and filter on `CarbonInventory.year`, never on `Submission.createdAt`.

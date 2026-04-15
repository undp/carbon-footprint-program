## Context

The admin section already has pages for organization management (`AdminOrganizationsScreen`) and request management (`AdminRequestsScreen`), both following a Header + KPI Cards + DataTable pattern. The dashboard route (`/admin/dashboard`) currently renders `UnderConstructionScreen` and needs to become the admin landing page — an aggregated overview pulling data from organizations, carbon inventories, submissions, and badges.

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

- `GET /api/admin/dashboard/kpis?year=` — returns all KPI counts (organizations, emissions, submissions, recognitions)
- `GET /api/admin/dashboard/sector-chart?year=` — returns top-5 organizations per sector for the bar chart
- `GET /api/admin/dashboard/category-chart?year=` — returns emissions distribution per category for the pie chart

**Rationale**: Splitting into three keeps each payload single-purpose and allows independent loading of KPI cards, sector chart, and category chart. Each section can render as its data arrives without blocking the others.

**Alternatives considered**: Reusing existing endpoints (`getOrganizationKpis`, `getRequestsKpis`, etc.) — rejected because they don't return all the fields needed (e.g., self-declared count, verified emissions). A single charts endpoint was considered but splitting allows independent caching and loading states.

### 2. Year filter behavior

**Decision**: The year selector defaults to "Todas" (no filter applied). When a year is selected, it is passed as an optional `year` query parameter to all four endpoints (three new + existing requests KPIs). The API filters on `CarbonInventory.year` for inventory-related data, `Submission.createdAt` year for submission counts, and `Badge`-related queries through their submission dates.

**Rationale**: Matches the user requirement of optional filtering with "Todas" as default. Using the inventory year (not creation year) for emissions data is consistent with how the platform organizes measurement periods.

### 3. Charts implementation

**Decision**: Use `@mui/x-charts/BarChart` for the sector ranking (horizontal) and `@mui/x-charts/PieChart` for the category emissions distribution. Data is pre-aggregated on the API side.

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
- **[Year filter edge cases]** → An inventory spanning year boundaries or a submission created in a different year than its inventory. Mitigation: Filter inventories by `year` field (explicit measurement year) and submissions by `createdAt` year. Document this in API response types.

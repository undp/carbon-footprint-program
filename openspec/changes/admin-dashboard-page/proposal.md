## Why

The admin dashboard route (`/admin/dashboard`) currently shows an "Under Construction" screen. Platform administrators need an at-a-glance overview of organizational activity, emissions data, submission status, and recognition progress to monitor platform health and make informed decisions without navigating multiple admin pages.

## What Changes

- Replace the `UnderConstructionScreen` in `/admin/dashboard` with a fully functional admin dashboard page
- Add a new API endpoint to aggregate dashboard KPI data (organizations, emissions, submissions, recognitions)
- Add a new API endpoint for the sector bar chart (top-5 organizations per sector)
- Add a new API endpoint for the category pie chart (emissions distribution per category)
- Implement an optional year filter ("Todas" by default) that applies across all dashboard sections
- Display 3 summary KPI cards: accredited orgs vs self-declared, total vs verified emissions, total recognitions vs under review
- Display a horizontal bar chart for top-5 organization count per sector
- Display a pie chart for emissions distribution per category
- Display status-based submission count cards (pending, approved, reviewed)
- Display recognition count cards by type (measurement, verification, reduction, neutralization)

## Capabilities

### New Capabilities

- `admin-dashboard-kpis`: Aggregated KPI data endpoint and summary cards (organizations, emissions)
- `admin-dashboard-sector-chart`: Bar chart endpoint for top-5 organizations per sector
- `admin-dashboard-category-chart`: Pie chart endpoint for emissions distribution per category
- `admin-dashboard-page`: Frontend page layout with year filter, KPI cards, charts, and status sections

### Modified Capabilities

- `admin-requests-kpis`: Add optional `year` query parameter to the existing GET /api/admin/requests/kpis endpoint to support year filtering on the dashboard

## Impact

- **Frontend**: New screen component replacing `UnderConstructionScreen` at `apps/web/src/screens/Maintainer/screens/AdminDashboardScreen.tsx`, new query hooks, new chart components
- **API**: New feature endpoints under `apps/api/src/features/dashboard/admin/` for KPI aggregation and chart data
- **Types**: New request/response schemas in `packages/types/src/dashboard/`
- **Dependencies**: Uses existing `@mui/x-charts` (v8.20.0) for bar charts — no new dependencies needed
- **Database**: Read-only queries against existing tables (Organization, CarbonInventory, Submission, Badge) — no schema changes

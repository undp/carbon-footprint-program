## Why

The platform lacks a centralized admin view that provides system-wide visibility into key metrics (organizations, emissions, submissions, recognitions). Administrators currently need to navigate multiple screens to understand platform health. A dashboard consolidates these KPIs, charts, and summaries into a single view — enabling faster decision-making and operational oversight. This is a priority because the platform is scaling across Latin American countries and admin tooling needs to keep pace.

## What Changes

- **New admin dashboard screen** at `/admin/dashboard` showing:
  - 3 top-level KPI cards with dual values (`X | Y` format): Empresas inscritas (total | midiendo en el año), Huella tCO₂e (total | verificada), Reconocimientos (entregados | en postulación)
  - Year selector to filter all metrics by year
  - "Empresas por Rubro" horizontal bar chart with toggle (Empresas / Emisiones tCO2e)
  - "Distribución por Alcance" donut chart (Alcance 1/2/3 percentages)
  - "Resumen de Postulaciones" section: 3 cards (En Revisión, Aprobadas, Con Observaciones)
- **New API endpoint(s)** to aggregate dashboard KPIs from existing data (organizations, carbon inventories, submissions, badges)
- **Admin sidebar** updated to include "Dashboard" as the first navigation item (active state: green background `#d4f4ee`, text `#006e4d`)

## Capabilities

### New Capabilities

- `admin-dashboard-kpis`: API endpoint(s) that aggregate organization counts, emission totals, submission status counts, and recognition/badge counts — filterable by year
- `admin-dashboard-screen`: Frontend screen implementing the dashboard layout with KPI cards, charts (bar + donut), submission summary, and recognition summary — all driven by the KPIs API

### Modified Capabilities

<!-- No existing specs to modify — this is a new admin feature -->

## Impact

- **API** (`apps/api`): New route(s) under `/api/admin/dashboard` with aggregation queries across `organization`, `carbonInventory`, `submission`, and badge tables
- **Web** (`apps/web`): New screen at `apps/web/src/screens/AdminDashboard/`, new route at `apps/web/src/routes/admin/dashboard.tsx`, new query hooks
- **Types** (`packages/types`): New Zod schemas for dashboard KPI response
- **Dependencies**: MUI X Charts (`@mui/x-charts`) already installed — will use `BarChart` and `PieChart` components
- **No database migrations needed** — all data is derived from existing tables

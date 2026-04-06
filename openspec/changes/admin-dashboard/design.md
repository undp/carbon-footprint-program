## Context

The platform already has an admin section (`/admin/`) with screens for organizations and requests. The admin sidebar, layout, and role-based access are implemented. MUI X Charts (`@mui/x-charts`) is already installed. The database has all data needed — organizations, carbon inventories (with scope-level emissions), submissions, and badges — but no aggregation endpoint exists.

The Figma design (node `6067:9714`) specifies a "Dashboard General" view that the admin sees as their landing page.

## Goals / Non-Goals

**Goals:**
- Single API endpoint aggregating all dashboard KPIs (avoid N+1 frontend calls)
- Frontend screen matching the Figma design using existing MUI components
- Year-based filtering for all metrics
- Reuse existing patterns: handler factories, Zod schemas, React Query hooks

**Non-Goals:**
- Real-time updates (polling or WebSocket) — standard request/response is sufficient
- Caching layer — admin dashboard traffic is low, aggregation queries are acceptable
- Export/download of dashboard data
- Custom date range filtering (only year selector per Figma)
- Admin sidebar refactoring — only add "Dashboard" as first item

## Decisions

### 1. Single aggregation endpoint vs. multiple specialized endpoints
**Decision**: Single `GET /api/admin/dashboard/kpis?year=<year>` endpoint returning all metrics.
**Rationale**: The dashboard loads all data at once. Multiple endpoints would require parallel fetches and complicate loading states. One round-trip is simpler and faster.
**Alternative considered**: Separate endpoints per section (organizations, submissions, recognitions). Rejected — unnecessary complexity for a single-page dashboard.

### 2. KPI response structure: dual-value metrics
**Decision**: Each top-level KPI returns a pair of values (total/all-time + year-filtered/status-filtered) in a single object:
- `organizations: { total, measuringInYear }` — total registered vs. those with inventories in the selected year
- `emissions: { total, verified }` — all emissions vs. those from APPROVED submissions
- `recognitions: { awarded, inApplication }` — delivered badges vs. pending recognition submissions
**Rationale**: The Figma design (node `6320:92171`) shows each KPI card with a `X | Y` dual-value format. Returning both values from the API avoids multiple round-trips and keeps the frontend simple.

### 3. Aggregation in application layer vs. database views
**Decision**: Prisma `count()` and `groupBy()` queries in the service layer.
**Rationale**: The queries are straightforward aggregations that Prisma handles well. Database views would add migration overhead without meaningful performance gain at current data scale.
**Alternative considered**: SQL views or materialized views. Deferred — can add later if performance becomes an issue.

### 3. Chart library: MUI X Charts
**Decision**: Use `@mui/x-charts` `BarChart` and `PieChart` components.
**Rationale**: Already installed, consistent with MUI design system used throughout the app. No additional dependencies needed.
**Alternative considered**: Recharts, Chart.js. Rejected — would add another dependency when MUI X Charts is already available.

### 4. Route structure
**Decision**: Add `/admin/dashboard` as a new route file at `apps/web/src/routes/admin/dashboard.tsx`. Update the admin sidebar to include "Dashboard" as the first item.
**Rationale**: Follows existing routing pattern (`/admin/organizations`, `/admin/requests`). TanStack Router file-based routing convention.

### 5. API route placement
**Decision**: `apps/api/src/routes/api/admin/dashboard/index.ts` registering a single GET route.
**Rationale**: Follows the existing `apps/api/src/routes/api/admin/requests/` pattern for admin-only routes.

## Risks / Trade-offs

- **[Performance]** Aggregation queries across multiple tables may be slow with large datasets → Mitigation: Queries use `count()` and `groupBy()` which are efficient. Can add indexes or caching if needed later.
- **[Scope emissions]** Emission scope percentages require summing line-level data by category scope → Mitigation: Use the existing `carbon_inventory_subtotals_view` or aggregate from `CarbonInventoryLine` grouped by category scope.
- **[Recognition counting]** "Awarded" vs "in application" requires clear definitions → Decision: "Awarded" = badges with delivered status, "in application" = submissions with PENDING status for recognition/badge requests.
- **[Year filter semantics]** "Measuring in year" means the organization has at least one carbon inventory for that year. "Verified" emissions means emissions from inventories with APPROVED submission status.

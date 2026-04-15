## 1. Types & Schemas

- [ ] 1.1 Create `packages/types/src/dashboard/admin/schemas.ts` with Zod schemas for: shared `year` query param (optional, coerced to number, positive integer, max current year — returns 400 on invalid input), shared `limit` query param (required, coerced to number, positive integer), KPIs response (org counts, emissions), sector chart response (sector ranking + sector emissions), and category chart response (array of methodologies, each with methodologyId, methodologyName, and categoryEmissions)
- [ ] 1.2 Create `packages/types/src/dashboard/admin/types.ts` with inferred TypeScript types from schemas
- [ ] 1.3 Export dashboard admin types from `packages/types/src/dashboard/admin/index.ts` and add to package barrel export

## 2. API — Modify Existing Requests KPIs Endpoint

- [ ] 2.1 Add optional `year` query parameter to `apps/api/src/features/requests/admin/getRequestsKpis/route.ts`
- [ ] 2.2 Update handler to extract and pass `year` to the service
- [ ] 2.3 Update service to filter submissions by inventory year when `year` is provided
- [ ] 2.4 Update `useAdminRequestsKpis` hook to accept and pass an optional `year` parameter

## 3. API — Dashboard KPIs Endpoint

- [ ] 3.1 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/route.ts` with GET route, optional `year` query param, and Zod response schemas for all HTTP codes (200, 400, 401, 403, 500)
- [ ] 3.2 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/handler.ts` to parse request and call service
- [ ] 3.3 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/service.ts` with queries for: accredited orgs, self-declared orgs, total emissions, verified emissions — all with optional year filter
- [ ] 3.4 Register the KPIs route in the admin dashboard feature plugin, using `fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` as `preHandler` hook

## 4. API — Sector Chart Endpoint

- [ ] 4.1 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/route.ts` with GET route, required `limit` query param, optional `year` query param, and Zod response schemas for all HTTP codes (200, 400, 401, 403, 500)
- [ ] 4.2 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/handler.ts` to parse request and call service
- [ ] 4.3 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/service.ts` with queries for top-N sector ranking by org count and top-N sector ranking by total emissions, accepting `limit` and optional `year` filter, returning both `sectorRanking` and `sectorEmissions`
- [ ] 4.4 Register the sector chart route in the admin dashboard feature plugin, using `fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` as `preHandler` hook

## 5. API — Category Chart Endpoint

- [ ] 5.1 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/route.ts` with GET route, optional `year` query param, and Zod response schemas for all HTTP codes (200, 400, 401, 403, 500)
- [ ] 5.2 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/handler.ts` to parse request and call service
- [ ] 5.3 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/service.ts` with query for emissions distribution by category grouped by methodology, with optional year filter. Returns array of methodologies each with id, name, and categoryEmissions
- [ ] 5.4 Register the category chart route in the admin dashboard feature plugin, using `fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` as `preHandler` hook

## 6. Frontend — Query Hooks

- [ ] 6.1 Create `useAdminDashboardKpis` query hook with optional `year` parameter, using `STALE_TIME_MS` and `REFETCH_INTERVAL_MS` from `apps/web/src/config/constants.ts`
- [ ] 6.2 Create `useAdminDashboardSectorChart` query hook with required `limit` and optional `year` parameters (returns both `sectorRanking` and `sectorEmissions`), using `STALE_TIME_MS` and `REFETCH_INTERVAL_MS`
- [ ] 6.3 Create `useAdminDashboardCategoryChart` query hook with optional `year` parameter (always called), using `STALE_TIME_MS` and `REFETCH_INTERVAL_MS`

## 7. Frontend — Dashboard Page

- [ ] 7.1 Create `AdminDashboardScreen.tsx` with page layout, header, and year selector (default "Todas"). Year filter state SHALL be stored in URL query parameters (`useSearchParams`), parsed on mount, updated on change, and fallback to "Todas" for invalid/missing values
- [ ] 7.2 Create KPI summary cards section (3 cards: orgs, emissions, recognitions) with loading states
- [ ] 7.3 Create sector card with "Empresas" / "Emisiones" tabs in upper-right corner, defaulting to "Empresas"
- [ ] 7.4 Create sector ranking vertical bar chart component (org count) using `@mui/x-charts/BarChart` for "Empresas" tab, using `sectorRanking` from the sector chart hook
- [ ] 7.5 Create sector emissions vertical bar chart component (tCO2e) using `@mui/x-charts/BarChart` for "Emisiones" tab, using `sectorEmissions` from the sector chart hook
- [ ] 7.6 Create "Distribución por Alcance" card with category emissions pie chart component using `@mui/x-charts/PieChart`, with a methodology selector rendered only when multiple methodologies are present (defaults to first methodology)
- [ ] 7.7 Create "Resumen de Postulaciones" card with tab group ("Inscripción" / "Reconocimientos", default "Reconocimientos") in top-right corner. "Inscripción" filters by ORGANIZATION_ACCREDITATION only, "Reconocimientos" filters by the other 4 types. Both tabs show 3 status cards (pending, approved, reviewed) using data from existing `useAdminRequestsKpis` hook
- [ ] 7.8 Create recognition type cards section: 1 total card + 4 type cards (measurement, verification, reduction, neutralization) using approved counts from existing `useAdminRequestsKpis` hook
- [ ] 7.9 Wire URL-based year state to all query hooks (useAdminDashboardKpis, useAdminDashboardSectorChart, useAdminDashboardCategoryChart, useAdminRequestsKpis)

## 8. Route Integration

- [ ] 8.1 Update `apps/web/src/routes/admin/dashboard.tsx` to render `AdminDashboardScreen` instead of `UnderConstructionScreen`

## 9. Testing

- [ ] 9.1 Write integration tests for `getDashboardKpis` endpoint (with/without year filter, invalid year, auth checks)
- [ ] 9.2 Write integration tests for `getDashboardSectorChart` endpoint (with/without year and limit, ties, empty state, auth checks)
- [ ] 9.3 Write integration tests for `getDashboardCategoryChart` endpoint (single methodology, multiple methodologies returning all, with/without year filter, empty state, auth checks)
- [ ] 9.4 Write integration tests for modified `getRequestsKpis` endpoint (with/without year filter, backwards compatibility)

## 10. Verification

- [ ] 10.1 Run `pnpm type-check` and fix any TypeScript errors
- [ ] 10.2 Run `pnpm lint` and fix any linting issues
- [ ] 10.3 Run `pnpm test --filter=api -- /dashboard --coverage=false` and verify all tests pass

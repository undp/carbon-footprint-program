## 1. Types & Schemas

- [ ] 1.1 Create `packages/types/src/dashboard/schemas.ts` with Zod schemas for KPIs response (org counts, emissions), sector chart response (sector ranking), and category chart response (category emissions)
- [ ] 1.2 Create `packages/types/src/dashboard/types.ts` with inferred TypeScript types from schemas
- [ ] 1.3 Export dashboard types from `packages/types/src/dashboard/index.ts` and add to package barrel export

## 2. API — Modify Existing Requests KPIs Endpoint

- [ ] 2.1 Add optional `year` query parameter to `apps/api/src/features/requests/admin/getRequestsKpis/route.ts`
- [ ] 2.2 Update handler to extract and pass `year` to the service
- [ ] 2.3 Update service to filter submissions by inventory year when `year` is provided
- [ ] 2.4 Update `useAdminRequestsKpis` hook to accept and pass an optional `year` parameter

## 3. API — Dashboard KPIs Endpoint

- [ ] 3.1 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/route.ts` with GET route and optional `year` query param
- [ ] 3.2 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/handler.ts` to parse request and call service
- [ ] 3.3 Create `apps/api/src/features/dashboard/admin/getDashboardKpis/service.ts` with queries for: accredited orgs, self-declared orgs, total emissions, verified emissions — all with optional year filter
- [ ] 3.4 Register the KPIs route in the admin dashboard feature plugin with admin auth guard

## 4. API — Sector Chart Endpoint

- [ ] 4.1 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/route.ts` with GET route and optional `year` query param
- [ ] 4.2 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/handler.ts` to parse request and call service
- [ ] 4.3 Create `apps/api/src/features/dashboard/admin/getDashboardSectorChart/service.ts` with query for top-5 sector ranking by org count with optional year filter
- [ ] 4.4 Register the sector chart route in the admin dashboard feature plugin with admin auth guard

## 5. API — Category Chart Endpoint

- [ ] 5.1 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/route.ts` with GET route and optional `year` query param
- [ ] 5.2 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/handler.ts` to parse request and call service
- [ ] 5.3 Create `apps/api/src/features/dashboard/admin/getDashboardCategoryChart/service.ts` with query for emissions distribution by category with optional year filter
- [ ] 5.4 Register the category chart route in the admin dashboard feature plugin with admin auth guard

## 6. Frontend — Query Hooks

- [ ] 6.1 Create `useAdminDashboardKpis` query hook with optional `year` parameter
- [ ] 6.2 Create `useAdminDashboardSectorChart` query hook with optional `year` parameter
- [ ] 6.3 Create `useAdminDashboardCategoryChart` query hook with optional `year` parameter

## 7. Frontend — Dashboard Page

- [ ] 7.1 Create `AdminDashboardScreen.tsx` with page layout, header, and year selector (default "Todas")
- [ ] 7.2 Create KPI summary cards section (3 cards: orgs, emissions, recognitions) with loading states
- [ ] 7.3 Create sector ranking horizontal bar chart component using `@mui/x-charts/BarChart`
- [ ] 7.4 Create category emissions pie chart component using `@mui/x-charts/PieChart`
- [ ] 7.5 Create submission status cards section (pending, approved, reviewed) using data from existing `useAdminRequestsKpis` hook
- [ ] 7.6 Create recognition type cards section (measurement, verification, reduction, neutralization) using approved counts from existing `useAdminRequestsKpis` hook
- [ ] 7.7 Wire year selector state to all query hooks (dashboard KPIs, sector chart, category chart, and requests KPIs) so all sections filter together

## 8. Route Integration

- [ ] 8.1 Update `apps/web/src/routes/admin/dashboard.tsx` to render `AdminDashboardScreen` instead of `UnderConstructionScreen`

## 9. Verification

- [ ] 9.1 Run `pnpm type-check` and fix any TypeScript errors
- [ ] 9.2 Run `pnpm lint` and fix any linting issues

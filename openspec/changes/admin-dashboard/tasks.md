## 1. Types — Zod Schemas

- [ ] 1.1 Create `packages/types/src/adminDashboard/` with `schemas.ts` defining `AdminDashboardKpisQuerySchema` (optional year param) and `AdminDashboardKpisResponseSchema` with dual-value KPI fields: `organizations: { total, measuringInYear }`, `emissions: { total, verified }`, `recognitions: { awarded, inApplication }`, plus `submissionSummary`, `organizationsBySector`, `emissionsByScope`
- [ ] 1.2 Create `packages/types/src/adminDashboard/types.ts` with inferred types
- [ ] 1.3 Create `packages/types/src/adminDashboard/index.ts` barrel export and add to `packages/types/src/index.ts`
- [ ] 1.4 Rebuild types: `pnpm --filter @repo/types build`

## 2. API — Dashboard KPIs Endpoint

- [ ] 2.1 Create `apps/api/src/features/adminDashboard/getDashboardKpis/service.ts` with aggregation queries: organization counts (total + measuring in year), emission totals (total + verified), recognition counts (awarded + in application), submission counts by status, organizations grouped by sector, emissions by scope
- [ ] 2.2 Create `apps/api/src/features/adminDashboard/getDashboardKpis/handler.ts` using handler factory pattern
- [ ] 2.3 Create `apps/api/src/features/adminDashboard/getDashboardKpis/route.ts` with Zod schema validation
- [ ] 2.4 Create `apps/api/src/routes/api/admin/dashboard/index.ts` registering the route with requireAuth + requireRoles([SUPERADMIN, ADMIN])
- [ ] 2.5 Register the dashboard route in the admin routes index
- [ ] 2.6 Verify with `pnpm --filter api type-check`

## 3. API — Integration Tests

- [ ] 3.1 Create `apps/api/test/features/adminDashboard/getDashboardKpis/integration.test.ts` covering: successful KPI fetch, year filtering, unauthorized access (403), empty state

## 4. Web — Query Hook

- [ ] 4.1 Create `apps/web/src/api/query/adminDashboard/keys.ts` with query key factory
- [ ] 4.2 Create `apps/web/src/api/query/adminDashboard/useDashboardKpis.ts` React Query hook accepting optional year parameter
- [ ] 4.3 Create `apps/web/src/api/query/adminDashboard/index.ts` barrel export and add to `apps/web/src/api/query/index.ts`

## 5. Web — Dashboard Screen Components

- [ ] 5.1 Create `apps/web/src/screens/AdminDashboard/components/DashboardHeader.tsx` — title "Dashboard General" + year selector (MUI Select)
- [ ] 5.2 Create `apps/web/src/screens/AdminDashboard/components/KpiCard.tsx` — reusable card component with label, icon, dual value (`X | Y` format), subtitle, and background color tint. Card: 300px width, 163px height, 12px border-radius, shadow `0px 2px 8px rgba(0,0,0,0.08)`. Icon container: 40px square, rounded, tinted background
- [ ] 5.3 Create `apps/web/src/screens/AdminDashboard/components/KpiCardsRow.tsx` — 3-column row rendering: Empresas inscritas (blue `#0288D1` tint), Huella tCO₂e (green `rgba(99,228,207,0.2)` tint), Reconocimientos (orange `#ED6C02` tint)
- [ ] 5.4 Create `apps/web/src/screens/AdminDashboard/components/SectorBarChart.tsx` — MUI X Charts BarChart with toggle (Empresas / Emisiones)
- [ ] 5.5 Create `apps/web/src/screens/AdminDashboard/components/ScopeDonutChart.tsx` — MUI X Charts PieChart for scope distribution (Alcance 1/2/3)
- [ ] 5.6 Create `apps/web/src/screens/AdminDashboard/components/SubmissionSummary.tsx` — 3 metric cards (En Revisión, Aprobadas, Con Observaciones)
- [ ] 5.7 Create `apps/web/src/screens/AdminDashboard/components/index.ts` barrel export

## 6. Web — Screen & Routing

- [ ] 6.1 Create `apps/web/src/screens/AdminDashboard/AdminDashboardScreen.tsx` composing all sections with 24px gap layout, calling `useDashboardKpis(year)` and passing data to child components
- [ ] 6.2 Create `apps/web/src/screens/AdminDashboard/index.ts` barrel export
- [ ] 6.3 Create `apps/web/src/routes/admin/dashboard.tsx` route file
- [ ] 6.4 Update admin sidebar to add "Dashboard" as first nav item with active state styling (`#d4f4ee` bg, `#006e4d` text)
- [ ] 6.5 Regenerate route tree: ensure `routeTree.gen.ts` includes new route

## 7. Web — Tests

- [ ] 7.1 Create `apps/web/src/screens/AdminDashboard/AdminDashboardScreen.test.tsx` with basic render tests, loading state, year selector interaction
- [ ] 7.2 Run all web tests: `pnpm --filter web test`

## 8. Verification

- [ ] 8.1 Run full type-check: `pnpm type-check`
- [ ] 8.2 Run lint: `pnpm lint`
- [ ] 8.3 Visual verification: compare rendered screen against Figma design

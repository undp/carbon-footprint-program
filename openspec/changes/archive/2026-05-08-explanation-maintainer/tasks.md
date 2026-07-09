## 1. Shared constants catalog

- [ ] 1.1 Create `packages/constants/src/explanations.ts` with `ExplanationSlug` const object + derived union type, `ExplanationCatalogEntry` interface, and `EXPLANATION_CATALOG` record containing the 5 reduction-project slugs with Spanish `name`/`description`
- [ ] 1.2 Re-export from `packages/constants/src/index.ts`

## 2. Database schema + migration

- [ ] 2.1 Edit `packages/database/src/prisma/schema.prisma`: on `Explanation` add `name String` and `description String?`; remove `createdById`, remove `creator` relation
- [ ] 2.2 On the `User` model remove the back-relation named `explanation_created_by`
- [ ] 2.3 Run `pnpm --filter database dev:generate && pnpm --filter database dev:build` to produce the migration
- [ ] 2.4 Inspect the generated SQL to confirm: adds `name` NOT NULL + `description` nullable; drops `createdById` column + FK; no destructive change to `content`

## 3. Seed

- [ ] 3.1 In `packages/database/src/prisma/seeds/scripts/seedExplanations.ts` add `seedStandaloneExplanations(prisma, dataset)` that iterates `EXPLANATION_CATALOG` and calls `prisma.explanation.upsert({ where: { slug }, create: { slug, name, description, content: "" }, update: { name, description } })`
- [ ] 3.2 Call `seedStandaloneExplanations` from the top of the existing `seedExplanations` entrypoint

## 4. Types package

- [ ] 4.1 Update `packages/types/src/baseSchemas/explanation.ts` `ExplanationBaseSchema` to include `name: z.string()` and `description: z.string().nullable()`
- [ ] 4.2 Create `packages/types/src/explanations/admin/getAllExplanations/schemas.ts` exporting `GetAllExplanationsResponseSchema = z.array(ExplanationBaseSchema)` and inferred type
- [ ] 4.3 Create `packages/types/src/explanations/admin/getAllExplanations/types.ts` + `index.ts`
- [ ] 4.4 Create `packages/types/src/explanations/admin/updateExplanation/schemas.ts` with `UpdateExplanationParamsSchema` (`{ slug: z.string() }`), `UpdateExplanationRequestSchema` (`{ content: z.string().max(10000) }`), `UpdateExplanationResponseSchema = ExplanationBaseSchema`
- [ ] 4.5 Create `packages/types/src/explanations/admin/updateExplanation/types.ts` + `index.ts`
- [ ] 4.6 Create `packages/types/src/explanations/admin/index.ts` re-exporting both endpoint folders
- [ ] 4.7 Update `packages/types/src/explanations/index.ts` to re-export `./admin`

## 5. API — admin endpoints

- [ ] 5.1 Create `apps/api/src/features/explanations/admin/getAllExplanations/service.ts` using `prisma.explanation.findMany({ where: { slug: { in: Object.keys(EXPLANATION_CATALOG) as ExplanationSlug[] } }, orderBy: { name: "asc" }, select: { slug: true, name: true, description: true, content: true, createdAt: true, updatedAt: true, updatedById: true } })` — the `where` filter ensures orphan rows (slugs no longer in the catalog) are excluded from the admin response
- [ ] 5.2 Create `apps/api/src/features/explanations/admin/getAllExplanations/handler.ts`
- [ ] 5.3 Create `apps/api/src/features/explanations/admin/getAllExplanations/route.ts` with Zod schema, no per-route auth hooks (handled at file scope)
- [ ] 5.4 Create `apps/api/src/features/explanations/admin/updateExplanation/service.ts` implementing `prisma.$transaction` that (a) rejects slugs not present in `EXPLANATION_CATALOG` with `ExplanationNotFoundError` (so orphan rows are treated as not-found from the admin surface, mirroring the list filter), (b) verifies the row exists in DB (throw `ExplanationNotFoundError`), then updates `content`, `updatedById`, `updatedAt`; returns full row
- [ ] 5.5 Create `apps/api/src/features/explanations/admin/updateExplanation/handler.ts` (pulls `currentUser` from request)
- [ ] 5.6 Create `apps/api/src/features/explanations/admin/updateExplanation/route.ts` with Zod schema including `404` with `ApiErrorResponseSchema`

## 6. API — admin route registration

- [ ] 6.1 Create `apps/api/src/routes/api/admin/explanations/index.ts` that registers `fastify.addHook("onRequest", fastify.requireAuth)` and `fastify.addHook("onRequest", fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN]))`, then calls `getAllExplanationsRoute(fastify)` and `updateExplanationRoute(fastify)`
- [ ] 6.2 Confirm auto-loading picks the new file up (by mirroring the pattern of `admin/dashboard/index.ts`)
- [ ] 6.3 Leave `apps/api/src/routes/api/explanations/index.ts` untouched

## 7. API — tests

- [ ] 7.1 Add `apps/api/test/factories/explanationFactory.ts` that creates rows with required fields + overridable slug/name/description/content
- [ ] 7.2 Create `apps/api/test/features/explanations/admin/getAllExplanations/integration.test.ts` covering 401 unauth, 403 non-admin, 200 sorted-by-name ADMIN happy path, and a case where a DB row whose slug is not in `EXPLANATION_CATALOG` is excluded from the response (guardrail against the catalog filter regressing)
- [ ] 7.3 Create `apps/api/test/features/explanations/admin/updateExplanation/integration.test.ts` covering 401, 403, 404 unknown slug, 404 orphan slug (exists in DB but not in `EXPLANATION_CATALOG`), 400 content too long, 200 empty content accepted, 200 happy-path updates `content`+`updatedById`+`updatedAt`

## 8. Web — query hooks + route

- [ ] 8.1 Extend `apps/web/src/api/query/maintainer/keys.ts` with `explanations: { all: () => ["maintainer", "explanations"] as const }`
- [ ] 8.2 Create `apps/web/src/api/query/maintainer/useExplanations.ts` exporting `useExplanations()` (GET with `staleTime: STALE_TIME_MS`) and `useUpdateExplanation()` (PATCH + `queryClient.invalidateQueries({ queryKey: maintainerKeys.explanations.all(), exact: true })`)
- [ ] 8.3 Add `ADMIN_EXPLANATIONS: "/admin/explanations"` to `apps/web/src/interfaces/routes/routes.const.ts`
- [ ] 8.4 Create `apps/web/src/routes/admin/explanations.tsx` using `beforeLoad: requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN], { redirectTo: Routes.ADMIN_DASHBOARD })`

## 9. Web — maintainer screen

- [ ] 9.1 Extend `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` to accept a new optional `loading?: boolean` prop that disables the save button and shows a spinner while true; preserve the existing `value` prop name
- [ ] 9.2 Create `apps/web/src/screens/Maintainer/screens/ExplanationsMaintainerScreen.tsx` with `useExplanations()`, local state `searchText` + `editingSlug`, accent- and case-insensitive filter on `name`/`slug`, and `MaintainerDataGrid` columns `Nombre | Descripción | Slug | Acciones`
- [ ] 9.3 Wire "Editar" button to open `ExplanationModal` with `title={row.name}`, optionally render `row.description` as sub-text, pass `loading` from mutation state, and `onSave` calls `useUpdateExplanation().mutateAsync({ slug, content })` then closes the modal and shows a success toast; on error keep modal open and surface the error
- [ ] 9.4 Add `MaintainerPageHeader` with only the search input (no Add button)
- [ ] 9.5 Add `SIDEBAR_DEFS` entry in `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` for `Routes.ADMIN_EXPLANATIONS` with label "Explicaciones" and `requiredRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN]`

## 10. Web — reduction project wiring

- [ ] 10.1 In `apps/web/src/contexts/ExplanationContext.tsx` narrow `openExplanationBySlug` to `(slug: ExplanationSlug | null) => void`; update `ExplanationContextType` and the `useCallback` signature accordingly
- [ ] 10.2 In `apps/web/src/screens/ReductionProject/components/ReductionProjectFormFields.tsx` rename prop `gwpExplanationId` → `gwpExplanationSlug` (declaration + destructure + usage on the referenced lines)
- [ ] 10.3 In `apps/web/src/screens/ReductionProject/components/GeiConsideredSection.tsx` rename prop `geiExplanationId` → `geiExplanationSlug`
- [ ] 10.4 In `apps/web/src/screens/ReductionProject/components/ReportedElsewhereSection.tsx` rename prop `reportedElsewhereExplanationId` → `reportedElsewhereExplanationSlug`
- [ ] 10.5 Update section-component prop types to `*ExplanationSlug?: ExplanationSlug | null`
- [ ] 10.6 Update callers in `apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx` to the new prop names
- [ ] 10.7 Wire the 5 `InfoButton` slots to the concrete slugs from `EXPLANATION_CATALOG`: list header (`REDUCTION_PROJECTS_LIST`), detail "Datos base" (`REDUCTION_PROJECT_BASIS`), GWP (`REDUCTION_PROJECT_GWP`), "GEI considerados" (`REDUCTION_PROJECT_GEI_CONSIDERED`), "Reportado en otra iniciativa" (`REDUCTION_PROJECT_REPORTED_ELSEWHERE`)

## 11. Docs

- [ ] 11.1 Add or update docs under `docs/` describing the explanations maintainer and the shared catalog convention (placement informed by existing structure under `docs/architecture/`, `docs/data-model/`, `docs/development/`)

## 12. Verification

- [ ] 12.1 Run `pnpm type-check` — passes with no errors
- [ ] 12.2 Run `pnpm lint` — zero warnings
- [ ] 12.3 Run `pnpm format`
- [ ] 12.4 Run `pnpm test --filter=api -- /explanations --coverage=false` — all green
- [ ] 12.5 Reseed DB and confirm `Explanation` table contains the 5 catalog rows with empty `content`
- [ ] 12.6 Manually verify `/admin/explanations` as ADMIN: list sorted by name, search filter works, edit → save → toast → list refreshes
- [ ] 12.7 Manually verify reduction-project `InfoButton`s open the saved content for their slugs
- [ ] 12.8 Manually verify `/admin/explanations` as plain USER redirects to the admin dashboard

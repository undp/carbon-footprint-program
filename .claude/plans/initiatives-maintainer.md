# Plan: Initiatives Maintainer (Reduction Plan)

## Context

`ReductionPlanInitiative` catalog powers suggested initiatives inside reduction plans (merged in #244). Today rows only land via Prisma seeds; no UI to curate copy, add entries, or retire stale ones without a code deploy.

Goal: lightweight inline-editable maintainer at `/admin/reduction-plan`, reachable by ADMIN and SUPERADMIN, following the existing maintainer design standards (MaintainerPageHeader + StylizedDataGrid + inline cell edits with auto-save on blur) used by `CategoriesMaintainerScreen`. Scope intentionally trimmed — no dimension values, no reorder, no deleted-row toggle.

OpenSpec draft at `openspec/changes/initiatives-maintainer/` exists but is being **reworked**: inline edit (not dialog), drop dimension values, add a derived Category column with category-as-filter for the subcategory selector, shorter route, relabeled sidebar.

## Scope summary

| Area                 | Decision                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| Route                | `/admin/reduction-plan`                                                           |
| Sidebar label        | `Plan de reducción`                                                               |
| Roles (read + write) | `SystemRole.ADMIN`, `SystemRole.SUPERADMIN`                                       |
| Edit mode            | Inline cell edit, auto-save on blur (Categories-style)                            |
| Fields persisted     | `title`, `description`, `subcategoryId` only                                      |
| UI-only field        | `category` (filters subcategory selector; **never sent to API**)                  |
| Columns              | `Título`, `Descripción`, `Subcategoría`, `Categoría`, `Acciones`                  |
| Delete               | Soft delete (`status = DELETED`) + confirmation dialog                            |
| Sort                 | `category.name` → `subcategory.name` → `title` (ASC)                              |
| Reorder              | No                                                                                |
| Validation           | `title` min 1 / max 120, `description` min 1 / max 1000, `subcategoryId` required |
| Navigation blocker   | Yes — `useBlocker` + `UnsavedChangesDialog`                                       |
| Empty state          | `Aun no hay iniciativas registradas` + `Agregar fila`                             |
| Tests                | API integration tests focused on role/auth (401, 403) + validation negatives      |

## Files to create / modify

### Shared types — `packages/types/src/reductionPlanInitiatives/admin/`

Reuse `ReductionPlanInitiativeBaseSchema` (already defined at `packages/types/src/baseSchemas/reductionPlanInitiative.ts`) and `ReductionPlanInitiativeStatusSchema`.

- `getAllInitiatives/response.ts` — `z.array(ReductionPlanInitiativeBaseSchema.pick({ id, title, description, subcategoryId, createdAt, updatedAt }).extend({ subcategory: SubcategoryBaseSchema.pick({ id, name }).extend({ category: CategoryBaseSchema.pick({ id, name }) }) }))`
- `createInitiative/request.ts` — body: `{ title: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(1000), subcategoryId: IdSchema }` (no dimension fields)
- `createInitiative/response.ts` — `{ id }` only (client invalidates the list on success; refetch delivers the full row)
- `updateInitiative/request.ts` — params: `{ id }`; body: partial of create body, excluding `status` (rejected explicitly)
- `updateInitiative/response.ts` — same shape as list item
- `deleteInitiative/request.ts` — params: `{ id }`
- `deleteInitiative/response.ts` — `{ id }`
- Export from `packages/types/src/index.ts`

### Backend — `apps/api/src/features/reductionPlanInitiatives/admin/`

Four action folders, each `{ route.ts, handler.ts, service.ts, integration.test.ts }`, modeled on `apps/api/src/features/organizations/admin/getAllOrganizations/`:

- `getAllInitiatives/` — Prisma query filtering `status = ACTIVE` by default, include `subcategory.category`; order by `subcategory.category.name`, `subcategory.name`, `title` (ASC).
- `createInitiative/` — validate `subcategoryId` exists (404 if not); insert with `status = ACTIVE`, `createdById = req.user.id`, `dimensionValue1Id/2Id = null`.
- `updateInitiative/` — load row (404 if missing), reject if body contains `status`, persist patch, set `updatedAt` / `updatedById`.
- `deleteInitiative/` — set `status = DELETED`, `updatedAt`, `updatedById`; idempotent on already-DELETED.

Route registration: `apps/api/src/routes/api/admin/reduction-plan/index.ts` following the `apps/api/src/routes/api/admin/requests/index.ts` template:

```ts
fastify.addHook("onRequest", fastify.requireAuth);
fastify.addHook(
  "preHandler",
  fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])
);
```

Register this index in the admin router barrel.

Integration tests — per endpoint, focused cases:

- `401` unauthenticated
- `403` for `SystemRole.USER`
- `200` for ADMIN + SUPERADMIN (minimal happy path so the negatives are meaningful)
- Validation: empty `title`, `title > 120`, `description > 1000`, missing `subcategoryId`, invalid `subcategoryId` (404), `status` present in update body (400)

### Frontend — query hooks

Create `apps/web/src/api/query/maintainer/useInitiatives.ts` with `useInitiatives`, `useCreateInitiative`, `useUpdateInitiative`, `useDeleteInitiative`. Mirror the pattern used in `apps/web/src/api/query/maintainer/useCategories.ts`. Success handlers invalidate the list query and fire a success snackbar.

Reuse `apps/web/src/api/query/maintainer/useSubcategories.ts` for the Subcategoría / Categoría selectors — its response already includes `category.{id,name}`, so no new category hook is needed. Derive categories client-side via `uniqBy(subcategories, 'category.id')`.

### Frontend — maintainer screen

Folder: `apps/web/src/screens/Maintainer/screens/InitiativesMaintainerScreen/`

- `InitiativesMaintainerScreen.tsx` — top-level component. Composes:
  - `MaintainerPageHeader` with title `Plan de reducción` and trailing `Agregar fila` button
  - `StylizedDataGrid` (from `apps/web/src/components/StylizedDataGrid.tsx`) with `getRowHeight={() => "auto"}` so long descriptions wrap
  - Empty-state text `Aun no hay iniciativas registradas` shown when list is empty
  - `DeleteInitiativeDialog` (confirmation) wired to `useDeleteInitiative`
  - `UnsavedChangesDialog` wired to `useBlocker({ shouldBlockFn: () => form.formState.isDirty, enableBeforeUnload: form.formState.isDirty, withResolver: true })` — mirror `CategoriesMaintainerScreen.tsx:432–437` and `:609–613`
  - Auto-save on stop-edit-row: if `isRowDirty`, call `updateMutation.mutateAsync` (existing row) or `createMutation.mutateAsync` (new row with no id yet). Mirror `handleStopEditRow` from `CategoriesMaintainerScreen.tsx:133–221`.

- `useInitiativesForm.ts` — React Hook Form + Zod. Schema: `z.object({ initiatives: z.array(InitiativeRowSchema) })` with per-row refinements for `title` min 1 / max 120, `description` min 1 / max 1000, `subcategoryId` required. Row type carries an extra UI-only `categoryId` used only for filtering the subcategory selector; this field is stripped before the mutation payload is built.

- `useInitiativeColumns.tsx` — DataGrid columns:
  - `Título` — `EditableTextCell` (`apps/web/src/screens/Maintainer/components/cells/EditableTextCell.tsx`)
  - `Descripción` — `EditableTextCell` multiline variant (cell renders full text, row uses auto height)
  - `Categoría` — inline Autocomplete cell populated from derived categories; on change, clear the row's `subcategoryId`
  - `Subcategoría` — Autocomplete cell (searchable) filtered by the row's `categoryId`; disabled until a category is selected. Follow the pattern in `FreeSoloAutocompleteCell.tsx` (use non-free-solo MUI Autocomplete since options are a fixed list)
  - `Acciones` — delete icon button → opens `DeleteInitiativeDialog`

- `DeleteInitiativeDialog.tsx` — confirmation copy: "Los planes de reducción existentes seguirán mostrando el nombre de la iniciativa. ¿Eliminar?".

### Frontend — route + navigation

- Create `apps/web/src/routes/admin/reduction-plan.tsx`:
  ```ts
  createFileRoute("/admin/reduction-plan")({
    beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
      redirectTo: Routes.ADMIN_DASHBOARD,
    }),
    component: InitiativesMaintainerScreen,
  });
  ```
- Add `Routes.ADMIN_REDUCTION_PLAN = "/admin/reduction-plan"` constant wherever `Routes` is defined (grep for `Routes.ADMIN_` to locate).
- Add sidebar entry in `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` `SIDEBAR_DEFS` (top-level):
  ```ts
  {
    text: "Plan de reducción",
    icon: <ListAltOutlined /> /* or similar from MUI */,
    path: Routes.ADMIN_REDUCTION_PLAN,
    requiredRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
  }
  ```

## Constants & enums — no magic strings

- Roles: `SystemRole.ADMIN`, `SystemRole.SUPERADMIN` from `@repo/types` (frontend) / `@repo/database` (backend).
- Status: `ReductionPlanInitiativeStatus.ACTIVE` / `.DELETED` from `@repo/database` (Prisma enum).
- Route constant: `Routes.ADMIN_REDUCTION_PLAN`.
- Validation limits: expose `TITLE_MAX_LENGTH = 120` and `DESCRIPTION_MAX_LENGTH = 1000` from the shared schema file so frontend form + backend schema share them.

## Files to read while implementing (reuse patterns, do not re-invent)

- `apps/web/src/screens/Maintainer/screens/CategoriesMaintainerScreen.tsx` — overall screen composition, `handleStopEditRow`, `useBlocker`
- `apps/web/src/screens/Maintainer/hooks/useCategoriesForm.ts` + `useCategoryColumns.tsx` — form schema, column hook shape
- `apps/web/src/components/StylizedDataGrid.tsx` — grid defaults
- `apps/web/src/screens/Maintainer/components/cells/EditableTextCell.tsx`
- `apps/web/src/screens/Maintainer/components/cells/FreeSoloAutocompleteCell.tsx`
- `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`
- `apps/web/src/api/query/maintainer/useSubcategories.ts`
- `apps/web/src/api/query/maintainer/useCategories.ts` (hook shape reference)
- `apps/web/src/utils/requireRole.ts`
- `apps/api/src/routes/api/admin/requests/index.ts` — admin router template
- `apps/api/src/features/organizations/admin/getAllOrganizations/` — feature folder template
- `packages/types/src/baseSchemas/reductionPlanInitiative.ts` — base Zod schemas to extend
- Prisma schema `ReductionPlanInitiative` model (lines 1066–1085) + `ReductionPlanInitiativeStatus` enum (line 1059)

## Verification

1. `pnpm type-check` — passes across `@repo/types`, `api`, `web`.
2. `pnpm lint` — clean.
3. `pnpm test --filter=api -- /reductionPlanInitiatives --coverage=false` — all new integration tests pass.
4. Start dev server, sign in as ADMIN:
   - `/admin/reduction-plan` loads; sidebar entry visible.
   - `Agregar fila` appends empty row; pick Categoría → Subcategoría selector unlocks; enter Título + Descripción; blur → row auto-saves (snackbar + list refetch).
   - Edit existing row's Categoría → Subcategoría clears; re-pick → auto-save.
   - Delete row → confirmation dialog → row disappears; DB row still present with `status = DELETED`.
   - Attempt to navigate away with a dirty row → `UnsavedChangesDialog` blocks.
5. Sign in as SUPERADMIN → parity with ADMIN.
6. Sign in as USER → `/admin/reduction-plan` redirects away; GET endpoint returns 403.
7. Unauthenticated GET → 401.
8. Validation: submit empty title → snackbar error; >120-char title / >1000-char description rejected both client and server.
9. Confirm suggested-initiatives consumer (reduction-plan UI from #244) still filters by `status = ACTIVE` so DELETED rows don't leak into user-facing lists.

# Plan: Initiatives Maintainer — Web

## Context

Frontend for `/admin/reduction-plan`: lightweight inline-editable maintainer for the `ReductionPlanInitiative` catalog, reachable by `ADMIN` and `SUPERADMIN`. Follows the existing maintainer design (MaintainerPageHeader + StylizedDataGrid + inline cell edits with auto-save on blur) used by `CategoriesMaintainerScreen`.

Depends on:

- Shared Zod contracts from `database.plan.md` (`@repo/types` `reductionPlanInitiatives/admin/*`).
- API endpoints from `api.plan.md` under `/api/admin/reduction-plan`.

Scope trimmed — no dimension values, no row reorder, no include-deleted toggle in UI.

## Scope summary (web-relevant)

| Area                   | Decision                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| Route                  | `/admin/reduction-plan`                                          |
| Sidebar label          | `Plan de reducción`                                              |
| Roles                  | `SystemRole.ADMIN`, `SystemRole.SUPERADMIN`                      |
| Edit mode              | Inline cell edit, auto-save on blur (Categories-style)           |
| Columns                | `Título`, `Descripción`, `Subcategoría`, `Categoría`, `Acciones` |
| UI-only field          | `category` (filters subcategory selector; never sent to API)     |
| Delete                 | Soft delete — confirmation dialog                                |
| Navigation blocker     | Yes — `useBlocker` + `UnsavedChangesDialog`                      |
| Empty state            | `Aun no hay iniciativas registradas` + `Agregar fila`            |
| Include-deleted toggle | No (API supports it, UI does not wire it)                        |

## Query hooks — `apps/web/src/api/query/maintainer/`

Create `useInitiatives.ts` with:

- `useInitiatives` — GET list
- `useCreateInitiative`
- `useUpdateInitiative`
- `useDeleteInitiative`

Mirror `useCategories.ts`. Success handlers invalidate the list query and fire a success snackbar.

Reuse existing `useSubcategories.ts` for both Subcategoría and Categoría selectors — its response already includes `category.{id,name}`, so no new category hook is needed. Derive categories client-side via `uniqBy(subcategories, 'category.id')`.

## Maintainer screen — `apps/web/src/screens/Maintainer/screens/InitiativesMaintainerScreen/`

Files:

- `InitiativesMaintainerScreen.tsx` — top-level component composing:
  - `MaintainerPageHeader` with title `Plan de reducción` + trailing `Agregar fila` button
  - `StylizedDataGrid` (`apps/web/src/components/StylizedDataGrid.tsx`) with `getRowHeight={() => "auto"}` so long descriptions wrap
  - Empty-state text `Aun no hay iniciativas registradas` when list is empty
  - `DeleteInitiativeDialog` wired to `useDeleteInitiative`
  - `UnsavedChangesDialog` wired to:
    ```ts
    useBlocker({
      shouldBlockFn: () => form.formState.isDirty,
      enableBeforeUnload: form.formState.isDirty,
      withResolver: true,
    });
    ```
    Mirror `CategoriesMaintainerScreen.tsx:432–437` and `:609–613`.
  - Auto-save on stop-edit-row: if `isRowDirty`, call `updateMutation.mutateAsync` (existing) or `createMutation.mutateAsync` (new row without id). Mirror `handleStopEditRow` from `CategoriesMaintainerScreen.tsx:133–221`.

- `useInitiativesForm.ts` — React Hook Form + Zod.
  - Schema: `z.object({ initiatives: z.array(InitiativeRowSchema) })`.
  - Per-row refinements: `title` min 1 / max 120, `description` min 1 / max 1000, `subcategoryId` required.
  - Row type carries an extra UI-only `categoryId` used only to filter the subcategory selector; **strip it** before building the mutation payload.

- `useInitiativeColumns.tsx` — DataGrid columns:
  - `Título` — `EditableTextCell` (`apps/web/src/screens/Maintainer/components/cells/EditableTextCell.tsx`)
  - `Descripción` — `EditableTextCell` multiline variant; cell renders full text; row uses auto height
  - `Categoría` — inline Autocomplete populated from derived categories; on change, clear the row's `subcategoryId`
  - `Subcategoría` — Autocomplete (searchable) filtered by the row's `categoryId`; disabled until a category is selected. Follow `FreeSoloAutocompleteCell.tsx` but use non-free-solo MUI Autocomplete (fixed options list).
  - `Acciones` — delete icon → opens `DeleteInitiativeDialog`

- `DeleteInitiativeDialog.tsx` — confirmation copy:
  `"Los planes de reducción existentes seguirán mostrando el nombre de la iniciativa. ¿Eliminar?"`.

## Route + navigation

- Create `apps/web/src/routes/admin/reduction-plan.tsx`:

  ```ts
  createFileRoute("/admin/reduction-plan")({
    beforeLoad: requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], {
      redirectTo: Routes.ADMIN_DASHBOARD,
    }),
    component: InitiativesMaintainerScreen,
  });
  ```

- Add `Routes.ADMIN_REDUCTION_PLAN = "/admin/reduction-plan"` where `Routes` is defined (grep for `Routes.ADMIN_`).

- Add sidebar entry in `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` `SIDEBAR_DEFS` (top-level):
  ```ts
  {
    text: "Plan de reducción",
    icon: <ListAltOutlined /> /* or similar from MUI */,
    path: Routes.ADMIN_REDUCTION_PLAN,
    requiredRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
  }
  ```

## Constants & enums

- `SystemRole.ADMIN`, `SystemRole.SUPERADMIN` — `@repo/types`
- `Routes.ADMIN_REDUCTION_PLAN`
- `TITLE_MAX_LENGTH`, `DESCRIPTION_MAX_LENGTH` — reused from `@repo/types` (see `database.plan.md`)

## Files to read while implementing

- `apps/web/src/screens/Maintainer/screens/CategoriesMaintainerScreen.tsx` — overall composition, `handleStopEditRow`, `useBlocker`
- `apps/web/src/screens/Maintainer/hooks/useCategoriesForm.ts` + `useCategoryColumns.tsx` — form schema + column hook shape
- `apps/web/src/components/StylizedDataGrid.tsx` — grid defaults
- `apps/web/src/screens/Maintainer/components/cells/EditableTextCell.tsx`
- `apps/web/src/screens/Maintainer/components/cells/FreeSoloAutocompleteCell.tsx`
- `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`
- `apps/web/src/api/query/maintainer/useSubcategories.ts`
- `apps/web/src/api/query/maintainer/useCategories.ts` — hook shape reference
- `apps/web/src/utils/requireRole.ts`

## Verification

1. `pnpm type-check` — passes across `web`.
2. `pnpm lint` — clean.
3. Start dev server, sign in as ADMIN:
   - `/admin/reduction-plan` loads; sidebar entry visible.
   - `Agregar fila` appends empty row; pick Categoría → Subcategoría selector unlocks; enter Título + Descripción; blur → row auto-saves (snackbar + list refetch).
   - Edit existing row's Categoría → Subcategoría clears; re-pick → auto-save.
   - Delete row → confirmation dialog → row disappears; DB row still present with `status = DELETED`.
   - Navigate away with a dirty row → `UnsavedChangesDialog` blocks.
4. Sign in as SUPERADMIN → parity with ADMIN.
5. Sign in as USER → `/admin/reduction-plan` redirects away.
6. Validation: empty title snackbar; >120 title / >1000 description rejected client-side (and server-side — covered in `api.plan.md`).
7. Suggested-initiatives consumer (reduction-plan UI from #244) still filters by `status = ACTIVE` so DELETED rows don't leak into user-facing lists.

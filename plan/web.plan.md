# Plan: Reduction Projects — Web

Parent: [main_plan.md](./main_plan.md)

## Context

Implement two screens for the Reduction Projects feature:

1. **List screen** (`/app/reduction-projects`) — shows all reduction projects with filters, edit/delete actions
2. **Form screen** (`/app/reduction-projects/:id`) — single-page form using "create immediately then edit" pattern

Depends on **API** ([api.plan.md](./api.plan.md)) and **types** from [database.plan.md](./database.plan.md).

---

## Phase 4 — Frontend: List Screen

### Files

**Route**: `apps/web/src/routes/app/reduction-projects.tsx` (already exists — update to render `ReductionProjectsScreen`)

**`apps/web/src/screens/ReductionProjects/ReductionProjectsScreen.tsx`**

- State: `selectedOrganizationId` ("all"), `selectedYear` ("all"), `newProjectDialogOpen`
- Hooks: `useReductionProjects(organizationId, year)`, `useReductionProjectsMinimal()`, `useMyOrganizations()`
- Table columns: Nombre Proyecto, Implementación, Primer Reporte, Reducción tCO₂e, Años reportados, Acciones
- Header controls: "INGRESAR PROYECTO DE REDUCCIÓN" button + Organización selector (with "Todas") + Año selector (with "Todos")
- Renders `NewReductionProjectDialog` on button click

**`apps/web/src/screens/ReductionProjects/components/ReductionProjectActionsCell.tsx`**

- Edit icon → navigate to `/app/reduction-projects/:id`
- Delete icon → opens `DeleteReductionProjectDialog`

**`apps/web/src/screens/ReductionProjects/components/Dialogs/DeleteReductionProjectDialog.tsx`**

- Confirmation dialog, calls `useDeleteReductionProject()`

**`apps/web/src/components/dialogs/NewReductionProjectDialog/NewReductionProjectDialog.tsx`**

- Simpler than `NewInventoryDialog`: just org selector (no usage mode)
- On confirm: `useCreateReductionProject()` → navigate to `/app/reduction-projects/:id`

### API hooks (new, under `apps/web/src/api/`)

- `query/reductionProjects/useReductionProjects.ts`
- `query/reductionProjects/useReductionProjectsMinimal.ts`
- `mutation/reductionProjects/useCreateReductionProject.ts`
- `mutation/reductionProjects/useDeleteReductionProject.ts`

---

## Phase 5 — Frontend: Form Screen

### Files

**New TanStack route**: `apps/web/src/routes/app/reduction-projects.$id.tsx`

**`apps/web/src/screens/ReductionProject/layout/ReductionProjectLayout.tsx`**

- Clone of `CarbonInventoryLayout.tsx` — same structure (header with back arrow + title, footer with left/right buttons)
- Header title: "Proyecto de Reducción"

**`apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx`**
Main form screen using `ReductionProjectLayout`:

Footer buttons:

- Left: "VOLVER" → navigate back to list
- Right (conditional):
  - If editable + not objected: "GUARDAR BORRADOR" (save) + "POSTULAR SELLO REDUCCIÓN" (opens submit dialog)
  - If objected (REVIEWED status): "POSTULAR SELLO REDUCCIÓN" only (no draft save)

Form sections:

**Section 1 — Identificación**

- Row: `Nombre del proyecto` (TextField) + `Organización` (OrganizationSelector, reuse existing component)
- Row: `Inventario de carbono` (Select, verified inventories from `/carbon-inventories/minimal?statuses=VERIFICATION_APPROVED`) + _(empty or another field)_
- Row: `Fecha de implementación` (TextField type date) + `Descripción del proyecto` (TextField multiline)
- Row: `Subcategoría de fuente de emisión` (Select) + `Potencial de calentamiento global (PCG)` (Select) + Capinauta hint

**Section 2 — GEI Considerados**

- Table with checkboxes for: CO2, CH4, Hidrofluorocarbonados, Perfluorocarbonados, SF6, NF3

**Section 3 — Reportado en otra iniciativa**

- Checkbox: "Este proyecto se ha reportado en otra iniciativa..."
- Conditional TextField: "Descripción de la otra iniciativa o NDC"

**Section 4 — Reporte de reducciones/remociones**

- Info banner: "Todos los valores que se ingresan deben ser en Valor Absoluto"
- Editable rows (add/remove year): Año de reducción (Select year), Escenario base (tCO₂e), Escenario proyecto (tCO₂e), Reducción (computed = base - proyecto, read-only)

**`apps/web/src/screens/ReductionProject/components/SubmitReductionProjectDialog.tsx`**

- File upload modal (reuse `FormFileUpload` component pattern from `VerifyConfirmationDialog`)
- On confirm: `useRequestReductionProjectVerification()` with file UUIDs

### API hooks (new)

- `query/reductionProjects/useReductionProject.ts` (by id)
- `mutation/reductionProjects/useUpdateReductionProject.ts` — include `fileUuids` when saving a project whose display status is not `DRAFT` (same rule as organization PATCH + `usePreUploadSubmissionFiles`)
- `mutation/reductionProjects/useRequestReductionProjectVerification.ts` (or equivalent) — first-time verification with `fileUuids`

### Reused hooks

- `useMyOrganizations()` — org selector
- `useCarbonInventoriesMinimalData()` — with `statuses=VERIFICATION_APPROVED` param
- `usePreUploadSubmissionFiles()` — file upload before submission

---

## Key Design Decisions (relevant to web)

2. **No draft save for objected projects**: When `displayStatus === REVIEWED`, only submission button shown (no "GUARDAR BORRADOR")
3. **Subcategory selector**: Reuse existing subcategories from the emission data endpoint or minimal API — align with whatever the API exposes
4. **Year dropdown in list**: Derived from `useReductionProjectsMinimal()` — distinct non-null `year` values on projects
5. **PATCH + files when not DRAFT**: Any save that happens while display status ≠ `DRAFT` must send pre-uploaded `fileUuids` together with the project fields on `useUpdateReductionProject` (see [api.plan.md](./api.plan.md)); mirrors app organization update behavior.

---

## Verification

1. `pnpm type-check` — no TypeScript errors
2. `pnpm lint` — no lint errors
3. Manual flow test:
   - Navigate to `/app/reduction-projects` → see list with org/year filters
   - Click "INGRESAR PROYECTO DE REDUCCIÓN" → dialog opens → select org → project created → redirected to form
   - Fill form fields (including year / scenarios) → "GUARDAR BORRADOR" saves
   - Click "POSTULAR SELLO REDUCCIÓN" → modal with file upload → confirm → status changes
   - Back in list → edit icon navigates to form, delete icon removes project

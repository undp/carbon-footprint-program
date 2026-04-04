# Plan: Reduction Projects List + Form

## Context

Implement two new screens for the Reduction Projects feature:

1. **List screen** (`/app/reduction-projects`) — shows all reduction projects with filters, edit/delete actions
2. **Form screen** (`/app/reduction-projects/:id`) — single-page form using "create immediately then edit" pattern

There is no `reduction_project` table yet; it must be created. The user will run migrations manually.

Each project stores a single reporting year and scenario metrics (`year`, `baselineScenario`, `projectScenario`) on the same row—no child report-line table.

---

## Phase 1 — Database Schema (`packages/database/src/prisma/schema.prisma`)

### New models to add

```prisma
model ReductionProject {
  id                           BigInt                            @id @default(autoincrement())
  name                         String?
  organizationId               BigInt?                           @map("organization_id")
  carbonInventoryId            BigInt?                           @map("carbon_inventory_id")
  implementationDate           DateTime?                         @map("implementation_date")
  description                  String?
  subcategoryId                BigInt?                           @map("subcategory_id")
  gwpUsed                      String?                           @map("gwp_used")
  useNationalGwp               Boolean                           @default(false) @map("use_national_gwp")
  consideredGei                String[]                          @map("considered_gei")
  reportedElsewhere            Boolean                           @default(false) @map("reported_elsewhere")
  reportedElsewhereDescription String?                           @map("reported_elsewhere_description")
  year                         Int?
  baselineScenario             Decimal?                          @map("baseline_scenario") @db.Decimal(15, 4)
  projectScenario              Decimal?                          @map("project_scenario") @db.Decimal(15, 4)
  status                       InventoryStatus                   @default(ACTIVE)
  createdAt                    DateTime                          @default(now()) @map("created_at")
  updatedAt                    DateTime?                         @updatedAt @map("updated_at")
  createdById                  BigInt?                           @map("created_by_id")
  updatedById                  BigInt?                           @map("updated_by_id")

  organization     Organization?                          @relation(fields: [organizationId], references: [id])
  carbonInventory  CarbonInventory?                       @relation("reduction_project_carbon_inventory", fields: [carbonInventoryId], references: [id])
  subcategory      Subcategory?                           @relation("reduction_project_subcategory", fields: [subcategoryId], references: [id])
  creator          User?                                  @relation("reduction_project_created_by", fields: [createdById], references: [id])
  updater          User?                                  @relation("reduction_project_updated_by", fields: [updatedById], references: [id])
  submission       SubmissionSubjectReductionProject?

  @@map("reduction_projects")
}

model SubmissionSubjectReductionProject {
  subjectId          BigInt             @id @map("subject_id")
  reductionProjectId BigInt             @unique @map("reduction_project_id")

  subject            SubmissionSubject  @relation(fields: [subjectId], references: [id])
  reductionProject   ReductionProject   @relation(fields: [reductionProjectId], references: [id])

  @@map("submission_subject_reduction_projects")
}
```

### Enum changes

- Add `REDUCTION_PROJECT_VERIFICATION` to `SubmissionType` enum
- Add inverse relations to existing models:
  - `Organization`: add `reductionProjects ReductionProject[]`
  - `CarbonInventory`: add `reductionProjects ReductionProject[] @relation("reduction_project_carbon_inventory")`
  - `Subcategory`: add `reductionProjects ReductionProject[] @relation("reduction_project_subcategory")`
  - `SubmissionSubject`: add `reductionProject SubmissionSubjectReductionProject?`
  - `User`: add two relations for createdBy/updatedBy

> **User action required**: run `pnpm --filter=database db:migrate` after schema changes

---

## Phase 2 — Types (`packages/types/src/`)

### New files

**`packages/types/src/baseSchemas/reductionProject.ts`**

- `ReductionProjectBaseSchema` — mirrors the prisma model fields (id, name, organizationId, carbonInventoryId, implementationDate, description, subcategoryId, gwpUsed, useNationalGwp, consideredGei, reportedElsewhere, reportedElsewhereDescription, year, baselineScenario, projectScenario, status, createdAt, updatedAt, createdById, updatedById)

**`packages/types/src/reductionProjects/schemas.ts`**

- `ReductionProjectDisplayStatusEnum` = { DRAFT, SUBMITTED, REVIEWED, REJECTED, APPROVED, DELETED }
- `ReductionProjectDisplayStatusSchema`
- Request/response schemas for all endpoints

Export from `packages/types/src/index.ts`.

---

## Phase 3 — Backend API

### Route registration

**`apps/api/src/routes/api/reduction-projects/index.ts`** (new file)
Register all routes under `/reduction-projects` with `fastify.requireAuth`.

**`apps/api/src/routes/api/index.ts`** — register the new reduction-projects router.

### Feature directories under `apps/api/src/features/reductionProjects/`

#### `helpers.ts`

- `calculateReductionProjectDisplayStatus(project)` — derives display status from submissions (same pattern as `calculateDisplayStatus` in carbonInventories/helpers.ts)
- `createReductionProjectSubmission(tx, reductionProjectId, type, createdById)` — same pattern as `createCarbonInventorySubmission`
- `reductionProjectWithSubmissionsMinimalSelect` — prisma select fragment

#### Endpoints

| Endpoint                                            | Feature Dir                            | Notes                                                                                                             |
| --------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `POST /reduction-projects`                          | `createReductionProject/`              | Creates blank record, returns `{id}`                                                                              |
| `GET /reduction-projects`                           | `getAllReductionProjects/`             | Filters: organizationId, year (project `year` column)                                                             |
| `GET /reduction-projects/minimal`                   | `getReductionProjectsMinimal/`         | Returns `{id, name, organizationId, status, year}` for year filter                                                |
| `GET /reduction-projects/:id`                       | `getReductionProjectById/`             | Full form data (includes `year`, `baselineScenario`, `projectScenario`)                                           |
| `PATCH /reduction-projects/:id`                     | `updateReductionProject/`              | Partial fields + optional `fileUuids`; API requires `fileUuids` when not DRAFT (see [api.plan.md](./api.plan.md)) |
| `DELETE /reduction-projects/:id`                    | `deleteReductionProject/`              | Sets status = DELETED                                                                                             |
| `POST /reduction-projects/:id/request-verification` | `requestReductionProjectVerification/` | First verification; pre-uploaded `fileUuids`                                                                      |

#### `getAllReductionProjects` response shape

```ts
{
  id, name, organizationId, organizationName,
  implementationDate,
  firstReportDate,      // createdAt (or omit if redundant with list needs)
  totalReduction,       // baselineScenario - projectScenario when both set
  reportedYears,        // 1 if year is set, else 0 (UI parity with former “line count”)
  status,               // computed display status
}[]
```

#### `getReductionProjectById` response shape

Full project fields (single object; metrics on the same record).

#### `updateReductionProject` body

Partial project fields; optional `fileUuids`. When display status is not `DRAFT`, API requires `fileUuids` in the same request (files on submissions). See [api.plan.md](./api.plan.md).

#### Reused endpoints (no changes needed)

- `GET /carbon-inventories/minimal?statuses=VERIFICATION_APPROVED` — for the carbon inventory selector in the form
- `GET /app/organizations/me` — for organization selector

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
- On confirm: `useRequestReductionProjectVerification()` (or equivalent) with file UUIDs

### API hooks (new)

- `query/reductionProjects/useReductionProject.ts` (by id)
- `mutation/reductionProjects/useUpdateReductionProject.ts`
- `mutation/reductionProjects/useRequestReductionProjectVerification.ts`

### Reused hooks

- `useMyOrganizations()` — org selector
- `useCarbonInventoriesMinimalData()` — with `statuses=VERIFICATION_APPROVED` param
- `usePreUploadSubmissionFiles()` — file upload before submission

---

## Key Design Decisions

1. **Status derivation**: Same pattern as CarbonInventory — `ACTIVE/DELETED` stored on record, display status computed from submissions
2. **No draft save for objected projects**: When `displayStatus === REVIEWED`, only submission button shown (no "GUARDAR BORRADOR")
3. **Subcategory selector**: Reuse existing subcategories from the emission data endpoint or create a minimal subcategories endpoint — to be determined by what's available (`/subcategories` or fetch from categories endpoint)
4. **Year dropdown in list**: Derived from `useReductionProjectsMinimal()` — distinct non-null `year` values on projects

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

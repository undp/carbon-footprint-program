# Plan: Reduction Projects — Database & Types

Parent: [main_plan.md](./main_plan.md)

## Context

The Reduction Projects feature needs a new `reduction_project` table and shared types. There is no `reduction_project` table yet; it must be created. The user will run migrations manually.

Each project has at most one reporting row of metrics (year, baseline vs project scenario); those columns live on `reduction_project` itself—no child table.

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
  consideredGei                String[]                         @map("considered_gei")
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

## Key Design Decisions (relevant to this slice)

1. **Status derivation**: Same pattern as CarbonInventory — `ACTIVE/DELETED` stored on record, display status computed from submissions (types expose display enums; API computes values).
2. **Single metrics row**: Year and scenario columns are on `reduction_project`. Updates are ordinary field updates on the project (no line sync / `CREATE/UPDATE/DELETE` array).

---

## Verification

1. `pnpm --filter=database db:migrate` (user runs migration after schema change)
2. `pnpm type-check` — no TypeScript errors in `database` and `types` packages
3. `pnpm lint` — no lint errors

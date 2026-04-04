# Plan: Reduction Projects — API

Parent: [main_plan.md](./main_plan.md)

## Context

Backend for Reduction Projects: routes under `/reduction-projects`, feature handlers mirroring carbon inventory patterns (display status, submissions). Scenario metrics live on the project row (no separate report-line sync). Depends on completed **database** and **types** work ([database.plan.md](./database.plan.md)).

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

| Endpoint                                            | Feature Dir                            | Notes                                                                                       |
| --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST /reduction-projects`                          | `createReductionProject/`              | Creates blank record, returns `{id}`                                                        |
| `GET /reduction-projects`                           | `getAllReductionProjects/`             | Filters: organizationId, year (project `year` column)                                       |
| `GET /reduction-projects/minimal`                   | `getReductionProjectsMinimal/`         | Returns `{id, name, organizationId, status, year}` for year filter                          |
| `GET /reduction-projects/:id`                       | `getReductionProjectById/`             | Full form data (includes `year`, `baselineScenario`, `projectScenario`)                     |
| `PATCH /reduction-projects/:id`                     | `updateReductionProject/`              | Partial project fields + optional `fileUuids` (see below)                                   |
| `DELETE /reduction-projects/:id`                    | `deleteReductionProject/`              | Sets status = DELETED                                                                       |
| `POST /reduction-projects/:id/request-verification` | `requestReductionProjectVerification/` | First-time verification request; pre-uploaded `fileUuids`, `createSubmissionRequestHandler` |

#### `getAllReductionProjects` response shape

```ts
{
  id, name, organizationId, organizationName,
  implementationDate,
  firstReportDate,      // createdAt (or omit if redundant with list needs)
  totalReduction,       // baselineScenario - projectScenario when both set
  reportedYears,        // 1 if year is set, else 0
  status,               // computed display status
}[]
```

#### `getReductionProjectById` response shape

Full project fields (single object; metrics on the same record).

#### `updateReductionProject` body

- Partial project fields, including optional `year`, `baselineScenario`, `projectScenario` (no nested sync payload).
- Optional `fileUuids: string[]` (pre-uploaded file UUIDs), same shape as [`updateOrganization` body schema](../packages/types/src/organizations/app/updateOrganization/schemas.ts).
- **Behavior (enforce in service, not only in Zod):** When display status is **DRAFT**, clients may PATCH repeatedly with **only** project fields; files are not required. When display status is **not DRAFT** (e.g. user is fixing data after `REVIEWED` / resubmitting), the client must send **both** the full intended project payload and **`fileUuids`** in a single PATCH, because attachments belong to **submissions**, not to the `reduction_project` row — mirroring organization PATCH when the org is not in draft.

#### Reused endpoints (no changes needed)

- `GET /carbon-inventories/minimal?statuses=VERIFICATION_APPROVED` — for the carbon inventory selector in the form
- `GET /app/organizations/me` — for organization selector

---

## Key Design Decisions (relevant to API)

1. **Status derivation**: Same pattern as CarbonInventory — `ACTIVE/DELETED` stored on record, display status computed from submissions
2. **Metrics on project**: `year`, `baselineScenario`, and `projectScenario` are columns on `reduction_project`; PATCH updates them like any other field
3. **Subcategory selector**: Reuse existing subcategories from the emission data endpoint or create a minimal subcategories endpoint — to be determined by what's available (`/subcategories` or fetch from categories endpoint)
4. **PATCH + files (non-draft)**: Optional `fileUuids` on `UpdateReductionProjectRequestSchema`; when display status ≠ `DRAFT`, the API must require non-empty `fileUuids` and attach them to the relevant submission flow — same product rule as `PATCH` organization update when not in draft.

---

## Verification

1. `pnpm type-check` — no TypeScript errors
2. `pnpm lint` — no lint errors
3. Exercise endpoints manually or via integration tests once web client is wired

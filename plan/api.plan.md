# Plan: Reduction Projects — API

Parent: [main_plan.md](./main_plan.md)

## Context

Backend for Reduction Projects: routes under `/reduction-projects`, feature handlers mirroring carbon inventory patterns (display status, submissions). Scenario metrics live on the project row (no separate report-line sync). Depends on completed **database** and **types** work ([database.plan.md](./database.plan.md)).

---

## Phase 3 — Backend API

### Route registration

The API app loads routes via **Fastify autoload** from [`apps/api/src/routes/`](../apps/api/src/routes/) (see [`apps/api/src/app.ts`](../apps/api/src/app.ts)). Adding a new domain folder is enough; you do **not** manually register routers in [`apps/api/src/routes/api/index.ts`](../apps/api/src/routes/api/index.ts) (that file only exports `StandardRouteSignature` and a minimal `/` handler).

**`apps/api/src/routes/api/reduction-projects/index.ts`** (new file)

- Default export function `reductionProjectsRoutes(fastify)` mirroring [`apps/api/src/routes/api/carbon-inventories/index.ts`](../apps/api/src/routes/api/carbon-inventories/index.ts): `onRequest` → `fastify.requireAuth`, `preHandler` → `fastify.requireRoles([...])` (exact role set: see **Open questions** below), then register each feature `*Route(fastify)` for this domain.
- Autoload maps this file to **`/api/reduction-projects`** (same prefix pattern as `/api/carbon-inventories`).

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

## Reference patterns

Use these files as concrete templates while implementing reduction projects.

| Area                                                                                       | Reference files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain route barrel (auth, roles, registering feature routes)                              | [`apps/api/src/routes/api/carbon-inventories/index.ts`](../apps/api/src/routes/api/carbon-inventories/index.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Per-endpoint wiring (`route.ts`, Zod schemas from `@repo/types`, `StandardRouteSignature`) | e.g. [`apps/api/src/features/carbonInventories/createCarbonInventory/route.ts`](../apps/api/src/features/carbonInventories/createCarbonInventory/route.ts); type import from [`apps/api/src/routes/api/index.ts`](../apps/api/src/routes/api/index.ts)                                                                                                                                                                                                                                                                                                                               |
| Display status, submissions, Prisma select fragment                                        | [`apps/api/src/features/carbonInventories/helpers.ts`](../apps/api/src/features/carbonInventories/helpers.ts) — `calculateDisplayStatus`, `createCarbonInventorySubmission`, `carbonInventoryWithSubmissionsMinimalSelect`                                                                                                                                                                                                                                                                                                                                                           |
| Request verification + pre-uploaded files                                                  | [`apps/api/src/features/carbonInventories/requestVerification/handler.ts`](../apps/api/src/features/carbonInventories/requestVerification/handler.ts), [`apps/api/src/features/carbonInventories/requestVerification/service.ts`](../apps/api/src/features/carbonInventories/requestVerification/service.ts), [`apps/api/src/handlerFactory/createSubmissionRequestHandler.ts`](../apps/api/src/handlerFactory/createSubmissionRequestHandler.ts), [`apps/api/src/features/files/helpers/linkFilesToSubmission.ts`](../apps/api/src/features/files/helpers/linkFilesToSubmission.ts) |
| Another `createSubmissionRequestHandler` usage                                             | [`apps/api/src/features/organizations/app/requestOrganizationAccreditation/handler.ts`](../apps/api/src/features/organizations/app/requestOrganizationAccreditation/handler.ts)                                                                                                                                                                                                                                                                                                                                                                                                      |
| PATCH + optional `fileUuids`, draft vs non-draft                                           | [`apps/api/src/features/organizations/app/updateOrganization/service.ts`](../apps/api/src/features/organizations/app/updateOrganization/service.ts) (state machine, `FileAttachmentsRequiredError` / `FileAttachmentsNotSupportedError`), [`packages/types/src/organizations/app/updateOrganization/schemas.ts`](../packages/types/src/organizations/app/updateOrganization/schemas.ts)                                                                                                                                                                                              |
| List query filters + access control                                                        | [`apps/api/src/features/carbonInventories/getAllCarbonInventories/service.ts`](../apps/api/src/features/carbonInventories/getAllCarbonInventories/service.ts) (`organizationId`, `year`, creator vs org membership `OR`)                                                                                                                                                                                                                                                                                                                                                             |
| Minimal list route                                                                         | [`apps/api/src/features/carbonInventories/getCarbonInventoriesMinimal/route.ts`](../apps/api/src/features/carbonInventories/getCarbonInventoriesMinimal/route.ts) plus handler/service in the same feature folder                                                                                                                                                                                                                                                                                                                                                                    |
| Soft delete                                                                                | [`apps/api/src/features/carbonInventories/deleteCarbonInventory/service.ts`](../apps/api/src/features/carbonInventories/deleteCarbonInventory/service.ts) (and handler as needed)                                                                                                                                                                                                                                                                                                                                                                                                    |
| Shared `@repo/types` for this feature                                                      | [`packages/types/src/reductionProjects/`](../packages/types/src/reductionProjects/) (per-operation `schemas.ts` / `types.ts`, [`index.ts`](../packages/types/src/reductionProjects/index.ts))                                                                                                                                                                                                                                                                                                                                                                                        |

---

## Open questions

Decide these before or while implementing (product / architecture) (ask the user directly).

1. **Auth and roles** — Mirror carbon inventories (`requireAuth` + `requireRoles` with `USER`, `ADMIN`, `SUPERADMIN` in the domain router), or different rules? Should any reduction-project routes use `public: true` plus org-role checks like some carbon-inventory calculator routes?
2. **Access control** — Should `getAll`, `getById`, `PATCH`, and `DELETE` use the same “creator **or** active org membership” pattern as [`getAllCarbonInventoriesService`](../apps/api/src/features/carbonInventories/getAllCarbonInventories/service.ts)?
3. **`getAllReductionProjects` list fields** — Confirm `firstReportDate` vs `createdAt` and naming; whether `totalReduction` is `null` when either scenario metric is missing; whether `reportedYears` as 0/1 matches final product semantics.
4. **Subcategory picker** — [`apps/api/src/routes/api/subcategories/index.ts`](../apps/api/src/routes/api/subcategories/index.ts) is **ADMIN/SUPERADMIN** only. For normal app users, reuse another read-only emission/subcategory API or add a dedicated minimal endpoint; document the chosen path.
5. **PATCH when display status ≠ DRAFT** — Which submission should receive `fileUuids` (new pending submission, latest rejected, same flow as verification request, etc.)? Align with organization PATCH or the closest inventory pattern once `SubmissionSubjectReductionProject` behavior is fixed in code.
6. **`POST …/request-verification`** — Reuse `canSubmitToVerification` and the same org-accreditation checks as [`requestVerificationService`](../apps/api/src/features/carbonInventories/requestVerification/service.ts), or define different eligibility for reduction projects?
7. **DELETE** — Confirm soft-delete only, idempotency, and whether a non-`ACTIVE` project returns 404 vs 400.

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

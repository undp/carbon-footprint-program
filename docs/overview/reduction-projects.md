# Reduction Projects Workflow

This document describes how organizations record greenhouse-gas mitigation projects on the platform, submit them for external verification, and receive recognition. The flow runs parallel to the [carbon inventory submission workflow](./submission-workflow.md), with a smaller set of phases.

---

## Concept

A **reduction project** represents a discrete action an organization has taken (or plans to take) to reduce its emissions — for example, replacing diesel generators with solar panels, retrofitting a building for energy efficiency, or substituting process inputs. Each project quantifies:

- A **baseline scenario** — the emissions that would have occurred without the project.
- A **project scenario** — the emissions with the project in place.
- The **reduction** — the difference, in tCO₂e.

Projects are scoped to a subcategory (the same taxonomy used in carbon inventories) and reference the carbon inventory against which the reduction is claimed.

---

## Prerequisites

A reduction project can only be created when:

1. The organization already has a **verified carbon inventory** for the reference year — the linked inventory must have an **approved** `CARBON_INVENTORY_VERIFICATION` submission.
2. The user has `CONTRIBUTOR` or `ADMIN` role in the organization.

Validation is enforced in `apps/api/src/features/reductionProjects/helpers.ts` before any project is accepted.

---

## Data Model

### `ReductionProject`

```prisma
model ReductionProject {
  id                  BigInt
  organizationId      BigInt
  carbonInventoryId   BigInt                 // the verified inventory this reduction applies against
  subcategoryId       BigInt                 // scope of the reduction
  name                String
  description         String
  implementationDate  DateTime
  year                Int
  baselineScenario    Decimal  (15, 4)       // baseline emissions (tCO₂e)
  projectScenario     Decimal  (15, 4)       // project emissions (tCO₂e)
  gwpUsed             String                 // GWP source (e.g., "AR5", "AR6")
  consideredGei       String                 // gases considered (CO₂, CH₄, N₂O, …)
  reportedElsewhere   Boolean                // whether the reduction is also reported under another program
  status              ReductionProjectStatus // ACTIVE | DELETED
  createdById         BigInt
  updatedById         BigInt?
}
```

Reduction = `baselineScenario − projectScenario`.

### `ReductionPlanInitiative`

A **library of suggested measures** per subcategory. Initiatives are reference data (seeded or admin-curated) that help organizations plan which reduction projects to pursue. They are not linked to any specific `ReductionProject`.

```prisma
model ReductionPlanInitiative {
  subcategoryId       BigInt
  dimensionValue1Id   BigInt?
  dimensionValue2Id   BigInt?
  title               String
  description         String
  status              InitiativeStatus // ACTIVE | DELETED
}
```

Initiatives are enumerated in the UI when a user is browsing reduction opportunities for a given subcategory.

---

## Display Status

Unlike carbon inventories, reduction projects have a **simpler status model**. The display status is derived from the project's latest submission:

| Status | Meaning |
|---|---|
| `DRAFT` | No submission yet, or latest submission has not been filed |
| `SUBMITTED` | A `PENDING` verification submission exists |
| `REVIEWED` | Admin left observations; project is editable again |
| `APPROVED` | Submission approved; badge issued |
| `REJECTED` | Submission rejected |
| `DELETED` | Soft-deleted (via `status = DELETED` on the record) |

Derivation logic: `calculateReductionProjectDisplayStatus()` in `apps/api/src/features/reductionProjects/helpers.ts`.

---

## Submission Type

Only one submission type applies to reduction projects:

- `REDUCTION_PROJECT_VERIFICATION` — external verification of the reduction claim

There is **no self-declaration phase** and no separate "calculation" submission (in contrast to carbon inventories). The project is filled out, submitted directly for verification, and reviewed once.

---

## API Endpoints

All routes require authentication. Authorization is enforced per-organization.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| `POST` | `/reduction-projects/` | `CONTRIBUTOR`, `ADMIN` | Create a new project (also creates a `PENDING` submission) |
| `GET` | `/reduction-projects/` | all org members | List projects (newest first) |
| `GET` | `/reduction-projects/minimal` | all org members | Minimal projection for selectors |
| `GET` | `/reduction-projects/:id` | `VIEWER`, `CONTRIBUTOR`, `ADMIN` | Fetch full project |
| `PATCH` | `/reduction-projects/:id` | `CONTRIBUTOR`, `ADMIN` | Update project (only when editable); creates a new submission if re-submitting after `REVIEWED` |

There is **no `DELETE` endpoint**. Projects are soft-deleted by setting `status = DELETED` (currently through admin action only).

---

## Workflow Phases

```
Phase 1 — Prerequisite
  ────────────────────
  Organization has a CARBON_INVENTORY_VERIFICATION submission in APPROVED state
  for the reference year.

Phase 2 — Creation
  ─────────────────
  Organization member
    POST /reduction-projects/
      → Creates ReductionProject (status: ACTIVE)
      → Creates SubmissionSubjectReductionProject
      → Creates Submission (type: REDUCTION_PROJECT_VERIFICATION, status: PENDING)
      → Display status: SUBMITTED

Phase 3 — Admin Review
  ────────────────────
  Admin opens the submission from /admin/requests, then:
    ├── Approve
    │     POST /admin/submissions/:id/approve
    │       → Submission.status = APPROVED
    │       → Badge assigned
    │       → Display status: APPROVED
    │
    ├── Review (observations)
    │     POST /admin/submissions/:id/review
    │       → Submission.status = REVIEWED
    │       → reviewComments stored
    │       → Display status: REVIEWED
    │       (Project becomes editable again)
    │
    └── Reject
          POST /admin/submissions/:id/reject
            → Submission.status = REJECTED
            → Display status: REJECTED

Phase 4 — Re-submission (only after REVIEWED)
  ──────────────────────────────────────────
  Member edits the project:
    PATCH /reduction-projects/:id
      → Creates a NEW Submission (type: REDUCTION_PROJECT_VERIFICATION, PENDING)
      → Display status: SUBMITTED again
```

Rejected projects (`REJECTED`) are not re-submittable; a new project must be created if the organization wishes to try again.

---

## Editability and Re-submission Rules

Two helpers in `@repo/utils/src/reductionProject.ts` enforce the state machine:

| Helper | Returns `true` when |
|---|---|
| `isReductionProjectEditable(status)` | status is `DRAFT` or `REVIEWED` |
| `canRequestReductionProjectVerification(status)` | status is `DRAFT` |

The UI uses these to decide which buttons to show; the API re-checks them before accepting any mutation.

---

## Badges

On approval, a `REDUCTION_PROJECT_VERIFICATION` badge is assigned to the submission. The badge is surfaced:
- On the organization's public traceability record
- In the reduction project list view
- In the transparency portal (if the project is from an accredited organization)

---

## Exports

A reduction project can be exported to Excel (single-sheet `.xlsx`) with all its fields via the frontend hook `useDownloadReductionProject` (`apps/web/src/screens/ReductionProjects/hooks/`). See [Data Export and Reporting](../development/data-export.md).

The full **reduction plan** — all suggested initiatives across all subcategories — can also be exported as a multi-sheet Excel workbook (one sheet per category).

---

## Relationship to Carbon Inventories

```
Organization
  └─ CarbonInventory  (approved CARBON_INVENTORY_VERIFICATION required)
       └─ ReductionProject  (scoped to a subcategory of this inventory)
            └─ SubmissionSubjectReductionProject
                 └─ Submission (REDUCTION_PROJECT_VERIFICATION)
                      └─ Badge on approval
```

A reduction project always links back to a specific verified inventory; the inventory is the trustworthy baseline against which the reduction claim is evaluated.

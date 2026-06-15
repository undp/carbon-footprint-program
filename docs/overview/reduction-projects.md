# Reduction Projects Workflow

This document describes how organizations record greenhouse-gas mitigation projects on the platform, submit them for external verification, and receive recognition. The flow mirrors the [carbon inventory submission workflow](./submission-workflow.md): a project is first **saved as a DRAFT**, edited freely, and then **submitted for verification as a separate, deliberate action**. A reduction project is, in effect, "a carbon inventory of a single submission" — its display status is **derived from its submissions**, exactly like a carbon inventory.

---

## Concept

A **reduction project** represents a discrete action an organization has taken (or plans to take) to reduce its emissions — for example, replacing diesel generators with solar panels, retrofitting a building for energy efficiency, or substituting process inputs. Each project quantifies:

- A **baseline scenario** — the emissions that would have occurred without the project.
- A **project scenario** — the emissions with the project in place.
- The **reduction** — the difference, in tCO₂e.

Projects are scoped to a subcategory (the same taxonomy used in carbon inventories) and reference the carbon inventory against which the reduction is claimed.

---

## Prerequisites

Prerequisites are split across the two lifecycle actions (mirroring carbon inventory):

**To create or edit a DRAFT** (light referential check):

1. The user has `CONTRIBUTOR` or `ADMIN` role in the organization.
2. The linked carbon inventory exists, is `ACTIVE`, and belongs to that organization.

**To submit for verification** (full prerequisites), additionally:

3. The organization is `ACTIVE` and **accredited**.
4. The linked inventory has an **approved** `CARBON_INVENTORY_VERIFICATION` submission.

Both checks live in `apps/api/src/features/reductionProjects/helpers.ts`: `validateReductionProjectReferences` (light, used by create/update) and `validateReductionProjectPrerequisites` (full, used by request-verification). Enforcing accreditation only at submit lets users draft projects while their organization is still completing accreditation.

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

The display status is **derived from the project's verification submissions** (it is never persisted on the record). The persisted `ReductionProjectStatus` column only tracks lifecycle (`ACTIVE` / `DELETED`):

| Status      | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `DRAFT`     | **No** `REDUCTION_PROJECT_VERIFICATION` submission exists yet |
| `SUBMITTED` | A `PENDING` verification submission exists                    |
| `REVIEWED`  | Admin left observations; project is editable again            |
| `APPROVED`  | Submission approved; badge issued                             |
| `REJECTED`  | Submission rejected                                           |
| `DELETED`   | Soft-deleted (via `status = DELETED` on the record)           |

Because a freshly created project has no submission, it is a `DRAFT` — and therefore **invisible to every submission-driven consumer** (admin requests queue, recognitions, dashboard KPIs, transparency, badges), all of which key off submissions. No DB-view change was needed for DRAFTs: `submission_summary_view` builds reduction-project rows via `INNER JOIN ... FROM submission`, so a submission-less DRAFT simply never appears.

Derivation logic: `calculateReductionProjectDisplayStatus()` in `apps/api/src/features/reductionProjects/helpers.ts`.

---

## Submission Type

Only one submission type applies to reduction projects:

- `REDUCTION_PROJECT_VERIFICATION` — external verification of the reduction claim

There is **no self-declaration phase** and no separate "calculation" submission (in contrast to carbon inventories). The project is filled out as a DRAFT, then submitted for verification through the dedicated `POST /:id/request-verification` action (which uploads the supporting files and creates the submission). Creating or editing a project never creates a submission on its own.

---

## API Endpoints

All routes require authentication. Authorization is enforced per-organization.

| Method   | Path                                           | Roles                            | Purpose                                                                             |
| -------- | ---------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `POST`   | `/reduction-projects/`                         | `CONTRIBUTOR`, `ADMIN`           | Create a new project **as a DRAFT** (no files, no submission)                       |
| `GET`    | `/reduction-projects/`                         | all org members                  | List projects (newest first)                                                        |
| `GET`    | `/reduction-projects/minimal`                  | all org members                  | Minimal projection for selectors                                                    |
| `GET`    | `/reduction-projects/:id`                      | `VIEWER`, `CONTRIBUTOR`, `ADMIN` | Fetch full project                                                                  |
| `PATCH`  | `/reduction-projects/:id`                      | `CONTRIBUTOR`, `ADMIN`           | Update project fields (only when `DRAFT` or `REVIEWED`); never creates a submission |
| `POST`   | `/reduction-projects/:id/request-verification` | `CONTRIBUTOR`, `ADMIN`           | Submit for verification: requires ≥1 file, creates a `PENDING` submission           |
| `DELETE` | `/reduction-projects/:id`                      | `CONTRIBUTOR`, `ADMIN`           | Soft-delete (`status = DELETED`); allowed only while `DRAFT`                        |

`request-verification` and `delete` are guarded by the `reductionProject` domain access check (membership + role). `delete` returns `422 REDUCTION_PROJECT_NOT_DELETABLE` for any non-DRAFT project.

---

## Workflow Phases

```
Phase 1 — Creation (DRAFT)
  ────────────────────────
  Organization member fills the form and saves:
    POST /reduction-projects/
      → Creates ReductionProject (status: ACTIVE), light referential check only
      → NO submission, NO files
      → Display status: DRAFT   (invisible to admins/recognitions)

Phase 2 — Draft editing (optional, repeatable)
  ────────────────────────────────────────────
  PATCH /reduction-projects/:id   (while DRAFT)
      → Writes fields only; still DRAFT

Phase 3 — Submission (deliberate, from the list)
  ──────────────────────────────────────────────
  Member clicks "Postular a reconocimiento de verificación":
    POST /reduction-projects/:id/request-verification  { fileUuids: [...] }
      → Full prerequisites checked (org accredited + CI approved verification)
      → Creates SubmissionSubjectReductionProject (first time)
      → Creates Submission (REDUCTION_PROJECT_VERIFICATION, PENDING) + links files
      → Display status: SUBMITTED   (now visible in /admin/requests)

Phase 4 — Admin Review
  ────────────────────
  Admin opens the submission from /admin/requests, then:
    ├── Approve  → Submission APPROVED → Badge assigned → Display status: APPROVED
    ├── Review   → Submission REVIEWED → observations stored → Display status: REVIEWED
    │               (Project becomes editable again)
    └── Reject   → Submission REJECTED → Display status: REJECTED

Phase 5 — Re-submission (only after REVIEWED)
  ──────────────────────────────────────────
  Member edits the project (PATCH, fields only), then submits again:
    POST /reduction-projects/:id/request-verification
      → Creates a NEW Submission (REDUCTION_PROJECT_VERIFICATION, PENDING)
      → Display status: SUBMITTED again
```

Editing and submitting are now **separate steps**: `PATCH` saves field changes, the list "Postular" action creates the new submission. Rejected projects (`REJECTED`) are not re-submittable; a new project must be created if the organization wishes to try again. A `DRAFT` can be deleted (`DELETE /reduction-projects/:id`); once submitted it can no longer be deleted.

---

## Editability and Re-submission Rules

Helpers in `@repo/utils/src/reductionProject.ts` enforce the state machine (parity with the carbon inventory helpers):

| Helper                                            | Returns `true` when                            |
| ------------------------------------------------- | ---------------------------------------------- |
| `isReductionProjectEditable(status)`              | status is `DRAFT` or `REVIEWED`                |
| `canSubmitReductionProjectToVerification(status)` | status is `DRAFT` or `REVIEWED`                |
| `isReductionProjectDeletable(status)`             | status is `DRAFT`                              |
| `canRequestReductionProjectVerification(status)`  | status is `DRAFT` (first-time submission only) |

The UI uses these to decide which buttons to show/enable; the API re-checks them before accepting any mutation.

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
  └─ CarbonInventory  (approved CARBON_INVENTORY_VERIFICATION required at submit)
       └─ ReductionProject  (scoped to a subcategory of this inventory)
            │   • DRAFT: just the project row — no SubmissionSubject, no Submission
            └─ SubmissionSubjectReductionProject   (created on first request-verification)
                 └─ Submission (REDUCTION_PROJECT_VERIFICATION)
                      └─ Badge on approval
```

A reduction project always links back to a specific verified inventory; the inventory is the trustworthy baseline against which the reduction claim is evaluated. While a DRAFT, the project exists only as a `ReductionProject` row — the submission graph is created lazily by the first `request-verification` call.

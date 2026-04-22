# End-to-End Submission Workflow

This document describes the core traceability workflow: how an organization prepares a carbon inventory, submits it for external review, and receives recognition. The sequence covers every actor, status transition, and database record involved.

---

## Actors

| Actor                                          | Role                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Organization member** (CONTRIBUTOR or ADMIN) | Creates and submits inventories                                                                                           |
| **Platform admin** (ADMIN system role)         | Reviews, approves, or rejects submissions                                                                                 |
| **External validator**                         | Certified third party who validates the carbon inventory outside this platform; their conclusion is recorded by the admin |

The platform is a **traceability and transparency system** — it records the outcome of validation by external certified third parties. The platform itself does not perform emissions calculations or certify organizations.

---

## Submission Status Reference

Every submission record (`Submission` table) has one of these statuses:

| Status                   | Meaning                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `PENDING`                | Submitted; awaiting admin review                                         |
| `APPROVED`               | Manually approved by admin                                               |
| `APPROVED_AUTOMATICALLY` | Auto-approved by the system (self-declaration with `AUTOMATIC` behavior) |
| `REVIEWED`               | Admin left observations; awaiting user response                          |
| `REJECTED`               | Admin rejected the submission                                            |

---

## Carbon Inventory Display Status

Each carbon inventory has a computed display status derived from its associated submissions. Possible values, in progression order:

```
DRAFT
  └─ SELF_DECLARED
       └─ SUBMITTED_TO_CALCULATION
            ├─ CALCULATION_APPROVED
            │    └─ SUBMITTED_TO_VERIFICATION
            │         └─ VERIFICATION_APPROVED
            ├─ CALCULATION_REVIEWED   (awaiting user response)
            └─ CALCULATION_REJECTED

                    (under SUBMITTED_TO_VERIFICATION)
                    ├─ VERIFICATION_REVIEWED
                    └─ VERIFICATION_REJECTED
```

---

## Full Workflow Sequence

### Phase 1 — Inventory Creation

```
Organization member
  │
  ├─ POST /api/carbon-inventories          → Creates CarbonInventory (status: DRAFT)
  ├─ POST /api/carbon-inventories/:id/lines → Adds emission lines per subcategory
  └─ (edits lines as needed)
```

The inventory remains in `DRAFT` until the member decides to act on it. Draft inventories are editable and deletable.

---

### Phase 2 — Self-Declaration (Optional)

Self-declaration records that the organization has reviewed its own inventory.

```
Organization member
  └─ POST /api/carbon-inventories/:id/self-declare
       │
       ├─ Sets isSelfDeclared = true, selfDeclaredAt, selfDeclaredBy
       │
       └─ Reads CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR system parameter:
            │
            ├─ AUTOMATIC → Creates Submission (type: CALCULATION, status: APPROVED_AUTOMATICALLY)
            │              Assigns active badge (if any)
            │              Display status: SELF_DECLARED
            │
            └─ MANUAL or HIDDEN → No submission created
                                  Display status: SELF_DECLARED (no badge)
```

When `AUTOMATIC`, the submission is immediately approved — no admin action needed. This path is intended for countries where self-reported figures are accepted as-is.

---

### Phase 3 — Calculation Submission

The member submits the inventory for admin review of the calculation methodology.

```
Organization member
  └─ POST /api/carbon-inventories/:id/request-calculation
       │
       └─ Creates Submission (type: CARBON_INVENTORY_CALCULATION, status: PENDING)
          Creates SubmissionSubject (links to the CarbonInventory)
          Display status: SUBMITTED_TO_CALCULATION
```

---

### Phase 4 — Admin Review of Calculation

```
Admin
  ├─ GET /api/admin/requests           → Lists all PENDING submissions
  │
  ├─ Option A: Approve
  │    POST /api/admin/submissions/:id/approve
  │         → Updates Submission.status = APPROVED
  │         → Assigns badge (recognition file attached by admin)
  │         → Display status: CALCULATION_APPROVED
  │
  ├─ Option B: Leave observations
  │    POST /api/admin/submissions/:id/review
  │         → Updates Submission.status = REVIEWED
  │         → Stores reviewComments
  │         → Display status: CALCULATION_REVIEWED
  │         (Member can now update and re-submit)
  │
  └─ Option C: Reject
       POST /api/admin/submissions/:id/reject
            → Updates Submission.status = REJECTED
            → Stores reviewComments
            → Display status: CALCULATION_REJECTED
```

---

### Phase 5 — Verification Submission

After a CALCULATION_APPROVED inventory, the member may request external verification.

```
Organization member
  └─ POST /api/carbon-inventories/:id/request-verification
       │
       ├─ Attaches supporting files (evidence, third-party report, etc.)
       └─ Creates Submission (type: CARBON_INVENTORY_VERIFICATION, status: PENDING)
          Display status: SUBMITTED_TO_VERIFICATION
```

The attached files represent the evidence provided to — or the report received from — the external validator.

---

### Phase 6 — Admin Review of Verification

Same flow as Phase 4 but for the verification submission:

```
Admin
  ├─ Approve → VERIFICATION_APPROVED (+ verification badge)
  ├─ Review  → VERIFICATION_REVIEWED (observations returned to member)
  └─ Reject  → VERIFICATION_REJECTED
```

---

### Phase 7 — Organization Accreditation (Parallel Track)

Organization data (legal name, sector, tax ID, representative) follows a separate but parallel submission track:

```
Organization member
  └─ PATCH /api/organizations/:id/data    → Updates OrganizationData
       └─ Triggers SubmissionSubjectOrganizationData submission
            └─ POST to request accreditation
                 → Creates Submission (type: ORGANIZATION_ACCREDITATION, status: PENDING)
```

Admin approves/reviews/rejects the same way. Accreditation is independent of inventory status.

---

## Reduction Project Track

Reduction projects follow the same submission/approval pattern:

```
POST /api/reduction-projects/:id/request-verification
     → Creates Submission (type: REDUCTION_PROJECT_VERIFICATION, status: PENDING)
```

Admin approval flow is identical.

---

## Submission Timeline (History View)

Each submission subject exposes a history endpoint that returns a chronological list of events:

```
GET /api/submissions/carbon-inventory/:id/history
GET /api/submissions/organization/:id/history
GET /api/submissions/reduction-project/:id/history
```

Event types in a timeline:

| Event                    | Triggered by                                |
| ------------------------ | ------------------------------------------- |
| `SELF_DECLARATION`       | Member self-declares                        |
| `POSTULATION`            | Member submits (creates PENDING submission) |
| `ON_REVIEW`              | Synthetic marker; added after POSTULATION   |
| `APPROVED`               | Admin approves                              |
| `APPROVED_AUTOMATICALLY` | System auto-approves                        |
| `REVIEWED`               | Admin leaves observations                   |
| `REJECTED`               | Admin rejects                               |

---

## Data Model Relationships

```
Organization
  └─ CarbonInventory (one per reporting period / branch)
       ├─ CarbonInventoryLine[] (subcategory entries)
       │    └─ CarbonInventoryLineInput[] (measured quantities)
       │         └─ CarbonInventoryLineFactor[] (applied emission factors)
       │              └─ CarbonInventoryLineResult (calculated tCO₂e)
       │
       └─ SubmissionSubjectCarbonInventory
            └─ SubmissionSubject
                 └─ Submission[] (one per submission event)
                      ├─ status: SubmissionStatus
                      ├─ type: SubmissionType
                      ├─ reviewComments
                      ├─ reviewer: User
                      └─ files: SubmissionFile[] (attachments / recognition files)
                           └─ badge: Badge (awarded on approval)
```

---

## Badge Issuance

Badges are pre-configured records in the `Badge` table (image + type). When a submission is approved:

1. The admin selects the recognition files to attach.
2. The API links the active badge for that submission type to `Submission.badgeId`.
3. The badge becomes visible in the organization's traceability record.

Badge types align with submission types: `CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, `ORGANIZATION_ACCREDITATION`, etc.

---

## Key System Parameter

The `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` system parameter determines whether self-declarations in Phase 2 auto-approve or require manual review. See [System Parameters Reference](../development/system-parameters.md) for the full parameter list.

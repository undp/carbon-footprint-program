# Neutralization Plan (Planned Feature)

`NEUTRALIZATION_PLAN_VERIFICATION` is a submission type and badge type defined in the platform's data model and UI layer, but the core feature — creating and managing neutralization plans — is **not yet implemented**. This document records what is already in place and what remains to be built.

---

## Intent

A neutralization plan represents an organization's commitment to offset or neutralize its residual greenhouse gas emissions — for example, through carbon credits, reforestation projects, or other compensation mechanisms. Like reduction projects, neutralization plans would be submitted to external certifiers and, on approval, result in a recognition badge.

---

## What Is Already Implemented

The platform was designed with neutralization plans in mind. The display and type infrastructure is complete:

### Enum definitions

Both `SubmissionType` and `BadgeType` include the `NEUTRALIZATION_PLAN_VERIFICATION` variant:

```prisma
enum SubmissionType {
  ORGANIZATION_ACCREDITATION
  CARBON_INVENTORY_CALCULATION
  CARBON_INVENTORY_VERIFICATION
  REDUCTION_PROJECT_VERIFICATION
  NEUTRALIZATION_PLAN_VERIFICATION    // ← defined
}

enum BadgeType {
  ORGANIZATION_ACCREDITATION
  CARBON_INVENTORY_CALCULATION
  CARBON_INVENTORY_VERIFICATION
  REDUCTION_PROJECT_VERIFICATION
  NEUTRALIZATION_PLAN_VERIFICATION    // ← defined
}
```

### Frontend badge rendering

The badge is fully rendered in the UI if the organization holds an approved `NEUTRALIZATION_PLAN_VERIFICATION` submission:

| Component | File | What it renders |
|---|---|---|
| Recognition badge | `apps/web/src/screens/Transparency/components/RecognitionBadge.tsx` | Badge with letter `N`, color `#89D5CB` |
| Badge row | `apps/web/src/components/CarbonInventoryBadgesCard/BadgeRow.tsx` | Label "Huella Latam - Plan de Neutralización" |
| Submissions utility | `apps/web/src/utils/submissions.ts` | UI label "Reconocimiento de neutralización" |
| Recognitions config | `apps/web/src/screens/Recognitions/constants.tsx` | Badge type mapping and color definitions |

### Type system

`NEUTRALIZATION_PLAN_VERIFICATION` is included in `RECOGNITION_SUBMISSION_TYPES` (in `packages/types/src/carbonInventories/types.ts`), which means:
- It counts toward transparency portal inclusion criteria.
- The admin KPI schema (`getRequestsKpis`) already accounts for it in its type×status cross-tabulation.
- Badge sort order in `getCarbonInventoryBadges` places it at rank 4.

---

## What Is Not Implemented

| Missing piece | Details |
|---|---|
| `NeutralizationPlan` database model | No Prisma model; no table in the schema |
| `SubmissionSubjectNeutralizationPlan` | No junction table linking a submission subject to a neutralization plan (unlike `SubmissionSubjectReductionProject`) |
| API feature folder | No `apps/api/src/features/neutralizationPlans/` directory |
| API routes | No endpoints to create, read, update, or delete neutralization plans |
| Web screens | No creation or management UI (unlike `apps/web/src/screens/ReductionPlan/`) |

---

## What Needs to Be Built

To implement neutralization plans, the following work is required:

### 1. Data model

Add a `NeutralizationPlan` model to the Prisma schema (similar in structure to `ReductionProject`):

```prisma
model NeutralizationPlan {
  id                BigInt
  organizationId    BigInt
  carbonInventoryId BigInt   // the verified inventory this plan applies against
  name              String
  description       String
  year              Int
  // ... domain-specific fields (offset mechanism, tCO₂e, certifier, etc.)
  status            NeutralizationPlanStatus
}
```

Add a `SubmissionSubjectNeutralizationPlan` junction table to link submissions to plans, following the same pattern as `SubmissionSubjectReductionProject`.

### 2. API

Create a feature folder at `apps/api/src/features/neutralizationPlans/` with the standard route/handler/service structure. At minimum:
- `POST /neutralization-plans/` — create a plan and its initial submission
- `GET /neutralization-plans/` — list plans for an organization
- `GET /neutralization-plans/:id` — fetch a plan
- `PATCH /neutralization-plans/:id` — update and re-submit after a `REVIEWED` decision

Authorization should mirror reduction projects: require `CONTRIBUTOR` or `ADMIN` org role, and a prerequisite of a verified carbon inventory for the reference year.

### 3. Web UI

Create screens under `apps/web/src/screens/NeutralizationPlans/` mirroring the structure of `apps/web/src/screens/ReductionProjects/`.

### 4. Submission workflow integration

No changes to the submission approval/review/rejection flow are needed — the existing admin handlers (`approveRequest`, `reviewSubmission`, `rejectRequest`) work for any `SubmissionType`.

The `SubmissionSummaryView` SQL will need to be extended with a fourth CTE joining through `SubmissionSubjectNeutralizationPlan` so that neutralization plan submissions appear in the admin queue.

---

## Transparency Portal Impact

When implemented and approved, a neutralization plan badge will appear in the transparency portal under the organization's recognitions. No change to the transparency endpoint is required — it already queries `RECOGNITION_SUBMISSION_TYPES` which includes this type.

# Submission Summary View

The `SubmissionSummaryView` is a PostgreSQL view that flattens the multi-table submission hierarchy into a single, queryable row per submission. It is the primary data source for the admin request queue and KPI dashboard.

---

## Purpose

The platform's submission model involves several levels of indirection:

```
Submission
  └── SubmissionSubject (polymorphic link)
        ├── SubmissionSubjectOrganizationData → OrganizationData → Organization
        ├── SubmissionSubjectCarbonInventory  → CarbonInventory  → Organization
        └── SubmissionSubjectReductionProject → ReductionProject → Organization
```

Querying across all three subject types for admin listing or aggregation requires joining multiple tables with different shapes. The `SubmissionSummaryView` performs these joins once, producing a uniform row per submission enriched with organization name, period, and subject IDs.

---

## Prisma Model

```prisma
view SubmissionSummaryView {
  submissionId        BigInt           @unique @map("submission_id")
  type                SubmissionType
  status              SubmissionStatus
  organizationId      BigInt           @map("organization_id")
  organizationName    String           @map("organization_name")
  period              Int?
  requestedAt         DateTime         @map("requested_at")
  carbonInventoryId   BigInt?          @map("carbon_inventory_id")
  reductionProjectId  BigInt?          @map("reduction_project_id")
  submission          Submission       @relation(fields: [submissionId], references: [id])

  @@map("submission_summary_view")
}
```

**Source:** `packages/database/src/prisma/schema.prisma`

---

## Fields

| Field                | Type               | Nullable | Description                                                                                                                                                                                                          |
| -------------------- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submissionId`       | `BigInt`           | No       | Primary key — unique per submission. Foreign key to `Submission.id`.                                                                                                                                                 |
| `type`               | `SubmissionType`   | No       | The submission type: `ORGANIZATION_ACCREDITATION`, `CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, or `REDUCTION_PROJECT_VERIFICATION`.                                                             |
| `status`             | `SubmissionStatus` | No       | Current status: `PENDING`, `APPROVED`, `APPROVED_AUTOMATICALLY`, `REVIEWED`, or `REJECTED`.                                                                                                                          |
| `organizationId`     | `BigInt`           | No       | The organization that owns the submission subject.                                                                                                                                                                   |
| `organizationName`   | `String`           | No       | Organization name, denormalized from `OrganizationSummaryView`.                                                                                                                                                      |
| `period`             | `Int`              | Yes      | The year relevant to the submission: the inventory year for carbon inventories and reduction projects, or the year the organization data was created for accreditation submissions. Null if the subject has no year. |
| `requestedAt`        | `DateTime`         | No       | The timestamp when the submission was created (i.e., when the organization submitted).                                                                                                                               |
| `carbonInventoryId`  | `BigInt`           | Yes      | ID of the linked `CarbonInventory` — populated only when `type` is `CARBON_INVENTORY_CALCULATION` or `CARBON_INVENTORY_VERIFICATION`. Null otherwise.                                                                |
| `reductionProjectId` | `BigInt`           | Yes      | ID of the linked `ReductionProject` — populated only when `type` is `REDUCTION_PROJECT_VERIFICATION`. Null otherwise.                                                                                                |

---

## Underlying SQL

The view is created in migration `20260415000000_add_submission_summary_view`. It uses a `UNION ALL` of three CTEs, one per subject type:

```sql
CREATE VIEW submission_summary_view AS
WITH
  -- Accreditation submissions (subject = OrganizationData)
  organization_data_submissions AS (
    SELECT
      s.id            AS submission_id,
      s.type,
      s.status,
      osv.id          AS organization_id,
      osv.name        AS organization_name,
      EXTRACT(YEAR FROM od.created_at)::int AS period,
      s.created_at    AS requested_at,
      NULL::bigint    AS carbon_inventory_id,
      NULL::bigint    AS reduction_project_id
    FROM submission s
    INNER JOIN submission_subject ss ON ss.submission_id = s.id
    INNER JOIN submission_subject_organization_data ssod ON ssod.submission_subject_id = ss.id
    INNER JOIN organization_data od ON od.id = ssod.organization_data_id
    INNER JOIN organization_summary_view osv ON osv.id = od.organization_id
  ),

  -- Carbon inventory submissions (Calculation and Verification)
  carbon_inventory_submissions AS (
    SELECT
      s.id            AS submission_id,
      s.type,
      s.status,
      osv.id          AS organization_id,
      osv.name        AS organization_name,
      ci.year         AS period,
      s.created_at    AS requested_at,
      ci.id           AS carbon_inventory_id,
      NULL::bigint    AS reduction_project_id
    FROM submission s
    INNER JOIN submission_subject ss ON ss.submission_id = s.id
    INNER JOIN submission_subject_carbon_inventory ssci ON ssci.submission_subject_id = ss.id
    INNER JOIN carbon_inventory ci ON ci.id = ssci.carbon_inventory_id
    INNER JOIN organization_summary_view osv ON osv.id = ci.organization_id
  ),

  -- Reduction project submissions
  reduction_project_submissions AS (
    SELECT
      s.id            AS submission_id,
      s.type,
      s.status,
      osv.id          AS organization_id,
      osv.name        AS organization_name,
      rp.year         AS period,
      s.created_at    AS requested_at,
      NULL::bigint    AS carbon_inventory_id,
      rp.id           AS reduction_project_id
    FROM submission s
    INNER JOIN submission_subject ss ON ss.submission_id = s.id
    INNER JOIN submission_subject_reduction_project ssrp ON ssrp.submission_subject_id = ss.id
    INNER JOIN reduction_project rp ON rp.id = ssrp.reduction_project_id
    INNER JOIN organization_summary_view osv ON osv.id = rp.organization_id
  )

SELECT * FROM organization_data_submissions
UNION ALL
SELECT * FROM carbon_inventory_submissions
UNION ALL
SELECT * FROM reduction_project_submissions;
```

---

## Queries That Use This View

### Admin request list — `getAllRequests`

**File:** `apps/api/src/features/requests/admin/getAllRequests/service.ts`

**Endpoint:** `GET /admin/requests`

```typescript
const submissions = await prismaClient.submissionSummaryView.findMany({
  where, // optional filters: status, type, organizationId, year
  orderBy: [{ requestedAt: "desc" }, { submissionId: "desc" }],
});
```

After querying, the service groups rows by their subject entity (organization, carbon inventory, or reduction project) and selects only the **most recent submission per group**. This means that if an organization has re-submitted after a `REVIEWED` decision, only the newest submission is surfaced in the queue.

The rows are mapped to the API response shape via `mapAdminSubmissionSummaryToResponse()` in `apps/api/src/features/requests/admin/mappers.ts`:

```typescript
export type SubmissionSummaryViewRow =
  Prisma.SubmissionSummaryViewGetPayload<object>;

export const mapAdminSubmissionSummaryToResponse = (
  submission: SubmissionSummaryViewRow
): GetAllAdminRequestsResponse[number] => ({
  id: submission.submissionId.toString(),
  organizationId: submission.organizationId.toString(),
  organizationName: submission.organizationName ?? "",
  carbonInventoryId: submission.carbonInventoryId?.toString() ?? null,
  reductionProjectId: submission.reductionProjectId?.toString() ?? null,
  type: submission.type,
  year: submission.period,
  status: submission.status,
  requestedAt: submission.requestedAt.toISOString(),
});
```

---

### Admin KPI counts — `getRequestsKpis`

**File:** `apps/api/src/features/requests/admin/getRequestsKpis/service.ts`

**Endpoint:** `GET /admin/requests/kpis`

```typescript
const submissionCounts = await prismaClient.submissionSummaryView.groupBy({
  by: ["type", "status"],
  _count: true,
});
```

This produces a cross-tabulation of all `(type, status)` combinations with their counts. The service builds the full matrix (filling in zeroes for missing combinations) and returns total counts and per-type breakdowns for the admin dashboard.

---

## Relationship to Other Views

| View                           | Relationship                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `OrganizationSummaryView`      | Joined inside `SubmissionSummaryView` to supply `organizationName` without touching the raw `Organization` table |
| `CarbonInventorySubtotalsView` | Independent view for emission aggregation; not used inside `SubmissionSummaryView`                               |

See [Organization Summary View](./organization-summary-view.md) for the companion view reference.

---

## Notes

- The view is **read-only**. All writes go through the `Submission`, `SubmissionSubject`, and subject-type tables via their respective feature services.
- There is **no caching** — every query hits the view, which hits the underlying tables live.
- Because the view uses `UNION ALL`, the query planner may not leverage indexes as efficiently as a direct table query. For the expected submission volumes (hundreds to low thousands per deployment), this is acceptable. If the admin queue becomes slow at scale, a materialized view with a scheduled refresh is the recommended remedy.
- The `submissionId` is `@unique` because each `Submission` row appears exactly once in the union — there is no fan-out.

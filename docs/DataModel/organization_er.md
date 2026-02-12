# Organization Data Model Proposal: ACTIVE/OUTDATED Pattern

## Executive Summary

This document proposes a refactoring of the organization and organization_data status model to eliminate redundant state management and establish a single source of truth for accreditation status. The proposal introduces an ACTIVE/OUTDATED status pattern that simplifies state management while maintaining data integrity and auditability.

## Current Problems

### Multiple Sources of Truth

The current system maintains three overlapping sources of truth for organization accreditation status:

1. **organization.status** (ACCREDITED, NOT_ACCREDITED, BLOCKED)
2. **organization_data.status** (DRAFT, SUBMITTED, COMPLETED, REJECTED, OUTDATED)
3. **submission.status** (PENDING, APPROVED, REJECTED)

This creates:

- **Maintenance burden**: Three places to update on status changes
- **Consistency risk**: States can fall out of sync
- **Complex business logic**: Must coordinate updates across tables
- **Query complexity**: Must check multiple tables to determine true state

### Redundant State Derivation

Current status values are derived from each other:

- `organization_data.status = COMPLETED` is derived from `submission.status = APPROVED`
- `organization_data.status = REJECTED` is derived from `submission.status = REJECTED`
- `organization.status = ACCREDITED` is derived from having a COMPLETED organization_data
- `organization_data.status = SUBMITTED` is redundant with the existence of a submission

### Timestamp Fragility

Using `created_at` or `approved_at` timestamps to determine "current" data:

- Vulnerable to clock skew
- Not semantically correct (creation time ≠ approval time)
- Requires complex ordering logic
- Hard to express intent in queries

---

## Proposed Solution

### Single Source of Truth

**Submission status is the only source of truth** for review outcomes. All other states are either:

1. Explicitly marked (ACTIVE/OUTDATED)
2. Derived from relationships (has submission?, submission status?)

### Organization Status: Simplified

```prisma
enum OrganizationStatus {
  ACTIVE    // Default state, can operate normally
  BLOCKED   // Administrative action, independent of accreditation

  @@map("organization_status")
}
```

**Accreditation status is derived**: An organization is "accredited" if it has an ACTIVE organization_data with an APPROVED submission.

### Organization Data Status: ACTIVE/OUTDATED

```prisma
enum OrganizationDataStatus {
  ACTIVE     // Current version (may be draft, under review, or approved)
  OUTDATED   // Superseded by a newer ACTIVE version

  @@map("organization_data_status")
}

model OrganizationData {
  id             BigInt                             @id @default(autoincrement())
  organizationId BigInt                             @map("organization_id")
  status         OrganizationDataStatus             @default(ACTIVE)

  // Organization fields
  legalName      String                             @map("legal_name")
  tradeName      String?                            @map("trade_name")
  taxId          String                             @map("tax_id")
  // ... other fields ...

  createdAt      DateTime                           @default(now()) @map("created_at")
  updatedAt      DateTime                           @default(now()) @updatedAt @map("updated_at")

  // Relationships
  organization   Organization                       @relation(fields: [organizationId], references: [id])
  submission     SubmissionSubjectOrganizationData?

  @@map("organization_data")
}
```

---

## State Definitions

### ACTIVE States (Derived from Submission Status)

An organization_data with `status = ACTIVE` can be in one of four substates:

| Substate             | Condition                                  | Description                                                    |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| **Draft**            | No submission exists                       | Being edited, not yet submitted                                |
| **Under Review**     | Latest submission is PENDING               | Submitted for admin review                                     |
| **Rejected**         | Latest submission is REJECTED, no APPROVED | Rejected. A new organization_data must be created to resubmit. |
| **Current Approved** | Has an APPROVED submission                 | Official, approved organization data                           |

### OUTDATED State

`status = OUTDATED` means:

- This organization_data was once ACTIVE
- A newer version has been approved
- Kept for historical/audit purposes
- Cannot be edited or resubmitted

---

## Database Constraints

### Uniqueness Constraints

Per organization, at any point in time:

#### 1. At Most One ACTIVE Draft

```sql
CREATE UNIQUE INDEX idx_org_data_one_active_draft
ON organization_data(organization_id)
WHERE status = 'ACTIVE'
  AND id NOT IN (
    SELECT organization_data_id
    FROM submission_subject_organization_data
  );
```

**Enforces**: Only one organization_data per organization can be ACTIVE without a submission (draft state).

#### 2. At Most One ACTIVE Under Review

```sql
-- Implemented via application logic + transaction
-- Ensures only one ACTIVE org_data has a PENDING submission
```

**Enforces**: Only one organization_data per organization can be ACTIVE and currently under review.

#### 3. At Most One ACTIVE Approved

```sql
-- Implemented via application logic + transaction
-- When a new submission is approved, all other ACTIVE org_data become OUTDATED
```

**Enforces**: Only one organization_data per organization can be ACTIVE with an approved submission.

### Referential Integrity

```prisma
model SubmissionSubjectOrganizationData {
  subjectId          BigInt            @id @map("subject_id")
  organizationDataId BigInt            @unique @map("organization_data_id")

  subject            SubmissionSubject @relation(fields: [subjectId], references: [id])
  organizationData   OrganizationData  @relation(fields: [organizationDataId], references: [id])

  @@map("submission_subject_organization_data")
}
```

**Each organization_data has at most ONE submission subject** (1:1 relationship).

**Each submission subject can have MULTIPLE submissions** (1:N relationship) - allowing resubmission after rejection.

---

## Detailed Lifecycle Flows

### Flow 1: First-Time Accreditation (Approved)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Organization Creation                                    │
├─────────────────────────────────────────────────────────────────┤
│ organization #1                                                  │
│   └─ status: ACTIVE                                             │
│                                                                  │
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: NULL                                           │
│                                                                  │
│ State: Draft                                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 2: User Submits Accreditation Request                      │
├─────────────────────────────────────────────────────────────────┤
│ organization #1                                                  │
│   └─ status: ACTIVE                                             │
│                                                                  │
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #1                         │
│                     └─ submission #1: PENDING                   │
│                                                                  │
│ State: Under Review                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Admin Approves                                          │
├─────────────────────────────────────────────────────────────────┤
│ organization #1                                                  │
│   └─ status: ACTIVE                                             │
│                                                                  │
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #1                         │
│                     └─ submission #1: APPROVED ✅               │
│                                                                  │
│ State: Current Approved                                         │
│ Derived: organization is "accredited"                           │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: First-Time Accreditation (Rejected, Then Approved)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1-2: Same as Flow 1                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Admin Rejects                                           │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE → OUTDATED (Marked OUTDATED on rejection)   │
│   └─ submission → submission_subject #1                         │
│                     └─ submission #1: REJECTED ❌               │
│                                                                  │
│ State: Outdated Rejected                                        │
│ Note: organization_data #1 is now read-only and historical.     │
│ Note: REJECTED data is marked OUTDATED by API logic.            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 4: User Creates New Version and Submits                    │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: OUTDATED                                           │
│   └─ submission → submission_subject #1                         │
│                     └─ submission #1: REJECTED                  │
│                                                                  │
│ organization_data #2                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #2                         │
│                     └─ submission #2: PENDING                   │
│                                                                  │
│ State: Under Review (again)                                     │
│ Note: New draft #2 is created from available data (e.g. #1),    │
│       this is an API logic decision.                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Admin Approves                                          │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #2                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #2                         │
│                     └─ submission #2: APPROVED ✅               │
│                                                                  │
│ State: Current Approved                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: Updating Accredited Organization (Approved)

```
┌─────────────────────────────────────────────────────────────────┐
│ Initial State: Organization Already Accredited                  │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: APPROVED ✅ (current approved)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User Initiates Edit                                     │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: APPROVED ✅ (unchanged)                        │
│                                                                  │
│ organization_data #2                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: NULL                                           │
│                                                                  │
│ States:                                                          │
│   - org_data #1: Current Approved                               │
│   - org_data #2: Draft                                          │
│                                                                  │
│ Note: Both ACTIVE simultaneously!                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 2: User Submits Updated Data                              │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: APPROVED ✅ (still current)                   │
│                                                                  │
│ organization_data #2                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #2                         │
│                     └─ submission #3: PENDING                   │
│                                                                  │
│ States:                                                          │
│   - org_data #1: Current Approved (still official)             │
│   - org_data #2: Under Review (pending new approval)           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Admin Approves New Version                             │
├─────────────────────────────────────────────────────────────────┤
│ TRANSACTION START                                                │
│                                                                  │
│ 1. Mark old version as OUTDATED:                               │
│    organization_data #1                                         │
│      ├─ status: ACTIVE → OUTDATED                              │
│      └─ submission: APPROVED ✅ (historical)                   │
│                                                                  │
│ 2. New version becomes current:                                │
│    organization_data #2                                         │
│      ├─ status: ACTIVE                                          │
│      └─ submission → submission_subject #2                      │
│                        └─ submission #3: APPROVED ✅            │
│                                                                  │
│ TRANSACTION COMMIT                                               │
│                                                                  │
│ Final State:                                                     │
│   - org_data #1: OUTDATED (superseded)                         │
│   - org_data #2: Current Approved (new official version)       │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Updating Accredited Organization (Rejected)

```
┌─────────────────────────────────────────────────────────────────┐
│ Steps 1-2: Same as Flow 3                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Admin Rejects New Version                              │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: APPROVED ✅ (still current!)                  │
│                                                                  │
│ organization_data #2                                            │
│   ├─ status: ACTIVE → OUTDATED (Marked OUTDATED on rejection)   │
│   └─ submission → submission_subject #2                         │
│                     └─ submission #3: REJECTED ❌               │
│                                                                  │
│ States:                                                          │
│   - org_data #1: Current Approved (still official)             │
│   - org_data #2: Outdated Rejected (historical)                │
│                                                                  │
│ Note: Organization remains accredited with old data #1          │
│ Note: REJECTED data is marked OUTDATED by API logic.            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 4: User Creates New Version and Resubmits                 │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission: APPROVED ✅ (still current)                   │
│                                                                  │
│ organization_data #2                                            │
│   ├─ status: OUTDATED                                           │
│   └─ submission → submission_subject #2                         │
│                     └─ submission #3: REJECTED                  │
│                                                                  │
│ organization_data #3                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #3                         │
│                     └─ submission #4: PENDING                   │
│                                                                  │
│ States:                                                          │
│   - org_data #1: Current Approved                               │
│   - org_data #3: Under Review (second attempt)                 │
│                                                                  │
│ Note: New draft #3 is created from accredited data #1,          │
│       NOT necessarily from rejected data #2.                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Admin Approves (Second Attempt)                        │
├─────────────────────────────────────────────────────────────────┤
│ organization_data #1                                            │
│   ├─ status: ACTIVE → OUTDATED                                 │
│   └─ submission: APPROVED ✅ (superseded)                      │
│                                                                  │
│ organization_data #3                                            │
│   ├─ status: ACTIVE                                             │
│   └─ submission → submission_subject #3                         │
│                     └─ submission #4: APPROVED ✅               │
│                                                                  │
│ Final State:                                                     │
│   - org_data #1: OUTDATED                                       │
│   - org_data #2: OUTDATED                                       │
│   - org_data #3: Current Approved                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Business Rules

### Multiple Simultaneous ACTIVE Records

**Allowed Combinations:**

- ✅ One ACTIVE with APPROVED submission + One ACTIVE draft (user editing new version)
- ✅ One ACTIVE with APPROVED submission + One ACTIVE with PENDING submission
- ✅ One ACTIVE draft + One ACTIVE with REJECTED submission
- ❌ Two ACTIVE with APPROVED submissions (violates uniqueness)
- ❌ Two ACTIVE drafts (violates uniqueness)

### When OUTDATED is Set

OUTDATED is set in three scenarios (based on current API logic):

1.  **When a new version is approved**: All other ACTIVE records for that organization are marked as OUTDATED.
2.  **When a submission is rejected**: The `organization_data` is immediately marked as OUTDATED (API logic decision).
3.  **When a new draft is created from a rejected version**: If not already marked, the rejected `organization_data` is marked as OUTDATED to allow the new draft to be the single ACTIVE record for that "branch" of editing.

#### Scenario 1: Approval Workflow

```typescript
async function approveSubmission(submissionId: bigint) {
  await db.$transaction(async (tx) => {
    // 1. Update submission status
    await tx.submission.update({
      where: { id: submissionId },
      data: { status: "APPROVED" },
    });

    // 2. Get the organization_data being approved
    const submission = await tx.submission.findUnique({
      where: { id: submissionId },
      include: {
        subject: {
          include: {
            organizationData: true,
          },
        },
      },
    });

    const newOrgDataId = submission.subject.organizationData.organizationDataId;
    const organizationId =
      submission.subject.organizationData.organizationData.organizationId;

    // 3. Mark ALL other ACTIVE org_data as OUTDATED
    await tx.organizationData.updateMany({
      where: {
        organizationId,
        status: "ACTIVE",
        id: { not: newOrgDataId },
      },
      data: { status: "OUTDATED" },
    });

    // The new org_data stays ACTIVE with APPROVED submission
  });
}
```

### Rejection Marks OUTDATED (API Logic)

Cuando una sumisión es rechazada:

- El `organization_data` **se marca como OUTDATED** inmediatamente.
- Esto es una **decisión de lógica de la API** para mantener limpio el estado `ACTIVE` y asegurar que solo la data oficial o borradores válidos estén activos.
- No se utiliza necesariamente como base para futuros borradores; los nuevos borradores se crean preferiblemente a partir de la última data acreditada (`APPROVED`) si existe.
- Estas decisiones de lógica pueden ser modificadas en el futuro si el flujo de negocio lo requiere, ya que toda la data histórica permanece disponible.

### Blocking an Organization

```prisma
model Organization {
  status OrganizationStatus @default(ACTIVE)
}
```

- `status = BLOCKED` is **independent** of accreditation
- A BLOCKED organization may have approved organization_data (accredited)
- BLOCKED is an administrative action (e.g., Terms of Service violation)
- Blocking does NOT affect organization_data status

---

## Query Examples

### Get Current Approved Organization Data

```typescript
const currentApproved = await db.organizationData.findFirst({
  where: {
    organizationId,
    status: "ACTIVE",
    submission: {
      subject: {
        submissions: {
          some: { status: "APPROVED" },
        },
      },
    },
  },
  include: {
    submission: {
      include: {
        subject: {
          include: {
            submissions: {
              where: { status: "APPROVED" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    },
  },
});
```

### Get Draft (Not Yet Submitted)

```typescript
const draft = await db.organizationData.findFirst({
  where: {
    organizationId,
    status: "ACTIVE",
    submission: null,
  },
});
```

### Get Pending Submission

```typescript
const pending = await db.organizationData.findFirst({
  where: {
    organizationId,
    status: "ACTIVE",
    submission: {
      subject: {
        submissions: {
          some: { status: "PENDING" },
        },
      },
    },
  },
});
```

### Is Organization Accredited?

```typescript
const isAccredited =
  (await db.organizationData.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      submission: {
        subject: {
          submissions: {
            some: { status: "APPROVED" },
          },
        },
      },
    },
  })) !== null;
```

### Get All Historical Versions

```typescript
const history = await db.organizationData.findMany({
  where: {
    organizationId,
    status: "OUTDATED",
  },
  orderBy: { createdAt: "desc" },
  include: {
    submission: {
      include: {
        subject: {
          include: {
            submissions: true,
          },
        },
      },
    },
  },
});
```

---

## Migration Strategy

### Phase 1: Add New Fields

```sql
-- Add new status enum (keeping old one temporarily)
CREATE TYPE organization_data_status_new AS ENUM ('ACTIVE', 'OUTDATED');

-- Add new status column
ALTER TABLE organization_data
  ADD COLUMN status_new organization_data_status_new DEFAULT 'ACTIVE';
```

### Phase 2: Data Migration

```sql
-- Migrate existing data
UPDATE organization_data SET status_new =
  CASE
    WHEN status IN ('DRAFT', 'SUBMITTED', 'COMPLETED', 'REJECTED') THEN 'ACTIVE'
    WHEN status = 'OUTDATED' THEN 'OUTDATED'
  END;
```

### Phase 3: Update Application Code

- Update all queries to use derived submission status
- Remove references to old status values (DRAFT, SUBMITTED, COMPLETED, REJECTED)
- Implement new approval workflow that sets OUTDATED

### Phase 4: Swap Columns

```sql
-- Drop old column
ALTER TABLE organization_data DROP COLUMN status;

-- Rename new column
ALTER TABLE organization_data RENAME COLUMN status_new TO status;

-- Drop old enum
DROP TYPE organization_data_status_old;
```

### Phase 5: Add Constraints

```sql
-- Add uniqueness constraints
CREATE UNIQUE INDEX idx_org_data_one_active_draft
ON organization_data(organization_id)
WHERE status = 'ACTIVE'
  AND id NOT IN (
    SELECT organization_data_id
    FROM submission_subject_organization_data
  );
```

---

## Benefits

### ✅ Single Source of Truth

- Submission status is the only source for review outcomes
- No redundant COMPLETED/REJECTED statuses
- Rejected records are preserved as immutable history
- Cannot fall out of sync

### ✅ Explicit State Management

- ACTIVE/OUTDATED clearly indicates version status
- No reliance on fragile timestamps
- Intent is clear in queries and code

### ✅ Simplified Business Logic

- Rejection doesn't require complex state transitions
- Approval workflow is straightforward (mark others OUTDATED)
- Blocking is independent of accreditation

### ✅ Better Constraints

- Database can enforce uniqueness rules
- Only one current draft/pending/approved per organization
- Referential integrity maintained

### ✅ Audit Trail Preserved

- All OUTDATED records kept for history
- Each submission attempt is linked to a unique organization_data record
- Can reconstruct organization state at any point in time

### ✅ Flexible Resubmission

- Los nuevos intentos de sumisión se basan preferiblemente en la data acreditada actual, no necesariamente en la rechazada.
- Separación clara entre intentos fallidos (marcados como OUTDATED) y el estado oficial.
- La API decide el origen de los datos para nuevos borradores (decisión de lógica de API modificable).
- No hay riesgo de modificar datos que ya fueron revisados y rechazados.

---

## Trade-offs

### ⚠️ Slightly More Complex Queries

- Must join to submission table to determine substate
- Cannot filter by "DRAFT" status directly (must check submission IS NULL)
- **Mitigation**: Create database views for common queries

### ⚠️ Application Logic Needed for Uniqueness

- Some constraints difficult to express in pure SQL
- Must ensure only one ACTIVE with PENDING/APPROVED in application code
- **Mitigation**: Use database transactions and thorough testing

### ⚠️ Multiple ACTIVE Records Possible

- Can have both approved and draft ACTIVE simultaneously
- Requires understanding of substates
- **Mitigation**: Clear documentation and helper functions

---

## Recommendations

1. **Implement the ACTIVE/OUTDATED pattern** as described
2. **Remove redundant status values** (DRAFT, SUBMITTED, COMPLETED, REJECTED)
3. **Use submission status as source of truth** for review outcomes
4. **Create new organization_data for each submission attempt** after a rejection or new accreditation request
5. **Add database constraints** for uniqueness where possible
6. **Create helper functions** for common queries (getCurrentApproved, getDraft, etc.)
7. **Consider database views** for frequently used derived states
8. **Thoroughly test** approval/rejection workflows in transactions
9. **Document** the state machine clearly for future developers

---

## Appendix A: Complete State Machine Diagram

```
[ACTIVE, no submission]  ────────submit────────> [ACTIVE, PENDING]
       │ (Draft)                                        │ (Under Review)
       │                                                │
       │                                        approve─┴─reject
       │                                                │        │
       │                                                ▼        ▼
       │                                    [ACTIVE, APPROVED]  [ACTIVE, REJECTED]
       │                                     (Current Approved)  │ (Rejected)
       │                                                │        │
       │                                                │        │ create new
       │                                                │        └──────> [New ACTIVE draft created]
       │                                                │                 (Old becomes OUTDATED)
       │                                                │
       │◄───────────────────────edit──────────────────────┘
       │
       │
       ▼
    [New ACTIVE draft created]
    [Old becomes OUTDATED when new approved]
```

---

## Appendix B: Database Schema (Complete)

```prisma
enum OrganizationStatus {
  ACTIVE
  BLOCKED

  @@map("organization_status")
}

enum OrganizationDataStatus {
  ACTIVE
  OUTDATED

  @@map("organization_data_status")
}

model Organization {
  id          BigInt             @id @default(autoincrement())
  countryId   BigInt             @map("country_id")
  status      OrganizationStatus @default(ACTIVE)
  createdAt   DateTime           @default(now()) @map("created_at")
  updatedAt   DateTime           @default(now()) @updatedAt @map("updated_at")

  data        OrganizationData[]

  @@map("organization")
}

model OrganizationData {
  id                                 BigInt                             @id @default(autoincrement())
  organizationId                     BigInt                             @map("organization_id")
  status                             OrganizationDataStatus             @default(ACTIVE)
  legalName                          String                             @map("legal_name")
  tradeName                          String?                            @map("trade_name")
  taxId                              String                             @map("tax_id")
  countryOrganizationSizeId          BigInt?                            @map("country_organization_size_id")
  sectorId                           BigInt?                            @map("sector_id")
  subsectorId                        BigInt?                            @map("subsector_id")
  address                            String?
  workersCount                       Int?                               @map("workers_count")
  representativeFullName             String                             @map("representative_full_name")
  representativeTaxId                String                             @map("representative_tax_id")
  representativeCountryJobPositionId BigInt                             @map("representative_country_job_position_id")
  representativePhone                String                             @map("representative_phone")
  representativeEmail                String                             @map("representative_email")
  createdAt                          DateTime                           @default(now()) @map("created_at")
  updatedAt                          DateTime                           @default(now()) @updatedAt @map("updated_at")

  organization                       Organization                       @relation(fields: [organizationId], references: [id])
  submission                         SubmissionSubjectOrganizationData?

  @@map("organization_data")
}

enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED

  @@map("submission_status")
}

model SubmissionSubject {
  id          BigInt                @id @default(autoincrement())
  subjectType SubmissionSubjectType @map("subject_type")
  createdAt   DateTime              @default(now()) @map("created_at")

  submissions      Submission[]
  organizationData SubmissionSubjectOrganizationData?

  @@map("submission_subject")
}

model SubmissionSubjectOrganizationData {
  subjectId          BigInt            @id @map("subject_id")
  organizationDataId BigInt            @unique @map("organization_data_id")

  subject            SubmissionSubject @relation(fields: [subjectId], references: [id])
  organizationData   OrganizationData  @relation(fields: [organizationDataId], references: [id])

  @@map("submission_subject_organization_data")
}

model Submission {
  id             BigInt           @id @default(autoincrement())
  subjectId      BigInt           @map("subject_id")
  status         SubmissionStatus @default(PENDING)
  reviewerId     BigInt?          @map("reviewer_id")
  reviewComments String?          @map("review_comments")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @default(now()) @updatedAt @map("updated_at")

  subject  SubmissionSubject @relation(fields: [subjectId], references: [id])

  // Constraint: UNIQUE INDEX on subject_id WHERE status IN ('PENDING', 'APPROVED')
  @@map("submission")
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Authors**: System Architecture Team
**Status**: Proposal - Pending Review

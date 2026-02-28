# Carbon Inventory Lifecycle and Status Model

This document details the status management system for carbon inventories, which follows a submission-based inference pattern similar to organization accreditation. Instead of storing workflow states (DRAFT, CALCULATED, VERIFIED) directly on the table, these are inferred from approved submissions, maintaining a single source of truth with full audit trail.

---

## Overview

Carbon inventories track greenhouse gas emissions for organizations. The status model separates **base statuses** (stored on the table) from **workflow statuses** (inferred from submissions):

- **Base Statuses**: `ACTIVE`, `DELETED` (stored in `carbon_inventory.status`)
- **Workflow Statuses**: `DRAFT`, `CALCULATED`, `VERIFIED` (computed from submission approvals)

This design:

- Eliminates redundancy between stored status and submission state
- Provides full audit trail of all status transitions
- Maintains single source of truth for workflow progression
- Enables time-travel queries (status at any point in history)

**Key Principle**: The submission system is the authoritative record of workflow progression. The base status only tracks whether an inventory is active or soft-deleted.

---

## Status Model

### Base Statuses (Stored on Table)

These are the only values stored in the `carbon_inventory.status` column:

| Status    | Description                                                                            | Usage                                    |
| :-------- | :------------------------------------------------------------------------------------- | :--------------------------------------- |
| `ACTIVE`  | Inventory is active and participating in the system                                    | Default for all new inventories          |
| `DELETED` | Inventory has been soft-deleted (hidden but preserved for audit/referential integrity) | Set manually or via cascade delete logic |

**Default**: All new carbon inventories are created with `status = ACTIVE`.

### Workflow Statuses (Inferred from Submissions)

These statuses are **computed** based on approved submissions and are not stored in the enum:

| Status       | Inference Logic                                         | Meaning                                                  |
| :----------- | :------------------------------------------------------ | :------------------------------------------------------- |
| `DRAFT`      | No submission exists for this inventory                 | Inventory is being created/edited, not yet submitted     |
| `CALCULATED` | Has approved `CARBON_INVENTORY_CALCULATION` submission  | Emissions calculation has been reviewed and approved     |
| `VERIFIED`   | Has approved `CARBON_INVENTORY_VERIFICATION` submission | Full verification (after calculation) has been completed |
| `DELETED`    | `inventory.status = DELETED` (base status)              | Soft-deleted, overrides all inferred statuses            |

**Important**:

- The workflow progresses linearly: `DRAFT` → `CALCULATED` → `VERIFIED`. An inventory cannot be verified without first being calculated.
- **Cardinality Constraint**: A carbon inventory can have **only one** active submission (PENDING or APPROVED) per type. This is enforced at the database level to ensure a single source of truth for each workflow stage.

---

## Submission Types and Their Meaning

Carbon inventories use two submission types to track workflow progression. Each inventory is restricted to a single active submission for each of these types:

### 1. `CARBON_INVENTORY_CALCULATION`

**Purpose**: Request approval for the emissions calculation.

**When Used**: After completing data entry and emission calculations, users submit for review.

**Approval Effect**: Inventory transitions from `DRAFT` to `CALCULATED` status.

**Cardinality**: Only one `CARBON_INVENTORY_CALCULATION` submission can be active (PENDING or APPROVED) at a time for a given inventory.

**Typical Review Focus**:

- Accuracy of activity data (energy consumption, travel, etc.)
- Correct application of emission factors
- Completeness of scope coverage
- Mathematical correctness of calculations

### 2. `CARBON_INVENTORY_VERIFICATION`

**Purpose**: Request verification of the complete inventory (post-calculation).

**When Used**: After calculation approval, when the inventory is ready for full verification.

**Approval Effect**: Inventory transitions from `CALCULATED` to `VERIFIED` status.

**Prerequisite**: Must have approved `CARBON_INVENTORY_CALCULATION` submission first.

**Cardinality**: Only one `CARBON_INVENTORY_VERIFICATION` submission can be active (PENDING or APPROVED) at a time for a given inventory.

**Typical Review Focus**:

- Supporting documentation and evidence
- Methodology compliance (GHG Protocol, ISO 14064, etc.)
- Data quality and uncertainty assessment
- Third-party verification requirements (if applicable)

---

## Status Inference Logic

The system computes the display status using this logic (implemented in future database view):

```
IF inventory.status = DELETED THEN
  → DELETED

ELSE IF has approved CARBON_INVENTORY_VERIFICATION submission THEN
  → VERIFIED

ELSE IF has approved CARBON_INVENTORY_CALCULATION submission THEN
  → CALCULATED

ELSE
  → DRAFT (no submission exists)
```

**Key Points**:

- `DELETED` status always takes precedence (cannot be overridden by submissions)
- Approved submissions must have `submission.status = 'APPROVED'`
- Only the most recent submission matters for each type
- An inventory can have multiple submissions (e.g., rejected then resubmitted)

---

## Status Hierarchy

When determining which status to display (e.g., in views or APIs), use this priority order:

```
DELETED > VERIFIED > CALCULATED > DRAFT
```

**Examples**:

- Inventory with `status=DELETED` and approved verification → displays as `DELETED`
- Inventory with approved calculation but no verification → displays as `CALCULATED`
- New inventory with no submissions → displays as `DRAFT`

---

## TODO: specify workflow when submission are rejected (for now the idea is duplicate the inventory, but we need to decide if it is made by the FRONT or by the API)

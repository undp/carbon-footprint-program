# Carbon Accounting Platform – Data Model Documentation

## 1. Purpose & Scope

This document describes the conceptual and logical data model of the Carbon Accounting Platform.
The model supports:

- Measurement of organizational greenhouse gas (GHG) emissions
- Methodology-driven emission factor selection
- Auditable calculations and historical traceability
- Submission, review, and recognition workflows
- Reduction and neutralization planning

The design prioritizes correctness, reproducibility, auditability, and regulatory credibility.

---

## 2. Core Goal of the System

The primary goal of the system is to:

**Produce defensible, reproducible, and reviewable carbon inventories**, aligned with a country-specific methodology, and capable of supporting third-party validation and public recognition.

---

## 3. Fundamental Modeling Principles

### 3.1 Separation of Concerns

The system strictly separates configuration, user input, factor derivation, calculation results, workflow state, and recognition into different tables.

### 3.2 Historical Integrity

- No meaningful data is overwritten
- Changes create new rows
- Status transitions model lifecycle
- Full auditability is preserved

### 3.3 Domain-Driven Nullability

NULL values represent valid domain states, not incomplete design.

---

## 4. High-Level Domain Decomposition

1. Country & Configuration
2. Methodology & Emission Factors
3. Organizations & Users
4. Carbon Inventory & Calculation
5. Reduction & Neutralization
6. Submissions & Recognition

---

## 5. Country & Configuration Domain

Defines jurisdictional context and system-wide parameters.

Key tables:

- country
- country_parameter
- system_parameter
- status_catalog

Statuses are modeled as data, not booleans.

---

## 6. Methodology & Emission Factors

### Methodology Versioning

Each country has versioned methodologies, with exactly one active version at a time.

A carbon inventory is bound to the version that was active when it was created, and that binding never changes — publishing a new version only affects inventories created afterwards. So a factor an existing inventory needs has to enter the version it already references, which for every recent inventory is the active one.

### Category Hierarchy

Methodology → Category → Subcategory

Calculations are anchored at subcategory level.

### Emission Factor Dimensions

- Structured, normalized selections
- Maximum of two dimensions per subcategory
- Hierarchical dimension values supported
- In the future, it will declare which measurement units should be accepted.

### Emission Factors

Factors are uniquely defined per subcategory and dimension combination, versioned via status.

**Editing or deleting a factor directly is decided by usage, not by the methodology's status.** A factor may be changed or removed while no live line references it, and becomes immutable once one does — the same rule on the active version and on a superseded one. The API enforces it (`EMISSION_FACTOR_IN_USE`, 409); the maintainer only stops offering what would be refused, showing how many lines depend on the factor.

Three kinds of reference do not count. Superseded line inputs: inputs are versioned, one active per line, and every reader filters on that, so those are audit trail. Deleted lines and deleted footprints: both deletions are soft and leave the snapshot in place, and neither is reversible, so counting them would lock a factor against something nobody can reach. Unclaimed anonymous footprints: the calculator is open and nobody — not the visitor, not an administrator — can delete a footprint that has neither an owner nor an organization, so counting those would let anonymous traffic freeze the catalogue permanently. Adding a factor is never blocked, since nothing can reference one that does not exist yet.

**The rule governs the factor's own endpoints, not the cascades above it.** Deleting a subcategory, a category or a methodology version soft-deletes the factors underneath it, and adding, removing or changing a dimension deletes or rewrites the factors of its subcategory. None of those paths checks usage today, and the screens they belong to are editable over any superseded version. Treat the guarantee as covering `PATCH` and `DELETE` on an emission factor, and nothing wider.

---

## 7. Organizations & Users

### 7.1 Organizations

- Organizations represent the legal entities participating in the platform.
- They follow a versioned data model via `organization_data`.
- **ACTIVE/OUTDATED Pattern**: The system uses an explicit status on `organization_data` to manage versions, while the review outcome is derived from the linked `submission`.
- **Lifecycle Flow**:
  1. **Creation**: A new `organization` is created with status **ACTIVE**. A corresponding `organization_data` record is created with status **ACTIVE** and no linked submission (this represents the **Draft** state).
  2. **Submission**: When the user submits for accreditation, a `submission` is created (status **PENDING**) linked to the **ACTIVE** `organization_data`. (State: **Under Review**).
  3. **Review (Approval)**: Upon admin approval, the `submission` status changes to **APPROVED**. The `organization_data` remains **ACTIVE**. The organization is now considered "accredited" because it has an **ACTIVE** data record with an **APPROVED** submission.
  4. **Review (Rejection)**: If rejected, the `submission` status changes to **REJECTED**, and the `organization_data` is immediately marked as **OUTDATED**. To resubmit, a new **ACTIVE** `organization_data` must be created.
  5. **Updates**: Editing an accredited organization creates a new **ACTIVE** `organization_data` row (Draft). The previous **ACTIVE** (Approved) row remains **ACTIVE** and official until the new version is approved.
  6. **Re-accreditation**: When the new version is submitted, it becomes **Under Review** (PENDING submission) while the old one remains the official **ACTIVE** (Approved) version. Upon approval of the new version, the old one is marked **OUTDATED**, and the new one becomes the current official **ACTIVE** version.
  7. **Blocking**: An organization can be **BLOCKED** independently of its accreditation status. This is an administrative action that does not affect the `organization_data` status.

### 7.2 Users

- Users can act independently or within organizations.
- Roles are split into system roles and organization roles.

---

## 8. Carbon Inventory & Calculation

### Carbon Inventory

Represents one reporting year, methodology version, and usage mode.

### Inventory Lines

Each line defines what is being measured (subcategory). Selections are stored in the input table.

### Inputs

User-provided data including selections, quantities, and measurement units. Versioned and immutable once replaced.

### Factors

Normalized factors actually used in calculations, stored for reproducibility.

### Results

Purely derived emissions results, immutable and timestamped.

---

## 9. Reduction & Neutralization

- Generic and personalized reduction suggestions
- Reduction projects and neutralization plans represent future commitments

---

## 10. Submissions & Recognition

### Submissions

Immutable review artifacts representing validation processes.

**Submission Flow**:

1.  **Subject Creation**: A `submission_subject` is created and linked to a concrete entity (e.g., `carbon_inventory` or `organization_data`).
2.  **Submission**: A `submission` record is created with status **PENDING**.
3.  **Review**: A reviewer (admin) transitions the status to **APPROVED** or **REJECTED**.
4.  **Constraints**: A subject can have only one **PENDING** or **APPROVED** submission at a time. If rejected, the user can submit again.

### Recognition

Awards are always linked to submissions, ensuring traceability.

---

## 11. Design Trade-Offs

Chosen:

- Explicit modeling over abstraction
- Constraints over flexibility
- Versioning over updates

Avoided:

- Polymorphic foreign keys
- Boolean workflow flags
- Free-text factor definitions

---

## 12. Evolution Guidelines

- Preserve historical data
- Prefer new rows over updates
- Treat workflows as data
- Enforce invariants at DB level

---

## 13. Summary

This data model is a formal representation of regulatory, scientific, and organizational carbon accounting processes.

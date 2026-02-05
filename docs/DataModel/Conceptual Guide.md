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

---

## 7. Organizations & Users

### 7.1 Organizations

- Organizations represent the legal entities participating in the platform.
- They follow a versioned data model via `organization_data`.
- **Lifecycle Flow**:
  1. **Creation**: New `organization` with an associated `organization_data` in **DRAFT**.
  2. **Submission**: User moves DRAFT to **SUBMITTED** for accreditation.
  3. **Review**: Admin approves (moves to **COMPLETED**) or rejects (moves back to **DRAFT**).
  4. **Updates**: Editing a COMPLETED organization creates a new **DRAFT**, leaving the COMPLETED row intact.
  5. **Re-accreditation**: When the new SUBMITTED row is approved, the previous COMPLETED row becomes **OUTDATED**, and the new one becomes **COMPLETED**.

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

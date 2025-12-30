# Carbon Accounting Platform – Developer-Oriented Data Model Guide

This document complements the conceptual data model documentation.
It is intended for **backend, data, and analytics engineers** working directly with the database.

Focus areas:

- Query patterns
- Data invariants
- Anti-patterns and common mistakes
- Operational guidance for safe reads & writes

---

## 1. Mental Model for Developers

Think of the system as **event-sourced–like**, even though it is relational:

- User intent → immutable inputs
- System interpretation → derived factor snapshot
- System output → immutable result
- Workflow state → explicit status transitions

**Never assume “latest row = truth” without a rule.**

---

## 2. Core Invariants (Must Always Hold)

### 2.1 Inventory & Methodology

- Every `carbon_inventory` references **exactly one methodology_version**
- That methodology version must belong to the same country as the inventory’s organization (if any)
- Only one ACTIVE `methodology_version` exists per country

Violation symptom:

- Inconsistent totals across inventories
- Impossible comparisons year-over-year

---

### 2.2 Inventory Lines

For `carbon_inventory_line`:

- `(carbon_inventory_id, subcategory_id, selection_1_id, selection_2_id)`
  must be **unique for ACTIVE lines**
- DELETED lines are never reused
- Lines never store quantities or factors

If you need numbers → **you are in the wrong table**.

---

### 2.3 Inputs

For `carbon_inventory_line_input`:

- Exactly **one active input per line**
- Old inputs remain for history but are inactive
- Inputs are immutable once deactivated

Never update an input row to “fix” data.
Create a new one and deactivate the old.

---

### 2.4 Factors

For `carbon_inventory_line_factor`:

- Exactly one factor row per input
- Factor represents the **post-conversion value**
- EXPERT and DIRECT modes may have `emission_factor_id = NULL`

Invariant:

> The factor row must fully explain _how_ the result was computed.

---

### 2.5 Results

For `carbon_inventory_line_result`:

- Exactly one result per input
- Results are **purely derived**
- No user attribution (`created_by`) by design

If a result changes, something upstream changed.

---

## 3. Canonical Query Patterns

### 3.1 Get Current Inventory State (Most Common)

```sql
SELECT
  l.id AS line_id,
  sc.name AS subcategory,
  i.input_type,
  i.quantity,
  mu.abbreviation AS unit,
  r.total_emissions
FROM carbon_inventory_line l
JOIN subcategory sc ON sc.id = l.subcategory_id
JOIN carbon_inventory_line_input i
  ON i.line_id = l.id AND i.is_active = true
LEFT JOIN measurement_unit mu ON mu.id = i.measurement_unit_id
LEFT JOIN carbon_inventory_line_result r
  ON r.line_input_id = i.id
WHERE l.carbon_inventory_id = :inventory_id
  AND l.status = 'ACTIVE';
```

**Key idea:**  
You never join directly from line → result.  
You always go through the active input.

---

### 3.2 Reproduce a Historical Calculation

```sql
SELECT
  i.id AS input_id,
  i.quantity,
  f.applied_factor_value,
  r.total_emissions,
  f.derivation_details
FROM carbon_inventory_line_input i
JOIN carbon_inventory_line_factor f ON f.line_input_id = i.id
JOIN carbon_inventory_line_result r ON r.line_input_id = i.id
WHERE i.id = :input_id;
```

This query must remain valid **forever**.

---

### 3.3 Find the Emission Factor Used

```sql
SELECT
  ef.*,
  dv1.value AS dim_1,
  dv2.value AS dim_2
FROM carbon_inventory_line_factor lf
LEFT JOIN emission_factor ef ON ef.id = lf.emission_factor_id
LEFT JOIN emission_factor_dimension_value dv1
  ON dv1.id = ef.dimension_value_1_id
LEFT JOIN emission_factor_dimension_value dv2
  ON dv2.id = ef.dimension_value_2_id
WHERE lf.line_input_id = :input_id;
```

Do **not** attempt to “re-derive” factor selection in queries.

---

### 3.4 Compute Inventory Total Safely

```sql
SELECT SUM(r.total_emissions) AS inventory_total
FROM carbon_inventory_line l
JOIN carbon_inventory_line_input i
  ON i.line_id = l.id AND i.is_active = true
JOIN carbon_inventory_line_result r
  ON r.line_input_id = i.id
WHERE l.carbon_inventory_id = :inventory_id
  AND l.status = 'ACTIVE';
```

Never sum results without:

- ACTIVE lines
- ACTIVE inputs

---

## 4. Status Handling Rules

### 4.1 Status Is Authoritative

- Status defines lifecycle
- Do not infer state from timestamps
- Do not use booleans like `is_deleted`

Example anti-pattern:

```sql
WHERE deleted_at IS NULL -- ❌
```

Correct:

```sql
WHERE status_id = (
  SELECT id FROM status_catalog
  WHERE scope = 'CARBON_INVENTORY'
    AND code = 'ACTIVE'
)
```

---

## 5. Write Patterns (What You Should Do)

### 5.1 Updating User Data

1. Mark previous input as inactive
2. Insert new input row
3. Insert factor row
4. Insert result row

All steps should be in **one transaction**.

---

### 5.2 Changing Methodology or Factors

- Never update existing emission factors
- Create new factor rows
- Mark old ones as OUTDATED

Existing inventories must remain reproducible.

---

## 6. Anti-Patterns (Hard No)

### ❌ Joining Inventory Directly to Factors

Factors are input-specific, not inventory-wide.

### ❌ Updating Quantities In-Place

Breaks historical traceability.

### ❌ Recomputing Emissions on the Fly

Always read stored results.

### ❌ Using JSON for Core Logic

JSON is for explanations, not rules.

### ❌ Ignoring Dimension Positions

`selection_1_id` ≠ `selection_2_id` by accident.

---

## 7. Performance Guidance

- Index:
  - `(line_id) WHERE is_active = true` on inputs
  - `(carbon_inventory_id, status)` on lines
- Avoid scanning historical inputs unless auditing
- Pre-aggregate per inventory if dashboards require it

---

## 8. Debugging Checklist

When numbers look wrong:

1. Is the line ACTIVE?
2. Is there exactly one active input?
3. Does the factor row exist?
4. Does the result reference the same input?
5. Is the methodology version correct?
6. Are you summing inactive data?

99% of bugs are violations of these rules.

---

## 9. Final Rule of Thumb

> **If a query feels “clever”, it is probably wrong.**

Prefer:

- Explicit joins
- Clear filters
- Redundant clarity

This schema rewards correctness over shortcuts.

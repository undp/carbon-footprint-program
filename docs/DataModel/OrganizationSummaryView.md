# Organization Summary View (`organization_summary_view`)

The `organization_summary_view` is a denormalized read-only view designed for high-performance retrieval of organization data. It consolidates information from multiple tables (organizations, submissions, carbon inventories, and lookup tables) into a single row per organization, optimized for lists, tables, and dashboards.

---

## Purpose

To avoid repetitive and complex `JOIN` logic, subqueries, and prioritization rules in every API request, this view pre-calculates the "source of truth" for an organization's current state, including its accreditation status, latest submission, and carbon footprint summary.

---

## Architecture (CTEs)

The view is constructed using **5 Common Table Expressions (CTEs)** that handle specific logical domains before being combined in the final `SELECT`.

### 1. `accredited_organizations_ids`

- **Goal:** Identifies organizations that have successfully completed the accreditation process.
- **Logic:** Checks for at least one `ACTIVE` `organization_data` record linked to an `APPROVED` `submission`.
- **Path:** `organization_data (ACTIVE)` → `submission_subject_organization_data` → `submission (APPROVED)`.

### 2. `organizations_latest_submission_status`

- **Goal:** Retrieves the single most recent submission for each organization, regardless of its status.
- **Logic:** Uses `DISTINCT ON (organization_id)` combined with `ORDER BY id DESC` to isolate the latest submission record.

### 3. `organizations_ids_with_unsubmitted_changes`

- **Goal:** Identifies "pure drafts"—organizations with `ACTIVE` data that has never been attached to any submission.
- **Logic:** Uses `NOT EXISTS` to find `organization_data` records that do not appear in the `submission_subject_organization_data` mapping table.

### 4. `organization_displayed_data` (Reference Data)

- **Goal:** Selects the single "representative" `organization_data` record to display for the organization.
- **Logic:** Uses `ROW_NUMBER()` with a specific priority matrix to handle versioning and pending changes:

| Priority | Condition                                      | Description                                 |
| :------- | :--------------------------------------------- | :------------------------------------------ |
| **1**    | `submission.status = 'PENDING'`                | Data currently under review by an admin.    |
| **2**    | `s_active.status IS NULL AND s_any.id IS NULL` | Pure draft (new changes not yet submitted). |
| **3**    | `submission.status = 'APPROVED'`               | Currently active, approved public data.     |
| **4**    | `Else`                                         | Fallback to other states (REJECTED).        |

- _Tie-breaker:_ If multiple records share a priority, the one with the highest `id` (most recent) wins.

### 5. `organization_carbon_inventories_summary`

- **Goal:** Aggregates carbon footprint data.
- **Logic:** Sums emissions from the `carbon_inventory_subtotals_view` and identifies if the organization has any inventories at all. Filters by status (excluding `DELETED` and `DRAFT`) and by **measurement year** — specifically `(organization_data->>'year')::int >= EXTRACT(YEAR FROM CURRENT_DATE)::int - 2`, which includes the current year and the two prior years (3 years total).
- **Note on year filtering:** The filter uses the measurement year stored in the inventory's `organization_data` JSON (`year` field), not the record's `created_at` timestamp. This is intentional: the view aggregates inventories by the period they measure, not by when the record was created. For example, if the current year is 2026, inventories with measurement years 2024, 2025, and 2026 are included regardless of their `created_at` date.

---

## Field Reference

### Core Organization Data

| Field                 | Type   | Description                                                        |
| :-------------------- | :----- | :----------------------------------------------------------------- |
| `organization_id`     | BIGINT | Unique identifier for the organization.                            |
| `country_id`          | BIGINT | The country the organization belongs to.                           |
| `organization_status` | Enum   | System status of the organization (e.g., `ACTIVE`, `BLOCKED`).     |
| `name`                | String | Computed display name: `COALESCE(trade_name, legal_name, tax_id)`. |
| `legal_name`          | String | Official registered name.                                          |
| `trade_name`          | String | Commercial or "Doing Business As" name.                            |
| `tax_id`              | String | Tax identification number (RUT, NIT, etc.).                        |

### Status & Accreditation

| Field                     | Type    | Description                                                                         |
| :------------------------ | :------ | :---------------------------------------------------------------------------------- |
| `display_status`          | String  | The primary status shown in the UI: `BLOCKED`, `ACCREDITED`, or `NOT_ACCREDITED`.   |
| `is_accredited`           | Boolean | `true` if the organization has at least one approved submission.                    |
| `last_submission_status`  | String  | The status of the most recent submission (e.g., `PENDING`, `APPROVED`, `REJECTED`). |
| `has_unsubmitted_changes` | Boolean | `true` if there is active data that hasn't been submitted yet.                      |

### Carbon Footprint

| Field                    | Type      | Description                                                                      |
| :----------------------- | :-------- | :------------------------------------------------------------------------------- |
| `has_carbon_inventories` | Boolean   | Indicates if the organization has registered any carbon inventories (non-draft). |
| `total_emissions`        | Numeric   | Sum of all emissions for the last 3 years.                                       |
| `last_measurement`       | Timestamp | Date of the most recent carbon inventory entry.                                  |

### Metadata & Lookups

| Field                          | Type   | Description                                                         |
| :----------------------------- | :----- | :------------------------------------------------------------------ |
| `size_name`                    | String | Human-readable name of the organization size (Small, Medium, etc.). |
| `sector_name`                  | String | Name of the economic sector.                                        |
| `subsector_name`               | String | Name of the economic subsector.                                     |
| `main_activity_name`           | String | Name of the primary business activity.                              |
| `representative_full_name`     | String | Name of the legal representative.                                   |
| `representative_position_name` | String | Job title/position of the representative.                           |

---

## Implementation Notes

- **Filter:** The view explicitly excludes organizations that do not have at least one `ACTIVE` `organization_data` record (`WHERE odd.id IS NOT NULL`).
- **Performance:** By pre-joining lookup tables (like `country_sector`), the view allows the API to perform simple `SELECT *` queries without additional complex joins.

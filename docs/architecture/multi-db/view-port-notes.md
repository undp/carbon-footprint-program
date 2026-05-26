# View port notes — PostgreSQL → SQL Server

The platform defines **4 SQL views** as raw-SQL migrations (Prisma `views`
preview feature maps them as read models). SQL Server cannot use the PostgreSQL
view SQL verbatim. This document inventories every PG-specific construct per view
and its SQL Server replacement. **These ports are implemented in PR 4** as
raw-SQL migrations under `src/prisma/sqlserver/migrations/`.

## Cross-cutting replacements (apply to all views)

| PostgreSQL construct                                                    | SQL Server replacement                                                                           | Notes                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `CREATE OR REPLACE VIEW`                                                | `CREATE OR ALTER VIEW`                                                                           | SQL Server 2016 SP1+                                                            |
| `DISTINCT ON (k) ... ORDER BY k, x DESC`                                | `ROW_NUMBER() OVER (PARTITION BY k ORDER BY x DESC) = 1` (wrap in subquery/CTE, filter `rn = 1`) | No `DISTINCT ON` in SQL Server                                                  |
| `agg(...) FILTER (WHERE cond)`                                          | `agg(CASE WHEN cond THEN expr END)`                                                              | No `FILTER` clause                                                              |
| `EXTRACT(YEAR FROM x)::int`                                             | `YEAR(x)`                                                                                        |                                                                                 |
| `expr::enum_type` (enum cast)                                           | drop the cast (column is `VARCHAR`+CHECK, not a native enum) or `CAST(expr AS VARCHAR(n))`       | SQL Server has no enum types                                                    |
| `NULL::BIGINT` (typed null)                                             | `CAST(NULL AS BIGINT)`                                                                           | needed so `UNION ALL` branch types line up                                      |
| boolean expression as a selected column, e.g. `(x IS NOT NULL) AS flag` | `CAST(CASE WHEN x IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS flag`                                 | SQL Server cannot return a boolean expression as a column value                 |
| boolean literal `TRUE` / `FALSE`                                        | `CAST(1 AS BIT)` / `CAST(0 AS BIT)`                                                              |                                                                                 |
| predicate `col = true`                                                  | `col = 1`                                                                                        | `boolean` → `BIT`                                                               |
| POSIX regex `value ~ '^[0-9]+$'`                                        | `value NOT LIKE '%[^0-9]%' AND value <> ''`                                                      | SQL Server has no regex; use a negated `LIKE` character class                   |
| `value::int` / `value::bigint` on untrusted text                        | `TRY_CAST(value AS INT)` / `TRY_CAST(value AS BIGINT)`                                           | `TRY_CAST` returns NULL instead of erroring — preserves the guarded-cast intent |
| `COALESCE`, `WITH` (CTEs), `UNION ALL`, window funcs                    | identical                                                                                        | supported in SQL Server                                                         |

## 1. `organization_summary_view` (most complex)

Source: `20260512105933_add_measuring_organizations_year_range_param`.

PG-specific constructs used:

- `DISTINCT ON (od.organization_id)` in `organizations_latest_submission_status`
  → `ROW_NUMBER()` pattern.
- `ROW_NUMBER() OVER (...)` in `organization_displayed_data` → already portable.
- `EXTRACT(YEAR FROM CURRENT_DATE)::int` → `YEAR(GETDATE())`.
- Numeric guard on a text system-parameter:
  `value ~ '^[0-9]+$' AND length(value) <= 10 AND value::bigint BETWEEN 1 AND 2147483647`
  → `value NOT LIKE '%[^0-9]%' AND value <> '' AND LEN(value) <= 10 AND TRY_CAST(value AS BIGINT) BETWEEN 1 AND 2147483647`,
  then `TRY_CAST(value AS INT)`.
- `lss.submission_status::submission_status` and
  `(...)::organization_summary_display_status` enum casts → drop (plain VARCHAR).
- `(uioc.organization_id IS NOT NULL) AS has_unsubmitted_changes`,
  `(acoi.organization_id IS NOT NULL) AS is_accredited` → `CAST(CASE WHEN ... THEN 1 ELSE 0 END AS BIT)`.
- `TRUE AS has_carbon_inventories` → `CAST(1 AS BIT)`.
- `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`.
- Depends on `carbon_inventory_subtotals_view` → port that view first.

## 2. `carbon_inventory_subtotals_view`

Source: `20260202171505_add_carbon_inventory_subtotals_view`.

- `COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (...))`
  → `COUNT(DISTINCT CASE WHEN EXISTS (...) THEN l.id END)`.
- `i.is_active = true` → `i.is_active = 1`.
- `COALESCE(SUM(r.total_emissions), 0)` → portable.
- `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`.

## 3. `carbon_inventory_sector_subtotals_view`

Source: `20260417140438_add_carbon_inventory_sector_subtotals_view`.

- `SELECT DISTINCT ON (organization_id) ... ORDER BY organization_id, id DESC`
  subquery → `ROW_NUMBER()` pattern.
- `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`.
- Depends on `carbon_inventory_subtotals_view`.

## 4. `submission_summary_view`

Source: `20260415000000_add_submission_summary_view`.

- `EXTRACT(YEAR FROM od.created_at)::INTEGER` → `YEAR(od.created_at)`.
- `NULL::BIGINT AS carbon_inventory_id` / `NULL::BIGINT AS reduction_project_id`
  → `CAST(NULL AS BIGINT) AS ...` (required so the three `UNION ALL` branches
  agree on column types).
- `CREATE VIEW` → `CREATE OR ALTER VIEW` (for idempotent re-runs).
- Depends on `organization_summary_view` → port that view first.

## Porting order (dependency-driven)

1. `carbon_inventory_subtotals_view`
2. `carbon_inventory_sector_subtotals_view` (depends on #1)
3. `organization_summary_view` (depends on #1)
4. `submission_summary_view` (depends on #3)

-- Reporting views. They read across inventories, organizations and submissions,
-- so they are created once every table they depend on exists. Prisma maps them
-- through the `views` preview feature but never generates or diffs them: any
-- change to a view has to be written here by hand.

-- CreateView: carbon_inventory_subtotals_view (Prisma expects a table, but we create a view instead)
-- Aggregates emission totals and line completion counts per (inventory, category, subcategory).
-- A line is considered "completed" when it has an active input that produced a result.
CREATE OR REPLACE VIEW "carbon_inventory_subtotals_view" AS
SELECT
    ci.id AS carbon_inventory_id,
    s.category_id,
    l.subcategory_id,
    COALESCE(SUM(r.total_emissions), 0) AS value,
    COUNT(DISTINCT l.id) AS active_lines_count,
    COUNT(DISTINCT l.id) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM carbon_inventory_line_input i2
        INNER JOIN carbon_inventory_line_result r2 ON r2.line_input_id = i2.id
        WHERE i2.line_id = l.id AND i2.is_active = true
      )
    ) AS active_completed_lines_count
  FROM carbon_inventory ci
  INNER JOIN carbon_inventory_line l
    ON l.carbon_inventory_id = ci.id
    AND l.status = 'ACTIVE'
  INNER JOIN subcategory s
      ON l.subcategory_id = s.id
  LEFT JOIN carbon_inventory_line_input i
    ON i.line_id = l.id AND i.is_active = true
  LEFT JOIN carbon_inventory_line_result r
    ON r.line_input_id = i.id
  GROUP BY
      ci.id,
      s.category_id,
      l.subcategory_id;

CREATE OR REPLACE VIEW "carbon_inventory_sector_subtotals_view" AS
SELECT
    sv.carbon_inventory_id,
    ci.year,
    ci.status,
    ci.is_self_declared,
    od.sector_id,
    cs.name AS sector_name,
    sv.value
FROM carbon_inventory_subtotals_view sv
JOIN carbon_inventory ci ON ci.id = sv.carbon_inventory_id
LEFT JOIN (
    SELECT DISTINCT ON (organization_id) organization_id, sector_id
    FROM organization_data
    WHERE status = 'ACTIVE'
    ORDER BY organization_id, id DESC
) od ON od.organization_id = ci.organization_id
LEFT JOIN country_sector cs ON cs.id = od.sector_id
WHERE ci.organization_id IS NOT NULL;

-- CreateEnum
CREATE TYPE "organization_summary_display_status" AS ENUM ('NOT_ACCREDITED', 'ACCREDITED', 'BLOCKED');

-- NOTE: the view's year filter reads MEASURING_ORGANIZATIONS_YEAR_RANGE from
-- system_parameter, seeded by the seed pipeline (systemParameters.json). The subquery
-- falls back to a default of 2 via COALESCE, so the view resolves even before the seed runs.

-- CreateView: organization_summary_view
CREATE OR REPLACE VIEW "organization_summary_view" AS

-- 1. Accredited organizations: does any ACTIVE org_data have an APPROVED submission?
WITH accredited_organizations_ids AS (
  SELECT DISTINCT od.organization_id
  FROM organization_data od
  JOIN submission_subject_organization_data ssod
    ON ssod.organization_data_id = od.id
  JOIN submission s
    ON s.subject_id = ssod.subject_id
    AND s.status IN ('APPROVED', 'APPROVED_AUTOMATICALLY')
  WHERE od.status = 'ACTIVE'
),

-- 2. Organizations latest submission: most recent submission (any status) per organization
organizations_latest_submission_status AS (
  SELECT DISTINCT ON (od.organization_id)
    od.organization_id,
    s.status AS submission_status,
    s.updated_at AS last_submission_updated_at
  FROM organization_data od
  JOIN submission_subject_organization_data ssod
    ON ssod.organization_data_id = od.id
  JOIN submission s
    ON s.subject_id = ssod.subject_id
  ORDER BY od.organization_id, s.id DESC
),

-- 3. Organizations with unsubmitted changes: ACTIVE org_data with no submission at all (true drafts only)
organizations_ids_with_unsubmitted_changes AS (
  SELECT DISTINCT od.organization_id
  FROM organization_data od
  WHERE od.status = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1
      FROM submission_subject_organization_data ssod
      WHERE ssod.organization_data_id = od.id
    )
),

-- 4. Organization displayed data: ACTIVE org_data ranked PENDING(1) > draft(2) > APPROVED/APPROVED_AUTOMATICALLY(3) > REJECTED(4), then newest
organization_displayed_data AS (
  SELECT
    od.*,
    ROW_NUMBER() OVER (
      PARTITION BY od.organization_id
      ORDER BY
        CASE
          WHEN s_active.status = 'PENDING'                    THEN 1
          WHEN s_active.status IS NULL AND s_any.id IS NULL   THEN 2  -- true draft (no submission)
          WHEN s_active.status IN ('APPROVED', 'APPROVED_AUTOMATICALLY') THEN 3
          ELSE                                                     4  -- REJECTED
        END,
        od.id DESC
    ) AS rn
  FROM organization_data od
  LEFT JOIN submission_subject_organization_data ssod
    ON ssod.organization_data_id = od.id
  LEFT JOIN submission s_active
    ON s_active.subject_id = ssod.subject_id
    AND s_active.status IN ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY')
  LEFT JOIN submission s_any
    ON s_any.subject_id = ssod.subject_id
  WHERE od.status = 'ACTIVE'
),

-- 5. Organization carbon inventories summary
-- TODO: update this CTE to consider only CALCULATED and VERIFIED carbon inventories
organization_carbon_inventories_summary AS (
  SELECT
    ci.organization_id,
    TRUE AS has_carbon_inventories,
    MAX(ci.created_at) as last_measurement,
    COALESCE(SUM(csv.value), 0) AS total_emissions
  FROM carbon_inventory ci
  LEFT JOIN carbon_inventory_subtotals_view csv
    ON csv.carbon_inventory_id = ci.id
  WHERE ci.organization_id IS NOT NULL
  AND ci.status NOT IN ('DELETED')
  AND ci.year IS NOT NULL
  AND ci.year >= EXTRACT(YEAR FROM CURRENT_DATE)::int - (COALESCE(
    (SELECT CASE
        WHEN value ~ '^[0-9]+$'
         AND length(value) <= 10
         AND value::bigint BETWEEN 1 AND 2147483647
        THEN value::int
      END
     FROM system_parameter WHERE key = 'MEASURING_ORGANIZATIONS_YEAR_RANGE'),
    2
  ) - 1)
  GROUP BY ci.organization_id
)

SELECT
  o.id                                                     AS organization_id,
  odd.id                                                   AS organization_data_id,
  o.status                                                 AS organization_status,
  COALESCE(odd.trade_name, odd.legal_name, odd.tax_id)     AS name,
  odd.sector_id                                            AS sector_id,
  odd.subsector_id                                         AS subsector_id,
  lss.submission_status::submission_status                 AS last_submission_status,
  lss.last_submission_updated_at                           AS last_submission_updated_at,
  (uioc.organization_id IS NOT NULL)                       AS has_unsubmitted_changes,
  (CASE
    WHEN o.status = 'BLOCKED' THEN 'BLOCKED'
    WHEN acoi.organization_id IS NOT NULL THEN 'ACCREDITED'
    ELSE 'NOT_ACCREDITED'
  END)::organization_summary_display_status                AS display_status,
  (acoi.organization_id IS NOT NULL)                       AS is_accredited,
  COALESCE(ocs.has_carbon_inventories, FALSE)              AS has_carbon_inventories,
  COALESCE(ocs.total_emissions, 0)                         AS total_emissions,
  ocs.last_measurement                                     AS last_measurement

FROM organization o
LEFT JOIN organization_displayed_data odd
  ON odd.organization_id = o.id AND odd.rn = 1
LEFT JOIN accredited_organizations_ids acoi
  ON acoi.organization_id = o.id
LEFT JOIN organizations_latest_submission_status lss
  ON lss.organization_id = o.id
LEFT JOIN organizations_ids_with_unsubmitted_changes uioc
  ON uioc.organization_id = o.id
LEFT JOIN organization_carbon_inventories_summary ocs
  ON ocs.organization_id = o.id
WHERE odd.id IS NOT NULL; -- Only include organizations with ACTIVE reference organization_data

-- CreateView: submission_summary_view
CREATE VIEW submission_summary_view AS
WITH organization_data_submissions AS (
  SELECT
    s.id AS submission_id,
    s.type,
    s.status,
    od.organization_id,
    osv.name AS organization_name,
    EXTRACT(YEAR FROM od.created_at)::INTEGER AS period,
    s.created_at AS requested_at,
    NULL::BIGINT AS carbon_inventory_id,
    NULL::BIGINT AS reduction_project_id
  FROM submission s
  INNER JOIN submission_subject ss ON s.subject_id = ss.id
  INNER JOIN submission_subject_organization_data ssod ON ss.id = ssod.subject_id
  INNER JOIN organization_data od ON ssod.organization_data_id = od.id
  INNER JOIN organization_summary_view osv ON od.organization_id = osv.organization_id
),
carbon_inventory_submissions AS (
  SELECT
    s.id AS submission_id,
    s.type,
    s.status,
    ci.organization_id,
    osv.name AS organization_name,
    ci.year AS period,
    s.created_at AS requested_at,
    ci.id AS carbon_inventory_id,
    NULL::BIGINT AS reduction_project_id
  FROM submission s
  INNER JOIN submission_subject ss ON s.subject_id = ss.id
  INNER JOIN submission_subject_carbon_inventory ssci ON ss.id = ssci.subject_id
  INNER JOIN carbon_inventory ci ON ssci.carbon_inventory_id = ci.id
  INNER JOIN organization_summary_view osv ON ci.organization_id = osv.organization_id
),
reduction_project_submissions AS (
  SELECT
    s.id AS submission_id,
    s.type,
    s.status,
    rp.organization_id,
    osv.name AS organization_name,
    rp.year AS period,
    s.created_at AS requested_at,
    NULL::BIGINT AS carbon_inventory_id,
    rp.id AS reduction_project_id
  FROM submission s
  INNER JOIN submission_subject ss ON s.subject_id = ss.id
  INNER JOIN submission_subject_reduction_projects ssrp ON ss.id = ssrp.subject_id
  INNER JOIN reduction_projects rp ON ssrp.reduction_project_id = rp.id
  INNER JOIN organization_summary_view osv ON rp.organization_id = osv.organization_id
)
SELECT * FROM organization_data_submissions
UNION ALL
SELECT * FROM carbon_inventory_submissions
UNION ALL
SELECT * FROM reduction_project_submissions;

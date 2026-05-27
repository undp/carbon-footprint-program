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
WHERE odd.id IS NOT NULL -- Only include organizations with ACTIVE reference organization_data
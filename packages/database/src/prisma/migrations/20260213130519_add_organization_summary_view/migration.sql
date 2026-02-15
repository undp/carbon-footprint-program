-- CreateView: organization_summary_view
CREATE OR REPLACE VIEW "organization_summary_view" AS
WITH ranked_organization_data AS (
  SELECT
    od.*,
    s.status AS submission_status,
    ROW_NUMBER() OVER (
      PARTITION BY od.organization_id
      ORDER BY
        CASE
          WHEN s.status = 'APPROVED' THEN 1
          WHEN s.status = 'PENDING' THEN 2
          WHEN s.status IS NULL THEN 3
        END,
        od.id DESC
    ) AS rn
  FROM organization_data od
  LEFT JOIN submission_subject_organization_data ssod
    ON ssod.organization_data_id = od.id
  LEFT JOIN submission s
    ON s.subject_id = ssod.subject_id
    AND s.status IN ('PENDING', 'APPROVED')
  WHERE od.status = 'ACTIVE'
),
organization_carbon_stats AS (
  SELECT
    ci.organization_id,
    TRUE AS has_carbon_inventories,
    COALESCE(SUM(csv.value), 0) AS total_emissions
  FROM carbon_inventory ci
  LEFT JOIN carbon_inventory_subtotals_view csv
    ON csv.carbon_inventory_id = ci.id
  WHERE ci.organization_id IS NOT NULL
  GROUP BY ci.organization_id
)
SELECT
  o.id                                                     AS organization_id,
  o.country_id,
  o.status                                                 AS organization_status,
  o.created_at                                             AS organization_created_at,
  o.updated_at                                             AS organization_updated_at,

  -- Reference organization_data fields
  rod.id                                                   AS organization_data_id,
  rod.legal_name,
  rod.trade_name,
  rod.tax_id,
  COALESCE(rod.trade_name, rod.legal_name, rod.tax_id)     AS name,
  rod.sector_id,
  rod.subsector_id,
  rod.country_organization_size_id,
  rod.main_activity_id,
  rod.address,
  rod.employees_count,
  rod.representative_full_name,
  rod.representative_tax_id,
  rod.representative_country_job_position_id,
  rod.representative_phone,
  rod.representative_email,
  rod.created_at                                           AS organization_data_created_at,
  rod.updated_at                                           AS organization_data_updated_at,

  -- Submission state
  rod.submission_status::TEXT                               AS submission_status,

  -- Derived display status
  CASE
    WHEN o.status = 'BLOCKED' THEN 'BLOCKED'
    WHEN rod.submission_status = 'APPROVED' THEN 'ACCREDITED'
    ELSE 'NOT_ACCREDITED'
  END                                                      AS display_status,

  -- Accreditation flag (independent of BLOCKED status, for KPIs)
  COALESCE(rod.submission_status = 'APPROVED', FALSE)      AS is_accredited,

  -- Pre-joined lookup names
  cos.name                                                 AS size_name,
  cs.name                                                  AS sector_name,
  csub.name                                                AS subsector_name,
  oma.name                                                 AS main_activity_name,
  cjp.name                                                 AS representative_position_name,

  -- Carbon inventory stats
  COALESCE(ocs.has_carbon_inventories, FALSE)              AS has_carbon_inventories,
  COALESCE(ocs.total_emissions, 0)                         AS total_emissions,

  -- Last edition timestamp
  GREATEST(o.updated_at, rod.updated_at)                   AS last_edition

FROM organization o
LEFT JOIN ranked_organization_data rod
  ON rod.organization_id = o.id AND rod.rn = 1
LEFT JOIN country_organization_size cos
  ON cos.id = rod.country_organization_size_id
LEFT JOIN country_sector cs
  ON cs.id = rod.sector_id
LEFT JOIN country_subsector csub
  ON csub.id = rod.subsector_id
LEFT JOIN organization_main_activity oma
  ON oma.id = rod.main_activity_id
LEFT JOIN country_job_position cjp
  ON cjp.id = rod.representative_country_job_position_id
LEFT JOIN organization_carbon_stats ocs
  ON ocs.organization_id = o.id;

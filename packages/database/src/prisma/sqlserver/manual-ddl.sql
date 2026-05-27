-- SQL Server manual DDL — the raw-SQL objects Prisma does not emit from the
-- schema (CHECK constraints, partial/filtered unique indexes, views). Apply
-- AFTER `prisma db push` against the SQL Server database. Idempotent.
--
-- This mirrors the PostgreSQL raw-SQL migrations to achieve behavior parity.
-- Ported per docs/architecture/multi-db/view-port-notes.md and null-uniqueness-audit.md.

-- Filtered indexes and views require these SET options (sqlcmd defaults differ).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

------------------------------------------------------------------------------
-- 1. CHECK constraints
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'country_organization_size_position_check')
  ALTER TABLE country_organization_size ADD CONSTRAINT country_organization_size_position_check CHECK ([position] > 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'category_position_check')
  ALTER TABLE category ADD CONSTRAINT category_position_check CHECK ([position] > 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'emission_factor_dimension_position_check')
  ALTER TABLE emission_factor_dimension ADD CONSTRAINT emission_factor_dimension_position_check CHECK ([position] > 0);
GO
-- BIT columns cannot be used directly as booleans in T-SQL; compare to 1/0.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'measurement_unit_base_factor_check')
  ALTER TABLE measurement_unit ADD CONSTRAINT measurement_unit_base_factor_check
    CHECK ((is_base = 1 AND base_factor = 1) OR (is_base = 0 AND base_factor > 0 AND base_factor <> 1));
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'system_parameter_min_max_check')
  ALTER TABLE system_parameter ADD CONSTRAINT system_parameter_min_max_check
    CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value);
GO

------------------------------------------------------------------------------
-- 2. Partial unique indexes -> SQL Server filtered unique indexes
--    (status-/active-scoped; SQL Server treats NULLs as equal, which also
--     covers the PG `NULLS NOT DISTINCT` case on organization_main_activity).
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'country_organization_size_country_id_name_key')
  CREATE UNIQUE INDEX country_organization_size_country_id_name_key ON country_organization_size(country_id, name) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'country_organization_size_country_id_position_active_unique')
  CREATE UNIQUE INDEX country_organization_size_country_id_position_active_unique ON country_organization_size(country_id, [position]) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'country_sector_country_id_name_key')
  CREATE UNIQUE INDEX country_sector_country_id_name_key ON country_sector(country_id, name) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'country_subsector_country_sector_id_name_key')
  CREATE UNIQUE INDEX country_subsector_country_sector_id_name_key ON country_subsector(country_sector_id, name) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'organization_main_activity_name_country_sector_id_country_s_key')
  CREATE UNIQUE INDEX organization_main_activity_name_country_sector_id_country_s_key ON organization_main_activity(name, country_sector_id, country_subsector_id) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'category_methodology_version_id_name_active_unique')
  CREATE UNIQUE INDEX category_methodology_version_id_name_active_unique ON category(methodology_version_id, name) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'category_methodology_version_id_position_active_unique')
  CREATE UNIQUE INDEX category_methodology_version_id_position_active_unique ON category(methodology_version_id, [position]) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'subcategory_category_id_name_active_unique')
  CREATE UNIQUE INDEX subcategory_category_id_name_active_unique ON subcategory(category_id, name) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'emission_factor_dimension_subcategory_id_code_active_unique')
  CREATE UNIQUE INDEX emission_factor_dimension_subcategory_id_code_active_unique ON emission_factor_dimension(subcategory_id, code) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'emission_factor_dimension_subcategory_id_position_active_unique')
  CREATE UNIQUE INDEX emission_factor_dimension_subcategory_id_position_active_unique ON emission_factor_dimension(subcategory_id, [position]) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'emission_factor_dimension_value_dimension_id_value_active_unique')
  CREATE UNIQUE INDEX emission_factor_dimension_value_dimension_id_value_active_unique ON emission_factor_dimension_value(dimension_id, value) WHERE status <> 'DELETED';
GO
-- PG treats NULLs as distinct in unique indexes (so rows with a NULL dimension
-- value never collide), whereas SQL Server treats NULLs as equal. To match PG,
-- restrict the filtered index to rows where the nullable key columns are NOT
-- NULL (rows with a NULL dimension are excluded from uniqueness, as on PG).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'emission_factor_unique_subcategory_dims_source')
  CREATE UNIQUE INDEX emission_factor_unique_subcategory_dims_source ON emission_factor(subcategory_id, dimension_value_1_id, dimension_value_2_id, source)
    WHERE status <> 'DELETED' AND dimension_value_1_id IS NOT NULL AND dimension_value_2_id IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'methodology_version_country_id_name_version_active_unique')
  CREATE UNIQUE INDEX methodology_version_country_id_name_version_active_unique ON methodology_version(country_id, name, version) WHERE status <> 'DELETED';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'user_organization_membership_user_id_organization_id_active_key')
  CREATE UNIQUE INDEX user_organization_membership_user_id_organization_id_active_key ON user_organization_membership(user_id, organization_id) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'badge_type_active_key')
  CREATE UNIQUE INDEX badge_type_active_key ON badge([type]) WHERE status = 'ACTIVE';
GO
-- subsector_id is nullable; match PG NULL-distinct semantics (see above).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'subcategory_recommendation_active_unique')
  CREATE UNIQUE INDEX subcategory_recommendation_active_unique ON subcategory_recommendation(subcategory_id, sector_id, subsector_id)
    WHERE status = 'ACTIVE' AND subsector_id IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'reduction_plan_initiative_subcategory_id_title_active_unique')
  CREATE UNIQUE INDEX reduction_plan_initiative_subcategory_id_title_active_unique ON reduction_plan_initiative(subcategory_id, title) WHERE status = 'ACTIVE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'carbon_inventory_line_input_line_id_active_unique')
  CREATE UNIQUE INDEX carbon_inventory_line_input_line_id_active_unique ON carbon_inventory_line_input(line_id) WHERE is_active = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'submission_only_one_pending_or_approved_per_subject')
  CREATE UNIQUE INDEX submission_only_one_pending_or_approved_per_subject ON submission([type], subject_id) WHERE status IN ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY');
GO

------------------------------------------------------------------------------
-- 3. Nullable unique columns -> filtered indexes WHERE col IS NOT NULL, to
--    match PostgreSQL (which allows many NULLs). db push created plain unique
--    indexes (one NULL only on SQL Server); replace them.
------------------------------------------------------------------------------
-- Prisma's @unique creates these as UNIQUE CONSTRAINTS on SQL Server; drop the
-- constraint (a constraint cannot be filtered) then create a filtered unique index.
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'user_email_key' AND parent_object_id = OBJECT_ID('[user]'))
  ALTER TABLE [user] DROP CONSTRAINT user_email_key;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'user_email_key' AND object_id = OBJECT_ID('[user]'))
  CREATE UNIQUE INDEX user_email_key ON [user](email) WHERE email IS NOT NULL;
GO
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'user_idp_user_id_key' AND parent_object_id = OBJECT_ID('[user]'))
  ALTER TABLE [user] DROP CONSTRAINT user_idp_user_id_key;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'user_idp_user_id_key' AND object_id = OBJECT_ID('[user]'))
  CREATE UNIQUE INDEX user_idp_user_id_key ON [user](idp_user_id) WHERE idp_user_id IS NOT NULL;
GO

------------------------------------------------------------------------------
-- 4. Views (dependency order: subtotals -> sector/org -> submission)
------------------------------------------------------------------------------
CREATE OR ALTER VIEW carbon_inventory_subtotals_view AS
SELECT
    ci.id AS carbon_inventory_id,
    s.category_id,
    l.subcategory_id,
    COALESCE(SUM(r.total_emissions), 0) AS value,
    COUNT(DISTINCT l.id) AS active_lines_count,
    -- SQL Server forbids a subquery inside an aggregate, so precompute the
    -- "completed" line ids via a join instead of EXISTS-in-aggregate.
    COUNT(DISTINCT CASE WHEN completed.line_id IS NOT NULL THEN l.id END) AS active_completed_lines_count
FROM carbon_inventory ci
INNER JOIN carbon_inventory_line l ON l.carbon_inventory_id = ci.id AND l.status = 'ACTIVE'
INNER JOIN subcategory s ON l.subcategory_id = s.id
LEFT JOIN carbon_inventory_line_input i ON i.line_id = l.id AND i.is_active = 1
LEFT JOIN carbon_inventory_line_result r ON r.line_input_id = i.id
LEFT JOIN (
    SELECT DISTINCT i2.line_id
    FROM carbon_inventory_line_input i2
    INNER JOIN carbon_inventory_line_result r2 ON r2.line_input_id = i2.id
    WHERE i2.is_active = 1
) completed ON completed.line_id = l.id
GROUP BY ci.id, s.category_id, l.subcategory_id;
GO

CREATE OR ALTER VIEW carbon_inventory_sector_subtotals_view AS
SELECT sv.carbon_inventory_id, ci.year, ci.status, ci.is_self_declared, od.sector_id, cs.name AS sector_name, sv.value
FROM carbon_inventory_subtotals_view sv
JOIN carbon_inventory ci ON ci.id = sv.carbon_inventory_id
LEFT JOIN (
    SELECT organization_id, sector_id FROM (
        SELECT organization_id, sector_id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY id DESC) AS rn
        FROM organization_data WHERE status = 'ACTIVE'
    ) ranked WHERE rn = 1
) od ON od.organization_id = ci.organization_id
LEFT JOIN country_sector cs ON cs.id = od.sector_id
WHERE ci.organization_id IS NOT NULL;
GO

CREATE OR ALTER VIEW organization_summary_view AS
WITH accredited_organizations_ids AS (
  SELECT DISTINCT od.organization_id
  FROM organization_data od
  JOIN submission_subject_organization_data ssod ON ssod.organization_data_id = od.id
  JOIN submission s ON s.subject_id = ssod.subject_id AND s.status IN ('APPROVED', 'APPROVED_AUTOMATICALLY')
  WHERE od.status = 'ACTIVE'
),
organizations_latest_submission_status AS (
  SELECT organization_id, submission_status, last_submission_updated_at FROM (
    SELECT od.organization_id, s.status AS submission_status, s.updated_at AS last_submission_updated_at,
           ROW_NUMBER() OVER (PARTITION BY od.organization_id ORDER BY s.id DESC) AS rn
    FROM organization_data od
    JOIN submission_subject_organization_data ssod ON ssod.organization_data_id = od.id
    JOIN submission s ON s.subject_id = ssod.subject_id
  ) ranked WHERE rn = 1
),
organizations_ids_with_unsubmitted_changes AS (
  SELECT DISTINCT od.organization_id
  FROM organization_data od
  WHERE od.status = 'ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM submission_subject_organization_data ssod WHERE ssod.organization_data_id = od.id)
),
organization_displayed_data AS (
  SELECT od.id, od.organization_id, od.trade_name, od.legal_name, od.tax_id, od.sector_id, od.subsector_id,
    ROW_NUMBER() OVER (
      PARTITION BY od.organization_id
      ORDER BY CASE
          WHEN s_active.status = 'PENDING' THEN 1
          WHEN s_active.status IS NULL AND s_any.id IS NULL THEN 2
          WHEN s_active.status IN ('APPROVED', 'APPROVED_AUTOMATICALLY') THEN 3
          ELSE 4
        END, od.id DESC
    ) AS rn
  FROM organization_data od
  LEFT JOIN submission_subject_organization_data ssod ON ssod.organization_data_id = od.id
  LEFT JOIN submission s_active ON s_active.subject_id = ssod.subject_id AND s_active.status IN ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY')
  LEFT JOIN submission s_any ON s_any.subject_id = ssod.subject_id
  WHERE od.status = 'ACTIVE'
),
organization_carbon_inventories_summary AS (
  SELECT ci.organization_id,
    CAST(1 AS BIT) AS has_carbon_inventories,
    MAX(ci.created_at) AS last_measurement,
    COALESCE(SUM(csv.value), 0) AS total_emissions
  FROM carbon_inventory ci
  LEFT JOIN carbon_inventory_subtotals_view csv ON csv.carbon_inventory_id = ci.id
  WHERE ci.organization_id IS NOT NULL
    AND ci.status NOT IN ('DELETED')
    AND ci.year IS NOT NULL
    AND ci.year >= YEAR(GETDATE()) - (COALESCE(
      (SELECT CASE
          WHEN sp.value NOT LIKE '%[^0-9]%' AND sp.value <> '' AND LEN(sp.value) <= 10
           AND TRY_CAST(sp.value AS BIGINT) BETWEEN 1 AND 2147483647
          THEN TRY_CAST(sp.value AS INT) END
        FROM system_parameter sp WHERE sp.[key] = 'MEASURING_ORGANIZATIONS_YEAR_RANGE'),
      2) - 1)
  GROUP BY ci.organization_id
)
SELECT
  o.id AS organization_id,
  odd.id AS organization_data_id,
  o.status AS organization_status,
  COALESCE(odd.trade_name, odd.legal_name, odd.tax_id) AS name,
  odd.sector_id AS sector_id,
  odd.subsector_id AS subsector_id,
  lss.submission_status AS last_submission_status,
  lss.last_submission_updated_at AS last_submission_updated_at,
  CAST(CASE WHEN uioc.organization_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS has_unsubmitted_changes,
  (CASE
    WHEN o.status = 'BLOCKED' THEN 'BLOCKED'
    WHEN acoi.organization_id IS NOT NULL THEN 'ACCREDITED'
    ELSE 'NOT_ACCREDITED'
  END) AS display_status,
  CAST(CASE WHEN acoi.organization_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS is_accredited,
  CAST(COALESCE(ocs.has_carbon_inventories, CAST(0 AS BIT)) AS BIT) AS has_carbon_inventories,
  COALESCE(ocs.total_emissions, 0) AS total_emissions,
  ocs.last_measurement AS last_measurement
FROM organization o
LEFT JOIN organization_displayed_data odd ON odd.organization_id = o.id AND odd.rn = 1
LEFT JOIN accredited_organizations_ids acoi ON acoi.organization_id = o.id
LEFT JOIN organizations_latest_submission_status lss ON lss.organization_id = o.id
LEFT JOIN organizations_ids_with_unsubmitted_changes uioc ON uioc.organization_id = o.id
LEFT JOIN organization_carbon_inventories_summary ocs ON ocs.organization_id = o.id
WHERE odd.id IS NOT NULL;
GO

CREATE OR ALTER VIEW submission_summary_view AS
WITH organization_data_submissions AS (
  SELECT s.id AS submission_id, s.[type], s.status, od.organization_id, osv.name AS organization_name,
    YEAR(od.created_at) AS period, s.created_at AS requested_at,
    CAST(NULL AS BIGINT) AS carbon_inventory_id, CAST(NULL AS BIGINT) AS reduction_project_id
  FROM submission s
  INNER JOIN submission_subject ss ON s.subject_id = ss.id
  INNER JOIN submission_subject_organization_data ssod ON ss.id = ssod.subject_id
  INNER JOIN organization_data od ON ssod.organization_data_id = od.id
  INNER JOIN organization_summary_view osv ON od.organization_id = osv.organization_id
),
carbon_inventory_submissions AS (
  SELECT s.id AS submission_id, s.[type], s.status, ci.organization_id, osv.name AS organization_name,
    ci.year AS period, s.created_at AS requested_at,
    ci.id AS carbon_inventory_id, CAST(NULL AS BIGINT) AS reduction_project_id
  FROM submission s
  INNER JOIN submission_subject ss ON s.subject_id = ss.id
  INNER JOIN submission_subject_carbon_inventory ssci ON ss.id = ssci.subject_id
  INNER JOIN carbon_inventory ci ON ssci.carbon_inventory_id = ci.id
  INNER JOIN organization_summary_view osv ON ci.organization_id = osv.organization_id
),
reduction_project_submissions AS (
  SELECT s.id AS submission_id, s.[type], s.status, rp.organization_id, osv.name AS organization_name,
    rp.year AS period, s.created_at AS requested_at,
    CAST(NULL AS BIGINT) AS carbon_inventory_id, rp.id AS reduction_project_id
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
GO

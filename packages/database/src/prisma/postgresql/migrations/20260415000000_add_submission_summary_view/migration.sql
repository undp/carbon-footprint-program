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

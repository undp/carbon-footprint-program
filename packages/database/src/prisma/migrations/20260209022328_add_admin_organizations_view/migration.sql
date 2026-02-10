-- CreateView: admin_organizations_view
CREATE OR REPLACE VIEW "admin_organizations_view" AS
SELECT
    o.id,
    COALESCE(od.trade_name, od.legal_name, od.tax_id) AS name,
    cs.name AS sector,
    csub.name AS subsector,
    cos.name AS size,
    o.status,
    EXISTS (
        SELECT 1 FROM carbon_inventory ci WHERE ci.organization_id = o.id
    ) AS "hasCarbonInventories",
    o.updated_at AS "lastEdition",
    COALESCE(
        (
            SELECT SUM(sv.value)
            FROM carbon_inventory ci2
            INNER JOIN carbon_inventory_subtotals_view sv
                ON sv.carbon_inventory_id = ci2.id
            WHERE ci2.organization_id = o.id
        ),
        0
    ) AS emissions
FROM organization o
LEFT JOIN LATERAL (
    SELECT *
    FROM organization_data od_inner
    WHERE od_inner.organization_id = o.id
      AND (
        -- For ACCREDITED: show the last COMPLETED
        (o.status = 'ACCREDITED' AND od_inner.status = 'COMPLETED') OR
        -- For NOT_ACCREDITED: show DRAFT or SUBMITTED
        (o.status = 'NOT_ACCREDITED' AND od_inner.status IN ('DRAFT', 'SUBMITTED')) OR
        -- For BLOCKED: show last COMPLETED if exists, otherwise last DRAFT/SUBMITTED
        (o.status = 'BLOCKED' AND od_inner.status IN ('COMPLETED', 'DRAFT', 'SUBMITTED'))
      )
    ORDER BY
      -- For BLOCKED: prioritize COMPLETED over DRAFT/SUBMITTED
      CASE WHEN od_inner.status = 'COMPLETED' THEN 1 ELSE 2 END,
      -- Get the latest by id (most recent)
      od_inner.id DESC
    LIMIT 1
) od ON true
LEFT JOIN country_sector cs
    ON cs.id = od.sector_id
LEFT JOIN country_subsector csub
    ON csub.id = od.subsector_id
LEFT JOIN country_organization_size cos
    ON cos.id = od.country_organization_size_id;

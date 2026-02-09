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
LEFT JOIN organization_data od
    ON od.organization_id = o.id AND od.status = 'COMPLETED'
LEFT JOIN country_sector cs
    ON cs.id = od.sector_id
LEFT JOIN country_subsector csub
    ON csub.id = od.subsector_id
LEFT JOIN country_organization_size cos
    ON cos.id = od.country_organization_size_id;

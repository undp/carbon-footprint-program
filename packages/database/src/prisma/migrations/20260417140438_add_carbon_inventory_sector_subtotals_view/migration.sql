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

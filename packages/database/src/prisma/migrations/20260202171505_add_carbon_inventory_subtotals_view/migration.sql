-- CreateView: inventory_totals_view (Prisma expects a table, but we create a view instead)
CREATE OR REPLACE VIEW "carbon_inventory_subtotals_view" AS
SELECT
    ci.id AS carbon_inventory_id,
    s.category_id,
    l.subcategory_id,
    COALESCE(SUM(r.total_emissions), 0) AS value
  FROM carbon_inventory ci
  INNER JOIN carbon_inventory_line l
    ON l.carbon_inventory_id = ci.id 
    AND l.status_id = (
      SELECT id FROM status_catalog 
      WHERE scope = 'ENTITY' AND code = 'ACTIVE'
    )
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

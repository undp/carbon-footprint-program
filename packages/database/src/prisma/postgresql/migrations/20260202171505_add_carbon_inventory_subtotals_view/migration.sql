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

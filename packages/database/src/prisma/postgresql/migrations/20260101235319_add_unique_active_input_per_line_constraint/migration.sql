-- CreatePartialUniqueIndex
-- Add a partial unique index to enforce only one active input per line
-- This ensures that for each carbon_inventory_line, there can be at most one
-- carbon_inventory_line_input with is_active = true
-- Partial indexes are supported in PostgreSQL 7.2+ (project requires PostgreSQL 15+)
CREATE UNIQUE INDEX "carbon_inventory_line_input_line_id_active_unique" 
ON "carbon_inventory_line_input"("line_id") 
WHERE "is_active" = true;
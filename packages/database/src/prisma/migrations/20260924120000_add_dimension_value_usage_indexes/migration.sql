-- Indexes for the "is this dimension value in use?" lookups made by the
-- emission factor dimension maintainer (GET `inUse`) and by the removal guard
-- in updateEmissionFactorDimension / deleteEmissionFactorDimension.
--
-- carbon_inventory_line_input grows with every capture on the platform and
-- keeps its inactive history rows, and Postgres does not index foreign key
-- columns on its own, so without these the probes are sequential scans whose
-- cost follows total platform usage rather than the size of a methodology.
--
-- The predicates match the lookups: a live capture is `is_active`, and only
-- ACTIVE reduction plan initiatives pin a value.
--
-- NOTE: Prisma does not track partial indexes (the WHERE clause) on schema
-- diffs. Preserve these WHERE clauses manually when touching these tables.

-- CreateIndex
CREATE INDEX "carbon_inventory_line_input_selection_1_id_active_idx"
ON "carbon_inventory_line_input"("selection_1_id")
WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "carbon_inventory_line_input_selection_2_id_active_idx"
ON "carbon_inventory_line_input"("selection_2_id")
WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "reduction_plan_initiative_dimension_value_1_id_active_idx"
ON "reduction_plan_initiative"("dimension_value_1_id")
WHERE status = 'ACTIVE';

-- CreateIndex
CREATE INDEX "reduction_plan_initiative_dimension_value_2_id_active_idx"
ON "reduction_plan_initiative"("dimension_value_2_id")
WHERE status = 'ACTIVE';

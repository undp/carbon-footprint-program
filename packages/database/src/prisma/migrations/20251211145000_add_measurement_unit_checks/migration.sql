-- Add CHECK constraint to ensure base units have base_factor = 1 and non-base units have base_factor <> 1
ALTER TABLE "measurement_unit" ADD CONSTRAINT "measurement_unit_base_factor_check" CHECK ((is_base AND base_factor = 1) OR (NOT is_base AND base_factor > 0 AND base_factor <> 1));

-- Add partial unique index to ensure only one base unit per magnitude
CREATE UNIQUE INDEX "measurement_unit_unique_base_per_magnitude" ON "measurement_unit" (magnitude) WHERE is_base;

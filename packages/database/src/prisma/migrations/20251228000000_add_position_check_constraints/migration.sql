-- Add CHECK constraint to ensure position > 0 for Category table
ALTER TABLE "category" ADD CONSTRAINT "category_position_check" CHECK (position > 0);

-- Add CHECK constraint to ensure position > 0 for EmissionFactorDimension table
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_position_check" CHECK (position > 0);


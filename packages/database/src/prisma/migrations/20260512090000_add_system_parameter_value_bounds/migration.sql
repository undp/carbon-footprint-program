-- Add optional numeric bounds to system_parameter rows. These are advisory
-- metadata for editors (admin UI, seed validator) and stay NULL for parameters
-- without numeric semantics (selectors, file-type pointers).
ALTER TABLE "system_parameter"
  ADD COLUMN "min_value" INTEGER,
  ADD COLUMN "max_value" INTEGER,
  ADD CONSTRAINT "system_parameter_min_le_max_check"
    CHECK ("min_value" IS NULL OR "max_value" IS NULL OR "min_value" <= "max_value");

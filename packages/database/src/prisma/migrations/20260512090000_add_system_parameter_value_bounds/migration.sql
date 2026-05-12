-- Add optional numeric bounds to system_parameter rows. These are advisory
-- metadata for editors (admin UI, seed validator) and stay NULL for parameters
-- without numeric semantics (selectors, file-type pointers).
ALTER TABLE "system_parameter"
  ADD COLUMN "min_value" INTEGER,
  ADD COLUMN "max_value" INTEGER;

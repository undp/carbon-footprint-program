-- CreateEnum
CREATE TYPE "emission_factor_dimension_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "emission_factor_dimension_value_status" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "emission_factor_dimension"
ADD COLUMN "status" "emission_factor_dimension_status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "emission_factor_dimension_value"
ADD COLUMN "status" "emission_factor_dimension_value_status";

-- Backfill status values from the legacy model
UPDATE "emission_factor_dimension"
SET "status" = 'ACTIVE'
WHERE "status" IS NULL;

UPDATE "emission_factor_dimension_value"
SET "status" = CASE
  WHEN "is_active" THEN 'ACTIVE'::"emission_factor_dimension_value_status"
  ELSE 'DELETED'::"emission_factor_dimension_value_status"
END
WHERE "status" IS NULL;

-- Finalize NOT NULL after backfill
ALTER TABLE "emission_factor_dimension_value"
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Drop the legacy boolean flag
ALTER TABLE "emission_factor_dimension_value"
DROP COLUMN "is_active";

-- Replace hard uniqueness with active-only uniqueness
DROP INDEX IF EXISTS "emission_factor_dimension_subcategory_id_code_key";
DROP INDEX IF EXISTS "emission_factor_dimension_subcategory_id_position_key";
DROP INDEX IF EXISTS "emission_factor_dimension_value_dimension_id_value_key";

CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_code_active_unique"
  ON "emission_factor_dimension" ("subcategory_id", "code")
  WHERE "status" <> 'DELETED';

CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_position_active_unique"
  ON "emission_factor_dimension" ("subcategory_id", "position")
  WHERE "status" <> 'DELETED';

CREATE UNIQUE INDEX "emission_factor_dimension_value_dimension_id_value_active_unique"
  ON "emission_factor_dimension_value" ("dimension_id", "value")
  WHERE "status" <> 'DELETED';

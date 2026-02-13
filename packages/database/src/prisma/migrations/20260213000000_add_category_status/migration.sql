-- CreateEnum
CREATE TYPE "category_status" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable: Add status column with default ACTIVE
ALTER TABLE "category" ADD COLUMN "status" "category_status" NOT NULL DEFAULT 'ACTIVE';

-- DropIndex: Remove existing non-partial unique constraints
DROP INDEX "category_methodology_version_id_name_key";
DROP INDEX "category_methodology_version_id_position_key";

-- CreateIndex: Partial unique indexes excluding DELETED rows
CREATE UNIQUE INDEX "category_methodology_version_id_name_active_unique"
  ON "category" ("methodology_version_id", "name")
  WHERE "status" <> 'DELETED';

CREATE UNIQUE INDEX "category_methodology_version_id_position_active_unique"
  ON "category" ("methodology_version_id", "position")
  WHERE "status" <> 'DELETED';

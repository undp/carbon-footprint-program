-- DropForeignKey
ALTER TABLE "explanation" DROP CONSTRAINT "explanation_created_by_id_fkey";

-- AlterTable: drop createdById and add new columns. Add `name` as nullable
-- first so the migration is safe even if the table is non-empty in some
-- environments. Existing rows are backfilled with `slug` as a placeholder
-- (the seed will overwrite this with the catalog name on the next reseed),
-- then the column is altered to NOT NULL.
ALTER TABLE "explanation" DROP COLUMN "created_by_id",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT;

UPDATE "explanation" SET "name" = "slug" WHERE "name" IS NULL;

ALTER TABLE "explanation" ALTER COLUMN "name" SET NOT NULL;

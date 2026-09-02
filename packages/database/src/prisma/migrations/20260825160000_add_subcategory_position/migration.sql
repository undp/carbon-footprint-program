-- Subcategories are now explicitly ordered inside their category. Alphabetical
-- order cannot express the GHG Protocol numbering that Scope 3 (category 3)
-- must follow, so ordering moves to a `position` column, mirroring `category`.
-- Existing rows are backfilled with the alphabetical order they were already
-- displayed in, so this migration alone changes nothing visible: the new
-- ordering ships as seed data.
ALTER TABLE "subcategory" ADD COLUMN "position" INTEGER;

UPDATE "subcategory" AS s
SET "position" = alphabetical."position"
FROM (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "category_id" ORDER BY "name") AS "position"
  FROM "subcategory"
) AS alphabetical
WHERE s."id" = alphabetical."id";

ALTER TABLE "subcategory" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_position_check" CHECK (position > 0);

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "subcategory_category_id_position_active_unique"
  ON "subcategory" ("category_id", "position")
  WHERE "status" <> 'DELETED';

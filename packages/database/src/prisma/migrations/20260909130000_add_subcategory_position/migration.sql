-- Subcategories are now explicitly ordered inside their category. Alphabetical
-- order cannot express the GHG Protocol numbering that Scope 3 (category 3)
-- must follow, so ordering moves to a `position` column, mirroring `category`.
-- Existing rows are backfilled with the alphabetical order they were already
-- displayed in, so this migration alone changes nothing visible: the new
-- ordering ships as seed data.
ALTER TABLE "subcategory" ADD COLUMN "position" INTEGER;

-- DELETED rows are numbered last, not in line with the live ones. The column is
-- NOT NULL so they need a value, but they are excluded from the partial unique
-- index below, so their positions are free to sit after (or collide with) the
-- live ones. Numbering them in line would spend a slot each and leave the live
-- sequence with holes -- a category holding Alpha (ACTIVE), Beta (DELETED),
-- Gamma (ACTIVE) would show positions 1 and 3 in the maintainer's "Pos." column
-- and in the methodology export, forever on any methodology the next migration
-- does not renumber. `status = 'DELETED'` sorts false before true.
UPDATE "subcategory" AS s
SET "position" = alphabetical."position"
FROM (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "category_id"
      ORDER BY ("status" = 'DELETED'), "name"
    ) AS "position"
  FROM "subcategory"
) AS alphabetical
WHERE s."id" = alphabetical."id";

ALTER TABLE "subcategory" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_position_check" CHECK (position > 0);

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "subcategory_category_id_position_active_unique"
  ON "subcategory" ("category_id", "position")
  WHERE "status" <> 'DELETED';

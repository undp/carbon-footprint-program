-- Enforce one-file-per-line at the database level. The application also
-- raises FileAlreadyLinkedError before insert, but the unique constraint
-- makes the invariant non-bypassable.

-- DropIndex
DROP INDEX "carbon_inventory_line_file_file_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "carbon_inventory_line_file_file_id_key" ON "carbon_inventory_line_file"("file_id");

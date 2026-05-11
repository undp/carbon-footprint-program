-- CreateTable
CREATE TABLE "carbon_inventory_line_file" (
    "line_id" BIGINT NOT NULL,
    "file_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_file_pkey" PRIMARY KEY ("line_id","file_id")
);

-- CreateIndex
CREATE INDEX "carbon_inventory_line_file_file_id_idx" ON "carbon_inventory_line_file"("file_id");

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "carbon_inventory_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

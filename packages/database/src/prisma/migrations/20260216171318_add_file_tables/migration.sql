-- CreateEnum
CREATE TYPE "file_type" AS ENUM ('ORGANIZATION_DATA_ATTACHMENT', 'CARBON_INVENTORY_ATTACHMENT', 'CARBON_INVENTORY_LINE_INPUT_ATTACHMENT', 'SUBMISSION_ATTACHMENT');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "file" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "file_type" "file_type" NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "blob_path" TEXT NOT NULL,
    "status" "file_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" BIGINT NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_uuid_key" ON "file"("uuid");

-- CreateTable
CREATE TABLE "organization_data_file" (
    "file_id" BIGINT NOT NULL,
    "organization_data_id" BIGINT NOT NULL,

    CONSTRAINT "organization_data_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_file" (
    "file_id" BIGINT NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,

    CONSTRAINT "carbon_inventory_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_line_file" (
    "file_id" BIGINT NOT NULL,
    "carbon_inventory_line_id" BIGINT NOT NULL,

    CONSTRAINT "carbon_inventory_line_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "submission_file" (
    "file_id" BIGINT NOT NULL,
    "submission_id" BIGINT NOT NULL,

    CONSTRAINT "submission_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateIndex (parent FK indexes for join tables)
CREATE INDEX "organization_data_file_organization_data_id_idx" ON "organization_data_file"("organization_data_id");
CREATE INDEX "carbon_inventory_file_carbon_inventory_id_idx" ON "carbon_inventory_file"("carbon_inventory_id");
CREATE INDEX "carbon_inventory_line_file_carbon_inventory_line_id_idx" ON "carbon_inventory_line_file"("carbon_inventory_line_id");
CREATE INDEX "submission_file_submission_id_idx" ON "submission_file"("submission_id");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data_file" ADD CONSTRAINT "organization_data_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data_file" ADD CONSTRAINT "organization_data_file_organization_data_id_fkey" FOREIGN KEY ("organization_data_id") REFERENCES "organization_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_file" ADD CONSTRAINT "carbon_inventory_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_file" ADD CONSTRAINT "carbon_inventory_file_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_carbon_inventory_line_id_fkey" FOREIGN KEY ("carbon_inventory_line_id") REFERENCES "carbon_inventory_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

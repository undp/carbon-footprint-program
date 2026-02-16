-- CreateEnum
CREATE TYPE "file_owner_type" AS ENUM ('ORGANIZATION', 'CARBON_INVENTORY');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "file" (
    "id" BIGSERIAL NOT NULL,
    "owner_type" "file_owner_type" NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "blob_path" TEXT NOT NULL,
    "status" "file_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" BIGINT NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_file" (
    "file_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,

    CONSTRAINT "organization_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_file" (
    "file_id" BIGINT NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,

    CONSTRAINT "carbon_inventory_file_pkey" PRIMARY KEY ("file_id")
);

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_file" ADD CONSTRAINT "organization_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_file" ADD CONSTRAINT "organization_file_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_file" ADD CONSTRAINT "carbon_inventory_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_file" ADD CONSTRAINT "carbon_inventory_file_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

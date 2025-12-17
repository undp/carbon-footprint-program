-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'DELETED');

-- CreateEnum
CREATE TYPE "usage_mode" AS ENUM ('SIMPLIFIED', 'EXPERT');

-- CreateTable
CREATE TABLE "carbon_inventory" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT,
    "organization_branch_id" BIGINT,
    "organization_data" JSONB NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "inventory_status" NOT NULL DEFAULT 'DRAFT',
    "usage_mode" "usage_mode" NOT NULL,
    "methodology_version_id" BIGINT,
    "preselected_nodes_id" BIGINT,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

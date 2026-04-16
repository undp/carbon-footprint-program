-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "usage_mode" AS ENUM ('SIMPLIFIED', 'EXPERT');

-- CreateTable
CREATE TABLE "carbon_inventory" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "organization_id" BIGINT,
    "organization_branch_id" BIGINT,
    "organization_data" JSONB,
    "year" INTEGER,
    "status" "inventory_status" NOT NULL DEFAULT 'ACTIVE',
    "usage_mode" "usage_mode" NOT NULL,
    "is_self_declared" BOOLEAN NOT NULL DEFAULT false,
    "self_declared_at" TIMESTAMP(3),
    "methodology_version_id" BIGINT NOT NULL,
    "preselected_nodes_id" BIGINT,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,
    "self_declared_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_self_declared_by_id_fkey" FOREIGN KEY ("self_declared_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

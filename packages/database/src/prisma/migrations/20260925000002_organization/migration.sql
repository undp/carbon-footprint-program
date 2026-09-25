-- Organizations, their versioned profile data, and user memberships.

-- CreateEnum
CREATE TYPE "organization_status" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "organization_data_status" AS ENUM ('ACTIVE', 'OUTDATED');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('ACTIVE', 'OUTDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "organization_role" AS ENUM ('VIEWER', 'CONTRIBUTOR', 'ADMIN');

-- CreateTable
CREATE TABLE "organization" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "status" "organization_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_data" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "status" "organization_data_status" NOT NULL DEFAULT 'ACTIVE',
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "tax_id" TEXT,
    "country_organization_size_id" BIGINT,
    "sector_id" BIGINT,
    "main_activity_id" BIGINT,
    "subsector_id" BIGINT,
    "address" TEXT,
    "employees_count" INTEGER,
    "representative_full_name" TEXT,
    "representative_tax_id" TEXT,
    "representative_country_job_position_id" BIGINT,
    "representative_phone" TEXT,
    "representative_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "organization_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_organization_membership" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "role" "organization_role" NOT NULL DEFAULT 'VIEWER',
    "status" "membership_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "user_organization_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_organization_membership_user_id_organization_id_idx" ON "user_organization_membership"("user_id", "organization_id");

-- CreateIndex: partial unique index — at most one ACTIVE membership per user per org.
-- NOTE: Prisma does not track partial indexes (the WHERE clause) on schema diffs.
-- Preserve this WHERE clause manually when touching this table.
CREATE UNIQUE INDEX "user_organization_membership_user_id_organization_id_active_key" ON "user_organization_membership"("user_id", "organization_id") WHERE status = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_country_organization_size_id_fkey" FOREIGN KEY ("country_organization_size_id") REFERENCES "country_organization_size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "country_sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_subsector_id_fkey" FOREIGN KEY ("subsector_id") REFERENCES "country_subsector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_main_activity_id_fkey" FOREIGN KEY ("main_activity_id") REFERENCES "organization_main_activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_representative_country_job_position_id_fkey" FOREIGN KEY ("representative_country_job_position_id") REFERENCES "country_job_position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

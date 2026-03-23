-- CreateEnum
CREATE TYPE "greenhouse_gas" AS ENUM ('CO2', 'CH4', 'HIDROFLUOROCARBONADOS', 'PERFLUOROCARBONADOS', 'SF6', 'NF3');

-- CreateEnum
CREATE TYPE "reduction_project_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "reduction_project_file_type" AS ENUM ('REDUCTION_REPORT', 'VERIFICATION_REPORT', 'SELF_DECLARATION');

-- CreateEnum (if not exists from prior db state)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_subject_type') THEN
    CREATE TYPE "submission_subject_type" AS ENUM ('CARBON_INVENTORY', 'ORGANIZATION_DATA');
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "submission_subject_type" ADD VALUE IF NOT EXISTS 'REDUCTION_PROJECT';

-- CreateTable
CREATE TABLE "submission_subject_reduction_project" (
    "subject_id" BIGINT NOT NULL,
    "reduction_project_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_reduction_project_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "organization_branch" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "organization_branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reduction_project" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "organization_branch_id" BIGINT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "implementation_date" DATE,
    "subcategory_id" BIGINT,
    "pcg" TEXT,
    "selected_gases" "greenhouse_gas"[],
    "reported_in_other_initiative" BOOLEAN NOT NULL DEFAULT false,
    "other_initiative_description" TEXT,
    "reduction_year" INTEGER,
    "baseline_value" DECIMAL(28,10),
    "project_value" DECIMAL(28,10),
    "reduction_value" DECIMAL(28,10),
    "status" "reduction_project_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reduction_project_file" (
    "id" BIGSERIAL NOT NULL,
    "reduction_project_id" BIGINT NOT NULL,
    "file_type" "reduction_project_file_type" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_project_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_reduction_project_reduction_project_id_key" ON "submission_subject_reduction_project"("reduction_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_branch_organization_id_name_key" ON "organization_branch"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_project" ADD CONSTRAINT "submission_subject_reduction_project_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_project" ADD CONSTRAINT "submission_subject_reduction_project_reduction_project_id_fkey" FOREIGN KEY ("reduction_project_id") REFERENCES "reduction_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branch" ADD CONSTRAINT "organization_branch_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branch" ADD CONSTRAINT "organization_branch_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branch" ADD CONSTRAINT "organization_branch_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project" ADD CONSTRAINT "reduction_project_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project" ADD CONSTRAINT "reduction_project_organization_branch_id_fkey" FOREIGN KEY ("organization_branch_id") REFERENCES "organization_branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project" ADD CONSTRAINT "reduction_project_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project" ADD CONSTRAINT "reduction_project_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project" ADD CONSTRAINT "reduction_project_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_file" ADD CONSTRAINT "reduction_project_file_reduction_project_id_fkey" FOREIGN KEY ("reduction_project_id") REFERENCES "reduction_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_file" ADD CONSTRAINT "reduction_project_file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_file" ADD CONSTRAINT "reduction_project_file_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

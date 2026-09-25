-- Submissions (postulaciones) and what they are about: organization data,
-- carbon inventories and reduction projects. A submission may carry attached
-- files and, once approved, the badge it granted.

-- CreateEnum
CREATE TYPE "submission_type" AS ENUM ('ORGANIZATION_ACCREDITATION', 'CARBON_INVENTORY_CALCULATION', 'CARBON_INVENTORY_VERIFICATION', 'REDUCTION_PROJECT_VERIFICATION', 'NEUTRALIZATION_PLAN_VERIFICATION');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY', 'REVIEWED', 'REJECTED');

-- CreateEnum
CREATE TYPE "submission_file_type" AS ENUM ('SUBMIT_ATTACHMENT', 'RECOGNITION', 'REVIEW_ATTACHMENT');

-- CreateEnum
CREATE TYPE "badge_type" AS ENUM ('ORGANIZATION_ACCREDITATION', 'CARBON_INVENTORY_CALCULATION', 'CARBON_INVENTORY_VERIFICATION', 'REDUCTION_PROJECT_VERIFICATION', 'NEUTRALIZATION_PLAN_VERIFICATION');

-- CreateEnum
CREATE TYPE "badge_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "reduction_project_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "submission_subject" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,

    CONSTRAINT "submission_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_subject_organization_data" (
    "subject_id" BIGINT NOT NULL,
    "organization_data_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_organization_data_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "submission_subject_carbon_inventory" (
    "subject_id" BIGINT NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_carbon_inventory_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
-- Reduction projects can be saved as partial drafts: the fields only required
-- to submit are nullable, and considered_gei defaults to an empty array.
CREATE TABLE "reduction_projects" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,
    "implementation_date" TEXT,
    "description" TEXT,
    "subcategory_id" BIGINT,
    "gwp_used" TEXT,
    "considered_gei" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reported_elsewhere" BOOLEAN NOT NULL DEFAULT false,
    "reported_elsewhere_description" TEXT,
    "year" INTEGER,
    "baseline_scenario" DECIMAL(15,4),
    "project_scenario" DECIMAL(15,4),
    "status" "reduction_project_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_subject_reduction_projects" (
    "subject_id" BIGINT NOT NULL,
    "reduction_project_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_reduction_projects_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable: badge catalog
CREATE TABLE "badge" (
    "id"         BIGSERIAL NOT NULL,
    "type"       "badge_type"   NOT NULL,
    "status"     "badge_status" NOT NULL DEFAULT 'ACTIVE',
    "file_id"    BIGINT         NOT NULL,
    "created_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- badge_id is set on approval.
CREATE TABLE "submission" (
    "id" BIGSERIAL NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "type" "submission_type" NOT NULL,
    "badge_id" BIGINT,
    "status" "submission_status" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" BIGINT,
    "review_comments" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_file" (
    "file_id" BIGINT NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "type" "submission_file_type" NOT NULL DEFAULT 'SUBMIT_ATTACHMENT',

    CONSTRAINT "submission_file_pkey" PRIMARY KEY ("file_id","submission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_organization_data_organization_data_id_key" ON "submission_subject_organization_data"("organization_data_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_carbon_inventory_carbon_inventory_id_key" ON "submission_subject_carbon_inventory"("carbon_inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_reduction_projects_reduction_project_id_key" ON "submission_subject_reduction_projects"("reduction_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_file_id_key" ON "badge"("file_id");

-- Only one ACTIVE badge per type (partial unique index, managed manually — Prisma does
-- not track the WHERE clause on schema diffs).
CREATE UNIQUE INDEX "badge_type_active_key" ON "badge"("type") WHERE status = 'ACTIVE';

-- Only one submission can be PENDING, APPROVED, or APPROVED_AUTOMATICALLY for a submission subject
-- (partial unique index, managed manually — Prisma does not track the WHERE clause on schema diffs).
CREATE UNIQUE INDEX "submission_only_one_pending_or_approved_per_subject" ON "submission"("type", "subject_id") WHERE "status" IN ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY');

-- CreateIndex
CREATE INDEX "submission_badge_id_idx" ON "submission"("badge_id");

-- CreateIndex
CREATE INDEX "submission_file_submission_id_idx" ON "submission_file"("submission_id");

-- AddForeignKey
ALTER TABLE "submission_subject" ADD CONSTRAINT "submission_subject_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_organization_data" ADD CONSTRAINT "submission_subject_organization_data_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_organization_data" ADD CONSTRAINT "submission_subject_organization_data_organization_data_id_fkey" FOREIGN KEY ("organization_data_id") REFERENCES "organization_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_carbon_inventory" ADD CONSTRAINT "submission_subject_carbon_inventory_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_carbon_inventory" ADD CONSTRAINT "submission_subject_carbon_inventory_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_projects" ADD CONSTRAINT "submission_subject_reduction_projects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_projects" ADD CONSTRAINT "submission_subject_reduction_projects_reduction_project_id_fkey" FOREIGN KEY ("reduction_project_id") REFERENCES "reduction_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge" ADD CONSTRAINT "badge_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_file" ADD CONSTRAINT "submission_file_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

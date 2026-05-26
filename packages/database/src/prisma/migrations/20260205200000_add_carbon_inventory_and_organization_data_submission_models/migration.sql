-- CreateEnum
CREATE TYPE "submission_type" AS ENUM ('ORGANIZATION_ACCREDITATION', 'CARBON_INVENTORY_CALCULATION', 'CARBON_INVENTORY_VERIFICATION', 'REDUCTION_PROJECT_VERIFICATION', 'NEUTRALIZATION_PLAN_VERIFICATION');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY', 'REVIEWED', 'REJECTED');

-- CreateTable
CREATE TABLE "submission_subject" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,

    CONSTRAINT "submission_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_subject_carbon_inventory" (
    "subject_id" BIGINT NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_carbon_inventory_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "submission_subject_organization_data" (
    "subject_id" BIGINT NOT NULL,
    "organization_data_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_organization_data_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" BIGSERIAL NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "type" "submission_type" NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_carbon_inventory_carbon_inventory_id_key" ON "submission_subject_carbon_inventory"("carbon_inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_organization_data_organization_data_id_key" ON "submission_subject_organization_data"("organization_data_id");

-- AddForeignKey
ALTER TABLE "submission_subject" ADD CONSTRAINT "submission_subject_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_carbon_inventory" ADD CONSTRAINT "submission_subject_carbon_inventory_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_carbon_inventory" ADD CONSTRAINT "submission_subject_carbon_inventory_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_organization_data" ADD CONSTRAINT "submission_subject_organization_data_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_organization_data" ADD CONSTRAINT "submission_subject_organization_data_organization_data_id_fkey" FOREIGN KEY ("organization_data_id") REFERENCES "organization_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Only one submission can be PENDING, APPROVED, or APPROVED_AUTOMATICALLY for a submission subject
CREATE UNIQUE INDEX "submission_only_one_pending_or_approved_per_subject" ON "submission"("type", "subject_id") WHERE "status" IN ('PENDING', 'APPROVED', 'APPROVED_AUTOMATICALLY');

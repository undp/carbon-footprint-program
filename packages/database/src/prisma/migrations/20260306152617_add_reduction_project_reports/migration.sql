/*
  Warnings:

  - You are about to drop the column `baseline_value` on the `reduction_project` table. All the data in the column will be lost.
  - You are about to drop the column `project_value` on the `reduction_project` table. All the data in the column will be lost.
  - You are about to drop the column `reduction_value` on the `reduction_project` table. All the data in the column will be lost.
  - You are about to drop the column `reduction_year` on the `reduction_project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "file" DROP CONSTRAINT "file_created_by_id_fkey";

-- AlterTable
ALTER TABLE "reduction_project" DROP COLUMN "baseline_value",
DROP COLUMN "project_value",
DROP COLUMN "reduction_value",
DROP COLUMN "reduction_year",
ADD COLUMN     "use_pcg_national_inventory" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "reduction_project_report" (
    "id" BIGSERIAL NOT NULL,
    "reduction_project_id" BIGINT NOT NULL,
    "reduction_year" INTEGER NOT NULL,
    "baseline_value" DECIMAL(28,10) NOT NULL,
    "project_value" DECIMAL(28,10) NOT NULL,
    "reduction_value" DECIMAL(28,10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_project_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reduction_project_report_reduction_project_id_reduction_yea_key" ON "reduction_project_report"("reduction_project_id", "reduction_year");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_report" ADD CONSTRAINT "reduction_project_report_reduction_project_id_fkey" FOREIGN KEY ("reduction_project_id") REFERENCES "reduction_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_report" ADD CONSTRAINT "reduction_project_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_project_report" ADD CONSTRAINT "reduction_project_report_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

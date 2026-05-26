-- New enums
CREATE TYPE "badge_type"   AS ENUM ('ORGANIZATION_ACCREDITATION', 'CARBON_INVENTORY_CALCULATION', 'CARBON_INVENTORY_VERIFICATION', 'REDUCTION_PROJECT_VERIFICATION', 'NEUTRALIZATION_PLAN_VERIFICATION');
CREATE TYPE "badge_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- Badge catalog table
CREATE TABLE "badge" (
    "id"         BIGSERIAL NOT NULL,
    "type"       "badge_type"   NOT NULL,
    "status"     "badge_status" NOT NULL DEFAULT 'ACTIVE',
    "file_id"    BIGINT         NOT NULL,
    "created_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "badge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "badge_file_id_key" ON "badge"("file_id");

ALTER TABLE "badge"
  ADD CONSTRAINT "badge_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- badge_id directly on submission (nullable — set on approval)
ALTER TABLE "submission"
  ADD COLUMN "badge_id" BIGINT;

ALTER TABLE "submission"
  ADD CONSTRAINT "submission_badge_id_fkey"
  FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "reduction_plan_initiative_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "reduction_plan_initiative" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "dimension_value_1_id" BIGINT,
    "dimension_value_2_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "reduction_plan_initiative_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_plan_initiative_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reduction_plan_initiative" ADD CONSTRAINT "reduction_plan_initiative_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_plan_initiative" ADD CONSTRAINT "reduction_plan_initiative_dimension_value_1_id_fkey" FOREIGN KEY ("dimension_value_1_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_plan_initiative" ADD CONSTRAINT "reduction_plan_initiative_dimension_value_2_id_fkey" FOREIGN KEY ("dimension_value_2_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_plan_initiative" ADD CONSTRAINT "reduction_plan_initiative_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_plan_initiative" ADD CONSTRAINT "reduction_plan_initiative_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index — at most one ACTIVE initiative per (subcategory, title)
CREATE UNIQUE INDEX "reduction_plan_initiative_subcategory_id_title_active_unique"
  ON "reduction_plan_initiative"("subcategory_id", "title")
  WHERE status = 'ACTIVE';

-- CreateEnum
CREATE TYPE "initiative_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "initiative" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "dimension_value_1_id" BIGINT,
    "dimension_value_2_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "initiative_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "initiative_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_dimension_value_1_id_fkey" FOREIGN KEY ("dimension_value_1_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_dimension_value_2_id_fkey" FOREIGN KEY ("dimension_value_2_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

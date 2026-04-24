-- CreateEnum
CREATE TYPE "subcategory_recommendation_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "subcategory_recommendation" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "sector_id" BIGINT NOT NULL,
    "subsector_id" BIGINT,
    "status" "subcategory_recommendation_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "subcategory_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (partial unique index — only ACTIVE rows)
CREATE UNIQUE INDEX "subcategory_recommendation_active_unique" ON "subcategory_recommendation" ("subcategory_id", "sector_id", "subsector_id") WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "country_sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_subsector_id_fkey" FOREIGN KEY ("subsector_id") REFERENCES "country_subsector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

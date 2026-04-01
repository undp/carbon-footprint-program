-- AlterTable
ALTER TABLE "carbon_inventory" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateTable
CREATE TABLE "subcategory_recommendation" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "sector_id" BIGINT NOT NULL,
    "subsector_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "subcategory_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_recommendation_subcategory_id_sector_id_subsect_key" ON "subcategory_recommendation"("subcategory_id", "sector_id", "subsector_id");

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "country_sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_recommendation" ADD CONSTRAINT "subcategory_recommendation_subsector_id_fkey" FOREIGN KEY ("subsector_id") REFERENCES "country_subsector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

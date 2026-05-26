-- CreateEnum
CREATE TYPE "organization_main_activity_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "organization_main_activity" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "organization_main_activity_status" NOT NULL DEFAULT 'ACTIVE',
    "country_sector_id" BIGINT,
    "country_subsector_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "organization_main_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_main_activity_name_country_sector_id_country_s_key" ON "organization_main_activity"("name", "country_sector_id", "country_subsector_id");

-- AddForeignKey
ALTER TABLE "organization_main_activity" ADD CONSTRAINT "organization_main_activity_country_sector_id_fkey" FOREIGN KEY ("country_sector_id") REFERENCES "country_sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_main_activity" ADD CONSTRAINT "organization_main_activity_country_subsector_id_fkey" FOREIGN KEY ("country_subsector_id") REFERENCES "country_subsector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_main_activity" ADD CONSTRAINT "organization_main_activity_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_main_activity" ADD CONSTRAINT "organization_main_activity_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

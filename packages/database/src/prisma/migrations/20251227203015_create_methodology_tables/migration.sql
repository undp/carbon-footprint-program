-- CreateEnum
CREATE TYPE "methodology_version_status" AS ENUM ('PUBLISHED', 'UNPUBLISHED', 'DELETED');

-- CreateEnum
CREATE TYPE "category_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "emission_factor_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "subcategory_status" AS ENUM ('ACTIVE', 'DELETED'); 

-- CreateEnum
CREATE TYPE "emission_factor_dimension_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "emission_factor_dimension_value_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "methodology_version" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "methodology_version_status" NOT NULL,
    "regulation" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "methodology_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" BIGSERIAL NOT NULL,
    "methodology_version_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "synonyms" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "category_status" NOT NULL DEFAULT 'ACTIVE',
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_position_check" CHECK (position > 0)
);

-- CreateTable
CREATE TABLE "subcategory" (
    "id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "subcategory_status" NOT NULL DEFAULT 'ACTIVE',
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emission_factor_dimension" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL,
    "status" "emission_factor_dimension_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "emission_factor_dimension_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "emission_factor_dimension_position_check" CHECK (position > 0)
);

-- CreateTable
CREATE TABLE "emission_factor_dimension_value" (
    "id" BIGSERIAL NOT NULL,
    "dimension_id" BIGINT NOT NULL,
    "parent_value_id" BIGINT,
    "value" TEXT NOT NULL,
    "status" "emission_factor_dimension_value_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "emission_factor_dimension_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emission_factor" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "dimension_value_1_id" BIGINT,
    "dimension_value_2_id" BIGINT,
    "rate_measurement_unit_id" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "gas_details" JSONB NOT NULL,
    "value" DECIMAL(28,10) NOT NULL,
    "status" "emission_factor_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "emission_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory_measurement_unit" (
    "id" BIGSERIAL NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "measurement_unit_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcategory_measurement_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "methodology_version_country_id_name_version_active_unique" ON "methodology_version" ("country_id", "name", "version") WHERE "status" <> 'DELETED';

-- CreateIndex: Partial unique indexes excluding DELETED rows
CREATE UNIQUE INDEX "category_methodology_version_id_name_active_unique"
  ON "category" ("methodology_version_id", "name")
  WHERE "status" <> 'DELETED';

-- CreateIndex
CREATE UNIQUE INDEX "category_methodology_version_id_position_active_unique"
  ON "category" ("methodology_version_id", "position")
  WHERE "status" <> 'DELETED';
  
-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "subcategory_category_id_name_active_unique"
  ON "subcategory" ("category_id", "name")
  WHERE "status" <> 'DELETED';

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_code_active_unique"
  ON "emission_factor_dimension" ("subcategory_id", "code")
  WHERE "status" <> 'DELETED';

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_position_active_unique"
  ON "emission_factor_dimension" ("subcategory_id", "position")
  WHERE "status" <> 'DELETED';

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "emission_factor_dimension_value_dimension_id_value_active_unique"
  ON "emission_factor_dimension_value" ("dimension_id", "value")
  WHERE "status" <> 'DELETED';

-- CreateIndex: Partial unique index excluding DELETED rows
CREATE UNIQUE INDEX "emission_factor_unique_subcategory_dims_source"
  ON "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source")
  WHERE "status" <> 'DELETED';

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_measurement_unit_subcategory_id_measurement_uni_key" ON "subcategory_measurement_unit"("subcategory_id", "measurement_unit_id");

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_methodology_version_id_fkey" FOREIGN KEY ("methodology_version_id") REFERENCES "methodology_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "emission_factor_dimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_parent_value_id_fkey" FOREIGN KEY ("parent_value_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_dimension_value_1_id_fkey" FOREIGN KEY ("dimension_value_1_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_dimension_value_2_id_fkey" FOREIGN KEY ("dimension_value_2_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_rate_measurement_unit_id_fkey" FOREIGN KEY ("rate_measurement_unit_id") REFERENCES "rate_measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_methodology_version_id_fkey" FOREIGN KEY ("methodology_version_id") REFERENCES "methodology_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_measurement_unit" ADD CONSTRAINT "subcategory_measurement_unit_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_measurement_unit" ADD CONSTRAINT "subcategory_measurement_unit_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


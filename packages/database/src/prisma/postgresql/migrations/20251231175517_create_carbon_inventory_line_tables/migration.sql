-- CreateEnum
CREATE TYPE "carbon_inventory_line_status" AS ENUM ('ACTIVE', 'OUTDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "input_type" AS ENUM ('SIMPLIFIED', 'EXPERT', 'DIRECT');

-- CreateTable
CREATE TABLE "carbon_inventory_line" (
    "id" BIGSERIAL NOT NULL,
    "carbon_inventory_id" BIGINT NOT NULL,
    "subcategory_id" BIGINT NOT NULL,
    "status" "carbon_inventory_line_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_line_input" (
    "id" BIGSERIAL NOT NULL,
    "line_id" BIGINT NOT NULL,
    "input_type" "input_type" NOT NULL,
    "selection_1_id" BIGINT,
    "selection_2_id" BIGINT,
    "quantity" DECIMAL(28,10),
    "measurement_unit_id" BIGINT,
    "direct_total_emissions" DECIMAL(28,10),
    "manual_factor" DECIMAL(28,10),
    "manual_factor_source" TEXT,
    "manual_factor_rate_unit_id" BIGINT,
    "comment" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_line_factor" (
    "id" BIGSERIAL NOT NULL,
    "line_input_id" BIGINT NOT NULL,
    "emission_factor_id" BIGINT,
    "applied_factor_value" DECIMAL(28,10) NOT NULL,
    "applied_factor_rate_unit_id" BIGINT NOT NULL,
    "applied_factor_source" TEXT,
    "derivation_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_inventory_line_result" (
    "id" BIGSERIAL NOT NULL,
    "line_input_id" BIGINT NOT NULL,
    "total_emissions" DECIMAL(28,10) NOT NULL,
    "result_details" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carbon_inventory_line_factor_line_input_id_key" ON "carbon_inventory_line_factor"("line_input_id");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_inventory_line_result_line_input_id_key" ON "carbon_inventory_line_result"("line_input_id");

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "carbon_inventory_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_selection_1_id_fkey" FOREIGN KEY ("selection_1_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_selection_2_id_fkey" FOREIGN KEY ("selection_2_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_manual_factor_rate_unit_id_fkey" FOREIGN KEY ("manual_factor_rate_unit_id") REFERENCES "rate_measurement_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_input" ADD CONSTRAINT "carbon_inventory_line_input_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_factor" ADD CONSTRAINT "carbon_inventory_line_factor_line_input_id_fkey" FOREIGN KEY ("line_input_id") REFERENCES "carbon_inventory_line_input"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_factor" ADD CONSTRAINT "carbon_inventory_line_factor_emission_factor_id_fkey" FOREIGN KEY ("emission_factor_id") REFERENCES "emission_factor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_factor" ADD CONSTRAINT "carbon_inventory_line_factor_applied_factor_rate_unit_id_fkey" FOREIGN KEY ("applied_factor_rate_unit_id") REFERENCES "rate_measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_factor" ADD CONSTRAINT "carbon_inventory_line_factor_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_factor" ADD CONSTRAINT "carbon_inventory_line_factor_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_result" ADD CONSTRAINT "carbon_inventory_line_result_line_input_id_fkey" FOREIGN KEY ("line_input_id") REFERENCES "carbon_inventory_line_input"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_result" ADD CONSTRAINT "carbon_inventory_line_result_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_result" ADD CONSTRAINT "carbon_inventory_line_result_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

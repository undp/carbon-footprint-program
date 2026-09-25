-- Carbon inventories (footprints) and their lines. Each line keeps a versioned
-- history of inputs; the active input carries a frozen factor snapshot and the
-- computed result.

-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "usage_mode" AS ENUM ('SIMPLIFIED', 'EXPERT');

-- CreateEnum
CREATE TYPE "carbon_inventory_line_status" AS ENUM ('ACTIVE', 'OUTDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "input_type" AS ENUM ('SIMPLIFIED', 'EXPERT', 'DIRECT');

-- CreateTable
CREATE TABLE "carbon_inventory" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "organization_id" BIGINT,
    "organization_branch_id" BIGINT,
    "organization_data" JSONB,
    "year" INTEGER,
    "status" "inventory_status" NOT NULL DEFAULT 'ACTIVE',
    "usage_mode" "usage_mode" NOT NULL,
    "is_self_declared" BOOLEAN NOT NULL DEFAULT false,
    "self_declared_at" TIMESTAMP(3),
    "methodology_version_id" BIGINT NOT NULL,
    "preselected_nodes_id" BIGINT,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,
    "self_declared_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "carbon_inventory_line_file" (
    "line_id" BIGINT NOT NULL,
    "file_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,

    CONSTRAINT "carbon_inventory_line_file_pkey" PRIMARY KEY ("line_id","file_id")
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
CREATE UNIQUE INDEX "carbon_inventory_line_file_file_id_key" ON "carbon_inventory_line_file"("file_id");

-- NOTE: the three indexes below are partial (… WHERE is_active = true). Prisma
-- does not track partial indexes on schema diffs. Preserve these WHERE clauses
-- manually when touching this table.

-- CreateIndex: partial unique index — at most one active input per line.
CREATE UNIQUE INDEX "carbon_inventory_line_input_line_id_active_unique"
ON "carbon_inventory_line_input"("line_id")
WHERE "is_active" = true;

-- CreateIndex: "is this dimension value in use?" lookups of the dimension
-- maintainer. Line inputs keep their inactive history, so only live captures
-- are indexed.
CREATE INDEX "carbon_inventory_line_input_selection_1_id_active_idx"
ON "carbon_inventory_line_input"("selection_1_id")
WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "carbon_inventory_line_input_selection_2_id_active_idx"
ON "carbon_inventory_line_input"("selection_2_id")
WHERE "is_active" = true;

-- CreateIndex
CREATE UNIQUE INDEX "carbon_inventory_line_factor_line_input_id_key" ON "carbon_inventory_line_factor"("line_input_id");

-- CreateIndex: the emission factor maintainer counts, per factor, the line
-- snapshots referencing it; Postgres does not index a foreign key on its own.
CREATE INDEX "carbon_inventory_line_factor_emission_factor_id_idx" ON "carbon_inventory_line_factor" ("emission_factor_id");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_inventory_line_result_line_input_id_key" ON "carbon_inventory_line_result"("line_input_id");

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_methodology_version_id_fkey" FOREIGN KEY ("methodology_version_id") REFERENCES "methodology_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_self_declared_by_id_fkey" FOREIGN KEY ("self_declared_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line" ADD CONSTRAINT "carbon_inventory_line_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "carbon_inventory_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory_line_file" ADD CONSTRAINT "carbon_inventory_line_file_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

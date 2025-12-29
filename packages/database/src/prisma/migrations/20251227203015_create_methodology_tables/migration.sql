-- CreateTable
CREATE TABLE "status_catalog" (
    "id" BIGSERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_terminal" BOOLEAN,
    "is_visible" BOOLEAN,
    "sort_order" INTEGER,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "methodology_version" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "methodology_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" BIGSERIAL NOT NULL,
    "methodology_version_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "synonyms" TEXT,
    "description" TEXT,
    "examples" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory" (
    "id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examples" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "emission_factor_dimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emission_factor_dimension_value" (
    "id" BIGSERIAL NOT NULL,
    "dimension_id" BIGINT NOT NULL,
    "parent_value_id" BIGINT,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "value" DECIMAL(18,10) NOT NULL,
    "status_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "emission_factor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "status_catalog_scope_code_key" ON "status_catalog"("scope", "code");

-- CreateIndex
CREATE UNIQUE INDEX "methodology_version_country_id_name_key" ON "methodology_version"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "category_methodology_version_id_name_key" ON "category"("methodology_version_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_category_id_name_key" ON "subcategory"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_code_key" ON "emission_factor_dimension"("subcategory_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "emission_factor_dimension_subcategory_id_position_key" ON "emission_factor_dimension"("subcategory_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "emission_factor_dimension_value_dimension_id_value_key" ON "emission_factor_dimension_value"("dimension_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "emission_factor_unique_subcategory_dims_source" ON "emission_factor"("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source");

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_version" ADD CONSTRAINT "methodology_version_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_methodology_version_id_fkey" FOREIGN KEY ("methodology_version_id") REFERENCES "methodology_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension" ADD CONSTRAINT "emission_factor_dimension_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "emission_factor_dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_parent_value_id_fkey" FOREIGN KEY ("parent_value_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor_dimension_value" ADD CONSTRAINT "emission_factor_dimension_value_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_dimension_value_1_id_fkey" FOREIGN KEY ("dimension_value_1_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_dimension_value_2_id_fkey" FOREIGN KEY ("dimension_value_2_id") REFERENCES "emission_factor_dimension_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_rate_measurement_unit_id_fkey" FOREIGN KEY ("rate_measurement_unit_id") REFERENCES "rate_measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_inventory" ADD CONSTRAINT "carbon_inventory_methodology_version_id_fkey" FOREIGN KEY ("methodology_version_id") REFERENCES "methodology_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Magnitude" AS ENUM ('MASS', 'VOLUME', 'DISTANCE', 'TIME','ANIMALS' ,'AREA' ,'POWER' ,'ENERGY' ,'DISTANCE_MASS' ,'ROOMS');

-- CreateTable
CREATE TABLE "country" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "iso_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_parameter" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "country_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_parameter" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "system_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_organization_size" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_organization_size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_sector" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "country_sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_subsector" (
    "id" BIGSERIAL NOT NULL,
    "country_sector_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "country_subsector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_job_position" (
    "id" BIGSERIAL NOT NULL,
    "country_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_job_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_role" (
    "id" BIGINT NOT NULL,

    CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_role" (
    "id" BIGINT NOT NULL,

    CONSTRAINT "system_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "idp_name" TEXT,
    "idp_user_id" TEXT,
    "email" TEXT,
    "country_job_position_id" BIGINT,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_unit" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "magnitude" "Magnitude" NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "base_factor" DOUBLE PRECISION NOT NULL,
    "is_base" BOOLEAN NOT NULL,

    CONSTRAINT "measurement_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_measurement_unit" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "numerator_measurement_unit_id" BIGINT NOT NULL,
    "denominator_measurement_unit_id" BIGINT NOT NULL,

    CONSTRAINT "rate_measurement_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_iso_code_key" ON "country"("iso_code");

-- CreateIndex
CREATE UNIQUE INDEX "country_parameter_country_id_key_key" ON "country_parameter"("country_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "system_parameter_key_key" ON "system_parameter"("key");

-- CreateIndex
CREATE UNIQUE INDEX "country_organization_size_country_id_name_key" ON "country_organization_size"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "country_sector_country_id_name_key" ON "country_sector"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "country_subsector_country_sector_id_name_key" ON "country_subsector"("country_sector_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "country_job_position_country_id_name_key" ON "country_job_position"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_uuid_key" ON "user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "user_idp_user_id_key" ON "user"("idp_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_abbreviation_key" ON "measurement_unit"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "rate_measurement_unit_abbreviation_key" ON "rate_measurement_unit"("abbreviation");

-- AddForeignKey
ALTER TABLE "country_parameter" ADD CONSTRAINT "country_parameter_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_parameter" ADD CONSTRAINT "country_parameter_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_parameter" ADD CONSTRAINT "country_parameter_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_parameter" ADD CONSTRAINT "system_parameter_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_parameter" ADD CONSTRAINT "system_parameter_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_organization_size" ADD CONSTRAINT "country_organization_size_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_sector" ADD CONSTRAINT "country_sector_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_sector" ADD CONSTRAINT "country_sector_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_sector" ADD CONSTRAINT "country_sector_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_subsector" ADD CONSTRAINT "country_subsector_country_sector_id_fkey" FOREIGN KEY ("country_sector_id") REFERENCES "country_sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_subsector" ADD CONSTRAINT "country_subsector_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_subsector" ADD CONSTRAINT "country_subsector_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_job_position" ADD CONSTRAINT "country_job_position_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_id_fkey" FOREIGN KEY ("id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_role" ADD CONSTRAINT "system_role_id_fkey" FOREIGN KEY ("id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_country_job_position_id_fkey" FOREIGN KEY ("country_job_position_id") REFERENCES "country_job_position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_measurement_unit" ADD CONSTRAINT "rate_measurement_unit_numerator_measurement_unit_id_fkey" FOREIGN KEY ("numerator_measurement_unit_id") REFERENCES "measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_measurement_unit" ADD CONSTRAINT "rate_measurement_unit_denominator_measurement_unit_id_fkey" FOREIGN KEY ("denominator_measurement_unit_id") REFERENCES "measurement_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

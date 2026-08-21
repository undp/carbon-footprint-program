-- Additive schema for the Dominican Republic deployment.
--
-- Every column added here is nullable, and the new table starts empty, so this
-- migration applies to a populated database without touching an existing row:
-- organizations get NULL for the secondary activity and the territory reference.
--
-- It also loads the territorial catalog. `seed.ts` skips entirely once a country
-- exists, so a deployment that is already populated -- the RD test environment --
-- would never receive this data by seeding. The migration carries it instead,
-- and `seedTerritories` remains the path for a fresh install.
--
-- This is the only migration in the RD stack, so no later pull request competes
-- for a timestamp.

-- CreateEnum
CREATE TYPE "territory_level" AS ENUM ('PLANNING_REGION', 'PROVINCE', 'MUNICIPALITY', 'MUNICIPAL_DISTRICT', 'SECTOR');

-- CreateTable
CREATE TABLE "territory" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" "territory_level" NOT NULL,
    "parent_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "territory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "territory_parent_id_idx" ON "territory"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "territory_parent_id_level_name_key" ON "territory"("parent_id", "level", "name");

-- AlterTable
ALTER TABLE "organization_data" ADD COLUMN     "secondary_subsector_id" BIGINT,
ADD COLUMN     "territory_id" BIGINT;

-- AddForeignKey
ALTER TABLE "territory" ADD CONSTRAINT "territory_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_secondary_subsector_id_fkey" FOREIGN KEY ("secondary_subsector_id") REFERENCES "country_subsector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_data" ADD CONSTRAINT "organization_data_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- InsertData: the ten planning regions.
--
-- Guarded on an empty table rather than ON CONFLICT: the unique index spans
-- (parent_id, level, name), and Postgres treats NULL parents as distinct, so it
-- does not deduplicate roots.
INSERT INTO "territory" ("name", "level")
SELECT v.name, 'PLANNING_REGION'::"territory_level"
FROM (VALUES
    ('Cibao Norte'),
    ('Cibao Sur'),
    ('Cibao Nordeste'),
    ('Cibao Noroeste'),
    ('Valdesia'),
    ('Enriquillo'),
    ('El Valle'),
    ('Yuma'),
    ('Higuamo'),
    ('Ozama o Metropolitana')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM "territory");

-- InsertData: the thirty-two provinces, resolved onto their region by name.
INSERT INTO "territory" ("name", "level", "parent_id")
SELECT v.name, 'PROVINCE'::"territory_level", region.id
FROM (VALUES
    ('Espaillat', 'Cibao Norte'),
    ('Puerto Plata', 'Cibao Norte'),
    ('Santiago', 'Cibao Norte'),
    ('La Vega', 'Cibao Sur'),
    ('Monseñor Nouel', 'Cibao Sur'),
    ('Sánchez Ramírez', 'Cibao Sur'),
    ('Duarte', 'Cibao Nordeste'),
    ('Hermanas Mirabal', 'Cibao Nordeste'),
    ('María Trinidad Sánchez', 'Cibao Nordeste'),
    ('Samaná', 'Cibao Nordeste'),
    ('Dajabón', 'Cibao Noroeste'),
    ('Monte Cristi', 'Cibao Noroeste'),
    ('Santiago Rodríguez', 'Cibao Noroeste'),
    ('Valverde', 'Cibao Noroeste'),
    ('Azua', 'Valdesia'),
    ('Peravia', 'Valdesia'),
    ('San Cristóbal', 'Valdesia'),
    ('San José de Ocoa', 'Valdesia'),
    ('Baoruco', 'Enriquillo'),
    ('Barahona', 'Enriquillo'),
    ('Independencia', 'Enriquillo'),
    ('Pedernales', 'Enriquillo'),
    ('Elías Piña', 'El Valle'),
    ('San Juan', 'El Valle'),
    ('El Seibo', 'Yuma'),
    ('La Altagracia', 'Yuma'),
    ('La Romana', 'Yuma'),
    ('Hato Mayor', 'Higuamo'),
    ('Monte Plata', 'Higuamo'),
    ('San Pedro de Macorís', 'Higuamo'),
    ('Distrito Nacional', 'Ozama o Metropolitana'),
    ('Santo Domingo', 'Ozama o Metropolitana')
) AS v(name, region_name)
JOIN "territory" region
  ON region.name = v.region_name
 AND region.level = 'PLANNING_REGION'
 AND region.parent_id IS NULL
ON CONFLICT DO NOTHING;

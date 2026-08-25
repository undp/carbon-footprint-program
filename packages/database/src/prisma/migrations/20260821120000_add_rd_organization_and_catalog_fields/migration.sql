-- Additive schema for the Dominican Republic deployment.
--
-- Every column added here is nullable, and the new table starts empty, so this
-- migration applies to a populated database without touching an existing row:
-- organizations get NULL for the secondary activity and the territory reference.
--
-- It also loads the territorial catalog: the ten planning regions, the
-- thirty-two provinces and the 157 municipios that article 7 of the Ley Organica
-- de Regiones Unicas de Planificacion (num. 345-22) enumerates. `seed.ts` skips
-- entirely once a country exists, so a deployment that is already populated --
-- the RD test environment -- would never receive this data by seeding. The
-- migration carries it instead, and `seedTerritories` remains the path for a
-- fresh install.
--
-- The two levels below the municipality are not loaded: no official source for
-- them has been obtained yet. See docs/development/rd-territories-sources.md.
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
    ('Higüamo'),
    ('Ozama')
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
    ('Montecristi', 'Cibao Noroeste'),
    ('Santiago Rodríguez', 'Cibao Noroeste'),
    ('Valverde', 'Cibao Noroeste'),
    ('Peravia', 'Valdesia'),
    ('San Cristóbal', 'Valdesia'),
    ('San José de Ocoa', 'Valdesia'),
    ('Bahoruco', 'Enriquillo'),
    ('Barahona', 'Enriquillo'),
    ('Independencia', 'Enriquillo'),
    ('Pedernales', 'Enriquillo'),
    ('Azua', 'El Valle'),
    ('Elías Piña', 'El Valle'),
    ('San Juan', 'El Valle'),
    ('El Seibo', 'Yuma'),
    ('La Altagracia', 'Yuma'),
    ('La Romana', 'Yuma'),
    ('Hato Mayor', 'Higüamo'),
    ('Monte Plata', 'Higüamo'),
    ('San Pedro de Macorís', 'Higüamo'),
    ('Distrito Nacional', 'Ozama'),
    ('Santo Domingo', 'Ozama')
) AS v(name, region_name)
JOIN "territory" region
  ON region.name = v.region_name
 AND region.level = 'PLANNING_REGION'
 AND region.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- InsertData: the municipios article 7 of the law lists under each province.
--
-- Province names are unique across the country, so the join needs no region.
INSERT INTO "territory" ("name", "level", "parent_id")
SELECT v.name, 'MUNICIPALITY'::"territory_level", province.id
FROM (VALUES
    ('Cayetano Germosén', 'Espaillat'),
    ('Gaspar Hernández', 'Espaillat'),
    ('Jamao al Norte', 'Espaillat'),
    ('Moca', 'Espaillat'),
    ('San Víctor', 'Espaillat'),
    ('Altamira', 'Puerto Plata'),
    ('Guananico', 'Puerto Plata'),
    ('Imbert', 'Puerto Plata'),
    ('Los Hidalgos', 'Puerto Plata'),
    ('Luperón', 'Puerto Plata'),
    ('Puerto Plata', 'Puerto Plata'),
    ('Sosúa', 'Puerto Plata'),
    ('Villa Isabela', 'Puerto Plata'),
    ('Villa Montellano', 'Puerto Plata'),
    ('Baitoa', 'Santiago'),
    ('Bisonó', 'Santiago'),
    ('Jánico', 'Santiago'),
    ('Licey al Medio', 'Santiago'),
    ('Puñal', 'Santiago'),
    ('Sabana Iglesia', 'Santiago'),
    ('San José de las Matas', 'Santiago'),
    ('Santiago', 'Santiago'),
    ('Tamboril', 'Santiago'),
    ('Villa González', 'Santiago'),
    ('Constanza', 'La Vega'),
    ('Jarabacoa', 'La Vega'),
    ('Jima Abajo', 'La Vega'),
    ('La Vega', 'La Vega'),
    ('Bonao', 'Monseñor Nouel'),
    ('Maimón', 'Monseñor Nouel'),
    ('Piedra Blanca', 'Monseñor Nouel'),
    ('Cevicos', 'Sánchez Ramírez'),
    ('Cotuí', 'Sánchez Ramírez'),
    ('Fantino', 'Sánchez Ramírez'),
    ('Villa La Mata', 'Sánchez Ramírez'),
    ('Arenoso', 'Duarte'),
    ('Castillo', 'Duarte'),
    ('Eugenio María de Hostos', 'Duarte'),
    ('Las Guáranas', 'Duarte'),
    ('Pimentel', 'Duarte'),
    ('San Francisco de Macorís', 'Duarte'),
    ('Villa Riva', 'Duarte'),
    ('Salcedo', 'Hermanas Mirabal'),
    ('Tenares', 'Hermanas Mirabal'),
    ('Villa Tapia', 'Hermanas Mirabal'),
    ('Cabrera', 'María Trinidad Sánchez'),
    ('El Factor', 'María Trinidad Sánchez'),
    ('Nagua', 'María Trinidad Sánchez'),
    ('Rio San Juan', 'María Trinidad Sánchez'),
    ('Las Terrenas', 'Samaná'),
    ('Samaná', 'Samaná'),
    ('Sánchez', 'Samaná'),
    ('Dajabón', 'Dajabón'),
    ('El Pino', 'Dajabón'),
    ('Loma de Cabrera', 'Dajabón'),
    ('Partido', 'Dajabón'),
    ('Restauración', 'Dajabón'),
    ('Castañuelas', 'Montecristi'),
    ('Guayubín', 'Montecristi'),
    ('Las Matas de Santa Cruz', 'Montecristi'),
    ('Montecristi', 'Montecristi'),
    ('Pepillo Salcedo', 'Montecristi'),
    ('Villa Vásquez', 'Montecristi'),
    ('Monción', 'Santiago Rodríguez'),
    ('San Ignacio de Sabaneta', 'Santiago Rodríguez'),
    ('Villa los Almácigos', 'Santiago Rodríguez'),
    ('Esperanza', 'Valverde'),
    ('Laguna Salada', 'Valverde'),
    ('Mao', 'Valverde'),
    ('Baní', 'Peravia'),
    ('Matanzas', 'Peravia'),
    ('Nizao', 'Peravia'),
    ('Bajos de Haina', 'San Cristóbal'),
    ('Cambita Garabitos', 'San Cristóbal'),
    ('Los Cacaos', 'San Cristóbal'),
    ('Sabana Grande de Palenque', 'San Cristóbal'),
    ('San Cristóbal', 'San Cristóbal'),
    ('San Gregorio de Nigua', 'San Cristóbal'),
    ('Villa Altagracia', 'San Cristóbal'),
    ('Yaguate', 'San Cristóbal'),
    ('Rancho Arriba', 'San José de Ocoa'),
    ('Sabana Larga', 'San José de Ocoa'),
    ('San José de Ocoa', 'San José de Ocoa'),
    ('Galván', 'Bahoruco'),
    ('Los Ríos', 'Bahoruco'),
    ('Neiba', 'Bahoruco'),
    ('Tamayo', 'Bahoruco'),
    ('Villa Jaragua', 'Bahoruco'),
    ('Barahona', 'Barahona'),
    ('Cabral', 'Barahona'),
    ('El Peñón', 'Barahona'),
    ('Enriquillo', 'Barahona'),
    ('Fundación', 'Barahona'),
    ('Jaquimeyes', 'Barahona'),
    ('La Ciénaga', 'Barahona'),
    ('Las Salinas', 'Barahona'),
    ('Paraíso', 'Barahona'),
    ('Polo', 'Barahona'),
    ('Vicente Noble', 'Barahona'),
    ('Cristóbal', 'Independencia'),
    ('Duvergé', 'Independencia'),
    ('Jimaní', 'Independencia'),
    ('La Descubierta', 'Independencia'),
    ('Mella', 'Independencia'),
    ('Postrer Río', 'Independencia'),
    ('Oviedo', 'Pedernales'),
    ('Pedernales', 'Pedernales'),
    ('Azua', 'Azua'),
    ('Estebanía', 'Azua'),
    ('Guayabal', 'Azua'),
    ('Las Charcas', 'Azua'),
    ('Las Yayas de Viajama', 'Azua'),
    ('Padre las Casas', 'Azua'),
    ('Peralta', 'Azua'),
    ('Pueblo Viejo', 'Azua'),
    ('Sabana Yegua', 'Azua'),
    ('Tábara Arriba', 'Azua'),
    ('Bánica', 'Elías Piña'),
    ('Comendador', 'Elías Piña'),
    ('El Llano', 'Elías Piña'),
    ('Hondo Valle', 'Elías Piña'),
    ('Juan Santiago', 'Elías Piña'),
    ('Pedro Santana', 'Elías Piña'),
    ('Bohechío', 'San Juan'),
    ('El Cercado', 'San Juan'),
    ('Juan de Herrera', 'San Juan'),
    ('Las Matas de Farfán', 'San Juan'),
    ('San Juan', 'San Juan'),
    ('Vallejuelo', 'San Juan'),
    ('El Seibo', 'El Seibo'),
    ('Miches', 'El Seibo'),
    ('Higüey', 'La Altagracia'),
    ('San Rafael del Yuma', 'La Altagracia'),
    ('Guaymate', 'La Romana'),
    ('La Romana', 'La Romana'),
    ('Villa Hermosa', 'La Romana'),
    ('El Valle', 'Hato Mayor'),
    ('Hato Mayor', 'Hato Mayor'),
    ('Sabana de la Mar', 'Hato Mayor'),
    ('Bayaguana', 'Monte Plata'),
    ('Monte Plata', 'Monte Plata'),
    ('Peralvillo', 'Monte Plata'),
    ('Sabana Grande de Boyá', 'Monte Plata'),
    ('Yamasá', 'Monte Plata'),
    ('Consuelo', 'San Pedro de Macorís'),
    ('Guayacanes', 'San Pedro de Macorís'),
    ('Los Llanos', 'San Pedro de Macorís'),
    ('Quisqueya', 'San Pedro de Macorís'),
    ('Ramón Santana', 'San Pedro de Macorís'),
    ('San Pedro de Macorís', 'San Pedro de Macorís'),
    ('Boca Chica', 'Santo Domingo'),
    ('Los Alcarrizos', 'Santo Domingo'),
    ('Pedro Brand', 'Santo Domingo'),
    ('San Antonio de Guerra', 'Santo Domingo'),
    ('Santo Domingo Este', 'Santo Domingo'),
    ('Santo Domingo Norte', 'Santo Domingo'),
    ('Santo Domingo Oeste', 'Santo Domingo')
) AS v(name, province_name)
JOIN "territory" province
  ON province.name = v.province_name
 AND province.level = 'PROVINCE'
ON CONFLICT DO NOTHING;

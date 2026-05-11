-- Convert the `Magnitude` enum into a `magnitude` table and migrate
-- `measurement_unit.magnitude` (enum) → `measurement_unit.magnitude_id` (FK).

-- 1. Create the dedicated status enum and the new `magnitude` table.
CREATE TYPE "magnitude_status" AS ENUM ('ACTIVE', 'DELETED');

CREATE TABLE "magnitude" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "magnitude_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magnitude_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "magnitude_code_key" ON "magnitude"("code");

-- 2. Seed the ten system magnitudes with the canonical Spanish labels so existing
--    measurement_unit rows can be backfilled. Codes follow the same lowercase
--    convention validated for user-defined magnitudes (^[a-z][a-z0-9_]*$).
--    Idempotent by `code` so re-applying after a partial run is safe.
INSERT INTO "magnitude" ("code", "name", "is_system", "status", "updated_at") VALUES
    ('mass',          'Masa',             true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('volume',        'Volumen',          true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('distance',      'Distancia',        true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('time',          'Tiempo',           true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('animals',       'Animales',         true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('area',          'Área',             true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('power',         'Potencia',         true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('energy',        'Energía',          true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('distance_mass', 'Distancia · Masa', true, 'ACTIVE', CURRENT_TIMESTAMP),
    ('rooms',         'Habitaciones',     true, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 3. Add the new FK column to `measurement_unit` (nullable for the backfill step).
ALTER TABLE "measurement_unit" ADD COLUMN "magnitude_id" BIGINT;

-- 4. Backfill `magnitude_id` from the legacy enum value by joining on the seeded code.
--    Legacy enum values are uppercase, so lowercase them to match the new code convention.
UPDATE "measurement_unit" mu
SET "magnitude_id" = m."id"
FROM "magnitude" m
WHERE m."code" = LOWER(mu."magnitude"::text);

-- 5. Enforce NOT NULL once every row has been backfilled.
ALTER TABLE "measurement_unit" ALTER COLUMN "magnitude_id" SET NOT NULL;

-- 6. Add the FK constraint and supporting index.
ALTER TABLE "measurement_unit"
    ADD CONSTRAINT "measurement_unit_magnitude_id_fkey"
    FOREIGN KEY ("magnitude_id") REFERENCES "magnitude"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "measurement_unit_magnitude_id_idx" ON "measurement_unit"("magnitude_id");

-- 7. Drop the legacy enum column and the enum type itself.
ALTER TABLE "measurement_unit" DROP COLUMN "magnitude";
DROP TYPE "Magnitude";

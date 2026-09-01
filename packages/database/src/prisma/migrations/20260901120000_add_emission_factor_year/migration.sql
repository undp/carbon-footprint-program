-- Emission factors gain an explicit reporting year and a denormalized unit family.
--
-- Until now a factor carried its vintage informally inside `source` ("DEFRA 2025"),
-- and `emission_factor_unique_subcategory_dims_source` keyed identity on
-- (subcategory, dimensions, source). That made a second vintage for the same
-- activity impossible and let two rate units in the same physical family
-- ("kg/kg" and "kg/ton" are both mass/mass) coexist as separate catalog rows.
--
-- After this migration the active-factor identity is
--   (subcategory, required dimension values, year, source,
--    numerator magnitude, denominator magnitude)
-- where `year IS NULL` means the factor is confirmed transversal — applicable to
-- every reporting year — and never "unknown".
--
-- The migration refuses to guess. Splitting provider from year uses the reviewed
-- classification in openspec/changes/add-emission-factor-year/factor-classification.md;
-- a `source` outside that map aborts the whole transaction rather than being
-- silently treated as transversal.
--
-- Captured inventories are deliberately left alone. Each
-- carbon_inventory_line_factor keeps its applied value, unit and source exactly
-- as declared; it only gains applied_factor_year, backfilled from the factor it
-- already points at. No result is recomputed.

-- 1. New columns. Both magnitude IDs start nullable so existing rows can be
--    backfilled before the NOT NULL constraints land.
ALTER TABLE "emission_factor"
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "numerator_magnitude_id" BIGINT,
  ADD COLUMN "denominator_magnitude_id" BIGINT;

ALTER TABLE "carbon_inventory_line_factor"
  ADD COLUMN "applied_factor_year" INTEGER;

-- 2. Preflight: every distinct non-deleted source must appear in the reviewed
--    classification. A missing suffix is not evidence of transversality, so an
--    unclassified source stops the migration instead of defaulting to NULL.
DO $$
DECLARE
  unclassified TEXT;
BEGIN
  SELECT string_agg(DISTINCT quote_literal("source"), ', ' ORDER BY quote_literal("source"))
  INTO unclassified
  FROM "emission_factor"
  WHERE "status" <> 'DELETED'
    AND "source" NOT IN ('DEFRA 2025', 'EcoAct 2020', 'IPCC', 'Kool, A.');

  IF unclassified IS NOT NULL THEN
    RAISE EXCEPTION
      'Unclassified emission factor source(s): %. Classify each one as dated (integer year) or transversal (NULL) in factor-classification.md and extend this migration before deploying.',
      unclassified;
  END IF;
END $$;

-- 3. Split provider from reporting year using the reviewed map only.
UPDATE "emission_factor" SET "source" = 'DEFRA',  "year" = 2025 WHERE "source" = 'DEFRA 2025';
UPDATE "emission_factor" SET "source" = 'EcoAct', "year" = 2020 WHERE "source" = 'EcoAct 2020';
-- 'IPCC' and 'Kool, A.' were reviewed and confirmed transversal: provider name
-- already clean, year stays NULL.

-- 4. Backfill the unit family from each factor's own rate unit.
--
--    Dimension slots are deliberately left exactly as they are. Normalizing the
--    non-required ones to NULL would have matched the application's uniqueness
--    comparison, but it would also erase a value a maintainer entered on
--    purpose, and the new index compares the raw columns anyway. So the rule
--    stays where it belongs: the application ignores an optional slot when
--    deciding whether two factors are the same factor, and nothing rewrites the
--    data to make that true.
UPDATE "emission_factor" ef
SET "numerator_magnitude_id" = num."magnitude_id",
    "denominator_magnitude_id" = den."magnitude_id"
FROM "rate_measurement_unit" rmu
JOIN "measurement_unit" num ON num."id" = rmu."numerator_measurement_unit_id"
JOIN "measurement_unit" den ON den."id" = rmu."denominator_measurement_unit_id"
WHERE rmu."id" = ef."rate_measurement_unit_id";

DO $$
DECLARE
  orphans BIGINT;
BEGIN
  SELECT count(*) INTO orphans
  FROM "emission_factor"
  WHERE "numerator_magnitude_id" IS NULL OR "denominator_magnitude_id" IS NULL;

  IF orphans > 0 THEN
    RAISE EXCEPTION
      '% emission factor(s) have a rate unit whose measurement units are missing; cannot derive the unit family.',
      orphans;
  END IF;
END $$;

ALTER TABLE "emission_factor"
  ALTER COLUMN "numerator_magnitude_id" SET NOT NULL,
  ALTER COLUMN "denominator_magnitude_id" SET NOT NULL;

ALTER TABLE "emission_factor"
  ADD CONSTRAINT "emission_factor_numerator_magnitude_id_fkey"
    FOREIGN KEY ("numerator_magnitude_id") REFERENCES "magnitude"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "emission_factor_denominator_magnitude_id_fkey"
    FOREIGN KEY ("denominator_magnitude_id") REFERENCES "magnitude"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Consolidate rows that collapse into one identity under the new key.
--    Only mathematically equivalent values may merge: the canonical value is
--    compared in base units (value * numerator baseFactor / denominator
--    baseFactor). Any group that disagrees is a methodology question, not a
--    migration one, so it aborts here.
--
--    The surviving row is the one with the largest denominator baseFactor, so a
--    mass/mass pair keeps "kg/ton" over the equivalent "kg/kg": that is the
--    representation with the larger numeric value (1460 rather than 1.46), which
--    leaves the most significant digits inside Decimal(28, 10). The choice is
--    presentational either way — every other representation in the family is
--    generated by conversion from measurement-unit base factors at read time.
DO $$
DECLARE
  conflicting TEXT;
BEGIN
  WITH canonical AS (
    SELECT ef."subcategory_id",
           ef."dimension_value_1_id",
           ef."dimension_value_2_id",
           ef."year",
           ef."source",
           ef."numerator_magnitude_id",
           ef."denominator_magnitude_id",
           ef."value" * num."base_factor" / den."base_factor" AS base_value
    FROM "emission_factor" ef
    JOIN "rate_measurement_unit" rmu ON rmu."id" = ef."rate_measurement_unit_id"
    JOIN "measurement_unit" num ON num."id" = rmu."numerator_measurement_unit_id"
    JOIN "measurement_unit" den ON den."id" = rmu."denominator_measurement_unit_id"
    WHERE ef."status" <> 'DELETED'
  ),
  conflicts AS (
    SELECT "subcategory_id",
           "dimension_value_1_id",
           "dimension_value_2_id",
           "year",
           "source",
           count(DISTINCT base_value) AS distinct_values
    FROM canonical
    GROUP BY "subcategory_id", "dimension_value_1_id", "dimension_value_2_id",
             "year", "source", "numerator_magnitude_id", "denominator_magnitude_id"
    HAVING count(DISTINCT base_value) > 1
  )
  SELECT string_agg(
           format('subcategory %s / dims (%s, %s) / year %s / source %s: %s distinct canonical values',
                  "subcategory_id",
                  coalesce("dimension_value_1_id"::TEXT, 'null'),
                  coalesce("dimension_value_2_id"::TEXT, 'null'),
                  coalesce("year"::TEXT, 'transversal'),
                  quote_literal("source"),
                  distinct_values),
           '; ')
  INTO conflicting
  FROM conflicts;

  IF conflicting IS NOT NULL THEN
    RAISE EXCEPTION
      'Same-family emission factors disagree after unit conversion: %. Methodology review is required; model a real scientific distinction (wet vs dry mass, for example) as a factor dimension before migrating.',
      conflicting;
  END IF;
END $$;

-- Repoint captured lines at the surviving row before retiring the duplicates.
-- The FK is ON DELETE SET NULL, so retiring a row a line still points at would
-- silently drop that line's catalog link. Repointing is safe precisely because
-- the duplicate shares the survivor's subcategory, required dimensions, year,
-- source and unit family and was just proven mathematically equivalent. The
-- line's own applied value, unit and source snapshots are not touched, so the
-- number the organization declared and its result stay exactly as they were.
WITH ranked AS (
  SELECT ef."id",
         first_value(ef."id") OVER (
           PARTITION BY ef."subcategory_id", ef."dimension_value_1_id",
                        ef."dimension_value_2_id", ef."year", ef."source",
                        ef."numerator_magnitude_id", ef."denominator_magnitude_id"
           ORDER BY den."base_factor" DESC, ef."id" ASC
         ) AS survivor_id
  FROM "emission_factor" ef
  JOIN "rate_measurement_unit" rmu ON rmu."id" = ef."rate_measurement_unit_id"
  JOIN "measurement_unit" den ON den."id" = rmu."denominator_measurement_unit_id"
  WHERE ef."status" <> 'DELETED'
)
UPDATE "carbon_inventory_line_factor" lf
SET "emission_factor_id" = ranked."survivor_id"
FROM ranked
WHERE lf."emission_factor_id" = ranked."id"
  AND ranked."id" <> ranked."survivor_id";

-- Retire the duplicates by soft delete, following the catalog's own convention.
-- The new unique index ignores DELETED rows, so this is enough to satisfy it,
-- and it keeps the retired row auditable instead of destroying catalog history.
WITH ranked AS (
  SELECT ef."id",
         first_value(ef."id") OVER (
           PARTITION BY ef."subcategory_id", ef."dimension_value_1_id",
                        ef."dimension_value_2_id", ef."year", ef."source",
                        ef."numerator_magnitude_id", ef."denominator_magnitude_id"
           ORDER BY den."base_factor" DESC, ef."id" ASC
         ) AS survivor_id
  FROM "emission_factor" ef
  JOIN "rate_measurement_unit" rmu ON rmu."id" = ef."rate_measurement_unit_id"
  JOIN "measurement_unit" den ON den."id" = rmu."denominator_measurement_unit_id"
  WHERE ef."status" <> 'DELETED'
)
UPDATE "emission_factor"
SET "status" = 'DELETED'
WHERE "id" IN (SELECT "id" FROM ranked WHERE "id" <> "survivor_id");

-- 6. Replace the old identity with the source/year/family one. NULLS NOT
--    DISTINCT is what makes a missing dimension or a transversal year behave as
--    a real value instead of a free pass through the constraint.
DROP INDEX "emission_factor_unique_subcategory_dims_source";

CREATE UNIQUE INDEX "emission_factor_unique_subcategory_dims_year_source_family"
  ON "emission_factor" (
    "subcategory_id",
    "dimension_value_1_id",
    "dimension_value_2_id",
    "year",
    "source",
    "numerator_magnitude_id",
    "denominator_magnitude_id"
  ) NULLS NOT DISTINCT
  WHERE "status" <> 'DELETED';

-- 7. Backfill the applied year from the catalog row each captured line already
--    references. Custom factors and direct totals have no emission_factor_id, so
--    they correctly stay NULL and never join the year-mismatch warning.
UPDATE "carbon_inventory_line_factor" lf
SET "applied_factor_year" = ef."year"
FROM "emission_factor" ef
WHERE ef."id" = lf."emission_factor_id";

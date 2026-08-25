-- Correct the four industrial-process subcategories on databases that were
-- already seeded.
--
-- The seed cannot do this. seedEmissionFactors and seedEmissionFactorDimensions
-- only ever createMany({ skipDuplicates: true }): they insert, never update or
-- rename. On an installed deployment they would leave the wrong values in place,
-- add the renamed dimension values next to the old ones, and then abort on the
-- row-count check at the end of seedEmissionFactors. This migration brings such
-- a database to exactly the state the seed data now describes, so a later reseed
-- is a no-op instead of a failure.
--
-- Four corrections, all read back from the IPCC 2006 Guidelines, Volume 3 (IPPU):
--
--   1. Acero and Cinc stored the tonne-CO2-per-tonne figure (BOF 1.46, Waelz
--      3.66) while declaring the rate unit as kg/ton, which understated those
--      processes by 1000x. The number was always a per-kilogram figure, so the
--      rate unit is corrected to kg/kg and the kg/ton row is created alongside.
--   2. Vidrio general carried 0.21, the float/container value. Table 2.6 has no
--      "general glass" row; the generic default is Equation 2.13, 0.20.
--   3. Fibra de vidrio collapsed two rows of Table 2.6 — E-glass 0.19 and
--      insulation wool 0.25. Split in two.
--   4. "Otro proceso" in Acero and Cinc is not another process: it is Table 4.1's
--      Global Average Factor (65% BOF / 30% AEF / 5% OHF) and Table 4.24's
--      Default Factor (60% Imperial Smelting / 40% Waelz Kiln). Renamed to say
--      so, with a bare "Otro" added for the process that really is not listed.
--
-- Every factor also gains a kg/kg and a kg/ton row, because the editor matches a
-- library factor by exact rate-unit denominator and converts nothing: without
-- both, one of the two units a user may declare in resolves to no factor.
--
-- Captured inventories are deliberately left alone. carbon_inventory_line_factor
-- snapshots applied_factor_value and carbon_inventory_line_result stores the
-- computed total, so nothing here changes a number an organization already
-- declared. Recalculating those lines is a separate, deliberate decision.
--
-- Every statement is guarded, so re-running the migration is a no-op.

-- 1. Rename the three dimension values whose label misread its own factor.
UPDATE "emission_factor_dimension_value" v
SET "value" = 'Promedio mundial (65% BOF, 30% AEF, 5% OHF)'
FROM "emission_factor_dimension" d, "subcategory" s
WHERE v."dimension_id" = d."id" AND d."subcategory_id" = s."id"
  AND s."name" = 'Procesos industriales - Acero'
  AND v."value" = 'Otro proceso';

UPDATE "emission_factor_dimension_value" v
SET "value" = 'Promedio por defecto (60% ISF, 40% Waelz Kiln)'
FROM "emission_factor_dimension" d, "subcategory" s
WHERE v."dimension_id" = d."id" AND d."subcategory_id" = s."id"
  AND s."name" = 'Procesos industriales - Cinc'
  AND v."value" = 'Otro proceso';

UPDATE "emission_factor_dimension_value" v
SET "value" = 'Fibra de vidrio (E-glass)'
FROM "emission_factor_dimension" d, "subcategory" s
WHERE v."dimension_id" = d."id" AND d."subcategory_id" = s."id"
  AND s."name" = 'Procesos industriales - Vidrio'
  AND v."value" = 'Fibra de vidrio';

-- 2. Add the dimension values the catalogue gained.
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (VALUES
  ('Procesos industriales - Acero', 'Otro'),
  ('Procesos industriales - Cinc', 'Otro'),
  ('Procesos industriales - Vidrio', 'Fibra de vidrio (lana de aislación)')
) AS nv("subcategory", "value") ON nv."subcategory" = s."name"
WHERE NOT EXISTS (
  SELECT 1 FROM "emission_factor_dimension_value" x
  WHERE x."dimension_id" = d."id" AND x."value" = nv."value"
    AND x."status" <> 'DELETED'
);

-- 3. Acero and Cinc: the stored number was per kilogram all along, so relabel
--    the rate unit instead of multiplying the value.
UPDATE "emission_factor" f
SET "rate_measurement_unit_id" = (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/kg')
FROM "subcategory" s
WHERE f."subcategory_id" = s."id"
  AND s."name" IN ('Procesos industriales - Acero', 'Procesos industriales - Cinc')
  AND f."rate_measurement_unit_id" = (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/ton')
  AND f."value" < 10;

-- 4. Vidrio general: Equation 2.13, not the float value.
UPDATE "emission_factor" f
SET "value" = 0.20
FROM "subcategory" s, "emission_factor_dimension_value" v
WHERE f."subcategory_id" = s."id" AND f."dimension_value_1_id" = v."id"
  AND s."name" = 'Procesos industriales - Vidrio'
  AND v."value" = 'Vidrio general'
  AND f."value" = 0.21;

-- 5. Insulation wool, the second fibreglass row of Table 2.6.
INSERT INTO "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "rate_measurement_unit_id", "source", "gas_details", "value", "status")
SELECT s."id", v."id", NULL,
       (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/kg'),
       'IPCC', '{}'::jsonb, 0.25, 'ACTIVE'
FROM "subcategory" s
JOIN "emission_factor_dimension" d ON d."subcategory_id" = s."id"
JOIN "emission_factor_dimension_value" v ON v."dimension_id" = d."id"
WHERE s."name" = 'Procesos industriales - Vidrio'
  AND v."value" = 'Fibra de vidrio (lana de aislación)'
  AND NOT EXISTS (
    SELECT 1 FROM "emission_factor" x
    WHERE x."dimension_value_1_id" = v."id" AND x."source" = 'IPCC'
      AND x."status" <> 'DELETED'
  );

-- 6. Give every per-kilogram factor its per-tonne twin.
INSERT INTO "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "rate_measurement_unit_id", "source", "gas_details", "value", "status")
SELECT f."subcategory_id", f."dimension_value_1_id", f."dimension_value_2_id",
       (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/ton'),
       f."source", '{}'::jsonb, f."value" * 1000, 'ACTIVE'
FROM "emission_factor" f
JOIN "subcategory" s ON s."id" = f."subcategory_id"
WHERE s."name" IN (
    'Procesos industriales - Acero',
    'Procesos industriales - Cinc',
    'Procesos industriales - Cemento',
    'Procesos industriales - Vidrio'
  )
  AND f."status" <> 'DELETED'
  AND f."rate_measurement_unit_id" = (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/kg')
  AND NOT EXISTS (
    SELECT 1 FROM "emission_factor" x
    WHERE x."subcategory_id" = f."subcategory_id"
      AND x."dimension_value_1_id" IS NOT DISTINCT FROM f."dimension_value_1_id"
      AND x."dimension_value_2_id" IS NOT DISTINCT FROM f."dimension_value_2_id"
      AND x."source" = f."source"
      AND x."status" <> 'DELETED'
      AND x."rate_measurement_unit_id" = (SELECT "id" FROM "rate_measurement_unit" WHERE "abbreviation" = 'kg/ton')
  );

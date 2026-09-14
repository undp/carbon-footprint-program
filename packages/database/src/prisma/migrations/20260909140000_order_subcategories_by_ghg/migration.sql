-- Apply the authored subcategory order (and the Scope 3 standards mapping) to
-- databases that were already seeded.
--
-- 20260909130000_add_subcategory_position introduced the column and backfilled
-- it with the alphabetical order the rows were already displayed in, deferring
-- the real order to seed data. But the seed cannot carry a change to an
-- installed deployment: seed.ts aborts the whole run when the database already
-- contains data (the country-count gate), so seedSubcategories never revisits a
-- row it created on the first run. Without this migration an installed
-- deployment keeps rendering Scope 3 alphabetically -- 'Consumo de agua,
-- Desplazamiento diario, Disposicion de residuos, ...' -- and never receives the
-- 'GHG Protocol cat. N - ISO 14064-1 cat. M' prefixes. Fresh installs get all of
-- it from the seed; installed ones get it here.
--
-- Same shape as 20260825150000_update_business_travel_transport_explanation: the
-- rows are matched through the demo country's base methodology, so a country
-- deployment that maintains its own methodology decides its own order, and every
-- write is guarded (IS DISTINCT FROM / re-derived from scratch), so re-running
-- the migration settles on the same state.
--
-- Content is generated from tools/seed/src/data/base/methodologies.json, so it
-- is the same order and the same text the seed installs, not a hand-copy.
--
-- Positions are unique per category (partial unique index, excluding DELETED),
-- which is why the position rewrite parks every row out of range before
-- rewriting it: no intermediate state can then collide, whatever order the rows
-- are updated in. Step 1 parks at +1000, step 2 writes the authored numbers,
-- and step 3 re-packs every scoped category to 1..N -- authored rows first, in
-- the authored order, then the subcategories a maintainer added locally, in
-- their previous relative order. Step 3 exists because step 2 alone leaves
-- holes on any deployment where an authored subcategory was renamed or
-- soft-deleted; see its own header. Step 4 is the unrelated half of the change:
-- the Scope 3 descriptions. Nothing is inserted or deleted, and no captured
-- inventory line, no emission factor and no computed total is touched.
--
-- This is the second migration that ships base-methodology content by hand
-- (after 20260825150000_update_business_travel_transport_explanation), and every
-- future content change needs a third. The duplication is the symptom: the fix
-- is an idempotent path that lets the seed revisit the base methodology on an
-- installed deployment (a per-entity gate instead of seed.ts's country-count
-- gate), which would also make the position-parking dance unnecessary. Until
-- that exists, content changes have to arrive as migrations like this one.

-- ---------- 1. Park every position out of the way ----------

UPDATE "subcategory" s
SET "position" = s."position" + 1000
FROM "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND mv."name" = 'Metodología inicial'
  AND co."iso_code" = 'PD'
  AND c."status" <> 'DELETED'
  AND s."status" <> 'DELETED'
  AND s."position" <= 1000;

-- ---------- 2. Write the authored order ----------

UPDATE "subcategory" s
SET "position" = authored."position"
FROM (VALUES
  ('Emisiones directas', 'Combustiones estacionarias', 1),
  ('Emisiones directas', 'Combustiones móviles (flota propia)', 2),
  ('Emisiones directas', 'Emisiones fugitivas', 3),
  ('Emisiones directas', 'Emisiones por uso de suelo - Ganadería', 4),
  ('Emisiones directas', 'Emisiones por uso de suelo - Agricultura', 5),
  ('Emisiones directas', 'Emisiones por uso de suelo - Aplicación de fertilizantes', 6),
  ('Emisiones directas', 'Procesos industriales - Cinc', 7),
  ('Emisiones directas', 'Procesos industriales - Cemento', 8),
  ('Emisiones directas', 'Procesos industriales - Vidrio', 9),
  ('Emisiones directas', 'Procesos industriales - Acero', 10),
  ('Emisiones directas', 'Procesos industriales - Cal', 11),
  ('Emisiones directas', 'Procesos industriales - Aluminio', 12),
  ('Emisiones directas', 'Procesos industriales - Química', 13),
  ('Emisiones directas', 'Procesos industriales - Ferroaleaciones y otros metales', 14),
  ('Emisiones directas', 'Procesos industriales - Papel y celulosa', 15),
  ('Emisiones directas', 'Procesos industriales - Cerámica y otros carbonatos', 16),
  ('Emisiones directas', 'Procesos industriales - Otros', 17),
  ('Emisiones directas', 'Emisiones provenientes de otras fuentes', 18),
  ('Emisiones indirectas por energías importadas', 'Electricidad', 1),
  ('Otras emisiones indirectas', 'Productos comprados', 1),
  ('Otras emisiones indirectas', 'Consumo de agua y tratamiento de aguas residuales', 2),
  ('Otras emisiones indirectas', 'Transporte y distribución de bienes aguas arriba', 3),
  ('Otras emisiones indirectas', 'Disposición de residuos sólidos', 4),
  ('Otras emisiones indirectas', 'Viajes de negocios - Traslado', 5),
  ('Otras emisiones indirectas', 'Viajes de negocios - Estadía', 6),
  ('Otras emisiones indirectas', 'Desplazamiento diario de empleados', 7),
  ('Otras emisiones indirectas', 'Trabajo remoto de empleados', 8),
  ('Otras emisiones indirectas', 'Transporte y distribución de bienes aguas abajo', 9),
  ('Otras emisiones indirectas', 'Uso de productos de la organización', 10),
  ('Otras emisiones indirectas', 'Emisiones provenientes de otras fuentes', 11)
) AS authored("category_name", "subcategory_name", "position")
JOIN "category" c ON c."name" = authored."category_name"
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND s."name" = authored."subcategory_name"
  AND mv."name" = 'Metodología inicial'
  AND co."iso_code" = 'PD'
  AND c."status" <> 'DELETED'
  AND s."status" <> 'DELETED';

-- ---------- 3. Re-pack every scoped category to 1..N ----------

-- Step 2 can leave holes, and closing them is what keeps the live sequence
-- contiguous -- the invariant repackSubcategoryPositions and the seed's
-- checkPositionsAreContiguous exist to hold, and the one a maintainer reads
-- straight off the `Pos.` column.
--
-- Two ways a hole survives step 2. A maintainer soft-deleted an authored
-- subcategory: the remaining rows take the authored numbers around the gap
-- ('Trabajo remoto de empleados' removed leaves ... 7, 9, 10, 11) and nothing
-- later closes it, because getNextSubcategoryPosition is MAX + 1 and
-- repackSubcategoryPositions only shifts rows above a slot a delete just
-- freed. Or a maintainer renamed one: it no longer matches the authored list,
-- so the rows around it take 2..N and the renamed row sorts after them --
-- leaving the category with no position 1 at all.
--
-- Renumbering only the unmatched rows cannot fix either, so this re-packs the
-- whole scope. The ordering key keeps the behaviour the header describes:
-- authored rows first, in the authored order, then the locally added ones
-- (still parked above 1000) in their previous relative order.
--
-- It takes two passes for the same reason step 1 parks at all: the partial
-- unique index is non-deferrable and checked per row, so a direct write to
-- 1..N would collide with the rows still holding those numbers. Pass 3a parks
-- the final order above 2000 -- clear of both the authored numbers and the
-- +1000 parking range -- and pass 3b subtracts the offset.

-- 3a. Compute the final order and park it out of range.
WITH scoped AS (
  SELECT s."id", s."category_id", s."position"
  FROM "subcategory" s
  JOIN "category" c ON c."id" = s."category_id"
  JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
  JOIN "country" co ON co."id" = mv."country_id"
  WHERE mv."name" = 'Metodología inicial'
    AND co."iso_code" = 'PD'
    AND c."status" <> 'DELETED'
    AND s."status" <> 'DELETED'
),
renumbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "category_id"
      -- Authored rows (<= 1000) before local additions (> 1000); within each
      -- group, the order step 2 wrote and the order they already had.
      ORDER BY ("position" > 1000), "position"
    ) AS "pos"
  FROM scoped
)
UPDATE "subcategory" s
SET "position" = 2000 + r."pos"
FROM renumbered r
WHERE s."id" = r."id";

-- 3b. Bring the parked order down to 1..N. Every scoped row is >= 2001 after
-- 3a, so no intermediate state collides.
UPDATE "subcategory" s
SET "position" = s."position" - 2000
FROM "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND mv."name" = 'Metodología inicial'
  AND co."iso_code" = 'PD'
  AND c."status" <> 'DELETED'
  AND s."status" <> 'DELETED'
  AND s."position" > 2000;

-- ---------- 4. Scope 3 descriptions: prefix the standards mapping ----------

UPDATE "subcategory" s
SET "description" = authored."description"
FROM (VALUES
  ('Productos comprados',
   'GHG Protocol cat. 1 · ISO 14064-1 cat. 4 — Emisiones asociadas a la compra de productos. Estas emisiones corresponden a las emisiones que se generaron para lograr la producción de los productos adquiridos.'),
  ('Consumo de agua y tratamiento de aguas residuales',
   'GHG Protocol cats. 1 y 5 · ISO 14064-1 cat. 4 — Emisiones asociadas al uso de agua y su tratamiento. Incluye las emisiones generadas por el consumo y desecho de las aguas utilizadas en tu empresa.'),
  ('Transporte y distribución de bienes aguas arriba',
   'GHG Protocol cat. 4 · ISO 14064-1 cat. 3 — Emisiones asociadas al transporte de insumos hacia tu empresa. Incluye el traslado y distribución de materias primas, productos comprados e insumos desde proveedores hasta las instalaciones de la organización.'),
  ('Disposición de residuos sólidos',
   'GHG Protocol cat. 5 · ISO 14064-1 cat. 4 — Emisiones generadas por el tratamiento y disposición final de residuos. Incluye emisiones enviadas a los rellenos sanitarios, reciclaje, compostaje, incineración u otros métodos de gestión de residuos generados por la empresa.'),
  ('Viajes de negocios - Traslado',
   'GHG Protocol cat. 6 · ISO 14064-1 cat. 3 — Emisiones producidas por el traslado en y hacia los viajes laborales. Incluye traslados en avión, bus, tren, taxi, vehículos arrendados u otros medios utilizados para viajes de negocios.'),
  ('Viajes de negocios - Estadía',
   'GHG Protocol cat. 6 · ISO 14064-1 cat. 3 — Emisiones generadas durante la estadía en viajes laborales. Incluye emisiones asociadas a hoteles, alojamientos y servicios utilizados durante viajes de trabajo de acuerdo al país de residencia.'),
  ('Desplazamiento diario de empleados',
   'GHG Protocol cat. 7 · ISO 14064-1 cat. 3 — Emisiones asociadas al traslado cotidiano de los empleados entre su hogar y el lugar de trabajo (commuting).'),
  ('Trabajo remoto de empleados',
   'GHG Protocol cat. 7 · ISO 14064-1 cat. 3 — Emisiones asociadas al consumo energético del hogar atribuible a las horas de trabajo remoto (teletrabajo).'),
  ('Transporte y distribución de bienes aguas abajo',
   'GHG Protocol cat. 9 · ISO 14064-1 cat. 3 — Emisiones asociadas al transporte de productos hacia clientes desde tu empresa. Incluye el traslado y distribución de productos terminados desde tu empresa hasta el cliente final.'),
  ('Uso de productos de la organización',
   'GHG Protocol cat. 11 · ISO 14064-1 cat. 5 — Emisiones generadas durante el uso de los productos vendidos. Incluye las emisiones que se producen cuando los clientes utilizan los productos que la empresa confecciona a lo largo de su vida útil.'),
  ('Emisiones provenientes de otras fuentes',
   'GHG Protocol: otras categorías · ISO 14064-1 cat. 6 — Incluye cualquier otras fuentes de emisión que ocurra fuera de los límites físicos de la empresa y la operación no esté bajo el control de tu empresa.')
) AS authored("subcategory_name", "description")
JOIN "category" c ON c."name" = 'Otras emisiones indirectas'
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND s."name" = authored."subcategory_name"
  AND mv."name" = 'Metodología inicial'
  AND co."iso_code" = 'PD'
  AND c."status" <> 'DELETED'
  AND s."status" <> 'DELETED'
  AND s."description" IS DISTINCT FROM authored."description";

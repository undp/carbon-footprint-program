-- Rename the "Productos comprados" dimension from "Destino" to "Origen" on
-- databases that were already seeded.
--
-- The seed cannot do this. seed.ts aborts the whole run when the database
-- already contains data (the country-count gate), so an installed deployment
-- keeps serving the name it was seeded with. This migration writes the new name
-- onto the row, so the capture form matches the repository and a later reseed is
-- a no-op.
--
-- Why the rename: the dimension's values are "Primera mano", "Reutilizado" and
-- "Con material reciclado", which describe where the purchased material *comes
-- from*. "Destino" was inherited from the waste subcategory, where it is the
-- correct word and stays -- that dimension has its own row, matched by its own
-- code, and is deliberately untouched here.
--
-- The `code` column is NOT renamed. It is the key the methodology seed
-- references the dimension by ("Productos comprados_Destino" appears on every
-- emission factor of the subcategory) and it backs a partial unique index on
-- ("subcategory_id", "code"). Renaming it would move a key to fix a label, so
-- the code keeps its historical value and only the displayed name changes.
--
-- Same shape as the guide updates in
-- 20260825150000_update_business_travel_transport_explanation: the row is
-- matched through the demo country's base methodology, so a country deployment
-- that maintains its own methodology decides for itself, and the write is
-- guarded by IS DISTINCT FROM, so re-running the migration touches zero rows.
--
-- Label only: no factor, no dimension value, no captured inventory line and no
-- computed total is touched here.

UPDATE "emission_factor_dimension" d
SET "name" = 'Origen'
FROM "subcategory" s
JOIN "category" c ON c."id" = s."category_id"
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE d."subcategory_id" = s."id"
  AND c."name" = 'Otras emisiones indirectas'
  AND mv."name" = 'Metodología inicial'
  AND co."iso_code" = 'PD'
  AND s."name" = 'Productos comprados'
  AND d."code" = 'Productos comprados_Destino'
  AND d."status" <> 'DELETED'
  AND d."name" IS DISTINCT FROM 'Origen';

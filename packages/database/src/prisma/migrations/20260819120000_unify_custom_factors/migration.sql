-- Relabel custom factor source "Factor Propio" as "Otro".
--
-- "Factor Propio" was removed from the factor source selector because "Otro"
-- already covers a factor the user provides by hand. These two columns are the
-- only places the label is persisted (the derivation_details / result_details
-- JSONB columns never carry it), so relabelling them leaves no row the
-- application would fail to recognize as a custom factor source.
--
-- updated_at / updated_by_id are intentionally left untouched: this is a rename
-- of a label, not an edit made by a user.

UPDATE "carbon_inventory_line_input"
SET "manual_factor_source" = 'Otro'
WHERE "manual_factor_source" = 'Factor Propio';

UPDATE "carbon_inventory_line_factor"
SET "applied_factor_source" = 'Otro'
WHERE "applied_factor_source" = 'Factor Propio';

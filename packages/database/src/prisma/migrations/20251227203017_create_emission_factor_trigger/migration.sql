-- Enforce: all active emission factors for a subcategory must share the same source.
-- A simple unique index cannot express this multi-row constraint, so we use a trigger.

CREATE OR REPLACE FUNCTION check_emission_factor_source_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'DELETED' AND EXISTS (
    SELECT 1 FROM emission_factor
    WHERE subcategory_id = NEW.subcategory_id
      AND status <> 'DELETED'
      AND source <> NEW.source
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'All active emission factors for subcategory % must have the same source. Found conflicting source.', NEW.subcategory_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_emission_factor_source_consistency
  BEFORE INSERT OR UPDATE ON emission_factor
  FOR EACH ROW
  EXECUTE FUNCTION check_emission_factor_source_consistency();

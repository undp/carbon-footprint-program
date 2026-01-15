-- Add OUTDATED status for inventory lines
INSERT INTO status_catalog (scope, code, name) 
VALUES ('ENTITY', 'OUTDATED', 'Desactualizado')
ON CONFLICT (scope, code) DO NOTHING;

-- Empty the `public` schema so the consolidated migrations can be applied from
-- scratch. Part of docs/operations/migration-history-reset.md.
--
-- Deliberately NOT `DROP SCHEMA public CASCADE`: that would also drop the
-- pgvector extension, and on a deployment where the DBA created it (the
-- migration user is not a superuser) the migration user could not create it
-- again. Only views, tables (with their sequences, indexes and constraints) and
-- enum types are dropped; extensions and their objects are left in place.
--
-- Run it as the MIGRATION user (the owner of the tables), in one transaction:
--   psql "<migration-user connection>" -v ON_ERROR_STOP=1 -1 -f reset-schema.sql

-- The CASCADE drops emit one NOTICE per dependent constraint; keep the output readable.
SET client_min_messages = warning;

DO $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'v'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', obj.relname);
  END LOOP;

  FOR obj IN
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', obj.relname);
  END LOOP;

  FOR obj IN
    SELECT t.typname
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typtype = 'e'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', obj.typname);
  END LOOP;
END $$;

-- Must come back empty before running `migrate deploy`.
SELECT c.relkind, c.relname
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind IN ('r', 'p', 'v', 'S')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e');

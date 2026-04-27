-- Drop the existing unique index that doesn't handle NULLs correctly
DROP INDEX IF EXISTS "organization_main_activity_name_country_sector_id_country_s_key";

-- Create a new partial unique index with NULLS NOT DISTINCT, scoped to ACTIVE rows.
-- - NULLS NOT DISTINCT: makes NULL values equal to each other in the uniqueness constraint (PostgreSQL 15+).
-- - WHERE status = 'ACTIVE': only enforce uniqueness for ACTIVE rows. DELETED rows are allowed to share the
--   same (name, country_sector_id, country_subsector_id) tuple with each other and with the ACTIVE row,
--   so that soft-deleted history retains the original label without contortion.
-- NOTE: Prisma does not track partial indexes (the WHERE clause) on schema diffs. Preserve this WHERE clause
-- manually when touching this table.
CREATE UNIQUE INDEX "organization_main_activity_name_country_sector_id_country_s_key"
ON "organization_main_activity"("name", "country_sector_id", "country_subsector_id")
NULLS NOT DISTINCT
WHERE "status" = 'ACTIVE';


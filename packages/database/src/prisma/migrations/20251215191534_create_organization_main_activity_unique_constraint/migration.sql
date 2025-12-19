-- Drop the existing unique index that doesn't handle NULLs correctly
DROP INDEX IF EXISTS "organization_main_activity_name_country_sector_id_country_s_key";

-- Create a new unique index with NULLS NOT DISTINCT
-- This makes NULL values equal to each other in the uniqueness constraint
-- Requires PostgreSQL 15+
CREATE UNIQUE INDEX "organization_main_activity_name_country_sector_id_country_s_key" 
ON "organization_main_activity"("name", "country_sector_id", "country_subsector_id") 
NULLS NOT DISTINCT;


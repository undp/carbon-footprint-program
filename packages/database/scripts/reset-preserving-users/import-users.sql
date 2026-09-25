-- Re-insert the users exported by export-users.sh into a database that was
-- just migrated and seeded. Part of docs/operations/migration-history-reset.md.
--
-- Run from the directory holding the CSVs, in one transaction:
--   psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f import-users.sql
--
-- Ids are preserved so created_by/updated_by and the audit rows stay valid.
-- The seed must not have created users (the base dataset creates none).

CREATE TEMP TABLE u_in (
  id bigint, uuid uuid, idp_name text, idp_user_id text, email text,
  job_country_iso text, job_position_name text, first_name text, last_name text,
  role system_role, created_at timestamp(3), updated_at timestamp(3),
  created_by_id bigint, updated_by_id bigint, terms_accepted boolean,
  terms_accepted_at timestamp(3), last_access_at timestamp(3)
);
\copy u_in FROM 'user.csv' WITH CSV HEADER

-- Self-references are written in a second pass so row order never matters.
INSERT INTO "user" (id, uuid, idp_name, idp_user_id, email, country_job_position_id, first_name, last_name, role, created_at, updated_at, terms_accepted, terms_accepted_at, last_access_at)
SELECT u.id, u.uuid, u.idp_name, u.idp_user_id, u.email, jp.id, u.first_name, u.last_name, u.role, u.created_at, u.updated_at, u.terms_accepted, u.terms_accepted_at, u.last_access_at
FROM u_in u
LEFT JOIN country c ON c.iso_code = u.job_country_iso
LEFT JOIN country_job_position jp ON jp.country_id = c.id AND jp.name = u.job_position_name;

UPDATE "user" t SET created_by_id = u.created_by_id, updated_by_id = u.updated_by_id
FROM u_in u WHERE t.id = u.id AND (u.created_by_id IS NOT NULL OR u.updated_by_id IS NOT NULL);

\copy user_role_audit (id, user_id, previous_role, new_role, changed_by_id, created_at) FROM 'user_role_audit.csv' WITH CSV HEADER
\copy user_onboarding_completion (user_id, onboarding_key, completed_at) FROM 'user_onboarding_completion.csv' WITH CSV HEADER

SELECT setval(pg_get_serial_sequence('"user"', 'id'), GREATEST((SELECT max(id) FROM "user"), 1));
SELECT setval(pg_get_serial_sequence('user_role_audit', 'id'), GREATEST((SELECT max(id) FROM user_role_audit), 1));

-- Report users whose job position no longer exists in the new catalogue (left NULL).
SELECT u.id, u.email, u.job_country_iso, u.job_position_name AS unmatched_job_position
FROM u_in u JOIN "user" t ON t.id = u.id
WHERE u.job_position_name IS NOT NULL AND t.country_job_position_id IS NULL;

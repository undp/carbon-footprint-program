#!/usr/bin/env bash
# Export the users to preserve across a migration-history reset, BEFORE the
# schema is emptied. Part of docs/operations/migration-history-reset.md.
#
# Exports `user` (identity, IdP link, system role, terms acceptance),
# `user_role_audit` and `user_onboarding_completion`. The job position is
# exported by (country ISO code, name) because its id changes on reseed.
#
# usage: MIGRATION_DATABASE_URL='postgresql://...' ./export-users.sh <out_dir>
set -euo pipefail

out=${1:?usage: MIGRATION_DATABASE_URL='postgresql://...' $0 <out_dir>}
: "${MIGRATION_DATABASE_URL:?set MIGRATION_DATABASE_URL to the migration user connection string}"
mkdir -p "$out"

run_psql() {
  psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
}

run_psql -c "\copy (SELECT u.id, u.uuid, u.idp_name, u.idp_user_id, u.email, c.iso_code AS job_country_iso, jp.name AS job_position_name, u.first_name, u.last_name, u.role, u.created_at, u.updated_at, u.created_by_id, u.updated_by_id, u.terms_accepted, u.terms_accepted_at, u.last_access_at FROM \"user\" u LEFT JOIN country_job_position jp ON jp.id = u.country_job_position_id LEFT JOIN country c ON c.id = jp.country_id ORDER BY u.id) TO STDOUT WITH CSV HEADER" > "$out/user.csv"
run_psql -c "\copy (SELECT id, user_id, previous_role, new_role, changed_by_id, created_at FROM user_role_audit ORDER BY id) TO STDOUT WITH CSV HEADER" > "$out/user_role_audit.csv"
run_psql -c "\copy (SELECT user_id, onboarding_key, completed_at FROM user_onboarding_completion ORDER BY user_id, onboarding_key) TO STDOUT WITH CSV HEADER" > "$out/user_onboarding_completion.csv"

# Line counts include the CSV header.
wc -l "$out"/*.csv

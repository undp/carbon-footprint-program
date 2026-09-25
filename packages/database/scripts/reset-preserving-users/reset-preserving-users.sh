#!/usr/bin/env bash
# Rebuild the database from the consolidated migrations while keeping the users.
# See docs/operations/migration-history-reset.md.
#
# Backs up the database, exports the users, empties the schema, runs
# `pnpm db:provision` (migrate deploy + seed) and re-inserts the users.
# Connects with DATABASE_URL, which must be the owner of the tables.
#
# usage: pnpm db:restore:keep-users              # full run
#        pnpm db:restore:keep-users <export_dir> # resume a failed run from its export
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the database to reset}"

here=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$here/../../../.." && pwd)

# psql rejects Prisma's `schema` query parameter.
psql_url=$(sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//' <<<"$DATABASE_URL")

run_psql() {
  psql "$psql_url" -v ON_ERROR_STOP=1 "$@"
}

target=$(run_psql -XAtc "SELECT current_database() || ' on ' || coalesce(inet_server_addr()::text, 'local socket')")
read -rp "This deletes every organization, inventory and submission in ${target}. Continue? [y/N] " answer
[[ $answer == [yY] ]] || exit 1

if [[ $# -gt 0 ]]; then
  work=$(cd "$1" && pwd)
  [[ -f $work/user.csv ]] || { echo "No user.csv in $work" >&2; exit 1; }
else
  # A second run after a failed one would export the already emptied database.
  if [[ $(run_psql -XAtc 'SELECT count(*) FROM "user"') == 0 ]]; then
    echo 'The database has no users to keep. To resume a failed run, pass its export directory.' >&2
    exit 1
  fi

  work=$(mktemp -d "${TMPDIR:-/tmp}/huella-reset.XXXXXX")
  echo "Backup and user export: $work"

  pg_dump "$psql_url" --format=custom --file "$work/before-reset.dump"

  # The job position is exported by (country ISO code, name) because its id changes on reseed.
  run_psql -c "\copy (SELECT u.id, u.uuid, u.idp_name, u.idp_user_id, u.email, c.iso_code AS job_country_iso, jp.name AS job_position_name, u.first_name, u.last_name, u.role, u.created_at, u.updated_at, u.created_by_id, u.updated_by_id, u.terms_accepted, u.terms_accepted_at, u.last_access_at FROM \"user\" u LEFT JOIN country_job_position jp ON jp.id = u.country_job_position_id LEFT JOIN country c ON c.id = jp.country_id ORDER BY u.id) TO '$work/user.csv' WITH CSV HEADER"
  run_psql -c "\copy (SELECT id, user_id, previous_role, new_role, changed_by_id, created_at FROM user_role_audit ORDER BY id) TO '$work/user_role_audit.csv' WITH CSV HEADER"
  run_psql -c "\copy (SELECT user_id, onboarding_key, completed_at FROM user_onboarding_completion ORDER BY user_id, onboarding_key) TO '$work/user_onboarding_completion.csv' WITH CSV HEADER"
fi

trap 'echo "Failed. The users are safe in $work; fix the error and resume with: pnpm db:restore:keep-users $work" >&2' ERR

run_psql -1 -f "$here/reset-schema.sql"
pnpm --dir "$repo_root" db:provision

# import-users.sql reads the CSVs relative to the working directory.
(cd "$work" && run_psql -1 -f "$here/import-users.sql")

echo "Done. Delete $work once the reset is verified: it holds a full backup and user emails."

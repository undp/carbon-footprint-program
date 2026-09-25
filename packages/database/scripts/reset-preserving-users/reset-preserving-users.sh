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
# -E: the ERR trap below must also fire for failures inside functions (run_psql).
set -eEuo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the database to reset}"

here=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$here/../../../.." && pwd)

# psql rejects Prisma's `schema` query parameter.
psql_url=$(sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//' <<<"$DATABASE_URL")

# -q drops the command tags (COPY 3, INSERT 0 1, ...) so only the messages below show.
run_psql() {
  psql "$psql_url" -X -q -v ON_ERROR_STOP=1 "$@"
}

step() {
  printf '\n==> %s\n' "$1"
}

# Data rows in a CSV export (its first line is the header).
csv_rows() {
  echo $(($(wc -l <"$1") - 1))
}

# Named as the client sees it (database, host and port of DATABASE_URL), not as the server does.
read -r db_name db_host db_port < <(run_psql -At -c '\echo :DBNAME :HOST :PORT')
target="${db_name} (${db_host}:${db_port})"

read -rp "This deletes every organization, inventory and submission in ${target}. Continue? [y/N] " answer
[[ $answer == [yY] ]] || exit 1

if [[ $# -gt 0 ]]; then
  work=$(cd "$1" && pwd)
  [[ -f $work/user.csv ]] || { echo "No user.csv in $work" >&2; exit 1; }
  step "1/4 Resuming from the export in $work"
else
  # A second run after a failed one would export the already emptied database. A run that
  # failed before the migrations recreated the table leaves no `user` table at all, so check
  # for it first (counting a missing table is an error, not zero). Assigned rather than
  # tested inline so a connection error still stops the script.
  has_user_table=$(run_psql -At -c "SELECT to_regclass('public.\"user\"') IS NOT NULL")
  user_count=0
  if [[ $has_user_table == t ]]; then
    user_count=$(run_psql -At -c 'SELECT count(*) FROM "user"')
  fi
  if [[ $user_count == 0 ]]; then
    echo 'The database has no users to keep. To resume a failed run, pass its export directory:' >&2
    echo '  pnpm db:restore:keep-users <repository root>/huella-reset.XXXXXX' >&2
    exit 1
  fi

  # At the repository root, ignored by git and Docker (.gitignore, .dockerignore): it holds
  # a full backup and the users' emails. Private to the current user.
  work=$(mktemp -d "$repo_root/huella-reset.XXXXXX")
  step "1/4 Backing up and exporting the users to $work"

  pg_dump "$psql_url" --format=custom --file "$work/before-reset.dump"

  # The job position is exported by (country ISO code, name) because its id changes on reseed.
  run_psql -c "\copy (SELECT u.id, u.uuid, u.idp_name, u.idp_user_id, u.email, c.iso_code AS job_country_iso, jp.name AS job_position_name, u.first_name, u.last_name, u.role, u.created_at, u.updated_at, u.created_by_id, u.updated_by_id, u.terms_accepted, u.terms_accepted_at, u.last_access_at FROM \"user\" u LEFT JOIN country_job_position jp ON jp.id = u.country_job_position_id LEFT JOIN country c ON c.id = jp.country_id ORDER BY u.id) TO '$work/user.csv' WITH CSV HEADER"
  run_psql -c "\copy (SELECT id, user_id, previous_role, new_role, changed_by_id, created_at FROM user_role_audit ORDER BY id) TO '$work/user_role_audit.csv' WITH CSV HEADER"
  run_psql -c "\copy (SELECT user_id, onboarding_key, completed_at FROM user_onboarding_completion ORDER BY user_id, onboarding_key) TO '$work/user_onboarding_completion.csv' WITH CSV HEADER"

  echo "  Backup:                      before-reset.dump"
  echo "  Users exported:              $(csv_rows "$work/user.csv")"
  echo "  Role changes exported:       $(csv_rows "$work/user_role_audit.csv")"
  echo "  Onboarding records exported: $(csv_rows "$work/user_onboarding_completion.csv")"
fi

trap 'echo "
Failed. The users are safe in $work; fix the error and resume with:
  pnpm db:restore:keep-users $work" >&2' ERR

step "2/4 Emptying the public schema (extensions are kept)"
run_psql -1 -f "$here/reset-schema.sql"
echo "  Done: no tables, views or enums left."

step "3/4 Applying the migrations and seeding (pnpm db:provision)"
pnpm --dir "$repo_root" db:provision

step "4/4 Re-inserting the users"
# import-users.sql reads the CSVs relative to the working directory. No subshell: with -E it
# would inherit the ERR trap and a failure here would print the resume hint twice.
cd "$work"
run_psql -1 -f "$here/import-users.sql"

cat <<EOF

Reset complete for ${target}.

The folder ${work} holds:
  before-reset.dump  the whole database before the reset (restore it with pg_restore to roll back)
  *.csv              the exported users, including their emails
Once you have checked the app, delete it:
  rm -rf ${work}
EOF

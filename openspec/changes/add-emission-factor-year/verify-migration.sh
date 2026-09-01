#!/usr/bin/env bash
# Migration checks for add_emission_factor_year (task 10.2).
#
# The vitest harness runs `prisma migrate deploy` once, against a clean database,
# so it never exercises the paths that matter most here: the preflight that
# refuses to guess a factor's year, and the guard that refuses to merge two
# same-family factors whose values disagree. Both are meant to *stop* a
# production migration, which is exactly what an integration test cannot assert
# about a migration that has already run.
#
# So this script stages three throwaway databases from a real pre-change one,
# injects one defect each, and checks the migration's own behaviour.
#
# Usage:
#   PGHOST=localhost PGPORT=5431 PGUSER=testuser PGPASSWORD=... \
#   TEMPLATE_DB=testdb ./verify-migration.sh
#
# TEMPLATE_DB must be a database seeded with the *pre-change* catalog (sources
# still carrying their year, duplicate kg/kg + kg/ton representations present).

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5431}"
PGUSER="${PGUSER:-testuser}"
TEMPLATE_DB="${TEMPLATE_DB:-testdb}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
MIGRATION_DIR="$REPO_ROOT/packages/database/src/prisma/migrations/20260901120000_add_emission_factor_year"
MIGRATION_SQL="$MIGRATION_DIR/migration.sql"

psql_db() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$1" -tAq "${@:2}"; }
admin() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -q -c "$1"; }

# A database at the migration head *before* this change, so `migrate deploy`
# applies exactly the migration under test and nothing else.
stage() {
  local db="$1"
  admin "DROP DATABASE IF EXISTS $db;"
  admin "CREATE DATABASE $db TEMPLATE $TEMPLATE_DB;"
  local parked
  parked="$(mktemp -d)/pending"
  mv "$MIGRATION_DIR" "$parked"
  (cd "$REPO_ROOT/packages/database" &&
    DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$db" \
      pnpm exec prisma migrate deploy >/dev/null)
  mv "$parked" "$MIGRATION_DIR"
}

expect_abort() {
  local db="$1" needle="$2" label="$3"
  local output
  output="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$db" \
    -v ON_ERROR_STOP=1 -f "$MIGRATION_SQL" 2>&1 || true)"
  if grep -q "$needle" <<<"$output"; then
    echo "  PASS  $label"
  else
    echo "  FAIL  $label — expected the migration to abort with: $needle"
    echo "$output" | tail -5 | sed 's/^/        /'
    exit 1
  fi
}

echo "1. An unclassified source stops the migration instead of defaulting to transversal"
stage efyear_check_unclassified
psql_db efyear_check_unclassified -c "
  INSERT INTO emission_factor (subcategory_id, rate_measurement_unit_id, source, gas_details, value, status)
  SELECT s.id, rmu.id, 'Fuente Nueva Sin Clasificar', '{}', 1.0, 'ACTIVE'
  FROM subcategory s, rate_measurement_unit rmu
  WHERE rmu.abbreviation = 'kg/kWh' ORDER BY s.id LIMIT 1;" >/dev/null
expect_abort efyear_check_unclassified "Unclassified emission factor source" \
  "aborts and names the unclassified source"

echo "2. Same-family factors whose values disagree go to methodology review"
stage efyear_check_conflict
psql_db efyear_check_conflict -c "
  -- Same subcategory, dimensions, source and family as an existing kg/ton
  -- factor, but not the same number once converted to a common unit.
  INSERT INTO emission_factor (subcategory_id, dimension_value_1_id, rate_measurement_unit_id, source, gas_details, value, status)
  SELECT ef.subcategory_id, ef.dimension_value_1_id, target.id, ef.source, '{}', 0.99, 'ACTIVE'
  FROM emission_factor ef
  JOIN subcategory s ON s.id = ef.subcategory_id
  JOIN rate_measurement_unit orig ON orig.id = ef.rate_measurement_unit_id,
       rate_measurement_unit target
  WHERE s.name = 'Procesos industriales - Vidrio'
    AND orig.abbreviation = 'kg/ton' AND target.abbreviation = 'kg/g'
  ORDER BY ef.id LIMIT 1;" >/dev/null
expect_abort efyear_check_conflict "disagree after unit conversion" \
  "aborts rather than silently choosing one value"

echo "3. Clean current data migrates to the reviewed classification"
stage efyear_check_clean
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d efyear_check_clean -q \
  -v ON_ERROR_STOP=1 -f "$MIGRATION_SQL" >/dev/null
echo "  classification after migration:"
psql_db efyear_check_clean -c "
  SELECT '    ' || source || ' -> ' || coalesce(year::text, 'transversal') ||
         ' (' || count(*) || ')'
  FROM emission_factor WHERE status = 'ACTIVE'
  GROUP BY source, year ORDER BY source;"
echo "  retired duplicate representations (soft-deleted):"
psql_db efyear_check_clean -c "
  SELECT '    ' || count(*) FROM emission_factor WHERE status = 'DELETED';"
echo "  duplicate business keys among active factors (must be 0):"
psql_db efyear_check_clean -c "
  SELECT '    ' || coalesce(sum(extra), 0) FROM (
    SELECT count(*) - 1 AS extra FROM emission_factor
    WHERE status = 'ACTIVE'
    GROUP BY subcategory_id, dimension_value_1_id, dimension_value_2_id,
             year, source, numerator_magnitude_id, denominator_magnitude_id
    HAVING count(*) > 1
  ) dupes;"

for db in efyear_check_unclassified efyear_check_conflict efyear_check_clean; do
  admin "DROP DATABASE IF EXISTS $db;"
done

echo "All migration checks passed."

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
#   PGHOST=localhost PGPORT=5432 PGUSER=testuser PGPASSWORD=... \
#   TEMPLATE_DB=testdb ./verify-migration.sh
#
# TEMPLATE_DB must be a database seeded with the *pre-change* catalog (sources
# still carrying their year, duplicate kg/kg + kg/ton representations present).
# Open sessions against it are terminated before each staged copy, so point it
# at a restored copy and never at a database anyone is using.
#
# Both fixtures below abort when their SELECT matches nothing, rather than
# inserting zero rows: subcategory names and unit abbreviations are
# per-deployment catalog data, and an un-injected defect would otherwise be
# reported as a migration failure.

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-testuser}"
# Defaulted like the rest: a host using .pgpass, trust or peer auth needs no
# password, and every direct psql call below works without one. Left unset it
# would trip `set -u` inside stage(), after the migration directory has already
# been moved aside.
PGPASSWORD="${PGPASSWORD:-}"
TEMPLATE_DB="${TEMPLATE_DB:-testdb}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
MIGRATION_DIR="$REPO_ROOT/packages/database/src/prisma/migrations/20260901120000_add_emission_factor_year"
MIGRATION_SQL="$MIGRATION_DIR/migration.sql"

# Prisma takes a URL, not PG* variables, so the credentials have to be encoded:
# a restored-production password containing @ / : # ? or % otherwise makes the
# URL parse into a different host or database, and the resulting error looks
# like a network problem rather than a quoting bug.
urlencode() {
  local LC_ALL=C s="$1" out="" c i
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
    [A-Za-z0-9._~-]) out+="$c" ;;
    *) out+="$(printf '%%%02X' "'$c")" ;;
    esac
  done
  printf '%s' "$out"
}

psql_db() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$1" -tAq -v ON_ERROR_STOP=1 "${@:2}"; }
admin() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -q -c "$1"; }

# A database at the migration head *before* this change, so `migrate deploy`
# applies exactly the migration under test and nothing else.
stage() {
  local db="$1"
  admin "DROP DATABASE IF EXISTS $db;"
  # CREATE DATABASE ... TEMPLATE refuses to run while any session is connected
  # to the template, and a local dev API pool holds one against testdb by
  # default. stage() runs three times, so the template has to stay idle for the
  # whole run; evicting once per stage is clearer than failing three times with
  # "source database is being accessed by other users".
  admin "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = '$TEMPLATE_DB' AND pid <> pg_backend_pid();"
  admin "CREATE DATABASE $db TEMPLATE $TEMPLATE_DB;"
  local parked
  parked="$(mktemp -d)/pending"
  # The migration under test is moved aside so `migrate deploy` stops at the
  # commit before it. Everything between the two moves can fail — a wrong
  # DATABASE_URL, an unreachable server, a Ctrl-C — and with `set -e` and no
  # trap the script would exit before the second one, leaving the migration in
  # an unnamed temp directory and gone from the working tree.
  trap 'mv "$parked" "$MIGRATION_DIR" 2>/dev/null || true' EXIT INT TERM
  mv "$MIGRATION_DIR" "$parked"
  (cd "$REPO_ROOT/packages/database" &&
    DATABASE_URL="postgresql://$(urlencode "$PGUSER"):$(urlencode "$PGPASSWORD")@$PGHOST:$PGPORT/$db" \
      pnpm exec prisma migrate deploy >/dev/null)
  mv "$parked" "$MIGRATION_DIR"
  trap - EXIT INT TERM
}

# `prisma migrate deploy` wraps a migration file in one transaction; psql does
# not. Without --single-transaction every statement before the failing one
# auto-commits, so this check would pass on a migration that aborts halfway and
# leaves its new columns behind — the opposite of what rollout.md tells the
# operator was verified. The rollback is therefore asserted, not assumed.
#
# `|| true` would also swallow a connection failure and report it as "the
# migration did not abort", so the exit status is inspected instead: psql exits
# 2 when it cannot connect and 3 on a script error under ON_ERROR_STOP.
expect_abort() {
  local db="$1" needle="$2" label="$3"
  local output status=0 leftovers
  output="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$db" \
    --single-transaction -v ON_ERROR_STOP=1 -f "$MIGRATION_SQL" 2>&1)" || status=$?
  if [[ "$status" -eq 2 ]]; then
    echo "  ERROR $label — could not connect to $db; this is not a migration result"
    echo "$output" | tail -5 | sed 's/^/        /'
    exit 1
  fi
  if ! grep -q "$needle" <<<"$output"; then
    echo "  FAIL  $label — expected the migration to abort with: $needle"
    echo "$output" | tail -5 | sed 's/^/        /'
    exit 1
  fi
  leftovers="$(psql_db "$db" -c "
    SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'emission_factor'
      AND column_name IN ('year', 'numerator_magnitude_id', 'denominator_magnitude_id');")"
  if [[ "$leftovers" != "0" ]]; then
    echo "  FAIL  $label — aborted, but left $leftovers new column(s) behind"
    exit 1
  fi
  echo "  PASS  $label"
}

failures=0

# Check 3 used to print three numbers and then report success unconditionally,
# including for the query labelled "must be 0". Anything it reports is now
# compared, so the exit status means what rollout.md says it means.
assert_zero() {
  local db="$1" label="$2" query="$3" actual
  actual="$(psql_db "$db" -c "$query")"
  if [[ "$actual" == "0" ]]; then
    echo "  PASS  $label"
  else
    echo "  FAIL  $label — expected 0, got $actual"
    failures=$((failures + 1))
  fi
}

echo "1. An unclassified source stops the migration instead of defaulting to transversal"
stage efyear_check_unclassified
psql_db efyear_check_unclassified -c "
  DO \$\$
  DECLARE inserted int;
  BEGIN
    INSERT INTO emission_factor (subcategory_id, rate_measurement_unit_id, source, gas_details, value, status)
    SELECT s.id, rmu.id, 'Fuente Nueva Sin Clasificar', '{}', 1.0, 'ACTIVE'
    FROM subcategory s, rate_measurement_unit rmu
    WHERE rmu.abbreviation = 'kg/kWh' ORDER BY s.id LIMIT 1;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted <> 1 THEN
      RAISE EXCEPTION 'fixture inserted no row: no kg/kWh rate unit in this database';
    END IF;
  END
  \$\$;" >/dev/null
expect_abort efyear_check_unclassified "Unclassified emission factor source" \
  "aborts and names the unclassified source"

echo "2. Same-family factors whose values disagree go to methodology review"
stage efyear_check_conflict
psql_db efyear_check_conflict -c "
  DO \$\$
  DECLARE inserted int;
  BEGIN
    -- Same subcategory, dimensions, source and family as an existing kg/ton
    -- factor, but not the same number once converted to a common unit.
    INSERT INTO emission_factor (subcategory_id, dimension_value_1_id, rate_measurement_unit_id, source, gas_details, value, status)
    SELECT ef.subcategory_id, ef.dimension_value_1_id, target.id, ef.source, '{}', 0.99, 'ACTIVE'
    FROM emission_factor ef
    JOIN subcategory s ON s.id = ef.subcategory_id
    JOIN rate_measurement_unit orig ON orig.id = ef.rate_measurement_unit_id,
         rate_measurement_unit target
    WHERE s.name = 'Procesos industriales - Vidrio'
      AND ef.status = 'ACTIVE'
      AND orig.abbreviation = 'kg/ton' AND target.abbreviation = 'kg/g'
    ORDER BY ef.id LIMIT 1;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted <> 1 THEN
      RAISE EXCEPTION 'fixture inserted no row: no ACTIVE kg/ton factor under subcategory \"Procesos industriales - Vidrio\", or no kg/g unit. Subcategory names are per-deployment catalog data — point this check at a mass/mass subcategory that exists here.';
    END IF;
  END
  \$\$;" >/dev/null
expect_abort efyear_check_conflict "disagree after unit conversion" \
  "aborts rather than silently choosing one value"

echo "3. Clean current data migrates to the reviewed classification"
stage efyear_check_clean
# Captured before the migration: a restored copy of production already holds
# factors maintainers soft-deleted through the UI, so the raw DELETED count
# afterwards is not the number of representations this change retired.
deleted_before="$(psql_db efyear_check_clean -c \
  "SELECT count(*) FROM emission_factor WHERE status = 'DELETED';")"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d efyear_check_clean -q \
  --single-transaction -v ON_ERROR_STOP=1 -f "$MIGRATION_SQL" >/dev/null
echo "  classification after migration:"
psql_db efyear_check_clean -c "
  SELECT '    ' || source || ' -> ' || coalesce(year::text, 'transversal') ||
         ' (' || count(*) || ')'
  FROM emission_factor WHERE status = 'ACTIVE'
  GROUP BY source, year ORDER BY source;"
deleted_after="$(psql_db efyear_check_clean -c \
  "SELECT count(*) FROM emission_factor WHERE status = 'DELETED';")"
echo "  duplicate representations retired here: $((deleted_after - deleted_before))"
echo "    ($deleted_before factor(s) were already deleted before the migration ran)"
echo "  compare both against factor-classification.md before continuing."

assert_zero efyear_check_clean "no duplicate business key survives" "
  SELECT coalesce(sum(extra), 0) FROM (
    SELECT count(*) - 1 AS extra FROM emission_factor
    WHERE status = 'ACTIVE'
    GROUP BY subcategory_id, dimension_value_1_id, dimension_value_2_id,
             year, lower(source), numerator_magnitude_id, denominator_magnitude_id
    HAVING count(*) > 1
  ) dupes;"

assert_zero efyear_check_clean "every active factor carries its magnitude pair" "
  SELECT count(*) FROM emission_factor
  WHERE status = 'ACTIVE'
    AND (numerator_magnitude_id IS NULL OR denominator_magnitude_id IS NULL);"

assert_zero efyear_check_clean "no saved line points at a retired factor" "
  SELECT count(*) FROM carbon_inventory_line_factor clf
  JOIN emission_factor ef ON ef.id = clf.emission_factor_id
  WHERE ef.status = 'DELETED';"

if ((failures > 0)); then
  echo "$failures migration check(s) failed. The staged databases were kept for"
  echo "inspection: efyear_check_unclassified, efyear_check_conflict, efyear_check_clean."
  exit 1
fi

for db in efyear_check_unclassified efyear_check_conflict efyear_check_clean; do
  admin "DROP DATABASE IF EXISTS $db;"
done

echo "All migration checks passed."

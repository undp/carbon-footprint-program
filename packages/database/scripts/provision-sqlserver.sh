#!/usr/bin/env bash
# Provision the `huella` database on a SQL Server instance with the
# case-sensitive UTF-8 collation required to match PostgreSQL uniqueness
# semantics. Idempotent: safe to re-run.
#
# Run this AFTER the server is up and BEFORE `prisma migrate deploy`.
#
# Env (all optional, sensible local defaults):
#   MSSQL_HOST          default: localhost
#   MSSQL_PORT          default: 1433
#   MSSQL_SA_PASSWORD   default: Huella!Local2026  (must match docker-compose)
#   MSSQL_DATABASE      default: huella
#   MSSQL_COLLATION     default: Latin1_General_100_CS_AS_SC_UTF8
set -euo pipefail

HOST="${MSSQL_HOST:-localhost}"
PORT="${MSSQL_PORT:-1433}"
SA_PASSWORD="${MSSQL_SA_PASSWORD:-Huella!Local2026}"
DATABASE="${MSSQL_DATABASE:-huella}"
COLLATION="${MSSQL_COLLATION:-Latin1_General_100_CS_AS_SC_UTF8}"

# Locate sqlcmd: prefer a local binary, else exec inside the compose container.
run_sql() {
  local query="$1"
  if command -v sqlcmd >/dev/null 2>&1; then
    sqlcmd -S "${HOST},${PORT}" -U sa -P "${SA_PASSWORD}" -C -b -Q "${query}"
  else
    echo "sqlcmd not found locally; running via docker exec (undp-sqlserver)..." >&2
    docker exec -i undp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
      -S "localhost,1433" -U sa -P "${SA_PASSWORD}" -C -b -Q "${query}"
  fi
}

echo "Provisioning database '${DATABASE}' (collation ${COLLATION}) on ${HOST}:${PORT}..."
run_sql "IF DB_ID(N'${DATABASE}') IS NULL CREATE DATABASE [${DATABASE}] COLLATE ${COLLATION};"
echo "Done. Database '${DATABASE}' is ready."

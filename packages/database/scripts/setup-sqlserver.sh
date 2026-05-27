#!/usr/bin/env bash
# Apply the full SQL Server schema to a FRESH `huella` database and seed it.
# Mirrors what `db:restore` does for PostgreSQL, but for SQL Server the steps are
# explicit because Prisma's CLI migrate flow is blocked on self-signed TLS and
# raw-SQL objects (views/CHECK/partial indexes) are not emitted from the schema.
#
# Prerequisites:
#   - SQL Server up:   docker compose -f docker-compose.sqlserver.yml up -d --build
#   - cert generated:  ./scripts/gen-sqlserver-cert.sh
#   - DB provisioned:  ./scripts/provision-sqlserver.sh   (fresh/empty `huella`)
#
# Env (defaults for local dev):
#   MSSQL_SA_PASSWORD   default: HuellaLocal2026
#   SEEDS_DATASET       default: base
set -euo pipefail
cd "$(dirname "$0")/.."  # packages/database

SA_PASSWORD="${MSSQL_SA_PASSWORD:-HuellaLocal2026}"
CERT="$PWD/sqlserver-tls/mssql.pem"
export DB_PROVIDER=sqlserver
export SEEDS_DATASET="${SEEDS_DATASET:-base}"

echo ">>> 1/4  Generating the SQL Server Prisma client"
DATABASE_URL="sqlserver://localhost:1433;database=huella;user=sa;password=${SA_PASSWORD};encrypt=true" \
  SSL_CERT_FILE="$CERT" \
  pnpm exec prisma generate --config=prisma.config.mssql.ts >/dev/null

echo ">>> 2/4  Pushing the schema (tables, FKs, plain indexes)"
DATABASE_URL="sqlserver://localhost:1433;database=huella;user=sa;password=${SA_PASSWORD};encrypt=true" \
  SSL_CERT_FILE="$CERT" \
  pnpm exec prisma db push --config=prisma.config.mssql.ts --accept-data-loss >/dev/null

echo ">>> 3/4  Applying manual DDL (CHECK constraints, partial/filtered indexes, views)"
docker cp src/prisma/sqlserver/manual-ddl.sql undp-sqlserver:/tmp/manual-ddl.sql >/dev/null
docker exec undp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost,1433 -U sa -P "${SA_PASSWORD}" -C -d huella -i /tmp/manual-ddl.sql

echo ">>> 4/4  Seeding"
DATABASE_URL="sqlserver://localhost:1433;database=huella;user=sa;password=${SA_PASSWORD};encrypt=true;trustServerCertificate=true" \
  pnpm exec prisma db seed --config=prisma.config.mssql.ts

echo ">>> Done."

#!/usr/bin/env bash
# Generate a self-signed TLS cert/key for the local SQL Server container so the
# Prisma 7 schema engine (which uses system OpenSSL and ignores
# trustServerCertificate — see multi-db design.md finding 12) can verify it via
# SSL_CERT_FILE. Local development only; never use these certs in production.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/sqlserver-tls"
mkdir -p "$DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/mssql.key" \
  -out "$DIR/mssql.pem" \
  -days 1825 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

chmod 640 "$DIR/mssql.key"
echo "Generated:"
echo "  $DIR/mssql.pem  (server cert — point SSL_CERT_FILE here)"
echo "  $DIR/mssql.key  (server private key)"
echo
echo "Next: rebuild the SQL Server image so it presents this cert:"
echo "  docker compose -f packages/database/docker-compose.sqlserver.yml up -d --build"

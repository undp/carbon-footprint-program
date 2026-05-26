# Local SQL Server image that presents a TLS cert we control, so the Prisma 7
# schema engine can verify it via SSL_CERT_FILE (it ignores trustServerCertificate
# — see multi-db design.md finding 12). Local development only.
#
# Build context is this directory (packages/database/sqlserver-tls). Run
# ../scripts/gen-sqlserver-cert.sh first to produce mssql.pem / mssql.key here.
FROM mcr.microsoft.com/mssql/server:2019-latest

USER root
# Keep cert+key under /var/opt/mssql (owned by mssql) so the mssql user can
# traverse/read them — /etc/ssl/private is root-only and SQL Server fails to load
# the key from there.
RUN mkdir -p /var/opt/mssql/certs
COPY mssql.pem /var/opt/mssql/certs/mssql.pem
COPY mssql.key /var/opt/mssql/certs/mssql.key
COPY mssql.conf /var/opt/mssql/mssql.conf
RUN chown -R mssql:root /var/opt/mssql/certs /var/opt/mssql/mssql.conf \
 && chmod 755 /var/opt/mssql/certs \
 && chmod 444 /var/opt/mssql/certs/mssql.pem \
 && chmod 400 /var/opt/mssql/certs/mssql.key \
 && chmod 440 /var/opt/mssql/mssql.conf
USER mssql

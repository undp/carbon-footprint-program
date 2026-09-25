# 4. Infrastructure — On-premise path (Docker Compose)

This path runs the platform on the country's own servers: two containers (web and API) started
with [`docker-compose.prod.yml`](../../docker-compose.prod.yml), connected to an existing PostgreSQL
and a file store. Images are built on another machine and carried over as a file, so the deploy
server needs no internet access. Read [4. Infrastructure](./04-infrastructure.md) first for what
applies to both paths (identity provider contract, staging gate, rollback).

Reference guide with every detail:
[`production-deployment.md`](../operations/production-deployment.md).

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

---

## 4A. Provision: request to the national IT team

- [ ] Application server with Docker Engine and Compose v2 (production and a separate one, or a
      separate stack, for staging).
- [ ] PostgreSQL ≥ 15 (project standard: 18) with the `vector` extension created by the DBA (see
      below).
- [ ] Two database users: a migration user (DDL) and an application user (read/write), with default
      privileges (see below).
- [ ] A file store: MinIO or another S3-compatible service (or Azure Blob Storage reached from the
      server), with a bucket whose CORS allows the web domain.
- [ ] An OIDC identity provider: Keycloak (overlay
      [`compose/keycloak.prod.yaml`](../../compose/keycloak.prod.yaml),
      [`KeycloakSetup.md`](../infrastructure/KeycloakSetup.md)) or another provider that meets
      [the contract](./04-infrastructure.md#what-the-identity-provider-must-provide), with its SMTP
      relay and two clients whose redirect URLs use the final domain.
- [ ] Domain, TLS certificate and reverse proxy in front of the web app and the API.
- [ ] Network rules: application server to the database (5432), the file store and the identity
      provider.
- [ ] A build machine with Docker and the country branch checked out.
- [ ] Database and file-store backups (see [backups](#backups)).

### What the DBA runs once

pgvector is mandatory even with the chatbot disabled: one migration unconditionally creates a
`vector` column, so a database without the extension cannot migrate at all. Install the OS package
first (e.g. `postgresql-18-pgvector` on Debian/Ubuntu). Creating the extension needs superuser,
which the migration user must not have:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Tables belong to whoever runs the migrations. Default privileges let the application user reach
every table future migrations create, so grants never need re-applying. Run them **before the
first migration**:

```sql
GRANT CONNECT ON DATABASE <db-name> TO <app-user>;
GRANT USAGE ON SCHEMA public TO <app-user>;
ALTER DEFAULT PRIVILEGES FOR ROLE <migration-user> IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <app-user>;
ALTER DEFAULT PRIVILEGES FOR ROLE <migration-user> IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO <app-user>;
```

If migrations already ran before the default privileges were set, or if the DBA does not set them,
the DBA runs these grants: once for the tables that already exist, and, without default
privileges, again after every migration and every backup restore:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <app-user>;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <app-user>;
```

## The environment file

All configuration lives in one file, `.env.prod.dockercompose`, copied from
`.env.prod.dockercompose.example`. It travels with the images: the build machine needs it because
the `VITE_*` values are baked into the web image, and the deploy server needs it to run the stack.
No real credentials go into documents, comments or the repository.

It must set at least these. Values marked "build" require rebuilding the web image when they
change.

| Variable                                                                                                                              | Purpose                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                                        | Application user's connection string (URL-encode special characters)          |
| `MIGRATION_DATABASE_URL`                                                                                                              | Migration user's connection string; only the migrator needs it                |
| `ALLOWED_ORIGIN`                                                                                                                      | Exact browser origin of the web app (scheme, host, port, no trailing slash)   |
| `TRUST_PROXY`                                                                                                                         | The reverse proxy in front of the API, or `false` if there is none            |
| `APP_VERSION`, `VITE_APP_VERSION` (build)                                                                                             | The release tag being deployed                                                |
| `AUTH_PROVIDER=jwks`, `JWKS_URI`, `JWKS_ISSUER`, `JWKS_AUDIENCE`                                                                      | How the API validates tokens; production refuses to boot without them         |
| `STORAGE_PROVIDER` + its block (`MINIO_*` or `AZURE_STORAGE_*`), `STORAGE_ORIGIN`                                                     | File store and the storage URL the browser reaches                            |
| `VITE_API_BASE_URL`, `VITE_FRONT_BASE_URL` (build)                                                                                    | Browser-reachable API and web URLs                                            |
| `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPES`, `VITE_OIDC_REDIRECT_URI`, `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` (build) | The web app's OIDC client                                                     |
| `CHATBOT_ENABLED`, `VITE_CHATBOT_ENABLED` (build)                                                                                     | `false` unless decision 9 enabled the chatbot, which then needs its own block |

Compose stops at start-up if a required variable is missing, and the API refuses to boot if the
selected storage provider's variables are incomplete. The template documents each variable next to
its value; the full reference is
[`environment-variables.md`](../development/environment-variables.md).

## First production deploy sequence

Run this only after the [staging gate](./04-infrastructure.md#staging-gate-before-production)
passes. All commands use this alias, from the folder holding `docker-compose.prod.yml` and the
filled env file:

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
```

1. **Build** on the build machine, from the country branch:

   ```bash
   dcp build
   dcp --profile migrate build migrate
   docker save huella-latam-api:prod huella-latam-web:prod huella-latam-migrate:prod \
     | gzip > huella-images-<tag>.tar.gz
   ```

2. **Transfer** three files to the deploy server: the image tarball, `docker-compose.prod.yml` and
   the env file.
3. **Load** on the deploy server: `docker load < huella-images-<tag>.tar.gz`.
4. **Check** database connectivity: `docker run --rm postgres:18-alpine pg_isready -h <db-host> -p 5432`.
5. **Migrate**: `dcp --profile migrate run --rm migrate`. Repeat on every release.
6. **Seed once**: `dcp --profile seed run --rm seed`. It fails without writing anything if file
   storage is not configured or unreachable, because it uploads the badges and the terms and
   conditions.
7. **Start**: `dcp up --no-build -d`, then `dcp ps` until both services are healthy.
8. **Create the first `SUPERADMIN`**: the person signs in once, then promote them with the bundled
   script:

   ```bash
   dcp --profile migrate run --rm migrate sh -c \
     "pnpm --filter @repo/database promote-superadmin <admin-email>"
   ```

   Or, equivalently, the DBA runs:

   ```sql
   UPDATE "user" SET role = 'SUPERADMIN', updated_at = now() WHERE email = '<admin-email>';
   ```

9. **Create the other administrators**: each person signs in once, then the `SUPERADMIN` assigns
   the system `ADMIN` role in `/admin/users`.

For later releases, repeat steps 1–5 and 7; the seed never runs again.

## Backups

| What              | How                                                                     |
| ----------------- | ----------------------------------------------------------------------- |
| Database          | The DBA's standard PostgreSQL backups (dumps or point-in-time recovery) |
| File store        | Bucket versioning or scheduled copies                                   |
| Identity provider | Keycloak's own database, or the provider's export                       |

Without default privileges, re-apply the grants above after any database restore.

## Issues already seen in the field

| Symptom                                                   | Cause                                                             | Fix                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| The API cannot read or write new tables after a migration | Tables are owned by the migration user                            | Default privileges (above), or re-apply the grants after every migration                                                                       |
| Login fails with 401 behind a VPN or slow links           | Node's connection-attempt timeout is too short                    | Fixed in the API (2.5 s per attempt); run a recent release                                                                                     |
| The web container stays "unhealthy"                       | The healthcheck used `localhost` (IPv6) against IPv4-only nginx   | Fixed in `docker-compose.prod.yml`; check if the country keeps its own compose file                                                            |
| A migration fails and blocks all later ones (P3009)       | pgvector or privileges missing                                    | Fix the cause, mark the migration as rolled back and retry ([details](../operations/production-deployment.md#1-apply-migrations-every-deploy)) |
| The browser cannot download files from MinIO              | The signed URL uses a host the browser cannot resolve             | Publish MinIO under a name resolvable from users' machines                                                                                     |
| Compose uses a different value than the env file          | Variables exported in the shell (or direnv) override `--env-file` | Clean the shell before running                                                                                                                 |

---

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

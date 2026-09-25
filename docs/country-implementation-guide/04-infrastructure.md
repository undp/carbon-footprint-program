# 4. Infrastructure

The platform runs as two containers (web and API) plus PostgreSQL, a file store and an OIDC identity
provider. There are two documented paths; the choice follows from decision 7 in
[phase 1](./01-institutional-decisions.md). The phase has two parts:

- **4A. Provision** the servers, database, storage and identity provider. Runs in parallel with
  phases 2 and 3; 2–4 weeks if the country already has servers and an available DBA.
- **4B. First production deploy.** Build, migrate and seed production. Starts only when the seed
  has passed its [validation gate](./02-seed-content.md#validation-gate-before-seeding-production)
  and the [phase 3](./03-configuration-and-branding.md) configuration is final. About 1 week.

A staging environment can be deployed during 4A with a draft seed. Because the seed only runs on an
empty database, staging is wiped and re-seeded each time the draft changes; production is seeded
once, in 4B.

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

---

## The two paths

| Component                     | Cloud path (Azure)                                       | On-premise path (Docker Compose)                                                                             | Detailed guide                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provisioning                  | Bicep ([`infra/`](../../infra/)), no hand-made resources | [`docker-compose.prod.yml`](../../docker-compose.prod.yml) on a country server                               | [`Deployment.md`](../infrastructure/Deployment.md), [`production-deployment.md`](../operations/production-deployment.md)                             |
| Database                      | Azure Database for PostgreSQL Flexible Server            | Existing PostgreSQL ≥ 15 (project standard: 18) with pgvector                                                | [DBA contract](../operations/production-deployment.md#database-roles--privileges-dba-contract)                                                       |
| Files (evidence, badges, T&C) | Azure Blob Storage                                       | MinIO or another S3-compatible store, or Azure Blob from on-premise                                          | [`FileStorage.md`](../infrastructure/FileStorage.md)                                                                                                 |
| Identity                      | Entra External ID                                        | Keycloak ([`compose/keycloak.prod.yaml`](../../compose/keycloak.prod.yaml) overlay) or another OIDC provider | [`GenericOidcAuthenticationSetup.md`](../infrastructure/GenericOidcAuthenticationSetup.md), [`KeycloakSetup.md`](../infrastructure/KeycloakSetup.md) |
| Images                        | Azure Container Registry                                 | Tarball built on another machine and loaded with `docker load` (works offline)                               | [Image delivery](../operations/production-deployment.md#image-delivery-build--save--load)                                                            |
| Chatbot (optional)            | Azure OpenAI + embeddings                                | Needs egress to Azure OpenAI; without it, `CHATBOT_ENABLED=false`                                            | [`chatbot-ai-access-requirements.md`](../infrastructure/chatbot-ai-access-requirements.md)                                                           |

Sizing and cost references: [`requirements.md`](../infrastructure/requirements.md),
[`app-usage-assumptions.md`](../infrastructure/app-usage-assumptions.md) and
[`infra cost estimation.pdf`](<../infra cost estimation.pdf>).

## 4A. Provision: request to the national IT team

- [ ] Application server with Docker Engine and Compose v2, or an Azure subscription with
      permission to deploy Bicep.
- [ ] PostgreSQL ≥ 15 with the `vector` extension created by the DBA (see below).
- [ ] Two database users: a migration user (DDL) and an application user (read/write), with default
      privileges (see below).
- [ ] A file bucket or container with CORS allowing the web domain.
- [ ] Two OIDC clients (API and frontend) with redirect URLs for the final domain.
- [ ] An SMTP relay for the identity provider. The platform itself sends no email (members are
      added without invitations), but the IdP needs mail for account verification and password
      recovery.
- [ ] Domain, TLS certificate and reverse proxy.
- [ ] Network rules: application server to the database (5432), the file store and the identity
      provider.
- [ ] Backups for the database and the file store (see [backups](#backups-and-recovery)).

### What the DBA runs once

pgvector is mandatory even with the chatbot disabled: one migration unconditionally creates a
`vector` column, so a database without the extension cannot migrate at all. Creating it needs
superuser, which the migration user must not have:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Tables belong to whoever runs the migrations. Default privileges let the application user reach
every table future migrations create, so grants never need re-applying:

```sql
GRANT CONNECT ON DATABASE <db-name> TO <app-user>;
GRANT USAGE ON SCHEMA public TO <app-user>;
ALTER DEFAULT PRIVILEGES FOR ROLE <migration-user> IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <app-user>;
ALTER DEFAULT PRIVILEGES FOR ROLE <migration-user> IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO <app-user>;
```

Without default privileges, the DBA must run
`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <app-user>;` and
`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <app-user>;` after every migration and
every backup restore.

### What the identity provider must provide

Any OIDC provider works if it meets this contract:

| Requirement   | Detail                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Two clients   | A public SPA client (authorization code + PKCE) for the web, and an API audience       |
| Email claim   | `email` (or `preferred_username`) in the access token; tokens without one are rejected |
| Subject claim | `sub` (or `oid` on Entra): the stable user id                                          |
| API scope     | A scope emitted in the token, `access_as_user` by default                              |
| Audience      | The token's `aud` must equal the API's `JWKS_AUDIENCE`                                 |
| Discovery     | A standard `/.well-known/openid-configuration` document and a JWKS endpoint            |

Users are created on their first sign-in with the `USER` role and identified by the subject claim;
the email must be unique. **Choose the IdP for the long term:** switching to another provider later
gives every user a new subject, and existing accounts can no longer be matched. A government SSO or
digital-ID provider can be used if it meets the contract above.

### Minimum production environment variables

The env file (`.env.prod.dockercompose` on-premise) must set at least these. Values marked
"build" are baked into the web image, so changing them means rebuilding it.

| Variable                                                                                                                              | Purpose                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                                        | Application user's connection string (URL-encode special characters)          |
| `MIGRATION_DATABASE_URL`                                                                                                              | Migration user's connection string; only the migrator needs it                |
| `ALLOWED_ORIGIN`                                                                                                                      | Exact browser origin of the web app (scheme, host, port, no trailing slash)   |
| `TRUST_PROXY`                                                                                                                         | The reverse proxy in front of the API, or `false` if there is none            |
| `APP_VERSION`, `VITE_APP_VERSION` (build)                                                                                             | The release tag being deployed                                                |
| `AUTH_PROVIDER=jwks`, `JWKS_URI`, `JWKS_ISSUER`, `JWKS_AUDIENCE`                                                                      | How the API validates tokens; production refuses to boot without them         |
| `STORAGE_PROVIDER` + its block (`AZURE_STORAGE_*` or `MINIO_*`), `STORAGE_ORIGIN`                                                     | File store and the storage URL the browser reaches                            |
| `VITE_API_BASE_URL`, `VITE_FRONT_BASE_URL` (build)                                                                                    | Browser-reachable API and web URLs                                            |
| `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPES`, `VITE_OIDC_REDIRECT_URI`, `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` (build) | The web app's OIDC client                                                     |
| `CHATBOT_ENABLED`, `VITE_CHATBOT_ENABLED` (build)                                                                                     | `false` unless decision 9 enabled the chatbot, which then needs its own block |

Compose stops at start-up if a required variable is missing, and the API refuses to boot if the
selected storage provider's variables are incomplete. The template file documents each variable
next to its value.

## First production deploy sequence

### On-premise (Docker Compose)

All commands use this alias, from the folder holding `docker-compose.prod.yml` and the filled env
file:

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
```

1. Fill in `.env.prod.dockercompose` from `.env.prod.dockercompose.example`, including the storage
   block. No real credentials go into documents, comments or the repository.
2. **Build** on a machine with the country branch checked out (the `VITE_*` values are baked into
   the web image):

   ```bash
   dcp build
   dcp --profile migrate build migrate
   docker save huella-latam-api:prod huella-latam-web:prod huella-latam-migrate:prod \
     | gzip > huella-images-<tag>.tar.gz
   ```

3. **Load** on the deploy server: `docker load < huella-images-<tag>.tar.gz`.
4. **Check** database connectivity: `docker run --rm postgres:18-alpine pg_isready -h <db-host> -p 5432`.
5. **Migrate**: `dcp --profile migrate run --rm migrate`. Repeat on every release.
6. **Seed once**: `dcp --profile seed run --rm seed`. It fails without writing anything if file
   storage is not configured or unreachable, because it uploads the badges and the terms and
   conditions.
7. **Start**: `dcp up --no-build -d`, then `dcp ps` until both services are healthy.
8. **Create the first `SUPERADMIN`**: the person signs in once through the IdP (which creates their
   user), then promote them with the bundled script:

   ```bash
   dcp --profile migrate run --rm migrate sh -c \
     "pnpm --filter @repo/database promote-superadmin <admin-email>"
   ```

   Or, equivalently, the DBA runs:

   ```sql
   UPDATE "user" SET role = 'SUPERADMIN', updated_at = now() WHERE email = '<admin-email>';
   ```

   Both bypass the role audit trail; every later role change goes through the UI.

9. **Create the other administrators**: each person signs in once, then the `SUPERADMIN` assigns
   `ADMIN` in `/admin/users`.

Every variable is described in
[`../development/environment-variables.md`](../development/environment-variables.md).

### Azure

1. Configure `infra/.envrc` for the environment and deploy the Bicep stack with `infra/deploy.sh`
   ([`Deployment.md`](../infrastructure/Deployment.md)).
2. Register the OIDC clients and set the authentication values
   ([`AzureAuthenticationSetup.md`](../infrastructure/AzureAuthenticationSetup.md)).
3. **Migrate** with `infra/run-migrations.sh` after allowing your IP in the PostgreSQL firewall
   ([`Migrations.md`](../infrastructure/Migrations.md)).
4. **Seed once** from a machine with the country branch at the deployed tag, pointing at the Azure
   database with the migration credentials and the storage variables set:

   ```bash
   export DATABASE_URL='postgresql://<migration-user>:<url-encoded-password>@<db-host>:5432/<db-name>?schema=public&sslmode=require'
   export STORAGE_PROVIDER=azure_blob_storage
   # plus AZURE_STORAGE_ACCOUNT_NAME, _CONTAINER_NAME, _TENANT_ID, _CLIENT_ID, _CLIENT_SECRET
   pnpm install
   pnpm --filter @repo/seed seed
   ```

5. **Deploy** the API with `infra/deploy-api.sh` ([`ApiDeployment.md`](../infrastructure/ApiDeployment.md))
   and the frontend with `infra/deploy-web.sh`
   ([`StaticWebAppDeployment.md`](../infrastructure/StaticWebAppDeployment.md)).
6. **Create the first `SUPERADMIN` and the administrators** as in steps 8–9 above.

## Backups and recovery

The country sets its recovery targets (how much data it can lose, how long it can be down) and
tests a restore before go-live. Back up three things together: the database, the file store and
the identity provider's user store.

| Path       | Database                                                                | Files                                       |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| Azure      | Automated backups and point-in-time restore (30 days recommended)       | Geo-redundant storage plus blob soft delete |
| On-premise | The DBA's standard PostgreSQL backups (dumps or point-in-time recovery) | Bucket versioning or scheduled copies       |

After any database restore without default privileges, re-apply the grants above. Azure procedures
are in the [runbook](../operations/runbook.md#backup).

## Security and privacy references

Government security and data-protection offices usually ask for these before production:

| Topic                                        | Document                                             |
| -------------------------------------------- | ---------------------------------------------------- |
| Personal data stored and how it is protected | [`sensitive-data.md`](../security/sensitive-data.md) |
| Hardening and deployment topology            | [`hardening.md`](../security/hardening.md)           |
| Audit logging of admin actions               | [`audit-logging.md`](../security/audit-logging.md)   |
| Secrets management                           | [`secrets.md`](../security/secrets.md)               |
| Monitoring and logs                          | [`observability.md`](../operations/observability.md) |

Data residency follows decision 7: on-premise keeps data in the country; on Azure it stays in the
region chosen at deploy time. With the chatbot enabled, prompts are sent to Azure OpenAI.

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

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

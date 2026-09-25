# 4. Infrastructure

The platform runs as two containers (web and API) plus PostgreSQL, a file store and an OIDC identity
provider. There are two documented paths; the choice follows from decision 7 in
[phase 1](./01-institutional-decisions.md). We estimate 2–4 weeks if the country already has servers
and an available DBA.

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

---

## The two paths

| Component                     | Cloud path (Azure)                                       | On-premise path (Docker Compose)                                                                             | Guide                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provisioning                  | Bicep ([`infra/`](../../infra/)), no hand-made resources | [`docker-compose.prod.yml`](../../docker-compose.prod.yml) on a country server                               | [`Deployment.md`](../infrastructure/Deployment.md), [`production-deployment.md`](../operations/production-deployment.md)                             |
| Database                      | Azure Database for PostgreSQL Flexible Server            | Existing PostgreSQL ≥ 15 (project standard: 18) with pgvector                                                | [DBA contract](../operations/production-deployment.md#database-roles--privileges-dba-contract)                                                       |
| Files (evidence, badges, T&C) | Azure Blob Storage                                       | MinIO or another S3-compatible store, or Azure Blob from on-premise                                          | [`FileStorage.md`](../infrastructure/FileStorage.md)                                                                                                 |
| Identity                      | Entra External ID                                        | Keycloak ([`compose/keycloak.prod.yaml`](../../compose/keycloak.prod.yaml) overlay) or another OIDC provider | [`GenericOidcAuthenticationSetup.md`](../infrastructure/GenericOidcAuthenticationSetup.md), [`KeycloakSetup.md`](../infrastructure/KeycloakSetup.md) |
| Images                        | Azure Container Registry                                 | Tarball built on another machine and loaded with `docker load` (works offline)                               | [Image delivery](../operations/production-deployment.md#image-delivery-build--save--load)                                                            |
| Chatbot (optional)            | Azure OpenAI + embeddings                                | Needs egress to Azure OpenAI; without it, `CHATBOT_ENABLED=false`                                            | [`chatbot-ai-access-requirements.md`](../infrastructure/chatbot-ai-access-requirements.md)                                                           |

## Request to the national IT team

- [ ] Application server with Docker Engine and Compose v2, or an Azure subscription with
      permission to deploy Bicep.
- [ ] PostgreSQL ≥ 15 with the `vector` extension created by the DBA before the first migration. It
      is mandatory even when the chatbot is off.
- [ ] Two database users: a migration user (DDL) and an application user (read/write), with default
      privileges so new tables are accessible to the application user.
- [ ] A file bucket or container with CORS allowing the web domain.
- [ ] Two OIDC clients (API and frontend) with redirect URLs for the final domain.
- [ ] Domain, TLS certificate and reverse proxy.
- [ ] Network rules: application server to the database (5432), the file store and the identity
      provider.

## First-deploy sequence

1. Fill in the environment file from `.env.prod.dockercompose.example`. No real credentials go into
   documents, comments or the repository.
2. Build the images from the country branch: the `VITE_*` variables are baked into the web image.
3. Check database connectivity with `pg_isready`.
4. Run the migration: `dcp --profile migrate run --rm migrate`. Repeat on every release.
5. Re-apply the application user's grants if there are no default privileges.
6. Run the seed once: `dcp --profile seed run --rm seed`. It fails without writing anything if file
   storage is not configured, because it uploads the badges and the terms and conditions.
7. Start the stack with `--no-build`.
8. Create the first `SUPERADMIN`: the person signs in once and the DBA updates their role in SQL
   ([country-onboarding step 8](../development/country-onboarding.md#step-8--initial-superadmin-user)).
   From then on, other roles are assigned in `/admin/users`.

`dcp` is the alias defined in
[`production-deployment.md`](../operations/production-deployment.md#migrations--seed-operator-invoked-one-shots).
Every variable is described in
[`../development/environment-variables.md`](../development/environment-variables.md).

## Issues already seen in the field

| Symptom                                                   | Cause                                                             | Fix                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The API cannot read or write new tables after a migration | Tables are owned by the migration user                            | Default privileges, or re-apply `GRANT` after every migration and every backup restore |
| Login fails with 401 behind a VPN or slow links           | Node's connection-attempt timeout is too short                    | Fixed in the API (2.5 s per attempt); run a recent release                             |
| The web container stays "unhealthy"                       | The healthcheck used `localhost` (IPv6) against IPv4-only nginx   | Fixed in `docker-compose.prod.yml`; check if the country keeps its own compose file    |
| A migration fails and blocks all later ones (P3009)       | pgvector or privileges missing                                    | Fix the cause, mark the migration as rolled back and retry                             |
| The browser cannot download files from MinIO              | The signed URL uses a host the browser cannot resolve             | Publish MinIO under a name resolvable from users' machines                             |
| Compose uses a different value than the env file          | Variables exported in the shell (or direnv) override `--env-file` | Clean the shell before running ([troubleshooting](../operations/docker-compose.md))    |

---

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

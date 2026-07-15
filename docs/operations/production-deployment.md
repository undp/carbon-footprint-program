# Production Deployment — On-Premise with External PostgreSQL

Deploy Huella Latam on a country's own server with `docker-compose.prod.yml`. Unlike the [local-dev stack](./docker-compose.md), only two long-running containers run in Docker — **PostgreSQL is an external server** reached over the network, and **migrations/seeds run as operator-invoked one-shot containers** (the profile-gated `migrate` and `seed` services) before the stack starts, rather than automatically on `up`.

```
              ┌────────── app server (Docker) ──────────┐
  browser ──► │  web :WEB_PORT   (nginx, SPA)            │
              │  api :API_PORT   (Fastify) ──────────────┼──► external PostgreSQL :5432
              └──────────────────────────────────────────┘     (same network, outside Docker)
```

TLS / reverse proxies are out of scope here, but if one fronts the stack, `ALLOWED_ORIGIN` and the `VITE_*` URLs must use the public HTTPS origin, not the server's internal address.

### Deployment model & roles

Images are **not built on the deploy server** and there is no registry. They are built on a separate machine, exported as a compressed tarball (`docker save | gzip`), transferred, and loaded on the deploy server (`docker load`) — an air-gapped flow. Three roles, which may be the same or different people:

| Role              | Has                                                                                                                               | Does                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Builder**       | repo checkout + the deployment env file                                                                                           | builds the images (bakes the country's `VITE_*` into `web`) and `docker save`s them                            |
| **Migrator**      | Docker + Compose + `docker-compose.prod.yml` + the env file + the `huella-latam-migrate:prod` image (loaded or built) + DB access | runs the `migrate` one-shot (every deploy) and the `seed` one-shot (first deploy only), then re-applies grants |
| **Deploy person** | the deploy server + the env file + tarball                                                                                        | `docker load`s the images and runs the stack with `--no-build`                                                 |

> The **same** populated `.env.prod.dockercompose` is the deployment's complete config — it travels with the image tarball. The builder needs it (the `VITE_*` are baked into the `web` image at build time); the deploy person needs it (the API's runtime vars — `DATABASE_URL`, `JWT_SECRET`, …). Compose interpolates the whole file regardless of the command, so keep it complete in both places. The one exception is **`MIGRATION_DATABASE_URL`** (the migration user's connection string): only the migrator needs it, and it is intentionally left empty for the deploy person — an empty value does not break `up`, it only fails a `migrate`/`seed` run.

## Prerequisites

- **Deploy server**: Docker Engine + Compose v2 (`docker compose version`). It needs only `docker-compose.prod.yml`, the filled env file, and the image tarball — **not** the repo, Node, or pnpm.
- **Builder machine**: a git checkout of the repo at the release tag, Docker, and the filled env file (to bake `VITE_*`). May be the same machine as the migrator.
- **External PostgreSQL ≥ 15** (project standard: 18). Migrations use `NULLS NOT DISTINCT`, which requires 15+; `pnpm --filter @repo/database validate:version` enforces this.
- **Database and roles provisioned by the DBA** — see the [contract below](#database-roles--privileges-dba-contract). The repo ships no provisioning SQL.
- **Network reachability**:
  - app server → DB server `:5432`. Containers reach external IPs through the host's NAT — no special Docker network config. The flip side: the DB server's `pg_hba.conf`/firewall must allow the **app server's IP** (connections from containers arrive NATed behind it).
  - app server → Azure `*.ciamlogin.com` (user auth). For file storage: app server → Azure `<account>.blob.core.windows.net` when `STORAGE_PROVIDER=azure_blob_storage`, or app server → the MinIO endpoint (`MINIO_ENDPOINT`) when `STORAGE_PROVIDER=minio`.
- **Azure resources**: Entra External ID app registrations (API + front), plus — only when `STORAGE_PROVIDER=azure_blob_storage` — a storage Service Principal ([creation walkthrough](./docker-compose.md#create-the-storage-service-principal-azure-portal)). MinIO deployments need none of the storage Azure resources; instead provision a bucket and an access key/secret on the MinIO server, with CORS allowing the web origin (`ALLOWED_ORIGIN`).
- **For the migrator**: Docker + Compose on a host with network access to the DB, plus the `huella-latam-migrate:prod` image (in the tarball, or built there from a checkout). A pnpm/Node toolchain is only needed for the [manual fallback](#manual-alternative-pnpm-from-a-dev-machine).

## Database roles & privileges (DBA contract)

The platform expects two separations of duty (both provisioned by the country's DBA, outside this repo):

| Role                 | Used for                            | Needs                                                                                                                |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Migration user**   | `prisma migrate deploy` + seeds     | `CONNECT`; `CREATE` on the database/schema (Prisma creates the `_prisma_migrations` table and runs DDL)              |
| **Application user** | the API at runtime (`DATABASE_URL`) | `CONNECT`; `USAGE` on schema `public`; `SELECT/INSERT/UPDATE/DELETE` on all tables; `USAGE, SELECT` on all sequences |

> ⚠️ **Table ownership caveat** — tables belong to whoever runs `migrate deploy`. If the migration user is not the application user, **every migration run creates objects the app user cannot touch** until grants are re-applied. Two options:
>
> - The DBA configures it once: `ALTER DEFAULT PRIVILEGES FOR ROLE <migration-user> IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <app-user>;` (and the equivalent `GRANT USAGE, SELECT ON SEQUENCES`); or
> - re-run the `GRANT ... ON ALL TABLES/SEQUENCES IN SCHEMA public` statements after **every** deploy that includes migrations.

Both users connect to the same database; the `?schema=public` suffix in `DATABASE_URL` must match the schema the DBA granted.

## Environment file

```bash
cp .env.prod.dockercompose.example .env.prod.dockercompose
chmod 600 .env.prod.dockercompose   # holds real secrets
```

Fill in every placeholder — the template has no working defaults, and `docker-compose.prod.yml` fails fast (at `up`/`config` time) if a required var is missing. Highlights:

- **`DATABASE_URL`**: use the **application user**. If the password has special characters (`@ : / ? # & % $` …) it must be URL-encoded: `node -e "console.log(encodeURIComponent(process.argv[1]))" 'p@ss#word'`.
- **`ALLOWED_ORIGIN` / `VITE_FRONT_BASE_URL`**: the exact browser origin of the web app (scheme + host + port, no trailing slash) — a mismatch shows up as CORS errors.
- **`VITE_API_BASE_URL`**: the **host-exposed** API URL (uses `API_PORT`), not the container-internal port.
- **`STORAGE_PROVIDER`**: `azure_blob_storage` (default) or `minio`. Fill only the matching storage block in the env file — the API refuses to boot if the selected provider's required vars are missing (`AZURE_STORAGE_ACCOUNT_NAME` for Azure; `MINIO_ENDPOINT`/`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` for MinIO).
- Shell/direnv exports silently override `--env-file` values — see [the precedence troubleshooting](./docker-compose.md#compose-uses-the-wrong-value-for-a-variable-shell--direnv-overrides---env-file).

## Connectivity check (before first boot)

From the app server:

```bash
pg_isready -h <db-host> -p 5432
# or, without PostgreSQL client tools on the host:
docker run --rm postgres:18-alpine pg_isready -h <db-host> -p 5432
```

If this fails, fix the route/firewall/`pg_hba.conf` first — the API cannot start without the database (see [Troubleshooting](#troubleshooting)).

## Migrations & seed (operator-invoked one-shots)

Migrations and seeds run as **one-shot containers** driven from the deployment host, so the flow is reproducible without a pnpm/Node toolchain. Both live in `docker-compose.prod.yml` behind Compose **profiles**, so `up` never starts them — you invoke each explicitly. Both connect as the **migration user** (`MIGRATION_DATABASE_URL`), a credential distinct from the API's application user (`DATABASE_URL`); the service maps it onto `DATABASE_URL` inside the container, which is what Prisma reads.

> The one-shots use the `builder` stage of `apps/api/Dockerfile` (`huella-latam-migrate:prod`) — it ships Prisma, `tsx`, and the seed tool, which the slim runtime `api` image does not. Include it in the tarball (see [Image delivery](#image-delivery-build--save--load)), or build it on the migrator host from a checkout.

Set the alias once (as elsewhere in this guide):

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
```

### 1. Apply migrations (every deploy)

`migrate` runs the preflight (`validate:version` — connectivity + PostgreSQL ≥ 15) and then `prisma migrate deploy`. It is idempotent — correct on the first deploy and on every upgrade:

```bash
dcp --profile migrate run --rm migrate
```

`--rm` removes the one-shot container when it exits. A non-zero exit means the preflight or a migration failed — read the output and fix it before continuing.

> ⚠️ **Table-ownership grants are not automated here.** Tables are owned by whoever runs `migrate deploy`. If the migration user differs from the application user, **re-apply/verify the grants** from the [DBA contract](#database-roles--privileges-dba-contract) after **every** migrate run — otherwise the app user cannot read/write the newly created objects.

### 2. Seed reference data (first deploy only)

`seed` populates countries, badges, and terms & conditions. Run it **once**, on the first deploy, **after** `migrate`:

```bash
dcp --profile seed run --rm seed
```

> ⚠️ **Seed one-shot warning** — the seed skips entirely once the `country` table has rows. Object storage is **required** for this seed (it uploads the badge SVGs and the terms & conditions PDF): before writing anything, the seed preflights storage and **fails fast (exit 1) with nothing written** if `STORAGE_PROVIDER` is unset, its `AZURE_STORAGE_*` / `MINIO_*` vars are incomplete, or the configured backend is unreachable (wrong endpoint/credentials, bucket/container missing). A failed preflight leaves the database untouched, so once you fix the storage config the seed re-runs cleanly. Set `STORAGE_PROVIDER` and its storage block in the env file **before** the first seed run.

### Manual alternative (pnpm, from a dev machine)

If you have a repo checkout at the **same tag** being deployed and a pnpm/Node toolchain with DB access, the same steps run directly — this is exactly what the containers wrap:

```bash
# Use the MIGRATION user here (the API itself uses the application user).
export DATABASE_URL='postgresql://<migration-user>:<url-encoded-password>@<db-host>:5432/<db-name>?schema=public'

# Storage vars — REQUIRED BEFORE THE FIRST SEED (see the seed warning above).
# Set the block that matches the provider configured in the env file.
export STORAGE_PROVIDER=azure_blob_storage   # or: minio
# Azure: AZURE_STORAGE_ACCOUNT_NAME / _CONTAINER_NAME / _TENANT_ID / _CLIENT_ID / _CLIENT_SECRET
# MinIO: MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET
# (same values as the storage block in .env.prod.dockercompose.example)

pnpm install
pnpm --filter @repo/database validate:version   # preflight: connectivity + PostgreSQL >= 15
pnpm --filter @repo/database prod:deploy        # prisma migrate deploy
pnpm --filter @repo/seed seed                   # first deploy only (idempotent)
```

The same **grant re-application** and **seed one-shot** caveats above apply to this path too.

## Image delivery (build → save → load)

**On the builder machine** (repo checkout + filled env file). The `web` image bakes the country's `VITE_*` at build time, so the env file must hold the real deployment URLs before building:

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
dcp build                                # builds huella-latam-api:prod and huella-latam-web:prod
dcp --profile migrate build migrate      # builds huella-latam-migrate:prod (also used by `seed`)
docker save huella-latam-api:prod huella-latam-web:prod huella-latam-migrate:prod \
  | gzip > huella-images-<tag>.tar.gz
```

The `migrate` image build is a separate step because profile-gated services are excluded from a plain `dcp build`. Skip it only if the migrator builds the image itself from a checkout.

Transfer **three artifacts** to the deploy server: `huella-images-<tag>.tar.gz`, `docker-compose.prod.yml`, and the filled `.env.prod.dockercompose`.

> Deploying Keycloak too? Ship its compose/env/realm files and build its image on the server (two-step build+up); see [Keycloak Setup → Bring Up — Production](../infrastructure/KeycloakSetup.md#bring-up--production).

**On the deploy server:**

```bash
docker load < huella-images-<tag>.tar.gz   # docker load auto-decompresses gzip
docker images | grep huella-latam          # confirm all three :prod tags are present
```

## Start the stack

**On the deploy server**, with `--no-build` so it uses the loaded images and never tries to build (it errors clearly if a tag is missing — see [Troubleshooting](#troubleshooting)):

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
dcp up --no-build -d
dcp ps          # both services must reach "healthy"
curl http://localhost:8080/health   # → {"status":"ok", ...} with database connected
```

> Migrations must already be applied against the external DB (previous section) — the stack does not run them.

## Updates / upgrades

1. **Builder**: `git fetch && git checkout <new-tag>`, then `dcp build` + `docker save … | gzip` (as above). If only `VITE_*` changed but a rebuilt bundle still looks stale, force a clean layer: `dcp build --no-cache web`.
2. **Migrator**: `dcp --profile migrate run --rm migrate` to apply any new migrations, then re-check grants (ownership caveat above). Do **not** re-run `seed` — it is first-deploy only.
3. Transfer the new tarball; on the deploy server `docker load < …` then `dcp up --no-build -d` — recreates the changed containers from the new images.

## Troubleshooting

| Symptom                                                                                           | Cause / fix                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `up --no-build` fails with `No such image: huella-latam-…:prod`                                   | The image tarball was not loaded, or the tag differs. Run `docker load < huella-images-<tag>.tar.gz` and confirm with `docker images \| grep huella-latam`.                                                                                                                |
| `api` restart-loops at boot (`docker logs huella-latam-api-prod` shows a Prisma connection error) | **Expected while the DB is unreachable** — the API intentionally exits if it cannot connect at startup, and `restart: unless-stopped` retries until the DB answers. Fix the connectivity (route, firewall, `pg_hba.conf`, credentials), not the compose file.              |
| `/health` returns 503 `degraded`                                                                  | The DB dropped after boot. The API recovers on its own once the DB is reachable again.                                                                                                                                                                                     |
| `P1000: Authentication failed`                                                                    | Wrong credentials — or a non-URL-encoded password corrupting the connection string. Re-encode and retry.                                                                                                                                                                   |
| `permission denied for table ...`                                                                 | Missing grants for the application user — see the [ownership caveat](#database-roles--privileges-dba-contract).                                                                                                                                                            |
| Browser CORS errors                                                                               | `ALLOWED_ORIGIN` doesn't exactly match the web app's origin (scheme/host/port/trailing slash).                                                                                                                                                                             |
| Web calls the wrong API URL                                                                       | `VITE_API_BASE_URL` is baked into the `web` image at build time — fix the env file and **rebuild on the builder**, then re-deliver the tarball ([details](./docker-compose.md#web-serves-a-stale-or-wrong-api-url)). Re-running `up` on the deploy server won't change it. |
| Compose resolves a wrong/old value                                                                | Shell or direnv export overriding the env file ([precedence](./docker-compose.md#compose-uses-the-wrong-value-for-a-variable-shell--direnv-overrides---env-file)).                                                                                                         |
| Storage / Service Principal errors                                                                | See the [storage troubleshooting table](./docker-compose.md#storage-credential--service-principal-errors).                                                                                                                                                                 |

## Related docs

- [Docker Compose — Full Stack (local dev)](./docker-compose.md) — the dev stack, storage SP walkthrough, shared troubleshooting.
- [Keycloak Setup](../infrastructure/KeycloakSetup.md) — running Keycloak as the production IdP alongside this stack (`compose/keycloak.prod.yaml` + `compose/keycloak-db.yaml`).
- `.env.prod.dockercompose.example` — committed template; source of truth for every production var.
- [Operations Runbook](./runbook.md) — backup, restore, rollback, incident response.

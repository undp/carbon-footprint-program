# Production Deployment — On-Premise with External PostgreSQL

Deploy Huella Latam on a country's own server with `docker-compose.prod.yml`. Unlike the [local-dev stack](./docker-compose.md), only two containers run in Docker — **PostgreSQL is an external server** reached over the network, and **migrations/seeds are applied manually** by a developer before the stack starts.

```
              ┌────────── app server (Docker) ──────────┐
  browser ──► │  web :WEB_PORT   (nginx, SPA)            │
              │  api :API_PORT   (Fastify) ──────────────┼──► external PostgreSQL :5432
              └──────────────────────────────────────────┘     (same network, outside Docker)
```

TLS / reverse proxies are out of scope here, but if one fronts the stack, `ALLOWED_ORIGIN` and the `VITE_*` URLs must use the public HTTPS origin, not the server's internal address.

### Deployment model & roles

Images are **not built on the deploy server** and there is no registry. They are built on a separate machine, exported as a compressed tarball (`docker save | gzip`), transferred, and loaded on the deploy server (`docker load`) — an air-gapped flow. Three roles, which may be the same or different people:

| Role              | Has                                        | Does                                                                                |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Builder**       | repo checkout + the deployment env file    | builds the images (bakes the country's `VITE_*` into `web`) and `docker save`s them |
| **Migrator**      | repo checkout + network access to the DB   | runs `prisma migrate deploy` + seeds (once, and on every upgrade)                   |
| **Deploy person** | the deploy server + the env file + tarball | `docker load`s the images and runs the stack with `--no-build`                      |

> The **same** populated `.env.prod.dockercompose` is the deployment's complete config — it travels with the image tarball. The builder needs it (the `VITE_*` are baked into the `web` image at build time); the deploy person needs it (the API's runtime vars — `DATABASE_URL`, `JWT_SECRET`, …). Compose interpolates the whole file regardless of the command, so keep it complete in both places.

## Prerequisites

- **Deploy server**: Docker Engine + Compose v2 (`docker compose version`). It needs only `docker-compose.prod.yml`, the filled env file, and the image tarball — **not** the repo, Node, or pnpm.
- **Builder machine**: a git checkout of the repo at the release tag, Docker, and the filled env file (to bake `VITE_*`). May be the same machine as the migrator.
- **External PostgreSQL ≥ 15** (project standard: 18). Migrations use `NULLS NOT DISTINCT`, which requires 15+; `pnpm --filter @repo/database validate:version` enforces this.
- **Database and roles provisioned by the DBA** — see the [contract below](#database-roles--privileges-dba-contract). The repo ships no provisioning SQL.
- **Network reachability**:
  - app server → DB server `:5432`. Containers reach external IPs through the host's NAT — no special Docker network config. The flip side: the DB server's `pg_hba.conf`/firewall must allow the **app server's IP** (connections from containers arrive NATed behind it).
  - app server → Azure `*.ciamlogin.com` (user auth). For file storage: app server → Azure `<account>.blob.core.windows.net` when `STORAGE_PROVIDER=azure_blob_storage`, or app server → the MinIO endpoint (`MINIO_ENDPOINT`) when `STORAGE_PROVIDER=minio`.
- **Azure resources**: Entra External ID app registrations (API + front), plus — only when `STORAGE_PROVIDER=azure_blob_storage` — a storage Service Principal ([creation walkthrough](./docker-compose.md#create-the-storage-service-principal-azure-portal)). MinIO deployments need none of the storage Azure resources; instead provision a bucket and an access key/secret on the MinIO server, with CORS allowing the web origin (`ALLOWED_ORIGIN`).
- **A dev machine with pnpm** and network access to the DB server, to run migrations and seeds.

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

## Migrations & seed (manual, from a dev machine)

Run from a repo checkout at the **same tag** being deployed, with network access to the DB:

```bash
# Use the MIGRATION user here (the API itself uses the application user).
export DATABASE_URL='postgresql://<migration-user>:<url-encoded-password>@<db-host>:5432/<db-name>?schema=public'

# Storage vars — REQUIRED BEFORE THE FIRST SEED (see warning below).
# Set the block that matches the provider you configured in the env file.
export STORAGE_PROVIDER=azure_blob_storage   # or: minio

# When STORAGE_PROVIDER=azure_blob_storage:
export AZURE_STORAGE_ACCOUNT_NAME=<account>
export AZURE_STORAGE_CONTAINER_NAME=files
export AZURE_STORAGE_TENANT_ID=<directory-tenant-id>
export AZURE_STORAGE_CLIENT_ID=<sp-client-id>
export AZURE_STORAGE_CLIENT_SECRET=<sp-secret>

# When STORAGE_PROVIDER=minio (instead of the Azure block above):
# export MINIO_ENDPOINT=http://<minio-host>:9000
# export MINIO_ACCESS_KEY=<access-key>
# export MINIO_SECRET_KEY=<secret-key>
# export MINIO_BUCKET=files

pnpm install
pnpm --filter @repo/database validate:version   # preflight: connectivity + PostgreSQL >= 15
pnpm --filter @repo/database prod:deploy        # prisma migrate deploy
pnpm --filter @repo/seed seed                   # first deploy only (idempotent)
```

> ⚠️ **Seed one-shot warning** — the seed skips entirely once the `country` table has rows, and the badge/terms seeds individually skip (with a warning) when storage is not configured for the selected `STORAGE_PROVIDER` (i.e. `STORAGE_PROVIDER` unset, or the provider's `AZURE_STORAGE_*` / `MINIO_*` vars unset or incomplete). Combined: if the first `seed` run happens **without** working storage vars, badges and terms & conditions are never seeded and **re-running is a permanent no-op**. Recovering afterwards requires DBA-level cleanup. Set `STORAGE_PROVIDER` and its storage vars before the first seed run.

If migrations ran as a user other than the application user, re-apply/verify the grants from the [DBA contract](#database-roles--privileges-dba-contract) before starting the stack.

## Image delivery (build → save → load)

**On the builder machine** (repo checkout + filled env file). The `web` image bakes the country's `VITE_*` at build time, so the env file must hold the real deployment URLs before building:

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose'
dcp build                       # builds huella-latam-api:prod and huella-latam-web:prod
docker save huella-latam-api:prod huella-latam-web:prod | gzip > huella-images-<tag>.tar.gz
```

Transfer **three artifacts** to the deploy server: `huella-images-<tag>.tar.gz`, `docker-compose.prod.yml`, and the filled `.env.prod.dockercompose`.

**On the deploy server:**

```bash
docker load < huella-images-<tag>.tar.gz   # docker load auto-decompresses gzip
docker images | grep huella-latam          # confirm both :prod tags are present
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
2. **Migrator**: run `prod:deploy` for any new migrations, then re-check grants (ownership caveat above).
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
- `.env.prod.dockercompose.example` — committed template; source of truth for every production var.
- [Operations Runbook](./runbook.md) — backup, restore, rollback, incident response.

# Docker Compose — Full Stack Operations

End-to-end guide for running Huella Latam via `docker-compose.yml`. Covers the local dev workflow, the production deployment notes, and the configuration of every service.

This compose file is designed as both the **local dev path** and the **template for productive deployments** — the same file works in both contexts; only the env file changes per environment.

---

## What this brings up

| Service    | Image                                  | Purpose                                                        | Host port    |
| ---------- | -------------------------------------- | -------------------------------------------------------------- | ------------ |
| `postgres` | `postgres:18-alpine`                   | Application database                                           | `5432` (cfg) |
| `migrate`  | `huella-latam-migrate:local` (builder) | One-shot: applies Prisma migrations + seeds the DB, then exits | —            |
| `api`      | `huella-latam-api:local`               | Fastify API server                                             | `8080` (cfg) |
| `web`      | (built from `apps/web/Dockerfile`)     | React SPA served by nginx                                      | `3000` (cfg) |

Boot order is enforced by `depends_on`:

```
postgres (healthy) → migrate (completed) → api → web
```

`migrate` reuses the `builder` stage of `apps/api/Dockerfile` (full source + `tsx` + Prisma) and exits 0 after migrations and seeding. The `api` waits for it via `condition: service_completed_successfully`.

---

## Prerequisites

```bash
docker --version          # Docker Engine
docker compose version    # Compose v2 plugin
docker info               # Daemon reachable
```

Host ports `3000`, `8080`, `5432` free — or override via env (see below).

---

## Quick start

```bash
cp .env.dockercompose.example .env.dockercompose
# edit values you need to change (typically: ports, JWT_SECRET, Azure storage SP)
docker compose --env-file .env.dockercompose up --build
```

> docker-compose only auto-loads a file literally named `.env`. The descriptive `.env.dockercompose` is passed explicitly via `--env-file`. The example is committed; `.env.dockercompose` is gitignored.

Suggested shell alias to avoid repeating the flag:

```bash
alias dc='docker compose --env-file .env.dockercompose'
dc up --build -d
dc ps
dc logs -f api
dc down
```

---

## Configuration via `.env.dockercompose`

The example file is organized in sections, each documented inline. Below is a recap of what each block controls.

### Database

| Var                          | Local default  | Notes                                                  |
| ---------------------------- | -------------- | ------------------------------------------------------ |
| `POSTGRES_USER`              | `huella`       | Postgres role + DB owner                               |
| `POSTGRES_PASSWORD`          | `huella`       | Change for any non-local environment                   |
| `POSTGRES_DB`                | `huella_latam` | Database name                                          |
| `POSTGRES_PORT_HOST_MAPPING` | `5432`         | Host port to reach Postgres (container is always 5432) |

### API core

| Var                            | Local default           | Notes                                                   |
| ------------------------------ | ----------------------- | ------------------------------------------------------- |
| `NODE_ENV`                     | `development`           | Use `production` for deployments                        |
| `API_HOST`                     | `0.0.0.0`               | Bind address inside the container                       |
| `API_PORT`                     | `8080`                  | Host port to reach the API (container is fixed at 8080) |
| `LOG_LEVEL`                    | `debug`                 | `debug` \| `info` \| `warn` \| `error`                  |
| `APP_VERSION`                  | `local`                 | Build identifier surfaced in logs / responses           |
| `ALLOWED_ORIGIN`               | `http://localhost:3000` | CORS origin allowed to call the API                     |
| `JWT_SECRET`                   | `super-secret-key`      | **CHANGE IN PRODUCTION** — strong random secret         |
| `LOCAL_BYPASS_REQUIRED_FIELDS` | `false`                 | Relaxes form validation for local testing               |

### Authentication

`AUTH_PROVIDER` chooses the strategy. The same compose supports every mode by passing the right env vars:

| Mode          | Required vars                                                                                         | Use case                       |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `none`        | —                                                                                                     | API fully open (local probe)   |
| `forced-user` | `FORCED_USER_EMAIL_WHEN_NO_PROVIDER`, `FORCED_USER_IDP_ID_WHEN_NO_PROVIDER`                           | Local dev with a fake user     |
| `jwks`        | `AZURE_TENANT_TYPE`, `AZURE_TENANT_ID`, `AZURE_TENANT_SUBDOMAIN` (if external), `AZURE_API_CLIENT_ID` | Productive Azure Entra ID auth |
| `easy-auth`   | —                                                                                                     | Azure App Service Easy Auth    |

`AZURE_TENANT_ID` here always means the **External ID (CIAM) tenant** — the tenant used to validate user tokens. Generic JWKS overrides (`JWKS_URI`, `JWKS_ISSUER`, etc.) are available for non-Azure IdPs.

### Azure Blob Storage

Used for file upload/download in the API and for seeding badges + terms & conditions in `migrate`.

Identity model:

- **Production on Azure** — leave `AZURE_STORAGE_TENANT_ID` / `_CLIENT_ID` / `_CLIENT_SECRET` empty. The compute (App Service / Container Apps) has Managed Identity, picked up automatically by `DefaultAzureCredential`.
- **Local in docker** — no Managed Identity, no `az` CLI. A dedicated Service Principal is needed in the **Directory tenant** (where the storage account lives). These vars are intentionally separate from `AZURE_TENANT_ID` (JWKS) so the SP can live in a different tenant than the auth tenant — which is the typical Huella Latam setup (Entra External ID for auth, Directory tenant for infra).

The seeds skip badge + terms upload if `AZURE_STORAGE_ACCOUNT_NAME` is empty (warning log, exit 0). To enable them locally, follow the SP setup below.

#### Creating the storage Service Principal (Azure Portal — primary)

Step-by-step from zero, assuming no app registration or secret exists yet.

##### 0. Pre-check — correct tenant

Upper-right corner of the portal → click your avatar → **Switch directory**. Make sure you are in the **Directory tenant** (where the storage account lives, **not** the Entra External ID tenant used for end-user auth).

##### 1. Create the App Registration (the SP "shell")

1. Portal search → **Microsoft Entra ID**.
2. Left menu → **App registrations**.
3. Click **+ New registration**.
4. Fill in:
   - **Name**: `huella-local-storage`
   - **Supported account types**: **Accounts in this organizational directory only (Single tenant)**.
   - **Redirect URI**: leave empty (not applicable).
5. Click **Register**.
6. You land on the **Overview** of the new app registration. Copy these two values:
   - **Application (client) ID** → will be your `AZURE_STORAGE_CLIENT_ID`.
   - **Directory (tenant) ID** → will be your `AZURE_STORAGE_TENANT_ID`.

##### 2. Create the Client Secret

1. Same app registration → left menu → **Certificates & secrets**.
2. **Client secrets** tab → **+ New client secret**.
3. Fill in:
   - **Description**: `huella-local-dev` (or any identifiable name).
   - **Expires**: 6 months or 1 year (for dev).
4. Click **Add**.
5. ⚠ **Copy the `Value` NOW** — shown in plaintext only once. After a reload, it's masked forever. This is your `AZURE_STORAGE_CLIENT_SECRET`.
   - **Do NOT** copy the `Secret ID` column — that's the record identifier, not the secret.

##### 3. Assign the role on the Storage Account

1. Portal search → name of your **Storage account** (the value of `AZURE_STORAGE_ACCOUNT_NAME`).
2. Left menu → **Access Control (IAM)**.
3. Click **+ Add** → **Add role assignment**.
4. **Role** tab:
   - Search and select **Storage Blob Data Contributor**.
   - Click **Next**.
5. **Members** tab:
   - **Assign access to**: **User, group, or service principal**.
   - Click **+ Select members** → search by name (`huella-local-storage`) → select it → **Select**.
   - Click **Next**.
6. **Review + assign** tab → click **Review + assign**.
7. Wait 1–2 minutes for the role to propagate (otherwise you'll get `AuthorizationPermissionMismatch`).

##### 4. ⚠ Confirm Blob CORS allows the web origin

If the frontend talks **directly** to blob storage (uploads/downloads via SAS URLs from the browser), the storage account's CORS rules must permit the web origin. If only the API touches storage server-side, this step is not strictly required — but it costs nothing to set and avoids hard-to-debug CORS errors later.

1. Storage account → left menu → **Settings → Resource sharing (CORS)**.
2. **Blob service** tab → add a row:
   - **Allowed origins**: web app URL (e.g., `http://localhost:3000` for local, `https://app.your-domain.com` for prod). Multiple origins comma-separated.
   - **Allowed methods**: `GET, PUT, POST, DELETE, HEAD, OPTIONS`.
   - **Allowed headers**: `*` (or explicitly `Content-Type, x-ms-*, Authorization, x-ms-blob-content-type`).
   - **Exposed headers**: `*`.
   - **Max age (seconds)**: `3600`.
3. Click **Save** at the top.

> Symptoms of a missing CORS rule: browser console shows `CORS error` or `blocked by CORS policy` when uploading/downloading files; the API works fine via `curl` from the host.

##### 5. Paste into `.env.dockercompose`

```bash
AZURE_STORAGE_ACCOUNT_NAME=<storage-account-name>
AZURE_STORAGE_CONTAINER_NAME=files
AZURE_STORAGE_TENANT_ID=<Directory (tenant) ID from step 1.6>
AZURE_STORAGE_CLIENT_ID=<Application (client) ID from step 1.6>
AZURE_STORAGE_CLIENT_SECRET=<Value from step 2.5>
```

##### 6. Restart the stack clean

```bash
docker compose --env-file .env.dockercompose down -v
docker compose --env-file .env.dockercompose up --build
```

`-v` wipes the postgres volume → DB recreated from scratch → seed runs on an empty DB → `Seeding badges...` should now complete.

##### 7. Verify

```bash
dc exec migrate env | grep -E "AZURE_STORAGE_(TENANT|CLIENT)_ID"
# Both vars must appear non-empty.
```

Expected in the `migrate` log:

```
Seeding badges...
  ✓ <BADGE_TYPE> seeded
  ...
Seeding completed successfully for dataset: 'base'
```

##### 8. If something fails

| Symptom                                     | Cause / Fix                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `EnvironmentCredential is unavailable`      | One of the 3 storage vars missing or has stray spaces/quotes. Re-verify with the `env \| grep`.  |
| `AuthorizationPermissionMismatch`           | Role assignment hasn't propagated. Wait 2 min and retry.                                         |
| `Container 'files' does not exist`          | Create it: storage account → **Containers** → **+ Container** → name: `files`.                   |
| `InvalidAuthenticationTokenTenant`          | `AZURE_STORAGE_TENANT_ID` points to the wrong tenant. Must be the Directory tenant (step 0).     |
| Browser shows `CORS blocked` when uploading | Step 4 (CORS rule) missing or origin doesn't match exactly (check scheme, port, trailing slash). |

#### Alternative: `az` CLI

If you have the CLI working and Owner / User Access Admin on the subscription:

```bash
az login --tenant <DIRECTORY_TENANT_ID>
az account set --subscription <SUB_ID>
az ad sp create-for-rbac \
  --name huella-local-storage \
  --role "Storage Blob Data Contributor" \
  --scopes "/subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Storage/storageAccounts/<STORAGE>"
```

CORS is not configured by `create-for-rbac` — set it via portal (step 4) or:

```bash
az storage cors add \
  --account-name <STORAGE> \
  --services b \
  --methods GET PUT POST DELETE HEAD OPTIONS \
  --origins http://localhost:3000 \
  --allowed-headers '*' \
  --exposed-headers '*' \
  --max-age 3600
```

Workaround if the host `az` is broken (e.g., Python 3.14 argparse bug): run it from the official image:

```bash
alias daz='docker run --rm -it -v "$HOME/.azure:/root/.azure" mcr.microsoft.com/azure-cli az'
daz login --tenant <DIRECTORY_TENANT_ID> --use-device-code
daz ad sp create-for-rbac --name huella-local-storage --role "Storage Blob Data Contributor" --scopes ...
```

### Web build args

The `VITE_*` variables are **inlined into the SPA bundle at docker build time**. Changing them requires `--build`.

| Var                                 | Local default                                          |
| ----------------------------------- | ------------------------------------------------------ |
| `WEB_PORT`                          | `3000` (host port; container listens on 8080)          |
| `VITE_API_BASE_URL`                 | `http://localhost:8080`                                |
| `VITE_FRONT_BASE_URL`               | `http://localhost:3000`                                |
| `VITE_AZURE_FRONT_CLIENT_ID`        | `00000000-...` (placeholder unless using JWKS locally) |
| `VITE_AZURE_API_CLIENT_ID`          | `00000000-...`                                         |
| `VITE_AZURE_AUTH_AUTHORITY`         | `https://login.microsoftonline.com/organizations/v2.0` |
| `VITE_APP_VERSION`                  | `local`                                                |
| `VITE_IS_DEMO_APP`                  | `false`                                                |
| `VITE_LOCAL_BYPASS_REQUIRED_FIELDS` | `false`                                                |

See `docs/operations/web-docker.md` for the web image internals.

---

## Common workflows

### First boot

```bash
dc up --build
```

### Rebuild after backend code change

The `api` and `migrate` images need to be rebuilt:

```bash
dc up --build api migrate
```

Or full rebuild: `dc up --build`.

### Rebuild after frontend code change

The web bundle is baked at image build time, so any change needs `--build`:

```bash
dc up --build web
```

### Reset the database (start clean)

```bash
dc down -v
dc up --build
```

`-v` removes the named volume `postgres-data`. Only affects this compose's Postgres — your host's local DB is untouched.

### Run only a subset (skip `migrate`)

Useful when the seed is non-idempotent and the DB is already populated:

```bash
dc up -d postgres
dc up -d --no-deps api web
```

`--no-deps` bypasses the `migrate` gate.

### Apply migrations only (no seed)

```bash
dc up -d postgres
dc run --rm migrate pnpm --filter @repo/database prod:deploy
dc up -d --no-deps api web
```

The trailing argument overrides the migrate service's default command.

### Logs and shell access

```bash
dc logs -f               # all services, follow
dc logs -f api           # just one
dc exec api sh           # shell inside the running api container
dc exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Stop everything

```bash
dc down                  # stop + remove containers (keeps the volume)
dc down -v               # also remove the postgres volume (DB wipe)
```

---

## Production deployment notes

The same compose file is the productive template. The deltas come exclusively from the env file:

| Concern         | Local dev `.env`                                  | Production `.env`                                                           |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`      | `development`                                     | `production`                                                                |
| `JWT_SECRET`    | dev placeholder                                   | Strong random secret from a vault                                           |
| `AUTH_PROVIDER` | typically `jwks`                                  | `jwks`                                                                      |
| Azure storage   | Service Principal env vars set (Directory tenant) | All `AZURE_STORAGE_*_ID/SECRET` left **empty** — Managed Identity covers it |
| `VITE_*`        | `localhost` URLs                                  | Public URLs of the deployment                                               |
| Postgres        | inline container, ephemeral                       | External managed Postgres → set `DATABASE_URL` accordingly                  |

When `AZURE_STORAGE_TENANT_ID` / `_CLIENT_ID` / `_CLIENT_SECRET` are unset, the `getStorageCredential()` helper (`packages/database/src/utils/getStorageCredential.ts`, shared by the API and the seeds via `@repo/database/utils`) falls back to `DefaultAzureCredential`, which automatically picks the compute's Managed Identity on Azure. No code branching — the env file is the only difference.

---

## Troubleshooting

### `Bind for 0.0.0.0:5432 failed: port is already allocated`

Another Postgres (host install or container) is using the port. Either change `POSTGRES_PORT_HOST_MAPPING=5433` in your env file, or free the port (`sudo systemctl stop postgresql`, etc.). Internal services keep using `postgres:5432` via Docker network regardless.

### `CredentialUnavailableError: EnvironmentCredential is unavailable`

The three `AZURE_STORAGE_*` vars are not all set (or storage code is using the wrong helper). Verify:

```bash
dc exec migrate env | grep AZURE_STORAGE
```

All of `AZURE_STORAGE_TENANT_ID`, `AZURE_STORAGE_CLIENT_ID`, `AZURE_STORAGE_CLIENT_SECRET` must be present and non-empty. Recreate the SP if the secret expired.

### `AuthorizationPermissionMismatch` from blob storage

SP exists and credential is valid, but the role hasn't propagated yet (1–2 min) or the role/scope is wrong. Recheck: **Storage Blob Data Contributor** role assigned at the storage account scope.

### Seed fails with "Expected N emission factors but found M"

The seed isn't fully idempotent and the DB has stale/duplicated reference data. Reset:

```bash
dc down -v
dc up --build
```

Or skip the seed entirely with the "Apply migrations only" workflow above.

### `migrate` exits 0 but the DB looks empty

Confirm the connection target — `migrate` connects to `postgres:5432` (compose network), not to your host DB on `localhost:5432`. Inspect with:

```bash
dc exec postgres psql -U huella -d huella_latam -c "\dt"
```

### Web app can reach the API only on first load

Likely a `VITE_API_BASE_URL` mismatch — Vite inlines the URL at build time. After changing it in the env file, run `dc up --build web`.

### Azure CLI errors out with `badly formed help string` (Python 3.14)

Known argparse incompatibility. Use the dockerized CLI: `mcr.microsoft.com/azure-cli` (see the SP alternative above), or use the Azure portal flow instead.

---

## Related docs

- **[Web App Docker Guide](./web-docker.md)** — internals of the web image (nginx config, build args, hardening notes).
- `apps/api/Dockerfile` — API multi-stage build (also used as the `migrate` base).
- `apps/web/Dockerfile` — Web SPA build + nginx runtime.
- `.env.dockercompose.example` — committed template; the single source of truth for every var.

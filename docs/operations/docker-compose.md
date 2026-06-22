# Docker Compose — Full Stack Operations

Run the whole Huella Latam stack — Postgres, migrations + seed, API, and web — from a single `docker-compose.yml`. This file covers **local development**; production on-premise deployments use `docker-compose.prod.yml` against an external PostgreSQL — see the [Production Deployment guide](./production-deployment.md).

## Services & boot order

| Service    | Image                            | Purpose                                          | Host port    |
| ---------- | -------------------------------- | ------------------------------------------------ | ------------ |
| `postgres` | `postgres:18-alpine`             | Application database                             | `5432` (cfg) |
| `migrate`  | `huella-latam-migrate:local`     | One-shot: applies migrations + seeds, then exits | —            |
| `api`      | `huella-latam-api:local`         | Fastify API                                      | `8080` (cfg) |
| `web`      | built from `apps/web/Dockerfile` | React SPA served by nginx                        | `3000` (cfg) |

`depends_on` enforces the order:

```
postgres (healthy) → migrate (completed) → api (healthy) → web
```

`migrate` reuses the `builder` stage of `apps/api/Dockerfile` (it already has the source, `tsx`, and Prisma) and exits 0 after seeding; `api` waits on `condition: service_completed_successfully`. `api` exposes a `/health` check, and `web` waits on `condition: service_healthy` so it only comes up once the API is actually serving.

## Quick start

Requires Docker Engine + the Compose v2 plugin (`docker compose version`). Host ports `3000`, `8080`, `5432` must be free (or override them — see [Configuration](docker-compose.md#configuration)).

```bash
cp .env.dockercompose.example .env.dockercompose
docker compose --env-file .env.dockercompose up --build
```

The defaults boot a working local stack (auth disabled, storage disabled). Edit the env file only for what you need — typically ports, `JWT_SECRET`, and the Azure storage Service Principal.

> Compose auto-loads only a file literally named `.env`. Ours is `.env.dockercompose` (gitignored; the `.example` is committed), so it's passed explicitly with `--env-file`.

Handy alias used throughout this guide:

```bash
alias dc='docker compose --env-file .env.dockercompose'
dc up --build -d   # start detached
dc ps              # status
dc logs -f api     # follow one service
dc down            # stop
```

## Configuration

`.env.dockercompose` is sectioned and documented inline; this is the recap of what each block controls.

### Database

| Var                          | Default        | Notes                                |
| ---------------------------- | -------------- | ------------------------------------ |
| `POSTGRES_USER`              | `huella`       | Role + DB owner                      |
| `POSTGRES_PASSWORD`          | `huella`       | Change outside local                 |
| `POSTGRES_DB`                | `huella_latam` | Database name                        |
| `POSTGRES_PORT_HOST_MAPPING` | `5432`         | Host port (container is always 5432) |

### API core

| Var                            | Default                 | Notes                                      |
| ------------------------------ | ----------------------- | ------------------------------------------ |
| `NODE_ENV`                     | `development`           | `production` for deployments               |
| `API_HOST`                     | `0.0.0.0`               | Bind address inside the container          |
| `API_PORT`                     | `8080`                  | **Host** port (container is fixed at 8080) |
| `LOG_LEVEL`                    | `debug`                 | `debug` \| `info` \| `warn` \| `error`     |
| `APP_VERSION`                  | `local`                 | Shown in logs / responses                  |
| `ALLOWED_ORIGIN`               | `http://localhost:3000` | CORS origin allowed to call the API        |
| `JWT_SECRET`                   | `super-secret-key`      | **Change in production**                   |
| `LOCAL_BYPASS_REQUIRED_FIELDS` | `false`                 | Relaxes form validation (local only)       |

### Authentication

`AUTH_PROVIDER` selects the strategy:

| Mode          | Required vars                                                                                         | Use case                       |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `none`        | —                                                                                                     | API open (simplest local boot) |
| `forced-user` | `FORCED_USER_EMAIL_WHEN_NO_PROVIDER`, `FORCED_USER_IDP_ID_WHEN_NO_PROVIDER`                           | Local dev with a fake user     |
| `jwks`        | `AZURE_TENANT_TYPE`, `AZURE_TENANT_ID`, `AZURE_TENANT_SUBDOMAIN` (if external), `AZURE_API_CLIENT_ID` | Azure Entra ID auth            |

`AZURE_TENANT_ID` is always the **Entra External ID (CIAM) tenant** that validates user tokens — distinct from the storage tenant below. For non-Azure IdPs, use the generic `JWKS_*` overrides.

### Web build args

`VITE_*` values are **inlined into the SPA bundle at build time** — literal strings in the compiled JS, not runtime config. Changing any of them requires `dc up --build web`.

> ⚠️ `API_PORT` and `VITE_API_BASE_URL` are independent. If you change the API's host port, update `VITE_API_BASE_URL` to match and rebuild `web` — otherwise the browser keeps calling the old port. See [Web serves a stale or wrong API URL](docker-compose.md#web-serves-a-stale-or-wrong-api-url).

| Var                                  | Default                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `WEB_PORT`                           | `3000` (host; container listens on 8080)                                    |
| `VITE_API_BASE_URL`                  | `http://localhost:8080`                                                     |
| `VITE_FRONT_BASE_URL`                | `http://localhost:3000`                                                     |
| `VITE_OIDC_ISSUER`                   | _(empty; set per IdP, e.g. Keycloak `http://localhost:8081/realms/huella`)_ |
| `VITE_OIDC_CLIENT_ID`                | `huella-web`                                                                |
| `VITE_OIDC_SCOPES`                   | `openid profile email offline_access`                                       |
| `VITE_OIDC_REDIRECT_URI`             | _(empty; defaults to `<origin>/auth/callback`)_                             |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | _(empty; defaults to the serving origin)_                                   |
| `VITE_APP_VERSION`                   | `local`                                                                     |
| `VITE_IS_DEMO_APP`                   | `false`                                                                     |
| `VITE_LOCAL_BYPASS_REQUIRED_FIELDS`  | `false`                                                                     |

See [web-docker.md](./web-docker.md) for the image internals.

### Azure Blob Storage (optional)

The API uses blob storage for file upload/download, and `migrate` uses it to seed badges + terms & conditions. **Leave `AZURE_STORAGE_ACCOUNT_NAME` empty to disable both** — the seeds log a warning and skip (exit 0), and the stack still boots. Set it up only when you need files or the badge/terms seeds locally.

`getStorageCredential()` picks the credential from **where the compute runs** — specifically, whether the host provides an Azure Managed Identity:

| Where the API / `migrate` runs           | `AZURE_STORAGE_*` SP vars | Credential used                                           |
| ---------------------------------------- | ------------------------- | --------------------------------------------------------- |
| **Local docker**                         | set all three             | explicit `ClientSecretCredential`                         |
| **On-premise / any non-Azure host**      | set all three             | explicit `ClientSecretCredential`                         |
| **Azure (App Service / Container Apps)** | leave all three empty     | `DefaultAzureCredential` → the compute's Managed Identity |

The deciding factor is the Managed Identity, not local-vs-production: only Azure-hosted compute has one, so only there can the SP vars stay empty. **Local and on-premise are the same case** — both authenticate with an explicit Service Principal. The storage account itself always lives in Azure (`<account>.blob.core.windows.net`) regardless of where the app runs, so any non-Azure host needs network reachability to it **plus** the SP credentials.

The SP's tenant (`AZURE_STORAGE_TENANT_ID`) is deliberately separate from the auth tenant (`AZURE_TENANT_ID`): the storage account lives in the **Directory tenant**, while end-user auth uses **Entra External ID**.

#### Create the storage Service Principal (Azure Portal)

Everything below is in the Azure Portal — no `az` CLI required.

1. **Select the right tenant.** Avatar (top-right) → **Switch directory** → the **Directory tenant** that owns the storage account (not the Entra External ID tenant).
2. **Register an app.** **Microsoft Entra ID → App registrations → + New registration**. Name `huella-local-storage`, **Single tenant**, no redirect URI → **Register**. From the **Overview**, copy:
   - **Application (client) ID** → `AZURE_STORAGE_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_STORAGE_TENANT_ID`
3. **Add a client secret.** Same app → **Certificates & secrets → Client secrets → + New client secret** → set an expiry → **Add**. Copy the **Value** immediately (shown only once) → `AZURE_STORAGE_CLIENT_SECRET`.
   > Copy the **Value**, not the **Secret ID** — the Secret ID is just the record identifier.
4. **Assign the role.** Storage account → **Access Control (IAM) → + Add → Add role assignment** → role **Storage Blob Data Contributor** → assign to the `huella-local-storage` SP. Wait 1–2 min for it to propagate.
5. **Allow CORS — only if the browser uploads directly to blob.** Storage account → **Resource sharing (CORS) → Blob service**: origins = web URL (`http://localhost:3000`), methods `GET, PUT, POST, DELETE, HEAD, OPTIONS`, allowed + exposed headers `*`, max-age `3600` → **Save**. Skip this if only the API touches storage server-side.
6. **Fill `.env.dockercompose`** (and make sure the container exists: storage account → **Containers → + Container** → `files`):
   ```bash
   AZURE_STORAGE_ACCOUNT_NAME=<storage-account-name>
   AZURE_STORAGE_CONTAINER_NAME=files
   AZURE_STORAGE_TENANT_ID=<Directory (tenant) ID — step 2>
   AZURE_STORAGE_CLIENT_ID=<Application (client) ID — step 2>
   AZURE_STORAGE_CLIENT_SECRET=<Value — step 3>
   ```
7. **Restart clean and verify:**
   ```bash
   dc down -v && dc up --build
   dc exec migrate env | grep AZURE_STORAGE   # the 3 SP vars must be non-empty
   ```
   The `migrate` log should show `Seeding badges...` completing. If it errors, see [Troubleshooting](docker-compose.md#troubleshooting).

## Common workflows

| Goal                                | Command                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| First boot                          | `dc up --build`                                               |
| Rebuild after a **backend** change  | `dc up --build api migrate`                                   |
| Rebuild after a **frontend** change | `dc up --build web`                                           |
| Reset the database (wipe + reseed)  | `dc down -v && dc up --build`                                 |
| Logs (all / one service)            | `dc logs -f` / `dc logs -f api`                               |
| Shell into a container              | `dc exec api sh`                                              |
| psql into the DB                    | `dc exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"` |
| Stop (keep data) / stop + wipe      | `dc down` / `dc down -v`                                      |

`down -v` removes only this compose's `postgres-data` volume — your host's local DB is untouched.

**Skip the seed** (DB already populated, or the seed isn't idempotent):

```bash
dc up -d postgres
dc up -d --no-deps api web        # --no-deps bypasses the migrate gate
```

**Migrations only, no seed:**

```bash
dc up -d postgres
dc run --rm migrate pnpm --filter @repo/database prod:deploy   # overrides the default command
dc up -d --no-deps api web
```

## Production deployment

Production on-premise does **not** use this compose file: it runs only `api` + `web` from `docker-compose.prod.yml` against an **external PostgreSQL**, with migrations and seeds applied manually. The full procedure — env setup, DB privileges, migration runbook, troubleshooting — lives in the [Production Deployment guide](./production-deployment.md).

One rule worth keeping in mind everywhere: the storage credential depends on **where the compute runs**, not local-vs-prod — on-premise (no Managed Identity) sets the three `AZURE_STORAGE_*` SP vars, Azure-hosted compute leaves them empty and falls back to its Managed Identity. See [Azure Blob Storage](docker-compose.md#azure-blob-storage-optional).

## Troubleshooting

### `Bind for 0.0.0.0:5432 failed: port is already allocated`

Another Postgres owns the host port. Either set `POSTGRES_PORT_HOST_MAPPING=5433` in your env file, or free the port (`sudo systemctl stop postgresql`). Internal services always reach Postgres at `postgres:5432` over the compose network regardless.

### Storage credential / Service Principal errors

| Symptom                                                               | Cause / fix                                                                                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CredentialUnavailableError` / `EnvironmentCredential is unavailable` | Not all three `AZURE_STORAGE_*` SP vars are set (or they have stray quotes/spaces). Check `dc exec migrate env \| grep AZURE_STORAGE`. |
| `AuthorizationPermissionMismatch`                                     | Role not propagated yet (wait 1–2 min) or wrong role/scope. Needs **Storage Blob Data Contributor** at the storage-account scope.      |
| `InvalidAuthenticationTokenTenant`                                    | `AZURE_STORAGE_TENANT_ID` is the wrong tenant — it must be the **Directory tenant** (step 1).                                          |
| `Container 'files' does not exist`                                    | Create it: storage account → **Containers → + Container** → `files`.                                                                   |
| Browser `CORS blocked` on upload/download                             | CORS rule missing or origin mismatch (scheme / port / trailing slash) — see step 5. The API still works via `curl` from the host.      |

### Seed fails with `Expected N emission factors but found M`

The seed isn't fully idempotent and the DB has stale or duplicated reference data. Reset with `dc down -v && dc up --build`, or use the migrations-only workflow above.

### `migrate` exits 0 but the DB looks empty

`migrate` connects to `postgres:5432` on the compose network, not your host's `localhost:5432`. Inspect the right DB:

```bash
dc exec postgres psql -U huella -d huella_latam -c "\dt"
```

### Web serves a stale or wrong API URL

`VITE_API_BASE_URL` is baked into the bundle at build time, so the browser keeps calling the old URL until the web image is rebuilt. After changing `API_PORT` or any `VITE_*`:

1. Update **both** `API_PORT` and `VITE_API_BASE_URL` so they match.
2. `dc up -d --build web`, then hard-refresh the browser (Ctrl/Cmd + Shift + R).

Still stale? Docker reused a cached layer. Check what's actually in the served bundle, and force a clean rebuild if needed:

```bash
docker exec huella-latam-web sh -c 'grep -roE "http://localhost:[0-9]+" /usr/share/nginx/html/assets/ | sort -u'
# old port still present → rebuild ignoring the layer cache:
dc down && dc build --no-cache web && dc up -d
```

> A leftover `http://localhost:5173` (Vite's HMR URL) can appear in some chunks — it's unused at runtime, ignore it.

### Compose uses the wrong value for a variable (shell / direnv overrides `--env-file`)

Compose interpolation precedence is **shell env > `--env-file` > defaults**. If a `.envrc` (loaded by direnv) exports `VITE_*` / `JWT_SECRET` for the `pnpm dev` workflow, those exports silently win over `.env.dockercompose`.

Diagnose:

```bash
env | grep '^VITE_'                  # what your shell exports
dc config | grep VITE_API_BASE_URL   # what compose actually resolves
```

If they differ, that's the conflict. Cleanest fixes:

- Move the `VITE_*` exports out of `.envrc` into `apps/web/.env.local` (Vite reads it in dev), so the two workflows never collide; or
- Run compose with a scrubbed environment: `alias dc='env -i HOME=$HOME PATH=$PATH USER=$USER docker compose --env-file .env.dockercompose'`; or
- Temporarily `direnv deny` while working with docker compose, then `direnv allow` to return to `pnpm dev`.

The rule applies to **every** interpolated var (`JWT_SECRET`, `AZURE_STORAGE_*`, `POSTGRES_*`, …) — if a value seems stuck on an old setting, check the shell first.

## Related docs

- [Production Deployment (on-premise)](./production-deployment.md) — `docker-compose.prod.yml` against an external PostgreSQL.
- [Web App Docker Guide](./web-docker.md) — web image internals (nginx config, build args, hardening notes).
- `apps/api/Dockerfile` — API multi-stage build (also the `migrate` base).
- `apps/web/Dockerfile` — web SPA build + nginx runtime.
- `.env.dockercompose.example` — committed template; the source of truth for every var.
- `.env.prod.dockercompose.example` — the production counterpart, consumed by `docker-compose.prod.yml`.

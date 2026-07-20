# Local Development Setup

This guide walks through setting up a complete local development environment from scratch.

For deployment to Azure, see [Infrastructure Deployment](../infrastructure/Deployment.md).

---

## Prerequisites

| Tool          | Version    | Purpose                                           |
| ------------- | ---------- | ------------------------------------------------- |
| **Node.js**   | ≥ 24.0.0   | Runtime for API and build tools                   |
| **pnpm**      | ≥ 10.23.0  | Package manager                                   |
| **Docker**    | Any recent | Local PostgreSQL database                         |
| **direnv**    | Any        | Automatic `.envrc` loading (recommended)          |
| **Azure CLI** | ≥ 2.59.0   | Required for file upload features and deployments |
| **Git**       | Any        | Version control                                   |

**Verify your installation:**

```bash
node --version    # Must be >= 24.0.0
pnpm --version    # Must be >= 10.23.0
docker --version
az --version      # For Azure features
```

**Install pnpm** (if not installed):

```bash
npm install -g pnpm
# or
corepack enable && corepack prepare pnpm@latest --activate
```

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/undp/carbon-footprint-program.git
cd carbon-footprint-program
```

---

## Step 2 — Install Dependencies

```bash
pnpm install
```

This installs dependencies for all apps and packages in the monorepo simultaneously.

---

## Step 3 — Configure Environment Variables

Copy the root template and fill in the required values:

```bash
cp .envrc.template .envrc
```

Edit `.envrc` with your configuration. See [Environment Variables](./environment-variables.md) for a full reference.

**Minimum required values for local development:**

```bash
# Database (set after starting the local DB in Step 4)
export DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb"

# API
export NODE_ENV="development"
export LOG_LEVEL="debug"
export AUTH_PROVIDER="forced-user"
export FORCED_USER_EMAIL="dev@example.com"
export FORCED_USER_IDP_ID="local-dev-user"
```

**Load environment variables:**

Option A — Using direnv (recommended):

```bash
direnv allow
```

Variables are automatically reloaded whenever `.envrc` changes.

Option B — Manual:

```bash
source .envrc
```

> ⚠️ Never commit `.envrc` or `.env` files. They are listed in `.gitignore`.

---

## Step 4 — Start Supporting Services

A working local stack needs a database, and — for a full authenticated flow — an Identity Provider and object storage. Bring up what your configuration requires before running `pnpm dev`.

### Database (always required)

```bash
cd packages/database
docker compose up -d
```

This starts a PostgreSQL container using the configuration in `packages/database/docker-compose.yml`.

**Verify the container is running:**

```bash
docker ps
```

### Keycloak — local OIDC IdP (recommended for a full login flow)

With `AUTH_PROVIDER=forced-user` (Step 3) you don't need an IdP — the API auto-authenticates every request. To exercise a real browser login locally without an Azure tenant, run the bundled Keycloak overlay. It needs **no configuration** (admin/admin and its DB defaults are baked into the compose files) — bring it up straight from the repo root:

```bash
docker compose --project-directory . -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml up -d
```

(Running the api/web in Docker too, instead of `pnpm dev`? Combine the overlay with the base stack in one invocation — see [Keycloak Setup → Quick Setup](../infrastructure/KeycloakSetup.md#quick-setup) for that variant.)

- **Admin console:** http://localhost:18080 — bootstrap admin `admin` / `admin`.
- On first boot the realm `huella` and client `huella-web` are imported automatically, so the OIDC login works out of the box.

Then switch the API to `AUTH_PROVIDER=jwks` and set the `JWKS_*` variables (see [Authentication](#authentication-local-development) below). Full walkthrough: [Keycloak authentication setup](../infrastructure/KeycloakSetup.md).

### MinIO — object storage (required when `STORAGE_PROVIDER=minio`)

File-upload features need object storage. When `STORAGE_PROVIDER=minio` (the local default), start MinIO in its own opt-in compose file:

```bash
docker compose -f docker-compose.minio.yml up -d
```

- **Console:** http://localhost:9001 — default credentials `minioadmin` / `minioadmin`.
- Set `MINIO_ENDPOINT=http://localhost:9000` when the API runs on the host via `pnpm dev`.

See [File Storage](../infrastructure/FileStorage.md) for the full reference (and Azure Blob as an alternative — see [File Upload](#file-upload-local-development) below).

---

## Step 5 — Run Database Migrations and Seed

From the `packages/database` directory:

```bash
# Apply all pending migrations
pnpm dev:migrate

# Generate the Prisma client (TypeScript types + query builder)
pnpm dev:generate
```

Then, from the **root** directory:

```bash
# Seed the database with initial data
pnpm db:seed
```

Or do everything in one command from the **root** directory:

```bash
pnpm db:restore
```

This resets the database, applies all migrations, and runs seeds in one command.

> **Seeding is skipped when the database already has data.** `pnpm db:seed` only seeds a fresh database — if any data already exists it logs `Database already contains data` and exits without changes. To reseed, reset the database first with `pnpm db:restore`.

> **The local DB uses a named Docker volume (`postgres_data` in `packages/database/docker-compose.yml`), so it survives `docker compose down` and machine restarts.** On a machine that ran the stack before, the database is _not_ fresh: `pnpm dev:migrate` reports "Already in sync" and `pnpm db:seed` skips with "Database already contains data" — even though it may look empty for your current work. To get a clean, fully-seeded database, run `pnpm db:restore` (reset + migrate + seed).

---

## Step 6 — Start Development Servers

From the **root directory**:

```bash
pnpm dev
```

This starts all services concurrently:

| Service            | URL                            |
| ------------------ | ------------------------------ |
| **API**            | http://localhost:8080          |
| **Web (frontend)** | http://localhost:5173          |
| **Swagger UI**     | http://localhost:8080/api/docs |

Both servers support **hot reload** — code changes are automatically reflected without manual restarts.

**Start only a specific app:**

```bash
pnpm dev:api   # API only
pnpm dev:web   # Frontend only
```

---

## Step 7 — Verify Setup

1. Open http://localhost:5173 — you should see the application UI
2. Open http://localhost:8080/api/docs — you should see the Swagger documentation
3. Check the API health: `curl http://localhost:8080/health`

With `AUTH_PROVIDER=forced-user`, the API automatically authenticates all requests as the configured user. No browser login is required for local development.

---

## Development Workflow

### Running Tests

```bash
# Run all API tests
pnpm test

# Run a specific test file
pnpm test --filter=api -- /getOrganizationById/integration.test.ts --coverage=false

# Run all tests for a domain
pnpm test --filter=api -- /organizations --coverage=false
```

Tests use **Testcontainers** — they spin up real PostgreSQL and Azurite (Azure Storage emulator) containers automatically.

> ⚠️ Docker must be running for tests to work.

### Code Quality

```bash
# Lint all code (must pass with zero warnings)
pnpm lint

# Type-check all TypeScript
pnpm type-check

# Format all code
pnpm format

# Check formatting without making changes (used in CI)
pnpm format:check
```

### Building for Production

```bash
# Build all apps and packages
pnpm build

# Build a specific app
pnpm --filter api build
pnpm --filter web build
```

### Cleaning Build Artifacts

```bash
pnpm clean
```

---

## Database Management

> **Note:** Run these commands from the `packages/database` directory, or use `pnpm --filter=@repo/database <command>` from the root. Exceptions: `pnpm db:seed`, `pnpm db:provision`, `pnpm db:restore`, and `pnpm db:drop:worktree` are root-level scripts.

| Command                 | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `pnpm dev:migrate`      | Apply pending migrations                                        |
| `pnpm dev:generate`     | Regenerate Prisma client after schema changes                   |
| `pnpm dev:studio`       | Open Prisma Studio (visual DB browser) at http://localhost:5555 |
| `pnpm db:seed`          | Run database seed scripts (from root, via `@repo/seed`)         |
| `pnpm db:provision`     | Create + migrate + seed a database (from root; non-destructive) |
| `pnpm db:restore`       | Reset + re-seed (from root, ⚠️ destructive)                     |
| `pnpm db:drop:worktree` | Drop THIS worktree's private database (from root; see below)    |

### Running several git worktrees at once (optional)

Need to keep multiple git worktrees of this repo running at the same time? By
default they'd all fight over API port 8080 and the same database. Opt-in
per-worktree isolation gives each its own API port and database (and lets OIDC
redirects follow the actual web port). A single checkout needs none of this and
keeps the defaults (API 8080, web 5173).

See **[Running several git worktrees at once](./worktree-isolation.md)** for the
full guide — turning it on, first-time provisioning, ADE automation, login/OIDC
behavior, and common pitfalls.

### Creating a New Migration

After modifying `packages/database/src/prisma/schema.prisma`:

```bash
cd packages/database
pnpm dev:migrate
# Enter a name for the migration when prompted (e.g., "add_new_field")
pnpm dev:generate
```

Always regenerate the client after schema changes so TypeScript types stay in sync.

---

## File Upload (Local Development)

File upload requires `STORAGE_PROVIDER` to be set — there is no default, and the API refuses to boot without it. Local dev defaults to `minio` (the value in `infra/.envrc.template`); set the `MINIO_*` vars and point the API at a MinIO/S3-compatible server.

To use Azure Blob Storage locally instead, set `STORAGE_PROVIDER=azure_blob_storage`. The simplest local path is to sign in with the Azure CLI and let `DefaultAzureCredential` pick up that identity — no secrets in your `.envrc`:

```bash
# Sign in once; DefaultAzureCredential resolves your az login identity locally
az login

# Set storage variables in .envrc
export STORAGE_PROVIDER="azure_blob_storage"
export AZURE_STORAGE_ACCOUNT_NAME="your-storage-account-name"
export AZURE_STORAGE_CONTAINER_NAME="files"
```

Your signed-in principal needs the **Storage Blob Data Contributor** role on the storage account (or container).

`DefaultAzureCredential` resolves a Managed Identity when hosted on Azure and falls back to your `az login` identity locally. Providing an explicit Service Principal is **optional** — set all three variables only when you can't use the CLI (e.g. CI, or a no-CLI host):

```bash
# Optional: explicit Service Principal (only used when ALL THREE are set)
export AZURE_STORAGE_TENANT_ID="..."
export AZURE_STORAGE_CLIENT_ID="..."
export AZURE_STORAGE_CLIENT_SECRET="..."
```

See [File Storage](../infrastructure/FileStorage.md) for the full reference.

---

## Authentication (Local Development)

The recommended local auth mode is `forced-user`, which bypasses real authentication:

```bash
export AUTH_PROVIDER="forced-user"
export FORCED_USER_EMAIL="dev@example.com"
export FORCED_USER_IDP_ID="local-dev-user-001"
```

To test with real Azure Entra ID authentication locally, switch to `AUTH_PROVIDER=jwks` and configure the `JWKS_*` variables (derived from your IdP/tenant). See [Environment Variables](./environment-variables.md) and [Azure Entra authentication setup](../infrastructure/AzureAuthenticationSetup.md).

To run a full OIDC login locally **without** an Azure tenant, use the bundled Keycloak IdP (compose overlay from [Step 4](#step-4--start-supporting-services)) — see [Keycloak authentication setup](../infrastructure/KeycloakSetup.md).

> ⚠️ If the API runs on the host (`pnpm dev`), use `localhost:18080` for `JWKS_URI`; `keycloak:8080` only resolves inside compose. See [Keycloak authentication setup → The Issuer vs JWKS Host Split](../infrastructure/KeycloakSetup.md#the-issuer-vs-jwks-host-split).

> ⚠️ **Switching auth providers locally is unsupported against an existing DB.** User identity is keyed on the IdP subject (`idpUserId`), and `email` is unique. If you change `AUTH_PROVIDER`/IdP (e.g. Keycloak → Azure Entra) and then sign in with an email that already exists in the DB from the previous provider, the new IdP subject won't match the stored one and login fails for that account. Either reset the DB (`pnpm db:restore`) or sign in with a fresh email.

---

## Troubleshooting

**`pnpm install` fails:**

- Ensure Node.js ≥ 24.0.0: `node --version`
- Try clearing the pnpm store: `pnpm store prune`

**Database connection refused:**

- Check Docker is running: `docker ps`
- Check the database container is up: `docker ps | grep postgres`
- Verify `DATABASE_URL` matches the `docker-compose.yml` credentials

**Prisma client not found / type errors after schema change:**

```bash
cd packages/database && pnpm dev:generate
```

**Port already in use:**

- API default port is `8080`. Override with `API_PORT=8081` in `.envrc` (pick a port outside the [stack's default ports](./troubleshooting.md#a-supporting-service-port-is-already-in-use))
- Web default port is `5173`. Vite will auto-increment if taken

**Tests fail with "Docker not available":**

- Ensure Docker daemon is running
- On Linux: `sudo systemctl start docker`
- On macOS/Windows: start Docker Desktop

**401 on every API call / JWKS fetch failure (host `pnpm dev` with Keycloak):**

- When the API runs on the **host** (not in compose), it can't resolve the in-compose `http://keycloak:8080/...` host. Set `JWKS_URI=http://localhost:18080/realms/huella/protocol/openid-connect/certs`.
- Keep `JWKS_ISSUER=http://localhost:18080/realms/huella` (the browser-facing host). Detail: [Keycloak authentication setup → The Issuer vs JWKS Host Split](../infrastructure/KeycloakSetup.md#the-issuer-vs-jwks-host-split).

**Database looks empty but migrations/seed do nothing (reused machine):**

- The local Postgres uses a **named Docker volume** (`postgres_data`), so it persists across restarts. On a machine that ran the stack before, `pnpm dev:migrate` reports "Already in sync" and `pnpm db:seed` skips with "Database already contains data".
- For a clean, fully-seeded DB, run `pnpm db:restore` (reset + migrate + seed).

**Broken image/file links after changing `STORAGE_PROVIDER`:**

- Switching `STORAGE_PROVIDER` after data exists leaves previously-stored files (badges, uploads) pointing at the old backend → broken links. Reseed (`pnpm db:restore`) or migrate the objects to the new backend. See [File Storage → Switching storage providers](../infrastructure/FileStorage.md#switching-storage-providers).

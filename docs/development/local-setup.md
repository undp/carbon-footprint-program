# Local Development Setup

This guide walks through setting up a complete local development environment from scratch.

For deployment to Azure, see [Infrastructure Deployment](../Infra/Deployment.md).

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 24.0.0 | Runtime for API and build tools |
| **pnpm** | ≥ 10.23.0 | Package manager |
| **Docker** | Any recent | Local PostgreSQL database |
| **direnv** | Any | Automatic `.envrc` loading (recommended) |
| **Azure CLI** | ≥ 2.59.0 | Required for file upload features and deployments |
| **Git** | Any | Version control |

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
git clone https://github.com/in-ventures/undp-huella-latam.git
cd undp-huella-latam
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
export FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
export FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="local-dev-user"
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

## Step 4 — Start Local Database

```bash
cd packages/database
docker compose up -d
```

This starts a PostgreSQL container using the configuration in `packages/database/docker-compose.yml`.

**Verify the container is running:**
```bash
docker ps
```

---

## Step 5 — Run Database Migrations and Seed

From the `packages/database` directory:

```bash
# Apply all pending migrations
pnpm dev:migrate

# Generate the Prisma client (TypeScript types + query builder)
pnpm dev:generate

# Seed the database with initial data
pnpm dev:seed
```

Or from the **root** directory:
```bash
pnpm db:reset
```
This resets the database, applies all migrations, and runs seeds in one command.

---

## Step 6 — Start Development Servers

From the **root directory**:

```bash
pnpm dev
```

This starts all services concurrently:

| Service | URL |
|---|---|
| **API** | http://localhost:8080 |
| **Web (frontend)** | http://localhost:5173 |
| **Swagger UI** | http://localhost:8080/api/docs |

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
3. Check the API health: `curl http://localhost:8080/api/health`

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

| Command | Description |
|---|---|
| `pnpm dev:migrate` | Apply pending migrations |
| `pnpm dev:generate` | Regenerate Prisma client after schema changes |
| `pnpm dev:seed` | Run database seed scripts |
| `pnpm dev:studio` | Open Prisma Studio (visual DB browser) at http://localhost:5555 |
| `pnpm dev:reset` | Reset DB and re-apply all migrations (⚠️ destructive) |
| `pnpm db:reset` | Reset + re-seed (from root, ⚠️ destructive) |

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

File upload requires access to a real Azure Storage account. The API uses `DefaultAzureCredential`, which falls back to your `az login` session locally.

```bash
# Log in to Azure
az login

# Set storage variables in .envrc
export AZURE_STORAGE_ACCOUNT_NAME="your-storage-account-name"
export AZURE_STORAGE_CONTAINER_NAME="files"
```

If `AZURE_STORAGE_ACCOUNT_NAME` is not set, the API starts normally but file endpoints return HTTP 503.

---

## Authentication (Local Development)

The recommended local auth mode is `forced-user`, which bypasses real authentication:

```bash
export AUTH_PROVIDER="forced-user"
export FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
export FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="local-dev-user-001"

# Optional: make this user a superadmin automatically
export BOOTSTRAP_SUPERADMIN="true"
```

To test with real Azure Entra ID authentication locally, switch to `AUTH_PROVIDER=jwks` and configure the Azure tenant variables. See [Environment Variables](./environment-variables.md) and [MSAL / Easy Auth Setup](../MSAL-EasyAuth-Setup.md).

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
- API default port is `8080`. Override with `API_PORT=8081` in `.envrc`
- Web default port is `5173`. Vite will auto-increment if taken

**Tests fail with "Docker not available":**
- Ensure Docker daemon is running
- On Linux: `sudo systemctl start docker`
- On macOS/Windows: start Docker Desktop

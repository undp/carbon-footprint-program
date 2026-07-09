# Troubleshooting and FAQ

Central reference for common problems encountered during local development, testing, and deployment. Covers the issues most frequently reported or scattered across other guides.

This is the **first-stop hub**. Deep, domain-specific troubleshooting lives next to its domain doc — check the index below and follow the links rather than expecting every detail here.

### Domain-specific troubleshooting

| Area                                       | See                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Local setup (step-by-step + its own FAQ)   | [Local Setup](./local-setup.md)                                                          |
| Docker Compose (full stack, env, services) | [docker-compose reference](../operations/docker-compose.md)                              |
| Keycloak (local OIDC IdP)                  | [Keycloak Authentication Setup](../infrastructure/KeycloakAuthenticationSetup.md)        |
| Azure Entra ID auth                        | [Azure Authentication Setup](../infrastructure/AzureAuthenticationSetup.md)              |
| Generic OIDC contract                      | [Generic OIDC Authentication Setup](../infrastructure/GenericOidcAuthenticationSetup.md) |
| Object storage (MinIO / Azure Blob)        | [File Storage](../infrastructure/FileStorage.md)                                         |
| Deployment / infrastructure                | [Deployment](../infrastructure/Deployment.md)                                            |

---

## Local Development

### `pnpm install` fails

**Symptom:** `pnpm install` exits with an error about unsupported engine or missing lockfile entries.

**Causes and fixes:**

| Cause                             | Fix                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node.js version < 24              | Upgrade: `nvm install 24 && nvm use 24`                                                                                  |
| pnpm version < 10.23              | Upgrade: `npm install -g pnpm@latest`                                                                                    |
| Corrupted pnpm store              | `pnpm store prune`, then retry                                                                                           |
| Lockfile out of sync after rebase | `pnpm install --frozen-lockfile` will fail; run `pnpm install` without the flag, inspect the diff, commit if intentional |

---

### Database connection refused

**Symptom:** API startup fails with `ECONNREFUSED 127.0.0.1:5432` or Prisma throws a connection error.

**Checklist:**

1. Is Docker running? `docker ps`
2. Is the database container up? `docker ps | grep postgres`
3. Does `DATABASE_URL` match the credentials in `packages/database/docker-compose.yml`?
4. Did you start the container from `packages/database`? `cd packages/database && docker compose up -d`

If the container exited unexpectedly: `docker compose logs postgres` to view the error.

---

### Prisma client type errors after schema change

**Symptom:** TypeScript errors referencing undefined fields on Prisma models, or `@prisma/client` types don't reflect recent schema changes.

**Fix:**

```bash
cd packages/database
pnpm dev:generate
```

Then rebuild any package that imports the database client:

```bash
pnpm build --filter=@repo/database...
```

If the types are still stale: `pnpm clean && pnpm build` from the root.

See [Packages and Monorepo Internals](./packages.md) for the full schema-change propagation chain.

---

### Port already in use

**Symptom:** API or web dev server fails to start with `EADDRINUSE`.

| Service    | Default port | Override                                     |
| ---------- | ------------ | -------------------------------------------- |
| API        | `8080`       | Set `API_PORT=8081` in `.envrc`              |
| Web (Vite) | `5173`       | Vite auto-increments to `5174`, `5175`, etc. |

Find and kill the process using a port:

```bash
lsof -i :8080 | grep LISTEN
kill -9 <PID>
```

---

### File upload returns HTTP 503

**Symptom:** Uploading a document to the platform returns a 503 error.

**Cause:** `STORAGE_PROVIDER` is unset (the API refuses to boot without it), or the selected provider's required vars are missing.

**Fix:** `STORAGE_PROVIDER` must be set — there is no default. The local `.envrc.template` defaults to `minio`; set its `MINIO_*` vars and start MinIO (`docker compose -f docker-compose.minio.yml up -d`). To use Azure Blob Storage locally instead:

```bash
export STORAGE_PROVIDER="azure_blob_storage"
export AZURE_STORAGE_ACCOUNT_NAME="your-storage-account-name"
export AZURE_STORAGE_CONTAINER_NAME="files"
```

Azure Blob uses `DefaultAzureCredential`, which **falls back to your `az login` session locally** — run `az login` (the signed-in principal needs the **Storage Blob Data Contributor** role on the account). No Service Principal is needed for the `az login` path; to use one explicitly instead (e.g. CI / no-CLI hosts), set all three of `AZURE_STORAGE_TENANT_ID` / `AZURE_STORAGE_CLIENT_ID` / `AZURE_STORAGE_CLIENT_SECRET`. See [Local Setup](./local-setup.md), [docker-compose reference](../operations/docker-compose.md), and [File Storage](../infrastructure/FileStorage.md).

---

### OIDC redirect URI mismatch

**Symptom:** After the login redirect, the IdP shows "redirect_uri mismatch" (Entra: "Reply URL specified in the request does not match the reply URLs configured for the application.").

**Cause:** The `/auth/callback` redirect URI sent by the frontend is not registered as a redirect URI on the IdP client (Entra app registration, Keycloak client, …).

**Fix:**

1. On the IdP, open the client/app registration and register the exact callback URL the app uses, e.g. `http://localhost:5173/auth/callback` (dev) or `https://<your-domain>/auth/callback` (prod).
2. If you override the default, make sure `VITE_OIDC_REDIRECT_URI` matches the registered URI exactly. When unset, the app uses `<serving-origin>/auth/callback`.

See [OIDC authentication setup](../infrastructure/GenericOidcAuthenticationSetup.md) for the full configuration (and the [Azure Entra](../infrastructure/AzureAuthenticationSetup.md) / [Keycloak](../infrastructure/KeycloakAuthenticationSetup.md) guides for a specific IdP).

---

### `AUTH_PROVIDER=forced-user` not working

**Symptom:** All API requests return 401 even though `AUTH_PROVIDER` is set to `forced-user`.

**Cause:** Environment variable not loaded, or the API was started before the variable was exported.

**Fix:**

```bash
direnv allow        # if using direnv
source .envrc       # if loading manually
pnpm dev:api        # restart the API
```

Verify the variable is set: `echo $AUTH_PROVIDER` — should print `forced-user`.

---

## Startup & Supporting Services (Docker)

A working local stack has four moving parts before `pnpm dev`: **Postgres** (`packages/database/docker-compose.yml`), an **IdP** (Keycloak overlay), **object storage** (MinIO), and the **app itself** on the host. Most first-run problems are one of these not being up, or an env mismatch between the host (`.envrc`) and the containers (`.env.dockercompose`). See [Local Setup](./local-setup.md) for the full sequence.

### Which env file? `.envrc` vs `.env.dockercompose`

Two different mechanisms, easily confused:

| You are running…                                 | Env source                                                      |
| ------------------------------------------------ | --------------------------------------------------------------- |
| The app on the **host** (`pnpm dev`)             | `.envrc` (loaded by direnv, or `source .envrc`)                 |
| The stack **in containers** (`docker compose …`) | `.env.dockercompose` (copied from `.env.dockercompose.example`) |

The bundled compose commands pass `--env-file .env.dockercompose` explicitly (Compose only auto-loads a file literally named `.env`). The legacy `docker-compose.env` is no longer used.

### Compose logs "variable is not set" warnings

**Symptom:** Starting only some services (e.g. `… up -d keycloak keycloak-db`) prints `WARN[…] The "X" variable is not set. Defaulting to a blank string`.

**Cause:** Compose interpolates **every** service in the merged files, even ones you didn't start; vars only referenced by the API/web services show as unset.

**Fix:** Harmless when you're only starting the supporting services — they don't read those vars. Passing `--env-file .env.dockercompose` quiets most of them.

### Compose uses a stale or wrong value for a variable

**Symptom:** A container receives a value you didn't put in `.env.dockercompose`.

**Cause:** Interpolation precedence is **shell env > `--env-file` > defaults**. If direnv has loaded `.envrc` (for `pnpm dev`), those exports silently win over `--env-file`.

**Fix:** See [docker-compose → variable precedence](../operations/docker-compose.md#compose-uses-the-wrong-value-for-a-variable-shell--direnv-overrides---env-file). Quickest workaround: run compose in a terminal where `.envrc` isn't loaded (`direnv deny`), or scrub the env for that command.

### A supporting-service port is already in use

Default host ports for the local stack:

| Service               | Port(s)         |
| --------------------- | --------------- |
| Postgres (app)        | `5432`          |
| API                   | `8080`          |
| Web (Vite)            | `5173`          |
| Keycloak              | `8081`          |
| MinIO (API + console) | `9000` / `9001` |

Find and free a port: `lsof -i :<port> | grep LISTEN` then `kill -9 <PID>`, or stop the container: `docker ps` → `docker stop <name>`.

### A container is unhealthy or exits immediately

**Checklist:**

1. `docker ps -a` — is the container `Up (healthy)`, `Restarting`, or `Exited`?
2. `docker compose … logs <service>` (`keycloak`, `minio`, `postgres`, …) — read the actual error.
3. Keycloak takes ~30–60s to become healthy on first boot (it imports the realm) — wait before assuming failure.

### Re-configured a service but nothing changed (persisted volumes)

**Symptom:** You changed a compose setting, the Keycloak realm, or the DB seed, but the old state persists.

**Cause:** The stack uses **named volumes** (`postgres_data`, `keycloak-db-data`, `minio-data`) that survive `down`/`up`, and the Keycloak realm is imported **only on first boot**.

**Fix:** Drop the volumes to start fresh: `docker compose … down -v`, then `up`. (For the app DB specifically, `pnpm db:restore` resets + migrates + seeds without touching Docker.)

### Database looks empty, or the seed was skipped

**Symptom:** `pnpm dev:migrate` says "Already in sync" and `pnpm db:seed` logs "Database already contains data — skipping" on what you thought was a clean machine.

**Cause:** The `postgres_data` volume persisted from a previous run — the DB isn't fresh.

**Fix:** `pnpm db:restore` (reset + migrate + seed). See also [Database connection refused](#database-connection-refused) above.

### API exits: `Cannot find module '@repo/constants/dist/index.js'`

**Symptom:** On `pnpm dev`, the API process exits at startup with `ERR_MODULE_NOT_FOUND` for a workspace package's `dist/`.

**Cause:** A workspace package wasn't built before the API imported it (historically a `turbo` `clean`/`build` race, since fixed by removing `^clean` from the `dev` task).

**Fix:** Build the packages once, then start: `pnpm build && pnpm dev`. If it recurs, the package watchers have since emitted `dist/` — just re-run `pnpm dev`.

### Keycloak admin console: "We are sorry… HTTPS required"

**Symptom:** Opening http://localhost:8081 (admin console) shows Keycloak's "HTTPS required" page.

**Cause:** The admin console is served by the **`master`** realm, whose default `sslRequired=external`; the imported realm export only sets the **`huella`** realm to `none`.

**Fix (local dev):** set the master realm's `sslRequired` to `NONE` — see [Keycloak → Troubleshooting](../infrastructure/KeycloakAuthenticationSetup.md#troubleshooting).

### Keycloak realm or client missing after `up`

**Symptom:** Login fails; the `huella` realm or the `huella-web` client isn't present in Keycloak.

**Cause:** The realm import (`infra/keycloak/realm-huella.json`) runs **only on first boot**.

**Fix:** `docker compose … down -v` to drop the `keycloak-db` volume, then `up` to re-import. See [Keycloak Authentication Setup](../infrastructure/KeycloakAuthenticationSetup.md).

### Web console logs "OIDC login is not configured"

**Symptom:** The browser console shows this error and the login button does nothing.

**Cause:** One of `VITE_OIDC_ISSUER` / `VITE_OIDC_CLIENT_ID` / `VITE_OIDC_SCOPES` is empty. The app still boots and renders public pages, but login is disabled until all three are set.

**Fix:** Set the three `VITE_OIDC_*` vars, then **restart the web dev server** (Vite reads `VITE_*` at startup). For a specific IdP, see the [Keycloak](../infrastructure/KeycloakAuthenticationSetup.md) / [Azure Entra](../infrastructure/AzureAuthenticationSetup.md) guides.

### Login fails after switching auth provider (same email)

**Symptom:** After switching `AUTH_PROVIDER` / IdP, signing in with an email that already exists in the DB fails (the app can't resolve or create your user).

**Cause:** Identity is keyed on the IdP subject (`idpUserId`), and email is unique. A new IdP issues a different subject for the same email, so the existing row can't be matched or re-created. Switching providers against a populated DB is **unsupported** locally.

**Fix:** `pnpm db:restore` (fresh DB), or sign in with a different email. See [Local Setup → Authentication](./local-setup.md).

### New account can't reach `/admin` (not a superadmin)

**Symptom:** You logged in successfully, but admin routes return 403 or aren't visible.

**Cause:** Just-in-time provisioning always creates users with the default `USER` role — it never grants admin.

**Fix:** Set `SUPERADMIN_EMAIL` to the email you log in with, then run `pnpm db:promote-superadmin`.

### API won't boot: "STORAGE_PROVIDER is required"

**Symptom:** The API exits at startup with `STORAGE_PROVIDER is required. Allowed values are: azure_blob_storage, minio.`

**Fix:** Set `STORAGE_PROVIDER` — `minio` locally (plus its `MINIO_*` vars, and start MinIO), or `azure_blob_storage` (+ `AZURE_STORAGE_ACCOUNT_NAME`). There is no default. See [File upload returns HTTP 503](#file-upload-returns-http-503) above and [File Storage](../infrastructure/FileStorage.md).

### Azure Blob returns 403 even after `az login`

**Symptom:** With `STORAGE_PROVIDER=azure_blob_storage` and a valid `az login`, uploads/downloads fail with 403. (The startup health check only logs a warning, so this surfaces at call time, not at boot.)

**Cause:** The signed-in principal lacks the **Storage Blob Data Contributor** role on the storage account (required for the user-delegation SAS the adapter issues).

**Fix:** Grant that role on the account, or switch to `STORAGE_PROVIDER=minio`. See [File Storage](../infrastructure/FileStorage.md).

### Badges or uploaded files 404 after switching STORAGE_PROVIDER

**Symptom:** After changing `STORAGE_PROVIDER`, previously-stored assets (badges, inventory/submission files) return broken links.

**Cause:** `file.blob_path` in the DB is provider-agnostic, but the object only exists in the backend it was originally uploaded to.

**Fix:** Reseed (`pnpm db:restore`), copy the objects between backends, or repoint the DB keys — see [File Storage → Switching storage providers](../infrastructure/FileStorage.md#switching-storage-providers).

---

## Testing

### Tests fail with "Docker not available"

**Symptom:** Testcontainers throws `Error: Cannot connect to the Docker daemon`.

**Fix:**

- macOS/Windows: start Docker Desktop
- Linux: `sudo systemctl start docker`
- Verify: `docker info`

Tests spin up PostgreSQL (`postgres:18-alpine`) and Azurite containers via Testcontainers — Docker must be running.

---

### Tests fail with port conflict (Testcontainers)

**Symptom:** Testcontainers logs show port already bound, or a test hangs during container startup.

**Cause:** A previous test run left containers running (e.g., after a hard kill), or another local service occupies the same mapped port.

**Fix:**

```bash
# Stop all Testcontainers-spawned containers
docker ps -q --filter "label=org.testcontainers" | xargs -r docker stop
docker ps -aq --filter "label=org.testcontainers" | xargs -r docker rm
```

Testcontainers maps containers to random ports by default, so persistent port conflicts are rare. If the problem recurs, check whether another service is running on port 5432 or 10000.

---

### Azurite SSL / HTTPS errors in tests

**Symptom:** Test output includes `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or Azure Storage SDK throws a TLS error.

**Cause:** The test environment uses Azurite (Azure Blob Storage emulator) via Testcontainers. Azurite does not ship a trusted TLS certificate.

**Fix:** This is handled automatically by the test globalSetup. The `NODE_TLS_REJECT_UNAUTHORIZED` environment variable is set to `"0"` only inside the Testcontainers context — do not carry this setting into production. If tests are still failing, ensure the globalSetup file at `apps/api/vitest.globalSetup.ts` is configured in `vitest.config.ts`.

---

### Tests pass locally but fail in CI

**Symptom:** Test suite green locally, red on GitHub Actions.

**Common causes:**

| Cause                             | Fix                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Different Node.js version         | CI uses Node 24 exactly — match locally with `nvm use 24`                                            |
| Test depends on execution order   | Tests must be hermetic; each test should set up its own state                                        |
| Environment variable missing      | Check whether the test reads an env variable that is set in `.envrc` but not in the test globalSetup |
| Docker image pull throttled in CI | Rare; re-run the job — GitHub Actions runners share a Docker Hub pull limit                          |

---

### Stale Prisma client in tests

**Symptom:** Tests reference fields that don't exist on Prisma-generated types, or queries return unexpected shapes.

**Fix:** Same as the dev environment — regenerate the client:

```bash
cd packages/database && pnpm dev:generate
```

After regeneration, the test runner picks up the updated types on the next run.

---

## Authentication and Azure

### Key Vault reference not resolving in App Service

**Symptom:** App Service starts, but environment variables like `@Microsoft.KeyVault(...)` remain unresolved — the API receives the literal reference string rather than the secret value.

**Causes and checks:**

1. **Managed identity not enabled:** Go to App Service → Identity → System-assigned → confirm "Status: On".
2. **Key Vault access policy missing:** In Key Vault → Access policies, confirm the App Service's managed identity has **Get** on Secrets.
3. **Reference syntax error:** The reference format must be exactly:
   ```
   @Microsoft.KeyVault(VaultName=<vault>;SecretName=<secret>)
   ```
   No spaces; vault name and secret name must match exactly.
4. **Secret disabled in Key Vault:** Check the secret's enabled status in the portal.

After fixing, restart the App Service — environment variables are resolved at startup.

---

### JWKS validation errors (401 on all requests)

**Symptom:** After deploying, all API requests return 401. Logs show `JsonWebTokenError` or `JWKS endpoint error`.

**Checklist:**

1. Is `JWKS_URI` reachable **from where the API runs**? On host `pnpm dev` against local Keycloak it must be `http://localhost:8081/realms/huella/protocol/openid-connect/certs` — **not** the in-compose `http://keycloak:8080/...` host (the host process can't resolve the `keycloak` service name). See the [issuer-vs-JWKS host split](../infrastructure/KeycloakAuthenticationSetup.md#the-issuer-vs-jwks-host-split).
2. Is `JWKS_ISSUER` exactly the token's `iss`? Entra: `https://login.microsoftonline.com/<tenant-id>/v2.0` (or the CIAM host for External ID); Keycloak: `http://localhost:8081/realms/huella`.
3. Is `JWKS_AUDIENCE` the API's expected audience? Entra: the API app-registration client ID; Keycloak: `huella-api`.
4. Has the signing key rotated recently? The JWKS cache refreshes every ~10 minutes — wait and retry.

For local development without an IdP, use `AUTH_PROVIDER=forced-user` to bypass JWT validation entirely.

---

### `CredentialUnavailableError` with Azure Blob Storage

When `STORAGE_PROVIDER=azure_blob_storage`, authentication uses `DefaultAzureCredential`. Azure-hosted compute (App Service / Container Apps) resolves its **Managed Identity**; locally, `DefaultAzureCredential` **falls back to your `az login` session** — so `az login` is the simplest local path (the signed-in principal needs the **Storage Blob Data Contributor** role on the account). A `CredentialUnavailableError` locally usually means you're not logged in: run `az login`, or switch to `STORAGE_PROVIDER=minio`. To use an explicit Service Principal instead, set **all three** of `AZURE_STORAGE_TENANT_ID` / `AZURE_STORAGE_CLIENT_ID` / `AZURE_STORAGE_CLIENT_SECRET` (used only when all three are present → `ClientSecretCredential`). See [File Storage](../infrastructure/FileStorage.md) and the [docker-compose reference](../operations/docker-compose.md).

---

## Infrastructure and Deployment

### Azure Bicep deployment fails with quota error

**Symptom:** `az deployment group create` fails with "The subscription does not have enough resources" or a quota-related message.

**Fix:** Request a quota increase in the Azure Portal: Subscriptions → Usage + quotas. This is an administrative action, not a code change.

---

### Prisma migrations fail in production

**Symptom:** `prisma migrate deploy` exits with a non-zero code.

**Common causes:**

| Cause                                             | Fix                                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Migration already applied                         | Prisma skips already-applied migrations safely — check the error output; this is usually not the root cause |
| Database connection string wrong                  | Verify `DATABASE_URL` points to the correct server and uses SSL (`?sslmode=require`)                        |
| IP not whitelisted in PostgreSQL firewall         | Add your IP in Azure Portal → PostgreSQL Flexible Server → Networking                                       |
| Migration contains invalid SQL for the DB version | Verify the PostgreSQL version is ≥ 15                                                                       |

See [Database Migrations](../infrastructure/Migrations.md) for the full procedure.

---

### Static Web App shows old version after deployment

**Symptom:** Frontend deploy script completes, but users still see the previous version.

**Cause:** Browser cache or Azure CDN edge cache.

**Fix:**

- Hard refresh in the browser (Ctrl+Shift+R / Cmd+Shift+R).
- Azure Static Web Apps uses CDN caching; changes typically propagate within 5–10 minutes globally.
- If still stale after 30 minutes, check the deployment status in the Azure Portal → Static Web Apps → Environments.

---

## Application Behaviour

### Emission calculation returns unexpected result

**Symptom:** The displayed tCO₂e value does not match expectations.

**Checklist:**

1. The formula is `quantity × appliedFactorValue = kg CO₂e`, then divided by 1,000 for display.
2. For `DIRECT` input, the user-entered value (in tCO₂e) is stored as-is after converting to kg — no factor is applied.
3. The `appliedFactorValue` is stored at the time of input creation. Changing the emission factor library does not retroactively change existing results.
4. Display precision is 2 decimal places — there is no rounding error; the full value is stored in the database.

See [Emission Calculation Logic](../architecture/emission-calculation.md) for the complete data model.

---

### Submission does not appear in admin queue

**Symptom:** An organization submitted a request, but it does not appear under `/admin/requests`.

**Checklist:**

1. Is the submission's status `PENDING`? Only `PENDING` submissions appear in the active queue — `REVIEWED`, `APPROVED`, and `REJECTED` submissions are filtered or shown in history.
2. Is the `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` system parameter set to `HIDDEN`? If so, measurement (calculation) submissions are not shown. See [System Parameters Reference](./system-parameters.md).
3. Does the admin user have the `ADMIN` or `SUPERADMIN` system role? `USER`-level accounts cannot access admin routes.

---

### Badge not issued after admin approval

**Symptom:** Submission is approved, but the organization's transparency record does not show the badge.

**Checklist:**

1. For an organization to appear in the transparency portal, it must also have `isAccredited = true` (an approved `ORGANIZATION_ACCREDITATION` submission). A single approved inventory submission is not sufficient.
2. Check the `SubmissionSummaryView` in the database — confirm the submission status is `APPROVED` or `APPROVED_AUTOMATICALLY`.
3. The transparency endpoint is a live query — no cache to invalidate. If the status is correct, the badge should appear immediately.

See [Transparency Portal](../overview/transparency.md) and [Submission Workflow](../overview/submission-workflow.md).

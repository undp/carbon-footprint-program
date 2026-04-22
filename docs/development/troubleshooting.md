# Troubleshooting and FAQ

Central reference for common problems encountered during local development, testing, and deployment. Covers the issues most frequently reported or scattered across other guides.

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

**Cause:** `AZURE_STORAGE_ACCOUNT_NAME` is not set, or the local Azure CLI session has expired.

**Fix:**

```bash
az login
export AZURE_STORAGE_ACCOUNT_NAME="your-storage-account-name"
export AZURE_STORAGE_CONTAINER_NAME="files"
```

File upload requires a real Azure Storage account — there is no local Azurite emulator for the API's storage path. See [Local Setup](./local-setup.md) and [File Storage](../infrastructure/FileStorage.md).

---

### MSAL redirect URI mismatch

**Symptom:** After login redirect, browser shows "Reply URL specified in the request does not match the reply URLs configured for the application."

**Cause:** The redirect URI configured in the Azure Entra ID app registration does not match the URL the frontend is running on.

**Fix:**

1. In the Azure Portal, navigate to the Entra ID app registration → "Authentication".
2. Add the exact redirect URI the app is running at (e.g., `http://localhost:5173`).
3. Ensure `VITE_REDIRECT_URI` in `.envrc` matches the registered URI exactly (including trailing slash or lack thereof).

See [MSAL / Easy Auth Setup](../MSAL-EasyAuth-Setup.md) for the full configuration.

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

1. Is `JWKS_URI` set correctly? It should point to the Entra ID tenant's JWKS endpoint.
2. Is `JWT_AUDIENCE` set to the app registration's client ID?
3. Is `JWT_ISSUER` set to `https://login.microsoftonline.com/<tenant-id>/v2.0`?
4. Has the Entra ID key been rotated recently? The JWKS cache refreshes every 10 minutes — wait and retry.

For local development, use `AUTH_PROVIDER=forced-user` to bypass JWT validation entirely.

---

### `az login` required but CI does not use it

The API uses `DefaultAzureCredential` for Azure Blob Storage access. In CI and production, this resolves via the App Service's managed identity. Locally, it resolves via `az login`. If you see `CredentialUnavailableError`, run `az login` in your terminal.

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

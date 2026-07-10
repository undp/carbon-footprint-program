# Environment Variables Reference

This document lists all environment variables used by the application, their purpose, default values, and whether they are required.

Variables are loaded from `.envrc` (root) using `direnv`. App-specific `.envrc` files call `source_up` to inherit from the root.

> **Never commit `.envrc` or `.env` files.** They are in `.gitignore`.

---

## Root `.envrc` (shared by all apps)

### Azure Entra inputs (for `.envrc.azure.example`)

These are **not** read by the API or web — they are raw inputs that the Azure helper
(`.envrc.azure.example`, locally) and the deploy (`appService.bicep` + `deploy-web.sh`)
turn into the generic `JWKS_*` / `VITE_OIDC_*` values below. The base `.envrc.template`
has no `AZURE_*` auth vars; copy `.envrc.azure.example` for an Entra setup.

| Variable                 | Required | Default    | Description                                                                                               |
| ------------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `AZURE_TENANT_TYPE`      | No       | `external` | Tenant type: `external` (CIAM / ciamlogin.com) or `organizational` (Azure AD / login.microsoftonline.com) |
| `AZURE_TENANT_ID`        | Cond.    | —          | Azure Tenant ID (GUID). Used to derive the issuer and JWKS URL.                                           |
| `AZURE_TENANT_SUBDOMAIN` | Cond.    | —          | Tenant subdomain. Required only when `AZURE_TENANT_TYPE=external` (the JWKS host).                        |
| `AZURE_API_CLIENT_ID`    | Cond.    | —          | API App Registration ID. Becomes `JWKS_AUDIENCE` and the `api://…/access_as_user` scope.                  |
| `AZURE_FRONT_CLIENT_ID`  | Cond.    | —          | Frontend (public SPA) App Registration ID. Becomes `VITE_OIDC_CLIENT_ID`.                                 |

### Object Storage (`STORAGE_PROVIDER`)

The API selects an object-storage backend at boot via `STORAGE_PROVIDER`. It is
**required**: the API refuses to start when it is missing or set to an
unrecognized value (`storageConfigFromEnv` throws). The provider-specific
variables (`MINIO_*` / `AZURE_STORAGE_*`) are read and validated by the shared
`@repo/storage` parser — see [`../infrastructure/FileStorage.md`](../infrastructure/FileStorage.md)
for the full reference.

| Variable           | Required | Default | Description                                                                                                      |
| ------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `STORAGE_PROVIDER` | **Yes**  | —       | Object-storage backend. Allowed values: `azure_blob_storage` \| `minio`. API refuses to boot if missing/invalid. |

#### MinIO / S3-compatible (`STORAGE_PROVIDER=minio`)

| Variable                 | Required | Default     | Description                                                                                                                           |
| ------------------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `MINIO_ENDPOINT`         | **Yes**  | —           | S3 endpoint URL. On the host: `http://localhost:9000`. Inside docker-compose: `http://minio:9000`.                                    |
| `MINIO_ACCESS_KEY`       | **Yes**  | —           | Access key.                                                                                                                           |
| `MINIO_SECRET_KEY`       | **Yes**  | —           | Secret key.                                                                                                                           |
| `MINIO_BUCKET`           | No       | `files`     | Bucket name.                                                                                                                          |
| `MINIO_REGION`           | No       | `us-east-1` | S3 region.                                                                                                                            |
| `MINIO_FORCE_PATH_STYLE` | No       | `true`      | Use path-style addressing. Any value other than `false` (case-insensitive) resolves to `true`.                                        |
| `MINIO_RELAY_ENABLED`    | No       | `false`     | When `true`, presigned URLs are rewritten to the API relay so MinIO stays internal. Only valid with `minio`; boot fails otherwise.    |
| `API_ORIGIN`             | Cond.    | —           | Required when `MINIO_RELAY_ENABLED=true`: the API's public origin (e.g. `https://api.example.cl`). Must be a valid URL or boot fails. |

#### Azure Blob Storage (`STORAGE_PROVIDER=azure_blob_storage`)

| Variable                       | Required | Default | Description                                                                                       |
| ------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------- |
| `AZURE_STORAGE_ACCOUNT_NAME`   | **Yes**  | —       | Storage account name. Required when `STORAGE_PROVIDER=azure_blob_storage`; boot fails without it. |
| `AZURE_STORAGE_CONTAINER_NAME` | No       | `files` | Blob container name. Defaults to `files` (matches Bicep).                                         |
| `AZURE_STORAGE_TENANT_ID`      | No       | —       | Service Principal tenant ID. Part of the optional SP trio (see below).                            |
| `AZURE_STORAGE_CLIENT_ID`      | No       | —       | Service Principal client ID. Part of the optional SP trio (see below).                            |
| `AZURE_STORAGE_CLIENT_SECRET`  | No       | —       | Service Principal client secret. Part of the optional SP trio (see below).                        |

**Credential selection.** The simple local path is `az login` + the default
`DefaultAzureCredential` — no Service Principal variables needed. The
`AZURE_STORAGE_TENANT_ID` / `AZURE_STORAGE_CLIENT_ID` / `AZURE_STORAGE_CLIENT_SECRET`
trio is the **optional alternative** (all-three-or-nothing): only when **all
three** are set does the adapter use an explicit `ClientSecretCredential`;
otherwise it falls back to `DefaultAzureCredential` (which resolves a Managed
Identity when Azure-hosted, or the `az login` session locally). Whichever
principal is used — the signed-in `az login` user, the Managed Identity, or the
Service Principal — it needs the **Storage Blob Data Contributor** RBAC role on
the storage account.

### Database

| Variable       | Required | Default | Description                                                                         |
| -------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL` | **Yes**  | —       | PostgreSQL connection string. Format: `postgresql://user:password@host:port/dbname` |

### API

| Variable        | Required | Default                              | Description                                           |
| --------------- | -------- | ------------------------------------ | ----------------------------------------------------- |
| `NODE_ENV`      | No       | `development`                        | Environment mode: `development`, `production`, `test` |
| `LOG_LEVEL`     | No       | `debug` (dev) / `info` (prod)        | Pino log level: `debug`, `info`, `warn`, `error`      |
| `APP_VERSION`   | No       | `unknown`                            | Application version string (injected by CI/CD)        |
| `API_HOST`      | No       | `localhost` (dev) / `0.0.0.0` (prod) | Host to bind the API server                           |
| `API_PORT`      | No       | `8080`                               | Port to bind the API server                           |
| `AUTH_PROVIDER` | No       | `none`                               | Authentication provider. See below.                   |

### Auth Provider (`AUTH_PROVIDER`)

| Value         | Use case                                                                |
| ------------- | ----------------------------------------------------------------------- |
| `jwks`        | Production — validates OIDC access tokens (Entra, Keycloak, …) via JWKS |
| `forced-user` | Local development — authenticates all requests as a fixed user          |
| `none`        | No authentication (default, use only for initial setup/testing)         |

**Variables required for `forced-user`:**

| Variable             | Required | Description                             |
| -------------------- | -------- | --------------------------------------- |
| `FORCED_USER_EMAIL`  | Yes      | Email of the forced user                |
| `FORCED_USER_IDP_ID` | Yes      | Identity provider ID of the forced user |

### JWKS (API token validation, `AUTH_PROVIDER=jwks`)

The API reads these **directly** to validate access tokens — it derives nothing from
`AZURE_*`. Set them for any OIDC issuer (Keycloak, …); for Azure Entra they're produced
from the tenant inputs above by `.envrc.azure.example` (local) and `appService.bicep` (deploy).

| Variable                | Required         | Description                                                               |
| ----------------------- | ---------------- | ------------------------------------------------------------------------- |
| `JWKS_URI`              | Yes (for `jwks`) | JWKS endpoint URL, reachable from the API process                         |
| `JWKS_ISSUER`           | Recommended      | Expected token issuer (`iss`); empty disables issuer validation           |
| `JWKS_AUDIENCE`         | Recommended      | Expected token audience (`aud` claim); empty disables audience validation |
| `JWKS_REQUIRED_SCOPE`   | No               | Required scope claim (default: `access_as_user`)                          |
| `JWKS_SKIP_SCOPE_CHECK` | No               | Set `true` to disable scope enforcement entirely                          |

### Frontend (Vite)

Variables prefixed with `VITE_` are exposed to the browser bundle at build time.

| Variable                             | Required | Default                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`                  | **Yes**  | —                                               | Base URL of the API (e.g., `https://api.example.com`). Injected at build time.                                                                                                                                                                                                                                                                                                                                  |
| `VITE_APP_VERSION`                   | No       | —                                               | Application version for display in UI                                                                                                                                                                                                                                                                                                                                                                           |
| `VITE_OIDC_ISSUER`                   | **Yes**  | —                                               | OIDC issuer / authority URL. Entra: the authority (`https://<sub>.ciamlogin.com/<tenant-id>/v2.0` or `https://login.microsoftonline.com/<tenant-id>/v2.0`); Keycloak: `https://<host>/realms/huella`. On Azure, `deploy-web.sh` derives it from `AZURE_AUTH_AUTHORITY`.                                                                                                                                         |
| `VITE_OIDC_CLIENT_ID`                | **Yes**  | —                                               | Public SPA client ID. On Azure, derived from `AZURE_FRONT_CLIENT_ID`.                                                                                                                                                                                                                                                                                                                                           |
| `VITE_OIDC_SCOPES`                   | **Yes**  | _(none — templates use `openid profile email`)_ | Space-separated scopes. No built-in code default (the bundle reads `?? ""`); the template baseline is `openid profile email`. Keycloak omits `offline_access` (silent renew uses the SSO-session-bound refresh token); for Entra append ` offline_access api://<API_CLIENT_ID>/access_as_user` (Entra needs `offline_access` to issue a refresh token, and the API scope so the access token `aud` is the API). |
| `VITE_OIDC_REDIRECT_URI`             | No       | `<origin>/auth/callback`                        | Login redirect URI. Defaults to the serving origin + `/auth/callback`.                                                                                                                                                                                                                                                                                                                                          |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | No       | serving origin                                  | Post-logout redirect URI. Defaults to the serving origin.                                                                                                                                                                                                                                                                                                                                                       |
| `VITE_FRONT_BASE_URL`                | No       | Derived                                         | Deploy-script-internal — **not** read by the bundle. `deploy-web.sh` derives it from `FRONTEND_CUSTOM_DOMAIN` to build the OIDC redirect URI and the CORS origin. Do not set manually — overrides are ignored to keep it aligned with bicep's CORS config.                                                                                                                                                      |

---

## Infrastructure `.envrc` (`infra/.envrc`)

Used by the deployment scripts in `infra/`.

| Variable                   | Required | Description                                                                                                                                                    |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AZURE_SUBSCRIPTION_ID`    | **Yes**  | Azure subscription ID (GUID)                                                                                                                                   |
| `AZURE_RESOURCE_GROUP`     | No       | Target Resource Group name (e.g., `undp-huella-latam-production-rg`). Has a derived default of `undp-huella-latam-$ENVIRONMENT-rg` in `infra/.envrc.template`. |
| `AZURE_SUBSCRIPTION_GROUP` | No       | Azure AD group name whose members get Key Vault and Storage access. Optional — `deploy.sh` skips dev-group access configuration when unset.                    |
| `ENVIRONMENT`              | **Yes**  | Environment name in **lowercase** (e.g., `development`, `staging`, `production`). Used for resource naming and tagging.                                        |
| `LOCATION`                 | **Yes**  | Azure region (e.g., `eastus2`). Note: `eastus` is unavailable on free-tier subscriptions.                                                                      |
| `FRONTEND_CUSTOM_DOMAIN`   | No       | Public custom domain for the frontend (e.g., `app.huellalatam.org`). Bicep binds it to Front Door or the SWA depending on `enableFrontDoor`.                   |

**Optional deployment overrides:**

| Variable     | Default                  | Description                                  |
| ------------ | ------------------------ | -------------------------------------------- |
| `IMAGE_NAME` | `api`                    | Docker image name for API deployment         |
| `IMAGE_TAG`  | Git short SHA / `latest` | Docker image tag for API deployment          |
| `API_PORT`   | `8080`                   | Port the API listens on inside the container |

**Azure Entra auth + deploy inputs (in `infra/.envrc.template`):**

The Azure Entra auth inputs documented above under "Root `.envrc`" actually live in `infra/.envrc` for a deploy — the deploy (`appService.bicep` + `deploy-web.sh`) derives the `JWKS_*` / `VITE_OIDC_*` values from them. They live alongside these deploy-only vars:

| Variable                 | Default    | Description                                                                                               |
| ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------- |
| `AZURE_TENANT_TYPE`      | `external` | Tenant type: `external` (CIAM / ciamlogin.com) or `organizational` (Azure AD / login.microsoftonline.com) |
| `AZURE_TENANT_ID`        | —          | Azure Tenant ID (GUID). Used to derive the issuer and JWKS URL.                                           |
| `AZURE_TENANT_SUBDOMAIN` | —          | Tenant subdomain. Required only when `AZURE_TENANT_TYPE=external`.                                        |
| `AZURE_API_CLIENT_ID`    | —          | API App Registration ID. Becomes `JWKS_AUDIENCE`.                                                         |
| `AZURE_FRONT_CLIENT_ID`  | —          | Frontend (public SPA) App Registration ID. Becomes `VITE_OIDC_CLIENT_ID`.                                 |
| `AUTH_PROVIDER`          | `jwks`     | Auth provider for the deployed API.                                                                       |
| `APP_VERSION`            | —          | Deployed version identifier (e.g., the git tag).                                                          |
| `DRY_RUN`                | `false`    | When `true`, the deploy script plans without applying.                                                    |

---

## Production (App Service — auto-injected by Bicep)

The following variables are automatically set by `infra/modules/appService.bicep` during infrastructure deployment. They do not need to be set manually.

| Variable                                     | Source                                         | Description                                                                                                             |
| -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                               | Key Vault + Bicep                              | PostgreSQL connection string with SSL                                                                                   |
| `STORAGE_PROVIDER`                           | `azure_blob_storage` (when storage configured) | Object-storage backend. Set by `appService.bicep` when a storage account is configured (`storageAccountName` non-empty) |
| `AZURE_STORAGE_ACCOUNT_NAME`                 | Bicep output                                   | Storage account name                                                                                                    |
| `AZURE_STORAGE_CONTAINER_NAME`               | `files` (hardcoded)                            | Blob container name                                                                                                     |
| `AUTH_PROVIDER`                              | `jwks` (when auth enabled)                     | Auth provider                                                                                                           |
| `JWKS_ISSUER` / `JWKS_URI` / `JWKS_AUDIENCE` | Bicep (derived from tenant params)             | Token validation config (see `appService.bicep`)                                                                        |
| `NODE_ENV`                                   | `production`                                   | Production mode                                                                                                         |
| `WEBSITES_PORT`                              | `8080`                                         | Port exposed by the container                                                                                           |

When auth is enabled, `appService.bicep` derives the `JWKS_*` values from the tenant inputs and sets them on the App Service automatically — no manual auth config is needed.

---

## Variable Priority Summary

For local development, the resolution order is:

```
infra/.envrc   →  loaded only when running infra scripts
apps/api/.envrc   →  calls source_up
apps/web/.envrc   →  calls source_up
.envrc (root)     →  loaded by all apps via source_up
```

For production (App Service), all variables come from:

1. Bicep template (auto-injected into App Service environment)
2. Azure Key Vault references (sensitive values)
3. Manual App Service configuration (authentication variables)

---

## Chatbot Variables

| Variable                       | Required                      | Default        | Description                                                                                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHATBOT_ENABLED`              | No                            | `false`        | Master switch for the optional AI chatbot (DPG optionality). When `false`: the chatbot routes 404, the widget is hidden, and the `LLM_PROVIDER` / `COOKIE_SECRET` / Azure boot guards below are skipped — the platform runs with no AI and no cloud dependency. Set `true` to enable. |
| `LLM_PROVIDER`                 | No                            | `mock`         | Selects the LLM backend. Allowed values: `mock`, `azure-openai`. When the chatbot is enabled (`CHATBOT_ENABLED=true`), the API refuses to boot with `mock` in production.                                                                                                             |
| `COOKIE_SECRET`                | When enabled, in prod         | Local fallback | Secret used by `@fastify/cookie` to sign the `chatbot_session_id` cookie. Required when `NODE_ENV=production` **and** `CHATBOT_ENABLED=true`.                                                                                                                                         |
| `AZURE_OPENAI_ENDPOINT`        | When enabled + `azure-openai` | —              | Azure OpenAI endpoint URL.                                                                                                                                                                                                                                                            |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | When enabled + `azure-openai` | —              | Azure OpenAI deployment name. The chat client authenticates with `DefaultAzureCredential` (managed identity, no keys).                                                                                                                                                                |
| `VITE_CHATBOT_ENABLED`         | No (web build-time)           | `false`        | Frontend mirror of `CHATBOT_ENABLED` — the widget mounts only when this is `true`. Baked into the web bundle at build time (Vite); keep it in sync with `CHATBOT_ENABLED`.                                                                                                            |

> **Keep `CHATBOT_ENABLED` (API) and `VITE_CHATBOT_ENABLED` (web) consistent — nothing validates them for you.** They are two independent flags read at different times: the API reads `CHATBOT_ENABLED` at boot, while `VITE_CHATBOT_ENABLED` is baked into the web bundle at build time. Because the web and API are separate processes, there is no cross-app check — a mismatch stays silent until a message is sent. The one combination that breaks the UI is **widget on, API off** (`VITE_CHATBOT_ENABLED=true` while `CHATBOT_ENABLED=false`): the widget mounts but every request hits an unregistered route and 404s. The reverse — **API on, widget off** (`CHATBOT_ENABLED=true`, `VITE_CHATBOT_ENABLED=false`) — is intentionally fine, so the endpoints stay live for direct API testing while the widget stays hidden. Rule of thumb: `VITE_CHATBOT_ENABLED=true` **requires** `CHATBOT_ENABLED=true`. In Docker Compose both are set from the same `.env`, so set them together. See [Troubleshooting → Chatbot widget shows but every message fails](./troubleshooting.md#chatbot-widget-shows-but-every-message-fails-404).

The chatbot widget makes its requests to the relative URL `/api/chatbot/...` so the `chatbot_session_id` cookie is sent. In production the cookie is `SameSite=None; Secure` (web and API are served from different registrable domains — cross-site); in local dev it is `SameSite=Lax`, and the Vite proxy added in `apps/web/vite.config.ts` forwards `/api/*` to `VITE_API_BASE_URL`, keeping the widget same-origin with the API.

> **`VITE_API_BASE_URL` convention.** The repo expects `VITE_API_BASE_URL` to end in `/api` (the shared `apiClient` / `ky` instance uses it as `prefixUrl` and call sites use bare paths like `apiClient.get("badges")`). The chatbot's Vite dev proxy therefore strips the leading `/api` from the incoming browser path before forwarding (`rewrite: (path) => path.replace(/^\/api/, "")`), so `/api/chatbot/message` → `${VITE_API_BASE_URL}/chatbot/message` and not the duplicated `${VITE_API_BASE_URL}/api/chatbot/message`.

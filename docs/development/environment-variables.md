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

### Azure Blob Storage

| Variable                       | Required | Default | Description                                                                                            |
| ------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `AZURE_STORAGE_ACCOUNT_NAME`   | No       | —       | Storage account name. Required to enable file upload/download. Leave empty to disable storage locally. |
| `AZURE_STORAGE_CONTAINER_NAME` | No       | `files` | Blob container name. Defaults to `files` (matches Bicep).                                              |

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

| Variable                             | Required | Default                                                        | Description                                                                                                                                                                                                                                                             |
| ------------------------------------ | -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`                  | **Yes**  | —                                                              | Base URL of the API (e.g., `https://api.example.com`). Injected at build time.                                                                                                                                                                                          |
| `VITE_APP_VERSION`                   | No       | —                                                              | Application version for display in UI                                                                                                                                                                                                                                   |
| `VITE_OIDC_ISSUER`                   | **Yes**  | —                                                              | OIDC issuer / authority URL. Entra: the authority (`https://<sub>.ciamlogin.com/<tenant-id>/v2.0` or `https://login.microsoftonline.com/<tenant-id>/v2.0`); Keycloak: `https://<host>/realms/huella`. On Azure, `deploy-web.sh` derives it from `AZURE_AUTH_AUTHORITY`. |
| `VITE_OIDC_CLIENT_ID`                | **Yes**  | —                                                              | Public SPA client ID. On Azure, derived from `AZURE_FRONT_CLIENT_ID`.                                                                                                                                                                                                   |
| `VITE_OIDC_SCOPES`                   | **Yes**  | _(none — template uses `openid profile email offline_access`)_ | Space-separated scopes. No built-in code default (the bundle reads `?? ""`); `openid profile email offline_access` is the recommended/template value. For Entra, append ` api://<API_CLIENT_ID>/access_as_user` so the access token `aud` is the API.                   |
| `VITE_OIDC_REDIRECT_URI`             | No       | `<origin>/auth/callback`                                       | Login redirect URI. Defaults to the serving origin + `/auth/callback`.                                                                                                                                                                                                  |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | No       | serving origin                                                 | Post-logout redirect URI. Defaults to the serving origin.                                                                                                                                                                                                               |
| `VITE_FRONT_BASE_URL`                | No       | Derived                                                        | Deploy-script-internal — **not** read by the bundle. `deploy-web.sh` derives it from `FRONTEND_CUSTOM_DOMAIN` to build the OIDC redirect URI and the CORS origin. Do not set manually — overrides are ignored to keep it aligned with bicep's CORS config.              |

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

| Variable                                     | Source                             | Description                                      |
| -------------------------------------------- | ---------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                               | Key Vault + Bicep                  | PostgreSQL connection string with SSL            |
| `AZURE_STORAGE_ACCOUNT_NAME`                 | Bicep output                       | Storage account name                             |
| `AZURE_STORAGE_CONTAINER_NAME`               | `files` (hardcoded)                | Blob container name                              |
| `AUTH_PROVIDER`                              | `jwks` (when auth enabled)         | Auth provider                                    |
| `JWKS_ISSUER` / `JWKS_URI` / `JWKS_AUDIENCE` | Bicep (derived from tenant params) | Token validation config (see `appService.bicep`) |
| `NODE_ENV`                                   | `production`                       | Production mode                                  |
| `WEBSITES_PORT`                              | `8080`                             | Port exposed by the container                    |

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

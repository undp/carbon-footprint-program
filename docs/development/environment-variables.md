# Environment Variables Reference

This document lists all environment variables used by the application, their purpose, default values, and whether they are required.

Variables are loaded from `.envrc` (root) using `direnv`. App-specific `.envrc` files call `source_up` to inherit from the root.

> **Never commit `.envrc` or `.env` files.** They are in `.gitignore`.

---

## Root `.envrc` (shared by all apps)

### Azure Authentication

| Variable                 | Required | Default    | Description                                                                                               |
| ------------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `AZURE_TENANT_TYPE`      | No       | `external` | Tenant type: `external` (CIAM / ciamlogin.com) or `organizational` (Azure AD / login.microsoftonline.com) |
| `AZURE_TENANT_ID`        | Cond.    | —          | Azure Tenant ID (GUID). Required when using Azure auth.                                                   |
| `AZURE_TENANT_SUBDOMAIN` | Cond.    | —          | Tenant subdomain. Required only when `AZURE_TENANT_TYPE=external`.                                        |
| `AZURE_API_CLIENT_ID`    | Cond.    | —          | App Registration ID for the API. Required for JWT validation.                                             |
| `AZURE_FRONT_CLIENT_ID`  | Cond.    | —          | App Registration ID for the frontend. Required for MSAL login.                                            |

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

| Value         | Use case                                                           |
| ------------- | ------------------------------------------------------------------ |
| `jwks`        | Production — validates Azure Entra ID JWT tokens via JWKS endpoint |
| `easy-auth`   | Production on App Service — trusts Azure Easy Auth headers         |
| `forced-user` | Local development — authenticates all requests as a fixed user     |
| `none`        | No authentication (default, use only for initial setup/testing)    |

**Variables required for `forced-user`:**

| Variable                              | Required | Description                             |
| ------------------------------------- | -------- | --------------------------------------- |
| `FORCED_USER_EMAIL_WHEN_NO_PROVIDER`  | Yes      | Email of the forced user                |
| `FORCED_USER_IDP_ID_WHEN_NO_PROVIDER` | Yes      | Identity provider ID of the forced user |

### Generic JWKS Overrides (for non-Azure IdPs)

These override the Azure-derived JWKS values. Use when integrating a non-Azure OIDC provider.

| Variable                | Required | Description                                       |
| ----------------------- | -------- | ------------------------------------------------- |
| `JWKS_URI`              | No       | JWKS endpoint URL (overrides Azure-derived value) |
| `JWKS_ISSUER`           | No       | Expected token issuer (`iss` claim)               |
| `JWKS_AUDIENCE`         | No       | Expected token audience (`aud` claim)             |
| `JWKS_REQUIRED_SCOPE`   | No       | Required scope claim (default: `access_as_user`)  |
| `JWKS_SKIP_SCOPE_CHECK` | No       | Set `true` to disable scope enforcement entirely  |

### Frontend (Vite)

Variables prefixed with `VITE_` are exposed to the browser bundle at build time.

| Variable                     | Required | Default                    | Description                                                                               |
| ---------------------------- | -------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`          | **Yes**  | —                          | Base URL of the API (e.g., `https://api.example.com`). Injected at build time.            |
| `VITE_APP_VERSION`           | No       | —                          | Application version for display in UI                                                     |
| `VITE_AZURE_FRONT_CLIENT_ID` | Cond.    | `$AZURE_FRONT_CLIENT_ID`   | Frontend App Registration ID (inherited from `AZURE_FRONT_CLIENT_ID`)                     |
| `VITE_AZURE_API_CLIENT_ID`   | Cond.    | `$AZURE_API_CLIENT_ID`     | API App Registration ID (inherited from `AZURE_API_CLIENT_ID`)                            |
| `VITE_AZURE_AUTH_AUTHORITY`  | Cond.    | Derived from tenant config | MSAL authority URL. Derived automatically from `AZURE_TENANT_TYPE` and `AZURE_TENANT_ID`. |
| `VITE_FRONT_BASE_URL`        | No       | —                          | Base URL of the frontend (used for redirects)                                             |

---

## Infrastructure `.envrc` (`infra/.envrc`)

Used by the deployment scripts in `infra/`.

| Variable                   | Required | Description                                                                                                             |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AZURE_SUBSCRIPTION_ID`    | **Yes**  | Azure subscription ID (GUID)                                                                                            |
| `AZURE_RESOURCE_GROUP`     | **Yes**  | Target Resource Group name (e.g., `undp-huella-latam-production-rg`)                                                    |
| `AZURE_SUBSCRIPTION_GROUP` | **Yes**  | Azure AD group name whose members get Key Vault and Storage access                                                      |
| `ENVIRONMENT`              | **Yes**  | Environment name in **lowercase** (e.g., `development`, `staging`, `production`). Used for resource naming and tagging. |
| `LOCATION`                 | **Yes**  | Azure region (e.g., `eastus2`). Note: `eastus` is unavailable on free-tier subscriptions.                               |
| `FRONT_DOOR_CUSTOM_DOMAIN` | No       | Custom domain for Azure Front Door (e.g., `app.huellalatam.org`). Only needed when Front Door is enabled.               |

**Optional deployment overrides:**

| Variable     | Default                  | Description                                  |
| ------------ | ------------------------ | -------------------------------------------- |
| `IMAGE_NAME` | `api`                    | Docker image name for API deployment         |
| `IMAGE_TAG`  | Git short SHA / `latest` | Docker image tag for API deployment          |
| `API_PORT`   | `8080`                   | Port the API listens on inside the container |

---

## Production (App Service — auto-injected by Bicep)

The following variables are automatically set by `infra/modules/appService.bicep` during infrastructure deployment. They do not need to be set manually.

| Variable                       | Source              | Description                           |
| ------------------------------ | ------------------- | ------------------------------------- |
| `DATABASE_URL`                 | Key Vault + Bicep   | PostgreSQL connection string with SSL |
| `AZURE_STORAGE_ACCOUNT_NAME`   | Bicep output        | Storage account name                  |
| `AZURE_STORAGE_CONTAINER_NAME` | `files` (hardcoded) | Blob container name                   |
| `NODE_ENV`                     | `production`        | Production mode                       |
| `WEBSITES_PORT`                | `8080`              | Port exposed by the container         |

Authentication variables (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`, etc.) must be set manually in the App Service configuration after provisioning, or added to `appService.bicep`.

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

| Variable                                 | Required                               | Default                    | Description                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLM_PROVIDER`                           | No                                     | `mock`                     | Selects the LLM backend. Allowed values: `mock`, `azure-openai`. The API refuses to boot with `mock` in production.                                                             |
| `EMBEDDING_PROVIDER`                     | No                                     | `mock`                     | Selects the embeddings backend. Allowed values: `mock`, `azure-openai`. The API refuses to boot with `mock` in production (silent corpus corruption is the failure mode).       |
| `COOKIE_SECRET`                          | Yes (in prod)                          | Local fallback             | Secret used by `@fastify/cookie` to sign the `chatbot_session_id` cookie. Required when `NODE_ENV=production`.                                                                  |
| `AZURE_OPENAI_ENDPOINT`                  | When `azure-openai`                    | —                          | Azure OpenAI endpoint URL.                                                                                                                                                      |
| `AZURE_OPENAI_DEPLOYMENT_NAME`           | When `LLM_PROVIDER=azure-openai`       | —                          | Azure OpenAI chat deployment name. Authenticates via `DefaultAzureCredential` (managed identity) by default, or via `AZURE_OPENAI_API_KEY` when the key is set.                 |
| `AZURE_OPENAI_API_VERSION`               | No                                     | `2024-10-21`               | Azure OpenAI API version used by the chat client. Promoted to env var so operators can bump per-deployment without code changes.                                                |
| `AZURE_OPENAI_API_KEY`                   | No (dev only)                          | unset                      | Optional API key fallback for local development. Production SHALL leave this unset and rely on managed identity. When set, both chat and embeddings providers use API key auth. |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` | When `EMBEDDING_PROVIDER=azure-openai` | —                          | Azure OpenAI embeddings deployment name (separate from the chat deployment because embeddings use `text-embedding-3-large`).                                                    |
| `AZURE_OPENAI_EMBEDDING_API_VERSION`     | No                                     | `AZURE_OPENAI_API_VERSION` | Optional override for the embeddings API version. Defaults to the chat-client version when unset.                                                                               |

The chatbot widget makes its requests to the relative URL `/api/chatbot/...` so the `chatbot_session_id` cookie (`SameSite=Lax`) is sent. The Vite proxy added in `apps/web/vite.config.ts` forwards `/api/*` to `VITE_API_BASE_URL` in dev, keeping the widget same-origin with the API.

> **`VITE_API_BASE_URL` convention.** The repo expects `VITE_API_BASE_URL` to end in `/api` (the shared `apiClient` / `ky` instance uses it as `prefixUrl` and call sites use bare paths like `apiClient.get("badges")`). The chatbot's Vite dev proxy therefore strips the leading `/api` from the incoming browser path before forwarding (`rewrite: (path) => path.replace(/^\/api/, "")`), so `/api/chatbot/message` → `${VITE_API_BASE_URL}/chatbot/message` and not the duplicated `${VITE_API_BASE_URL}/api/chatbot/message`.

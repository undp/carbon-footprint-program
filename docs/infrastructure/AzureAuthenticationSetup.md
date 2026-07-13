# Azure Entra Authentication Setup

How to configure **Azure Entra** as the OIDC Identity Provider for Huella Latam. The platform supports two Azure Entra tenant types, each suited to different deployment scenarios.

Azure Entra is a concrete instance of the [Generic OIDC contract](./GenericOidcAuthenticationSetup.md) — read that first for the provider-agnostic picture. For a Keycloak IdP (local dev or production), see [Keycloak Setup](./KeycloakSetup.md).

> **How auth works here:** the frontend is a generic OIDC client (`oidc-client-ts`) and the API validates access tokens directly via **JWKS** (`AUTH_PROVIDER=jwks`). There is no MSAL and no Azure App Service Easy Auth gateway — on Azure App Service, keep platform Authentication **disabled** so the `Authorization: Bearer` token reaches the app.

## Table of Contents

1. [Choosing a Tenant Type](#choosing-a-tenant-type)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Azure Portal Configuration — External Tenant (CIAM)](#azure-portal-configuration--external-tenant-ciam)
5. [Azure Portal Configuration — Organizational Tenant (Azure AD)](#azure-portal-configuration--organizational-tenant-azure-ad)
6. [Infrastructure (Bicep) Configuration](#infrastructure-bicep-configuration)
7. [Environment Variables](#environment-variables)
8. [Backend Authentication](#backend-authentication)
9. [Frontend OIDC Configuration](#frontend-oidc-configuration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Additional Resources](#additional-resources)

---

## Choosing a Tenant Type

|                         | External (CIAM)                                      | Organizational (Azure AD)                            |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| **Use case**            | Public-facing, self-service sign-up                  | Enterprise, managed user directory                   |
| **User management**     | Users self-register via Email OTP                    | Admin assigns users or invites guests (B2B)          |
| **Authority URL**       | `https://{subdomain}.ciamlogin.com/{tenant-id}/v2.0` | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| **Token version**       | v2.0                                                 | v2.0 (required)                                      |
| **Email claim**         | `email` or `preferred_username`                      | `email` or `preferred_username`                      |
| **Requires subdomain**  | Yes (`AZURE_TENANT_SUBDOMAIN`)                       | No                                                   |
| **User flows**          | Required (Email OTP sign-up/sign-in)                 | Not needed                                           |
| **`AZURE_TENANT_TYPE`** | `"external"`                                         | `"organizational"`                                   |

> The deploy tooling (`.envrc.azure.example` locally, `appService.bicep` on deploy) handles both tenant types automatically — the difference is only the Azure Portal setup and the derived issuer/JWKS URLs. The API itself is tenant-type-agnostic (it consumes the resulting `JWKS_*`).

---

## Architecture

```
┌─────────────┐                    ┌──────────────────┐
│   Browser   │                    │  Azure Entra ID  │
│ OIDC client │◄──────(1)─────────►│  (External or    │
│ (oidc-      │  Auth Code + PKCE  │   Organizational)│
│  client-ts) │                    └──────────────────┘
└──────┬──────┘
       │
       │ (2) Access Token (Bearer)
       │
       ▼
┌─────────────┐     (3)            ┌──────────────────┐
│   Frontend  │───────────────────►│   API Backend    │
│   (React)   │   API Request       │   (Fastify)      │
│             │   + Bearer Token    │  AUTH_PROVIDER   │
└─────────────┘                    │     = jwks       │
                                   └────────┬─────────┘
                                            │
                                            │ (4) Validate via JWKS
                                            ▼
                                   ┌──────────────────┐
                                   │  Entra JWKS keys │
                                   └──────────────────┘
```

**Flow:**

1. User authenticates via `oidc-client-ts` (Authorization Code + PKCE) against Azure Entra ID
2. The SPA receives an Access Token and ID Token
3. Frontend sends API requests with `Authorization: Bearer <token>`
4. The API validates the token itself against Entra's JWKS keys (signature, issuer, audience, expiry) — **no** App Service Easy Auth gateway

---

## Prerequisites

> Before following this setup, ensure you have completed the initial infrastructure deployment.
> See `docs/infrastructure/Deployment.md` for the full first-run deployment steps.

- Azure subscription with access to create resources
- Permission to create or manage an Azure Entra tenant
- Node.js 24+ and pnpm installed
- Azure CLI installed and logged in
- Access to the `undp-huella-latam` repository

---

## Azure Portal Configuration — External Tenant (CIAM)

> Follow this section if you are using `AZURE_TENANT_TYPE="external"`.
> If you are using an organizational tenant, skip to the [next section](#azure-portal-configuration--organizational-tenant-azure-ad).

### Step 1: Create Azure Entra External ID Tenant

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Search for **"Microsoft Entra ID"**
3. Click **"Manage tenants"** → **"Create a tenant"**
4. Select **"Microsoft Entra External ID"** as the tenant type
5. Configure:
   - **Organization name**: e.g. `UNDP-HUELLA-LATAM` (visible to users during sign-up/login)
   - **Initial domain name**: e.g. `undphuella` (becomes `undphuella.ciamlogin.com`)
   - **Country/Region**: Choose closest to your users
6. Select your **Azure Subscription** and **Resource Group**
7. Review and create (may take a few minutes)

> Save the **Tenant ID** (visible in Overview or "Manage tenants" as "Organization ID") and the **subdomain** you chose.

### Step 2: Register Frontend Application

1. Switch to your External Tenant directory
2. Navigate to **App registrations** → **"New registration"**
3. Configure:
   - **Name**: e.g. `Huella Latam Web App - Frontend (SPA)`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URIs** (Platform: Single-page application / SPA):
     - `http://localhost:5173/auth/callback` (login redirect) and `http://localhost:5173` (post-logout) — development
     - `https://<your-production-domain>.com/auth/callback` (login redirect) and `https://<your-production-domain>.com` (post-logout) — production
     - Running several git worktrees at once? SPA registrations don't allow wildcards, so register the dev port range too (`http://localhost:5174/auth/callback` … `5183/auth/callback`, plus the bare `http://localhost:5174` … origins for post-logout) — or use Keycloak for worktree dev. See [Running several git worktrees](../development/worktree-isolation.md).
4. Click **"Register"**

> Save the **Frontend App Registration ID**.

### Step 3: Create Sign-in/Sign-up User Flow

1. In your External Tenant directory, search for **"External Identities"**
2. Go to **"Self-service sign up"** → **"User flows"**
3. Click **"New user flow"**
4. Select **"Sign up and sign in"**
5. Configure:
   - **Name**: e.g. `SignUpSignIn`
   - **Identity providers**: Check **"Email one-time passcode"**
   - **User attributes**: Select Email Address (required) + any other needed attributes
6. Click **"Create"**
7. Associate the user flow with your Frontend App Registration:
   - Inside the user flow, go to **Use** → **Applications**
   - Click **+ Add application** → Select your frontend app

### Step 4: Register API Application

1. In the External Tenant directory
2. Navigate to **App registrations** → **"New registration"**
3. Configure:
   - **Name**: e.g. `Huella Latam API - Node`
   - **Supported account types**: "Accounts in this organizational directory only"
4. Click **"Register"**

> Save the **API App Registration ID**.

### Step 5: Add Scopes

1. Navigate to your API app registration
2. Go to **Manage** → **"Expose an API"**
3. Click **"Add a scope"**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: `Access Huella Latam API`
   - **Admin consent description**: `Allow access to Huella Latam API`
   - **State**: Enabled
4. Click **Add scope** → **Save and continue** with default Application ID URI

### Step 6: Token Validation (no Easy Auth gateway)

The API validates Entra access tokens itself via JWKS (`AUTH_PROVIDER=jwks`), using the issuer/audience derived from the `AZURE_*` settings. **Do not enable** App Service Authentication (Easy Auth) — leave platform Authentication with no identity provider, so the `Authorization: Bearer` token reaches the app untouched.

### Step 7: Grant Permission from Frontend to Backend

1. Switch to your External Tenant directory
2. Navigate to **App registrations** → **All app registrations** tab
3. Select your **Frontend App Registration**
4. Go to **Manage** → **"API permissions"**
5. Click **"Add a permission"** → **"APIs my organization uses"**
6. Select the API app → Check `access_as_user`
7. Click **Add permissions** → **"Grant admin consent"**

### Step 8: Add Branding (Optional)

1. In your External Tenant directory
2. Navigate to **Microsoft Entra ID** → **Manage** → **Company branding**
3. Select **Default sign-in** → **Customize**

---

## Azure Portal Configuration — Organizational Tenant (Azure AD)

> Follow this section if you are using `AZURE_TENANT_TYPE="organizational"`.
> If you are using an external tenant, go back to the [previous section](#azure-portal-configuration--external-tenant-ciam).

### Responsibility Scope

For organizational deployments, responsibilities are typically split:

- **Tenant administrator** (e.g. UNDP) is responsible for:
  - App registrations
  - User access management (creating or inviting users)
  - Permissions and consent

- **Implementation team** is responsible for:
  - Backend API deployment
  - API token validation (JWKS) configuration
  - Token validation and integration

### Step 1: Prerequisites

- Ensure the organizational Azure Entra tenant is available and accessible
- Ensure users who require access are created or can be invited:
  - Internal users: already available in the directory
  - External users (if applicable): invited as **Guest users (B2B)**

### Step 2: Register Frontend Application

1. Ensure you are in the organizational tenant directory
2. Navigate to **App registrations** → **"New registration"**
3. Configure:
   - **Name**: e.g. `Huella Latam Web App - Frontend (SPA)`
   - **Supported account types**: "Accounts in this organizational directory only (Single tenant)"
   - **Redirect URIs** (Platform: Single-page application / SPA):
     - `http://localhost:5173/auth/callback` (login redirect) and `http://localhost:5173` (post-logout) — development
     - `https://<your-production-domain>.com/auth/callback` (login redirect) and `https://<your-production-domain>.com` (post-logout) — production
     - Running several git worktrees at once? SPA registrations don't allow wildcards, so register the dev port range too (`http://localhost:5174/auth/callback` … `5183/auth/callback`, plus the bare `http://localhost:5174` … origins for post-logout) — or use Keycloak for worktree dev. See [Running several git worktrees](../development/worktree-isolation.md).
4. Click **"Register"**

> Save the **Frontend App Registration ID**.

> Optional (recommended): Enable **"User assignment required"** in Enterprise Applications to restrict access only to explicitly assigned users.

### Step 3: Configure User Access

Users are managed directly within the organizational tenant. Self-service sign-up is not used.

1. Ensure all users who require access are available in the tenant:
   - Internal users: already present in the directory
   - External users (if needed): invite as **Guest users (B2B)**
2. (Optional but recommended) Create a **Security Group** (e.g., `Huella-Latam-Users`) and assign users to it
3. Assign users or groups to the application:
   - Navigate to **Enterprise Applications** → Select your frontend app
   - Go to **Users and groups** → Add the required users or security group

> Only users explicitly assigned will be able to access the application.

### Step 4: Register API Application

1. In the organizational tenant directory
2. Navigate to **App registrations** → **"New registration"**
3. Configure:
   - **Name**: e.g. `Huella Latam API - Node`
   - **Supported account types**: "Accounts in this organizational directory only (Single tenant)"
4. Click **"Register"**
5. Set the token version to v2.0:
   - Go to **Manage** → **Manifest**
   - Find `"accessTokenAcceptedVersion"` (it defaults to `null`, which means v1.0)
   - Change it to `2`
   - Click **Save**

> Save the **API App Registration ID**.

### Step 5: Add Scopes

1. Navigate to your API app registration
2. Go to **Manage** → **Expose an API**
3. Click **"Add a scope"**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: `Access Huella Latam API`
   - **Admin consent description**: `Allow access to Huella Latam API`
   - **State**: Enabled
4. Click **Add scope** → Continue with default **Application ID URI**

> The frontend must request tokens with scope: `api://<API_CLIENT_ID>/access_as_user`

### Step 6: Grant Permission from Frontend to Backend

1. Navigate to **App registrations** → Select your **Frontend App Registration**
2. Go to **Manage** → **API permissions**
3. Click **"Add a permission"** → **"APIs my organization uses"**
4. Select your API app → Check `access_as_user`
5. Click **Add permissions** → **"Grant admin consent"**

### Step 7: Token Validation (no Easy Auth gateway)

The API validates Entra access tokens itself via JWKS (`AUTH_PROVIDER=jwks`). **Do not enable** App Service Authentication (Easy Auth) — leave platform Authentication disabled so the `Authorization: Bearer` token reaches the app.

> **Note on token audience**: Both organizational and external tenants set the `aud` claim in tokens to the bare Application ID (GUID). The `api://` prefix form (e.g., `api://<API_CLIENT_ID>`) is only used in the Azure App Service **"Allowed token audiences"** configuration — it is not present in the actual token. The backend config variable `JWKS_AUDIENCE` should be set to the bare client ID GUID to match the token's `aud` claim.

### Step 8: Customize Sign-in Branding (Optional)

1. Navigate to **Microsoft Entra ID** → **Manage** → **Company branding**
2. Select **Default sign-in** → Customize as needed

### Step 9: Share Configuration with Implementation Team

Provide the following values:

- Tenant ID
- Frontend App Registration ID
- API App Registration ID

---

## Infrastructure (Bicep) Configuration

After completing the Azure Portal steps, you'll have:

- **Tenant ID** (and subdomain if external)
- **Frontend App Registration ID** (Client ID for the SPA / `VITE_OIDC_CLIENT_ID`)
- **API App Registration ID** (Client ID for token audience)

### Step 1: Configure Deployment Environment Variables

Set these in `infra/.envrc` (start with `infra/.envrc.template`):

```bash
# Azure Entra ID — choose your tenant type
export AZURE_TENANT_TYPE="external"          # "external" (CIAM) or "organizational" (Azure AD)
export AZURE_TENANT_ID=""                    # Tenant ID (GUID)
export AZURE_TENANT_SUBDOMAIN=""             # Only required for AZURE_TENANT_TYPE="external"
export AZURE_API_CLIENT_ID=""                # API App Registration ID
export AZURE_FRONT_CLIENT_ID=""              # Frontend App Registration ID

# Authority URL — depends on tenant type:
# External (CIAM): "https://${AZURE_TENANT_SUBDOMAIN}.ciamlogin.com/${AZURE_TENANT_ID}/v2.0"
# Organizational:  "https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0"
export AZURE_AUTH_AUTHORITY="..."
```

If these variables are **not set**, the API will deploy with `AUTH_PROVIDER=none` (no authentication).

### Step 2: Deploy

```bash
cd infra
./deploy.sh
```

The Bicep deployment will:

- Store credentials securely in Azure Key Vault
- Derive the API's `JWKS_ISSUER` / `JWKS_URI` / `JWKS_AUDIENCE` from your tenant values and set them on the App Service (`infra/modules/appService.bicep`) — the API consumes those generic values; it has no `AZURE_*` auth awareness
- Generate the frontend authority URL based on tenant type (consumed by `deploy-web.sh`)

---

## Environment Variables

### API (apps/api)

The API is a generic OIDC validator — it reads these directly and does **not** derive anything from `AZURE_*`:

| Variable              | Description                                          | Required         |
| --------------------- | ---------------------------------------------------- | ---------------- |
| `AUTH_PROVIDER`       | `"jwks"`, `"forced-user"`, or `"none"`               | Yes              |
| `JWKS_URI`            | JWKS endpoint (signing keys), reachable from the API | Yes (for `jwks`) |
| `JWKS_ISSUER`         | Expected token issuer (`iss`)                        | Yes (for `jwks`) |
| `JWKS_AUDIENCE`       | Expected token audience (`aud`)                      | Yes (for `jwks`) |
| `JWKS_REQUIRED_SCOPE` | Required scope claim (default `access_as_user`)      | No               |

You don't set these by hand for Azure — they're **derived from your tenant values**: locally by the `.envrc.azure.example` direnv helper, and on deploy by `infra/modules/appService.bicep`. The derivation:

| Derived value   | External (CIAM)                                                     | Organizational                                                      |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `JWKS_ISSUER`   | `https://{tenant-id}.ciamlogin.com/{tenant-id}/v2.0`                | `https://login.microsoftonline.com/{tenant-id}/v2.0`                |
| `JWKS_URI`      | `https://{subdomain}.ciamlogin.com/{tenant-id}/discovery/v2.0/keys` | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |
| `JWKS_AUDIENCE` | `{API_CLIENT_ID}` (bare GUID)                                       | `{API_CLIENT_ID}` (bare GUID)                                       |

> **CIAM split:** the token `iss` (→ `JWKS_ISSUER`) uses the tenant-**GUID** host, while the JWKS endpoint (→ `JWKS_URI`) uses the tenant-**subdomain** host. Entra issues v2.0 tokens; for organizational tenants set the API app registration manifest's `accessTokenAcceptedVersion` to `2`. The API relies on the issuer match to reject older tokens (a v1.0 token has a different `iss`), not a separate version check.

### Web (apps/web)

| Variable                 | Description                                                           | Required |
| ------------------------ | --------------------------------------------------------------------- | -------- |
| `VITE_OIDC_ISSUER`       | OIDC issuer / authority URL (= the Entra authority)                   | Yes      |
| `VITE_OIDC_CLIENT_ID`    | Frontend (public SPA) App Registration ID                             | Yes      |
| `VITE_OIDC_SCOPES`       | Space-separated scopes; append `api://<API_CLIENT_ID>/access_as_user` | Yes      |
| `VITE_OIDC_REDIRECT_URI` | Login redirect URI; defaults to `<serving-origin>/auth/callback`      | No       |

On Azure, `deploy-web.sh` derives all `VITE_OIDC_*` from the `AZURE_*` values, so you set the `AZURE_*` ones in `infra/.envrc` (not the `VITE_OIDC_*` directly).

**Issuer URL examples:**

```bash
# External (CIAM):
VITE_OIDC_ISSUER="https://undphuella.ciamlogin.com/929aea96-.../v2.0"

# Organizational:
VITE_OIDC_ISSUER="https://login.microsoftonline.com/1c49a94b-.../v2.0"
```

---

## Backend Authentication

The API supports the following authentication providers via the `AUTH_PROVIDER` environment variable.

### JWKS (all environments — local, on-prem, and Azure)

Set `AUTH_PROVIDER=jwks` and the `JWKS_*` values above. The API validates JWT access tokens directly against the configured JWKS endpoint (signature, issuer, audience, expiry, required scope) — the same code path for Entra (external or organizational) and any other OIDC issuer (e.g. Keycloak). On Azure App Service, keep platform Authentication (Easy Auth) **disabled** so the `Authorization: Bearer` token reaches the app.

### Forced User (Development only)

Set `AUTH_PROVIDER=forced-user` to bypass authentication and use a hardcoded user:

```bash
AUTH_PROVIDER=forced-user
FORCED_USER_IDP_ID="some-uuid"
FORCED_USER_EMAIL="dev@example.com"
```

### Token Claim Differences

Entra issues v2.0 tokens for both tenant types. The API reads these claims (it performs no Azure-specific version check — a v1.0 token simply fails the issuer match):

| Claim    | External (CIAM)                 | Organizational (Azure AD)             |
| -------- | ------------------------------- | ------------------------------------- |
| Email    | `email` or `preferred_username` | `email` or `preferred_username`       |
| User ID  | `sub`                           | `oid` or `sub`                        |
| Audience | `{client-id}`                   | `{client-id}`                         |
| Issuer   | `{id}.ciamlogin.com/{id}/v2.0`  | `login.microsoftonline.com/{id}/v2.0` |
| Scope    | `access_as_user`                | `access_as_user`                      |
| Version  | `2.0`                           | `2.0`                                 |

---

## Frontend OIDC Configuration

The frontend uses a generic OIDC client (`oidc-client-ts`). The issuer is the only value that differs between tenants, passed via `VITE_OIDC_ISSUER`. On Azure, `deploy-web.sh` derives the `VITE_OIDC_*` values from the `AZURE_*` variables.

See `apps/web/src/config/oidcConfig.ts` for the current configuration.

### Local Development

```bash
# .envrc — External tenant example
export VITE_OIDC_ISSUER="https://undphuella.ciamlogin.com/929aea96-.../v2.0"

# .envrc — Organizational tenant example
export VITE_OIDC_ISSUER="https://login.microsoftonline.com/1c49a94b-.../v2.0"
```

---

## Testing

### Test Frontend Authentication Locally

1. Start the development servers: `pnpm dev`
2. Open `http://localhost:5173`
3. Click "Sign In"
4. Authenticate:
   - **External**: Enter email → receive OTP → enter code
   - **Organizational**: Sign in with organizational credentials (username + password / MFA)
5. You should be redirected back to the app, authenticated

### Test API Authentication Locally

For local development with JWKS validation, copy `.envrc.azure.example` to `.envrc` and fill in your tenant values — it derives the `JWKS_*` (and `VITE_OIDC_*`) for you, so you never hand-write an issuer/JWKS URL:

```bash
cp .envrc.azure.example .envrc   # then set AZURE_TENANT_ID / SUBDOMAIN / API_CLIENT_ID / FRONT_CLIENT_ID
direnv allow
```

For local development without auth:

```bash
AUTH_PROVIDER=forced-user
FORCED_USER_IDP_ID="some-uuid"
FORCED_USER_EMAIL="dev@example.com"
```

---

## Troubleshooting

### Login / redirect errors

`"redirect_uri_mismatch"` after login means the app's `<origin>/auth/callback` isn't registered on the Azure app registration — see [Troubleshooting → OIDC redirect URI mismatch](../development/troubleshooting.md#oidc-redirect-uri-mismatch). Register the exact SPA redirect URIs during portal setup (see the [External](#azure-portal-configuration--external-tenant-ciam) / [Organizational](#azure-portal-configuration--organizational-tenant-azure-ad) steps).

### Token Validation Errors

| Error                                | Cause                                                | Solution                                                                                                                                                                              |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The iss claim value is not allowed" | Issuer mismatch (a v1.0 token's `iss` lacks `/v2.0`) | Ensure `JWKS_ISSUER` matches the token's `iss`. For organizational tenants, set `accessTokenAcceptedVersion` to `2` in the API app registration manifest so Entra issues v2.0 tokens. |
| "Token missing required scope"       | Missing `access_as_user`                             | Ensure the API app exposes the `access_as_user` scope and the frontend requests `api://{client-id}/access_as_user`.                                                                   |
| "The aud claim value is not allowed" | Audience mismatch                                    | Check `JWKS_AUDIENCE` matches the token's `aud` claim (the bare API client-id GUID for v2.0 tokens).                                                                                  |
| "Token payload missing email claim"  | Token lacks email field                              | Ensure the app registration includes `email` and `profile` in the token's optional claims, or that users have email addresses in their Azure profiles.                                |
| "Token expired"                      | Access token expired                                 | oidc-client-ts handles silent renew automatically; check the `offline_access` scope is included.                                                                                      |

### 401 from the API on Azure

| Error                        | Cause                                    | Solution                                                                                              |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 401 after a successful login | App Service Easy Auth gateway is enabled | Disable platform Authentication (no identity provider) so the `Bearer` token reaches the app for JWKS |

### Network Issues

| Error            | Cause                            | Solution                                           |
| ---------------- | -------------------------------- | -------------------------------------------------- |
| CORS errors      | API not allowing frontend origin | Configure CORS in Fastify or Azure App Service     |
| 401 Unauthorized | Token not included or invalid    | Check browser DevTools → Network → Request headers |

---

## Additional Resources

- [Azure Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [Azure Entra ID (Organizational) Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [oidc-client-ts Documentation](https://github.com/authts/oidc-client-ts)
- [Infrastructure Deployment Guide](./Deployment.md)

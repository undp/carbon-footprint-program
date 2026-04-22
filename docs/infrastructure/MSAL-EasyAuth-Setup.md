# Authentication Configuration Guide

This guide explains how to configure authentication for the Huella Latam application. The platform supports two Azure Entra tenant types, each suited to different deployment scenarios.

## Table of Contents

1. [Choosing a Tenant Type](#choosing-a-tenant-type)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Azure Portal Configuration — External Tenant (CIAM)](#azure-portal-configuration--external-tenant-ciam)
5. [Azure Portal Configuration — Organizational Tenant (Azure AD)](#azure-portal-configuration--organizational-tenant-azure-ad)
6. [Infrastructure (Bicep) Configuration](#infrastructure-bicep-configuration)
7. [Environment Variables](#environment-variables)
8. [Backend Authentication](#backend-authentication)
9. [Frontend MSAL Configuration](#frontend-msal-configuration)
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

> The application code handles both types automatically. The only difference is the Azure Portal setup and environment variable configuration.

---

## Architecture

```
┌─────────────┐                    ┌──────────────────┐
│   Browser   │                    │  Azure Entra ID  │
│             │◄──────(1)─────────►│  (External or    │
│  MSAL.js    │   OAuth 2.0 Flow   │   Organizational)│
└──────┬──────┘                    └──────────────────┘
       │
       │ (2) Access Token
       │
       ▼
┌─────────────┐     (3)            ┌──────────────────┐
│   Frontend  │────────────────────►│  Azure App       │
│   (React)   │   API Request       │  Service         │
│             │   + Bearer Token    │  (Easy-Auth or   │
└─────────────┘                    │   JWKS)          │
                                   └────────┬─────────┘
                                            │
                                            │ (4) Validates token
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │   API Backend    │
                                   │   (Fastify)      │
                                   └──────────────────┘
```

**Flow:**

1. User authenticates via MSAL against Azure Entra ID
2. MSAL receives Access Token and ID Token
3. Frontend sends API requests with `Authorization: Bearer <token>`
4. Backend validates the token (via Easy-Auth headers or JWKS verification)

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
   - **Name**: e.g. `Huella Latam Web App - Frontend MSAL`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URIs** (Platform: Single-page application / SPA):
     - `http://localhost:5173` and `http://localhost:5173/app/home` (development)
     - `https://<your-production-domain>.com` and `https://<your-production-domain>.com/app/home` (production)
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

### Step 6: Enable Easy Auth on App Service (API)

1. Switch to your **principal Tenant directory** (not the External Tenant)
2. Navigate to **Azure Portal** → **Resource Groups** → Select your API App Service
3. Go to **Settings** → **"Authentication"** → **"Add identity provider"**
4. Select **"Microsoft"** and configure:
   - **Tenant**: Choose **External Configuration**
   - **App registration type**: "Provide the details of an existing app registration"
     - **Application (client) ID**: Your API App Registration ID
     - **Issuer URL**: `https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0`
     - **Allowed token audiences**: Your API App Registration ID
   - **Client application requirement**: "Allow requests from specific client applications"
     - Add your **Frontend App Registration ID**
   - **Identity requirement**: "Allow requests from any identity"
   - **Tenant requirement**: "Allow requests from specific tenants"
     - Add your External Tenant ID
   - **Restrict access**: "Allow unauthenticated access" (the API handles authorization)
   - **Token store**: Enable
5. Click **"Add"**

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
  - App Service authentication (Easy Auth) configuration
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
   - **Name**: e.g. `Huella Latam Web App - Frontend MSAL`
   - **Supported account types**: "Accounts in this organizational directory only (Single tenant)"
   - **Redirect URIs** (Platform: Single-page application / SPA):
     - `http://localhost:5173` and `http://localhost:5173/app/home` (development)
     - `https://<your-production-domain>.com` and `https://<your-production-domain>.com/app/home` (production)
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

### Step 7: Enable Easy Auth on App Service (API)

1. Navigate to your API App Service
2. Go to **Settings** → **"Authentication"** → **"Add identity provider"**
3. Select **"Microsoft"** and configure:
   - **Tenant**: Choose your organizational tenant
   - **App registration type**: "Provide the details of an existing app registration"
     - **Application (client) ID**: Your API App Registration ID
     - **Issuer URL**: `https://login.microsoftonline.com/<tenant-id>/v2.0`
     - **Allowed token audiences**: `api://<API_CLIENT_ID>`
   - **Client application requirement**: "Allow requests from specific client applications"
     - Add your **Frontend App Registration ID**
   - **Identity requirement**: "Allow requests from any identity"
   - **Tenant requirement**: "Allow requests from specific tenants"
     - Add your organizational Tenant ID
   - **Restrict access**: "Allow unauthenticated access" (the API handles authorization)
   - **Token store**: Enable
4. Click **"Add"**

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
- **Frontend App Registration ID** (Client ID for MSAL)
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
- Set up environment variables for the API
- Generate authority URL automatically based on tenant type

---

## Environment Variables

### API (apps/api)

| Variable                 | Description                                           | Required                       |
| ------------------------ | ----------------------------------------------------- | ------------------------------ |
| `AZURE_TENANT_TYPE`      | `"external"` or `"organizational"`                    | Yes (defaults to `"external"`) |
| `AZURE_TENANT_ID`        | Tenant ID (GUID)                                      | Yes                            |
| `AZURE_TENANT_SUBDOMAIN` | Tenant subdomain (e.g. `undphuella`)                  | Only for external              |
| `AZURE_API_CLIENT_ID`    | API App Registration ID                               | Yes                            |
| `AUTH_PROVIDER`          | `"jwks"`, `"easy-auth"`, `"forced-user"`, or `"none"` | Yes                            |
| `JWKS_URI`               | Override JWKS endpoint                                | No (auto-computed)             |
| `JWKS_ISSUER`            | Override expected issuer                              | No (auto-computed)             |
| `JWKS_AUDIENCE`          | Override expected audience                            | No (auto-computed)             |

**Auto-computed values based on `AZURE_TENANT_TYPE`:**

| Value    | External (CIAM)                                                     | Organizational                                                      |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Issuer   | `https://{tenant-id}.ciamlogin.com/{tenant-id}/v2.0`                | `https://login.microsoftonline.com/{tenant-id}/v2.0`                |
| JWKS URI | `https://{subdomain}.ciamlogin.com/{tenant-id}/discovery/v2.0/keys` | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |
| Audience | `{API_CLIENT_ID}` (bare GUID)                                       | `{API_CLIENT_ID}` (bare GUID)                                       |

> Only v2.0 tokens are accepted. For organizational tenants, ensure the API app registration manifest has `accessTokenAcceptedVersion` set to `2`.

### Web (apps/web)

| Variable                     | Description                               | Required |
| ---------------------------- | ----------------------------------------- | -------- |
| `VITE_AZURE_FRONT_CLIENT_ID` | Frontend App Registration ID              | Yes      |
| `VITE_AZURE_API_CLIENT_ID`   | API App Registration ID (for token scope) | Yes      |
| `VITE_AZURE_AUTH_AUTHORITY`  | Authority URL                             | Yes      |
| `VITE_FRONT_BASE_URL`        | Frontend base URL                         | Yes      |

**Authority URL examples:**

```bash
# External (CIAM):
VITE_AZURE_AUTH_AUTHORITY="https://undphuella.ciamlogin.com/929aea96-.../v2.0"

# Organizational:
VITE_AZURE_AUTH_AUTHORITY="https://login.microsoftonline.com/1c49a94b-.../v2.0"
```

---

## Backend Authentication

The API supports multiple authentication providers via the `AUTH_PROVIDER` environment variable.

### Easy-Auth (Recommended for Azure App Service)

Set `AUTH_PROVIDER=easy-auth`. Azure App Service handles token validation and injects user claims via headers (`X-MS-CLIENT-PRINCIPAL`). No code changes required.

### JWKS (Recommended for local development and non-Azure hosting)

Set `AUTH_PROVIDER=jwks`. The API validates JWT tokens directly using the JWKS endpoint. This works with both external and organizational tenants automatically.

### Forced User (Development only)

Set `AUTH_PROVIDER=forced-user` to bypass authentication and use a hardcoded user:

```bash
AUTH_PROVIDER=forced-user
FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="some-uuid"
FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
```

### Token Claim Differences

Only v2.0 tokens are accepted for both tenant types:

| Claim    | External (CIAM)                 | Organizational (Azure AD)             |
| -------- | ------------------------------- | ------------------------------------- |
| Email    | `email` or `preferred_username` | `email` or `preferred_username`       |
| User ID  | `sub`                           | `oid` or `sub`                        |
| Audience | `{client-id}`                   | `{client-id}`                         |
| Issuer   | `{id}.ciamlogin.com/{id}/v2.0`  | `login.microsoftonline.com/{id}/v2.0` |
| Scope    | `access_as_user`                | `access_as_user`                      |
| Version  | `2.0`                           | `2.0`                                 |

---

## Frontend MSAL Configuration

The frontend MSAL configuration is the same for both tenant types. The authority URL (`VITE_AZURE_AUTH_AUTHORITY`) is the only value that differs, and it's passed via environment variables.

See `apps/web/src/config/msalConfig.ts` for the current configuration.

### Local Development

```bash
# .envrc — External tenant example
export VITE_AZURE_AUTH_AUTHORITY="https://undphuella.ciamlogin.com/929aea96-.../v2.0"

# .envrc — Organizational tenant example
export VITE_AZURE_AUTH_AUTHORITY="https://login.microsoftonline.com/1c49a94b-.../v2.0"
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

For local development with JWKS validation:

```bash
AUTH_PROVIDER=jwks
AZURE_TENANT_TYPE="organizational"  # or "external"
AZURE_TENANT_ID="your-tenant-id"
AZURE_API_CLIENT_ID="your-api-client-id"
AZURE_TENANT_SUBDOMAIN="your-ciam-subdomain"  # required when AZURE_TENANT_TYPE="external"
```

For local development without auth:

```bash
AUTH_PROVIDER=forced-user
FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="some-uuid"
FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
```

---

## Troubleshooting

### MSAL Errors

| Error                     | Cause                           | Solution                                             |
| ------------------------- | ------------------------------- | ---------------------------------------------------- |
| "MSAL is not initialized" | MSAL not initialized before use | Ensure `initializeMsal()` is called before rendering |
| "Popup blocked"           | Browser blocks auth popup       | Allow popups or use redirect flow                    |
| "redirect_uri_mismatch"   | Redirect URI mismatch           | Check URI matches exactly in Azure Portal            |

### Token Validation Errors

| Error                                | Cause                    | Solution                                                                                                                                               |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Token version X is not supported"   | v1.0 token received      | Set `accessTokenAcceptedVersion` to `2` in the API app registration manifest (App registrations > [API App] > Manifest).                               |
| "Token issuer is not a v2.0 issuer"  | v1.0 issuer in token     | Same fix: set `accessTokenAcceptedVersion` to `2` in the manifest. Ensure authority URL includes `/v2.0`.                                              |
| "Token missing required scope"       | Missing `access_as_user` | Ensure the API app exposes the `access_as_user` scope and the frontend requests `api://{client-id}/access_as_user`.                                    |
| "The iss claim value is not allowed" | Issuer mismatch          | Check `AZURE_TENANT_TYPE` and `AZURE_TENANT_ID`. The expected issuer is `https://login.microsoftonline.com/{tenant-id}/v2.0` for organizational.       |
| "The aud claim value is not allowed" | Audience mismatch        | With v2.0 tokens, the audience is the bare client ID GUID. Check `AZURE_API_CLIENT_ID` matches the token's `aud` claim.                                |
| "Token payload missing email claim"  | Token lacks email field  | Ensure the app registration includes `email` and `profile` in the token's optional claims, or that users have email addresses in their Azure profiles. |
| "Token expired"                      | Access token expired     | MSAL handles refresh tokens automatically; check `offline_access` scope is included.                                                                   |

### Easy-Auth Errors

| Error                                    | Cause                   | Solution                                                                        |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| "X-MS-CLIENT-PRINCIPAL header not found" | Easy-Auth not enabled   | Verify `AUTH_PROVIDER=easy-auth` and check Azure Portal Authentication settings |
| "Failed to parse principal"              | Header format incorrect | Check App Service authentication logs                                           |

### Network Issues

| Error            | Cause                            | Solution                                           |
| ---------------- | -------------------------------- | -------------------------------------------------- |
| CORS errors      | API not allowing frontend origin | Configure CORS in Fastify or Azure App Service     |
| 401 Unauthorized | Token not included or invalid    | Check browser DevTools → Network → Request headers |

---

## Additional Resources

- [Azure Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [Azure Entra ID (Organizational) Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure Easy-Auth Documentation](https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization)
- [Infrastructure Deployment Guide](./infrastructure/Deployment.md)

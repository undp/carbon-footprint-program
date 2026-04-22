# Authentication

This document covers the authentication system: how the API verifies caller identity, the four supported authentication providers, and how to configure each one.

For role-based access control (what authenticated users are allowed to do), see [RBAC and Authorization](./rbac.md).
For the full Azure Entra ID / MSAL setup walkthrough, see [MSAL & Easy Auth Setup](../MSAL-EasyAuth-Setup.md).

---

## Overview

The API uses a pluggable authentication system selected by the `AUTH_PROVIDER` environment variable. All providers share the same output: an `AuthUser` object attached to the request.

```
Incoming request
      │
      ▼
┌─────────────────────────────────┐
│   authenticationPlugin          │
│   (onRequest hook)              │
│   → calls AuthService           │
│   → AuthService delegates to    │
│     the configured provider     │
│   → result: request.authUser    │
└─────────────────────────────────┘
      │
      ▼
  Routes that declare
  onRequest: [fastify.requireAuth]
  block unauthenticated requests
```

**`AuthUser` shape:**
```typescript
interface AuthUser {
  idpUserId: string;   // Unique user ID from the identity provider
  email: string;       // User's email address
  idpName: string;     // Provider name: "jwks" | "easy-auth" | "forced-user"
}
```

This object is set on `request.authUser`. The `userResolvePlugin` subsequently upserts the user into the database and populates `request.currentUser` (which includes the system role).

---

## Auth Providers

### 1. `jwks` — JWT / JWKS Validation

**When to use:** Direct API access, local development with a real Azure Entra tenant, or non-Azure hosting where Easy Auth is unavailable.

The API validates the JWT access token in the `Authorization: Bearer <token>` header using the tenant's JWKS endpoint.

**Validation steps (in order):**
1. Token signature verified against the JWKS public key (fetched from the JWKS endpoint, cached for 10 minutes)
2. Token issuer (`iss`) matches the expected Azure Entra issuer
3. Token audience (`aud`) matches `AZURE_API_CLIENT_ID`
4. Token expiration (`exp`) is in the future
5. Token version is `2.0` (only v2.0 tokens are accepted)
6. Token contains the required scope: `access_as_user`
7. Token contains a user identifier (`oid` or `sub`)
8. Token contains an email (`email` or `preferred_username`)

**User ID extraction:** Prefers `oid` (Azure Object ID) over `sub`. Using `oid` is important for organizational tenants where `sub` can differ between applications.

**JWKS endpoint cache:** Keys are cached for 10 minutes to avoid excessive requests to the JWKS endpoint. If a token is signed with an unknown key ID (`kid`), the cache is invalidated and refetched.

**Auto-computed config based on `AZURE_TENANT_TYPE`:**

| Value | External (CIAM) | Organizational (Azure AD) |
|---|---|---|
| Issuer | `https://{tenant-id}.ciamlogin.com/{tenant-id}/v2.0` | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| JWKS URI | `https://{subdomain}.ciamlogin.com/{tenant-id}/discovery/v2.0/keys` | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |
| Audience | `{AZURE_API_CLIENT_ID}` (bare GUID) | `{AZURE_API_CLIENT_ID}` (bare GUID) |

**Required environment variables:**
```bash
AUTH_PROVIDER="jwks"
AZURE_TENANT_TYPE="external"        # "external" (CIAM) or "organizational"
AZURE_TENANT_ID="<tenant-guid>"
AZURE_API_CLIENT_ID="<api-client-guid>"
AZURE_TENANT_SUBDOMAIN="<subdomain>"  # Required only when AZURE_TENANT_TYPE="external"
```

**Optional overrides** (override auto-computed values):
```bash
JWKS_URI="https://custom-jwks-endpoint/.well-known/jwks.json"
JWKS_ISSUER="https://custom-issuer/v2.0"
JWKS_AUDIENCE="custom-audience"
```

---

### 2. `easy-auth` — Azure App Service Easy Auth

**When to use:** Production deployments on Azure App Service with Easy Auth enabled (recommended for production).

Azure App Service validates the JWT token before the request reaches the application. Authenticated requests include the `X-MS-CLIENT-PRINCIPAL` header — a base64-encoded JSON payload with the user's claims. The API reads this header and extracts the user identity; no cryptographic validation is performed by the API itself.

**Header structure:**
```json
{
  "auth_typ": "aad",
  "claims": [
    { "typ": "preferred_username", "val": "user@example.com" },
    { "typ": "http://schemas.microsoft.com/identity/claims/objectidentifier", "val": "<oid>" }
  ],
  "name_typ": "...",
  "role_typ": "..."
}
```

**Claim extraction (in priority order):**
- **Email:** `preferred_username` → SOAP email claim → `email`
- **User ID:** `http://schemas.microsoft.com/identity/claims/objectidentifier` → `oid`

**Required environment variables:**
```bash
AUTH_PROVIDER="easy-auth"
```

Azure App Service authentication must also be configured in Azure Portal. See [MSAL & Easy Auth Setup](../MSAL-EasyAuth-Setup.md#azure-portal-configuration--external-tenant-ciam) for the full walkthrough.

> When Easy Auth is enabled with "Allow unauthenticated access", the API handles all authorization decisions internally. Requests without the `X-MS-CLIENT-PRINCIPAL` header are treated as unauthenticated (401 on protected routes).

---

### 3. `forced-user` — Development Bypass

**When to use:** Local development only. Bypasses all authentication — every request is treated as authenticated with a configurable identity.

**Required environment variables:**
```bash
AUTH_PROVIDER="forced-user"
FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="local-dev-user-001"
```

> Never use `forced-user` in production or staging environments.

---

### 4. `none` — No Authentication

**When to use:** Explicitly disabling authentication. All authentication attempts fail with a 401 error. This is the default when Azure Entra configuration variables are not set during Bicep deployment.

```bash
AUTH_PROVIDER="none"
```

---

## Request Authentication Lifecycle

```
1. onRequest hook fires (authenticationPlugin)
   │
   ├── Auth provider's authenticate() called
   │   ├── jwks:        validates JWT from Authorization header
   │   ├── easy-auth:   reads X-MS-CLIENT-PRINCIPAL header
   │   ├── forced-user: returns hardcoded AuthUser from env vars
   │   └── none:        always returns { user: null }
   │
   ├── Success → request.authUser = AuthUser
   └── Failure → request.authUser remains null
         (routes with requireAuth will return 401)

2. preValidation hook fires (userResolvePlugin)
   │
   ├── If request.authUser is set:
   │   ├── Upsert user in DB by idpUserId (creates on first login)
   │   └── request.currentUser = DB user (includes system role)
   └── If request.authUser is null:
       └── request.currentUser remains null

3. Route handler or further preHandler hooks check:
   ├── fastify.requireAuth   → 401 if request.authUser is null
   ├── fastify.requireRoles  → 403 if system role insufficient
   ├── fastify.requireOrganizationRole → 403 if org role insufficient
   └── fastify.requireCarbonInventoryAccess → 403 if no inventory access
```

---

## Provider Selection by Environment

| Environment | Recommended provider | Reason |
|---|---|---|
| Local development | `forced-user` | No Azure setup needed |
| Local dev with real auth | `jwks` | Tests actual token flow |
| Staging / Production (Azure App Service) | `easy-auth` | Token validation done by platform |
| Self-hosted / non-Azure production | `jwks` | Direct token validation |
| Auth intentionally disabled | `none` | Explicit opt-out |

---

## Token Claim Reference

Both Azure tenant types issue v2.0 tokens. The API only accepts v2.0 tokens when `AZURE_TENANT_ID` is configured.

| Claim | External (CIAM) | Organizational (Azure AD) |
|---|---|---|
| `iss` | `https://{id}.ciamlogin.com/{id}/v2.0` | `https://login.microsoftonline.com/{id}/v2.0` |
| `aud` | `{AZURE_API_CLIENT_ID}` (bare GUID) | `{AZURE_API_CLIENT_ID}` (bare GUID) |
| `oid` | Object ID (preferred for user identity) | Object ID (preferred) |
| `sub` | Subject (fallback) | Subject (fallback) |
| `email` | User email | User email |
| `preferred_username` | Fallback email | Fallback email |
| `scp` | `access_as_user` | `access_as_user` |
| `ver` | `"2.0"` | `"2.0"` |

> The `aud` claim uses the bare Client ID GUID. The `api://` prefix form (e.g. `api://<CLIENT_ID>`) is only used in the Azure Portal **"Allowed token audiences"** field — it does not appear in the token itself.

---

## Common Errors

| Error | Provider | Cause | Fix |
|---|---|---|---|
| `Token version "1.0" is not supported` | jwks | v1.0 token issued | Set `accessTokenAcceptedVersion: 2` in API app registration manifest |
| `Token issuer is not a v2.0 issuer` | jwks | Old issuer format | Same fix as above |
| `Token missing required scope "access_as_user"` | jwks | Scope not requested | Frontend must request `api://{CLIENT_ID}/access_as_user` |
| `The aud claim value is not allowed` | jwks | Audience mismatch | Check `AZURE_API_CLIENT_ID` matches the token's `aud` |
| `Token payload missing email claim` | jwks | No email in token | Add `email` optional claim in API app registration |
| `Missing X-MS-CLIENT-PRINCIPAL header` | easy-auth | Easy Auth not enabled or disabled | Enable authentication in Azure App Service settings |
| `Invalid Easy Auth principal structure` | easy-auth | Header malformed | Check App Service authentication logs |

For the full troubleshooting guide, see [MSAL & Easy Auth Setup — Troubleshooting](../MSAL-EasyAuth-Setup.md#troubleshooting).

# Authentication

This document covers the authentication system: how the API verifies caller identity, the three supported authentication providers, and how to configure each one.

For the access modes a route can opt into (private / public / anonymous), see [Route Access Modes](./route-access-modes.md).
For role-based access control (what authenticated users are allowed to do), see [RBAC and Authorization](./rbac.md).
For the full Azure Entra ID / OIDC setup walkthrough, see [Azure OIDC auth setup](../infrastructure/AzureAuthenticationSetup.md).

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
  idpUserId: string; // Unique user ID from the identity provider
  email: string; // User's email address
  idpName: string; // Provider name: "jwks" | "forced-user"
}
```

This object is set on `request.authUser`. The `userResolvePlugin` subsequently upserts the user into the database and populates `request.currentUser` (which includes the system role).

---

## Auth Providers

### 1. `jwks` — JWT / JWKS Validation

**When to use:** Every real deployment — local, on-prem, and Azure. Works against any OIDC issuer (Azure Entra, Keycloak, …).

The API validates the JWT access token in the `Authorization: Bearer <token>` header using the issuer's JWKS endpoint.

**Validation steps (in order):**

1. Token signature verified against the JWKS public key (fetched from the JWKS endpoint, cached for 10 minutes)
2. Token issuer (`iss`) matches `JWKS_ISSUER` (when set)
3. Token audience (`aud`) matches `JWKS_AUDIENCE` (when set)
4. Token expiration (`exp`) is in the future
5. Token contains the required scope (default `access_as_user`)
6. Token contains a user identifier (`oid` or `sub`)
7. Token contains an email (`email` or `preferred_username`)

**User ID extraction:** Prefers `oid` (Azure Object ID) over `sub`. Using `oid` is important for organizational tenants where `sub` can differ between applications.

**JWKS endpoint cache:** Keys are cached for 10 minutes to avoid excessive requests to the JWKS endpoint. If a token is signed with an unknown key ID (`kid`), the cache is invalidated and refetched.

**Required environment variables:**

```bash
AUTH_PROVIDER="jwks"
JWKS_URI="<jwks-endpoint>"      # signing keys, reachable from the API
JWKS_ISSUER="<expected-iss>"    # exact token issuer
JWKS_AUDIENCE="<expected-aud>"  # e.g. the API client-id GUID for Entra
# JWKS_REQUIRED_SCOPE defaults to "access_as_user"
```

The API reads these directly — it derives nothing from `AZURE_*`. For Azure Entra the
values are produced from the tenant inputs by `.envrc.azure.example` (local) and
`infra/modules/appService.bicep` (deploy):

| Derived value   | External (CIAM)                                                     | Organizational (Azure AD)                                           |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `JWKS_ISSUER`   | `https://{tenant-id}.ciamlogin.com/{tenant-id}/v2.0`                | `https://login.microsoftonline.com/{tenant-id}/v2.0`                |
| `JWKS_URI`      | `https://{subdomain}.ciamlogin.com/{tenant-id}/discovery/v2.0/keys` | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |
| `JWKS_AUDIENCE` | `{api-client-id}` (bare GUID)                                       | `{api-client-id}` (bare GUID)                                       |

> CIAM split: the token `iss` (→ `JWKS_ISSUER`) uses the tenant-GUID host, the JWKS endpoint (→ `JWKS_URI`) uses the tenant-subdomain host.

---

### 2. `forced-user` — Development Bypass

**When to use:** Local development only. Bypasses all authentication — every request is treated as authenticated with a configurable identity.

**Required environment variables:**

```bash
AUTH_PROVIDER="forced-user"
FORCED_USER_EMAIL_WHEN_NO_PROVIDER="dev@example.com"
FORCED_USER_IDP_ID_WHEN_NO_PROVIDER="local-dev-user-001"
```

> Never use `forced-user` in production or staging environments.

---

### 3. `none` — No Authentication

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

| Environment                              | Recommended provider | Reason                                                 |
| ---------------------------------------- | -------------------- | ------------------------------------------------------ |
| Local development                        | `forced-user`        | No Azure setup needed                                  |
| Local dev with real auth                 | `jwks`               | Tests actual token flow                                |
| Staging / Production (Azure App Service) | `jwks`               | Validates Entra tokens via JWKS (no Easy Auth gateway) |
| Self-hosted / non-Azure production       | `jwks`               | Direct token validation                                |
| Auth intentionally disabled              | `none`               | Explicit opt-out                                       |

---

## Token Claim Reference

Both Azure tenant types issue v2.0 tokens. The API performs no version check — it relies on the issuer (`iss`) matching `JWKS_ISSUER`, so a v1.0 token (whose issuer differs) is rejected.

| Claim                | External (CIAM)                         | Organizational (Azure AD)                     |
| -------------------- | --------------------------------------- | --------------------------------------------- |
| `iss`                | `https://{id}.ciamlogin.com/{id}/v2.0`  | `https://login.microsoftonline.com/{id}/v2.0` |
| `aud`                | `{api-client-id}` (bare GUID)           | `{api-client-id}` (bare GUID)                 |
| `oid`                | Object ID (preferred for user identity) | Object ID (preferred)                         |
| `sub`                | Subject (fallback)                      | Subject (fallback)                            |
| `email`              | User email                              | User email                                    |
| `preferred_username` | Fallback email                          | Fallback email                                |
| `scp`                | `access_as_user`                        | `access_as_user`                              |
| `ver`                | `"2.0"`                                 | `"2.0"`                                       |

> The `aud` claim uses the bare Client ID GUID. The `api://` prefix form (e.g. `api://<CLIENT_ID>`) is only used in the Azure Portal **"Allowed token audiences"** field — it does not appear in the token itself.

---

## Common Errors

| Error                                           | Provider | Cause                                | Fix                                                                                                                                                 |
| ----------------------------------------------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `The iss claim value is not allowed`            | jwks     | Issuer mismatch (incl. a v1.0 token) | Ensure `JWKS_ISSUER` matches the token's `iss`; for organizational tenants set `accessTokenAcceptedVersion: 2` in the API app registration manifest |
| `Token missing required scope "access_as_user"` | jwks     | Scope not requested                  | Frontend must request `api://{CLIENT_ID}/access_as_user`                                                                                            |
| `The aud claim value is not allowed`            | jwks     | Audience mismatch                    | Check `JWKS_AUDIENCE` matches the token's `aud`                                                                                                     |
| `Token payload missing email claim`             | jwks     | No email in token                    | Add `email` optional claim in API app registration                                                                                                  |

For the full troubleshooting guide, see [Azure OIDC auth setup — Troubleshooting](../infrastructure/AzureAuthenticationSetup.md#troubleshooting).

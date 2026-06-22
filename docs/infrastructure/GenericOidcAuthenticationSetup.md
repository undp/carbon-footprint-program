# Generic OIDC Authentication Setup

This is the **provider-agnostic contract** for authentication in Huella Latam. The frontend is a generic OIDC client (`oidc-client-ts`) and the API validates access tokens directly via **JWKS** (`AUTH_PROVIDER=jwks`). Any compliant OpenID Connect / OAuth 2.0 Identity Provider (IdP) that exposes a JWKS endpoint works — Azure Entra and Keycloak are just two concrete instances.

Read this guide to understand _what the platform requires from an IdP_. For step-by-step portal/realm setup of a specific IdP, see:

- [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md) — Azure Entra External ID (CIAM) or organizational Azure AD.
- [Keycloak Authentication Setup](./KeycloakAuthenticationSetup.md) — local-dev Keycloak via the compose overlay.

There is **no MSAL** and **no Azure App Service Easy Auth gateway**. On Azure App Service, keep platform Authentication **disabled** so the `Authorization: Bearer` token reaches the app.

## Table of Contents

1. [Architecture](#architecture)
2. [What the IdP Must Provide](#what-the-idp-must-provide)
3. [Token Contract](#token-contract)
4. [Backend Configuration (API)](#backend-configuration-api)
5. [Frontend Configuration (Web)](#frontend-configuration-web)
6. [Onboarding a New IdP — Checklist](#onboarding-a-new-idp--checklist)
7. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────┐                    ┌──────────────────┐
│   Browser   │                    │   OIDC Provider  │
│ OIDC client │◄──────(1)─────────►│  (Entra,         │
│ (oidc-      │  Auth Code + PKCE  │   Keycloak, …)   │
│  client-ts) │                    └──────────────────┘
└──────┬──────┘
       │
       │ (2) Access Token (Bearer)
       ▼
┌─────────────┐     (3)            ┌──────────────────┐
│   Frontend  │───────────────────►│   API Backend    │
│   (React)   │   API Request      │   (Fastify)      │
│             │   + Bearer Token   │  AUTH_PROVIDER   │
└─────────────┘                    │     = jwks       │
                                   └────────┬─────────┘
                                            │ (4) Validate via JWKS
                                            ▼
                                   ┌──────────────────┐
                                   │  IdP JWKS keys   │
                                   └──────────────────┘
```

**Flow:**

1. The SPA runs Authorization Code + PKCE against the IdP and receives an access token (and ID token).
2. The SPA sends API requests with `Authorization: Bearer <access-token>`.
3. The API validates the token itself against the IdP's JWKS keys — signature, issuer, audience, expiry, and required scope.
4. No gateway sits in front of the API; the token is validated in-process by `@fastify/jwt` + `jwks-rsa`.

---

## What the IdP Must Provide

| Requirement                   | Detail                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **OIDC discovery**            | A standard `https://<issuer>/.well-known/openid-configuration` document (the frontend `authority` relies on it).        |
| **JWKS endpoint**             | A public JWKS URL the API can reach to fetch signing keys.                                                              |
| **Authorization Code + PKCE** | A **public** SPA client with PKCE (`S256`), no client secret. Implicit flow is not used.                                |
| **Redirect URI**              | `<web-origin>/auth/callback` registered exactly (login redirect), plus `<web-origin>` for post-logout.                  |
| **Refresh tokens**            | The `offline_access` scope, so `oidc-client-ts` can silently renew without re-prompting.                                |
| **Email claim**               | `email` or `preferred_username` in the access token — the API rejects tokens without one.                               |
| **Subject claim**             | `sub` (or `oid`) — used as the stable IdP user id.                                                                      |
| **API scope**                 | A scope (default name `access_as_user`) emitted in the token's `scope`/`scp` claim, used to authorize calls to the API. |
| **Audience**                  | The access token's `aud` must equal the value the API expects (`JWKS_AUDIENCE`).                                        |

---

## Token Contract

The API reads these claims from the validated access token (see `apps/api/src/auth/providers/JwksAuthProvider.ts`):

| Concern   | Claim(s) read                   | Notes                                                                                                     |
| --------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Signature | (JWKS `kid` → signing key)      | Validated by `@fastify/jwt` against the JWKS endpoint.                                                    |
| Issuer    | `iss`                           | Must match an allowed issuer **if** one is configured (see warning below).                                |
| Audience  | `aud`                           | Must match `JWKS_AUDIENCE` if configured.                                                                 |
| Expiry    | `exp`                           | Expired tokens are rejected.                                                                              |
| Scope     | `scp` ?? `scope`                | Azure emits `scp`; standard OIDC (Keycloak, per RFC 9068) emits `scope`. Must include the required scope. |
| User id   | `oid` ?? `sub`                  | Prefers `oid` (Azure), falls back to `sub`.                                                               |
| Email     | `email` ?? `preferred_username` | Required — token rejected if both are absent.                                                             |

> **Azure-only checks:** the `v2.0` token-version and `/v2.0` issuer checks run **only when `AZURE_TENANT_ID` is set**. For non-Azure IdPs, leave all `AZURE_*` auth vars empty so these checks are skipped.

---

## Backend Configuration (API)

Set `AUTH_PROVIDER=jwks` and the generic `JWKS_*` variables. These take priority over the Azure-derived values; for a non-Azure IdP, leave the `AZURE_*` auth vars empty.

| Variable                | Required | Description                                                                                            |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `AUTH_PROVIDER`         | Yes      | Set to `jwks`.                                                                                         |
| `JWKS_URI`              | Yes\*    | JWKS endpoint the API fetches keys from. Must be reachable **from the API process** (not the browser). |
| `JWKS_ISSUER`           | Yes      | Expected `iss`. **If empty, issuer validation is disabled** and the API warns at boot — always set it. |
| `JWKS_AUDIENCE`         | Yes      | Expected `aud`. If empty, audience validation is disabled.                                             |
| `JWKS_REQUIRED_SCOPE`   | No       | Required scope claim. Defaults to `access_as_user`.                                                    |
| `JWKS_SKIP_SCOPE_CHECK` | No       | `true` disables scope enforcement entirely (not recommended).                                          |

\* If `JWKS_URI` is unset (and no Azure tenant is configured), the API has no JWKS client and silently falls back to the static `JWT_SECRET` HMAC path — i.e. it will not validate real OIDC tokens. Always set `JWKS_URI` for `jwks` mode.

**Resolution priority** (from `apps/api/src/config/environment.ts`):

```
RESOLVED_JWKS_URI       = JWKS_URI      || <Azure-computed from AZURE_TENANT_*>
RESOLVED_JWKS_ISSUERS   = [JWKS_ISSUER] || <Azure-computed issuers>     // [] ⇒ issuer check OFF
RESOLVED_JWKS_AUDIENCE  = JWKS_AUDIENCE || AZURE_API_CLIENT_ID
RESOLVED_REQUIRED_SCOPE = JWKS_SKIP_SCOPE_CHECK ? none : (JWKS_REQUIRED_SCOPE ?? "access_as_user")
```

> ⚠️ **Do not set `AZURE_TENANT_ID` for a non-Azure IdP.** Any value re-enables the Azure v2.0 token checks and the Azure-derived JWKS/issuer/audience defaults, which will reject your IdP's tokens.

Example (`.envrc` / `.env.dockercompose`):

```bash
AUTH_PROVIDER=jwks
JWKS_URI=https://idp.example.com/.well-known/jwks.json
JWKS_ISSUER=https://idp.example.com/
JWKS_AUDIENCE=huella-api
JWKS_REQUIRED_SCOPE=access_as_user   # optional; this is the default
# Leave the AZURE_* auth vars empty.
```

---

## Frontend Configuration (Web)

The web app always uses OIDC. Config is **build-time** (inlined by Vite) — rebuild the web image when these change. See `apps/web/src/config/oidcConfig.ts`.

| Variable                             | Required | Description                                                                                                                     |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_OIDC_ISSUER`                   | Yes      | OIDC issuer / authority URL (serves `/.well-known/openid-configuration`).                                                       |
| `VITE_OIDC_CLIENT_ID`                | Yes      | Public SPA client id.                                                                                                           |
| `VITE_OIDC_SCOPES`                   | Yes      | Space-separated. Baseline: `openid profile email offline_access` (+ the API scope on IdPs that need it explicitly, e.g. Entra). |
| `VITE_OIDC_REDIRECT_URI`             | No       | Login redirect. Defaults to `<serving-origin>/auth/callback`.                                                                   |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | No       | Post-logout redirect. Defaults to `<serving-origin>`.                                                                           |

The client uses `response_type=code` (Auth Code + PKCE), persists tokens in `localStorage`, and silently renews via the refresh token (`automaticSilentRenew`). The app fails loud at boot if `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, or `VITE_OIDC_SCOPES` is empty.

> **Scope baseline:** `openid` (id_token) + `email` (the backend rejects tokens without an email claim) + `offline_access` (refresh → silent renew) + `profile` (display name). Whether the API scope (`access_as_user`) must be requested explicitly depends on the IdP: Entra requires `api://<API_CLIENT_ID>/access_as_user`; Keycloak grants `access_as_user` as a default client scope, so it is not requested.

---

## Onboarding a New IdP — Checklist

1. Create a **public SPA client** with Authorization Code + PKCE (`S256`).
2. Register redirect URIs: `<web-origin>/auth/callback` and `<web-origin>` (post-logout), for every origin (local + deployed).
3. Ensure the access token carries `email` (or `preferred_username`) and `sub`.
4. Expose/define the API scope (default `access_as_user`) and make sure it lands in the token's `scope`/`scp` claim.
5. Set the token `aud` to a value you'll mirror in `JWKS_AUDIENCE`.
6. Enable refresh tokens (`offline_access`).
7. **Backend:** `AUTH_PROVIDER=jwks`, `JWKS_URI`, `JWKS_ISSUER`, `JWKS_AUDIENCE`, `JWKS_REQUIRED_SCOPE` (default ok). Leave `AZURE_*` empty.
8. **Frontend:** `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPES`, `VITE_OIDC_REDIRECT_URI`.
9. Log in end-to-end and confirm an authenticated API call returns 200.

---

## Troubleshooting

| Symptom                                     | Likely cause                                        | Fix                                                                                                     |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Boot warning "no issuers are set"           | `JWKS_ISSUER` empty and no Azure tenant configured  | Set `JWKS_ISSUER` to the token's exact `iss`.                                                           |
| 401 on every request                        | API can't reach `JWKS_URI`, or `aud`/`iss` mismatch | Confirm `JWKS_URI` is reachable from the API process; match `JWKS_AUDIENCE`/`JWKS_ISSUER` to the token. |
| "Token missing required scope"              | The API scope isn't in `scope`/`scp`                | Ensure the client requests/grants the scope; check `JWKS_REQUIRED_SCOPE`.                               |
| "Token payload missing email claim"         | IdP doesn't emit `email`/`preferred_username`       | Add an email claim mapper to the token.                                                                 |
| Tokens accepted from unexpected issuers     | `JWKS_ISSUER` not set ⇒ issuer check disabled       | Always set `JWKS_ISSUER`.                                                                               |
| Non-Azure IdP tokens rejected as "not v2.0" | `AZURE_TENANT_ID` is set                            | Clear all `AZURE_*` auth vars for a non-Azure IdP.                                                      |

---

## Additional Resources

- [oidc-client-ts](https://github.com/authts/oidc-client-ts)
- [RFC 9068 — JWT access tokens](https://datatracker.ietf.org/doc/html/rfc9068)
- [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)

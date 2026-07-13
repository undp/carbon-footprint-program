# Generic OIDC Authentication Setup

This is the **provider-agnostic contract** for authentication in Huella Latam. The frontend is a generic OIDC client (`oidc-client-ts`) and the API validates access tokens directly via **JWKS** (`AUTH_PROVIDER=jwks`). Any compliant OpenID Connect / OAuth 2.0 Identity Provider (IdP) that exposes a JWKS endpoint works — Azure Entra and Keycloak are just two concrete instances.

Read this guide to understand _what the platform requires from an IdP_. For step-by-step portal/realm setup of a specific IdP, see:

- [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md) — Azure Entra External ID (CIAM) or organizational Azure AD.
- [Keycloak Setup](./KeycloakSetup.md) — Keycloak IdP for local dev (compose overlay) and production.

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

| Requirement                   | Detail                                                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OIDC discovery**            | A standard `https://<issuer>/.well-known/openid-configuration` document (the frontend `authority` relies on it).                                                                  |
| **JWKS endpoint**             | A public JWKS URL the API can reach to fetch signing keys.                                                                                                                        |
| **Authorization Code + PKCE** | A **public** SPA client with PKCE (`S256`), no client secret. Implicit flow is not used.                                                                                          |
| **Redirect URI**              | `<web-origin>/auth/callback` registered exactly (login redirect), plus `<web-origin>` for post-logout.                                                                            |
| **Refresh tokens**            | Silent renewal via `oidc-client-ts` (`automaticSilentRenew`). Keycloak uses the SSO-session-bound refresh token (no `offline_access`); Entra requires the `offline_access` scope. |
| **Email claim**               | `email` or `preferred_username` in the access token — the API rejects tokens without one.                                                                                         |
| **Subject claim**             | `sub` (or `oid`) — used as the stable IdP user id.                                                                                                                                |
| **API scope**                 | A scope (default name `access_as_user`) emitted in the token's `scope`/`scp` claim, used to authorize calls to the API.                                                           |
| **Audience**                  | The access token's `aud` must equal the value the API expects (`JWKS_AUDIENCE`).                                                                                                  |

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

> **No provider-specific checks:** validation (signature, issuer, audience, scope, expiry) is uniform across IdPs — the API has no Azure-specific code. Setting `JWKS_ISSUER` to the exact `/v2.0` issuer is what rejects older (v1.0) Entra tokens.

---

## Backend Configuration (API)

Set `AUTH_PROVIDER=jwks` and the `JWKS_*` variables. The API reads them as-is — it does no provider-specific derivation, and there are no `AZURE_*` auth variables in the API runtime.

| Variable                | Required | Description                                                                                            |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `AUTH_PROVIDER`         | Yes      | Set to `jwks`.                                                                                         |
| `JWKS_URI`              | Yes\*    | JWKS endpoint the API fetches keys from. Must be reachable **from the API process** (not the browser). |
| `JWKS_ISSUER`           | Yes      | Expected `iss`. **If empty, issuer validation is disabled** and the API warns at boot — always set it. |
| `JWKS_AUDIENCE`         | Yes      | Expected `aud`. If empty, audience validation is disabled.                                             |
| `JWKS_REQUIRED_SCOPE`   | No       | Required scope claim. Defaults to `access_as_user`.                                                    |
| `JWKS_SKIP_SCOPE_CHECK` | No       | `true` disables scope enforcement entirely (not recommended).                                          |

\* If `JWKS_URI` is unset, the API has no JWKS client and silently falls back to the static `JWT_SECRET` HMAC path — i.e. it will not validate real OIDC tokens. Always set `JWKS_URI` for `jwks` mode.

**How the API reads them** (from `apps/api/src/config/environment.ts`):

```
JWKS_URI            → used as-is (empty ⇒ no JWKS client ⇒ static JWT_SECRET fallback)
JWKS_ISSUER         → allowed issuer (empty ⇒ issuer validation OFF, warns at boot)
JWKS_AUDIENCE       → expected audience (empty ⇒ audience validation OFF)
JWKS_REQUIRED_SCOPE → required scope; JWKS_SKIP_SCOPE_CHECK=true disables it; default "access_as_user"
```

The API does no provider-specific derivation. For Azure, the env template
(`.envrc.azure.example`) and the deploy (`infra/modules/appService.bicep`)
compute these `JWKS_*` values from the raw tenant inputs — see the
[Azure Entra guide](./AzureAuthenticationSetup.md).

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

The web app always uses OIDC. Config is **build-time** (inlined by Vite) — rebuild the web image when these change. These vars are read and defaulted in `apps/web/src/config/environment.ts`; `apps/web/src/config/oidcConfig.ts` assembles the `UserManagerSettings` from them.

| Variable                             | Required | Description                                                                                                                                                                                    |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_OIDC_ISSUER`                   | Yes      | OIDC issuer / authority URL (serves `/.well-known/openid-configuration`).                                                                                                                      |
| `VITE_OIDC_CLIENT_ID`                | Yes      | Public SPA client id.                                                                                                                                                                          |
| `VITE_OIDC_SCOPES`                   | Yes      | Space-separated. Baseline: `openid profile email`; add `offline_access` only on IdPs that gate refresh tokens on it (Entra), plus the API scope where it must be requested explicitly (Entra). |
| `VITE_OIDC_REDIRECT_URI`             | No       | Login redirect. Defaults to `<serving-origin>/auth/callback`.                                                                                                                                  |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | No       | Post-logout redirect. Defaults to `<serving-origin>/`.                                                                                                                                         |

The client uses `response_type=code` (Auth Code + PKCE), persists tokens in `localStorage`, and silently renews via the refresh token (`automaticSilentRenew`) — see `apps/web/src/config/oidcConfig.ts`. The app fails loud at boot (`apps/web/src/config/environment.ts`) if `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, or `VITE_OIDC_SCOPES` is empty.

> **Scope baseline:** `openid` (id_token) + `email` (the backend rejects tokens without an email claim) + `profile` (display name). `offline_access` (refresh → silent renew) is IdP-conditional: Entra needs it to issue a refresh token at all, whereas Keycloak issues an SSO-session-bound refresh token for the auth-code flow without it, so the Keycloak templates omit it. Likewise, whether the API scope (`access_as_user`) must be requested explicitly depends on the IdP: Entra requires `api://<API_CLIENT_ID>/access_as_user`; Keycloak grants `access_as_user` as a default client scope, so it is not requested.

---

## Onboarding a New IdP — Checklist

1. Create a **public SPA client** with Authorization Code + PKCE (`S256`).
2. Register redirect URIs: `<web-origin>/auth/callback` and `<web-origin>` (post-logout), for every origin (local + deployed).
3. Ensure the access token carries `email` (or `preferred_username`) and `sub`.
4. Expose/define the API scope (default `access_as_user`) and make sure it lands in the token's `scope`/`scp` claim.
5. Set the token `aud` to a value you'll mirror in `JWKS_AUDIENCE`.
6. Enable refresh tokens — via the `offline_access` scope on IdPs that gate refresh on it (e.g. Entra); Keycloak issues them for the auth-code flow without it.
7. **Backend:** `AUTH_PROVIDER=jwks`, `JWKS_URI`, `JWKS_ISSUER`, `JWKS_AUDIENCE`, `JWKS_REQUIRED_SCOPE` (default ok). Leave `AZURE_*` empty.
8. **Frontend:** `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPES`, `VITE_OIDC_REDIRECT_URI`.
9. Log in end-to-end and confirm an authenticated API call returns 200.

---

## Troubleshooting

| Symptom                                 | Likely cause                                        | Fix                                                                                                     |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Boot warning "no issuer is set"         | `JWKS_ISSUER` is empty                              | Set `JWKS_ISSUER` to the token's exact `iss`.                                                           |
| 401 on every request                    | API can't reach `JWKS_URI`, or `aud`/`iss` mismatch | Confirm `JWKS_URI` is reachable from the API process; match `JWKS_AUDIENCE`/`JWKS_ISSUER` to the token. |
| "Token missing required scope"          | The API scope isn't in `scope`/`scp`                | Ensure the client requests/grants the scope; check `JWKS_REQUIRED_SCOPE`.                               |
| "Token payload missing email claim"     | IdP doesn't emit `email`/`preferred_username`       | Add an email claim mapper to the token.                                                                 |
| Tokens accepted from unexpected issuers | `JWKS_ISSUER` not set ⇒ issuer check disabled       | Always set `JWKS_ISSUER`.                                                                               |

---

## Additional Resources

- [oidc-client-ts](https://github.com/authts/oidc-client-ts)
- [RFC 9068 — JWT access tokens](https://datatracker.ietf.org/doc/html/rfc9068)
- [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)

## Why

Frontend authentication is hard-coupled to Azure via `@azure/msal-browser`/`@azure/msal-react`, so the identity provider cannot be swapped per deployment. The backend already validates tokens from any OIDC issuer that emits the claims it requires (`sub`/`oid` + `email`/`preferred_username`) through the `jwks` provider (proven daily on local + on-prem RD against Entra External ID), which leaves the MSAL→generic-client swap as the only unproven work. This change makes the IdP selectable by environment variable (issuer), unblocking deployments (e.g. MMARN/RD) that cannot or will not use Azure.

## What Changes

- **BREAKING**: Remove `@azure/msal-browser` and `@azure/msal-react` (including their use in `routes/__root.tsx` `MsalProvider` and the `AccountInfo` typing in `hooks/useInitializeUser.ts`); replace with `oidc-client-ts` + `react-oidc-context`. There is no custom login UI — login/logout happen via redirect to the configured IdP. After login the user lands on `Routes.HOME` (parity with the current MSAL behavior, which forces `/app/home`); returning to the original deep-link is **not** part of this change.
- Introduce a singleton `UserManager` (`oidcUserManager.ts`) as the single source of truth for the session **outside React** (used by the `requireRole` route guard and the `ky` HTTP client), plus React hooks for components.
- Add a public `/auth/callback` route resolved **before** the `/app/*` and `/admin/*` guards, plus popup and silent-renew callbacks. Session recovery (`handleLoginFailure`, `requireRole` catch) maps `clearCache` → `userManager.removeUser()`, preserving the existing `authError=login_failed` snackbar + ref-guard behavior.
- Migrate the "save draft" popup flow (`SaveDraftAuthModal`) to `signinPopup` + callback.
- Token storage in `localStorage`, automatic silent renew via refresh token (`offline_access` scope), and federated logout (`end_session_endpoint`) — parity with the current MSAL behavior. Greenfield user migration (no `idpUserId` re-mapping).
- Make frontend auth env-driven and build-time wired: `VITE_OIDC_*` keys in `vite-env.d.ts`, `environment.ts`, `apps/web/Dockerfile` (ARG/ENV), **both** `docker-compose.yml` and `docker-compose.prod.yml` (build args), and the `.env*` / `.env.prod.*` templates. Web rebuild is required (Vite is build-time).
- Add a local **Keycloak** dev IdP in docker-compose (overlay `compose/keycloak.yaml`) with a reproducible realm export (`infra/keycloak/realm-huella.json`): public `huella-web` client (Auth Code + PKCE S256), audience mapper for `huella-api`, default scopes `openid profile email offline_access`, self-registration on, email required. Critical hostname split: browser `iss` (`http://localhost:8081/...`) vs internal `JWKS_URI` (`http://keycloak:8080/...`).
- Backend env config (`AUTH_PROVIDER=jwks`, `JWKS_ISSUER`, `JWKS_URI`, `JWKS_AUDIENCE`), no **auth** `AZURE_*` (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) including shell/direnv, which overrides `--env-file`. Azure **Storage** `AZURE_*` vars are unaffected. **Scope hardening (now mandatory, not skip):** `JwksAuthProvider.ts` reads `payload.scp ?? payload.scope`, `OidcTokenPayload` gains `scope?: string`, and `JWKS_REQUIRED_SCOPE=access_as_user` stays enforced (a minimal, isolated commit). Keycloak emits `access_as_user` as a default client scope so the check passes.
- Add a **build-time** env-driven Content-Security-Policy in `apps/web/nginx.conf` whose `connect-src`/`form-action`/`frame-src` allow the IdP domain — baked at image build from a build ARG derived from `VITE_OIDC_ISSUER`, no per-country hardcode (the runner has no runtime env, and Vite already forces a rebuild on issuer change, so a runtime `envsubst` model is not used). **Azure SWA is out of scope** for this change: `apps/web/public/staticwebapp.config.json`, `infra/deploy-web.sh`, and `staticWebApp.bicep` are left untouched and stay Azure-only (Option A targets on-prem nginx); making SWA IdP-agnostic is a documented follow-up.

## Capabilities

### New Capabilities

- `generic-oidc-authentication`: Frontend obtains and renews tokens from any OIDC issuer chosen by environment variable, using a singleton `UserManager` shared with the non-React route guard and HTTP client; covers Auth Code + PKCE redirect login, federated logout, automatic silent renew, the public callback ordering, session-recovery mapping, and the save-draft popup flow.
- `oidc-backend-token-validation`: Backend accepts tokens from any env-configured OIDC issuer that emits the required claims via the `jwks` provider (issuer/JWKS-URI/audience contract, browser↔api hostname split, Azure-only validation disabled when `AZURE_TENANT_ID` is unset) plus the mandatory generic scope handling (`scp ?? scope` with `JWKS_REQUIRED_SCOPE` enforced).
- `keycloak-dev-environment`: Local Keycloak service + reproducible realm import in docker-compose for development, exposing an issuer consistent between browser and api (hostname split), a PKCE public client, an audience mapper, and self-registration with email required.
- `idp-content-security-policy`: Build-time env-driven CSP in nginx permitting the configured IdP domain (derived from the OIDC issuer via a build ARG) without manual per-deployment edits, scoped to the on-prem nginx deploy path. Azure SWA is explicitly out of scope (Azure-only, untouched, documented follow-up).

### Modified Capabilities

<!-- No existing spec requirements are changing -->

## Impact

- **Web (auth core)**: `config/msalConfig.ts` → `oidcConfig.ts`; remove `auth/initializeMsal.ts`; new `auth/oidcUserManager.ts`; rewrite `contexts/AuthContext.tsx` (incl. the `signInPopup` error contract — see design); update `utils/requireRole.ts`, `api/http/auth.ts`, `api/http/client.ts`, `screens/CarbonInventory/components/SaveDraftAuthModal.tsx`, `routes/__root.tsx` (`MsalProvider` → OIDC), `hooks/useInitializeUser.ts` (`AccountInfo` typing); new `/auth/callback` route + `routes.const.ts` entry.
- **Web (build/env)**: `apps/web/src/vite-env.d.ts`, `apps/web/src/config/environment.ts`, `apps/web/Dockerfile` (incl. a build ARG for the IdP domain used by the CSP), `docker-compose.yml` **and** `docker-compose.prod.yml` build args, `.envrc.template` / `.env.dockercompose.example` / `.env.prod.dockercompose.example`, `apps/web/nginx.conf` (new build-time CSP). **Not touched (out of scope, stays Azure-only):** `apps/web/public/staticwebapp.config.json`, `infra/deploy-web.sh`, `infra/modules/staticWebApp.bicep`.
- **Web (deps)**: drop `@azure/msal-browser`, `@azure/msal-react`; add `oidc-client-ts`, `react-oidc-context` (user runs `pnpm install`).
- **API**: env templates `apps/api/.envrc.template`, `.env.dockercompose.example`; mandatory scope hardening — `JwksAuthProvider.ts` reads `payload.scp ?? payload.scope` and `OidcTokenPayload` in `apps/api/src/auth/types.ts` gains `scope?: string` (isolated commit); `JWKS_REQUIRED_SCOPE` stays enforced.
- **Infra**: new `compose/keycloak.yaml` overlay (keycloak + keycloak-db), `infra/keycloak/realm-huella.json` realm export, `COMPOSE_FILE` wiring.
- **Validation**: attended app-browser (Playwright MCP) + manual — no e2e suite in CI (web test is a placeholder). `format`/`lint`/`type-check` must be green.

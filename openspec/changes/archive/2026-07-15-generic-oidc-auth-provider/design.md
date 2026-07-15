## Context

The web app authenticates exclusively through MSAL (`@azure/msal-browser` + `@azure/msal-react`), hard-coupling the frontend to Azure. The backend, by contrast, already validates any OIDC issuer through its `jwks` provider (`JwksAuthProvider.ts`), and that path runs daily on local and on-prem RD against Entra External ID. The provider is purely generic JWKS — there is no Azure-specific validation path: `idpUserId = oid ?? sub`; scope is read from `payload.scp ?? payload.scope`; email is required.

This means the **only unproven work** is replacing the MSAL client in the frontend with a generic OIDC client. The session is consumed in three places that matter for the design: React components (hooks), the `requireRole` route guard (`utils/requireRole.ts`, runs in TanStack Router `beforeLoad`, outside React), and the `ky` HTTP client (`api/http/auth.ts` + `client.ts`, also outside React). A drop-in for `react-oidc-context` hooks alone is therefore insufficient.

Constraints: greenfield users (no `idpUserId` re-mapping); `localStorage` token storage for parity; the web is **build-time** (Vite), so env changes require a rebuild; validation is attended via the `app-browser` skill (Playwright MCP) — there is no e2e suite in CI.

## Goals / Non-Goals

**Goals:**

- IdP selectable by environment variable (issuer); Azure CIAM becomes one configurable issuer among others.
- Full removal of MSAL from the frontend; no custom login UI (redirect-based login/logout).
- Behavioral parity with today: silent renew via refresh token, federated logout, session recovery on `/users/me` failure, deep-link to protected routes, and the save-draft flow (full-page redirect, no popup).
- A reproducible local Keycloak dev IdP so the generic path can be exercised end-to-end without Azure.
- Backend stays env-config plus one minimal, isolated code change: generic scope handling (`scp ?? scope`) so scope validation stays enforced and provider-agnostic.

**Non-Goals:**

- Re-mapping existing users' `idpUserId` (greenfield).
- Changing the auto-provisioning-to-SUPERADMIN behavior (temporary test behavior; must be reverted before shared/real-data environments).
- Building an e2e test suite or CI gate for auth (validation is attended).
- Production Keycloak hardening (HA, custom themes, production hostname/TLS) — dev `start-dev` only.
- Migrating the backend off the `jwks` provider or touching its proven validation logic (beyond the one minimal scope-read change in D6).

## Decisions

### D1 — `oidc-client-ts` + `react-oidc-context` over MSAL

Standards-based OIDC client that works against any compliant issuer (Keycloak, Entra External ID, others), versus MSAL which is Azure-shaped. `react-oidc-context` provides the React hooks; `oidc-client-ts` provides the underlying `UserManager`. Alternative considered: keep MSAL and add a second provider abstraction — rejected because it preserves the Azure coupling and doubles the auth surface.

### D2 — Singleton `UserManager` as the source of truth, not just hooks

`requireRole` and the `ky` client run outside React and cannot use hooks. A module-level `oidcUserManager.ts` exports the `oidc-client-ts` `UserManager` singleton plus a `getValidOidcUser()` helper (resolves the stored user, attempting a silent renew via the refresh token if expired) as the single source of truth; `react-oidc-context` is configured against the same `UserManager` instance so React and non-React consumers never diverge. The React-facing `AuthContext` exposes only `signInRedirect(returnTo?)`, `signOut`, `user`, `isAuthenticated`/`isLoading`, and `refetchUser` — no custom `getAccessToken` or popup wrappers. Alternative: thread tokens through React context into the router/client — rejected, the guard executes before React renders.

### D3 — Public `/auth/callback` resolved before the protected guards

The redirect callback must complete `signinRedirectCallback` and establish the session **before** the `/app/*` and `/admin/*` guards evaluate, otherwise the guard redirects away mid-login. `/auth/callback` is therefore a public route (no `requireRole`), defined as a constant in `routes.const.ts`. There is a single callback route — login is always a full-page redirect, so there is no separate popup callback; `automaticSilentRenew` uses the refresh token (no iframe callback route).

**Post-login destination = `returnTo` (default `Routes.HOME`).** Login is initiated via `signInRedirect(returnTo?)`, which threads the internal `returnTo` path through the OIDC `state` param (typed as `OidcSignInState`; `oidc-client-ts` persists and CSRF-validates `state`). `/auth/callback` reads `user.state.returnTo` and navigates there, falling back to `Routes.HOME` when no `returnTo` was set. `returnTo` is app-generated (built via the router, never user input) and `navigate({ to })` only targets internal routes, so it needs no extra validation. The current MSAL setup forced `redirectUri=/app/home` and disabled returning to the originating page; this change supersedes that by restoring the requested location through `returnTo`, used both for deep links and to reclaim the save-draft route (see D9).

### D4 — Session recovery maps `clearCache` → `userManager.removeUser()`

Today, `AuthContext.handleLoginFailure` and the `requireRole` catch call MSAL `clearCache` (local clear, no IdP round-trip) and surface the `authError=login_failed` snackbar with a ref-guard. The generic equivalent of a local clear is `userManager.removeUser()` (not `signoutRedirect`, which would round-trip the IdP and lose the snackbar). The recovery path, snackbar, and ref-guard are preserved verbatim.

### D5 — Keycloak hostname split (browser `iss` vs internal JWKS)

The token `iss` is consumed by the browser and must be browser-resolvable (`http://localhost:18080/realms/huella`); the API fetches JWKS from inside the docker network and must use the service name (`http://keycloak:8080/realms/huella/protocol/openid-connect/certs`). `KC_HOSTNAME=http://localhost:18080` (the Keycloak 26 name, set in the compose env) fixes the host so the issuer is derived as `http://localhost:18080/realms/huella`; host port `18080` maps to container `8080` to avoid colliding with the api on 8080. Mismatching these is the primary failure mode, so it is encoded in both the compose env and the env templates.

### D6 — Audience mapper + scope hardening (DECIDED: harden, not skip)

Keycloak tokens won't carry `aud: huella-api` unless a realm audience mapper adds it; `JWKS_AUDIENCE=huella-api` then validates it. Scope (`scp`) is Azure-shaped; the standard OIDC claim is `scope`. **Decision (Codex):** take the hardening path, not the PoC skip. `JwksAuthProvider.ts` reads `payload.scp ?? payload.scope`, `OidcTokenPayload` gains `scope?: string` (`apps/api/src/auth/types.ts`), and `JWKS_REQUIRED_SCOPE=access_as_user` stays enforced — skipping scope (`JWKS_SKIP_SCOPE_CHECK=true`) is rejected because it degrades security on what is meant to be a genuinely generic adapter. The change is a minimal, isolated commit. Keycloak must therefore emit `access_as_user` in the access token (a default client scope on `huella-web` — see keycloak-dev-environment), so the required-scope check passes. This is now **mandatory**, not optional.

### D7 — Build-time CSP in nginx, SWA out of scope (DECIDED)

`apps/web/nginx.conf` defines **no** CSP today, and the runner stage has no runtime env (`VITE_*` are build-time only; the Dockerfile just `COPY`s the static `dist` + `nginx.conf`, no entrypoint — `Dockerfile:52-63`).

- **Mechanism (Codex P2 = A, build-time).** Bake the IdP domain into the nginx CSP at **build time** from a build ARG derived from `VITE_OIDC_ISSUER` (processed when the image is built). The `envsubst`-at-entrypoint alternative is rejected: the web bundle already requires a rebuild whenever the issuer changes (Vite is build-time), so a runtime CSP would add a _second_ configuration model without removing the rebuild. One model, build-time, consistent with the rest of `VITE_*`.
- **Azure SWA (Codex P3 = B, out of scope).** Option A targets on-prem RD/MMARN via docker-compose/nginx **without Azure**. Making `staticwebapp.config.json`'s CSP IdP-agnostic would open a second deploy target with its own generation/validation, outside this change's purpose. The SWA path is therefore **explicitly out of scope** for this change and remains **Azure-only**: `staticwebapp.config.json`, `infra/deploy-web.sh`, and `staticWebApp.bicep` are **not** modified here. This is documented, not hidden — a later change can make SWA IdP-agnostic if SWA must serve a generic-OIDC deployment.

No per-country hardcode. **Capability boundary note:** `idp-content-security-policy` and Option A validation are scoped to the on-prem nginx path; SWA is not a supported generic-OIDC target until a follow-up change.

### D8 — De-risking spike before Keycloak (Phase -1)

A throwaway branch (`spike/mati/oidc-entra`, not merged) validates `oidc-client-ts` against the **current Entra External ID** issuer with the **unchanged** backend, isolating the single unproven variable before investing in Keycloak. Gate: login + token accepted + refresh + federated logout all work → green-light the full plan; any CIAM quirk (e.g. the no-`kid` case the backend already handles) is documented and resolved in the client first.

### D9 — Save-draft uses the same full-page redirect (no popup contract)

The save-draft flow does **not** use a popup. `SaveDraftAuthModal.handleSignIn` builds the claim route (`Routes.CARBON_INVENTORY_CLAIM`) via the router and calls `signInRedirect(returnTo)`, carrying that route as `returnTo` in the OIDC `state`. After login, `/auth/callback` navigates to the claim route, which (domain-owned) reclaims the draft and lands on the list. Because the page is unloaded on redirect, there is no in-memory promise that can hang on cancel/close, and there is no save-draft-specific error contract to maintain (the latent `signInPopup` swallow-vs-throw bug the popup design worried about no longer exists). The draft is reclaimed by the destination route, not held in the modal or in auth.

### D10 — Backend claim requirements bound "generic" (not "any")

The `jwks` provider requires `sub`/`oid` and `email`/`preferred_username` (`JwksAuthProvider.ts`) and reads scope from `payload.scp ?? payload.scope`; both `scp` and the standard `scope` claim are typed on `OidcTokenPayload` (`types.ts`). "Accepts any OIDC issuer" is therefore an overstatement: the issuer must emit those claims, and Keycloak must be configured to put a real **email in the access token** (not just hold one on the user). Specs are worded as "any OIDC issuer that emits the required claims," and the scope hardening (D6) is what makes the `scope`-vs-`scp` difference a non-issue.

## Risks / Trade-offs

- **Keycloak audience/scope misconfiguration** → without the audience mapper and without skip/`scope`, valid tokens are rejected. Mitigation: encode the mapper in the realm export and pin `JWKS_AUDIENCE`; document both scope paths.
- **Browser↔api issuer/hostname mismatch** → breaks validation silently. Mitigation: the hostname split (D5) is fixed in the compose env (`KC_HOSTNAME`) and the env templates, with inline comments.
- **Residual auth `AZURE_*` in shell/direnv** → the API has no Azure-specific validation path, so `AZURE_TENANT_ID`/`AZURE_API_CLIENT_ID` no longer re-activate any Azure rules and do not reject Keycloak tokens. The remaining concern is correctness of the `JWKS_*` values themselves (issuer/URI/audience) and not leaking stale Azure-shaped `JWKS_*` overrides from `.envrc`, which can override `--env-file`. Mitigation: keep the Keycloak `JWKS_*` block in the templates and ensure `.envrc` does not pin conflicting `JWKS_ISSUER`/`JWKS_URI`/`JWKS_AUDIENCE`. Azure **Storage** `AZURE_*` is unaffected throughout.
- **Losing session-recovery behavior** → deep links + `/users/me` failure depend on `clearCache`→`removeUser`. Mitigation: preserve the recovery path, snackbar, and ref-guard exactly (D4); validate explicitly in Phase 5.
- **SUPERADMIN auto-provision + self-signup** → acceptable only in isolated dev; a breach in any shared environment. Mitigation: revert to default `USER`/invite-only before real data.
- **Web is build-time** → forgetting a `VITE_OIDC_*` ARG/ENV in the Dockerfile/compose ships a stale build. Mitigation: enumerate all build/env touchpoints in tasks (incl. `docker-compose.prod.yml` and `.env.prod.dockercompose.example`, which also carry `VITE_AZURE_*`); mandatory rebuild.
- **Redirect URIs / Web Origins must match the real serving origin** → `pnpm dev` serves on `http://localhost:5173` (`.envrc:29`), while docker-compose maps the web to `http://localhost:3000` (`docker-compose.yml:115`, `${WEB_PORT:-3000}:8080`). The Keycloak realm must register `/auth/callback` and Web Origins for **both** origins actually used to validate, not just `:3000`.
- **Incomplete MSAL excision** → `routes/__root.tsx` wires `MsalProvider` + `initializeMsal` and `hooks/useInitializeUser.ts` imports `AccountInfo`; missing these leaves the build referencing removed packages. Mitigation: explicit removal tasks.
- **`AZURE_*` over-strip** → Azure **Storage** still depends on `AZURE_*` (`docker-compose.yml`, `environment.ts`); stripping all `AZURE_*` would break storage. The auth `AZURE_*` vars (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) are inert in the API runtime (no Azure validation path), so they are harmless to leave or remove.
- **On-prem/VPN slow links** → Node ≥20 happy-eyeballs aborts outbound connects (JWKS fetch, login). Mitigation: `setDefaultAutoSelectFamilyAttemptTimeout` already in the API bootstrap; the IdP must be reachable by both browser and api.

## Migration Plan

1. **Phase -1 (spike, throwaway)** — validate `oidc-client-ts` × Entra External ID × unchanged backend; decision gate. Not merged.
2. **Phase 0** — `oidcUserManager.ts` singleton + auth callback routes + recovery mapping + `requireRole` rewrite; produces the exact redirect-URI list.
3. **Phase 1** — Keycloak dev service + `infra/keycloak/dev/realm-huella.dev.json` import (depends on Phase 0's redirect URIs).
4. **Phase 2** — backend env templates + the (mandatory) scope-hardening commit (`scp ?? scope` + `scope?: string` type).
5. **Phase 3** — frontend MSAL→OIDC swap, including `__root.tsx`/`useInitializeUser.ts` excision and the Dockerfile / `docker-compose.yml` + `docker-compose.prod.yml` / vite-env / `.env*` build wiring (rebuild required).
6. **Phase 4** — build-time env-driven CSP in nginx (SWA out of scope).
7. **Phase 5** — attended app-browser + manual validation; `format`/`lint`/`type-check` green.

Greenfield migration — no data migration step. **Rollback**: revert the feature branch; MSAL config and Azure env are removed only on merge, so reverting restores the prior auth path. The user runs `pnpm install`, builds, and migrations; the agent runs `format`/`lint`/`type-check`/`test`.

## Open Questions

_None — all resolved below._

Resolved:

- **Save-draft continuation (D9)** — a full-page redirect, not a popup: the modal calls `signInRedirect(returnTo)` with the claim route as `returnTo`, and `/auth/callback` resolves it. There is no popup contract to fix.
- **Post-login destination (D3)** — navigates to the `returnTo` carried in the OIDC `state`, defaulting to `Routes.HOME`; deep-link restoration is implemented via `returnTo`.
- **Scope (D6)** — hardening, not skip: `scp ?? scope` + enforced `JWKS_REQUIRED_SCOPE`.
- **CSP mechanism (D7)** — build-time ARG baked into the nginx policy (no runtime `envsubst`).
- **SWA (D7)** — out of scope for this change; the on-prem nginx path only. SWA stays Azure-only and untouched, documented as a follow-up.

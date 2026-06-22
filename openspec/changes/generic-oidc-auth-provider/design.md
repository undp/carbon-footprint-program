## Context

The web app authenticates exclusively through MSAL (`@azure/msal-browser` + `@azure/msal-react`), hard-coupling the frontend to Azure. The backend, by contrast, already validates any OIDC issuer through its `jwks` provider (`JwksAuthProvider.ts`), and that path runs daily on local and on-prem RD against Entra External ID. Azure-specific validation (`ver:2.0`, `/v2.0` issuer) is gated behind `AZURE_TENANT_ID`; `idpUserId = oid ?? sub`; scope is read from `payload.scp`; email is required.

This means the **only unproven work** is replacing the MSAL client in the frontend with a generic OIDC client. The session is consumed in three places that matter for the design: React components (hooks), the `requireRole` route guard (`utils/requireRole.ts`, runs in TanStack Router `beforeLoad`, outside React), and the `ky` HTTP client (`api/http/auth.ts` + `client.ts`, also outside React). A drop-in for `react-oidc-context` hooks alone is therefore insufficient.

Constraints: greenfield users (no `idpUserId` re-mapping); `localStorage` token storage for parity; the web is **build-time** (Vite), so env changes require a rebuild; validation is attended via the `app-browser` skill (Playwright MCP) — there is no e2e suite in CI.

## Goals / Non-Goals

**Goals:**

- IdP selectable by environment variable (issuer); Azure CIAM becomes one configurable issuer among others.
- Full removal of MSAL from the frontend; no custom login UI (redirect-based login/logout).
- Behavioral parity with today: silent renew via refresh token, federated logout, session recovery on `/users/me` failure, deep-link to protected routes, and the save-draft popup flow.
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

`requireRole` and the `ky` client run outside React and cannot use hooks. A module-level `oidcUserManager.ts` singleton (`getUser`, `getAccessToken`, `signinRedirect/Callback`, `signinPopup/Callback`, `signinSilent`, `signoutRedirect`, `removeUser`) is the single source of truth; `react-oidc-context` is configured against the same `UserManager` instance so React and non-React consumers never diverge. Alternative: thread tokens through React context into the router/client — rejected, the guard executes before React renders.

### D3 — Public `/auth/callback` resolved before the protected guards

The redirect callback must complete `signinRedirectCallback` and establish the session **before** the `/app/*` and `/admin/*` guards evaluate, otherwise the guard redirects away mid-login. `/auth/callback` is therefore a public route (no `requireRole`), defined as a constant in `routes.const.ts`. Popup callback (for save-draft) and the silent-renew iframe callback are handled separately.

**Post-login destination = `Routes.HOME` (parity).** The current MSAL setup forces `redirectUri=/app/home` (`msalConfig.ts:18`) and explicitly disables returning to the originating page (`initializeMsal.ts:47`, `navigateToLoginRequestUrl:false`, with a comment that the landing has no auth redirect so returning would strand the user). `requireRole`'s so-called "deep-link path" is in fact the `/users/me`-failure recovery (redirect to `/`), **not** route restoration. This change preserves that behavior: after login the user lands on `Routes.HOME`. Returning to the originally requested route would be a _new_ feature (needs `state`/`returnTo` plumbing) and is explicitly out of scope.

### D4 — Session recovery maps `clearCache` → `userManager.removeUser()`

Today, `AuthContext.handleLoginFailure` and the `requireRole` catch call MSAL `clearCache` (local clear, no IdP round-trip) and surface the `authError=login_failed` snackbar with a ref-guard. The generic equivalent of a local clear is `userManager.removeUser()` (not `signoutRedirect`, which would round-trip the IdP and lose the snackbar). The recovery path, snackbar, and ref-guard are preserved verbatim.

### D5 — Keycloak hostname split (browser `iss` vs internal JWKS)

The token `iss` is consumed by the browser and must be browser-resolvable (`http://localhost:8081/realms/huella`); the API fetches JWKS from inside the docker network and must use the service name (`http://keycloak:8080/realms/huella/protocol/openid-connect/certs`). `KC_HOSTNAME_URL` fixes the issuer; host port `8081` maps to container `8080` to avoid colliding with the api on 8080. Mismatching these is the primary failure mode, so it is encoded in both the realm and the env templates.

### D6 — Audience mapper + scope hardening (DECIDED: harden, not skip)

Keycloak tokens won't carry `aud: huella-api` unless a realm audience mapper adds it; `JWKS_AUDIENCE=huella-api` then validates it. Scope (`scp`) is Azure-shaped; the standard OIDC claim is `scope`. **Decision (Codex):** take the hardening path, not the PoC skip. `JwksAuthProvider.ts` reads `payload.scp ?? payload.scope`, `OidcTokenPayload` gains `scope?: string` (`apps/api/src/auth/types.ts`), and `JWKS_REQUIRED_SCOPE=access_as_user` stays enforced — skipping scope (`JWKS_SKIP_SCOPE_CHECK=true`) is rejected because it degrades security on what is meant to be a genuinely generic adapter. The change is a minimal, isolated commit. Keycloak must therefore emit `access_as_user` in the access token (a default client scope on `huella-web` — see keycloak-dev-environment), so the required-scope check passes. This is now **mandatory**, not optional.

### D7 — Build-time CSP in nginx, SWA out of scope (DECIDED)

`apps/web/nginx.conf` defines **no** CSP today, and the runner stage has no runtime env (`VITE_*` are build-time only; the Dockerfile just `COPY`s the static `dist` + `nginx.conf`, no entrypoint — `Dockerfile:52-63`).

- **Mechanism (Codex P2 = A, build-time).** Bake the IdP domain into the nginx CSP at **build time** from a build ARG derived from `VITE_OIDC_ISSUER` (processed when the image is built). The `envsubst`-at-entrypoint alternative is rejected: the web bundle already requires a rebuild whenever the issuer changes (Vite is build-time), so a runtime CSP would add a _second_ configuration model without removing the rebuild. One model, build-time, consistent with the rest of `VITE_*`.
- **Azure SWA (Codex P3 = B, out of scope).** Option A targets on-prem RD/MMARN via docker-compose/nginx **without Azure**. Making `staticwebapp.config.json`'s CSP IdP-agnostic would open a second deploy target with its own generation/validation, outside this change's purpose. The SWA path is therefore **explicitly out of scope** for this change and remains **Azure-only**: `staticwebapp.config.json`, `infra/deploy-web.sh`, and `staticWebApp.bicep` are **not** modified here. This is documented, not hidden — a later change can make SWA IdP-agnostic if SWA must serve a generic-OIDC deployment.

No per-country hardcode. **Capability boundary note:** `idp-content-security-policy` and Option A validation are scoped to the on-prem nginx path; SWA is not a supported generic-OIDC target until a follow-up change.

### D8 — De-risking spike before Keycloak (Phase -1)

A throwaway branch (`spike/mati/oidc-entra`, not merged) validates `oidc-client-ts` against the **current Entra External ID** issuer with the **unchanged** backend, isolating the single unproven variable before investing in Keycloak. Gate: login + token accepted + refresh + federated logout all work → green-light the full plan; any CIAM quirk (e.g. the no-`kid` case the backend already handles) is documented and resolved in the client first.

### D9 — `signInPopup` must reject on failure (save-draft contract)

Today `AuthContext.signInPopup` swallows login errors (logs + snackbar, no re-throw — `AuthContext.tsx:114-128`), but `SaveDraftAuthModal.handleSignIn` wraps it in `try { await signInPopup() } catch { return }` expecting a throw to abort the claim (`SaveDraftAuthModal.tsx:39-43`). Because the throw never happens, the modal proceeds to `claimMutation` even after a failed login — a latent bug. The OIDC rewrite SHALL define an explicit contract: `signInPopup` rejects on failure so the save-draft flow aborts correctly, or the modal is restructured to check success before claiming. This must be settled during the rewrite, not left implicit.

### D10 — Backend claim requirements bound "generic" (not "any")

The `jwks` provider requires `sub`/`oid` and `email`/`preferred_username` (`JwksAuthProvider.ts:85-98`) and today reads scope only from `payload.scp` (`:73-80`); the standard `scope` claim is not even typed (`types.ts:21-54`). "Accepts any OIDC issuer" is therefore an overstatement: the issuer must emit those claims, and Keycloak must be configured to put a real **email in the access token** (not just hold one on the user). Specs are worded as "any OIDC issuer that emits the required claims," and the scope hardening (D6, now mandatory) is what makes the `scope`-vs-`scp` difference a non-issue.

## Risks / Trade-offs

- **Keycloak audience/scope misconfiguration** → without the audience mapper and without skip/`scope`, valid tokens are rejected. Mitigation: encode the mapper in the realm export and pin `JWKS_AUDIENCE`; document both scope paths.
- **Browser↔api issuer/hostname mismatch** → breaks validation silently. Mitigation: the hostname split (D5) is fixed in the realm (`KC_HOSTNAME_URL`) and the env templates, with inline comments.
- **Residual auth `AZURE_*` in shell/direnv** → `AZURE_TENANT_ID` re-activates v2.0 validation and rejects Keycloak; the shell env overrides `--env-file`. Mitigation: strip the **auth** vars (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) from `.envrc` (not just the env file) and warn in templates — leaving Storage `AZURE_*` intact. This is the #1 silent-failure source.
- **Losing session-recovery behavior** → deep links + `/users/me` failure depend on `clearCache`→`removeUser`. Mitigation: preserve the recovery path, snackbar, and ref-guard exactly (D4); validate explicitly in Phase 5.
- **SUPERADMIN auto-provision + self-signup** → acceptable only in isolated dev; a breach in any shared environment. Mitigation: revert to default `USER`/invite-only before real data.
- **Web is build-time** → forgetting a `VITE_OIDC_*` ARG/ENV in the Dockerfile/compose ships a stale build. Mitigation: enumerate all build/env touchpoints in tasks (incl. `docker-compose.prod.yml` and `.env.prod.dockercompose.example`, which also carry `VITE_AZURE_*`); mandatory rebuild.
- **Redirect URIs / Web Origins must match the real serving origin** → `pnpm dev` serves on `http://localhost:5173` (`.envrc:29`), while docker-compose maps the web to `http://localhost:3000` (`docker-compose.yml:115`, `${WEB_PORT:-3000}:8080`). The Keycloak realm must register `/auth/callback` (+ popup/silent) and Web Origins for **both** origins actually used to validate, not just `:3000`.
- **Incomplete MSAL excision** → `routes/__root.tsx` wires `MsalProvider` + `initializeMsal` and `hooks/useInitializeUser.ts` imports `AccountInfo`; missing these leaves the build referencing removed packages. Mitigation: explicit removal tasks.
- **`AZURE_*` over-strip** → only the **auth** vars (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) must be absent; Azure **Storage** still depends on `AZURE_*` (`docker-compose.yml`, `environment.ts`). Stripping all `AZURE_*` would break storage.
- **On-prem/VPN slow links** → Node ≥20 happy-eyeballs aborts outbound connects (JWKS fetch, login). Mitigation: `setDefaultAutoSelectFamilyAttemptTimeout` already in the API bootstrap; the IdP must be reachable by both browser and api.

## Migration Plan

1. **Phase -1 (spike, throwaway)** — validate `oidc-client-ts` × Entra External ID × unchanged backend; decision gate. Not merged.
2. **Phase 0** — `oidcUserManager.ts` singleton + auth callback routes + recovery mapping + `requireRole` rewrite; produces the exact redirect-URI list.
3. **Phase 1** — Keycloak dev service + `realm-huella.json` import (depends on Phase 0's redirect URIs).
4. **Phase 2** — backend env templates + the (mandatory) scope-hardening commit (`scp ?? scope` + `scope?: string` type).
5. **Phase 3** — frontend MSAL→OIDC swap, including `__root.tsx`/`useInitializeUser.ts` excision and the Dockerfile / `docker-compose.yml` + `docker-compose.prod.yml` / vite-env / `.env*` build wiring (rebuild required).
6. **Phase 4** — build-time env-driven CSP in nginx (SWA out of scope).
7. **Phase 5** — attended app-browser + manual validation; `format`/`lint`/`type-check` green.

Greenfield migration — no data migration step. **Rollback**: revert the feature branch; MSAL config and Azure env are removed only on merge, so reverting restores the prior auth path. The user runs `pnpm install`, builds, and migrations; the agent runs `format`/`lint`/`type-check`/`test`.

## Open Questions

- **Save-draft continuation**: keep the popup + popup-callback, or persist the draft across a full redirect? Either way the `signInPopup` reject-on-failure contract (D9) must be fixed. (Mechanism detail, settled during the Phase 3 rewrite.)

Resolved:

- Post-login destination is `Routes.HOME` (parity, not deep-link restoration).
- **Scope (D6)** — hardening, not skip: `scp ?? scope` + enforced `JWKS_REQUIRED_SCOPE`, now mandatory.
- **CSP mechanism (D7)** — build-time ARG baked into the nginx policy (no runtime `envsubst`).
- **SWA (D7)** — out of scope for this change; the on-prem nginx path only. SWA stays Azure-only and untouched, documented as a follow-up.

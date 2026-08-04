## 1. Spike — de-risk `oidc-client-ts` × Entra External ID (Phase -1, throwaway)

- [x] 1.1 Minimal `oidc-client-ts` client built (git-excluded `spike-oidc/`, never committed = "not merged"); authority = live `VITE_AZURE_AUTH_AUTHORITY`, Auth Code + PKCE S256. Login works; redirect URI `:5173/app/home` already registered.
- [x] 1.2 Logged in + acquired access token. Live `GET /users/me` **deferred to Phase 5** (no API on `:8080` w/ `:5173` CORS during the spike); token decode proves backend-validity: `aud` = API client id, `scp = access_as_user`, real `email` — same shape MSAL produces daily.
- [x] 1.3 Parity verified: silent renew via **refresh-token grant** (no iframe; `exp` advanced), federated logout via `end_session` → `post_logout_redirect_uri`, token shape accepted-by-contract.
- [x] 1.4 Decision gate **GREEN** → green-light F0→F5. Quirk documented: `iss` uses tenant-GUID host (not the friendly subdomain); backend `JWKS_ISSUER` must match (already does). See `spike-oidc/evidence/RESULTS.md`.
- [x] 1.5 Evidence captured: `spike-oidc/evidence/{01-login-token,02-renew-and-me,03-after-logout}.png` + `RESULTS.md`.

## 2. Phase 0 — Dependencies + session contract + auth routes (`feat(web): oidc UserManager singleton + auth callback routes`)

- [x] 2.1 Dep swap: `package.json` drops `@azure/msal-browser`/`@azure/msal-react`, adds `oidc-client-ts ^3.1.0` (got 3.5.0) + `react-oidc-context ^3.3.0` (got 3.3.1); user ran `pnpm install` (twice — the first was before the package.json edit). MSAL gone from node_modules.
- [x] 2.2 Added `auth/oidcUserManager.ts` — singleton `UserManager` from `oidcConfig` (`localStorage` store, `automaticSilentRenew: true`); exposes the full UserManager API used by the guard + HTTP client.
- [x] 2.3 Added `AUTH_CALLBACK` to `routes.const.ts` and `routes/auth.callback.tsx` — public route; react-oidc-context completes the code/PKCE exchange (shared UserManager), then navigates to the `returnTo` carried in `user.state` (`OidcSignInState`), defaulting to `Routes.HOME`.
- [x] 2.4 Single full-page redirect login (no popup): `/auth/callback` is the only callback route; `automaticSilentRenew` uses the refresh token (no iframe needed, per the spike).
- [x] 2.5 `/auth/callback` is a top-level route (not under the `/app`·`/admin` layouts), so no `requireRole` guard runs before the session is established.
- [x] 2.6 Recovery mapped to `userManager.removeUser()` in both `AuthContext.handleLoginFailure` and the `requireRole` catch; `authError=login_failed` snackbar + single-shot ref-guard preserved.
- [x] 2.7 Rewrote `utils/requireRole.ts` to `await oidcUserManager.getUser()` (+ silent-renew on expiry before redirecting); kept `ensureQueryData('users/me')`.
- [x] 2.8 Realm registers redirect URIs + Web Origins for **both** `:5173` and `:3000` (Phase 1); the client also defaults redirect/post-logout to `window.location.origin`, so it adapts to whichever host serves it.

## 3. Phase 1 — Keycloak dev infra (`infra: keycloak dev service + realm-huella import`)

- [x] 3.1 Added split overlays `compose/keycloak-db.yaml` (shared `keycloak-db` Postgres) + `compose/keycloak.dev.yaml` (`keycloak` via `start-dev --import-realm`, `KC_HTTP_ENABLED=true`) on `huella-network`; healthcheck via bash `/dev/tcp` to `127.0.0.1:9000/health/ready`; documented `COMPOSE_FILE=docker-compose.yml:compose/keycloak-db.yaml:compose/keycloak.dev.yaml` wiring. Verified `docker compose config` merges the expected services.
- [x] 3.2 Set `KC_HOSTNAME=http://localhost:18080` (KC 26 name; issuer → `http://localhost:18080/realms/huella`); host `18080` → container `8080` (avoids api 8080). Backend reaches JWKS internally at `keycloak:8080` via explicit `JWKS_URI` (no discovery), so the split holds.
- [x] 3.3 Added `infra/keycloak/dev/realm-huella.dev.json` (`--import-realm`): public `huella-web`, Auth Code + PKCE S256 (`pkce.code.challenge.method=S256`), redirect URIs + Web Origins for **both** `:5173` and `:3000` (incl. `/auth/callback` + wildcard), post-logout redirect. Valid JSON confirmed.
- [x] 3.4 Audience mapper (`oidc-audience-mapper`, `access.token.claim=true`) adds `huella-api` to `aud`; default scopes incl. `profile email`; `access_as_user` client scope (`include.in.token.scope=true`) assigned as a **default** so the access token's `scope` carries it; email is in the access token (lightweight tokens not enabled). Validate live in Phase 5.
- [x] 3.5 Realm `registrationAllowed=true`, `registrationEmailAsUsername=true` (username=email), `verifyEmail=false` (dev, no SMTP); `accessTokenLifespan=300` for observable silent renew.
- [ ] 3.6 User: `docker compose -f docker-compose.yml -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml up` and confirm Keycloak healthy with the `huella` realm + consistent issuer.

## 4. Phase 2 — Backend env config + scope hardening (`feat(api): generic jwks scope handling + keycloak env`)

- [x] 4.1 Added a documented **Keycloak (generic OIDC) example block** to the real template files — repo-root `.env.dockercompose.example` and `.envrc.template` (NOT `apps/api/.envrc.template`, which is just `source_up`). Shows `AUTH_PROVIDER=jwks`, `JWKS_ISSUER`, `JWKS_URI` (split host), `JWKS_AUDIENCE=huella-api`, `JWKS_REQUIRED_SCOPE=access_as_user`; non-destructive (kept `AUTH_PROVIDER=none` default); notes auth `AZURE_*` must stay empty.
- [~] 4.2 **Deferred to owner (not done):** stripping auth `AZURE_*` from the **live `.envrc`** would break the daily Entra login. Documented in the templates instead; the live `.envrc` is the user's to edit when switching to Keycloak.
- [x] 4.3 Scope hardening (isolated): added `scope?: string` to `OidcTokenPayload` (`auth/types.ts`); `JwksAuthProvider.ts` reads `payload.scp ?? payload.scope`. `RESOLVED_JWKS_REQUIRED_SCOPE` already defaults to `access_as_user`, so Keycloak tokens carrying it in `scope` now pass; `scp` (Azure) path unchanged.
- [~] 4.4 **Deferred to Phase 5:** runtime verification with a real Keycloak token needs the stack up (Phase 1 + user `docker compose up`). Static type/lint check below; behavioral check happens in validation.

## 5. Phase 3 — Frontend MSAL → OIDC swap (`feat(web): replace msal with oidc-client-ts`)

- [x] 5.1 Replaced `config/msalConfig.ts` with `config/oidcConfig.ts` (`oidcSettings: UserManagerSettings` from env: authority/client_id/scope/redirect_uri/post_logout_redirect_uri, localStorage store, automaticSilentRenew).
- [x] 5.2 Deleted `auth/initializeMsal.ts` (replaced by `auth/oidcUserManager.ts`).
- [x] 5.3 Rewrote `contexts/AuthContext.tsx` on `react-oidc-context` (aliased) + the singleton; the `useAuth()` contract is `isAuthenticated`/`isLoading`/`user`/`refetchUser`/`signInRedirect(returnTo?)`/`signOut` (no popup method); `signInRedirect` threads `returnTo` through the OIDC `state` (`OidcSignInState`); `handleLoginFailure`→`removeUser`. Dropped the unused `account` field (no external consumer).
- [x] 5.4 `routes/__root.tsx`: `MsalProvider`+`initializeMsal` → `<OidcAuthProvider userManager={oidcUserManager} onSigninCallback>` (strips code/state); removed the init `useEffect`.
- [x] 5.5 `hooks/useInitializeUser.ts`: dropped `AccountInfo`/`account`; gated on `isAuthenticated`.
- [x] 5.6 `api/http/auth.ts`: token from `oidcUserManager.getUser()` (+ silent-renew on expiry).
- [x] 5.7 `api/http/client.ts`: unchanged — already abstracted through `getAuthToken()`; the new token source flows in transparently.
- [x] 5.8 `SaveDraftAuthModal.tsx`: rewritten to call `signInRedirect(returnTo)` — it builds the claim route (`Routes.CARBON_INVENTORY_CLAIM`) via the router and passes it as `returnTo`, so after login `/auth/callback` lands on the claim route, which reclaims the draft. Full-page redirect, no popup; closing/cancelling the IdP page can never strand the modal.
- [x] 5.9 Build/env wiring (all surfaces): `VITE_OIDC_*` in `vite-env.d.ts` + `config/environment.ts`; ARG/ENV in `apps/web/Dockerfile` (builder, Vite inline; runner, CSP); build args in `docker-compose.yml` + `docker-compose.prod.yml` (ISSUER/CLIENT*ID/REDIRECT_URI required in prod); `VITE_OIDC*_`block in`.envrc.template`/`.env.dockercompose.example`/`.env.prod.dockercompose.example`. Removed all `VITE*AZURE*_`/`VITE_FRONT_BASE_URL` frontend build args.
- [x] 5.10 Scopes are fully env-driven — `VITE_OIDC_SCOPES` → `OIDC_SCOPES` (`config/environment.ts`) → `oidcConfig.ts`; the baseline `"openid profile email"` literal lives only in the env templates, not as a code constant (`offline_access` is an optional realm scope and is not requested by the SPA). Client id (`huella-web`) is likewise env-driven (`VITE_OIDC_CLIENT_ID`), no magic string in code.
- [ ] 5.11 User: rebuild the web image (Vite is build-time) — needed before Phase 5 browser validation.
- [x] **Verified:** `pnpm --filter=web type-check` ✅, `lint` (eslint) ✅, Prettier ✅ on all changed files; TanStack route tree regenerated (`/auth/callback` present); base compose parses with `VITE_OIDC_*`.

## 6. Phase 4 — Build-time env-driven CSP in nginx (`feat(web): build-time IdP CSP in nginx`)

- [x] 6.1 Added a CSP to `apps/web/nginx.conf` (`connect-src`/`form-action`/`frame-src` permit the IdP domain) with `__IDP_ORIGIN__`/`__API_ORIGIN__` placeholders baked at **build time** in the Dockerfile runner stage (`ARG VITE_OIDC_ISSUER`/`VITE_API_BASE_URL` → busybox-`sed`, as root then back to USER 101). Added `VITE_OIDC_ISSUER` build arg to `docker-compose.yml` + `docker-compose.prod.yml`. No runtime entrypoint. Verified: origin extraction + CSP bake simulated, connect-src also keeps `https:` for storage/CDN (MinIO-over-http origin must be added — flagged in the conf comment).
- [x] 6.2 IdP domain derived from `VITE_OIDC_ISSUER` (no per-country hardcode). SWA path **untouched** — `staticwebapp.config.json`, `infra/deploy-web.sh`, `staticWebApp.bicep` unchanged (verified absent from the diff).
- [x] 6.3 SWA out-of-scope decision documented in proposal/design/csp-spec (Azure-only; IdP-agnostic SWA CSP is a follow-up).

## 7. Phase 5 — Validation (app-browser + manual) (`chore: app-browser validation notes / screenshots`)

- [x] 7.1 Brought up the full stack + Keycloak myself on ports 3000/8080/18080 via the overlays + a dedicated env file (`/home/mrivas/Documents/Proyectos/Huella/.env.dockercompose.keycloak`) with the leaking direnv vars stripped (`env -u`). `migrate` failed only on the Azure-storage seed (badges/terms) — unrelated to auth; started `api`+`web` directly (DB migrations had applied).
- [x] 7.2 Validated via Playwright (fully autonomous — Keycloak self-signup is password-based, `verifyEmail=false`, no OTP): registered `tester@huella.local` → landed authenticated on `/app/home` → user becomes SUPERADMIN (admin menu present).
- [~] 7.3 Verified: public `/auth/callback` resolved before the guard; post-login lands on the `returnTo` from `user.state`, else `Routes.HOME` (no `returnTo` in this pass → HOME); **backend accepted the Keycloak token** (`/users/me` 200) with `aud=huella-api`, `scope` containing `access_as_user` (read via the `scp ?? scope` hardening — the exact Keycloak dialect), `email` + `sub` present; federated logout → `end_session` → landing, local session cleared. **Not exercised this pass:** `/users/me`-failure recovery, silent renew (spike already proved refresh-token renew; needs a 5-min expiry wait), save-draft redirect flow.
- [~] 7.4 Captured screenshots (`spike-oidc/evidence/kc-01-authenticated-home.png`, `kc-02-after-logout.png`); SUPERADMIN confirmed via the admin menu. Full per-screen admin tour not done.
- [x] 7.5 `pnpm --filter=web type-check`/`lint` + `pnpm --filter=api type-check`/`lint` + Prettier all green (run during implementation; code unchanged since).
- [x] **Realm fix found during validation:** the partial realm import suppressed Keycloak's built-in `profile`/`email` scopes (→ `invalid_scope`). Fixed `infra/keycloak/dev/realm-huella.dev.json` to define `basic`/`email`/`profile` (+ `access_as_user`) explicitly; re-import verified `scopes_supported` complete and the token correct.

## 8. Pre-merge guards

- [x] 8.1 Confirmed no MSAL/auth-Azure references remain in the web app (0 MSAL refs in source, no `@azure/msal-*` dep, `__root.tsx`/`useInitializeUser.ts` cleaned); Azure **Storage** `AZURE_*` is intentionally retained
- [ ] 8.2 Note the SUPERADMIN auto-provision + self-signup must be reverted to default `USER`/invite-only before any shared/real-data environment
- [ ] 8.3 Open PR `[Fullstack] Feat: provider de autenticación OIDC genérico (reemplazo de MSAL)` on `feat/mati/oidc-generico` with modular Conventional Commits (no Co-Authored-By)

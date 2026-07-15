# generic-oidc-authentication Specification

## Purpose

This capability lets the web application obtain and renew tokens from any OIDC issuer chosen by environment variable, so the identity provider is swappable per deployment instead of being hard-coupled to a single vendor. A singleton `UserManager` is the source of truth for the session outside React and is shared by the `requireRole` route guard and the `ky` HTTP client. It covers Authorization Code + PKCE redirect login, federated logout, automatic silent renew via refresh token, a public `/auth/callback` route resolved before the `/app` and `/admin` guards, `returnTo`-based post-login navigation carried in the OIDC `state`, session-recovery mapping, and the redirect-based save-draft flow.

## Requirements

### Requirement: Env-driven OIDC issuer selection

The frontend SHALL obtain its OIDC configuration (authority/issuer, client id, scopes, redirect URI, post-logout redirect URI) from `VITE_OIDC_*` environment variables resolved at build time, with no Azure/MSAL-specific code. Changing the identity provider SHALL require only changing environment variables and rebuilding the web app.

#### Scenario: IdP selected by environment

- **WHEN** the web app is built with `VITE_OIDC_ISSUER` pointing at an OIDC issuer that emits the claims the backend requires (subject + email)
- **THEN** login, token acquisition, and logout operate against that issuer with no code change

#### Scenario: No MSAL or auth-Azure code remains

- **WHEN** the dependency graph and source of the web app are inspected (including `routes/__root.tsx` and `hooks/useInitializeUser.ts`)
- **THEN** `@azure/msal-browser` and `@azure/msal-react` are absent and no MSAL/Azure-**auth** code (e.g. `MsalProvider`, `AccountInfo`, `initializeMsal`) remains — Azure **Storage** configuration is out of scope and may keep its `AZURE_*` usage

### Requirement: Single source of truth for the session outside React

The system SHALL expose a singleton `UserManager` (`oidcUserManager.ts`) usable outside React, and `react-oidc-context` SHALL be configured against that same instance. The route guard (`requireRole`) and the HTTP client SHALL read the session and access token from this singleton, never from React-only state.

#### Scenario: Guard reads the singleton

- **WHEN** the `requireRole` route guard runs in `beforeLoad` (outside React)
- **THEN** it resolves the current user via `userManager.getUser()` and proceeds without requiring a React render

#### Scenario: HTTP client attaches the access token

- **WHEN** the `ky` client issues an authenticated request
- **THEN** it attaches the access token obtained from the singleton `UserManager`

### Requirement: Auth Code + PKCE redirect login and federated logout

The system SHALL authenticate via the Authorization Code flow with PKCE and SHALL not present a custom login UI. Logout SHALL be federated via the issuer's `end_session_endpoint`. Tokens SHALL be persisted in `localStorage`.

#### Scenario: Redirect login

- **WHEN** an unauthenticated user initiates sign-in
- **THEN** the browser is redirected to the configured issuer and returns authenticated, with no in-app credential form

#### Scenario: Federated logout

- **WHEN** an authenticated user signs out
- **THEN** the session is cleared and the user is redirected through the issuer's end-session endpoint to the post-logout redirect URI

### Requirement: Public callback resolved before protected guards

The system SHALL expose a single public `/auth/callback` route (defined as a constant in `routes.const.ts`) that completes the redirect login and establishes the session before the `/app/*` and `/admin/*` guards evaluate. Login is always a full-page redirect, so there SHALL be no separate popup callback; automatic silent renew uses the refresh token, so there SHALL be no silent-renew iframe callback route. After a successful login the user SHALL be navigated to the `returnTo` path carried in the OIDC `state` (`user.state.returnTo`), defaulting to `Routes.HOME` when no `returnTo` was set.

#### Scenario: Callback completes before guard

- **WHEN** the issuer redirects back to `/auth/callback`
- **THEN** the session is established and the user is navigated to `user.state.returnTo` (or `Routes.HOME` when absent) without the protected-route guard redirecting away mid-login

#### Scenario: Deep link to a protected route is restored after login

- **WHEN** an unauthenticated user opens a deep link to a protected route and login is initiated with that route as `returnTo` in the OIDC `state`
- **THEN** after the callback resolves they land on the originally requested route carried in `user.state.returnTo`, not unconditionally on `Routes.HOME`

### Requirement: Automatic silent renew

The system SHALL automatically renew the session using a refresh token (`offline_access` scope) with `automaticSilentRenew` enabled, without user interaction. Renewal SHALL be observable for validation by configuring a short access-token TTL in the IdP/realm so expiry occurs during an attended session.

#### Scenario: Token renewed silently

- **WHEN** the access token nears expiry (with a short TTL configured) while the user is active
- **THEN** the session is renewed silently via the refresh token and authenticated requests continue to succeed without a new login

### Requirement: Session recovery maps to local removal

On an authentication recovery path (`AuthContext.handleLoginFailure` and the `requireRole` catch), the system SHALL clear the local session via `userManager.removeUser()` (no IdP round-trip), preserve the `authError=login_failed` snackbar, and keep the single-shot ref-guard that prevents repeated handling.

#### Scenario: /users/me failure triggers recovery

- **WHEN** the authenticated `/users/me` request fails on a recovery path
- **THEN** the local session is removed via `removeUser()`, the `login_failed` snackbar is shown once, and the user is returned to the landing page without an IdP redirect

### Requirement: Save-draft redirect login flow with returnTo

The save-draft flow (`SaveDraftAuthModal`) SHALL authenticate via the same full-page redirect (`signInRedirect`) used everywhere else, carrying the claim route (`Routes.CARBON_INVENTORY_CLAIM`, built via the router) as `returnTo` in the OIDC `state`. The draft claim SHALL be performed by the destination claim route after login, not held in the modal or in the auth layer. Because the page is unloaded on redirect, there SHALL be no in-memory promise that can hang on cancel/close, and there SHALL be no save-draft-specific popup failure contract.

#### Scenario: Save draft after successful redirect login

- **WHEN** an unauthenticated user triggers save-draft and completes the full-page redirect login
- **THEN** `/auth/callback` navigates to the claim route carried in `returnTo`, which reclaims the pending draft and lands on the inventory list

#### Scenario: Cancelling the IdP page does not strand the modal

- **WHEN** the user cancels or closes the IdP page instead of completing login
- **THEN** no draft claim runs (the claim only happens on the destination route after a successful login) and there is no pending in-memory promise left behind, because the originating page was unloaded by the redirect

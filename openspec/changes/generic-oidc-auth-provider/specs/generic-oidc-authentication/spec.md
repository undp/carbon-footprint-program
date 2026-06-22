## ADDED Requirements

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

The system SHALL expose a public `/auth/callback` route (defined as a constant in `routes.const.ts`) that processes `signinRedirectCallback` and establishes the session before the `/app/*` and `/admin/*` guards evaluate. Popup and silent-renew callbacks SHALL be handled separately. After a successful redirect login the user SHALL land on `Routes.HOME` — parity with the current MSAL behavior, which forces `/app/home` and explicitly disables returning to the originating page. Returning to the originally requested deep-link route is out of scope for this change.

#### Scenario: Callback completes before guard

- **WHEN** the issuer redirects back to `/auth/callback`
- **THEN** the session is established and the user is navigated to `Routes.HOME` without the protected-route guard redirecting away mid-login

#### Scenario: Deep link to a protected route lands on home (parity)

- **WHEN** an unauthenticated user opens a deep link to a protected route and completes login
- **THEN** they land on `Routes.HOME` after the callback resolves (not the originally requested route), matching today's MSAL behavior

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

### Requirement: Save-draft popup login flow with explicit failure contract

The save-draft flow (`SaveDraftAuthModal`) SHALL authenticate via `signinPopup` with its own popup callback and SHALL continue the pending draft mutation only after login succeeds. The popup login function SHALL reject (or otherwise signal failure) when login fails, so the modal aborts the claim instead of proceeding unauthenticated. (Today `AuthContext.signInPopup` swallows the error and does not re-throw, while the modal's `catch` relies on a throw to abort — this contract MUST be fixed in the rewrite.)

#### Scenario: Save draft after successful popup login

- **WHEN** an unauthenticated user triggers save-draft and completes login in the popup
- **THEN** the popup callback resolves the session and the pending draft mutation continues to completion

#### Scenario: Failed popup login aborts the claim

- **WHEN** the popup login fails or is cancelled
- **THEN** the popup login function signals failure, the modal aborts, and no draft-claim mutation is sent

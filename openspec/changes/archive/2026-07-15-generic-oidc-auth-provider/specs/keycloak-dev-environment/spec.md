## ADDED Requirements

### Requirement: Keycloak dev service in docker-compose

The development stack SHALL include a Keycloak service (`start-dev`, `KC_HTTP_ENABLED=true`) and its Postgres database, provided as compose overlays (`compose/keycloak-db.yaml` for the shared database + `compose/keycloak.dev.yaml` for the dev IdP) selected via `COMPOSE_FILE` or `-f`. The service healthcheck SHALL target `127.0.0.1` (not a hostname that resolves to IPv6) and SHALL assert the `/health/ready` HTTP 200 status line (not an `UP` body substring).

#### Scenario: Compose brings up Keycloak

- **WHEN** the dev stack is started with the Keycloak overlays enabled
- **THEN** Keycloak and its database start and report healthy via the `127.0.0.1` healthcheck

### Requirement: Consistent issuer via hostname split

Keycloak SHALL be configured with `KC_HOSTNAME` (the Keycloak 26 hostname variable, set in the compose env) defaulting to `http://localhost:18080` so the token `iss` is derived as `http://localhost:18080/realms/huella` and is browser-resolvable, while host port `18080` maps to container port `8080` to avoid colliding with the API on `8080` (the repo's 1-prefix convention for a secondary service). The JWKS endpoint SHALL be reachable from the API container via the `keycloak` service name.

#### Scenario: Issuer reachable by browser, JWKS by API

- **WHEN** a token is issued by Keycloak
- **THEN** its `iss` (`http://localhost:18080/realms/huella`) is resolvable from the browser and the API can fetch JWKS at `http://keycloak:8080/realms/huella/protocol/openid-connect/certs`

### Requirement: Reproducible realm import

The repository SHALL contain a reproducible dev realm export (`infra/keycloak/dev/realm-huella.dev.json`, mounted as the dev-only import directory) imported via `--import-realm`. The realm SHALL define a public `huella-web` client (Auth Code with PKCE S256 required), redirect URIs covering `/auth/callback`, Web Origins, and a post-logout redirect URI. The redirect URIs and Web Origins SHALL cover **every** origin the web app is actually served from in development — both `http://localhost:5173` (Vite `pnpm dev`) and `http://localhost:3000` (docker-compose mapped port) — not just one.

#### Scenario: Realm imported on startup

- **WHEN** Keycloak starts with `--import-realm`
- **THEN** the `huella` realm and `huella-web` public client exist with PKCE S256 required and the configured redirect URIs and web origins

#### Scenario: Both dev origins are valid

- **WHEN** login is attempted from either `http://localhost:5173` or `http://localhost:3000`
- **THEN** the callback redirect URI and Web Origin are accepted by Keycloak in both cases

### Requirement: Audience mapper, default scopes, and optional refresh scope

The realm SHALL include an audience mapper that adds `huella-api` to the token `aud`. The `huella-web` client SHALL have default client scopes `basic`, `profile`, `email`, and `access_as_user` (`openid` is implicit, not a `defaultClientScopes` entry), and SHALL list `offline_access` as an **optional** client scope. Because the backend enforces `JWKS_REQUIRED_SCOPE=access_as_user` against `scp ?? scope`, `access_as_user` is a **default** client scope so every access token carries it (in the standard `scope` claim) without the SPA having to request it. The SPA SHALL NOT request `offline_access` against Keycloak (`VITE_OIDC_SCOPES` baseline is `openid profile email`): silent renew relies on the normal SSO-session-bound refresh token, so no long-lived offline token is issued to the browser. `offline_access` remains available as an optional realm scope for clients that explicitly need it.

#### Scenario: Token carries API audience and required scope without the refresh scope

- **WHEN** `huella-web` obtains a token with the baseline `VITE_OIDC_SCOPES` (`openid profile email`)
- **THEN** the token's `aud` includes `huella-api`, the granted scopes (in `scope`) include `access_as_user` (a default client scope), no offline token is issued, and silent renew works via the SSO-session-bound refresh token

### Requirement: Self-registration with email emitted in the access token

The realm SHALL enable self-registration and SHALL require an email (verified, or `username = email`), and the `huella-web` client/scope configuration SHALL ensure the `email` claim is present in the **access token** (not only on the user record or the ID token), because the backend reads `email`/`preferred_username` from the validated access token and rejects requests without it.

#### Scenario: Access token carries a valid email claim

- **WHEN** a self-registered user obtains an access token
- **THEN** the access token contains an `email` (or `preferred_username`) claim that satisfies the backend's email validation

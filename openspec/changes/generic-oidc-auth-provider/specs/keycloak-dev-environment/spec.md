## ADDED Requirements

### Requirement: Keycloak dev service in docker-compose

The development stack SHALL include a Keycloak service (`start-dev`, `KC_HTTP_ENABLED=true`) and its Postgres database, provided as a compose overlay (`compose/keycloak.yaml`) selected via `COMPOSE_FILE`. The service healthcheck SHALL target `127.0.0.1` (not a hostname that resolves to IPv6).

#### Scenario: Compose brings up Keycloak

- **WHEN** the dev stack is started with the Keycloak overlay enabled
- **THEN** Keycloak and its database start and report healthy via the `127.0.0.1` healthcheck

### Requirement: Consistent issuer via hostname split

Keycloak SHALL be configured with `KC_HOSTNAME=http://localhost:8081` (the Keycloak 26 hostname variable, set in the compose env) so the token `iss` is derived as `http://localhost:8081/realms/huella` and is browser-resolvable, while host port `8081` maps to container port `8080` to avoid colliding with the API on `8080`. The JWKS endpoint SHALL be reachable from the API container via the `keycloak` service name.

#### Scenario: Issuer reachable by browser, JWKS by API

- **WHEN** a token is issued by Keycloak
- **THEN** its `iss` (`http://localhost:8081/realms/huella`) is resolvable from the browser and the API can fetch JWKS at `http://keycloak:8080/realms/huella/protocol/openid-connect/certs`

### Requirement: Reproducible realm import

The repository SHALL contain a reproducible realm export (`infra/keycloak/realm-huella.json`) imported via `--import-realm`. The realm SHALL define a public `huella-web` client (Auth Code with PKCE S256 required), redirect URIs covering `/auth/callback`, Web Origins, and a post-logout redirect URI. The redirect URIs and Web Origins SHALL cover **every** origin the web app is actually served from in development — both `http://localhost:5173` (Vite `pnpm dev`) and `http://localhost:3000` (docker-compose mapped port) — not just one.

#### Scenario: Realm imported on startup

- **WHEN** Keycloak starts with `--import-realm`
- **THEN** the `huella` realm and `huella-web` public client exist with PKCE S256 required and the configured redirect URIs and web origins

#### Scenario: Both dev origins are valid

- **WHEN** login is attempted from either `http://localhost:5173` or `http://localhost:3000`
- **THEN** the callback redirect URI and Web Origin are accepted by Keycloak in both cases

### Requirement: Audience mapper, default scopes, and optional refresh scope

The realm SHALL include an audience mapper that adds `huella-api` to the token `aud`. The `huella-web` client SHALL have default client scopes `basic`, `profile`, `email`, and `access_as_user` (`openid` is implicit, not a `defaultClientScopes` entry), and SHALL list `offline_access` as an **optional** client scope. Because the backend enforces `JWKS_REQUIRED_SCOPE=access_as_user` against `scp ?? scope`, `access_as_user` is a **default** client scope so every access token carries it (in the standard `scope` claim) without the SPA having to request it. `offline_access` (needed for refresh-token-based silent renew) is requested explicitly by the SPA via `VITE_OIDC_SCOPES`, since it is an optional — not default — realm scope.

#### Scenario: Token carries API audience, required scope, and (when requested) the refresh scope

- **WHEN** `huella-web` obtains a token while requesting `offline_access` via `VITE_OIDC_SCOPES`
- **THEN** the token's `aud` includes `huella-api`, the granted scopes (in `scope`) include `access_as_user` (a default client scope), and `offline_access` is granted because the SPA requested it (it is an optional client scope)

### Requirement: Self-registration with email emitted in the access token

The realm SHALL enable self-registration and SHALL require an email (verified, or `username = email`), and the `huella-web` client/scope configuration SHALL ensure the `email` claim is present in the **access token** (not only on the user record or the ID token), because the backend reads `email`/`preferred_username` from the validated access token and rejects requests without it.

#### Scenario: Access token carries a valid email claim

- **WHEN** a self-registered user obtains an access token
- **THEN** the access token contains an `email` (or `preferred_username`) claim that satisfies the backend's email validation

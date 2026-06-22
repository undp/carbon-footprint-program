## ADDED Requirements

### Requirement: Keycloak dev service in docker-compose

The development stack SHALL include a Keycloak service (`start-dev`, `KC_HTTP_ENABLED=true`) and its Postgres database, provided as a compose overlay (`compose/keycloak.yaml`) selected via `COMPOSE_FILE`. The service healthcheck SHALL target `127.0.0.1` (not a hostname that resolves to IPv6).

#### Scenario: Compose brings up Keycloak

- **WHEN** the dev stack is started with the Keycloak overlay enabled
- **THEN** Keycloak and its database start and report healthy via the `127.0.0.1` healthcheck

### Requirement: Consistent issuer via hostname split

Keycloak SHALL be configured with `KC_HOSTNAME_URL=http://localhost:8081/realms/...` so the token `iss` is browser-resolvable, while host port `8081` maps to container port `8080` to avoid colliding with the API on `8080`. The JWKS endpoint SHALL be reachable from the API container via the `keycloak` service name.

#### Scenario: Issuer reachable by browser, JWKS by API

- **WHEN** a token is issued by Keycloak
- **THEN** its `iss` (`http://localhost:8081/realms/huella`) is resolvable from the browser and the API can fetch JWKS at `http://keycloak:8080/realms/huella/protocol/openid-connect/certs`

### Requirement: Reproducible realm import

The repository SHALL contain a reproducible realm export (`infra/keycloak/realm-huella.json`) imported via `--import-realm`. The realm SHALL define a public `huella-web` client (Auth Code with PKCE S256 required), redirect URIs covering `/auth/callback` (plus popup/silent-renew as applicable), Web Origins, and a post-logout redirect URI. The redirect URIs and Web Origins SHALL cover **every** origin the web app is actually served from in development — both `http://localhost:5173` (Vite `pnpm dev`) and `http://localhost:3000` (docker-compose mapped port) — not just one.

#### Scenario: Realm imported on startup

- **WHEN** Keycloak starts with `--import-realm`
- **THEN** the `huella` realm and `huella-web` public client exist with PKCE S256 required and the configured redirect URIs and web origins

#### Scenario: Both dev origins are valid

- **WHEN** login is attempted from either `http://localhost:5173` or `http://localhost:3000`
- **THEN** the callback redirect URI and Web Origin are accepted by Keycloak in both cases

### Requirement: Audience mapper and default scopes

The realm SHALL include an audience mapper that adds `huella-api` to the token `aud`, and the `huella-web` client SHALL have default scopes `openid`, `profile`, `email`, and `offline_access`. Because the backend enforces `JWKS_REQUIRED_SCOPE=access_as_user` against `scp ?? scope`, the realm SHALL also define an `access_as_user` client scope assigned to `huella-web` as a **default** scope, so every access token carries it (in the standard `scope` claim) without the frontend having to request it explicitly.

#### Scenario: Token carries API audience, refresh scope, and required scope

- **WHEN** `huella-web` obtains a token
- **THEN** the token's `aud` includes `huella-api`, and the granted scopes (in `scope`) include both `offline_access` and `access_as_user`

### Requirement: Self-registration with email emitted in the access token

The realm SHALL enable self-registration and SHALL require an email (verified, or `username = email`), and the `huella-web` client/scope configuration SHALL ensure the `email` claim is present in the **access token** (not only on the user record or the ID token), because the backend reads `email`/`preferred_username` from the validated access token and rejects requests without it.

#### Scenario: Access token carries a valid email claim

- **WHEN** a self-registered user obtains an access token
- **THEN** the access token contains an `email` (or `preferred_username`) claim that satisfies the backend's email validation

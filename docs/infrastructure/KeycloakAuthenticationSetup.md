# Keycloak Authentication Setup

How to run Huella Latam against a local **Keycloak** instance as the OIDC Identity Provider. This is the recommended way to develop and test the full authenticated flow locally without an Azure tenant.

Keycloak is a concrete instance of the [Generic OIDC contract](./GenericOidcAuthenticationSetup.md) — read that first for the provider-agnostic picture. For Azure Entra, see [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md).

> Everything here is **local-development only** (HTTP, `sslRequired: none`, bootstrap admin `admin`/`admin`). Do not use this realm or these credentials anywhere else.

## Table of Contents

1. [What the Overlay Provides](#what-the-overlay-provides)
2. [Bring Up Keycloak](#bring-up-keycloak)
3. [The Imported Realm](#the-imported-realm)
4. [Backend Configuration (API)](#backend-configuration-api)
5. [Frontend Configuration (Web)](#frontend-configuration-web)
6. [The Issuer vs JWKS Host Split](#the-issuer-vs-jwks-host-split)
7. [Creating a User](#creating-a-user)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## What the Overlay Provides

A compose overlay (`compose/keycloak.yaml`) adds two services to the base stack:

- **`keycloak`** — `quay.io/keycloak/keycloak:26.1` in `start-dev --import-realm` mode, exposed on host port **8081** (container 8080). The base API already uses host 8080.
- **`keycloak-db`** — a dedicated Postgres for Keycloak.

On first boot Keycloak imports the realm from `infra/keycloak/realm-huella.json`, so the `huella` realm, the `huella-web` client, scopes, and the API audience mapper all exist out of the box.

---

## Bring Up Keycloak

The overlay reuses the base `huella-network`; do not run it standalone. Combine it with the base stack either via the `COMPOSE_FILE` env var:

```bash
COMPOSE_FILE=docker-compose.yml:compose/keycloak.yaml
docker compose --env-file .env.dockercompose up --build
```

or by passing both files on the CLI:

```bash
docker compose -f docker-compose.yml -f compose/keycloak.yaml --env-file .env.dockercompose up --build
```

- **Admin console:** http://localhost:8081 — bootstrap admin `admin` / `admin`.
- **Issuer:** http://localhost:8081/realms/huella
- **OIDC discovery:** http://localhost:8081/realms/huella/.well-known/openid-configuration

---

## The Imported Realm

From `infra/keycloak/realm-huella.json`:

**Realm `huella`** — self-service registration enabled, email used as username, password reset allowed, email verification off (dev convenience), access token lifespan 300s.

**Client `huella-web`** — the public SPA client:

| Setting               | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Type                  | Public (no secret)                                         |
| Flow                  | Standard (Authorization Code) + PKCE `S256`                |
| Redirect URIs         | `http://localhost:*` (any localhost port — see note below) |
| Web origins           | `*` (dev realm only)                                       |
| Default client scopes | `basic`, `profile`, `email`, `access_as_user`              |
| Optional client scope | `offline_access`                                           |
| Audience mapper       | Adds `huella-api` to the access token `aud`                |

> **Why the wildcard redirect?** The dev realm deliberately accepts any `http://localhost:*` redirect (and `*` web origins) so a dev server on any port completes the OIDC flow — this is what lets several git worktrees run at once, each on its own web port. It applies to this **dev-only** realm export; a production realm must whitelist exact URIs. See [Running several git worktrees](../development/worktree-isolation.md).

Two things that map straight onto the backend config:

- The **audience mapper** sets `aud = huella-api` → `JWKS_AUDIENCE=huella-api`.
- **`access_as_user`** is a _default_ client scope, so it lands in the token's `scope` claim automatically → `JWKS_REQUIRED_SCOPE=access_as_user`, and the frontend does **not** need to request it.

---

## Backend Configuration (API)

Set these for the `huella` realm. The API only reads the `JWKS_*` vars — there are no `AZURE_*` auth vars in the API runtime.

```bash
AUTH_PROVIDER=jwks
JWKS_ISSUER=http://localhost:8081/realms/huella                              # = token `iss` (browser-facing host)
JWKS_URI=http://keycloak:8080/realms/huella/protocol/openid-connect/certs    # internal host, resolvable from the api container
JWKS_AUDIENCE=huella-api                                                     # from the realm's audience mapper
JWKS_REQUIRED_SCOPE=access_as_user                                          # default; can be omitted
# AZURE_TENANT_ID / AZURE_API_CLIENT_ID etc. — leave EMPTY
```

This block is also kept in `.env.dockercompose.example` (the "Keycloak (generic OIDC) example").

---

## Frontend Configuration (Web)

```bash
VITE_OIDC_ISSUER=http://localhost:8081/realms/huella
VITE_OIDC_CLIENT_ID=huella-web
VITE_OIDC_SCOPES=openid profile email offline_access   # access_as_user is a default scope in Keycloak — not requested here
VITE_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback   # or your dev origin; defaults to <origin>/auth/callback
```

The realm's `huella-web` client accepts any `http://localhost:*` redirect URI and web origin, so the Docker web (`:3000`), a host Vite dev server (`:5173`), and any other localhost port all work out of the box.

---

## The Issuer vs JWKS Host Split

This is the **#1 thing to get right**, and the reason `JWKS_URI` is set explicitly instead of relying on discovery:

- The browser must reach Keycloak at **`http://localhost:8081`**, so `KC_HOSTNAME` is set to that and the token `iss` becomes `http://localhost:8081/realms/huella`. `JWKS_ISSUER` and `VITE_OIDC_ISSUER` must match this exactly.
- The **API**, running inside the compose network, cannot resolve `localhost:8081` (that's the host, not the container). It reaches Keycloak at the internal service name **`http://keycloak:8080`**, which is why `JWKS_URI` uses that host.

> **Running the API on the host** (`pnpm dev`, not in compose)? Then the API _can't_ resolve `keycloak:8080` either — point `JWKS_URI` at `http://localhost:8081/realms/huella/protocol/openid-connect/certs` instead. The rule is: `JWKS_URI` host = whatever resolves **from where the API runs**; `JWKS_ISSUER`/`iss` host = whatever the **browser** uses.

---

## Creating a User

The realm has no pre-seeded users. Either:

- **Self-register:** open the app, click sign in → **Register**, enter an email (used as the username) and password. Email verification is off, so the account is usable immediately.
- **Admin console:** http://localhost:8081 → realm `huella` → Users → Add user (set an email and a password under Credentials).

To make a user a platform superadmin, use the app's promote-superadmin flow as usual (`SUPERADMIN_EMAIL` / the promote script).

---

## Testing

1. Bring up the stack with the overlay (above).
2. Open the web app (http://localhost:3000).
3. Sign in / register against Keycloak.
4. Confirm you land back in the app authenticated and that an authenticated API call returns 200.

---

## Troubleshooting

| Symptom                                                                       | Likely cause                                                                                                                                                                  | Fix                                                                                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| API logs "JWKS client not configured"                                         | `JWKS_URI` empty                                                                                                                                                              | Set `JWKS_URI` (see host split above).                                                                  |
| 401 on every API call, JWKS fetch fails                                       | API can't resolve the `JWKS_URI` host                                                                                                                                         | In compose use `http://keycloak:8080/...`; on host `pnpm dev` use `http://localhost:8081/...`.          |
| "The iss claim value is not allowed"                                          | `JWKS_ISSUER` ≠ token `iss`                                                                                                                                                   | Set `JWKS_ISSUER=http://localhost:8081/realms/huella` (match `KC_HOSTNAME`).                            |
| "The aud claim value is not allowed"                                          | `JWKS_AUDIENCE` ≠ `huella-api`                                                                                                                                                | Set `JWKS_AUDIENCE=huella-api` (the realm audience mapper).                                             |
| "Token missing required scope"                                                | `access_as_user` not granted                                                                                                                                                  | It's a default client scope in the imported realm — confirm you're using the `huella-web` client.       |
| `redirect_uri` error at login                                                 | Origin not covered by the `huella-web` client's `http://localhost:*` redirect ([generic explanation](../development/troubleshooting.md#oidc-redirect-uri-mismatch))           | Any `http://localhost:<port>` is accepted; for a non-localhost host, add it to the `huella-web` client. |
| Realm/client missing after `up`                                               | Import only runs on first boot                                                                                                                                                | `docker compose ... down -v` to drop the `keycloak-db` volume, then `up` to re-import.                  |
| Admin console at `http://localhost:8081` shows "We are sorry… HTTPS required" | The admin console is served by the `master` realm, whose default `sslRequired=external`; the realm export only sets `sslRequired: none` on the `huella` realm, never `master` | Relax `master` to `sslRequired=NONE` (see below).                                                       |

### "HTTPS required" on the admin console

Opening http://localhost:8081 fails with Keycloak's **"We are sorry… HTTPS required"** page. The admin console lives in the **`master`** realm, and `infra/keycloak/realm-huella.json` only sets `sslRequired: none` for the imported **`huella`** realm — it never touches `master`, which keeps Keycloak's default `sslRequired=external`. On Docker Desktop (macOS/Windows) the browser request reaches Keycloak via the VM/bridge gateway, which Keycloak does not treat as loopback, so `external` demands HTTPS and blocks plain HTTP.

Relax the `master` realm once (the container's internal HTTP port is 8080):

```bash
docker exec huella-latam-keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin
docker exec huella-latam-keycloak /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
```

This persists across `docker compose ... restart` and `up` (it is stored in the `keycloak-db` volume). It only resets on `docker compose ... down -v`, which drops the volume and re-imports the realm — after which you re-run the two commands.

---

## Additional Resources

- [Generic OIDC Authentication Setup](./GenericOidcAuthenticationSetup.md)
- [Keycloak Server Administration](https://www.keycloak.org/documentation)
- Realm export: `infra/keycloak/realm-huella.json` · Overlay: `compose/keycloak.yaml`

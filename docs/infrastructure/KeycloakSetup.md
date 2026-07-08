# Keycloak Setup

How to run **Keycloak** as the OIDC Identity Provider for Huella Latam — in both local development and production. Keycloak is a concrete instance of the [Generic OIDC contract](./GenericOidcAuthenticationSetup.md) — read that first for the provider-agnostic picture (token claims, the `JWKS_*`/`VITE_OIDC_*` contract, the IdP checklist). For Azure Entra, see [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md).

The realm shape, the client, and the token contract are identical in both environments — only the operational surface differs. **Dev** runs Keycloak with a bundled, throwaway database, the relaxed `start-dev` command, and plain HTTP on `localhost:18080`. **Production** runs it with an external/dedicated database, the hardened `start` command, and TLS terminated by a reverse proxy in front of a real public host. This single guide covers both, side by side, so the dev-vs-prod differences are explicit rather than spread across two mostly-parallel documents.

## Table of Contents

1. [Overview](#overview)
2. [Quick Setup](#quick-setup)
3. [Bring Up — Dev](#bring-up--dev)
4. [Bring Up — Production](#bring-up--production)
5. [Admin Console — Production Hardening](#admin-console--production-hardening)
6. [Hardening Beyond the Pilot](#hardening-beyond-the-pilot)
7. [Environment Variables (Dev & Production)](#environment-variables-dev--production)
8. [Verify End-to-End](#verify-end-to-end)
9. [Troubleshooting](#troubleshooting)
10. [Additional Resources](#additional-resources)

---

## Overview

The fixed contract is identical in dev and production:

- Realm **`huella`**.
- Public client **`huella-web`**: Authorization Code + PKCE `S256`, no client secret.
- Audience **`huella-api`**, set via an **audience mapper** on `huella-web` (token `aud` = `huella-api`).
- **`access_as_user`** client scope, configured as a **default** client scope — granted on every token automatically, so the frontend never has to request it explicitly (unlike Entra).

What differs is the operational surface:

| Concern        | Dev                                                      | Production                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command        | `start-dev` (relaxed defaults, HTTP, no hostname checks) | `start` (Keycloak refuses to boot with insecure defaults unless hostname/proxy are configured)                                                                                                |
| Database       | Throwaway Postgres in the same compose project           | A separately managed, durable database — on-prem, mirroring how the app's own DB is external in [production-deployment.md](../operations/production-deployment.md)                            |
| Network edge   | Direct `http://localhost:18080`                          | A reverse proxy terminates TLS; Keycloak sits behind it on the internal network                                                                                                               |
| Realm defaults | `sslRequired: none`, self-registration on, no admin MFA  | `sslRequired: external` (or stricter), **self-registration on** (external orgs self-serve), email verification + MFA deferred (see [Hardening Beyond the Pilot](#hardening-beyond-the-pilot)) |

The rest of this guide follows that split: [Bring Up — Dev](#bring-up--dev) and [Bring Up — Production](#bring-up--production) cover getting an instance running; [Admin Console — Production Hardening](#admin-console--production-hardening) and [Hardening Beyond the Pilot](#hardening-beyond-the-pilot) are production-only; and [Environment Variables](#environment-variables-dev--production) covers deriving the app's config in both environments, side by side.

---

## Quick Setup

Copy-paste command matrix — all run from the **repo root**. Each brings up Keycloak (in dev, the admin console is on http://localhost:18080) with the chosen database. Keycloak publishes host port **18080** in both environments — its usual 8080 is already the api's host port, so it gets a leading `1`, the repo convention for a secondary service whose usual port is taken (same rule as the bundled DB's 15432). Keep `--project-directory .`: it pins the project directory to the repo root so the relative realm-import mount in the compose files resolves regardless of `-f` order. Full explanations are in [Bring Up — Dev](#bring-up--dev) and [Bring Up — Production](#bring-up--production).

### Dev — `start-dev`, plain HTTP, permissive realm

**Keycloak + bundled DB** (the usual case — zero config, no env file needed; `keycloak-init` relaxes `master` so the admin console works over HTTP):

```bash
docker compose --project-directory . \
  -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml \
  up -d
```

**Keycloak only, external Postgres** — omit `keycloak-db.yaml`; `cp .env.keycloak.example .env.keycloak` and set `KC_DB_URL_HOST` (+ `KC_DB_USERNAME` / `KC_DB_PASSWORD`) in it first:

```bash
docker compose --project-directory . \
  -f compose/keycloak.dev.yaml \
  --env-file .env.keycloak up -d
```

> Running the API/web in Docker too (not just `pnpm dev` on the host)? List `docker-compose.yml` **first** — that makes the repo root the project dir, so you can drop `--project-directory .` — and limit startup to the IdP: `docker compose -f docker-compose.yml -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml --env-file .env.dockercompose up -d keycloak keycloak-db keycloak-init`.

### Production — `start --optimized`, TLS/proxy, hardened realm

One file to fill in **before the first `up`**: `.env.prod.keycloak` (`cp .env.prod.keycloak.example .env.prod.keycloak`). That includes `HUELLA_WEB_ORIGIN` — the first-boot realm import substitutes it into the `huella-web` client's redirect URIs (a wrong value means login fails until the URIs are fixed in the Admin Console; the import only runs once). `--build` is required — Keycloak's optimized image builds locally.

**Keycloak + bundled DB:**

```bash
docker compose --project-directory . \
  -f compose/keycloak-db.yaml -f compose/keycloak.prod.yaml \
  --env-file .env.prod.keycloak up -d --build
```

**Keycloak only, external managed Postgres** — omit `keycloak-db.yaml`; set `KC_DB_URL_HOST` (+ `KC_DB_URL_PORT` if not `5432`, `KC_DB_USERNAME` / `KC_DB_PASSWORD`) in `.env.prod.keycloak`:

```bash
docker compose --project-directory . \
  -f compose/keycloak.prod.yaml \
  --env-file .env.prod.keycloak up -d --build
```

> To let the API reach Keycloak over the internal network for JWKS, run it in the same project as the app: add `-f docker-compose.prod.yml --env-file .env.prod.dockercompose` (see [Bring Up — Production](#bring-up--production)).

---

## Bring Up — Dev

> Everything in this section is **local-development only** (HTTP, `sslRequired: none`, bootstrap admin `admin`/`admin`). Do not use this realm or these credentials anywhere else.

### What the compose overlay provides

Dev is two compose files (self-sufficient — they declare their own `huella-network`, so the base stack is only needed when the api/web run in Docker too; see [Bringing it up](#bringing-it-up)):

- **`compose/keycloak.dev.yaml`** — two services: **`keycloak`** (`quay.io/keycloak/keycloak:26.1.5` in `start-dev --import-realm` mode, on host port **18080** — container 8080; Keycloak's usual 8080 is the base API's host port, so it gets the 1-prefix like the DB's 15432) and **`keycloak-init`**, a one-shot that relaxes the `master` realm to `sslRequired=NONE` after boot, so the whole dev instance — admin console included — works over **plain HTTP with no manual steps** (see ["HTTPS required" on the admin console](#https-required-on-the-admin-console)).
- **`compose/keycloak-db.yaml`** — the **`keycloak-db`** service: a dedicated Postgres for Keycloak. This is the **same generic DB file production uses** (see [Bring Up — Production](#bring-up--production)); in dev it needs no configuration — it defaults to `keycloak`/`keycloak`.

On first boot Keycloak imports the realm from `infra/keycloak/dev/realm-huella.dev.json`, so the `huella` realm, the `huella-web` client, scopes, and the API audience mapper all exist out of the box. (Production imports its own hardened export from `infra/keycloak/prod/` — same structure, different settings; see [Realm import](#realm-import).)

### Bringing it up

Two scenarios, depending on where the api/web run — both give the same Keycloak on http://localhost:18080:

**App on the host (`pnpm dev`) — the usual case.** Run just the IdP pair, standalone. Nothing else is needed: both files declare their own `huella-network`, and the api reaches Keycloak through the published host port (see [the issuer/JWKS host split](#the-issuer-vs-jwks-host-split)):

```bash
docker compose --project-directory . \
  -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml \
  up -d
```

**App in Docker too.** Combine the base stack with the DB and the overlay, so Compose merges everything onto one network and the api container can reach Keycloak at `http://keycloak:8080` by service name — either via the `COMPOSE_FILE` env var:

```bash
COMPOSE_FILE=docker-compose.yml:compose/keycloak-db.yaml:compose/keycloak.dev.yaml
docker compose --env-file .env.dockercompose up --build
```

or by passing all three files on the CLI (base compose first, so relative paths resolve to the repo root):

```bash
docker compose -f docker-compose.yml -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml --env-file .env.dockercompose up --build
```

One `up` here boots the **whole stack** — postgres, migrate, api, web, and the IdP (hence `--build`). If the app stack is already running and you only want to add Keycloak to it, append the IdP's service names instead of rebuilding everything: `... up -d keycloak keycloak-db keycloak-init` (the [Quick Setup](#quick-setup) variant).

- **Admin console:** http://localhost:18080 — bootstrap admin `admin` / `admin`.
- **Issuer:** http://localhost:18080/realms/huella
- **OIDC discovery:** http://localhost:18080/realms/huella/.well-known/openid-configuration
- **Realm database:** reachable on host port **15432** for inspection (e.g. `psql -h localhost -p 15432 -U keycloak`, password `keycloak`). It's `15432` — not `5432` — so it never clashes with the app's own dev Postgres (host `5432`); override with `KC_DB_PORT_HOST_MAPPING`. This is host access only; Keycloak connects to the DB internally on `5432`.

### The imported dev realm

From `infra/keycloak/dev/realm-huella.dev.json`:

**Realm `huella`** — self-service registration enabled, email used as username, password reset allowed, email verification off (dev convenience), access token lifespan 300s.

**Client `huella-web`** — the public SPA client:

| Setting               | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Type                  | Public (no secret)                                                                    |
| Flow                  | Standard (Authorization Code) + PKCE `S256`                                           |
| Redirect URIs         | `http://localhost:5173/auth/callback`, `http://localhost:3000/auth/callback` (+ `/*`) |
| Web origins           | `http://localhost:5173`, `http://localhost:3000`                                      |
| Default client scopes | `basic`, `profile`, `email`, `access_as_user`                                         |
| Optional client scope | `offline_access`                                                                      |
| Audience mapper       | Adds `huella-api` to the access token `aud`                                           |

Two things that map straight onto the backend config:

- The **audience mapper** sets `aud = huella-api` → `JWKS_AUDIENCE=huella-api`.
- **`access_as_user`** is a _default_ client scope, so it lands in the token's `scope` claim automatically → `JWKS_REQUIRED_SCOPE=access_as_user`, and the frontend does **not** need to request it.

### Creating a user

The dev realm has no pre-seeded users. Either:

- **Self-register:** open the app, click sign in → **Register**, enter an email (used as the username) and password. Email verification is off, so the account is usable immediately.
- **Admin console:** http://localhost:18080 → realm `huella` → Users → Add user (set an email and a password under Credentials).

To make a user a platform superadmin, use the app's promote-superadmin flow as usual (`SUPERADMIN_EMAIL` / the promote script).

### "HTTPS required" on the admin console

**Handled automatically.** The admin console lives in the **`master`** realm, which Keycloak creates itself with its default `sslRequired=external` — the realm import only covers `huella` (`--import-realm` skips realms that already exist, and `master` always does). On Docker Desktop (macOS/Windows) the browser request reaches Keycloak via the VM/bridge gateway, which Keycloak does not treat as loopback, so `external` would demand HTTPS and block plain HTTP with Keycloak's **"We are sorry… HTTPS required"** page.

The dev overlay's **`keycloak-init`** one-shot service closes this gap on every `up`: once `keycloak` is healthy, it runs `kcadm` to set `master` to `sslRequired=NONE` and exits (same pattern as the base stack's `migrate` one-shot). It is idempotent and self-heals after a `docker compose ... down -v` re-import — no manual HTTPS-related step is ever needed in dev.

If you ever see the "HTTPS required" page anyway, `keycloak-init` didn't run (e.g. `up` was limited to `keycloak keycloak-db`). Run it (`docker compose ... up -d keycloak-init`) or apply the equivalent manually:

```bash
docker exec huella-latam-keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin
docker exec huella-latam-keycloak /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
```

---

## Bring Up — Production

### The production files

| File                                         | Role                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compose/keycloak.prod.yaml`                 | The Keycloak service only (`start --import-realm`, no bundled dev conveniences).                                                                                                                 |
| `compose/keycloak-db.yaml`                   | A dedicated, generic database service for Keycloak (swap for an external DB — see below).                                                                                                        |
| `.env.prod.keycloak.example`                 | Template for Keycloak's own runtime vars (`KC_HOSTNAME`, `KC_PROXY_HEADERS`, bootstrap admin, DB conn, `HUELLA_WEB_ORIGIN` for the realm import).                                                |
| `infra/keycloak/prod/realm-huella.prod.json` | The production realm export — the **baseline** state Keycloak imports on first boot. Lives in its own `prod/` import directory, separate from the dev realm (see [Realm import](#realm-import)). |

Like the dev overlay, `compose/keycloak.prod.yaml` reuses the base stack's network — do not run it standalone if you want the API to reach Keycloak internally. Combine it with `docker-compose.prod.yml` (the app's own production compose file, documented in [production-deployment.md](../operations/production-deployment.md)) either via `COMPOSE_FILE`:

```bash
COMPOSE_FILE=docker-compose.prod.yml:compose/keycloak-db.yaml:compose/keycloak.prod.yaml
docker compose --project-directory . \
  --env-file .env.prod.dockercompose \
  --env-file .env.prod.keycloak \
  up -d --build
```

or by passing every file explicitly on the CLI (Compose ≥ 2.24 merges repeated `--env-file` flags, lowest to highest precedence, left to right; on older Compose, concatenate both files into one and pass it once):

```bash
docker compose --project-directory . \
  -f docker-compose.prod.yml -f compose/keycloak-db.yaml -f compose/keycloak.prod.yaml \
  --env-file .env.prod.dockercompose --env-file .env.prod.keycloak \
  up -d --build
```

Two separate env files (`.env.prod.dockercompose` for the app, `.env.prod.keycloak` for Keycloak's own runtime settings) keep the app's secrets and the IdP's secrets in separate, independently rotatable files — copy each from its `*.example` template and fill it in before the first `up`. `docker-compose.prod.yml` and both Keycloak files declare the same `huella-network: driver: bridge` key and (for `keycloak.prod.yaml`) no top-level `name:`, so Compose merges all three into **one** project named after `docker-compose.prod.yml` (`huella-latam-prod`), sharing one network — that's what makes the internal `http://keycloak:8080/...` address reachable from the `api` container.

> **`--build`, not `--no-build`, for Keycloak.** Unlike `api`/`web` (which the [production deployment model](../operations/production-deployment.md#image-delivery-build--save--load) builds once and ships as a tarball), `compose/keycloak.prod.yaml` builds its image locally via an inline Dockerfile that runs `kc.sh build` (baking in the DB vendor and health/metrics providers) so the container then starts fast with `start --optimized`. If you air-gap Keycloak the same way as `api`/`web` (build → `docker save` → transfer → `docker load`), switch to `--no-build` on the deploy server once the image is loaded — passing `--no-build` before any image exists will fail.
>
> **Combining with the tarball-deployed app stack — build in two steps.** On a deploy server that received `api`/`web` as a tarball (no monorepo source), a single combined `up -d --build` would try to rebuild `api`/`web` from source and fail, while `up -d --no-build` fails on the first deploy because Keycloak's image doesn't exist yet. Build only Keycloak first, then start everything without building:
>
> ```bash
> docker compose --project-directory . \
>   -f docker-compose.prod.yml -f compose/keycloak-db.yaml -f compose/keycloak.prod.yaml \
>   --env-file .env.prod.dockercompose --env-file .env.prod.keycloak \
>   build keycloak
> docker compose --project-directory . \
>   -f docker-compose.prod.yml -f compose/keycloak-db.yaml -f compose/keycloak.prod.yaml \
>   --env-file .env.prod.dockercompose --env-file .env.prod.keycloak \
>   up -d --no-build
> ```
>
> On top of [production-deployment.md's three app artifacts](../operations/production-deployment.md#image-delivery-build--save--load), the Keycloak side needs these files on the deploy server: `compose/keycloak.prod.yaml`, `compose/keycloak-db.yaml` (if using the bundled DB), `infra/keycloak/prod/` (the first-boot realm import mounts it), and the filled `.env.prod.keycloak`.
>
> If you'd rather run Keycloak as a fully separate lifecycle (different team, own upgrade cadence) instead of merging it into the app's project, give it its own project name (`docker compose -p huella-latam-keycloak-prod ...`) — but then the API can't reach it by service name, and `JWKS_URI` must instead use a published port and a host/IP reachable from wherever the API runs (see the [Issuer vs JWKS host split](#the-issuer-vs-jwks-host-split)).

### Pointing at an external database instead of `keycloak-db.yaml`

Drop `-f compose/keycloak-db.yaml` (and the matching entry from `COMPOSE_FILE`) and point Keycloak at a real, externally managed database the same way the app itself already points at an external PostgreSQL server in production (see the [DBA contract](../operations/production-deployment.md#database-roles--privileges-dba-contract)). `compose/keycloak.prod.yaml` and `compose/keycloak-db.yaml` share one set of `KC_DB_*` variables in `.env.prod.keycloak` — `KC_DB_USERNAME` / `KC_DB_PASSWORD` / `KC_DB_URL_DATABASE` (plus `KC_DB_URL_HOST` / `KC_DB_URL_PORT` for the external case) — so switching to an external server is just re-pointing those host/port values and omitting the bundled `keycloak-db` service, with nothing else to keep in sync by hand. Keycloak's data (realms, clients, users, sessions) then survives independently of the compose project's lifecycle — the same rationale as keeping the app's own Postgres outside Docker.

### Realm import

On first boot, `compose/keycloak.prod.yaml` runs Keycloak in `start` mode (**not** `start-dev` — production must not use the dev command, which relaxes hostname/HTTPS enforcement that production relies on) with `--import-realm`, importing `infra/keycloak/prod/realm-huella.prod.json` from a mounted volume — same mechanism as dev, but from a dedicated prod-only import directory (see the note below). That file is the **baseline**: it already sets the production-appropriate values (`sslRequired`, token lifespans, the `huella-web` client, the audience mapper, `access_as_user` as a default scope, etc.), and the `huella-web` client's redirect URIs / web origins are filled in at import time from `HUELLA_WEB_ORIGIN` in `.env.prod.keycloak` — Keycloak substitutes `${VAR}` placeholders in the realm JSON from the container's environment. [Admin Console — Production Hardening](#admin-console--production-hardening) below is what an operator verifies and adjusts **after** that import — the imported redirect URIs, the bootstrap admin, MFA, brute-force thresholds, and anything specific to the deployment that can't be baked into a generic export.

Import only runs when the realm doesn't already exist. To re-import (e.g. after fixing a mistake in the export before go-live), drop the Keycloak database/volume and bring the stack back up — do **not** do this once real users and data exist in the realm.

> **Prod and dev use separate, symmetric import directories — by design.** `compose/keycloak.prod.yaml` mounts `infra/keycloak/prod/` (containing only the hardened `realm-huella.prod.json`), while the dev overlay mounts `infra/keycloak/dev/` (containing only the permissive `realm-huella.dev.json` — `sslRequired: none`, open self-registration, no email verification). Both exports define the same realm name (`huella`) with the same client/scope contract — they differ only in hardening. Because Keycloak's `--import-realm` imports **every** `*.json` directly in the mounted directory, keeping each environment's export in its own directory means each stack can only ever import its own realm — deterministic by construction, with no manual "remove the other file first" step to forget.

---

## Admin Console — Production Hardening

Everything below is **verify-or-adjust**, not from-scratch client creation — the realm, the `huella-web` client, the audience mapper, and `access_as_user` all already exist from the `realm-huella.prod.json` import.

### 1. Bootstrap admin → named admin + MFA

Keycloak 26 creates a temporary admin only in the `master` realm's _first_ boot, from `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` in `.env.prod.keycloak`. Treat that account as a one-time bootstrap credential, not an operator identity:

1. Log in to the Admin Console (`https://<kc-public-host>/admin/`) as the bootstrap admin.
2. Switch to the `master` realm → **Users** → **Add user**. Give it a real username/email tied to an actual operator.
3. **Credentials** tab → set a temporary password (forces a change on first login).
4. **Role mapping** → assign the realm-management `admin` role (or the built-in `admin` composite role in `master`) so the new user has full admin rights.
5. Log out of the bootstrap session, log in as the new named admin, complete the password change.
6. **Required actions** → assign **Configure OTP** to the new admin user (TOTP via any RFC 6238 authenticator app) and complete enrollment immediately — recommended even for the pilot, since it protects the Admin Console and affects only the handful of operator accounts. To _enforce_ MFA via an authentication flow (for all admins, or all users) later, see [Hardening Beyond the Pilot](#hardening-beyond-the-pilot).
7. Disable or delete the bootstrap admin user in the Admin Console, and **rotate** `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` in `.env.prod.keycloak` to fresh throwaway values — do **not** blank them out (compose requires them non-empty on every `up`, so an emptied file breaks the next deploy). They only take effect again if the `master` realm is dropped and re-created, but leaving the original password live in a secrets file is needless exposure.

Repeat step 6 (TOTP) for every additional admin user — see [item 11](#11-tls--sslrequired-behind-the-reverse-proxy) below for why the `master` realm's own `sslRequired` matters here too.

### 2. Realm verification

**Realm Settings → General**, confirm against the dev realm's defaults:

| Setting               | Dev (`realm-huella.dev.json`) | Production expectation                                                                              |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `sslRequired`         | `none`                        | `external` (or `all` if every network hop, including internal, is TLS)                              |
| `registrationAllowed` | `true`                        | `true` — external organizations self-register (see [item 10](#10-self-registration-pilot-baseline)) |
| `verifyEmail`         | `false`                       | `false` for the pilot; enable later (see [Hardening Beyond the Pilot](#hardening-beyond-the-pilot)) |
| `accessTokenLifespan` | `300` (5 min)                 | Keep short (5–15 min); rely on refresh tokens for silent renew                                      |

### 3. Client `huella-web`

**Clients → huella-web → Settings**. Confirm:

| Setting                         | Expected value                     |
| ------------------------------- | ---------------------------------- |
| Client authentication           | Off (public client, no secret)     |
| Standard flow                   | Enabled                            |
| Direct access grants            | Disabled                           |
| PKCE method (Advanced tab)      | `S256`                             |
| Valid redirect URIs             | `https://<web-host>/auth/callback` |
| Valid post-logout redirect URIs | `https://<web-host>/`              |
| Web origins                     | `https://<web-host>`               |

The URIs are **exact** — no `/*` wildcards in production (the dev realm allows them for convenience; prod keeps the redirect surface minimal). The import fills them from `HUELLA_WEB_ORIGIN` in `.env.prod.keycloak`; if that value was wrong at first boot, fix the URIs here with the real `<web-host>` (changing the env var afterwards has no effect — the import only runs when the realm doesn't exist). If more than one origin serves the app (e.g. a staging alias alongside production), list each exact URI — a missing entry surfaces as a `redirect_uri` error at login (see [Troubleshooting](#troubleshooting) and the [generic redirect-URI mismatch note](../development/troubleshooting.md#oidc-redirect-uri-mismatch)).

### 4. Audience mapper → `huella-api`

**Clients → huella-web → Client scopes → huella-web-dedicated → Mappers → huella-api-audience**. Confirm it's an **Audience** mapper with _Included Custom Audience_ = `huella-api` and _Add to access token_ = on. This is what makes the token's `aud` claim equal `huella-api`, which the backend checks via `JWKS_AUDIENCE`.

### 5. `access_as_user` as a default client scope

**Client scopes** (realm-level) → confirm `access_as_user` exists with _Include in token scope_ = on. Then **Clients → huella-web → Client scopes** → confirm `access_as_user` is listed under **Default** (not **Optional**). Because it's default, Keycloak grants it automatically on every token issued to `huella-web` — the frontend does not need to request it in `VITE_OIDC_SCOPES` (contrast with Entra, which requires the scope explicitly in the authorization request).

### 6. Token & session lifetimes

**Realm Settings → Sessions** and **Realm Settings → Tokens**. Recommended starting point for a government portal:

| Setting               | Recommendation                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Access token lifespan | 5–15 min                                                                                                                                                                                                                                                                                                                                                                 |
| SSO session idle      | 15–30 min (the shipped realm uses 15 min)                                                                                                                                                                                                                                                                                                                                |
| SSO session max       | 8–12 h (bound the total session length even with continuous activity)                                                                                                                                                                                                                                                                                                    |
| Offline session idle  | Only relevant if `offline_access` is used for long-lived refresh — keep it as short as usability allows                                                                                                                                                                                                                                                                  |
| Revoke refresh token  | On, with **refresh token max reuse = 1** (the shipped realm's value). Not 0: with an SPA doing silent renew, two open tabs can refresh concurrently, and strict single-use reuse detection revokes the whole session ([keycloak#16081](https://github.com/keycloak/keycloak/issues/16081)) — max reuse 1 tolerates that race while keeping tokens effectively single-use |

Shorter access tokens are safe because `oidc-client-ts`'s `automaticSilentRenew` (see the [Generic OIDC contract](./GenericOidcAuthenticationSetup.md#frontend-configuration-web)) renews them transparently via the refresh token — users are not re-prompted to log in.

### 7. Brute-force protection

**Realm Settings → Security defenses → Brute force detection**. Disabled by default in Keycloak — turn it on for production:

- Max login failures: `5`
- Wait increment: `60s`
- Max wait: `900s` (15 min)
- Failure reset time: `12h`

This locks an account out temporarily after repeated bad passwords instead of allowing unlimited guesses.

### 8. Password policy

**Authentication → Policies → Password policy**. Add at minimum a length requirement (12+), and consider `notUsername` and `passwordHistory`. Leave the hashing at Keycloak's default — `pbkdf2-sha512` at 210,000 iterations since Keycloak 24 — by **not** adding `hashAlgorithm`/`hashIterations` terms at all (the imported realm deliberately omits them); pinning older values like `pbkdf2-sha256` @ 100k would be a downgrade.

### 9. Email verification + SMTP

The pilot ships with `verifyEmail: false` and no SMTP configured, so external organizations can self-register and sign in immediately without depending on a mail server (the on-prem deployment may not have one wired up yet). Trade-off to note: **self-service password reset also needs SMTP**, so until it is configured a user who forgets their password must be reset by an admin. Turning on SMTP + email verification is the first item under [Hardening Beyond the Pilot](#hardening-beyond-the-pilot).

### 10. Self-registration (pilot baseline)

The pilot enables open self-service registration (`registrationAllowed: true`): the platform's end users are **external organizations**, and there is no staffing to provision or approve accounts manually, so they sign themselves up from the login screen. `registrationEmailAsUsername: true` and `loginWithEmailAllowed: true` keep email as the identity (the API's [token contract](./GenericOidcAuthenticationSetup.md#token-contract) requires an `email` claim). Because registration is open **and** unverified in the pilot, the abuse mitigations — email verification, a registration CAPTCHA, a required terms-and-conditions action — are grouped under [Hardening Beyond the Pilot](#hardening-beyond-the-pilot); enable them as the deployment matures.

### 11. TLS / `sslRequired` behind the reverse proxy

This is the production analogue of the dev guide's ["HTTPS required" gotcha](#https-required-on-the-admin-console), except here it should be configured correctly from the start rather than relaxed away:

`compose/keycloak.prod.yaml` supports two mutually exclusive modes (pick one in `.env.prod.keycloak`):

- **Mode A — reverse proxy terminates TLS (the default, and the expected mode behind an on-prem VPN edge):** `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded` (trusts the proxy's `X-Forwarded-For` / `X-Forwarded-Proto` / `X-Forwarded-Host` headers to reconstruct the original HTTPS request), `KC_HOSTNAME=https://<kc-public-host>` (a full URL, so Keycloak derives the issuer as `https://<kc-public-host>/realms/huella` and never guesses the scheme from the internal, plain-HTTP hop). Without `KC_PROXY_HEADERS` set correctly, Keycloak sees plain HTTP from the proxy and enforces `sslRequired` against it — that's the "HTTPS required" failure mode.
- **Mode B — Keycloak terminates TLS itself:** `KC_HTTP_ENABLED=false` plus `KC_HTTPS_CERTIFICATE_FILE` / `KC_HTTPS_CERTIFICATE_KEY_FILE` pointing at PEM files mounted from `KC_TLS_CERT_DIR`. Rarely needed behind an on-prem reverse proxy, but available if the proxy passes TLS through untouched instead of terminating it. Side effect: the management interface (port 9000) inherits TLS too (Keycloak 26.1 has no option to keep it plain HTTP), so the compose healthcheck automatically degrades to a TCP-connect probe in this mode — see the healthcheck note in `compose/keycloak.prod.yaml`.

Because mode A trusts `X-Forwarded-*` headers, **only the reverse proxy should be able to reach the plain-HTTP port** — anything that hits it directly can spoof its client IP/scheme (defeating brute-force accounting, among others). The env template therefore defaults to a loopback bind (`KC_HTTP_PORT=127.0.0.1:18080` — the port vars accept an `ip:port` form; host 18080 rather than 8080, which the api already publishes); keep it when the proxy runs on the same host, and widen it to a specific interface plus a proxy-only firewall rule only when the proxy is remote. Additional hardening once mode A is working: restrict which hosts Keycloak trusts to send forwarded headers via [`KC_PROXY_TRUSTED_ADDRESSES`](https://www.keycloak.org/server/reverseproxy) — the current `compose/keycloak.prod.yaml` doesn't pass this through by default, so add it to the service's `environment:` block (pointed at the proxy's own address) if you want it enforced. Leave `KC_HOSTNAME_STRICT` at its default (`true`) — it rejects requests with a mismatched `Host` header, which is what you want once the public hostname is fixed.

Leave the `huella` realm's `sslRequired` at `external` (or `all`) — do **not** copy the dev realm's `none`. If the **admin console** itself 400s with "HTTPS required" after import, the cause is almost always `KC_PROXY_HEADERS`/`KC_HOSTNAME` not matching what the proxy actually sends, not the realm setting — fix the proxy headers rather than relaxing `sslRequired` on `master`.

---

## Hardening Beyond the Pilot

The pilot deliberately runs a **minimal-but-robust** authentication baseline: TLS / `sslRequired`, brute-force lockout, a strong password policy, short token/session lifetimes, and refresh-token rotation are all on from day one — they cost the end user nothing. What the pilot _skips_ is anything that adds user-facing friction or extra infrastructure (SMTP, MFA enrollment, registration gates), so external organizations can sign up and get in with the least ceremony. The items below make the deployment progressively more robust; each is independent, so turn them on in any order as the platform matures.

### 1. Email verification + SMTP _(recommended first)_

Wire up SMTP (**Realm Settings → Email**: host, port, "from" address, STARTTLS/SSL, auth — on-prem this is usually the ministry's own mail relay), then set **Realm Settings → Login → Verify email** on (`verifyEmail: true`). This closes two gaps at once: self-registrations can no longer use fake or mistyped email addresses, and **self-service password reset starts working** (it depends on SMTP too — until then, forgotten passwords require an admin reset).

### 2. Registration abuse controls

Open **and** unverified self-registration invites spam/bot signups. Two low-friction mitigations, both configured in the Admin Console without code changes:

- **reCAPTCHA on the registration form** — **Authentication → Flows → Registration**: enable the _reCAPTCHA_ execution and add your site keys in the realm's reCAPTCHA settings.
- **Required Terms & Conditions** — **Authentication → Required actions**: enable _Terms and Conditions_ so every new user must accept them before the account is usable.

### 3. Multi-factor authentication (TOTP)

The pilot enables TOTP manually for the handful of admin/operator accounts ([Admin Console step 1](#1-bootstrap-admin--named-admin--mfa)) but does not force it on organization end users. To enforce it more broadly later:

- **Admins/operators only (recommended):** create a group (e.g. `platform-admins`), then **Authentication → Flows** → duplicate the _browser_ flow and add a **Conditional OTP** subflow gated on membership in that group; assign operator accounts to the group. This forces MFA for operators without touching the organization end-user experience.
- **All users:** set **Configure OTP** as a default required action (**Authentication → Required actions**) — every user enrolls a TOTP authenticator on next login. Heavier friction; weigh it against the pilot's low-ceremony goal.

### 4. Stricter transport security

Once every network hop — including proxy → Keycloak and API → Keycloak — is TLS, raise the realm's `sslRequired` from `external` to `all`. Verify admin/CLI (`kcadm`) access still works over the internal path before committing (see ["HTTPS required" on the admin console](#https-required-on-the-admin-console) for the failure mode this can trigger).

### 5. Password policy tuning

The baseline policy (`length(12)` + composition + history, with hashing left at Keycloak's default PBKDF2-SHA512 @ 210k iterations) is deliberately conservative and intentionally omits forced password expiry, per current [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) guidance (which favors length over forced composition/rotation). Adjust it in **Authentication → Policies → Password policy** only if a specific compliance mandate — or usability feedback from the pilot — calls for it.

---

## Environment Variables (Dev & Production)

This is the part that turns "a running Keycloak" into the exact values the app's `JWKS_*` (backend) and `VITE_OIDC_*` (frontend) variables need — in either environment.

### The Issuer vs JWKS Host Split

This is the **#1 thing to get right**, in either environment, and the reason `JWKS_URI` is set explicitly instead of relying on discovery.

The rule is universal: **`JWKS_ISSUER` / `VITE_OIDC_ISSUER` = the browser-facing host** — whatever host the browser talks to Keycloak through, since that's what ends up in the token's `iss` claim. **`JWKS_URI` = whatever host resolves from wherever the API _process_ runs** — which is frequently a _different_ host than the one the browser uses. Conflating the two is the most common cause of "JWKS fetch fails" or issuer-mismatch errors in both environments.

**In dev:**

- Inside compose, the browser reaches Keycloak at `http://localhost:18080`, so `KC_HOSTNAME` is set to that and the token `iss` becomes `http://localhost:18080/realms/huella`. `JWKS_ISSUER` and `VITE_OIDC_ISSUER` must match this exactly. The **API**, running inside the compose network, cannot resolve `localhost:18080` (that's the host, not the container) — it reaches Keycloak at the internal service name `http://keycloak:8080`, which is why `JWKS_URI` uses that host.
- **Running the API on the host** (`pnpm dev`, not in compose)? Then the API _can't_ resolve `keycloak:8080` either — point `JWKS_URI` at `http://localhost:18080/realms/huella/protocol/openid-connect/certs` instead.

**In production:**

- The **browser** only ever talks to Keycloak through the reverse proxy at the public host — `KC_HOSTNAME=https://<kc-public-host>` — so the token's `iss` is `https://<kc-public-host>/realms/huella`. `JWKS_ISSUER` and `VITE_OIDC_ISSUER` must match this exactly.
- The **API**, running on-prem, does not need to go through the public reverse proxy at all to fetch signing keys — and often _shouldn't_, to avoid an unnecessary round trip through the internet-facing edge for internal traffic. Point `JWKS_URI` at whatever address resolves **from wherever the API process runs**:
  - If the API and Keycloak are combined into the **same** compose project (per [Bring Up — Production](#bring-up--production)), that's the internal service name — e.g. `http://keycloak:8080/realms/huella/protocol/openid-connect/certs`.
  - If Keycloak runs on a **separate host** on the same on-prem/VPN network, use that host's internal DNS name or IP — e.g. `http://keycloak.internal.example:8080/realms/huella/protocol/openid-connect/certs` — reachable directly without transiting the public reverse proxy. If that internal hop is itself TLS-terminated (an internal CA), use `https://` and the matching port instead.

> The rule, unchanged between dev and prod: `JWKS_URI` host = whatever resolves **from where the API runs**; `JWKS_ISSUER`/`iss` host = whatever the **browser** uses.

### How to obtain each value

**Dev values are fixed** — the compose overlay always uses `localhost:18080`, so there's nothing to derive; the values below are the same for every dev instance.

**Prod values are read off the running instance** — from the Admin Console and the realm's **OIDC discovery document**:

```
https://<kc-public-host>/realms/huella/.well-known/openid-configuration
```

(Realm Settings → General tab also links this directly as "OpenID Endpoint Configuration".)

```bash
curl -s https://<kc-public-host>/realms/huella/.well-known/openid-configuration | jq '{issuer, jwks_uri, authorization_endpoint, token_endpoint, end_session_endpoint}'
```

```json
{
  "issuer": "https://<kc-public-host>/realms/huella",
  "jwks_uri": "https://<kc-public-host>/realms/huella/protocol/openid-connect/certs",
  "authorization_endpoint": "https://<kc-public-host>/realms/huella/protocol/openid-connect/auth",
  "token_endpoint": "https://<kc-public-host>/realms/huella/protocol/openid-connect/token",
  "end_session_endpoint": "https://<kc-public-host>/realms/huella/protocol/openid-connect/logout"
}
```

| Variable                             | Dev value                                                                                                                                                                                    | Prod value / where to get it                                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWKS_ISSUER`                        | `http://localhost:18080/realms/huella` (fixed — matches `KC_HOSTNAME` in the overlay)                                                                                                        | `https://<kc-public-host>/realms/huella` — the `issuer` field of the discovery document. Must equal the token's `iss` exactly.                                                                                                                                    |
| `JWKS_URI`                           | `http://keycloak:8080/realms/huella/protocol/openid-connect/certs` in compose; `http://localhost:18080/realms/huella/protocol/openid-connect/certs` if the API runs on the host (`pnpm dev`) | `.../realms/huella/protocol/openid-connect/certs`, on whatever host resolves **from the API process** — the `jwks_uri` field of the discovery document, host swapped for the API-reachable one (see [Issuer vs JWKS host split](#the-issuer-vs-jwks-host-split)). |
| `JWKS_AUDIENCE`                      | `huella-api` (fixed — from the imported realm's audience mapper)                                                                                                                             | `huella-api` — from `huella-web`'s audience mapper ([Admin Console step 4](#4-audience-mapper--huella-api)).                                                                                                                                                      |
| `JWKS_REQUIRED_SCOPE`                | `access_as_user` (default; can be omitted)                                                                                                                                                   | `access_as_user` — the realm's `access_as_user` client scope ([Admin Console step 5](#5-access_as_user-as-a-default-client-scope)). Optional; already the app default.                                                                                            |
| `JWKS_SKIP_SCOPE_CHECK`              | unset (leave scope enforcement on)                                                                                                                                                           | unset / `false` — not derived from Keycloak; leave scope enforcement on in production.                                                                                                                                                                            |
| `VITE_OIDC_CLIENT_ID`                | `huella-web` (fixed)                                                                                                                                                                         | `huella-web` — Clients → huella-web → **Client ID**.                                                                                                                                                                                                              |
| `VITE_OIDC_SCOPES`                   | `openid profile email offline_access` (`access_as_user` is a default scope in Keycloak — not requested here)                                                                                 | `openid profile email offline_access` — baseline OIDC scopes. `access_as_user` is a **default** client scope (unlike Entra), so it must **not** be listed here.                                                                                                   |
| `VITE_OIDC_REDIRECT_URI`             | `http://localhost:3000/auth/callback` (or your dev origin; `:5173` also whitelisted; defaults to `<origin>/auth/callback`)                                                                   | `https://<web-host>/auth/callback` — must exactly match an entry in `huella-web`'s **Valid redirect URIs** ([Admin Console step 3](#3-client-huella-web)).                                                                                                        |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Not set in dev — defaults to `<origin>/`                                                                                                                                                     | `https://<web-host>/` — must exactly match an entry in `huella-web`'s **Valid post-logout redirect URIs**.                                                                                                                                                        |

### Backend (API)

Dev:

```bash
AUTH_PROVIDER=jwks
JWKS_ISSUER=http://localhost:18080/realms/huella                             # = token `iss` (browser-facing host)
JWKS_URI=http://keycloak:8080/realms/huella/protocol/openid-connect/certs    # internal host, resolvable from the api container
JWKS_AUDIENCE=huella-api                                                     # from the realm's audience mapper
JWKS_REQUIRED_SCOPE=access_as_user                                          # default; can be omitted
# AZURE_TENANT_ID / AZURE_API_CLIENT_ID etc. — leave EMPTY
```

This block is also kept in `.env.dockercompose.example` (the "Keycloak (generic OIDC) example").

Production:

```bash
AUTH_PROVIDER=jwks
JWKS_ISSUER=https://<kc-public-host>/realms/huella
JWKS_URI=http://<keycloak-internal-host>:8080/realms/huella/protocol/openid-connect/certs
JWKS_AUDIENCE=huella-api
JWKS_REQUIRED_SCOPE=access_as_user
# JWKS_SKIP_SCOPE_CHECK left unset — never disable scope enforcement in production.
```

### Frontend (Web)

Dev:

```bash
VITE_OIDC_ISSUER=http://localhost:18080/realms/huella
VITE_OIDC_CLIENT_ID=huella-web
VITE_OIDC_SCOPES=openid profile email offline_access   # access_as_user is a default scope in Keycloak — not requested here
VITE_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback   # or your dev origin; defaults to <origin>/auth/callback
```

The realm's `huella-web` client already whitelists the `:3000` and `:5173` redirect URIs and web origins, so both the Docker web (`:3000`) and a host Vite dev server (`:5173`) work.

Production:

```bash
VITE_OIDC_ISSUER=https://<kc-public-host>/realms/huella
VITE_OIDC_CLIENT_ID=huella-web
VITE_OIDC_SCOPES=openid profile email offline_access
VITE_OIDC_REDIRECT_URI=https://<web-host>/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://<web-host>/
```

`VITE_OIDC_*` are build-time (Vite bakes them into the static bundle) — see [production-deployment.md](../operations/production-deployment.md#image-delivery-build--save--load): the `web` image must be rebuilt whenever these change, not just restarted.

---

## Verify End-to-End

**Dev:**

1. Bring up the stack with the overlay ([Bring Up — Dev](#bring-up--dev)).
2. Open the web app (http://localhost:3000).
3. Sign in / register against Keycloak.
4. Confirm you land back in the app authenticated and that an authenticated API call returns 200.

**Production:**

1. Bring up (or confirm already running) both the app stack and Keycloak, per [Bring Up — Production](#bring-up--production).
2. Open the production web app at `https://<web-host>`.
3. Sign in against the production `huella` realm.
4. Confirm the redirect lands back on `https://<web-host>/auth/callback` and the app shows an authenticated session.
5. Open browser DevTools → Network, and confirm an API call carries `Authorization: Bearer <token>` and returns **200** (not 401).
6. Optional deeper check: decode the access token's payload locally (`jwt.io`-style base64 decode, but do it locally — don't paste a real production token into a third-party site) and confirm `iss` = `https://<kc-public-host>/realms/huella`, `aud` includes `huella-api`, and `scope` includes `access_as_user`.

---

## Troubleshooting

| Symptom                                                                                | Likely cause                                                                                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API logs "JWKS client not configured" / every request 401s with a JWKS fetch failure   | `JWKS_URI` empty, or the host in it isn't reachable **from the API process**                                                                                                                                                                                   | Set `JWKS_URI` to a host that resolves from the API. Dev: `http://keycloak:8080/...` in compose, `http://localhost:18080/...` on host `pnpm dev`. Prod: an internal service name / internal DNS — see [the issuer/JWKS split](#the-issuer-vs-jwks-host-split).                                                           |
| "The iss claim value is not allowed"                                                   | `JWKS_ISSUER` / `VITE_OIDC_ISSUER` ≠ token `iss`                                                                                                                                                                                                               | Dev: set `JWKS_ISSUER=http://localhost:18080/realms/huella` (match `KC_HOSTNAME`). Prod: set both to `https://<kc-public-host>/realms/huella`, matching `KC_HOSTNAME` exactly (scheme, host, no trailing slash).                                                                                                         |
| "The aud claim value is not allowed"                                                   | `JWKS_AUDIENCE` ≠ `huella-api`, or (prod) the audience mapper is missing/disabled on `huella-web`                                                                                                                                                              | Set `JWKS_AUDIENCE=huella-api` (the realm's audience mapper). In prod, also verify the mapper — [Admin Console step 4](#4-audience-mapper--huella-api).                                                                                                                                                                  |
| "Token missing required scope"                                                         | `access_as_user` isn't a **default** client scope on `huella-web` (e.g. dropped during a manual client edit)                                                                                                                                                   | It's a default client scope in the imported realm — confirm you're using the `huella-web` client. In prod, re-add it under **Default client scopes** — [Admin Console step 5](#5-access_as_user-as-a-default-client-scope).                                                                                              |
| `redirect_uri` error at login                                                          | Web origin not in `huella-web`'s Valid redirect URIs, or `VITE_OIDC_REDIRECT_URI` doesn't match exactly ([generic explanation](../development/troubleshooting.md#oidc-redirect-uri-mismatch))                                                                  | Dev: use `:3000` or `:5173` (already whitelisted), or add your origin to the client. Prod: add the exact `<web-host>` origin — [Admin Console step 3](#3-client-huella-web).                                                                                                                                             |
| Realm/client missing after `up` (dev only)                                             | Import only runs on first boot                                                                                                                                                                                                                                 | `docker compose ... down -v` to drop the `keycloak-db` volume, then `up` to re-import. Do **not** do this in production once real users/data exist — see [Realm import](#realm-import).                                                                                                                                  |
| Admin console (or login) shows "We are sorry… HTTPS required"                          | Dev: the `keycloak-init` one-shot didn't run (it relaxes `master` to `sslRequired=NONE` automatically; the realm export only covers `huella`). Prod: `KC_PROXY_HEADERS` not set (or wrong mode) so Keycloak doesn't see the proxy's `X-Forwarded-Proto: https` | Dev: `docker compose ... up -d keycloak-init` (or the manual `kcadm` fallback — see [above](#https-required-on-the-admin-console)). Prod: set `KC_PROXY_HEADERS=xforwarded` (or `forwarded`) in `.env.prod.keycloak` and confirm the proxy actually forwards those headers — do **not** relax the realm's `sslRequired`. |
| Login works but redirects to the wrong scheme/host, or the admin console loops (prod)  | `KC_HOSTNAME` doesn't match the public URL, or `KC_HOSTNAME_STRICT` rejects the incoming `Host` header                                                                                                                                                         | Set `KC_HOSTNAME=https://<kc-public-host>` (full URL) and confirm the proxy sends that exact `Host`.                                                                                                                                                                                                                     |
| "Token payload missing email claim" (prod)                                             | User has no email set, or the `email` client scope was removed from `huella-web`'s default scopes                                                                                                                                                              | Ensure users have an email address; confirm `email` is still a default client scope.                                                                                                                                                                                                                                     |
| Users locked out after a few failed logins and stay locked longer than expected (prod) | Brute-force wait/reset thresholds too aggressive for your user base                                                                                                                                                                                            | Tune **Realm Settings → Security defenses → Brute force detection** ([step 7](#7-brute-force-protection)).                                                                                                                                                                                                               |
| Users with several tabs open get logged out mid-session (prod)                         | Refresh-token rotation reuse detection: concurrent silent renews from two tabs reuse a rotated token, and **Refresh Token Max Reuse = 0** revokes the whole session ([keycloak#16081](https://github.com/keycloak/keycloak/issues/16081))                      | Keep **Refresh Token Max Reuse** at `1` (the imported realm's value) — **Realm Settings → Tokens** ([step 6](#6-token--session-lifetimes)).                                                                                                                                                                              |

---

## Additional Resources

- [Generic OIDC Authentication Setup](./GenericOidcAuthenticationSetup.md) — the provider-agnostic contract this guide implements.
- [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md) — the alternative IdP for both dev and production.
- [Keycloak Server Administration Guide](https://www.keycloak.org/documentation)
- [Configuring a Reverse Proxy](https://www.keycloak.org/server/reverseproxy) — `KC_PROXY_HEADERS`, `KC_PROXY_TRUSTED_ADDRESSES`.
- [Configuring the Hostname (v2)](https://www.keycloak.org/server/hostname) — `KC_HOSTNAME`, `KC_HOSTNAME_STRICT`.
- [Production Deployment — On-Premise with External PostgreSQL](../operations/production-deployment.md) — the app's own compose/env pattern this guide mirrors for Keycloak's database.
- Artifacts: `compose/keycloak.dev.yaml` (dev overlay) · `compose/keycloak.prod.yaml` · `compose/keycloak-db.yaml` · `.env.prod.keycloak.example` · `infra/keycloak/dev/realm-huella.dev.json` (dev realm export) · `infra/keycloak/prod/realm-huella.prod.json` (prod realm export)

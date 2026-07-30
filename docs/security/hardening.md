# Infrastructure and Application Hardening

This document describes the security hardening controls applied to the Huella Latam platform — covering network isolation, transport security, HTTP security headers, input validation, file upload controls, and known gaps that require attention before Production deployment.

---

## Deployment topology (and what "the deployment" means here)

There is no single production deployment of Huella Latam. Each adopting country provisions and
operates its own instance, so the controls below describe **what the templates provision and
what the application enforces**, not the posture of one canonical environment.

Three topologies matter when reading this document:

| Topology                                       | Frontend                                      | API                                                        | Edge                                                       | Notes                                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Demo site** — <https://www.huellaslatam.org> | Azure Static Web Apps (SWA)                   | Azure App Service, **facing the public internet directly** | **No Azure Front Door**                                    | A **demonstration environment, not a production-grade deployment.** IdP is **Microsoft Entra ID**. Do not treat its configuration as a production reference. |
| **Country deployment (Azure)**                 | SWA (or any static host / container platform) | App Service (or any container platform)                    | Azure Front Door **optional, per adopting country**        | Front Door is an available hardening/CDN layer each country may choose; it is not required by the application.                                               |
| **Country deployment (self-hosted)**           | nginx container, plain HTTP on `8080`         | Fastify container, external PostgreSQL                     | **The operator's own reverse proxy / WAF — not this repo** | `docker-compose.prod.yml`; see [`../operations/production-deployment.md`](../operations/production-deployment.md). No Azure service is involved.             |

Because Front Door is optional, nothing in the application depends on it. Any control this
document attributes to Front Door applies **only** where a country has chosen to deploy it; the
App Service and SWA controls apply in the two Azure topologies. In the self-hosted topology
**none** of the Azure-platform controls below apply — the operator supplies their equivalents at
their own edge.

### TLS Enforcement

| Service                             | Enforcement                                             | Minimum TLS             |
| ----------------------------------- | ------------------------------------------------------- | ----------------------- |
| Azure Blob Storage                  | `supportsHttpsTrafficOnly: true` (Bicep)                | TLS 1.2                 |
| App Service (API)                   | HTTPS-only recommended via App Service `httpsOnly` flag | TLS 1.2 (Azure default) |
| Static Web App (frontend)           | HTTPS enforced by Azure (no HTTP access)                | TLS 1.2                 |
| Azure PostgreSQL                    | `sslmode=require` in `DATABASE_URL`                     | TLS enforced by server  |
| Azure Front Door — _optional layer_ | HTTPS redirect enabled; HTTP connections rejected       | TLS 1.2                 |

The table above covers the two Azure topologies. There, TLS is terminated by an Azure platform
service — App Service and SWA by default, Front Door additionally where a country deploys it —
and the platform's TLS 1.2+ suites are ECDHE-based, so those connections have forward secrecy.
`minTlsVersion` is pinned to 1.2 in `infra/modules/appService.bicep`, `storage.bicep`, and
`frontDoor.bicep`.

**The application never terminates TLS itself** and ships no certificate or cipher configuration
in any topology. In the self-hosted topology that means TLS, the certificate, the cipher suites
and any HTTP→HTTPS redirect are entirely the operator's responsibility: the `web` container
listens on plain HTTP (`apps/web/nginx.conf`, port `8080`) and expects a reverse proxy in front
of it. This repo cannot make any forward-secrecy or minimum-version claim about that edge.
Operators running self-hosted must verify their own proxy enforces TLS 1.2+ with ECDHE suites,
and must set `ALLOWED_ORIGIN` and the `VITE_*` URLs to the public HTTPS origin.

In the Azure topologies, all data in transit between application components and clients is encrypted, and plain HTTP is rejected or redirected at the infrastructure layer before requests reach application code.

### Proxy Trust

Fastify's `trustProxy` decides whether `X-Forwarded-For` may set `request.ip`. It is configured
per deployment through the **`TRUST_PROXY`** environment variable (`apps/api/src/config/environment.ts`,
wired into the Fastify constructor in `apps/api/src/app.ts`).

| `TRUST_PROXY`               | Effect                                                 | Use when                                            |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| unset / `false` _(default)_ | Trust nothing; `request.ip` is the TCP peer address    | The API is reached directly, with no proxy in front |
| `10.0.0.0/8,192.168.0.0/16` | Trust only these senders; comma-separated IPs or CIDRs | **Preferred.** You know your proxy's address range  |
| `1`                         | Trust that many proxy hops in front of the API         | A known-depth chain whose addresses are not fixed   |
| `loopback` / `uniquelocal`  | Fastify's named ranges                                 | A sidecar or same-host proxy                        |
| `true`                      | Trust the whole forwarded chain                        | Last resort — see the warning below                 |

**Why this must be set per deployment, and what each mistake costs.** `request.ip` is the rate
limiter's bucket key — `@fastify/rate-limit` (`apps/api/src/plugins/external/rate-limit.ts`,
100 req/min) keys on it explicitly. So:

- **Left unset behind a proxy**, every caller resolves to the proxy's address and the limit
  becomes **one shared bucket** instead of a per-client one: a single heavy caller exhausts the
  budget for everyone. Nothing fails visibly when this happens. It compounds with
  [Azure Front Door and WAF](#azure-front-door-and-waf) below — without Front Door, this limiter
  is the only rate-limiting protection there is. The API logs a warning at boot when
  `NODE_ENV=production` and `TRUST_PROXY` is unset, so the condition is at least discoverable.
- **Set to `true` while the API is internet-facing**, the opposite failure appears: a caller
  forges the header, mints a fresh bucket per request, and evades the limit entirely. Prefer an
  address allowlist or a hop count over `true`, which trusts whatever the caller sent when no
  proxy overwrote it.

The default is `false`, so a deployment that upgrades without setting the variable keeps its
previous behaviour rather than silently starting to trust a header.

Per topology: **self-hosted** — set it to your reverse proxy's address or range. **Azure App
Service without Front Door** — the platform front end still proxies to the container, so
`request.ip` without `TRUST_PROXY` is the platform's address, not the visitor's; `1` trusts that
single hop. **Azure with Front Door** — `2`, or the Front Door / App Service front-end ranges.
On Azure the value is supplied by the `apiTrustProxy` parameter in `infra/main.bicep`, which
emits the app setting; it defaults to empty so redeploying the template does not change request
handling on its own.

> **Verify the hop count against the real deployment before setting it.** Trusting fewer hops
> than exist leaves the shared bucket in place; trusting more lets a caller forge the header and
> select its own bucket. The parameter is deliberately not derived from `enableFrontDoor`,
> because the hop count is a property of the actual request path.

**A forwarded address is not always a bare IP.** Azure App Service appends the client's IP **and
ephemeral port** to `X-Forwarded-For` (`203.0.113.9:51234`), and proxy-addr passes that through
verbatim — so with `TRUST_PROXY` set, `request.ip` carries the port. Bucketing on that value
directly would give every TCP connection from one caller its own key, which does not merely fail
to fix the shared-bucket problem: it removes the rate limit altogether. The key generator
therefore normalizes the address to the bare IP (`toRateLimitKey` in
`apps/api/src/plugins/external/rate-limit.ts`), leaving IPv6 — bare or bracketed — intact.

**Logs are unaffected either way.** The request logger installs a custom `req` serializer
(`apps/api/src/app.ts`) emitting only `id`, `method`, `url` and `params`; it drops Fastify's
default `remoteAddress`. No IP is written to any log line and no table in the schema stores a
client IP — so there is no IP-based audit trail to corrupt with a forged header, and equally none
to investigate an incident with.

---

## HTTP Security Headers

`@fastify/helmet` is registered via `apps/api/src/plugins/external/helmet.ts`. The file follows the repo's autoloaded external-plugins pattern — a `fastify-plugin`-wrapped plugin plus an exported `autoConfig` object — so `@fastify/autoload` picks it up and registers it automatically; there is no manual wiring elsewhere.

The plugin applies helmet's secure header defaults **globally**, to every response:

| Header                                      | Purpose                                | Status                          |
| ------------------------------------------- | -------------------------------------- | ------------------------------- |
| `Strict-Transport-Security` (HSTS)          | Enforces HTTPS for future visits       | Set (helmet default)            |
| `X-Frame-Options`                           | Prevents clickjacking via iframes      | Set (helmet default)            |
| `X-Content-Type-Options`                    | Prevents MIME sniffing                 | Set (helmet default, `nosniff`) |
| `Referrer-Policy`                           | Controls referrer header exposure      | Set (helmet default)            |
| Cross-Origin-\* policies (COOP, CORP, etc.) | Isolates the origin from other origins | Set (helmet default)            |
| `Content-Security-Policy`                   | Restricts resource loading origins     | **Disabled** — see below        |

**`contentSecurityPolicy` is intentionally disabled.** The only HTML surface the API serves is the Swagger UI at `/api/docs`; its inline bootstrap script/styles would be blocked by helmet's default CSP, and a CSP adds little value for JSON responses that are never rendered as a document. This is a deliberate, documented trade-off recorded in the comment at the top of `helmet.ts`, not an outstanding gap.

---

## CORS

CORS is configured in `apps/api/src/plugins/external/cors.ts`, which **fails closed in production**: if `NODE_ENV=production` and `ALLOWED_ORIGIN` is unset, the module throws at boot, before the server ever starts accepting traffic.

```typescript
if (IS_PROD && !ALLOWED_ORIGIN) {
  throw new Error("ALLOWED_ORIGIN is required when NODE_ENV=production. ...");
}

export const autoConfig: FastifyCorsOptions = {
  origin: ALLOWED_ORIGIN || true,
  credentials: !!ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
};
```

| Aspect                                                      | Status                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Allowed methods                                             | GET, POST, PATCH, DELETE, PUT                                                                              |
| `credentials: true`                                         | Set only when `ALLOWED_ORIGIN` is explicitly configured                                                    |
| Production (`NODE_ENV=production`) without `ALLOWED_ORIGIN` | **Boot fails** — the app throws and refuses to start                                                       |
| Dev/test without `ALLOWED_ORIGIN`                           | `origin: true` — reflects any origin; this permissive fallback is reachable only when `IS_PROD` is `false` |

**Fail-closed by design:** the permissive fallback (`origin: true`, which would reflect any origin with credentials disabled) is a real cross-origin risk, so it is only ever reachable in local development and tests. In any environment running with `NODE_ENV=production`, a missing `ALLOWED_ORIGIN` now surfaces immediately as a startup crash instead of silently opening CORS to all origins — the misconfiguration can no longer reach a deployed environment undetected.

**Required configuration:**

| Environment       | `ALLOWED_ORIGIN` value                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Production        | `https://<production-static-web-app-hostname>` — **required; app will not boot without it** |
| Staging           | `https://<staging-static-web-app-hostname>` — required if `NODE_ENV=production`             |
| Local development | `http://localhost:5173` (or relevant dev port) — optional, falls back to permissive CORS    |

---

## Network Isolation

### Azure PostgreSQL Firewall

PostgreSQL Flexible Server is protected by an IP allowlist firewall. The Bicep module accepts an `allowedIpRanges` parameter — only IP ranges explicitly listed can connect to the database server.

In Production, only the App Service outbound IPs should be in the allowlist. No public internet access to the database is permitted.

### Azure Blob Storage Network ACLs

Storage accounts are configured with `defaultAction: 'Deny'` (configurable in Bicep). By default, only Azure services (`bypass: ['AzureServices']`) can access the storage account. This prevents direct public access to blob containers.

All client access to files goes through the API, which generates short-lived SAS tokens. SAS tokens provide scoped, time-limited access to specific blobs without exposing the storage account key.

### No Private Endpoints (Current State)

Private endpoints (VNet injection) for PostgreSQL and Blob Storage are not configured in the current Bicep modules. Network isolation relies on IP allowlists and Azure-managed service tags.

For higher-security deployments or compliance requirements, VNet integration and private endpoints should be added to the Bicep configuration.

---

## Azure Front Door and WAF

Azure Front Door is an optional component for Production (see [Infrastructure Requirements](../infrastructure/requirements.md)). When deployed with the Premium SKU, it provides:

| Feature            | Configuration                                           |
| ------------------ | ------------------------------------------------------- |
| HTTPS redirect     | Enabled — all HTTP traffic redirected to HTTPS          |
| Minimum TLS        | TLS 1.2                                                 |
| WAF rate limiting  | 100 requests/minute per IP (configurable: 10–10,000)    |
| DDoS protection    | Basic, included with Front Door                         |
| Global CDN caching | Available for static assets (not used by API responses) |

Without Front Door, the application is exposed directly via App Service and Static Web App hostnames. The API's in-memory rate limiter (100 req/min, not shared across instances) is the only protection. Front Door's WAF provides a superior, infrastructure-level rate limit that works across all App Service instances.

---

## Input Validation

All API endpoints validate request input using **Zod schemas** integrated via `fastify-type-provider-zod`. Validation is enforced at the Fastify framework level — invalid requests are rejected before reaching handler code.

| Input surface          | Validation                                     |
| ---------------------- | ---------------------------------------------- |
| Request body           | Zod schema, strict types                       |
| URL path parameters    | Zod schema (e.g., `z.coerce.number()` for IDs) |
| Query parameters       | Zod schema                                     |
| Response serialization | Zod schema, prevents unexpected field leakage  |

Validation happens in the Fastify `preValidation` lifecycle phase and returns a structured error response on failure. No raw SQL queries are constructed from user input — all database access goes through Prisma, which uses parameterized queries and prevents SQL injection by construction.

---

## File Upload Security

File uploads are handled via `@fastify/multipart` with the following limits:

| Limit                       | Value          |
| --------------------------- | -------------- |
| Maximum file size           | 20 MB per file |
| Maximum files per request   | 5              |
| Maximum non-file field size | 10 KB          |
| Maximum non-file fields     | 20             |

### Filename validation

File names are validated via a Zod schema in `packages/types/src/files/requestUpload/schemas.ts`:

- Maximum length: 255 characters
- Character set: printable ASCII only (`^[ -~]+$`)
- Forbidden characters: `/`, `\`, `:` (path traversal prevention)

### File type handling

Upload requests include a `fileType` field validated against an enum (`SUBMISSION`, `BADGE`). This restricts the purpose/category of uploads, not the MIME type.

**Known gap:** No MIME type validation is performed on uploaded files. A user could upload a file with a `.pdf` extension but containing arbitrary binary content. The MIME type is extracted after upload from the blob metadata, not validated before or during upload. For deployments where file content integrity matters, server-side MIME type validation (e.g., using `file-type` package on the stream) should be added.

---

## Authentication and Authorization

Authentication and authorization hardening is documented in detail in the dedicated documents:

- [Authentication](./authentication.md) — provider configuration, token validation, common attack surface
- [RBAC and Authorization](./rbac.md) — role model, permission enforcement, anonymous access

Key hardening points:

- JWT tokens are validated for signature, issuer, audience, expiry, and scope on every request.
- The `forced-user` and `none` auth providers must never be used in Production or Staging.
- Organization-level authorization is re-checked in each route handler; a valid token alone does not grant cross-organization access.

---

## Dependency Security

The monorepo's npm dependencies are pinned via a `pnpm-lock.yaml` lockfile. Dependency updates should go through a pull request and code review process — no automated dependency upgrades without review.

Known package security tools applicable to this stack:

- `pnpm audit` — checks for known vulnerabilities in installed packages
- GitHub Dependabot — can be configured to open PRs for security updates automatically
- CodeRabbit — automated code review on pull requests (already configured in CI)
- `zizmor` — static analysis of the GitHub Actions workflows themselves (action pinning, token permissions, credential persistence); runs as a CI gate, see [GitHub Actions Security](./github-actions-security.md)

---

## Hardening Checklist (Pre-Production)

| Item                                              | Status                    | Action                                                                                                                                            |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helmet plugin registered                          | ✅ Done                   | Registered via `apps/api/src/plugins/external/helmet.ts` (autoloaded); see [HTTP Security Headers](#http-security-headers)                        |
| `ALLOWED_ORIGIN` set in all environments          | ✅ Enforced in Production | Boot fails in Production without it (see [CORS](#cors)); still set explicitly per environment via App Service configuration / Key Vault reference |
| `AUTH_PROVIDER=jwks` in all deployed environments | ⚠️ Required               | Verify; `forced-user`/`none` must not appear in Production                                                                                        |
| PostgreSQL firewall allows only App Service IPs   | ⚠️ Verify                 | Review `allowedIpRanges` Bicep parameter per environment                                                                                          |
| HTTPS-only enforced on App Service                | ⚠️ Verify                 | Add `httpsOnly: true` to App Service Bicep module                                                                                                 |
| Front Door WAF enabled in Production              | ⚠️ Recommended            | Deploy with Premium SKU for WAF rate limiting                                                                                                     |
| MIME type validation on file uploads              | ❌ Missing                | Add content-type validation in file upload handler                                                                                                |
| `pnpm audit` run and issues addressed             | ⚠️ Ongoing                | Run before each release; address critical/high findings                                                                                           |
| Private endpoints for PostgreSQL + Storage        | ⚠️ Optional               | Add VNet integration for highest-security deployments                                                                                             |
| CMK encryption for database/storage               | ⚠️ Optional               | Required only if local regulation mandates it                                                                                                     |

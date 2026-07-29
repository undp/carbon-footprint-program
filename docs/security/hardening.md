# Infrastructure and Application Hardening

This document describes the security hardening controls applied to the Huella Latam platform — covering network isolation, transport security, HTTP security headers, input validation, file upload controls, and known gaps that require attention before Production deployment.

---

## Transport Security

### TLS Enforcement

| Service                   | Enforcement                                             | Minimum TLS             |
| ------------------------- | ------------------------------------------------------- | ----------------------- |
| Azure Blob Storage        | `supportsHttpsTrafficOnly: true` (Bicep)                | TLS 1.2                 |
| Azure Front Door          | HTTPS redirect enabled; HTTP connections rejected       | TLS 1.2                 |
| Azure PostgreSQL          | `sslmode=require` in `DATABASE_URL`                     | TLS enforced by server  |
| App Service (API)         | HTTPS-only recommended via App Service `httpsOnly` flag | TLS 1.2 (Azure default) |
| Static Web App (frontend) | HTTPS enforced by Azure (no HTTP access)                | TLS 1.2                 |

All data in transit between application components and clients is encrypted. Plain HTTP is rejected or redirected at the infrastructure layer before requests reach application code.

### Proxy Trust

The API runs behind Azure App Service, which may sit behind Azure Front Door or Azure's load balancer. When `trustProxy` is enabled in Fastify, the application trusts `X-Forwarded-For` and `X-Forwarded-Proto` headers to determine the real client IP and protocol. This setting should be verified to match the actual deployment topology to avoid IP spoofing via forged headers.

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

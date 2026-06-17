# Security Assessment — Huella Latam

**Repository:** `undp/carbon-footprint-program`
**Branch / Commit assessed:** `main` @ `ac1ce58`
**Date:** 2026-06-17
**Scope:** API source, web frontend, shared packages, Bicep infrastructure, Dockerfiles, docker-compose, CI workflow, secrets handling, and a production dependency audit.

---

## Overall Posture

The codebase is well above average for security maturity: boot-time route security validation, Zod validation on every route, parameterized SQL only, User Delegation SAS with 15-minute expiry, explicit field allowlists on updates, log redaction, Key Vault + OIDC federation, and non-root containers.

The serious problems are concentrated in **fail-open authentication configuration** and **one leftover demo behavior** that undermines the entire authorization model.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 3 |
| Medium   | 6 |
| Low      | 5 |

---

## Critical

### C1. Every newly provisioned user is created as SUPERADMIN

- **Affected:** `apps/api/src/plugins/app/userResolvePlugin.ts:47-56`
- **Risk:** On first authenticated request, unknown users are auto-created with `role: SystemRole.SUPERADMIN` — marked `// TODO: remove when finishing the demo`. This collapses the entire two-dimension RBAC model: signing up equals full system administration.
- **Exploitation:** Anyone who can register an account in the configured Entra External ID (CIAM) tenant — which for a public-facing citizen platform is typically self-service — logs in once and immediately holds SUPERADMIN: user management, organization blocking, system parameters, all admin maintainer screens, and (via H3) the ability to inject content rendered as raw HTML to every user.
- **Remediation:** Default to `SystemRole.USER`; rely on the existing `promote-superadmin` script for elevation. Add a regression test asserting new users get `USER`.

```ts
// apps/api/src/plugins/app/userResolvePlugin.ts:47-56
user = await prisma.user.create({
  data: {
    idpUserId: authUser.idpUserId,
    email: authUser.email,
    idpName: authUser.idpName,
    // TODO: remove when finishing the demo
    role: SystemRole.SUPERADMIN,   // <-- every new user becomes SUPERADMIN
    updatedAt: null,
  },
});
```

---

## High

### H1. Authentication configuration fails open — no production guards

- **Affected:** `apps/api/src/config/environment.ts:4,206-217`; `apps/api/src/auth/providers/jwksConfig.ts:93-127`; `apps/api/src/plugins/external/cors.ts:7-8`
- **Risk:** Several independent defaults each silently disable a security control, and nothing stops them in `NODE_ENV=production`:
  - `AUTH_PROVIDER` defaults to `"none"` → API fully unauthenticated.
  - `JWT_SECRET` defaults to `"super-secret-key"`, and when JWKS is not fully configured, `jwtConfig` **falls back to static HS256 with that secret** (`jwksConfig.ts:124-127`) — anyone can forge tokens.
  - JWKS configured but no issuer → only a `console.warn`; tokens from **any issuer** accepted (`jwksConfig.ts:94-101`). Audience validation is likewise skipped when unset. No explicit `algorithms: ["RS256"]` allowlist.
  - CORS defaults to `origin: true` when `ALLOWED_ORIGIN` is unset.
- **Exploitation:** A country deployment (this is a multi-deployer DPG — the riskiest consumer is the least experienced one) that misses one env var ships with auth disabled, forgeable tokens, or cross-tenant token acceptance, with no error and at most a log warning.
- **Remediation:** Add startup assertions: in production, refuse to boot if `AUTH_PROVIDER` is `none`/`forced-user`, if JWKS is enabled without resolved issuer **and** audience, or if the static-secret fallback would be used. Pin `verify.algorithms`. Default CORS to `origin: false` and require `ALLOWED_ORIGIN` explicitly.

### H2. Easy Auth header trust — `X-MS-CLIENT-PRINCIPAL` spoofable off-platform

- **Affected:** `apps/api/src/auth/providers/EasyAuthProvider.ts`
- **Risk:** The provider base64-decodes the principal header with no cryptographic verification. That is correct **only** when Azure App Service Easy Auth terminates in front of the app and strips client-supplied copies of the header.
- **Exploitation:** Any deployment running `AUTH_PROVIDER=easy-auth` outside App Service (on-prem docker, Container Apps without the auth sidecar, or a proxy forwarding client headers) lets an attacker send `X-MS-CLIENT-PRINCIPAL: base64({"claims":[{"typ":"emails","val":"victim@gob.xx"}]})` and impersonate anyone — and per C1, become SUPERADMIN.
- **Remediation:** Document the hard requirement loudly; add a production startup warning; consider validating the companion `X-MS-TOKEN-AAD-ID-TOKEN` or rejecting the provider when App Service environment markers (`WEBSITE_AUTH_ENABLED`) are absent.

### H3. Stored XSS via `rehype-raw` markdown rendering

- **Affected:** `apps/web/src/components/ExplanationContent.tsx:6,38`
- **Risk:** Explanation content (admin-maintained, served from the API) is rendered with `ReactMarkdown` + `rehypeRaw`, which passes raw HTML through unsanitized. `<img onerror=...>` or `<script>` in an explanation executes in every viewer's browser — where MSAL tokens live in `localStorage` and anonymous inventory UUIDs are also stored.
- **Exploitation:** Normally an admin→user trust-boundary issue; combined with C1 (anyone can be SUPERADMIN and edit maintainer content), it becomes an unauthenticated path to session/token theft for all users.
- **Remediation:** Add `rehype-sanitize` after `rehypeRaw` (with a schema that keeps KaTeX output), or drop raw-HTML support entirely if explanations only need markdown + math.

```tsx
// apps/web/src/components/ExplanationContent.tsx:38
rehypePlugins={[rehypeRaw, rehypeKatex]}   // rehypeRaw renders untrusted HTML verbatim
```

---

## Medium

### M1. No security headers on either tier

- **Affected:** `apps/web/nginx.conf` (no CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS, `Referrer-Policy`); `apps/api` — `@fastify/helmet` is in `package.json:27` but **no helmet plugin is registered** (`src/plugins/external/` has no `helmet.ts`).
- **Risk / Exploitation:** No CSP means H3-style XSS runs unimpeded; missing frame protections enable clickjacking; no HSTS permits downgrade on first visit.
- **Remediation:** Register `@fastify/helmet`; add the standard header set to `nginx.conf`. A CSP (even moderate, with `frame-ancestors 'none'`) is the single best mitigation for H3.

### M2. File preview/download lacks per-file authorization

- **Affected:** `apps/api/src/features/files/previewFile/service.ts:15-20` (explicit TODO), `route.ts:26` (`access: { mode: "private" }` only); similar pattern in `downloadFile`.
- **Risk:** Any authenticated user who learns a file UUID gets a read SAS URL for it — evidence documents, badges, terms — regardless of organization membership. UUIDs are random (not enumerable), but they circulate in API responses, exports, logs, and shared links, so this is a real horizontal-access (IDOR-by-capability) gap.
- **Remediation:** Implement the TODO: scope the lookup by the requesting user's ownership/organization relation and return 403/404 accordingly.

```ts
// apps/api/src/features/files/previewFile/service.ts:15-20
// TODO: Add actorId param and scope query by ownership/permission relation.
// Distinguish FileNotFoundError (404) from AuthorizationError (403) on null.
const file = await prisma.file.findUnique({
  where: { uuid, status: FileStatus.ACTIVE },
});
```

### M3. SVG uploads can carry scripts

- **Affected:** `apps/api/src/config/constants.ts:18-24` (`BADGE_ALLOWED_MIME_TYPES` includes `image/svg+xml`), `packages/constants/src/carbonInventory.ts` (inventory line files), `downloadFile`/`previewFile` services (SAS served with stored content type).
- **Risk:** Uploaded SVGs are served as `image/svg+xml` from the storage origin. Mitigating factor: that origin is `*.blob.core.windows.net`, not the app origin, so app cookies/tokens aren't directly exposed — but it still enables phishing pages and origin-confusion attacks under a Microsoft domain.
- **Remediation:** Drop SVG from allowed types, sanitize SVGs on upload, or force `Content-Disposition: attachment` / `Content-Type: application/octet-stream` on the SAS for SVG.

### M4. Unbounded pagination parameters

- **Affected:** `packages/types/src/common/pagination/schemas.ts:33-49`
- **Risk:** `limit`/`offset` validate as any digit string — `?limit=999999999` forces huge result sets; the 100 req/min rate limit doesn't stop a single expensive query. Datasets are explicitly expected to grow.
- **Remediation:** Add `.max()` bounds (e.g., limit ≤ 100–1000) and a server-side default.

### M5. Production dependency vulnerabilities (all transitive)

- **Source:** `pnpm audit --prod`: 32 advisories — 18 high, 13 moderate, 1 low. **No direct dependency is vulnerable.** Key chains:
  - `@azure/storage-blob → fast-xml-parser` (entity-expansion DoS, CVE-2026-33036, high)
  - `@fastify/swagger → fast-uri` (path traversal / host confusion, high) and `@fastify/swagger-ui → glob → minimatch` (ReDoS, high)
  - `exceljs → minimatch / tmp / uuid` (web bundle; the `tmp` path traversal is Node-only, effectively unexploitable in-browser)
  - `vite / rollup / picomatch / postcss` — build-time only.
- **Remediation:** Add `pnpm.overrides` in the root `package.json` for `fast-xml-parser`, `fast-uri`, `minimatch`, `yaml`; bump `vite` patch; add Dependabot/Renovate so this stays continuous (see L1).

### M6. Infrastructure hardening gaps (documented, worth closing)

- **Affected:** `infra/main.bicep:220-236` (WAF defaults to `Detection`, not `Prevention`); `infra/modules/postgres.bicep:59` (HA disabled, not parameter-exposed), `:75-84` (dev firewall `0.0.0.0` = all Azure services); PII (`email`, `taxId`, representative names) stored without field-level encryption — acknowledged in `docs/security/sensitive-data.md`.
- **Remediation:** Expose WAF mode and DB HA as bicepparam values with production defaults of `Prevention` / `ZoneRedundant`; document a production checklist that tightens the firewall rule; consider application-level encryption for tax IDs in compliance-sensitive deployments.

---

## Low

### L1. CI workflow hygiene

- **Affected:** `.github/workflows/ci.yml`
- The workflow is fundamentally safe (`pull_request` trigger, not `pull_request_target`; no secrets; `--frozen-lockfile`). Gaps: no top-level `permissions: contents: read` block (jobs get the default token scope), actions pinned by tag (`@v4`) rather than commit SHA (supply-chain drift), and no security jobs (no dependency audit, CodeQL, or secret scanning).
- **Remediation:** Add a `permissions` block, SHA-pin actions, add `pnpm audit --prod --audit-level=high` + CodeQL jobs.

### L2. MSAL token cache in `localStorage`

- **Affected:** `apps/web/src/config/msalConfig.ts:23`
- Standard SPA trade-off, but it raises the stakes of any XSS (H3). Consider `sessionStorage` if UX allows.

### L3. Anonymous inventory access path

- **Affected:** `apps/api/src/plugins/app/carbonInventoryAuthorizationPlugin.ts:182-191`
- Design is sound (DB-generated v4 UUID capability, sent via header not URL). Add focused rate limiting and mismatch logging on the anonymous path, since the UUID also sits in `localStorage` where XSS can read it.

### L4. Excel export formula injection

- **Affected:** `apps/web/src/services/excel.ts`, `apps/web/src/utils/exportCarbonInventoryToExcel.ts`
- Currently safe via ExcelJS writing strings as text, but add explicit `'`-prefix escaping for values starting with `= + - @` rather than relying on library behavior.

### L5. `JWKS_SKIP_SCOPE_CHECK` silently disables scope validation

- **Affected:** `apps/api/src/config/environment.ts:50-51`
- A legitimate escape hatch for non-Azure IdPs, but should log a prominent production warning.

---

## What's Done Well

- Boot-time **route security validator** that refuses to start on misconfigured routes (`routeSecurityValidatorPlugin.ts`).
- Zod `strictObject` schemas everywhere — no mass assignment; update services use explicit field allowlists.
- Only parameterized `$queryRaw`; no string-interpolated SQL.
- User Delegation SAS (no account keys), 15-min expiry, minimal `r` / `cw` permissions, HTTPS enforced.
- Filename sanitization blocking path traversal (`buildBlobPath.ts`).
- Error handler hides stack traces and internals in production; pino redaction of auth headers / cookies / passwords.
- Key Vault + RBAC + OIDC federation (no stored cloud credentials); non-root multi-stage Docker images.
- No hardcoded secrets anywhere in the tree; thorough security documentation in `docs/security/`.

---

## Top Concerns (Priority Order)

1. **C1 — SUPERADMIN-by-default user provisioning** (`userResolvePlugin.ts:53`): a one-line leftover that voids the entire authorization layer. Fix first; everything else is downstream of it.
2. **H1 — fail-open auth configuration**: add production boot guards for `AUTH_PROVIDER`, the JWT static-secret fallback, issuer/audience, and CORS. Critical for a platform whose whole model is "each country configures its own deployment."
3. **H3 + M1 — XSS via `rehype-raw` with no CSP anywhere**: sanitize the markdown and ship security headers (helmet + nginx) as the compensating control.
4. **H2 — Easy Auth header trust** outside Azure App Service: a deployment-portability footgun for on-prem adopters.
5. **M2 — file preview/download ownership check** (existing TODO): close the IDOR-by-UUID gap.
6. **M5 / L1 — dependency and CI hardening**: override the vulnerable transitive packages and make auditing continuous.

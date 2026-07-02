# Web App — Docker Image

Reference for the `apps/web` container image: architecture, build args, and standalone run.

For the **full-stack docker-compose workflow** (postgres + migrate + api + web), see [docker-compose.md](./docker-compose.md).

For a **line-by-line explanation of the nginx config** (the two ports, caching, SPA fallback, CSP and security headers — each with an example), see [web-nginx-config.md](./web-nginx-config.md).

Security headers (CSP, X-Content-Type-Options, Referrer-Policy, …) and serving hardening live in [`apps/web/nginx.conf`](../../apps/web/nginx.conf) + [`apps/web/security-headers.conf`](../../apps/web/security-headers.conf). Runtime env injection is still build-time only (one build per environment). See [Future improvements](#future-improvements).

---

## Architecture

| Aspect              | Choice                                                              |
| ------------------- | ------------------------------------------------------------------- |
| Runtime image       | `nginxinc/nginx-unprivileged:alpine-slim`                           |
| Listening port      | `8080` (non-privileged, default for nginx-unprivileged)             |
| User                | `nginx` (uid 101, non-root by default)                              |
| Builder image       | `node:24-alpine` (consistent with `apps/api/Dockerfile`)            |
| Build orchestration | `turbo prune --scope=web --docker` + `turbo build --filter=web`     |
| SPA routing         | nginx `try_files $uri $uri/ /index.html` (TanStack Router fallback) |
| Asset caching       | `/assets/*` → `Cache-Control: public, immutable`, 1y expiry         |
| Healthcheck         | BusyBox `wget` probe on `/` (port 8080), every 30s                  |

Stages: `pruner` isolates the workspace to web's package.json + lockfile, `builder` (Node) installs deps and compiles the SPA, `runner` (nginx) serves the static `dist/` output. The prune step keeps the dependency-install layer cached so it only re-runs when dependencies change, not on every source edit.

---

## Build-time environment variables

Vite inlines `import.meta.env.VITE_*` into the bundle at **build time**. Runtime changes require a new image — one build per environment.

| Variable                             | Required | Default | Purpose                                                                       |
| ------------------------------------ | -------- | ------- | ----------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`                  | ✅       | —       | Backend API base URL                                                          |
| `VITE_OIDC_ISSUER`                   | ✅       | —       | OIDC issuer / authority URL (Entra or Keycloak)                               |
| `VITE_OIDC_CLIENT_ID`                | ✅       | —       | Public SPA client ID                                                          |
| `VITE_OIDC_SCOPES`                   | ✅       | —       | Space-separated scopes (Entra: append `api://<API_CLIENT_ID>/access_as_user`) |
| `VITE_OIDC_REDIRECT_URI`             |          | origin  | Login redirect; defaults to `<origin>/auth/callback`                          |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` |          | origin  | Post-logout redirect; defaults to the serving origin                          |
| `VITE_IS_DEMO_APP`                   |          | `false` | Demo mode flag                                                                |
| `VITE_APP_VERSION`                   |          | `dev`   | Build identifier shown in the UI                                              |
| `VITE_LOCAL_BYPASS_REQUIRED_FIELDS`  |          | `false` | Local-only validation bypass (never in prod)                                  |

Source of truth: [`apps/web/src/config/environment.ts`](../../apps/web/src/config/environment.ts) and the `requiredEnvVars` check in [`apps/web/vite.config.ts`](../../apps/web/vite.config.ts).

---

## Build (standalone)

From the monorepo root (build context **must** be the root — the build needs the full workspace):

```bash
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_OIDC_ISSUER=https://login.microsoftonline.com/<tenant>/v2.0 \
  --build-arg VITE_OIDC_CLIENT_ID=<front-client-id> \
  --build-arg VITE_OIDC_SCOPES="openid profile email offline_access api://<api-client-id>/access_as_user" \
  --build-arg VITE_OIDC_REDIRECT_URI=https://app.example.com/auth/callback \
  -t huella-web:latest .
```

---

## Run (standalone)

```bash
docker run --rm -p 3000:8080 huella-web:latest
# → http://localhost:3000
```

Opening a deep route (e.g. `http://localhost:3000/dashboard`) and refreshing should serve `index.html` (SPA fallback) instead of returning 404.

For running it as part of the full stack, see [docker-compose.md](./docker-compose.md).

---

## Future improvements

Deliberately left out of this first version, to add when needed:

- **Container hardening** — `read_only: true` + tmpfs for `/tmp`, `/var/cache/nginx`, `/var/run`; drop capabilities. (Security _headers_ are already configured — see [web-nginx-config.md](./web-nginx-config.md).)
- **Runtime env injection** — envsubst entrypoint for a single multi-environment image (today the CSP origins and `VITE_*` are baked per build).
- **`apps/web/public/staticwebapp.config.json`** — legacy Azure Static Web Apps config, unused by nginx; remove once SWA deploys are retired.

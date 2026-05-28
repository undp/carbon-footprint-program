# Web App — Docker Image

Reference for the `apps/web` container image: architecture, build args, and standalone run.

For the **full-stack docker-compose workflow** (postgres + migrate + api + web), see [docker-compose.md](./docker-compose.md).

This is a minimal first version — no healthcheck, hardening, or runtime env injection yet. See [Future improvements](#future-improvements).

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

Stages: `pruner` isolates the workspace to web's package.json + lockfile, `builder` (Node) installs deps and compiles the SPA, `runner` (nginx) serves the static `dist/` output. The prune step keeps the dependency-install layer cached so it only re-runs when dependencies change, not on every source edit.

---

## Build-time environment variables

Vite inlines `import.meta.env.VITE_*` into the bundle at **build time**. Runtime changes require a new image — one build per environment.

| Variable                            | Required | Default | Purpose                                      |
| ----------------------------------- | -------- | ------- | -------------------------------------------- |
| `VITE_API_BASE_URL`                 | ✅       | —       | Backend API base URL                         |
| `VITE_AZURE_FRONT_CLIENT_ID`        | ✅       | —       | Azure MSAL frontend client ID                |
| `VITE_AZURE_AUTH_AUTHORITY`         | ✅       | —       | Azure tenant authority URL                   |
| `VITE_FRONT_BASE_URL`               | ✅       | —       | Public web base URL                          |
| `VITE_AZURE_API_CLIENT_ID`          | ✅       | —       | Azure MSAL API client ID                     |
| `VITE_IS_DEMO_APP`                  |          | `false` | Demo mode flag                               |
| `VITE_APP_VERSION`                  |          | `dev`   | Build identifier shown in the UI             |
| `VITE_LOCAL_BYPASS_REQUIRED_FIELDS` |          | `false` | Local-only validation bypass (never in prod) |

Source of truth: [`apps/web/src/config/environment.ts`](../../apps/web/src/config/environment.ts) and the `requiredEnvVars` check in [`apps/web/vite.config.ts`](../../apps/web/vite.config.ts).

---

## Build (standalone)

From the monorepo root (build context **must** be the root — the build needs the full workspace):

```bash
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_AZURE_FRONT_CLIENT_ID=<id> \
  --build-arg VITE_AZURE_AUTH_AUTHORITY=https://login.microsoftonline.com/<tenant> \
  --build-arg VITE_FRONT_BASE_URL=https://app.example.com \
  --build-arg VITE_AZURE_API_CLIENT_ID=<id> \
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

- **Healthcheck** — `wget --spider http://localhost:8080/` for orchestrator readiness.
- **Hardening** — `read_only: true` + tmpfs for `/tmp`, `/var/cache/nginx`, `/var/run`; drop capabilities.
- **Security headers** — CSP, HSTS, X-Content-Type-Options, Referrer-Policy in `nginx.conf`.
- **Runtime env injection** — envsubst entrypoint for a single multi-environment image.
- **`apps/web/public/staticwebapp.config.json`** — legacy Azure Static Web Apps config, unused by nginx; remove once SWA deploys are retired.

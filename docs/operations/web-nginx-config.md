# Web App — nginx configuration explained

Every directive in the web container's nginx setup, in plain language, with a concrete example of when it matters and why.

The config lives in two files:

- [`apps/web/nginx.conf`](../../apps/web/nginx.conf) — how nginx listens and serves.
- [`apps/web/security-headers.conf`](../../apps/web/security-headers.conf) — the security headers attached to every response.

> **Mental model:** nginx is the **doorman** of the app. It receives each visit from the browser, hands over the page's files, decides what may be cached, and stamps every response with security rules the browser then enforces.

For the image/build view (stages, build args, healthcheck) see [web-docker.md](./web-docker.md).

---

## The two ports (the most common confusion)

There are **two different ports**, and they don't have to match:

| Port               | What it is                                                   | Decided by        |
| ------------------ | ------------------------------------------------------------ | ----------------- |
| `8080` (internal)  | Where **nginx listens inside the container** (`listen 8080`) | nginx + the image |
| `3000` (published) | The address the **user types** (`localhost:3000`)            | docker-compose    |

docker-compose maps them with `HOST:CONTAINER`:

```yaml
ports:
  - "${WEB_PORT:-3000}:8080" # outside 3000 → inside 8080 (nginx)
```

**Request flow:** `browser → localhost:3000 → [Docker forwards] → container:8080 → nginx responds`. The user always goes _through_ nginx; they just enter via the published port and Docker routes them to nginx's internal port.

Why not make nginx listen on 3000 directly? Because the `nginx-unprivileged` image runs as a non-root user (uid 101), which can't bind ports below 1024 and is wired for 8080. Keep nginx on **8080 inside**, publish **whatever port you want outside**. To change the user-facing port, set `WEB_PORT` — do **not** touch `nginx.conf`.

**In production (on-prem):** the web container usually isn't published to a host port at all. The proxy manager reaches it over the internal Docker network at `web:8080`. Flow: `user → WAF → proxy manager → web:8080 (nginx)`.

---

## Serving basics (`nginx.conf`)

| Directive                     | What it does                                                 | Example                                                                                                     |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `listen 8080;`                | The port nginx accepts connections on, inside the container. | The proxy forwards to `app:8080` and nginx answers. 8080 (not 80) because a non-root user can't bind <1024. |
| `server_name _;`              | Which hostnames it answers to. `_` is a catch-all.           | A request for `app.example.com` or any host is served — there's only one app in the container.              |
| `server_tokens off;`          | Hides the nginx version from responses.                      | Without it, responses say `Server: nginx/1.31.2`, telling an attacker exactly which version's bugs to try.  |
| `root /usr/share/nginx/html;` | The folder files are served from.                            | A request for `/logo.png` is read from `/usr/share/nginx/html/logo.png` — where the Vite build was copied.  |
| `index index.html;`           | The default file for a directory request.                    | Visiting `/` serves `index.html`, the page that boots React.                                                |

---

## Client IP behind proxies (`nginx.conf`)

**Decision: not recovered at the container.** This container receives plain HTTP from the upstream proxy, so nginx's `$remote_addr` — and therefore every access-log line — shows the **proxy's** IP, not the visitor's.

We deliberately do **not** rewrite it from `X-Forwarded-For` (nginx's `real_ip` module). Trusting that header correctly depends on exactly how the upstream proxy populates it (append vs. replace, chain depth), which is deployment-specific — and a blanket "trust any private range" default just lets anyone who can reach the container forge their IP in the logs. Since `X-Forwarded-For` here would only feed logging (never authorization), that footgun isn't worth it.

**Where the real client IP lives:** upstream, in the **WAF / proxy manager access logs** — the authoritative source, recorded before the request ever reaches this container. Correlate by timestamp/request when you need per-user attribution.

> **If you want it in the container logs later** (opt-in, not a default): either pin `set_real_ip_from` to the proxy's _exact_ subnet — never the whole RFC 1918 space — or log the raw `X-Forwarded-For` as an informational field without letting it become `$remote_addr`.

---

## Performance & routing (`nginx.conf`)

| Directive / block                                    | What it does                                                              | Example                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gzip on; … gzip_types …`                            | Compresses text responses (like a .zip); the browser decompresses.        | A 1 MB JS file travels as ~250 KB → much faster load. Images are already compressed, so they're skipped. Drop this if the proxy already gzips.       |
| `location /assets/` → `expires 1y` + `immutable`     | Tells the browser to cache hashed assets for a year and never re-request. | Files are named `index-A8f3.js` (content hash in the name). Second visit → the browser reuses them → instant load. Safe: new content = new filename. |
| `location = /index.html` → `Cache-Control: no-cache` | The main document is always revalidated, never cached stale.              | After a deploy, the user sees the new app on reload (and it points at the new `/assets/`). Without it, they could keep seeing the old app.           |
| `location / { try_files $uri $uri/ /index.html; }`   | Serves `index.html` for unknown paths — makes client-side routing work.   | Refreshing on `/app/home` (no such file) returns `index.html`, and React renders the route. Without it, refreshing any inner screen would 404.       |
| `location ~ /\.(?!well-known) { deny all; }`         | Blocks access to dotfiles (`.env`, `.git`, …), except `/.well-known`.     | Someone probing `https://app/.env` for secrets gets `403`. `/.well-known` stays open (used for certs and OIDC discovery).                            |

> **nginx quirk — header inheritance:** `add_header` is _all-or-nothing_ per block. A `location` that defines its own `add_header` (the asset and document blocks set `Cache-Control`) **drops** the headers it would otherwise inherit. That's why the security headers live in `security-headers.conf` and are `include`d in those blocks — so they apply everywhere from one source.

---

## Security headers (`security-headers.conf`)

These are instructions nginx attaches to every response; the **browser** enforces them. They are the main defense against attacks that inject malicious code into the page.

> **Key idea:** these headers protect the **user** from malicious/injected code — they do **not** protect the app from the user. A user can disable them in their own browser (extensions, DevTools, a local proxy, or by skipping the browser with `curl`), but doing so only exposes themselves. **Real authorization and validation must always live server-side (API, storage)** — never rely on a client header for security.

### Content-Security-Policy (CSP)

An allow-list telling the browser which servers the page may load from, run code from, or connect to. If something isn't listed, the browser blocks it — even if an attacker managed to inject it.

The policy governs the **browser's** outbound behavior after the page loads — not what nginx serves. Your "web" is a frontend (served here) that, once running in the browser, talks to several services on their own domains (API, IdP, storage). The CSP is the list of which of those the browser may contact.

| Directive         | Value                        | What it controls / example                                                                                                                                                                                                                      |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                     | Fallback for any resource type without its own rule: same origin only.                                                                                                                                                                          |
| `connect-src`     | `'self' API IdP Storage`     | Which servers the browser may `fetch`/`PUT` to. **Upload example:** the browser `PUT`s a file straight to the storage host; it's allowed because storage is listed. A request to an unlisted host (e.g. injected code → `evil.com`) is blocked. |
| `script-src`      | `'self' 'unsafe-inline'`     | Where JS may run. An injected `<script src=evil.com>` is blocked (not `'self'`). `'unsafe-inline'` allows in-page scripts (needed by the UI lib) — the weakest part; migrate to nonces/hashes later.                                            |
| `style-src`       | `'self' 'unsafe-inline'`     | CSS sources. `'unsafe-inline'` is required by the CSS-in-JS of MUI/emotion.                                                                                                                                                                     |
| `img-src`         | `'self' data: blob: Storage` | Image sources. An org logo from storage (`<img src=storage…/logo.png>`) is allowed; `data:` = inlined icons; `blob:` = JS-generated previews.                                                                                                   |
| `font-src`        | `'self' data:`               | Fonts: same origin + inlined fonts. No external font CDNs.                                                                                                                                                                                      |
| `base-uri`        | `'self'`                     | Blocks `<base href=evil.com>` injection that would re-root every relative URL. (Doesn't fall back to `default-src`, so set explicitly.)                                                                                                         |
| `object-src`      | `'none'`                     | Blocks legacy plugins (`<object>`/`<embed>`, Flash). Unused and dangerous.                                                                                                                                                                      |
| `frame-ancestors` | `'none'`                     | Who may embed **us** in an iframe → nobody. Anti-clickjacking.                                                                                                                                                                                  |
| `frame-src`       | `'self' IdP`                 | Iframes **we** embed. The login does silent token renew via a hidden IdP iframe.                                                                                                                                                                |
| `form-action`     | `'self' IdP`                 | Where a `<form>` may POST. The login form posts to the IdP.                                                                                                                                                                                     |

The `API`, `IdP`, and `Storage` origins are not hardcoded — they're substituted at build time (see [Build-time origins](#build-time-origins)). The policy is deliberately **scoped** (no `https:` wildcard), so injected code has nowhere to exfiltrate data to.

### Other headers

| Header                             | What it does                                                            | Example                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `X-Content-Type-Options: nosniff`  | Forbids the browser from guessing a response's type.                    | A `.txt` upload that looks like JavaScript won't be executed as a script — it's treated as text.                               |
| `Referrer-Policy`                  | Limits how much of the URL is leaked to sites the user navigates to.    | From `https://app/inventory/12345`, an external link only sees `https://app` — not the path or the id.                         |
| `Permissions-Policy`               | Turns off browser features the app doesn't use (`feature=()` = denied). | Injected code can't turn on the camera or geolocation, because the app declared it doesn't use them.                           |
| `X-Frame-Options: DENY`            | Legacy clickjacking control for old browsers.                           | Belt-and-suspenders alongside `frame-ancestors 'none'` (which modern browsers honor).                                          |
| `Strict-Transport-Security` (HSTS) | **Commented out on purpose.** Forces HTTPS for future visits.           | The browser only honors it over HTTPS, and TLS terminates upstream (WAF/edge). Set HSTS **there**, not on this HTTP container. |

> **`always`** on each header: it's emitted even on error responses (4xx/5xx), so the protection doesn't drop exactly when something goes wrong.

---

## Build-time origins

The CSP can't be guessed — it needs the deployment's real server addresses. nginx has no runtime env (the `alpine-slim` runner), and the origins are known at build time, so [`apps/web/Dockerfile`](../../apps/web/Dockerfile) substitutes three placeholders into both files:

| Placeholder          | Filled from         | Example value                                |
| -------------------- | ------------------- | -------------------------------------------- |
| `__API_ORIGIN__`     | `VITE_API_BASE_URL` | `https://api.example.com`                    |
| `__IDP_ORIGIN__`     | `VITE_OIDC_ISSUER`  | `https://keycloak.example.com` (or Entra)    |
| `__STORAGE_ORIGIN__` | `STORAGE_ORIGIN`    | `https://storage.example.com` (MinIO / Blob) |

Each value is stripped to `scheme://host[:port]`. An empty value simply leaves that origin out of the policy (e.g. a no-auth local boot lists no IdP). Changing IdP, API, or storage means changing the env and **rebuilding** — never hand-editing the CSP line.

> `STORAGE_ORIGIN` must match MinIO's public presign endpoint **and** its CORS-allowed origin. CSP (browser may connect), presign endpoint (URL resolves), and CORS (server accepts) all point at the same storage host.

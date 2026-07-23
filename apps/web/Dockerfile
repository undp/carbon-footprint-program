# Stage 1: Base image with pnpm
# Digest-pinned for reproducibility; bump the tag and digest together.
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Node 26 no longer bundles Corepack, so install it from npm before enabling it.
# Corepack then provides the pnpm version pinned in package.json (packageManager).
RUN npm install -g corepack@latest && corepack enable

# Stage 2: Prune the workspace down to what 'web' needs
FROM base AS pruner
WORKDIR /app
# Copy first so corepack picks the pinned pnpm from package.json's packageManager.
COPY . .
# Run turbo via `pnpm dlx` (no global install → avoids the pnpm global-bin PATH issue).
# Pinned to the repo's turbo version (root package.json) so prune output stays
# compatible with the build — bump together when root turbo changes.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm dlx turbo@2.10.3 prune --scope=web --docker

# Stage 3: Build the SPA
FROM base AS builder
WORKDIR /app

# Build-time arguments for Vite (VITE_* variables are inlined into the bundle).
# Auth is generic OIDC — the IdP is selected per deployment via VITE_OIDC_*.
ARG VITE_API_BASE_URL
ARG VITE_OIDC_ISSUER
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_SCOPES
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ARG VITE_IS_DEMO_APP="false"
ARG VITE_APP_VERSION="dev"
ARG VITE_LOCAL_BYPASS_REQUIRED_FIELDS="false"

# Vite reads from process.env via loadEnv, so expose ARGs as ENV during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_OIDC_ISSUER=$VITE_OIDC_ISSUER \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID \
    VITE_OIDC_SCOPES=$VITE_OIDC_SCOPES \
    VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI \
    VITE_OIDC_POST_LOGOUT_REDIRECT_URI=$VITE_OIDC_POST_LOGOUT_REDIRECT_URI \
    VITE_IS_DEMO_APP=$VITE_IS_DEMO_APP \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_LOCAL_BYPASS_REQUIRED_FIELDS=$VITE_LOCAL_BYPASS_REQUIRED_FIELDS

# Install deps using only the pruned lockfile + package.json files.
# This layer is cached and only re-runs when dependencies change.
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy the pruned source and build (turbo builds workspace deps first)
COPY --from=pruner /app/out/full/ ./
RUN pnpm turbo build --filter=web

# Stage 4: Serve with nginx (non-root, port 8080)
# nginx STABLE branch (even minor, 1.30.x) on purpose: it ships only critical
# bug/security fixes with no feature or default-behavior changes — the right
# trade-off for a container that just serves the static SPA build (we use none
# of mainline's newer features, and stable gets the same security backports).
# Digest-pinned for reproducibility; bump the tag and digest together, and move
# to the next stable branch (1.32.x) deliberately rather than tracking mainline.
FROM nginxinc/nginx-unprivileged:1.30.3-alpine-slim@sha256:655c2473e24d2daa31668390db9fe519e0c5a76cbbddb6a18b7d0dc08a36b654 AS runner

# Origins for the build-time CSP (the runner has no runtime env). Picked up from
# the same compose build args as the Vite build; empty IdP issuer → no IdP origin
# in the CSP (the no-auth/local boot has no login flow to allow).
ARG VITE_OIDC_ISSUER
ARG VITE_API_BASE_URL
# Object-storage origin for the CSP (MinIO domain on-prem, Azure Blob host in
# cloud). Only consumed by nginx (the sed below), so it needs no VITE_ prefix.
ARG STORAGE_ORIGIN

USER root
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/security-headers.conf /etc/nginx/snippets/security-headers.conf
# Substitute the IdP/API/storage origins into the CSP. POSIX basic regex (busybox
# sed): strip everything after scheme://host[:port]. Applied to both the server
# config and the headers snippet.
RUN set -eu; \
    origin() { printf '%s' "${1:-}" | sed 's#\(http[s]*://[^/]*\).*#\1#'; }; \
    sed -i \
      -e "s#__IDP_ORIGIN__#$(origin "${VITE_OIDC_ISSUER:-}")#g" \
      -e "s#__API_ORIGIN__#$(origin "${VITE_API_BASE_URL:-}")#g" \
      -e "s#__STORAGE_ORIGIN__#$(origin "${STORAGE_ORIGIN:-}")#g" \
      /etc/nginx/conf.d/default.conf /etc/nginx/snippets/security-headers.conf
USER 101

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080

# Readiness probe — nginx serves the SPA on 8080. Uses BusyBox `wget`
# (curl isn't shipped in the alpine-slim image). 127.0.0.1 forces IPv4: nginx
# listens IPv4-only and BusyBox wget won't fall back from localhost→::1.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

# Stage 1: Base image with pnpm
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Prune the workspace down to what 'web' needs
FROM base AS pruner
WORKDIR /app
# Copy first so corepack picks the pinned pnpm from package.json's packageManager.
COPY . .
# Run turbo via `pnpm dlx` (no global install → avoids the pnpm global-bin PATH issue).
# Pinned to the repo's turbo major to keep prune output compatible with the build.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm dlx turbo@2.6.3 prune --scope=web --docker

# Stage 3: Build the SPA
FROM base AS builder
WORKDIR /app

# Build-time arguments for Vite (VITE_* variables are inlined into the bundle)
ARG VITE_API_BASE_URL
ARG VITE_AZURE_FRONT_CLIENT_ID
ARG VITE_AZURE_AUTH_AUTHORITY
ARG VITE_FRONT_BASE_URL
ARG VITE_AZURE_API_CLIENT_ID
ARG VITE_IS_DEMO_APP="false"
ARG VITE_APP_VERSION="dev"
ARG VITE_LOCAL_BYPASS_REQUIRED_FIELDS="false"

# Vite reads from process.env via loadEnv, so expose ARGs as ENV during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AZURE_FRONT_CLIENT_ID=$VITE_AZURE_FRONT_CLIENT_ID \
    VITE_AZURE_AUTH_AUTHORITY=$VITE_AZURE_AUTH_AUTHORITY \
    VITE_FRONT_BASE_URL=$VITE_FRONT_BASE_URL \
    VITE_AZURE_API_CLIENT_ID=$VITE_AZURE_API_CLIENT_ID \
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
FROM nginxinc/nginx-unprivileged:alpine-slim AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080

# Readiness probe — nginx serves the SPA on 8080. Uses BusyBox `wget`
# (curl isn't shipped in the alpine-slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

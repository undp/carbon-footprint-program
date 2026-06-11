# Stage 1: Base image with pnpm
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy necessary package.json files for dependency resolution
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/storage/package.json ./packages/storage/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/constants/package.json ./packages/constants/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY tools/seed/package.json ./tools/seed/

# Install dependencies for the api closure and the seed tool (used by the
# docker-compose `migrate` service to seed the database).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api... --filter @repo/seed...

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/storage/node_modules ./packages/storage/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/packages/constants/node_modules ./packages/constants/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/tools/seed/node_modules ./tools/seed/node_modules

# Copy all necessary source files
COPY packages/database ./packages/database
COPY packages/storage ./packages/storage
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/constants ./packages/constants
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api
COPY tools/seed ./tools/seed

# Build using turbo (automatically handles dependency order and prisma generate
# via prebuild). The api closure also builds @repo/storage, which @repo/seed
# imports; @repo/seed itself has no build step and runs from source via tsx.
WORKDIR /app
RUN pnpm turbo build --filter=api...

# Stage 4: Production image
FROM node:24-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable pnpm
RUN corepack enable

# Install curl for health checks and debugging
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# Copy workspace configuration
COPY --chown=fastify:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=fastify:nodejs apps/api/package.json ./apps/api/
COPY --chown=fastify:nodejs packages/database/package.json ./packages/database/
COPY --chown=fastify:nodejs packages/types/package.json ./packages/types/
COPY --chown=fastify:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=fastify:nodejs packages/constants/package.json ./packages/constants/
COPY --chown=fastify:nodejs packages/storage/package.json ./packages/storage/

# Copy database package dist folder (includes compiled code and generated client)
COPY --from=builder --chown=fastify:nodejs /app/packages/database/dist ./packages/database/dist

# Copy prisma source files needed for migrations
COPY --from=builder --chown=fastify:nodejs /app/packages/database/src/prisma ./packages/database/src/prisma

# Copy prisma config needed for prisma commands
COPY --from=builder --chown=fastify:nodejs /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts

# Copy types package dist folder
COPY --from=builder --chown=fastify:nodejs /app/packages/types/dist ./packages/types/dist

# Copy utils package dist folder
COPY --from=builder --chown=fastify:nodejs /app/packages/utils/dist ./packages/utils/dist

# Copy constants package dist folder
COPY --from=builder --chown=fastify:nodejs /app/packages/constants/dist ./packages/constants/dist

# Copy storage package dist folder
COPY --from=builder --chown=fastify:nodejs /app/packages/storage/dist ./packages/storage/dist

# Copy node_modules from builder (includes all dependencies properly resolved)
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/constants/node_modules ./packages/constants/node_modules
COPY --from=builder --chown=fastify:nodejs /app/packages/storage/node_modules ./packages/storage/node_modules
# Ensure @repo/types is available inside api node_modules (ESM resolution)
COPY --from=builder --chown=fastify:nodejs /app/packages/types/package.json ./apps/api/node_modules/@repo/types/package.json
COPY --from=builder --chown=fastify:nodejs /app/packages/types/dist ./apps/api/node_modules/@repo/types/dist

# Ensure @repo/constants is available inside types node_modules (ESM resolution
# from compiled @repo/types code, which imports @repo/constants)
COPY --from=builder --chown=fastify:nodejs /app/packages/constants/package.json ./packages/types/node_modules/@repo/constants/package.json
COPY --from=builder --chown=fastify:nodejs /app/packages/constants/dist ./packages/types/node_modules/@repo/constants/dist

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./apps/api/dist

# Switch to non-root user
USER fastify

# Expose the API port (default 8080, can be overridden with API_PORT env var)
EXPOSE 8080

# Change to api directory
WORKDIR /app/apps/api

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]


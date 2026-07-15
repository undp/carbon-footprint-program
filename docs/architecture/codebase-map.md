# Codebase Map

A one-screen orientation for new contributors. For depth, follow the links — this page
deliberately stays short and points to the canonical docs rather than duplicating them.

> Full detail: [System Architecture](./system-architecture.md) · [Tech Stack](./tech-stack.md) ·
> [API Conventions](../development/api-conventions.md) · [Frontend Architecture](../development/frontend-architecture.md) ·
> [Packages & Monorepo Internals](../development/packages.md)

## The monorepo at a glance

pnpm + Turborepo workspaces (Node ≥ 24, TypeScript strict/ESM, AGPL-3.0).

```
apps/
  api/    Fastify 5 + Prisma REST API — feature-sliced (route → handler → service)
  web/    React 19 + Vite 8 SPA — MUI v7 + Tailwind, TanStack Router + Query
packages/
  types/       Zod schemas + response types — the shared API contract (source of truth)
  database/    Prisma schema, migrations, generated client (@repo/database)
  storage/     Provider-agnostic object-storage adapter (Azure Blob | MinIO/S3)
  constants/   Shared, deployment-agnostic constants
  utils/       Shared pure helpers
  eslint-config/ · typescript-config/   Shared tooling bases
tools/seed/    Seed data + methodology loading
infra/         Azure Bicep IaC · docs/   Documentation
```

## Where things live

| I want to…                           | Go to                                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Add/modify an API endpoint           | `apps/api/src/features/<domain>/<useCase>/{route,handler,service}.ts` — see [API Conventions](../development/api-conventions.md)              |
| Change auth/authorization on a route | `apps/api/src/routing/` (`defineRoute` + `access`) — see [Route Access Modes](../security/route-access-modes.md), [RBAC](../security/rbac.md) |
| Add/change a request/response shape  | `packages/types/src/<domain>/` (Zod schemas), consumed by both apps                                                                           |
| Change the database schema           | `packages/database/src/prisma/schema.prisma` + a **new** migration — see [Migrations](../infrastructure/Migrations.md)                        |
| Add a web screen / route / data hook | `apps/web/src/{screens,routes,api/query}/` — see [Frontend Architecture](../development/frontend-architecture.md)                             |
| File upload / download               | `apps/api/src/features/files/` + `packages/storage/` (presigned-URL flow)                                                                     |
| Run it locally                       | [Local Setup](../development/local-setup.md) · [Environment Variables](../development/environment-variables.md)                               |

## Request flow (API)

`Browser → (OIDC Bearer token) → Fastify` → `authentication` (validate JWT via JWKS) →
`user resolution` → `authorization` (RBAC + per-domain access) → `route → handler → service`
→ Prisma / object storage → JSON response. Every route's access is declared up front and
validated at boot (the process refuses to start on a misconfigured route).

## Main domains

Carbon inventory (core: inventory → lines → inputs → factors → results, methodologies,
categories/subcategories, emission factors, units) · Organizations + memberships + org data +
profiling · Submissions/verification + files + badges/recognitions · Reduction projects &
plan initiatives · Admin (dashboard, requests, users/roles, catalog maintainers) ·
Transparency (public) · Terms & conditions · Chatbot (optional AI, `CHATBOT_ENABLED`).

## Conventions in one breath

Spanish-only UI (no i18n yet) · Conventional Commits, small modular commits ·
`pnpm format && pnpm lint && pnpm type-check` must pass before every commit ·
API integration tests with Vitest + Testcontainers · zero-warning lint gate in CI.
See [Contributing](../development/contributing.md) and [Testing](../development/testing.md).

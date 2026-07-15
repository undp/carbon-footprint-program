# Tech Stack

This document describes the technology stack as **actually implemented** in the codebase, validated against the original proposal (see [`docs/tech stack.pdf`](../tech%20stack.pdf)).

Discrepancies between the proposal and the current implementation are noted explicitly.

---

## Frontend (`apps/web`)

| Category                 | Technology                                           | Version   | Notes                                                                                              |
| ------------------------ | ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| **Framework**            | React                                                | 19        | ✅ As proposed                                                                                     |
| **Build tool**           | Vite                                                 | 7         | ✅ As proposed                                                                                     |
| **Routing**              | TanStack Router                                      | 1.x       | ✅ As proposed                                                                                     |
| **Server state / cache** | TanStack Query                                       | 5.x       | ✅ As proposed                                                                                     |
| **Global client state**  | Zustand                                              | 5.x       | ✅ As proposed                                                                                     |
| **Component library**    | Material UI (MUI)                                    | 7.x       | ⚠️ **Changed** — proposal recommended ShadCN/UI; MUI was adopted instead                           |
| **MUI add-ons**          | @mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers | 8.x       | Additional MUI ecosystem packages                                                                  |
| **Styling**              | Tailwind CSS                                         | 4.x       | ✅ As proposed (used alongside MUI)                                                                |
| **Forms**                | React Hook Form                                      | 7.x       | ✅ As proposed                                                                                     |
| **Schema validation**    | Zod                                                  | 4.x       | ✅ As proposed                                                                                     |
| **HTTP client**          | ky                                                   | 2.x       | ⚠️ **Changed** — proposal mentioned fetch/axios; ky was used instead                               |
| **Authentication**       | oidc-client-ts + react-oidc-context                  | 3.x / 3.x | ✅ Generic OIDC (Entra, Keycloak, …)                                                               |
| **Notifications**        | notistack                                            | 3.x       | Toast notification library                                                                         |
| **Date utilities**       | date-fns                                             | 4.x       | Date formatting and manipulation                                                                   |
| **File upload**          | react-dropzone                                       | 15.x      | Drag-and-drop file input                                                                           |
| **Excel export**         | exceljs                                              | 4.x       | Export reports to `.xlsx`                                                                          |
| **Fuzzy search**         | fuse.js                                              | 7.x       | Client-side fuzzy search                                                                           |
| **Math rendering**       | katex + react-markdown + rehype-katex                | —         | Rendering LaTeX formulas in UI                                                                     |
| **Markdown**             | react-markdown + remark-gfm                          | —         | Rendering markdown content                                                                         |
| **i18n**                 | _(not implemented)_                                  | —         | ❌ Proposal included i18next; not yet adopted                                                      |
| **Testing (unit)**       | Vitest + jsdom + React Testing Library               | —         | ✅ Logic layers (utils/hooks/stores/mappers/Chatbot) covered; global coverage floor enforced in CI |
| **Testing (E2E)**        | _(not implemented)_                                  | —         | ❌ Proposal included Playwright; not yet adopted                                                   |
| **FE monitoring**        | _(not implemented)_                                  | —         | ❌ Proposal included Azure App Insights JS SDK; not yet adopted                                    |

---

## Backend (`apps/api`)

| Category                | Technology                                                    | Version | Notes                                                                                                    |
| ----------------------- | ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| **Runtime**             | Node.js                                                       | ≥ 24    | ⚠️ **Upgraded** — proposal recommended Node 20 LTS; project uses Node 24+                                |
| **Framework**           | Fastify                                                       | 5.x     | ✅ As proposed                                                                                           |
| **Language**            | TypeScript                                                    | 5.x     | ✅ As proposed                                                                                           |
| **ORM**                 | Prisma                                                        | 7.x     | ✅ As proposed                                                                                           |
| **Schema validation**   | Zod                                                           | 4.x     | ✅ As proposed                                                                                           |
| **Logging**             | Pino                                                          | —       | ✅ As proposed (Fastify native)                                                                          |
| **API documentation**   | @fastify/swagger + @fastify/swagger-ui                        | —       | ✅ OpenAPI/Swagger auto-generated                                                                        |
| **Security**            | @fastify/cors + @fastify/helmet                               | —       | ✅ As proposed                                                                                           |
| **Rate limiting**       | @fastify/rate-limit                                           | —       | ✅ As proposed                                                                                           |
| **Overload protection** | @fastify/under-pressure                                       | —       | Health check and overload detection                                                                      |
| **JWT auth**            | @fastify/jwt + jwks-rsa                                       | —       | ✅ JWT validation via JWKS                                                                               |
| **File handling**       | @fastify/multipart                                            | —       | Multipart form support                                                                                   |
| **Azure Blob Storage**  | @azure/storage-blob + @azure/identity                         | —       | ✅ Managed identity auth                                                                                 |
| **Architecture**        | Modular monolith, feature-based                               | —       | ✅ As proposed — each feature is self-contained                                                          |
| **Testing**             | Vitest + @testcontainers/postgresql + @testcontainers/azurite | —       | ⚠️ **Changed** — proposal mentioned Supertest; integration tests use Testcontainers with real DB/storage |
| **Cache**               | _(not implemented)_                                           | —       | ❌ Proposal included Redis; not yet adopted                                                              |
| **Job queues**          | _(not implemented)_                                           | —       | ❌ Proposal included BullMQ; not yet adopted                                                             |
| **Observability**       | _(not implemented)_                                           | —       | ❌ Proposal included Azure App Insights + OpenTelemetry; not yet adopted                                 |

---

## Database

| Category         | Technology         | Version                     | Notes                                        |
| ---------------- | ------------------ | --------------------------- | -------------------------------------------- |
| **Database**     | PostgreSQL         | ≥ 15 (current: 18 on Azure) | Minimum 15 required for `NULLS NOT DISTINCT` |
| **ORM / client** | Prisma             | 7.x                         | Type-safe query builder + migrations         |
| **DB adapter**   | @prisma/adapter-pg | 7.x                         | Supports Azure AD token auth                 |

---

## Shared Packages

| Package                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `@repo/database`          | Prisma client, schema, migrations       |
| `@repo/types`             | Shared Zod schemas and TypeScript types |
| `@repo/constants`         | Shared constants (enums, config values) |
| `@repo/utils`             | Shared utility functions                |
| `@repo/eslint-config`     | Shared ESLint configurations            |
| `@repo/typescript-config` | Shared TypeScript base configs          |

---

## Infrastructure & DevOps

| Category                  | Technology                        | Notes                                                    |
| ------------------------- | --------------------------------- | -------------------------------------------------------- |
| **Cloud provider**        | Azure                             | ✅ As proposed                                           |
| **IaC engine**            | Azure Bicep                       | ✅ As proposed                                           |
| **Deployment management** | Azure Deployment Stacks           | Atomic resource lifecycle management                     |
| **Container registry**    | Azure Container Registry (ACR)    | Per-environment                                          |
| **API hosting**           | Azure App Service (containerized) | Node.js API via Docker                                   |
| **Frontend hosting**      | Azure Static Web App              | React SPA                                                |
| **Database**              | Azure PostgreSQL Flexible Server  | Managed PostgreSQL                                       |
| **File storage**          | Azure Blob Storage                | With Managed Identity                                    |
| **Secrets**               | Azure Key Vault                   | With RBAC                                                |
| **CDN / WAF**             | Azure Front Door                  | Optional                                                 |
| **Package manager**       | pnpm                              | 10.23                                                    |
| **Monorepo**              | Turborepo                         | 2.x                                                      |
| **CI/CD**                 | GitHub Actions                    | ✅ As proposed                                           |
| **Code quality**          | ESLint + Prettier                 | ✅ As proposed                                           |
| **Git hooks**             | _(not configured)_                | ❌ Proposal included Husky + lint-staged; not configured |

---

## Methodology Loader (`load_methodologies/`)

A standalone Python script for seeding emission factor data from Excel spreadsheets into the database. Used for initial data loading when deploying a new country instance.

| Category            | Technology             |
| ------------------- | ---------------------- |
| **Language**        | Python 3               |
| **Data processing** | pandas (Excel parsing) |
| **HTTP**            | requests (or similar)  |

---

## Summary of Discrepancies

| Category            | Proposed                           | Actual                                             | Impact                                                                           |
| ------------------- | ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Component library   | ShadCN/UI                          | Material UI (MUI) v7                               | MUI provides richer pre-built components at the cost of more opinionated styling |
| HTTP client         | fetch / axios                      | ky                                                 | Minor — ky is a lightweight fetch wrapper with a similar API                     |
| Node version        | Node 20 LTS                        | Node 24                                            | Forward-compatible — newer features available                                    |
| API testing         | Vitest + Supertest                 | Vitest + Testcontainers                            | More realistic integration tests with real DB/storage containers                 |
| Frontend tests      | Vitest + RTL + Playwright          | Vitest + RTL implemented; Playwright (E2E) not yet | Logic-layer regression coverage in place; render-heavy UI / E2E still uncovered  |
| i18n                | i18next + react-i18next            | Not implemented                                    | Platform is currently single-language (Spanish)                                  |
| Redis cache         | Redis                              | Not implemented                                    | No server-side caching layer; acceptable for current load                        |
| Job queues          | BullMQ                             | Not implemented                                    | No async job processing; all operations are synchronous                          |
| Observability       | Azure App Insights + OpenTelemetry | Not implemented                                    | No structured metrics or traces; only basic Pino logs                            |
| Git hooks           | Husky + lint-staged                | Not configured                                     | Linting enforced in CI but not pre-commit                                        |
| Frontend monitoring | Azure App Insights JS / OpenReplay | Not implemented                                    | No session recording or frontend error tracking                                  |

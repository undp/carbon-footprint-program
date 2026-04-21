# System Architecture

## High-Level Overview

Huella Latam is a **full-stack web application** organized as a **pnpm monorepo** managed with **Turborepo**. It follows a clean separation between frontend, backend, database, and infrastructure layers.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                        │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Azure Front Door (optional)                 │
│           CDN + WAF + Custom Domain + TLS                │
└────────────────┬────────────────────┬───────────────────┘
                 │                    │
                 ▼                    ▼
┌───────────────────────┐  ┌──────────────────────────────┐
│  Azure Static Web App  │  │     Azure App Service        │
│  (React SPA frontend) │  │  (Node.js / Fastify API)     │
│  apps/web             │  │  apps/api                    │
└───────────────────────┘  └──────────┬───────────────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              │                       │                      │
              ▼                       ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Azure PostgreSQL   │  │  Azure Blob Storage  │  │  Azure Key Vault    │
│  Flexible Server    │  │  (file attachments)  │  │  (secrets)          │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
              │
              ▼
┌─────────────────────┐
│  Azure Entra ID     │
│  (identity provider)│
└─────────────────────┘
```

---

## Monorepo Structure

```
huella-latam/
├── apps/
│   ├── api/          # Fastify backend (Node.js)
│   └── web/          # React + Vite frontend (SPA)
├── packages/
│   ├── database/     # Prisma schema, migrations, client
│   ├── types/        # Shared Zod schemas and TypeScript types
│   ├── constants/    # Shared constants
│   ├── utils/        # Shared utility functions
│   ├── eslint-config/ # Shared ESLint configs
│   └── typescript-config/ # Shared tsconfig bases
├── infra/            # Azure Bicep IaC
├── docs/             # Project documentation
└── load_methodologies/ # Python scripts for seeding methodology data
```

---

## Component Breakdown

### Frontend (`apps/web`)

A Single-Page Application (SPA) built with React 19 and Vite. It communicates with the API via HTTP using TanStack Query for data fetching and caching.

**Key responsibilities:**
- Render the user interface across all application domains
- Authenticate users via Azure MSAL (redirects to Azure Entra ID)
- Manage client-side routing (TanStack Router)
- Handle global UI state (Zustand)
- Manage form input and validation (React Hook Form + Zod)
- Upload files directly to Azure Blob Storage via SAS URLs

**Key libraries:**
- React 19, Vite 7
- TanStack Router v1 (type-safe routing)
- TanStack Query v5 (data fetching, caching, mutations)
- Material UI v7 (@mui/material, @mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers)
- Tailwind CSS v4 (utility styling)
- Zustand v5 (global state)
- React Hook Form v7 + Zod (forms and validation)
- ky (HTTP client)
- @azure/msal-browser + @azure/msal-react (authentication)
- notistack (toast notifications)
- date-fns (date utilities)
- react-dropzone (file upload UI)
- exceljs (Excel export)

**Build:** Static assets compiled by Vite, deployed to Azure Static Web App.

---

### Backend (`apps/api`)

A RESTful HTTP API built with Fastify v5. It follows a **feature-based modular monolith** architecture where each feature is a self-contained folder with its own handler, route, service, and schema files.

**Key responsibilities:**
- Authenticate and authorize requests (JWT validation via JWKS or Azure Easy Auth)
- Expose REST endpoints for all application domains
- Perform business logic and data validation
- Interact with PostgreSQL via Prisma
- Interact with Azure Blob Storage (generate SAS URLs, verify uploads)
- Auto-generate OpenAPI (Swagger) documentation

**Key libraries:**
- Fastify v5
- @fastify/jwt, jwks-rsa (token validation)
- @fastify/cors, @fastify/helmet (security headers)
- @fastify/rate-limit (rate limiting)
- @fastify/swagger + @fastify/swagger-ui (API docs at `/api/docs`)
- @fastify/multipart (file uploads)
- @fastify/under-pressure (overload protection)
- @fastify/autoload (auto-loads plugins and routes)
- fastify-type-provider-zod (Zod schema integration)
- Pino (structured JSON logging)
- Zod (request/response schema validation)
- @azure/identity + @azure/storage-blob (Azure Blob Storage via Managed Identity)
- Prisma client (via `@repo/database`)

**API domains / feature modules:**
| Module | Description |
|---|---|
| `users` | User registration, profile, role management |
| `organizations` | Organization CRUD, accreditation lifecycle |
| `carbonInventories` | Inventory creation, calculation, verification, recognition |
| `methodologies` | Methodology versions and metadata |
| `categories` / `subcategories` | Emission category hierarchy |
| `emissionFactors` / `emissionFactorDimensions` | Factor data per subcategory |
| `submissions` | Submission creation and review workflow |
| `badges` | Badge previews and recognition |
| `files` | File upload (SAS flow), download, delete |
| `reductionProjects` | Reduction project management |
| `transparency` | Public emissions rankings and views |
| `forms` | Dynamic form configuration |
| `requests` | Pending requests and admin actions |
| `systemParameters` | Country/system-level configuration values |
| `countryOrganizationSizes` / `countrySectors` / `organizationMainActivities` | Country taxonomy data |
| `measurementUnits` | Units of measurement catalog |
| `explanations` | Content blocks for UI guidance |
| `jobPositions` | Job position catalog |

**Authentication providers (configurable via `AUTH_PROVIDER` env var):**
| Provider | Use case |
|---|---|
| `jwks` | Production — validates Azure Entra ID JWT tokens via JWKS |
| `easy-auth` | Production (App Service) — trusts Azure Easy Auth headers |
| `forced-user` | Local development — bypasses auth with a fixed user |
| `none` | Unauthenticated mode (not recommended except for initial testing) |

**Plugin loading order:**
1. External plugins (CORS, Helmet, JWT, Swagger, Rate Limit, Under Pressure)
2. App plugins (Prisma client, Auth provider, Blob Storage)
3. Route autoload (`src/routes/`)

---

### Database (`packages/database`)

A shared package exposing the Prisma ORM client and schema. Both the API and migration scripts consume this package.

**Key responsibilities:**
- Define the PostgreSQL schema (Prisma schema)
- Generate a fully typed TypeScript client
- Manage migrations
- Provide the database connection adapter (supports Azure AD token authentication via `@prisma/adapter-pg`)

**Schema domains:**
- Country & configuration (country, country_parameter, system_parameter, status_catalog)
- Methodology & emission factors (methodology, category, subcategory, dimension, factor)
- Organizations & users (organization, organization_data, user, role)
- Carbon inventory & calculation (carbon_inventory, inventory_line, input, factor_used, result)
- Submissions & recognition (submission, submission_subject, award, badge)
- Files (file, badge link table, submission_file link table)
- Reduction & neutralization (reduction_project, neutralization_plan)

---

### Infrastructure (`infra/`)

Azure resources defined as Infrastructure as Code using **Azure Bicep**, deployed via **Azure Deployment Stacks**.

**Azure resources provisioned:**

| Resource | Purpose |
|---|---|
| **Azure App Service** | Hosts the Node.js API container |
| **Azure Container Registry (ACR)** | Stores Docker images for the API |
| **Azure Static Web App** | Hosts the compiled React SPA |
| **Azure PostgreSQL Flexible Server** | Primary relational database |
| **Azure Blob Storage** | Stores uploaded files (docs, certificates, badge images) |
| **Azure Key Vault** | Stores secrets (DB password, etc.) |
| **Azure Front Door** | CDN, WAF, TLS termination, custom domain (optional) |

**Access control:**
- App Service authenticates to Storage and PostgreSQL using **Managed Identity** (no stored credentials)
- Secrets managed via Azure Key Vault with RBAC (Key Vault Secrets Officer role)
- Developer group assigned roles automatically via Bicep for local development access

---

## Data Flow

### Typical API Request Flow

```
Browser
  │
  │  1. User authenticates via Azure Entra ID (MSAL redirect)
  │     → Receives JWT access token
  │
  │  2. Frontend makes HTTP request to API
  │     Authorization: Bearer <jwt>
  ▼
Azure Front Door (optional)
  │  TLS termination, WAF, routing
  ▼
Azure App Service (Fastify API)
  │
  ├─ 3. Auth plugin validates JWT:
  │     - JWKS: fetches public keys from Azure Entra ID JWKS endpoint
  │     - Easy Auth: reads X-MS-CLIENT-PRINCIPAL header
  │
  ├─ 4. Auth plugin resolves user from token (upsert in DB)
  │
  ├─ 5. Route handler invoked with authenticated user context
  │
  ├─ 6. Service layer executes business logic
  │     - Reads/writes to PostgreSQL via Prisma
  │     - May generate SAS URLs for Azure Blob Storage
  │
  └─ 7. Response returned to frontend (JSON)
```

### File Upload Flow (Two-Step SAS)

```
Frontend                         API                          Azure Blob Storage
    │                              │                                │
    │  POST /api/files/.../        │                                │
    │  request-upload              │                                │
    ├─────────────────────────────►│                                │
    │                              │  Generate SAS write URL        │
    │                              │  (15-minute expiry)            │
    │◄─────────────────────────────┤                                │
    │  { uploadUrl, uuid }         │                                │
    │                              │                                │
    │  PUT {uploadUrl}             │                                │
    │  (file binary, headers)      │                                │
    ├──────────────────────────────┼───────────────────────────────►│
    │                              │                                │  Blob stored
    │◄─────────────────────────────┼────────────────────────────────┤
    │  HTTP 201 from Azure         │                                │
    │                              │                                │
    │  POST /api/files/.../        │                                │
    │  confirm-upload { uuid }     │                                │
    ├─────────────────────────────►│                                │
    │                              │  Verify blob exists in Azure   │
    │                              │  Read mimeType + sizeBytes     │
    │                              │  Insert file record in DB      │
    │◄─────────────────────────────┤                                │
    │  FileRecord created          │                                │
```

---

## External Integrations

| Integration | Purpose | Authentication |
|---|---|---|
| **Azure Entra ID (CIAM or Organizational)** | User identity, JWT issuance | OAuth 2.0 / OIDC |
| **Azure Blob Storage** | File storage for documents and badges | Managed Identity (API), SAS URLs (browser) |
| **Azure Key Vault** | Secrets management (DB password, etc.) | Managed Identity + RBAC |
| **Azure App Insights** *(planned)* | Application performance monitoring | Connection string |

---

## Critical Components

These components are essential for correct system operation; failures here affect the entire platform:

1. **PostgreSQL Flexible Server** — All application data lives here. Requires PostgreSQL ≥ 15.
2. **Azure App Service (API)** — All business logic is served from here. Stateless; can scale horizontally.
3. **Azure Entra ID** — Token issuance and validation. All authenticated requests depend on this.
4. **Azure Key Vault** — If unavailable at startup, the API cannot retrieve DB credentials (in production).
5. **Prisma Migrations** — Must be run explicitly before first deployment and after each schema change. Failures can leave the DB in an inconsistent state.
6. **Azure Container Registry** — Required to pull API Docker images during App Service deployment.

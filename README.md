# Huella Latam

Full-stack monorepo for the Huella Latam project, built with modern web technologies and deployed on Azure.

## 📋 Table of Contents

- [Overview](#-overview)
- [Sustainable Development Goals](#-sustainable-development-goals)
- [Digital Public Good](#-digital-public-good)
- [Tech Stack](#-tech-stack)
- [Monorepo Structure](#-monorepo-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Development Workflow](#-development-workflow)
- [Available Scripts](#-available-scripts)
- [Working with Packages](#-working-with-packages)
- [Adding New Libraries](#-adding-new-libraries)
- [Deployment](#-deployment)
- [Project Architecture](#-project-architecture)
- [Contributing](#-contributing)

## 🌟 Overview

Huella Latam is a country-agnostic, full-stack platform for measuring, managing and reducing organisational carbon footprints in Latin America and the Caribbean. The codebase is centrally maintained and independently deployed by each adopting country on its own infrastructure. Country-specific variation is expressed through configuration, seed data and system parameters — never through code forks. The project was developed by the United Nations Development Programme (UNDP) under Project 01000983 (Climate Hub) in support of the [UNDP Climate Promise](https://climatepromise.undp.org/) initiative.

### Key Features

- 🚀 **Fast Development** - Hot reload for both frontend and backend
- 🔒 **Type-Safe** - End-to-end TypeScript with Zod validation
- 📦 **Monorepo** - Efficient code sharing with pnpm workspaces
- 🏗️ **Infrastructure as Code** - Azure Bicep for reproducible deployments
- 🧪 **Testing** - Vitest for unit and integration tests
- 📚 **Auto-Generated Docs** - Swagger/OpenAPI documentation

## 🌎 Sustainable Development Goals

Huella Latam is designed and maintained as a contribution to the **UN 2030 Agenda**. It is anchored in the **Paris Agreement**, in countries' **Nationally Determined Contributions (NDCs)**, and in national **MRV** (Measurement, Reporting and Verification) systems.

- **Primary goal — SDG 13 (Climate Action)**: targets 13.2 (integrate climate measures into national policies), 13.3 (climate awareness and capacity), 13.b (capacity for climate-change planning and management).
- **Secondary goals**: SDG 12 (Responsible Consumption and Production, target 12.6 — corporate sustainability reporting), SDG 17 (Partnerships, targets 17.16, 17.17, 17.18 — multi-stakeholder partnerships and high-quality disaggregated data), SDG 11 (Sustainable Cities, target 11.6) and SDG 9 (Innovation and Infrastructure, targets 9.1 and 9.4) as enabling cross-cutting goals.

The full mapping with target-by-target evidence and KPIs lives at [`docs/overview/sdg-alignment.md`](./docs/overview/sdg-alignment.md).

## 🌐 Digital Public Good

The project is being prepared for submission to the [Digital Public Goods Alliance (DPGA)](https://digitalpublicgoods.net/) registry against the **DPGA Standard v1.1.6**. Evidence per indicator:

| #   | Indicator                         | Primary evidence                                                                                                   |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | SDG Relevance                     | [`docs/overview/sdg-alignment.md`](./docs/overview/sdg-alignment.md)                                               |
| 2   | Open Licensing                    | [`LICENSE`](./LICENSE) (MIT, OSI-approved)                                                                         |
| 3   | Clear Ownership                   | [`AUTHORS`](./AUTHORS), [`MAINTAINERS.md`](./MAINTAINERS.md), [`NOTICE`](./NOTICE)                                 |
| 4   | Platform Independence             | [`docs/governance.md`](./docs/governance.md) (roadmap)                                                             |
| 5   | Documentation                     | [`docs/`](./docs/), Swagger/OpenAPI                                                                                |
| 6   | Data Extraction (non-PII)         | [`docs/development/data-export.md`](./docs/development/data-export.md)                                             |
| 7   | Privacy and Applicable Laws       | [`PRIVACY.md`](./PRIVACY.md), [`docs/security/sensitive-data.md`](./docs/security/sensitive-data.md)               |
| 8   | Standards and Best Practices      | [`docs/governance/principles-for-digital-development.md`](./docs/governance/principles-for-digital-development.md) |
| 9A  | Privacy and Security of PII       | [`docs/security/`](./docs/security/), [`PRIVACY.md`](./PRIVACY.md)                                                 |
| 9B  | Inappropriate and Illegal Content | [`docs/governance/acceptable-use.md`](./docs/governance/acceptable-use.md)                                         |
| 9C  | Anti-Harassment                   | [`docs/governance.md`](./docs/governance.md) (Not Applicable, justified)                                           |

Governance overview: [`docs/governance.md`](./docs/governance.md).
Code of conduct: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
Security disclosure: [`SECURITY.md`](./SECURITY.md).

## 🛠 Tech Stack

### Core Technologies

- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[Turborepo](https://turbo.build/)** - High-performance build system for monorepos
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Zod](https://zod.dev/)** - Schema validation with TypeScript inference

### Backend (`apps/api`)

- **[Fastify](https://fastify.dev/)** - Fast and low overhead web framework
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM for PostgreSQL
- **[Pino](https://getpino.io/)** - Super fast JSON logger
- **[JWT](https://jwt.io/)** - Authentication with JSON Web Tokens
- **[Swagger](https://swagger.io/)** - OpenAPI documentation

### Frontend (`apps/web`)

- **[React 19](https://react.dev/)** - UI library
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling
- **[TanStack Router](https://tanstack.com/router)** - Type-safe routing
- **[TanStack Query](https://tanstack.com/query)** - Data fetching and caching
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS
- **[Radix UI](https://www.radix-ui.com/)** - Headless UI components
- **[Zustand](https://zustand-demo.pmnd.rs/)** - State management

### Infrastructure

- **[Azure Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)** - Infrastructure as Code
- **[Azure PostgreSQL](https://azure.microsoft.com/services/postgresql/)** - Managed database
- **[Azure Key Vault](https://azure.microsoft.com/services/key-vault/)** - Secrets management
- **[Azure Storage](https://azure.microsoft.com/services/storage/)** - File storage

## 📁 Monorepo Structure

```
huella-latam/
├── apps/                          # Applications
│   ├── api/                       # Backend API (Fastify + Prisma)
│   │   ├── src/
│   │   │   ├── features/          # Feature-based organization
│   │   │   ├── plugins/           # Fastify plugins
│   │   │   ├── routes/            # API routes
│   │   │   ├── types/             # TypeScript types
│   │   │   ├── config/            # Configuration
│   │   │   └── server.ts          # Server entry point
│   │   ├── dist/                  # Compiled output
│   │   ├── package.json
│   │   └── README.md              # API documentation
│   │
│   └── web/                       # Frontend app (React + Vite)
│       ├── src/
│       │   ├── routes/            # TanStack Router routes
│       │   ├── components/        # React components
│       │   ├── lib/               # Utilities
│       │   └── main.tsx           # App entry point
│       ├── dist/                  # Build output
│       ├── package.json
│       └── vite.config.ts
│
├── packages/                      # Shared packages
│   ├── database/                  # Prisma schema and client
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   └── migrations/        # Database migrations
│   │   ├── generated/             # Generated Prisma client
│   │   ├── adapter.ts             # Database adapter
│   │   ├── package.json
│   │   └── README.md              # Database documentation
│   │
│   ├── eslint-config/             # Shared ESLint configurations
│   │   ├── base.ts                # Base config
│   │   ├── api.ts                 # Backend config
│   │   ├── web.ts                 # Frontend config
│   │   └── package.json
│   │
│   └── typescript-config/         # Shared TypeScript configurations
│       ├── base.json              # Base tsconfig
│       ├── api.json               # Backend tsconfig
│       ├── web.json               # Frontend tsconfig
│       └── package.json
│
├── infra/                         # Infrastructure as Code (Azure Bicep)
│   ├── main.bicep                 # Main orchestrator
│   ├── modules/                   # Reusable Bicep modules
│   │   ├── keyVault.bicep         # Azure Key Vault
│   │   ├── postgres.bicep         # PostgreSQL Flexible Server
│   │   └── storage.bicep          # Azure Storage Account
│   ├── params/                    # Environment-specific parameters
│   │   └── main.development.bicepparam    # Development parameters
│   ├── deploy.sh                  # Deployment script
│   ├── delete-stack.sh            # Stack deletion script
│   └── view-stack.sh              # Stack inspection script
│
├── docs/                          # Project documentation
│   └── Infra/
│       └── Deployment.md          # Infrastructure deployment guide
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace configuration
├── turbo.json                     # Turborepo configuration
├── .envrc                         # Environment variables (not committed)
└── README.md                      # This file
```

## 📋 Prerequisites

### Required Software

- **Node.js** >= 24.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 10.23.0 ([Install](https://pnpm.io/installation))
- **Docker** (for local PostgreSQL) ([Download](https://www.docker.com/))
- **Azure CLI** (for deployments) ([Install](https://learn.microsoft.com/cli/azure/install-azure-cli))
- **[direnv](https://direnv.net/)** - Automatic environment variable loading

### Verify Installation

```bash
node --version    # Should be >= 24.0.0
pnpm --version    # Should be >= 10.23.0
docker --version  # Any recent version
az --version      # For deployments only
```

### Optional Tools

- **[Prisma Studio](https://www.prisma.io/studio)** - Database GUI (included)

## 🚀 Getting Started

**Note**: This section provides a quick-start guide for the entire monorepo. For detailed app-specific setup and advanced configuration, see:

- [apps/api/README.md](./apps/api/README.md) - Backend API documentation
- [apps/web/README.md](./apps/web/README.md) - Frontend application documentation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/undp-huella-latam.git
cd undp-huella-latam
```

### 2. Install Dependencies

```bash
# Install all dependencies across the monorepo
pnpm install
```

This will install dependencies for:

- Root workspace
- Both apps (`api`, `web`)
- All packages (`database`, `eslint-config`, `typescript-config`)

### 3. Setup Environment Variables

Create a `.envrc` file in the root directory:

```bash
# Database Configuration
export DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb"

# API Configuration
export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
export LOG_LEVEL="debug"
export NODE_ENV="development"
```

**Option A: Using direnv** (recommended)

```bash
direnv allow
```

**Option B: Manual loading**

```bash
source .envrc
```

### 4. Start Local Database

```bash
cd packages/database
docker compose up -d # Run the container in detached mode
```

This starts a PostgreSQL container with the configuration from `docker-compose.yml`.

### 5. Run Database Migrations and Seeds

```bash
cd packages/database
pnpm dev:migrate
```

This will:

- Apply all pending migrations
- Create the database schema

Then, you must generate the full-typed client

```bash
cd packages/database
pnpm dev:generate
```

Finally, you must run the project seeds

```bash
cd packages/database
pnpm dev:seed
```

### 6. Start Development Servers

From the **root directory**, run:

```bash
pnpm dev
```

This will start:

- **API**: http://localhost:8080
- **Web**: http://localhost:5173
- **Swagger Docs**: http://localhost:8080/docs

Both servers support hot reload and will restart automatically on code changes.

## 🔐 Environment Variables

### Root `.envrc` (Development)

```bash
# Database
export DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb"

# API
export JWT_SECRET="your-secret-key"
export LOG_LEVEL="debug"        # debug | info | warn | error
export NODE_ENV="development"   # development | production
```

### Infrastructure `.envrc` (Azure Deployment)

Create `infra/.envrc` for Azure deployments:

```bash
# Azure Subscription
export AZURE_SUBSCRIPTION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# Azure Resource Group
export ENVIRONMENT="development" # production, staging or development
export AZURE_RESOURCE_GROUP="undp-huella-latam-$ENVIRONMENT-rg"
export AZURE_SUBSCRIPTION_GROUP="users-group-name"
# Location 'eastus' is not available for subscriptions with free trial.
export LOCATION="eastus2"
```

### Environment Variable Loading

The project uses a hierarchical approach:

1. **Root `.envrc`** - Loaded by all apps and packages
2. **Turbo `globalEnv`** - Environment variables tracked for caching

**Important**: Never commit `.envrc` or `.env` files! They are in `.gitignore`.

## 💻 Development Workflow

### Running Individual Apps

```bash
# Run only the API
pnpm --filter api dev

# Run only the Web app
pnpm --filter web dev

# Run only the database
cd packages/database && pnpm dev:studio
```

### Building for Production

```bash
# Build all apps and packages
pnpm build

# Build specific app
pnpm --filter api build
pnpm --filter web build
```

### Running in Production Mode

```bash
# Build first
pnpm build

# Start production servers
pnpm start
```

### Code Quality

```bash
# Lint all code
pnpm lint

# Type-check all TypeScript
pnpm type-check

# Format all code
pnpm format

# Check formatting without changes
pnpm format:check
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm --filter api test
pnpm --filter web test
```

### Cleaning Build Artifacts

```bash
# Clean all build outputs
pnpm clean

# Clean specific app
pnpm --filter api clean
```

## 📜 Available Scripts

### Root Scripts

| Script              | Description                 | Usage        |
| ------------------- | --------------------------- | ------------ |
| `pnpm dev`          | Start all apps in dev mode  | Development  |
| `pnpm build`        | Build all apps              | Production   |
| `pnpm start`        | Start all apps in prod mode | Production   |
| `pnpm lint`         | Lint all code               | Code quality |
| `pnpm type-check`   | Check TypeScript types      | Code quality |
| `pnpm test`         | Run all tests               | Testing      |
| `pnpm format`       | Format all code             | Code style   |
| `pnpm format:check` | Check formatting            | CI/CD        |
| `pnpm clean`        | Remove build artifacts      | Maintenance  |

### API Scripts

| Script            | Description               |
| ----------------- | ------------------------- |
| `pnpm dev`        | Start API with hot reload |
| `pnpm build`      | Compile TypeScript        |
| `pnpm start`      | Start production server   |
| `pnpm lint`       | Lint API code             |
| `pnpm type-check` | Check types               |
| `pnpm test`       | Run API tests             |

### Web Scripts

| Script            | Description              |
| ----------------- | ------------------------ |
| `pnpm dev`        | Start Vite dev server    |
| `pnpm build`      | Build for production     |
| `pnpm start`      | Preview production build |
| `pnpm lint`       | Lint web code            |
| `pnpm type-check` | Check types              |
| `pnpm test`       | Run web tests            |

### Database Scripts

| Script              | Description              |
| ------------------- | ------------------------ |
| `pnpm dev:generate` | Generate Prisma Client   |
| `pnpm dev:migrate`  | Run migrations (dev)     |
| `pnpm dev:studio`   | Open Prisma Studio GUI   |
| `pnpm dev:reset`    | Reset database           |
| `pnpm prod:deploy`  | Deploy migrations (prod) |

## 📦 Working with Packages

### Using Shared Packages

Shared packages are automatically available to apps through the workspace protocol:

```json
{
  "dependencies": {
    "@repo/database": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*"
  }
}
```

### Importing from Shared Packages

```typescript
// In any app or package
import { PrismaClient } from "@repo/database";
import type { User } from "@repo/database";
```

### Using Catalog Dependencies

The workspace uses pnpm catalogs for shared dependencies:

```yaml
# pnpm-workspace.yaml
catalogs:
  shared:
    "@types/node": ^24.10.1
    typescript: ^5.9.3
    zod: ^4.1.12
    # ... more shared versions
```

Use in packages:

```json
{
  "dependencies": {
    "zod": "catalog:shared",
    "typescript": "catalog:shared"
  }
}
```

### Benefits

- ✅ Single version across monorepo
- ✅ Easier dependency updates
- ✅ Smaller `node_modules`
- ✅ Faster installations

## 🔧 Adding New Libraries

### 1. Add to Root (affects all packages)

```bash
# Add dev dependency to root
pnpm add -D -w prettier

# Add to catalog
# Edit pnpm-workspace.yaml manually
```

### 2. Add to Specific App

```bash
# Add to API
pnpm --filter api add fastify-plugin

# Add to Web
pnpm --filter web add react-query

# Add dev dependency
pnpm --filter api add -D vitest
```

### 3. Add to Shared Package

```bash
# Add to database package
pnpm --filter @repo/database add @prisma/client

# Add to eslint-config
pnpm --filter @repo/eslint-config add -D eslint-plugin-react
```

### 4. Add to Catalog (Shared Version)

Edit `pnpm-workspace.yaml`:

```yaml
catalogs:
  shared:
    new-package: ^1.0.0
```

Then use in any package:

```json
{
  "dependencies": {
    "new-package": "catalog:shared"
  }
}
```

### 5. Install After Adding

```bash
pnpm install
```

## 🏗 Project Architecture

### Feature-Based Structure (API)

The API uses feature-based organization instead of technical layers:

```
src/features/books/
├── createBook/
│   ├── createBookHandler.ts    # HTTP layer
│   ├── createBookRoute.ts      # Route registration
│   ├── createBookSchema.ts     # Validation schemas
│   └── createBookService.ts    # Business logic
└── getBookById/
    └── ... (same structure)
```

**Benefits:**

- Related code stays together
- Easy to understand feature scope
- Simple to test and modify
- Scalable to large codebases

### Plugin System (API)

The API auto-loads plugins in order:

1. **External plugins** - Third-party integrations (CORS, JWT, Swagger)
2. **App plugins** - Custom application logic (Prisma, Auth)
3. **Routes** - API endpoints

### Type Safety (Full Stack)

- **Zod schemas** define validation at runtime
- **TypeScript types** inferred from Zod schemas
- **Prisma types** generated from database schema
- **End-to-end type safety** from database to frontend

### Database Layer

```typescript
// Prisma schema defines models
model book {
  id     Int    @id @default(autoincrement())
  title  String
  author String
}

// Prisma generates TypeScript types
import type { Book } from "@repo/database";

// Use in services
const book: Book = await prisma.book.create({ ... });
```

## 🚀 Deployment

### Infrastructure Setup

The project uses Azure Bicep for Infrastructure as Code. See [`docs/Infra/Deployment.md`](./docs/Infra/Deployment.md) for detailed instructions.

**Quick Start:**

```bash
# Setup environment
cd infra
cp .envrc.example .envrc
# Edit .envrc with your Azure details

# Deploy infrastructure
./deploy.sh

# View deployment
./view-stack.sh
```

This creates:

- Azure PostgreSQL Flexible Server
- Azure Key Vault (for secrets)
- Azure Storage Account
- All networking and security configuration

### Application Deployment

**API:**

```bash
# Build
pnpm --filter api build

# Deploy compiled files from dist/
# (method depends on your hosting solution)
```

**Web:**

```bash
# Build
pnpm --filter web build

# Deploy dist/ folder to static hosting
# (Azure Static Web Apps, Vercel, Netlify, etc.)
```

### Database Migrations (Production)

```bash
# From packages/database
DATABASE_URL="your-production-url" pnpm prod:deploy
```

## 🤝 Contributing

### Code Style

- Use **TypeScript** for all code
- Follow existing **ESLint** rules
- Format with **Prettier** before committing
- Write **tests** for new features

### Commit Convention

Follow conventional commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Pull Request Process

1. Create a feature branch
2. Make your changes
3. Run `pnpm lint` and `pnpm type-check`
4. Run `pnpm test`
5. Create a pull request
6. Wait for review and approval

### Development Guidelines

1. **Features** - Use feature-based structure in API
2. **Types** - Always define Zod schemas for validation
3. **Tests** - Co-locate tests with source files
4. **Documentation** - Update README when adding features
5. **Environment** - Never commit secrets or `.env` files

## 📚 Additional Resources

### Documentation

- [API Documentation](./apps/api/README.md)
- [Database Documentation](./packages/database/README.md)
- [Infrastructure Deployment](./docs/Infra/Deployment.md)

### API Documentation (Live)

When running in development:

- **Swagger UI**: http://localhost:8080/docs
- **OpenAPI Spec**: http://localhost:8080/docs/json

### External Resources

- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Router](https://tanstack.com/router)
- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Azure Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)

## 📄 License

MIT

## 👥 Team

UNDP Huella Latam Team

---

**Happy Coding! 🚀**

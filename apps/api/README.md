# Huella Latam API

Backend API server for the Huella Latam project, built with Fastify, TypeScript, Prisma, and Zod.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Feature Structure](#-feature-structure)
- [Plugin System](#-plugin-system)
- [Adding New Features](#-adding-new-features)
- [API Documentation](#-api-documentation)
- [Scripts](#-scripts)
- [Environment Variables](#-environment-variables)

## 🛠 Tech Stack

- **[Fastify](https://fastify.dev/)** - Fast and low overhead web framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[Pino](https://getpino.io/)** - Super fast logger
- **[JWT](https://jwt.io/)** - JSON Web Token verification for OIDC access tokens

### Key Dependencies

- `@fastify/swagger` & `@fastify/swagger-ui` - OpenAPI documentation
- `@fastify/cors` - Cross-Origin Resource Sharing
- `@fastify/jwt` & `jwks-rsa` - OIDC access-token verification via JWKS
- `@fastify/rate-limit` - Rate limiting
- `@fastify/helmet` - Security headers
- `@fastify/under-pressure` - Health checks
- `@fastify/multipart` - File upload support
- `fastify-type-provider-zod` - Zod integration with Fastify

## 📁 Folder Structure

```
apps/api/
├── src/
│   ├── app.ts                    # Main app configuration and plugin loading
│   ├── server.ts                 # Server initialization and startup
│   ├── config/
│   │   └── environment.ts        # Environment variables and configuration
│   ├── features/                 # Feature-based organization
│   │   └── books/                # Example: Books feature
│   │       ├── createBook/       # Each action is a separate folder
│   │       │   ├── createBookHandler.ts    # Request/response handling
│   │       │   ├── createBookRoute.ts      # Route registration
│   │       │   ├── createBookSchema.ts     # Zod validation schemas
│   │       │   └── createBookService.ts    # Business logic
│   │       └── getBookById/
│   │           └── ...           # Same structure as above
│   ├── plugins/
│   │   ├── external/             # Third-party plugins
│   │   │   ├── cors.ts           # CORS configuration
│   │   │   ├── jwt.ts            # JWT authentication
│   │   │   ├── swagger.ts        # OpenAPI spec generation
│   │   │   ├── swagger-ui.ts     # Swagger UI
│   │   │   ├── rate-limit.ts     # Rate limiting
│   │   │   ├── under-pressure.ts # Health checks
│   │   │   └── multipart.ts      # File upload
│   │   └── app/                  # Custom application plugins
│   │   │   ├── prisma.ts         # Prisma ORM plugin
│   ├── routes/
│   │   └── api/                  # API routes
│   │       ├── index.ts          # Root API route
│   │       └── books/            # Books routes
│   │           └── index.ts      # Books route aggregator
│   ├── types/
│   │   └── fastify.ts            # TypeScript type definitions
│   ├── utils/                    # Shared utilities
│   └── rest/                     # REST client files for testing
│       ├── books-create.rest
│       └── books-getById.rest
├── dist/                         # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## 🏗 Architecture

### Core Principles

1. **Feature-Based Organization**: Code is organized by feature (e.g., books, users) rather than technical layers
2. **Separation of Concerns**: Each file has a single, well-defined responsibility
3. **Type Safety**: Full TypeScript coverage with Zod schemas for runtime validation
4. **Plugin Architecture**: Modular design using Fastify plugins
5. **Dependency Injection**: Dependencies are explicitly passed (e.g., Prisma client)

### Request Flow

```
Request → Fastify → Route → Handler → Service → Database
                     ↓
                  Schema Validation (Zod)
```

1. **Route** - Registers the endpoint and attaches schemas
2. **Handler** - Extracts data from request, calls service, sends response
3. **Service** - Contains business logic and database interactions
4. **Schema** - Defines validation and types using Zod

## 🚀 Getting Started

### Prerequisites

- Node.js >= 24.0.0
- pnpm (workspace package manager)
- PostgreSQL database (configured in `@repo/database`)

### Installation

```bash
# Install dependencies (from workspace root)
pnpm install

# Run database migrations
cd packages/database
pnpm dev:migrate
```

### Development

```bash
# Start the dev server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The server will start on `http://localhost:8080` by default.

## 🎯 Feature Structure

Each feature follows a consistent structure with separate files for different concerns:

### Example: Create Book Feature

```typescript
// createBookSchema.ts - Validation and types
export const CreateBookBodySchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
});

export type CreateBookBody = z.infer<typeof CreateBookBodySchema>;

// createBookService.ts - Business logic
export const createBookService = async (
  prisma: PrismaClient,
  data: CreateBookBody
): Promise<CreateBookResponse> => {
  return await prisma.book.create({ data });
};

// createBookHandler.ts - Request/response handling
export const createBookHandler = async (
  request: FastifyRequest<{ Body: CreateBookBody }>,
  reply: FastifyReply
) => {
  const book = await createBookService(request.server.prisma, request.body);
  return reply.status(201).send(book);
};

// createBookRoute.ts - Route registration
export const createBookRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["books"],
        body: CreateBookBodySchema,
        response: { 201: CreateBookResponseSchema },
      },
    },
    createBookHandler
  );
};
```

### Why This Structure?

- **Testability**: Each function can be tested independently
- **Reusability**: Services can be used from multiple handlers
- **Maintainability**: Changes are localized to specific files
- **Type Safety**: Zod schemas provide both runtime and compile-time types

## 🔌 Plugin System

Plugins are auto-loaded in order using `@fastify/autoload`:

### Loading Order

1. **External Plugins** (`plugins/external/`) - Third-party integrations
   - Authentication (OIDC access-token verification via `@fastify/jwt`)
   - Documentation (Swagger)
   - Security (CORS, Rate Limiting)
2. **App Plugins** (`plugins/app/`) - Custom application plugins
   - Database (Prisma)

3. **Routes** (`routes/`) - API endpoints with autoHooks and cascadeHooks

### Plugin Example

```typescript
// plugins/app/prisma.ts
import fp from "fastify-plugin";
import { PrismaClient } from "@repo/database";

export default fp((fastify) => {
  const prismaClient = new PrismaClient();

  fastify.addHook("onReady", async () => {
    await prismaClient.$connect();
  });

  fastify.addHook("onClose", async () => {
    await prismaClient.$disconnect();
  });

  fastify.decorate("prisma", prismaClient);
});
```

## ➕ Adding New Features

### Step 1: Create Feature Structure

```bash
mkdir -p src/features/{feature-name}/{action-name}
cd src/features/{feature-name}/{action-name}
```

### Step 2: Create Files

Create the following files following the established pattern:

1. `{action}Schema.ts` - Zod schemas for validation
2. `{action}Service.ts` - Business logic
3. `{action}Handler.ts` - Request/response handling
4. `{action}Route.ts` - Route registration

### Step 3: Register Routes

Add your feature routes to `src/routes/api/{feature-name}/index.ts`:

```typescript
import type { FastifyZodInstance } from "@/types/fastify.js";
import { createFeatureRoute } from "@/features/{feature-name}/create/createRoute.js";

export default function featureRoutes(fastify: FastifyZodInstance) {
  createFeatureRoute(fastify);
}
```

### Step 4: Test

Use the REST client files in `src/rest/` to test your endpoints manually.

## 📚 API Documentation

### Swagger UI

When the server is running in development mode, access interactive API documentation at:

```
http://localhost:8080/api/docs
```

The documentation is automatically generated from:

- Route schemas
- Zod validation schemas
- TypeScript types

### OpenAPI Spec

Raw OpenAPI JSON specification is available at:

```
http://localhost:8080/api/docs/json
```

## 📜 Scripts

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript to JavaScript
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler without emitting

# Testing
pnpm test             # Run Vitest tests

# Maintenance
pnpm clean            # Remove build artifacts
```

## 🔐 Environment Variables

Create a `.envrc` file in the workspace root:

```bash
# Database Configuration
export DATABASE_URL="postgresql://testuser:testpass@localhost:5432/testdb"

# API Configuration
export LOG_LEVEL="debug"
export NODE_ENV="development"

# Authentication (see below)
export AUTH_PROVIDER="forced-user"
export FORCED_USER_EMAIL="dev@example.com"
export FORCED_USER_IDP_ID="local-dev"

# Object storage (required — the API refuses to boot without it)
export STORAGE_PROVIDER="minio"
export MINIO_ENDPOINT="http://localhost:9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
```

The full, authoritative list of variables lives in [`../../docs/development/environment-variables.md`](../../docs/development/environment-variables.md).

### Authentication

The API is a generic **OIDC access-token validator** (it migrated off MSAL /
Azure-specific auth to work against any OIDC issuer). The provider is selected
with `AUTH_PROVIDER`, defined in [`src/config/environment.ts`](src/config/environment.ts):

| `AUTH_PROVIDER`          | Behaviour                                                                  |
| ------------------------ | -------------------------------------------------------------------------- |
| `jwks` (default in prod) | Validate OIDC access tokens via JWKS (Entra, Keycloak, any OIDC issuer).   |
| `forced-user`            | Skip token validation and act as a fixed user (recommended for local dev). |
| `none` (default)         | No authentication (used when `AUTH_PROVIDER` is not set).                  |

When `AUTH_PROVIDER=jwks`, token validation is configured with:

```bash
export JWKS_URI="https://issuer.example.com/.well-known/jwks.json"  # signing keys the API fetches
export JWKS_ISSUER="https://issuer.example.com/"                    # expected `iss`
export JWKS_AUDIENCE="<your-app-client-id>"                          # expected `aud`
export JWKS_REQUIRED_SCOPE="access_as_user"                          # required scope (default: access_as_user)
```

In production, `AUTH_PROVIDER=jwks` **fails closed**: the API refuses to boot
unless `JWKS_URI`, `JWKS_ISSUER`, and `JWKS_AUDIENCE` are all set.

When `AUTH_PROVIDER=forced-user`, the request is authenticated as a fixed user:

```bash
export FORCED_USER_EMAIL="dev@example.com"
export FORCED_USER_IDP_ID="local-dev"
```

> **Note on `JWT_SECRET`.** A `JWT_SECRET` still exists in the code purely as a
> **dev-only HMAC fallback** —
> `export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";` — and
> its default is public. It is **not** the authentication mechanism and should
> **not** be configured to secure the API; use `AUTH_PROVIDER=jwks` instead.

For end-to-end setup, see:

- [`../../docs/infrastructure/KeycloakAuthenticationSetup.md`](../../docs/infrastructure/KeycloakAuthenticationSetup.md)
- [`../../docs/infrastructure/GenericOidcAuthenticationSetup.md`](../../docs/infrastructure/GenericOidcAuthenticationSetup.md)
- [`../../docs/development/environment-variables.md`](../../docs/development/environment-variables.md)

### Object Storage

`STORAGE_PROVIDER` is **required** — the API refuses to boot without it
(validated by `@repo/storage`, see `packages/storage/src/config.ts`). It selects
which object-storage backend to use, and each backend has its own provider-specific
variables:

| `STORAGE_PROVIDER`   | Required variables                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `azure_blob_storage` | `AZURE_STORAGE_ACCOUNT_NAME` (container defaults to `files`; optional Service Principal via `AZURE_STORAGE_TENANT_ID` / `AZURE_STORAGE_CLIENT_ID` / `AZURE_STORAGE_CLIENT_SECRET`) |
| `minio`              | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (bucket defaults to `files`)                                                                                              |

For details, see [`../../docs/infrastructure/FileStorage.md`](../../docs/infrastructure/FileStorage.md).

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Configurable cross-origin requests
- **Rate Limiting** - Prevent abuse
- **OIDC Authentication** - Secure endpoints via JWKS-validated access tokens (`AUTH_PROVIDER=jwks`)
- **Request Validation** - Zod schemas prevent malformed data
- **Logging Redaction** - Sensitive data (passwords, tokens) are redacted from logs

## 📊 Logging

The API uses Pino for structured logging:

- **Development**: Pretty-printed, colorized console output
- **Production**: JSON-formatted logs for parsing
- **Request Tracing**: Each request gets a unique UUID
- **Database Queries**: Prisma queries are logged with timing
- **Redaction**: Sensitive fields are automatically removed

## 🧪 Testing

Tests are written using Vitest and should be co-located with the code:

```
src/features/books/createBook/
├── createBookService.ts
├── createBookService.test.ts
├── createBookHandler.ts
└── createBookHandler.test.ts
```

## 🤝 Contributing

1. Follow the established feature structure
2. Add Zod schemas for all inputs and outputs
3. Include JSDoc comments explaining the purpose of each function
4. Update this README if you add new patterns or conventions

## 📝 Notes

- **Path Aliases**: `@/` points to `src/` (configured in `tsconfig.json`)
- **Module System**: Uses ES modules (`.js` extensions in imports required)
- **Type Safety**: Full type inference from Zod schemas to TypeScript
- **Monorepo**: Shares code with `@repo/database` and `@repo/eslint-config`

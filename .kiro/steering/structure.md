# Project Structure & Conventions

## Monorepo Layout

```
huella-latam/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React frontend
├── packages/
│   ├── database/     # Prisma schema, migrations, seeds
│   ├── types/        # Shared Zod schemas + TypeScript types
│   ├── utils/        # Shared utility functions
│   ├── eslint-config/      # Shared ESLint configs
│   └── typescript-config/  # Shared tsconfig presets
├── infra/            # Azure Bicep IaC
├── docs/             # Project documentation
└── load_methodologies/  # Methodology data loading scripts
```

## API Feature Structure

The API uses feature-based organization. Each feature domain lives under `apps/api/src/features/{domain}/` and each operation gets its own folder:

```
features/{domain}/
├── {operationName}/
│   ├── handler.ts    # HTTP handler (request/reply)
│   ├── route.ts      # Fastify route registration with schema
│   └── service.ts    # Business logic (receives PrismaClient)
├── errors.ts         # Domain-specific error classes
├── mappers.ts        # DB model → response mappers
├── helpers.ts        # Domain helpers (optional)
└── utils.ts          # Domain utilities (optional)
```

Convention: operation folders are named in camelCase matching the action (e.g., `createUser`, `getAllCarbonInventories`, `getCarbonInventoryById`).

## API Route Registration

Routes are organized under `apps/api/src/routes/api/` mirroring the URL structure. Routes are split into `admin/` and `app/` scopes where applicable.

## API Plugin System

Plugins live in `apps/api/src/plugins/` and are split into:

- `external/` — Third-party Fastify plugins (CORS, JWT, Swagger, rate-limit, etc.)
- `app/` — Application plugins (Prisma, auth, authorization, error handler, blob storage)

## Shared Types Pattern

Types in `@repo/types` mirror the API feature structure:

```
packages/types/src/{domain}/{operationName}/
├── schemas.ts   # Zod schemas (e.g., CreateUserBodySchema, CreateUserResponseSchema)
└── types.ts     # TypeScript types inferred from schemas (z.infer<typeof Schema>)
```

Each domain has an `index.ts` that re-exports all operation schemas and types. The root `index.ts` re-exports everything.

Base schemas (shared field definitions) live in `packages/types/src/baseSchemas/`.

## Frontend Structure

```
apps/web/src/
├── api/           # API client layer
│   ├── http/      # HTTP client functions (using ky)
│   └── query/     # TanStack Query hooks
├── routes/        # TanStack Router file-based routes
├── screens/       # Page-level components (one folder per screen)
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores
├── contexts/      # React contexts
├── config/        # App configuration and constants
├── icons/         # Custom SVG icon components
├── interfaces/    # Route-specific TypeScript interfaces
├── theme/         # MUI theme configuration
├── utils/         # Utility functions
└── test/          # Test setup and helpers
```

## Handler Factory

The API provides handler factories in `apps/api/src/handlerFactory/` for common CRUD patterns:

- `createGetAllHandler` — List endpoints
- `createPostHandler` — Create endpoints
- `createPatchHandler` — Update endpoints
- `createDeleteHandler` — Delete endpoints
- `createActionHandler` — Custom action endpoints

## Naming Conventions

- Feature folders: camelCase (`carbonInventories`, `reductionProjects`)
- Operation folders: camelCase verb+noun (`createUser`, `getAllCategories`)
- Files: camelCase (`handler.ts`, `service.ts`, `route.ts`, `schemas.ts`, `types.ts`)
- Zod schemas: PascalCase with `Schema` suffix (`CreateUserBodySchema`)
- TypeScript types: PascalCase (`CreateUserBody`, `CreateUserResponse`)
- Error classes: PascalCase with `Error` suffix (`EmailAlreadyInUseError`)
- Workspace packages: `@repo/{name}` scope

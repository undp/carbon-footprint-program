# Tech Stack & Build System

## Monorepo Tooling

- Package manager: pnpm 10.23+ with workspaces
- Build orchestration: Turborepo
- Node.js: >= 24.0.0
- All packages use ESM (`"type": "module"`)

## Backend (apps/api)

- Framework: Fastify 5 with auto-loaded plugins
- ORM: Prisma 7 with PostgreSQL
- Validation: Zod schemas via `fastify-type-provider-zod`
- Auth: JWT (`@fastify/jwt`) with pluggable providers (JWKS, EasyAuth, ForcedUser, None)
- Logging: Pino
- API docs: Swagger/OpenAPI auto-generated
- File storage: Azure Blob Storage
- Language: TypeScript, compiled with `tsc` + `tsc-alias` for path aliases

## Frontend (apps/web)

- UI: React 19
- Bundler: Vite 7
- Routing: TanStack Router (file-based, generates `routeTree.gen.ts`)
- Data fetching: TanStack Query
- Forms: React Hook Form + `@hookform/resolvers` with Zod
- Component library: MUI (Material UI) 7 + Radix UI
- Styling: Tailwind CSS v4 + Emotion (for MUI theming)
- State management: Zustand
- Auth: MSAL (Azure AD B2C)

## Shared Packages

- `@repo/database` — Prisma schema, client, migrations, seeds
- `@repo/types` — Zod schemas and inferred TypeScript types (shared between API and web)
- `@repo/utils` — Shared utility functions (carbon inventory helpers, formatting, unit conversions)
- `@repo/eslint-config` — Shared ESLint configs (base, api, web)
- `@repo/typescript-config` — Shared tsconfig presets (base, api, web)

## Testing

- Framework: Vitest 4
- API tests: Node environment, uses testcontainers (PostgreSQL, Azurite), tests in `apps/api/test/`
- Web tests: jsdom environment, React Testing Library, tests co-located in `src/`
- Run all: `pnpm test`
- Run API only: `pnpm --filter api test`
- Run web only: `pnpm --filter web test`

## Code Quality

- Linting: ESLint 9 flat config with typescript-eslint, prettier integration, jsx-a11y (web), TanStack plugins
- Formatting: Prettier (double quotes, semicolons, trailing commas, 80 char width, Tailwind plugin)
- Type checking: `pnpm type-check`
- CI runs: lint, type-check, format:check, test, build (on PRs to main)

## Key Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in dev mode (API + Web)
pnpm build                # Build all apps and packages
pnpm test                 # Run all tests
pnpm lint                 # Lint all code (--max-warnings=0)
pnpm type-check           # TypeScript type checking
pnpm format               # Format all code with Prettier
pnpm format:check         # Check formatting without changes
pnpm clean                # Remove build artifacts
pnpm db:reset             # Reset database and re-seed
```

### Database Commands (from packages/database)

```bash
pnpm dev:generate         # Generate Prisma client
pnpm dev:migrate          # Run migrations (dev)
pnpm dev:seed             # Seed database
pnpm dev:studio           # Open Prisma Studio GUI
pnpm dev:reset            # Reset database
pnpm prod:deploy          # Deploy migrations (production)
```

### Filtering

```bash
pnpm --filter api <cmd>           # Run command in API app
pnpm --filter web <cmd>           # Run command in web app
pnpm --filter @repo/database <cmd> # Run command in database package
```

## Infrastructure

- Cloud: Azure (PostgreSQL Flexible Server, Key Vault, Storage, Static Web Apps)
- IaC: Azure Bicep (in `infra/`)
- Environment variables: loaded via direnv (`.envrc` files, not committed)

## Dependency Management

- Shared dependency versions managed via pnpm catalogs in `pnpm-workspace.yaml`
- Workspace packages referenced with `"workspace:*"` protocol
- Catalog deps referenced with `"catalog:shared"` protocol

# Packages and Monorepo Internals

This document describes the monorepo structure, shared packages, dependency graph, and how changes propagate through the build system.

---

## Workspace Layout

The repository is a **pnpm monorepo** managed with **Turborepo**.

```
undp-huella-latam/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React frontend (Vite)
├── packages/
│   ├── types/        # @repo/types  — Zod schemas and TypeScript types
│   ├── database/     # @repo/database — Prisma client and migrations
│   ├── utils/        # @repo/utils  — Shared business logic utilities
│   ├── constants/    # @repo/constants — Shared constant values
│   ├── eslint-config/ # @repo/eslint-config — Shared ESLint rules
│   └── typescript-config/ # @repo/typescript-config — Shared tsconfig presets
├── turbo.json        # Turborepo pipeline
├── pnpm-workspace.yaml
└── package.json
```

`pnpm-workspace.yaml` declares two workspace globs: `apps/*` and `packages/*`. All packages are installed in a single lockfile.

---

## Shared Packages

### `@repo/types` — API Schemas and Types

**Location:** `packages/types/`

The single source of truth for all request/response shapes across the API and frontend. Both `apps/api` and `apps/web` import from this package.

**What it contains:**

| Module                         | Contents                                |
| ------------------------------ | --------------------------------------- |
| `carbonInventories`            | Create/update/list schemas              |
| `organizations`                | Organization create/update/list schemas |
| `users`                        | User schemas                            |
| `submissions`                  | Submission request/response schemas     |
| `files`                        | Upload request and confirmation schemas |
| `methodologies`                | Methodology version schemas             |
| `categories` / `subcategories` | Taxonomy schemas                        |
| `emissionFactors`              | Factor schema with dimensions           |
| `reductionProjects`            | Reduction project schemas               |
| `systemParameters`             | System parameter schemas                |
| `badges`                       | Badge schemas                           |
| `transparency`                 | Public/transparency endpoint schemas    |
| `baseSchemas`                  | Reusable Zod primitives                 |
| `enums`                        | Shared string enum types                |

Every schema is defined in Zod. TypeScript types are inferred from Zod with `z.infer<>`. The same schema validates API input at runtime and generates TypeScript types for compile-time safety in both the API and the frontend.

**Key dependencies:** `@repo/constants`, `@repo/database` (imports Prisma enums), `zod`

#### Zod validation messages must be in English

All Zod schemas in `packages/types` must use **stable English** validation messages. The package is consumed by both the API and the web client; embedding Spanish copy here couples the contract to a single locale and breaks the i18n boundary documented in [i18n-plan.md](./i18n-plan.md).

Convention:

- Custom messages (`.min(1, "...")`, `.regex(/.../, "...")`, `.refine(..., "...")`) use short, stable English strings.
- When a schema owns several related messages, export them as a `*_VALIDATION_MESSAGES` const (see `packages/types/src/baseSchemas/filename.ts` → `FILENAME_VALIDATION_MESSAGES`) so the web translator can reference them symbolically and stay in sync at build time.
- The web app translates messages into Spanish at render time via `apps/web/src/utils/translateValidationMessage.ts`. Add a dictionary entry for each new message.
- Messages set on the FE side (e.g. `requiredMessage` in a Controller) may be written in Spanish directly — they pass through the translator unchanged.

API-thrown business errors follow the same boundary but use a different mechanism: throw a `createError(...)` with a stable `code`, and add the user-facing Spanish copy to `ERROR_MESSAGES` in `apps/web/src/utils/getApiErrorMessage.ts`.

---

### `@repo/database` — Prisma Client and Migrations

**Location:** `packages/database/`

Owns the Prisma schema, all migration files, and seed scripts. Exports the `PrismaClient` and database enums.

**Exports:**

| Export path   | Contents                                                |
| ------------- | ------------------------------------------------------- |
| `.` (default) | `PrismaClient`, model types                             |
| `./enums`     | Database enums (`SystemRole`, `SubmissionStatus`, etc.) |

**Schema location:** `packages/database/src/prisma/schema.prisma`

**Key scripts:**

| Script         | Purpose                                                 |
| -------------- | ------------------------------------------------------- |
| `dev:migrate`  | Create and apply a new migration interactively          |
| `dev:generate` | Regenerate the Prisma client after schema changes       |
| `dev:seed`     | Run seed scripts (uses `SEEDS_DATASET` env var)         |
| `dev:studio`   | Open Prisma Studio at http://localhost:5555             |
| `dev:reset`    | Drop the database, reapply all migrations, reseed       |
| `prod:deploy`  | Apply pending migrations non-interactively (used in CI) |

**Build note:** `prebuild` runs `prisma generate` automatically, so the generated client is always in sync with the schema before the TypeScript compiler runs.

**Dependencies:** `@prisma/client@7.0.1`, `@prisma/adapter-pg`, `@azure/identity`, `@azure/storage-blob`, `zod`

---

### `@repo/utils` — Shared Business Logic

**Location:** `packages/utils/`

Pure utility functions shared between the API and the frontend. No side effects; no framework dependencies.

**What it exports:**

| Export                                                                 | Description                                 |
| ---------------------------------------------------------------------- | ------------------------------------------- |
| `kgToTon`, `tonToKg`                                                   | Mass unit conversion                        |
| `formatEmissionFactor`                                                 | Emission factor display formatting          |
| `isCarbonInventoryEditable`, `isCarbonInventoryDeletable`              | State guards for inventories                |
| `canSubmitToVerification`, `canSelfDeclare`, `canSubmitToMeasurement`  | Submission eligibility checks               |
| `isReductionProjectEditable`, `canRequestReductionProjectVerification` | Reduction project state guards              |
| `buildUserName`                                                        | Formats first + last name                   |
| `formatDateToDDMMYYYY`                                                 | Date formatting                             |
| `CUSTOM_FACTOR_SOURCES`                                                | Constant for custom emission factor sources |

**Key dependency:** `@repo/types` (for type signatures)

---

### `@repo/constants` — Shared Constants

**Location:** `packages/constants/`

A minimal package for constant values that need to be shared across packages without pulling in heavier dependencies. Currently exports reduction project constants.

---

### `@repo/eslint-config` — Shared ESLint Rules

**Location:** `packages/eslint-config/`

Three configuration presets:

| Export   | Used by      |
| -------- | ------------ |
| `./base` | All packages |
| `./api`  | `apps/api`   |
| `./web`  | `apps/web`   |

---

### `@repo/typescript-config` — Shared TypeScript Configs

**Location:** `packages/typescript-config/`

Three tsconfig presets extended by `tsconfig.json` in each app/package:

| Preset      | Used by      |
| ----------- | ------------ |
| `base.json` | All packages |
| `api.json`  | `apps/api`   |
| `web.json`  | `apps/web`   |

---

## Dependency Graph

```
apps/api (Fastify)
├── @repo/database    ← Prisma client, model types
├── @repo/types       ← Request/response schemas (Zod)
│   ├── @repo/database  (imports Prisma enums)
│   └── @repo/constants
├── @repo/utils       ← Business logic guards and formatters
│   └── @repo/types
└── (Fastify, zod, Azure SDKs, etc.)

apps/web (React + Vite)
├── @repo/types       ← Same schemas for frontend forms and API calls
├── @repo/utils       ← Same state guards for UI button visibility
└── @repo/constants
```

Both apps share the exact same Zod schemas from `@repo/types`. A schema change in `packages/types/src/` affects validation logic in the API and TypeScript types in the frontend simultaneously.

---

## Turborepo Build Pipeline

`turbo.json` orchestrates tasks across the monorepo:

| Task         | Depends on                          | Output cached?  |
| ------------ | ----------------------------------- | --------------- |
| `build`      | `^build` (dependencies built first) | Yes (`dist/**`) |
| `dev`        | `^build`                            | No              |
| `test`       | `^build`                            | No              |
| `lint`       | `^build`                            | No              |
| `type-check` | `^build`                            | No              |
| `clean`      | —                                   | No              |

`^build` means "build all packages this app depends on first." Running `pnpm build` at the root builds packages in dependency order: `constants` → `database` → `types` → `utils` → `api` / `web`.

---

## How Schema Changes Propagate

When the Prisma schema changes:

1. **Create the migration:** `cd packages/database && pnpm dev:migrate`
2. **Regenerate the client:** `pnpm dev:generate`
   - This regenerates TypeScript types in `packages/database/src/generated/`
3. **Rebuild `@repo/types`:** `pnpm --filter=@repo/types build`
   - Any schemas that import Prisma enums are now updated
4. **Rebuild `@repo/utils`:** `pnpm --filter=@repo/utils build`
   - Any utility functions that reference model types are updated
5. **Type-check apps:** `pnpm type-check`
   - TypeScript errors appear immediately if API handlers or frontend code are inconsistent with the new schema

Running `pnpm build` from the root executes steps 2–4 automatically in the correct order via Turborepo.

---

## Adding a New Shared Type

1. Create the Zod schema in the appropriate file under `packages/types/src/`.
2. Export it from `packages/types/src/index.ts`.
3. Import it in the API route handler with `import type { MyType } from "@repo/types"`.
4. Import it in the frontend component with the same import.
5. Run `pnpm type-check` to verify no regressions.

There is no code generation step for types — they are just TypeScript inferences from Zod schemas.

---

## Adding a New Utility Function

1. Add the function to the appropriate file under `packages/utils/src/`.
2. Export it from `packages/utils/src/index.ts`.
3. Run `pnpm --filter=@repo/utils build` to verify it compiles.

Keep utility functions pure (no side effects, no I/O). Functions that depend on Fastify, Prisma, or Azure SDKs belong in the app, not in `@repo/utils`.

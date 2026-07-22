# @repo/database

The monorepo's Prisma layer: the shared `schema.prisma` data model, the generated Prisma client, and a Postgres connection adapter, consumed by `apps/api` and `tools/seed`. The schema defines ~48 models spanning auth/organizations (`User`, `Organization`, `UserOrganizationMembership`, ...), the carbon-accounting domain (`CarbonInventory`, `CarbonInventoryLine`, `EmissionFactor`, `MethodologyVersion`, `Category`/`Subcategory`, ...), submissions/review (`Submission`, `SubmissionSubject`, ...), and the chatbot corpus (`ChatbotCorpusSource`, `ChatbotCorpusChunk`, ...). Rather than Prisma's default query engine, the package uses `@prisma/adapter-pg` (a `pg`-based driver adapter) for the database connection.

## Prerequisites

- Node.js 26+, pnpm, Docker Compose
- PostgreSQL 15+ — migrations use `NULLS NOT DISTINCT`, introduced in Postgres 15. Local dev runs Postgres 18 (Alpine) via `docker-compose.yml`.

## Setup

1. Set `DATABASE_URL` (shell env or `.envrc`). It's read as-is in `src/environment.ts` (`process.env.DATABASE_URL ?? ""`, no validation at import time) — `generatePrismaAdapter` throws if it ends up empty.
2. `docker compose up -d` — starts a local Postgres container (`undp-postgres`) with `testuser`/`testpass`/`testdb` on port 5432.
3. `pnpm dev:generate` — generate the Prisma client from the schema (doesn't need the database running).

## Scripts

| Script               | What it does                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `dev:generate`       | `prisma generate` — regenerate the client from the schema.                                                        |
| `dev:migrate`        | `prisma migrate dev` — create and apply a new migration, then regenerate the client.                              |
| `dev:studio`         | `prisma studio` — visual data browser at `http://localhost:5555`.                                                 |
| `db:restore`         | `prisma migrate reset --force` — drop, recreate, and re-migrate the local database.                               |
| `prod:deploy`        | `prisma migrate deploy` — apply pending migrations without resetting.                                             |
| `validate:version`   | Checks the connected Postgres is >= 15 (required for `NULLS NOT DISTINCT`).                                       |
| `promote-superadmin` | Promotes a user to `SUPERADMIN` by email: `pnpm promote-superadmin <email>` (or `SUPERADMIN_EMAIL` env var).      |
| `db:drop:worktree`   | Drops this git worktree's isolated local database; refuses anything that isn't a local, per-worktree-suffixed DB. |

## Adapter

`generatePrismaAdapter(connectionString?)` (`src/adapter.ts`) wraps `@prisma/adapter-pg`'s `PrismaPg`, defaulting to `DATABASE_URL` when no argument is given:

```ts
import { PrismaClient, generatePrismaAdapter } from "@repo/database";

const prisma = new PrismaClient({ adapter: generatePrismaAdapter() });
```

## Exports

- `@repo/database` (`src/index.ts`) — the generated Prisma client (`PrismaClient`, model/enum types) plus `generatePrismaAdapter`.
- `@repo/database/enums` (`src/enums.ts`) — just the generated enums, with no `PrismaClient`/Node.js dependency, safe to import from browser code (e.g. `apps/web`).

## Project Structure

```
packages/database/
├── src/
│   ├── adapter.ts             # generatePrismaAdapter()
│   ├── environment.ts         # reads DATABASE_URL / NODE_ENV
│   ├── enums.ts               # browser-safe re-export of generated enums
│   ├── index.ts                # package entry: generated client + adapter
│   ├── generated/prisma/       # Prisma client output (generated, not hand-edited)
│   ├── prisma/
│   │   ├── schema.prisma       # the monorepo's data model
│   │   └── migrations/
│   └── scripts/
│       ├── promote-superadmin.ts
│       └── drop-worktree-database.ts
├── scripts/
│   └── validate-postgres-version.ts
├── prisma.config.ts
├── docker-compose.yml
└── package.json
```

## Why

Huella Latam is distributed as a digital public good that each country deploys on its own infrastructure. Some target countries cannot adopt PostgreSQL due to internal IT policies, sovereignty requirements, or pre-existing licensing of Microsoft SQL Server. The platform currently couples its data layer to PostgreSQL (PG-only types like `@db.JsonB`, `String[]`, `@db.Uuid`, partial unique indexes, views with `DISTINCT ON` / `FILTER (WHERE ...)` / enum casts), blocking adoption in those countries. We need first-class support for SQL Server 2019+ alongside PostgreSQL so each deployment can pick its engine without forking the codebase.

## What Changes

- Introduce a **dual-provider data layer**: two `schema.prisma` files (`prisma/postgresql/`, `prisma/sqlserver/`) sharing the same logical model, each generating its own Prisma Client.
- Adopt the official Prisma 7 multi-provider pattern: separate `prisma.config.pg.ts` and `prisma.config.mssql.ts`; build-time `DB_PROVIDER` env var decides which client is generated and bundled.
- Add `@prisma/adapter-mssql@^7.8.0` alongside existing `@prisma/adapter-pg`; `src/adapter.ts` selects at runtime; the Fastify Prisma plugin instantiates the correct client at API startup.
- **Pre-port cleanup** (PR 1, edit migrations in place — NOT a squash; see POC finding in design.md): consolidate the magnitude enum→table conversion into the base migration, unify UUID generation to `@default(uuid())` (client-side, portable), and unify `@db.Decimal` precision to `(28, 10)`. A squash was considered and rejected — Prisma generates SQL Server migrations from the `sqlserver` schema independently, so squashing the PG history gives no porting benefit while adding reconstruction risk.
- **Schema unification** to remove provider divergence:
  - Drop `@db.JsonB` annotations on the 4 JSON columns; rely on Prisma `Json` (mapped to `jsonb` in PG, `nvarchar(max)` in SQL Server) + existing centralized Zod schemas in `packages/types`.
  - Convert `String[]` columns (`SystemParameter.options`, `ReductionProject.consideredGei`) to `Json` + Zod array validation, preserving the API contract.
- **Port views to SQL Server**: hand-rewrite the 4 views (`organization_summary_view`, `submission_summary_view`, `carbon_inventory_subtotals_view`, `carbon_inventory_sector_subtotals_view`) replacing `DISTINCT ON`, `FILTER (WHERE)`, `EXTRACT::int`, `CREATE OR REPLACE VIEW`, and enum casts with SQL Server equivalents (`ROW_NUMBER`, `CASE WHEN`, `YEAR`, `CREATE OR ALTER VIEW`, `CAST AS VARCHAR`).
- Adopt Prisma 7.8.0 `previewFeatures = ["views", "partialIndexes"]` to declare the 8+ partial unique indexes once in schema; Prisma emits the correct sintaxis per provider (partial index in PG, filtered index in SQL Server).
- Force case-sensitive collation in SQL Server (`Latin1_General_100_CS_AS_SC_UTF8`) to keep parity with PG defaults (so `User.email`, `Magnitude.code`, etc. behave identically).
- Add `docker-compose.sqlserver.yml` (opt-in) for local development against SQL Server, plus optional Testcontainers SQL Server in `apps/api/test/` selected via `TEST_DB_PROVIDER`.
- **BREAKING (internal, not API-facing)**: Prisma TypeScript types for the 6 columns mentioned change from `string[]`/typed-JSON to `Json` at the Prisma-client boundary. Public API responses do NOT change — Zod parsers in mappers preserve `string[]` and typed objects in the outbound types.
- **BREAKING (deploy)**: deployments must now set `DB_PROVIDER` and a provider-appropriate `DATABASE_URL` (`postgresql://...` or `sqlserver://host:1433;database=...`) at build time.
- Document the architecture decision in `docs/architecture/adrs/0001-multi-database-support.md`, explicitly framing the divergence as **infrastructure-agnostic** (orthogonal to the country-agnostic principle, which still applies to country-specific data via seeds and system parameters).

## Capabilities

### New Capabilities

- `multi-database-support`: dual-provider data layer enabling each deployment to run on PostgreSQL or SQL Server 2019+, including schema portability rules, provider selection mechanism, migration strategy per provider, and parity expectations between the two engines.

### Modified Capabilities

<!-- None: no existing capability spec governs database-engine choice; the change introduces this as a new capability. -->

## Impact

- **`packages/database/`**: full restructure. Two schema folders, two config files, two generator outputs, new adapter selector. Existing migrations are cleaned in place (magnitude consolidation + UUID/Decimal folds) rather than squashed. Adds `@prisma/adapter-mssql` and `docker-compose.sqlserver.yml`.
- **`packages/types/`**: add `ConsideredGeiArraySchema = z.array(ConsideredGeiSchema)` and ensure all 4 JSON columns have centralized Zod parsers (2 already exist, 2 need to be added or formalized for `derivationDetails` and `resultDetails`).
- **`apps/api/`**: Fastify Prisma plugin refactored to read `DB_PROVIDER` at startup. Mappers for `SystemParameter.options`, `ReductionProject.consideredGei`, `derivationDetails`, `resultDetails` may need Zod parsing where they currently treat the field as raw `string[]` or opaque JSON. `apps/api/test/factories/` validated against both providers.
- **`apps/web/`**: no changes (frontend is provider-agnostic; consumes the API).
- **CI/CD**: a new build matrix dimension (`DB_PROVIDER`) is required to produce per-country artifacts. Testcontainers SQL Server addition is opt-in initially; detailed CI strategy (PR vs nightly vs manual trigger) is deferred until Fase 6 of implementation when real boot-time and resource data are available.
- **External dependencies**: requires Prisma 7.8.0+ (already merged on `feat/mati/upgrade-low-risk-dependencies`); SQL Server 2019+ availability; `@prisma/adapter-mssql@^7.8.0`.
- **Operational**: each country deployment must choose a provider at install time and stick with it. No live PG ↔ SQL Server data migration is in scope (greenfield SQL Server installs only).
- **Documentation**: ADR, `packages/database/README.md`, `docs/development/database-setup.md`, `docs/operations/deployment.md`, and a CLAUDE.md note that every schema-modifying PR MUST edit both `postgresql/schema.prisma` and `sqlserver/schema.prisma` (review-time gate — automated parity check deferred post-MVP).

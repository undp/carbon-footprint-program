## ADDED Requirements

### Requirement: Provider selection at build time

The system SHALL allow a deployment to choose between PostgreSQL and SQL Server 2019+ as its database engine by setting a single environment variable, `DB_PROVIDER`, at build time. The value MUST be either `postgresql` or `sqlserver`. The build pipeline SHALL generate the Prisma client and bundle only the artifacts for the selected provider.

#### Scenario: Build with DB_PROVIDER=postgresql

- **WHEN** `DB_PROVIDER=postgresql` is set before `pnpm build`
- **THEN** the build runs `prisma generate --config=prisma.config.pg.ts`
- **AND** only `src/generated/prisma-postgresql/` is produced
- **AND** the resulting artifact connects to PostgreSQL using `postgresql://...` connection strings

#### Scenario: Build with DB_PROVIDER=sqlserver

- **WHEN** `DB_PROVIDER=sqlserver` is set before `pnpm build`
- **THEN** the build runs `prisma generate --config=prisma.config.mssql.ts`
- **AND** only `src/generated/prisma-sqlserver/` is produced
- **AND** the resulting artifact connects to SQL Server using `sqlserver://host:1433;database=...` connection strings

#### Scenario: Invalid or missing DB_PROVIDER

- **WHEN** `DB_PROVIDER` is unset or contains a value other than `postgresql` or `sqlserver`
- **THEN** the build SHALL fail with a clear error message naming the supported values

### Requirement: Schema parity between providers

Both `prisma/postgresql/schema.prisma` and `prisma/sqlserver/schema.prisma` SHALL define the same set of models, model fields, relations, indexes, and unique constraints. The only permitted divergences are provider-specific type annotations (`@db.UniqueIdentifier` vs. `@db.Uuid`), the `datasource.provider` value, and the `generator client.output` path. Any pull request that modifies one schema MUST update the other within the same merge to keep the two engines in lockstep.

#### Scenario: Adding a new model

- **WHEN** a contributor adds a new model in `prisma/postgresql/schema.prisma`
- **THEN** they MUST add the same model with the same fields and relations to `prisma/sqlserver/schema.prisma` in the same pull request
- **AND** the only differences allowed are the provider-specific annotations enumerated above

#### Scenario: Adding a partial unique index

- **WHEN** a contributor adds `@@unique([fields], where: ...)` (Prisma 7.8.0 `partialIndexes` preview) in one schema
- **THEN** the identical declaration MUST be present in the other schema
- **AND** Prisma SHALL generate the correct provider-specific SQL (PG partial index, SQL Server filtered index)

### Requirement: Cross-provider JSON storage uses Prisma `Json` + centralized Zod parsers

The four JSON columns (`EmissionFactor.gasDetails`, `CarbonInventory.organizationData`, `CarbonInventoryLineFactor.derivationDetails`, `CarbonInventoryLineResult.resultDetails`) SHALL be declared as Prisma `Json` (no `@db.JsonB` annotation) in both schemas. Each column SHALL have a Zod schema in `packages/types/src/baseSchemas/` that defines its structure, and read paths SHALL validate via that schema before returning data. No business logic in the API SHALL depend on provider-specific JSON query semantics.

#### Scenario: Reading `gasDetails` returns a validated typed object

- **WHEN** code reads `emissionFactor.gasDetails` from the Prisma client (on either provider)
- **THEN** the mapper SHALL parse the value through `GasDetailsSchema` (Zod)
- **AND** a `DataIntegrityError` SHALL be thrown if the stored value does not match the schema

#### Scenario: No `where` filter on JSON content

- **WHEN** the database layer is searched for any Prisma query
- **THEN** no query SHALL use `where: { jsonField: { path: ..., equals: ... } }` or similar provider-specific JSON filters
- **AND** any future need to filter by JSON content MUST be promoted to a real column before merging

### Requirement: Array fields use Prisma `Json` + Zod array schemas

`SystemParameter.options` and `ReductionProject.consideredGei` SHALL be declared as Prisma `Json` in both schemas. Their values SHALL be JSON arrays validated by Zod array schemas (`z.array(...)`) defined in `packages/types`. The public HTTP API contract SHALL continue to expose `string[]` to consumers; the conversion happens at the mapper layer.

#### Scenario: Creating a reduction project with considered GEIs

- **WHEN** the API receives `POST /reduction-projects` with `consideredGei: ["CO2", "CH4"]`
- **THEN** the request is validated against `ConsideredGeiArraySchema`
- **AND** the value is persisted as a JSON array via Prisma `Json`
- **AND** subsequent reads return the same `string[]` to the API consumer regardless of provider

### Requirement: UUID generation is client-side via `@default(uuid())`

Every UUID column in the schema SHALL use `@default(uuid())` (Prisma client-side generation) rather than database-side functions (`gen_random_uuid()`, `newid()`). The actual storage column type SHALL be `@db.Uuid` in PostgreSQL and `@db.UniqueIdentifier` in SQL Server.

#### Scenario: Creating a new carbon inventory

- **WHEN** a new `CarbonInventory` row is inserted on either provider
- **THEN** the `uuid` field SHALL be populated by Prisma in JavaScript before the insert
- **AND** no database-side UUID function SHALL be invoked

### Requirement: Decimal columns use precision `(28, 10)` uniformly

All `Decimal` columns in the schema SHALL be declared with `@db.Decimal(28, 10)`. No column SHALL use a smaller precision or scale than `(28, 10)`.

#### Scenario: Reading a reduction project scenario value

- **WHEN** `reductionProject.baselineScenario` or `reductionProject.projectScenario` is read on either provider
- **THEN** its declared type SHALL be `Decimal @db.Decimal(28, 10)`
- **AND** computations SHALL preserve up to 10 decimal digits

### Requirement: Case-sensitive collation on SQL Server

A SQL Server deployment SHALL create its database with collation `Latin1_General_100_CS_AS_SC_UTF8` (or an equivalent `_CS_AS` UTF-8-aware collation). This SHALL be enforced by the deployment script that runs before `prisma migrate deploy`.

#### Scenario: Email uniqueness preserves case

- **WHEN** a user with `email: "Foo@x.com"` already exists
- **AND** an attempt is made to create a user with `email: "foo@x.com"` on SQL Server
- **THEN** the second insert SHALL succeed (the two values are treated as distinct, matching PG behavior)

### Requirement: PostgreSQL migrations reproduce the cleaned schema; SQL Server starts from a single baseline

The PostgreSQL migration history SHALL NOT be squashed. Instead, existing migrations are edited in place (dev-phase practice) so the chain reproduces the cleaned schema with zero drift — including the magnitude enum→table consolidation folded into the base migration, and the UUID/Decimal cleanups folded into their origin migrations. The SQL Server migration history SHALL be initialized as a single baseline migration generated from the `sqlserver` schema. From that point forward, each new feature SHALL add one migration file per provider, kept in sync.

#### Scenario: Fresh PostgreSQL deployment reproduces cleaned schema

- **WHEN** a new deployment runs `prisma migrate deploy --config=prisma.config.pg.ts` against an empty database
- **THEN** the migration chain applies all tables, views, partial indexes, and CHECK constraints
- **AND** `prisma db seed` succeeds with all reference data
- **AND** `prisma migrate diff --from-schema-datamodel <schema> --to-schema-datasource <db>` reports zero differences

#### Scenario: Fresh SQL Server deployment

- **WHEN** a new deployment runs `prisma migrate deploy --config=prisma.config.mssql.ts` against an empty database
- **THEN** the baseline migration applies all tables, views (rewritten for SQL Server), filtered indexes, and CHECK constraints
- **AND** `prisma db seed` succeeds and produces a state with the same logical content as the PG-equivalent deployment

### Requirement: Views are hand-ported to SQL Server with documented equivalents

The four views (`organization_summary_view`, `submission_summary_view`, `carbon_inventory_subtotals_view`, `carbon_inventory_sector_subtotals_view`) SHALL have a SQL Server rendition under `prisma/sqlserver/migrations/` that produces semantically equivalent rows. The rewriting SHALL replace `DISTINCT ON` with `ROW_NUMBER() OVER (PARTITION BY ...) = 1`, `FILTER (WHERE ...)` with `COUNT(CASE WHEN ... END)`, `EXTRACT(YEAR FROM x)::int` with `YEAR(x)`, enum-type casts with `CAST(... AS VARCHAR(N))`, and `CREATE OR REPLACE VIEW` with `CREATE OR ALTER VIEW`.

#### Scenario: Querying organization_summary_view returns the same rows on both providers

- **WHEN** a deployment runs an integration test that queries `organization_summary_view` against seeded data
- **THEN** the result set on SQL Server SHALL contain the same rows (same primary keys, same display_status, same is_accredited, same totals) as the result set on PostgreSQL for the same seeded fixture

### Requirement: Adapter and Fastify plugin select the provider client at startup

`src/adapter.ts` SHALL return an instance of `PrismaPg` when `DB_PROVIDER=postgresql` and `PrismaMssql` when `DB_PROVIDER=sqlserver`, using a parsed connection string compatible with the chosen driver. The Fastify Prisma plugin SHALL read `DB_PROVIDER` at API startup, import the active client from `@repo/database`, and register a single decorator (`fastify.prisma`) regardless of provider.

#### Scenario: Fastify boot with DB_PROVIDER=sqlserver

- **WHEN** the API starts with `DB_PROVIDER=sqlserver` and a `sqlserver://...` connection string
- **THEN** the plugin instantiates the SQL Server client
- **AND** `fastify.prisma` is the SQL Server-backed Prisma client
- **AND** `GET /health` returns 200 after executing `SELECT 1` against SQL Server

#### Scenario: Fastify boot with DB_PROVIDER=postgresql

- **WHEN** the API starts with `DB_PROVIDER=postgresql` and a `postgresql://...` connection string
- **THEN** the plugin instantiates the PostgreSQL client
- **AND** `fastify.prisma` is the PostgreSQL-backed Prisma client
- **AND** `GET /health` returns 200 after executing `SELECT 1` against PostgreSQL

### Requirement: Seeds run unchanged on both providers

The seed scripts under `packages/database/src/prisma/seeds/` SHALL use only Prisma Client operations (no raw SQL). `pnpm dev:seed` SHALL succeed against both PostgreSQL and SQL Server with no provider-specific branches in the seed code.

#### Scenario: Seeding a fresh SQL Server database

- **WHEN** a developer runs `DB_PROVIDER=sqlserver pnpm dev:seed` after applying migrations to an empty SQL Server database
- **THEN** the seed completes successfully
- **AND** all reference data (countries, sectors, magnitudes, units, methodologies, etc.) is present

### Requirement: Local development supports SQL Server via opt-in compose file

`packages/database/docker-compose.sqlserver.yml` SHALL provide a one-command setup for a local SQL Server 2019 instance compatible with the project's connection-string format. The existing `docker-compose.yml` for PostgreSQL SHALL remain unchanged.

#### Scenario: Starting SQL Server locally

- **WHEN** a developer runs `docker compose -f docker-compose.sqlserver.yml up -d`
- **THEN** a SQL Server 2019 container starts on a configurable port
- **AND** the documented `sqlserver://...` connection string in the deployment guide connects to it successfully

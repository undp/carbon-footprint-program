## ADDED Requirements

### Requirement: Provider selection at build time

The system SHALL allow a deployment to choose between PostgreSQL and SQL Server 2019+ as its database engine by setting a single environment variable, `DB_PROVIDER`, at build time. A value of `sqlserver` selects SQL Server; any other handling is defined below. The build SHALL generate the Prisma client for the selected provider into the single shared output directory `src/generated/prisma` (only the active provider's client exists at a time), so application import paths never branch on provider.

#### Scenario: Build with DB_PROVIDER=postgresql

- **WHEN** `DB_PROVIDER=postgresql` (or unset) before building
- **THEN** the build runs `prisma generate --config=prisma.config.pg.ts`
- **AND** the PostgreSQL client is generated into `src/generated/prisma`
- **AND** the resulting artifact connects to PostgreSQL using `postgresql://...` connection strings

#### Scenario: Build with DB_PROVIDER=sqlserver

- **WHEN** `DB_PROVIDER=sqlserver` before building
- **THEN** the build runs `prisma generate --config=prisma.config.mssql.ts`
- **AND** the SQL Server client is generated into the same `src/generated/prisma` directory
- **AND** the resulting artifact connects to SQL Server using `sqlserver://host:1433;database=...` connection strings (special characters brace-escaped: `password={...}`)

#### Scenario: Unset or invalid DB_PROVIDER

- **WHEN** `DB_PROVIDER` is unset
- **THEN** the system SHALL default to `postgresql` (backward-compatibility for existing dev/test setups)
- **WHEN** `DB_PROVIDER` contains a value other than `postgresql` or `sqlserver`
- **THEN** `environment.ts` SHALL throw a clear error naming the supported values

### Requirement: Schema parity between providers

Both `prisma/postgresql/schema.prisma` and `prisma/sqlserver/schema.prisma` SHALL define the same models, fields, relations, and constraints. The SQL Server schema SHALL be derived from the PostgreSQL schema by `scripts/_derive_sqlserver_schema.py`, which applies exactly these permitted divergences: `datasource.provider`; `@db.Uuid`→`@db.UniqueIdentifier`; native `enum` blocks removed and enum-typed fields → `String` (enum-member defaults → quoted strings); `@db.Text`→`@db.NVarChar(Max)` (and `EmissionFactor.source`→`@db.NVarChar(450)`); `Json`→`String @db.NVarChar(Max)`; `onUpdate: NoAction` on every FK relation, `onDelete: NoAction` where unset and for `Restrict`, plus the `CASCADE_BREAKS` overrides. Any PR that changes one schema MUST re-derive the other (and update `src/enums.ts` and `manual-ddl.sql` as needed) within the same merge.

#### Scenario: Adding a new model

- **WHEN** a contributor adds a new model in `prisma/postgresql/schema.prisma`
- **THEN** they MUST re-run the derive script so `prisma/sqlserver/schema.prisma` gains the same model with the permitted divergences applied, in the same pull request

#### Scenario: Adding a partial unique index

- **WHEN** a contributor adds a partial unique index (raw SQL in the PostgreSQL migration)
- **THEN** the equivalent SQL Server **filtered** unique index MUST be added to `prisma/sqlserver/manual-ddl.sql`
- **AND** if the index has nullable key columns, the SQL Server filter MUST append `AND <col> IS NOT NULL` to reproduce PostgreSQL's NULL-distinct semantics
- **AND** the Prisma 7.8 `partialIndexes` preview is NOT used (the `migrate` flow is blocked on SQL Server and the preview has open bugs — partial indexes are maintained as raw SQL)

### Requirement: JSON storage diverges by provider, bridged by a Prisma Client extension

Prisma's SQL Server connector does NOT support the `Json` scalar type. The six JSON columns (`EmissionFactor.gasDetails`, `CarbonInventory.organizationData`, `CarbonInventoryLineFactor.derivationDetails`, `CarbonInventoryLineResult.resultDetails`, `SystemParameter.options`, `ReductionProject.consideredGei`) SHALL be declared as Prisma `Json` (no `@db.JsonB`) in the PostgreSQL schema and as `String @db.NVarChar(Max)` in the SQL Server schema. A Prisma Client extension `applySqlServerCompat` (no-op on PostgreSQL) SHALL transparently `JSON.stringify` these columns on write and `JSON.parse` them on read, so application, seed, and mapper code receive plain objects/arrays identically on both providers. Read paths SHALL still validate via the column's Zod schema. No business logic SHALL depend on provider-specific JSON query semantics.

#### Scenario: Reading `gasDetails` returns a validated typed object

- **WHEN** code reads `emissionFactor.gasDetails` from the Prisma client (on either provider)
- **THEN** the mapper SHALL parse the value through `GasDetailsSchema` (Zod)
- **AND** a `DataIntegrityError` SHALL be thrown if the stored value does not match the schema

#### Scenario: No `where` filter on JSON content

- **WHEN** the database layer is searched for any Prisma query
- **THEN** no query SHALL use `where: { jsonField: { path: ..., equals: ... } }` or similar provider-specific JSON filters
- **AND** any future need to filter by JSON content MUST be promoted to a real column before merging

### Requirement: Array fields stored as JSON (provider-divergent as above)

`SystemParameter.options` and `ReductionProject.consideredGei` SHALL be stored as JSON arrays — Prisma `Json` on PostgreSQL, `String @db.NVarChar(Max)` on SQL Server (bridged by `applySqlServerCompat` as in the JSON requirement). Their values SHALL be validated by Zod array schemas (`z.array(...)`) in `packages/types`. The public HTTP API contract SHALL continue to expose `string[]`; conversion happens at the mapper layer.

#### Scenario: Creating a reduction project with considered GEIs

- **WHEN** the API receives `POST /reduction-projects` with `consideredGei: ["CO2", "CH4"]`
- **THEN** the request is validated against `ConsideredGeiArraySchema`
- **AND** the value is persisted as a JSON array via Prisma `Json`
- **AND** subsequent reads return the same `string[]` to the API consumer regardless of provider

### Requirement: Enums are provider-independent via a hand-authored facade

SQL Server does not support Prisma `enum` blocks, so its generated client emits no enum objects. The canonical enum definitions SHALL live in a hand-authored `packages/database/src/enums.ts` (const objects mirroring the PostgreSQL enums), re-exported explicitly from `src/index.ts` so they take precedence over the generated client's `export *`. PostgreSQL SHALL keep native `enum` blocks; SQL Server SHALL declare the corresponding fields as `String` and enforce the allowed values via CHECK constraints. Application code SHALL import enums from `@repo/database` / `@repo/database/enums` and work unchanged on either provider.

#### Scenario: An enum value is used on either provider

- **WHEN** application code uses e.g. `SystemRole.ADMIN` from `@repo/database`
- **THEN** it resolves to the same string literal regardless of provider
- **AND** persisting an invalid enum value is rejected — by the native enum type on PostgreSQL, by a CHECK constraint on SQL Server

### Requirement: SQL Server referential actions use `NoAction`

SQL Server forbids multiple cascade/SET NULL paths, self-relations without `NoAction`, and the `Restrict` action. The derived SQL Server schema SHALL set `onUpdate: NoAction` on every FK relation (inert — primary keys are immutable) and `onDelete: NoAction` where no explicit action exists and in place of `Restrict`, and SHALL break cascade "diamonds" by demoting the secondary path to `NoAction`. PostgreSQL referential actions SHALL be unchanged.

#### Scenario: SQL Server schema validates

- **WHEN** `prisma validate --config=prisma.config.mssql.ts` runs on the derived schema
- **THEN** it reports the schema valid (no cyclic/multiple-cascade-path errors, no unsupported `Restrict`)

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

### Requirement: PostgreSQL uses edited-in-place migrations; SQL Server uses `db push` + manual DDL

The PostgreSQL migration history SHALL NOT be squashed; existing migrations are edited in place so the chain reproduces the cleaned schema with zero drift (magnitude enum→table consolidation in the base migration; UUID/Decimal folds in their origin migrations).

The Prisma `migrate` CLI flow is unusable against a self-signed SQL Server in Prisma 7 (`migrate dev` hangs on the shadow DB; the schema engine rejects the TLS cert). Therefore the SQL Server schema SHALL be applied with `prisma db push` followed by `prisma/sqlserver/manual-ddl.sql` (views, CHECK constraints, filtered indexes), orchestrated by `scripts/setup-sqlserver.sh`. Versioned SQL Server migration generation is an OPEN ITEM (see design.md Open Questions).

#### Scenario: Fresh PostgreSQL deployment reproduces cleaned schema

- **WHEN** a new deployment runs `prisma migrate deploy --config=prisma.config.pg.ts` against an empty database
- **THEN** the migration chain applies all tables, views, partial indexes, and CHECK constraints
- **AND** `prisma db seed` succeeds with all reference data
- **AND** `prisma migrate diff` reports zero differences

#### Scenario: Fresh SQL Server deployment

- **WHEN** a new deployment runs `scripts/setup-sqlserver.sh` against an empty `huella` database (generate client → `db push` → apply `manual-ddl.sql` → seed)
- **THEN** all 42 tables, the 4 views (rewritten for SQL Server), the 15 filtered indexes, and the 5 CHECK constraints are present
- **AND** the seed succeeds (10 magnitudes, 18 units, 229 emission factors, …) with the same logical content as the PG-equivalent deployment

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

### Requirement: Local development supports SQL Server via a custom TLS-enabled image

`packages/database/docker-compose.sqlserver.yml` SHALL build a custom SQL Server 2019 image (`sqlserver-tls/Dockerfile`) that presents a cert generated by `scripts/gen-sqlserver-cert.sh` (placed under `/var/opt/mssql/certs`) and uses the `Latin1_General_100_CS_AS_SC_UTF8` server collation. This lets the Prisma schema engine verify the cert via `SSL_CERT_FILE` (working around the Prisma 7 self-signed-cert regression). The existing PostgreSQL `docker-compose.yml` SHALL remain unchanged.

#### Scenario: Starting SQL Server locally

- **WHEN** a developer runs `./scripts/gen-sqlserver-cert.sh` then `docker compose -f docker-compose.sqlserver.yml up -d --build`
- **THEN** a SQL Server 2019 container starts presenting the generated cert
- **AND** `./scripts/provision-sqlserver.sh` creates the `huella` database with the CS_AS_SC_UTF8 collation
- **AND** with `SSL_CERT_FILE` pointing at the generated cert, `prisma db push` connects and applies the schema

### Requirement: Behavioral parity is verified by the integration suite on SQL Server

The API integration suite SHALL be runnable against SQL Server via `TEST_DB_PROVIDER=sqlserver` (against a pre-seeded SQL Server, since the CLI migrate flow is blocked). The suite SHALL exercise views, JSON round-trips, partial indexes, enums, and soft-delete, and SHALL demonstrate functional equivalence with PostgreSQL.

#### Scenario: Running the suite against SQL Server

- **WHEN** the suite runs with `TEST_DB_PROVIDER=sqlserver` and `DB_PROVIDER=sqlserver` against a freshly set-up SQL Server (`setup-sqlserver.sh`)
- **THEN** the large majority of tests pass with identical results to PostgreSQL (prototype: 1227/1304, 94%)
- **AND** any remaining failures SHALL be limited to documented low-severity parity gaps (unique-violation error-code label, collation `ORDER BY`) rather than data corruption or crashes

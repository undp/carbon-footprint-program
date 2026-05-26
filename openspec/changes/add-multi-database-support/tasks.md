# Implementation Tasks — Chained Branches

This change is executed as a chain of **6 PRs**, each producing a reviewable milestone. Each branch starts from `main` AFTER the previous one is merged. PRs are numbered to make the dependency chain explicit.

| PR   | Branch                                 | Milestone                                                                                                                             | Depends on                                                 |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| PR 1 | `feat/mati/db-portability-cleanups`    | Migration cleanups in place (magnitude consolidation + UUID + Decimal unification) — NO squash                                        | `feat/mati/upgrade-low-risk-dependencies` merged to `main` |
| PR 2 | `feat/mati/json-array-portability`     | Schema types are provider-portable (JSONB dropped, arrays as Json + Zod)                                                              | PR 1 merged                                                |
| PR 3 | `feat/mati/multi-db-foundation`        | Dual-provider scaffolding: folder layout, configs, adapter selector, Fastify plugin. PG keeps working; SQL Server schema still empty. | PR 2 merged                                                |
| PR 4 | `feat/mati/sqlserver-schema-and-views` | First viable SQL Server deploy: schema, views ported, partial indexes, CHECK, collation, docker-compose                               | PR 3 merged                                                |
| PR 5 | `feat/mati/sqlserver-testing-and-docs` | Testcontainers SQL Server + docs + PR-template parity reminder                                                                        | PR 4 merged                                                |
| Ops  | (no branch)                            | Staging validation + performance bench + archive openspec change                                                                      | PR 5 merged                                                |

> **Convention for Prisma CLI tasks**: tasks that require executing `prisma migrate`, `prisma generate`, `prisma db seed`, or any local-DB-mutating command are marked **[runs Prisma — user executes]**. The implementer edits the relevant files and prepares the migration; the user runs the command and confirms before the checkbox is ticked.

---

## 0. Prerequisites (external sign-off, not coded)

- [ ] 0.1 `feat/mati/upgrade-low-risk-dependencies` (Prisma 7.8.0 bump) is merged to `main`
- [ ] 0.2 DevOps/PM confirm: zero production deployments have the existing migrations registered in `_prisma_migrations` (precondition for editing migrations in place — checksums change, requiring `migrate reset` on dev DBs)
- [ ] 0.3 Stakeholders confirm adoption of the Prisma 7.8.0 `partialIndexes` preview feature — run the validation experiment first (design.md POC finding 6: open bugs #29289 drop/recreate, #29386 loop)

---

## 1. PR 1 — `feat/mati/db-portability-cleanups` (Schema portability cleanups)

> **Squash abandoned** (validated in the POC — see design.md POC findings). The squash was meant to reduce SQL Server porting effort, but Prisma generates the SQL Server migrations from the `sqlserver` schema independently — it does not port the PG migrations, so the squash gave no SQL-Server benefit while adding real reconstruction risk (views, CHECK constraints, ~15 partial indexes live only in hand-written SQL, and later migrations mutate earlier objects). Instead, PR 1 edits existing migrations in place (dev-phase practice) to reach a clean final state with zero drift. The POC work (this content + the migration edits) was prototyped on `feat/mati/multi-db-poc`; cherry-pick / re-apply onto a fresh `feat/mati/db-portability-cleanups` branch when consolidating for the real PR.

**Branch base**: `main` (after `feat/mati/upgrade-low-risk-dependencies` is merged)
**Milestone**: migration chain reproduces a cleaned schema with zero drift — portable UUID generation, uniform Decimal precision, and `magnitude` reaching its final table shape in one migration (no enum→table dance). PG continues working unchanged; SQL Server work not yet started.
**Estimated**: 2 days.

### Schema cleanups (schema.prisma)

- [x] 1.1 In `src/prisma/schema.prisma`, replace `@default(dbgenerated("gen_random_uuid()"))` with `@default(uuid())` on `CarbonInventory.uuid`
- [x] 1.2 Audit other UUID columns: `User.uuid` already uses `@default(uuid())` (no change); `File.uuid` intentionally has no default because the UUID is provided by the caller to match an external blob-storage identifier (no change)
- [x] 1.3 Change `ReductionProject.baselineScenario` from `@db.Decimal(15, 4)` to `@db.Decimal(28, 10)`
- [x] 1.4 Change `ReductionProject.projectScenario` from `@db.Decimal(15, 4)` to `@db.Decimal(28, 10)`
- [x] 1.5 Grep confirmed: post-change, all 11 `@db.Decimal(...)` instances use `(28, 10)`; no Decimal fields lack an explicit precision annotation

### Edit migrations in place to reach final state with zero drift

- [x] 1.6 Consolidate magnitude: fold `20260510000000_convert_magnitude_enum_to_table` into the base migration — base now creates the `magnitude_status` enum + `magnitude` table and `measurement_unit.magnitude_id` FK directly; the dead `measurement_unit_unique_base_per_magnitude` index (on the dropped enum column) is removed; the conversion migration is deleted. Seed `seedMagnitudes` covers the 10 magnitudes for fresh installs.
- [x] 1.7 Fold UUID cleanup into origin: `create_carbon_inventory_table` migration `uuid` column drops `DEFAULT gen_random_uuid()`
- [x] 1.8 Fold Decimal cleanup into origin: `add_reduction_project` migration widens `baseline_scenario`/`project_scenario` to `DECIMAL(28,10)`
- [x] 1.9 Verified no migration references `gen_random_uuid()` or `DECIMAL(15,4)` anymore

### Validation (user runs Prisma)

> Editing existing migrations changes their checksums, so a `migrate reset` is required on the dev DB (acceptable in dev phase; no production deployments per precondition 0.2).

- [x] 1.10 **[runs Prisma — user executes]** `pnpm --filter=@repo/database db:restore` (= `prisma migrate reset --force && prisma db seed`) — rebuilds the dev DB from the edited migrations and re-seeds. ✓ All 31 migrations applied cleanly (consolidated base creates the `magnitude` table; `convert_magnitude` is gone); seed completed (10 magnitudes, 18 units, full reference data)
- [ ] 1.11 **[runs Prisma — user executes]** `pnpm --filter=@repo/database exec prisma migrate diff --from-schema-datamodel src/prisma/schema.prisma --to-schema-datasource "$DATABASE_URL"` — must report zero differences (proves the edited migrations reproduce the schema exactly)
- [ ] 1.12 **[runs Prisma — user executes]** `pnpm test --filter=api -- --coverage=false` against the rebuilt DB — full suite green

### Docs

- [x] 1.13 Update CLAUDE.md: `@db.Decimal(28, 10)` is the project-wide standard for all decimal columns
- [x] 1.14 Update CLAUDE.md: UUIDs use `@default(uuid())` (client-side), not `dbgenerated`

### Merge

- [ ] 1.15 Open PR (rename branch first if desired); pass CI (lint, type-check, format, tests); merge to `main`

---

## 2. PR 2 — `feat/mati/json-array-portability` (Type portability)

**Branch base**: `main` (after PR 1 merged)
**Milestone**: schema has no PG-only types remaining — `@db.JsonB` dropped, `String[]` removed, mappers validate via Zod. PG still works identically from the API consumer's perspective.
**Estimated**: 2-3 days.

### Schema changes

- [ ] 2.1 Remove `@db.JsonB` from `EmissionFactor.gasDetails` in `src/prisma/schema.prisma`
- [ ] 2.2 Remove `@db.JsonB` from `CarbonInventory.organizationData`
- [ ] 2.3 Remove `@db.JsonB` from `CarbonInventoryLineFactor.derivationDetails`
- [ ] 2.4 Remove `@db.JsonB` from `CarbonInventoryLineResult.resultDetails`
- [ ] 2.5 Change `SystemParameter.options` from `String[]` to `Json` (drop `@default([])`; the default JSON value will be set in the migration UPDATE step)
- [ ] 2.6 Change `ReductionProject.consideredGei` from `String[]` to `Json`

### Zod schemas

- [ ] 2.7 Add a new Zod schema for `derivationDetails` in `packages/types/src/baseSchemas/` (review the field's actual shape in the carbon-inventory feature first; conservative shape — `z.record(z.string(), z.unknown())` — is acceptable if structure is loose)
- [ ] 2.8 Add a Zod schema for `resultDetails` in `packages/types/src/baseSchemas/` (same approach)
- [ ] 2.9 Add `SystemParameterOptionsSchema = z.array(z.string())` in `packages/types/src/systemParameters/` (or co-locate with the existing `SystemParameterEntrySchema`)
- [ ] 2.10 Add `ConsideredGeiArraySchema = z.array(ConsideredGeiSchema)` in `packages/types/src/common/consideredGei/`; export from `index.ts`

### Mapper updates

- [ ] 2.11 Update API services that touch `gasDetails`, `organizationData`, `derivationDetails`, `resultDetails` to parse with their Zod schemas on read. `gasDetails` and `organizationData` already have parsers — just verify they still apply post-`@db.JsonB`-removal.
- [ ] 2.12 Update `getSystemParameters` to parse `options` through `SystemParameterOptionsSchema` on read
- [ ] 2.13 Update `reductionProjects` mapper to parse `consideredGei` through `ConsideredGeiArraySchema` on read. Outbound API contract continues to return `string[]`.

### Data migration

- [ ] 2.14 Create a raw-SQL migration in `packages/database/src/prisma/migrations/` that converts existing PG data:
  - `UPDATE system_parameter SET options = to_jsonb(options::text[])` (or equivalent that produces `jsonb` arrays from existing `text[]`)
  - `UPDATE reduction_projects SET considered_gei = to_jsonb(considered_gei::text[])`

> **Note for the implementer**: the column type changes from `text[]` → `jsonb` are produced automatically by Prisma when the schema changes. The raw-SQL migration above is an `ALTER TABLE` + data-rewrite in one step; carefully sequence the type change so existing values are preserved (Prisma may need help here — review the generated migration and amend the `ALTER` with a `USING to_jsonb(...)` clause).

### Validation

- [ ] 2.15 **[runs Prisma — user executes]** `pnpm --filter=@repo/database dev:migrate` and inspect the generated migration; amend as described above
- [ ] 2.16 **[runs Prisma — user executes]** `pnpm test --filter=api -- --coverage=false` — full integration suite must pass

### Merge

- [ ] 2.17 Open PR `feat/mati/json-array-portability`; pass CI; merge to `main`

---

## 3. PR 3 — `feat/mati/multi-db-foundation` (Dual-provider scaffolding)

**Branch base**: `main` (after PR 2 merged)
**Milestone**: `packages/database/` is restructured for dual-provider. ADR + audits are in `docs/`. Adapter selector + Fastify plugin handle both providers. PG continues to work; SQL Server schema folder exists but is empty.
**Estimated**: 4-5 days.

### Documentation and audits (no code changes)

- [ ] 3.1 Create ADR `docs/architecture/adrs/0001-multi-database-support.md`. Explicit framing: divergence is **infrastructure-agnostic**, orthogonal to country-agnostic principle (which still applies to seeds and system parameters)
- [ ] 3.2 Audit the 4 views and write `docs/architecture/multi-db/view-port-notes.md` listing every PG-specific construct used per view with the SQL Server replacement
- [ ] 3.3 Audit `@db.Text` candidates: grep for `String` fields representing descriptions, comments, review notes, manual factor sources, explanations. Document recommended `@db.Text` additions in `docs/architecture/multi-db/db-text-audit.md` (apply in PR 4)
- [ ] 3.4 Audit unique constraints with nullable columns: flag any needing explicit `WHERE col IS NOT NULL` filtered indexes in SQL Server. Document in `docs/architecture/multi-db/null-uniqueness-audit.md` (apply in PR 4)

### Restructure `packages/database/`

- [ ] 3.5 Create directory `packages/database/src/prisma/postgresql/`; move `schema.prisma` and `migrations/` into it
- [ ] 3.6 Create directory `packages/database/src/prisma/sqlserver/` (empty for now)
- [ ] 3.7 Add `generator client { output = "../../generated/prisma-postgresql" }` to `postgresql/schema.prisma`
- [ ] 3.8 Update `packages/database/.gitignore` to exclude `src/generated/`
- [ ] 3.9 Create `packages/database/prisma.config.pg.ts` pointing at `src/prisma/postgresql/schema.prisma`
- [ ] 3.10 Create `packages/database/prisma.config.mssql.ts` pointing at `src/prisma/sqlserver/schema.prisma` (config will be valid once PR 4 lands the SQL Server schema)
- [ ] 3.11 Update `packages/database/package.json` scripts:
  ```json
  "dev:migrate:pg": "prisma migrate dev --config=prisma.config.pg.ts",
  "dev:migrate:mssql": "prisma migrate dev --config=prisma.config.mssql.ts",
  "dev:generate:pg": "prisma generate --config=prisma.config.pg.ts",
  "dev:generate:mssql": "prisma generate --config=prisma.config.mssql.ts",
  "dev:seed:pg": "DB_PROVIDER=postgresql prisma db seed",
  "dev:seed:mssql": "DB_PROVIDER=sqlserver prisma db seed",
  "prod:deploy:pg": "prisma migrate deploy --config=prisma.config.pg.ts",
  "prod:deploy:mssql": "prisma migrate deploy --config=prisma.config.mssql.ts"
  ```
  Keep the old `dev:migrate`/`dev:generate`/`dev:seed` aliases pointing to the `:pg` variants during transition.
- [ ] 3.12 Update `packages/database/src/index.ts` to re-export the active client based on `DB_PROVIDER` env (set at build time); document the pattern in `packages/database/README.md`

### Adapter + Fastify plugin

- [ ] 3.13 Add `@prisma/adapter-mssql@^7.8.0` to `packages/database/package.json` dependencies
- [ ] 3.14 Refactor `packages/database/src/adapter.ts` to a selector:
  ```ts
  if (process.env.DB_PROVIDER === "sqlserver")
    return new PrismaMssql({ connectionString });
  return new PrismaPg({ connectionString });
  ```
- [ ] 3.15 Validate `DB_PROVIDER` at startup; throw a clear `ConfigError` if unset or not in `("postgresql", "sqlserver")`
- [ ] 3.16 Refactor the Fastify Prisma plugin in `apps/api/src/plugins/` to read `DB_PROVIDER`, import the active client from `@repo/database`, and register `fastify.prisma` — single plugin implementation
- [ ] 3.17 Confirm `apps/api/src/routes/health.ts` (`SELECT 1`) still passes on PG

### Validation

- [ ] 3.18 **[runs Prisma — user executes]** `pnpm --filter=@repo/database dev:generate:pg` produces the PG client; the API boots with `DB_PROVIDER=postgresql`
- [ ] 3.19 **[runs Prisma — user executes]** Full integration test suite passes against PG

### Merge

- [ ] 3.20 Open PR `feat/mati/multi-db-foundation`; pass CI; merge to `main`

---

## 4. PR 4 — `feat/mati/sqlserver-schema-and-views` (First viable SQL Server deploy)

**Branch base**: `main` (after PR 3 merged)
**Milestone**: SQL Server schema exists, views are ported, partial indexes converted, CHECK constraints replicated, collation scripted, docker-compose available for local dev. A developer can run the API against SQL Server end-to-end (smoke).
**Estimated**: 5-7 days.

### SQL Server schema

- [ ] 4.1 Copy `postgresql/schema.prisma` to `sqlserver/schema.prisma`
- [ ] 4.2 Change `datasource.provider = "sqlserver"` and `generator client { output = "../../generated/prisma-sqlserver" }`
- [ ] 4.3 Replace `@db.Uuid` with `@db.UniqueIdentifier` on all UUID fields in `sqlserver/schema.prisma`
- [ ] 4.4 Set `previewFeatures = ["views", "partialIndexes"]` in both schemas
- [ ] 4.5 Apply the `@db.Text` recommendations from `docs/architecture/multi-db/db-text-audit.md` (added in PR 3) to both schemas

### Partial unique indexes (declarative)

- [ ] 4.6 Convert each of the 8+ partial unique indexes from raw SQL to declarative `@@unique([...], where: ...)` in both schemas
- [ ] 4.7 For any partial index the preview cannot express (e.g., `NULLS NOT DISTINCT` on `organization_main_activity`), keep a raw-SQL migration in both providers and document the reason

### CHECK constraints

- [ ] 4.8 Replicate all CHECK constraints (position > 0, etc.) in raw-SQL migrations in `sqlserver/migrations/`
- [ ] 4.9 Add `WHERE col IS NOT NULL` filtered indexes in `sqlserver/migrations/` for every unique constraint flagged in `docs/architecture/multi-db/null-uniqueness-audit.md`

### Views (raw-SQL migrations under `sqlserver/migrations/`)

- [ ] 4.10 Port `organization_summary_view`: `DISTINCT ON` → `ROW_NUMBER() OVER (PARTITION BY ...) = 1`, `FILTER (WHERE ...)` → `COUNT(CASE WHEN ... END)`, `EXTRACT(YEAR FROM x)::int` → `YEAR(x)`, `expr::enum_type` → `CAST(expr AS VARCHAR(N))`, `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`
- [ ] 4.11 Port `carbon_inventory_subtotals_view`
- [ ] 4.12 Port `carbon_inventory_sector_subtotals_view`
- [ ] 4.13 Port `submission_summary_view`

### Provisioning script and local compose

- [ ] 4.14 Create `packages/database/scripts/provision-sqlserver.sh` (or `.ts`) that runs `CREATE DATABASE huella COLLATE Latin1_General_100_CS_AS_SC_UTF8` against the configured SQL Server host
- [ ] 4.15 Document calling the provisioning script before `prisma migrate deploy` in `docs/operations/deployment.md`
- [ ] 4.16 Create `packages/database/docker-compose.sqlserver.yml` with `mcr.microsoft.com/mssql/server:2019-latest`, `ACCEPT_EULA=Y`, configurable `MSSQL_SA_PASSWORD`, port mapping. Pre-create the database with the correct collation in an init script

### Validation

- [ ] 4.17 **[runs Prisma — user executes]** Start SQL Server locally: `docker compose -f packages/database/docker-compose.sqlserver.yml up -d`
- [ ] 4.18 **[runs Prisma — user executes]** Run the provisioning script, then `pnpm --filter=@repo/database dev:migrate:mssql -- dev --name initial`. Inspect generated SQL for sanity
- [ ] 4.19 **[runs Prisma — user executes]** `pnpm --filter=@repo/database dev:seed:mssql` succeeds
- [ ] 4.20 **[runs Prisma — user executes]** Smoke-test API: start with `DB_PROVIDER=sqlserver`, `GET /health` returns 200, list a few entities via integration tests selected by hand

### Merge

- [ ] 4.21 Open PR `feat/mati/sqlserver-schema-and-views`; pass CI; merge to `main`

---

## 5. PR 5 — `feat/mati/sqlserver-testing-and-docs` (Tests + docs + parity reminder)

**Branch base**: `main` (after PR 4 merged)
**Milestone**: Testcontainers SQL Server selectable, PR template / CLAUDE.md remind devs to update both schemas, all developer docs and operational docs reflect dual-provider reality.
**Estimated**: 3-4 days.

### Testcontainers SQL Server

- [ ] 5.1 Add Testcontainers SQL Server in `apps/api/test/`: image `mcr.microsoft.com/mssql/server:2019-latest`, env `ACCEPT_EULA=Y`, configurable password, port mapping
- [ ] 5.2 Introduce `TEST_DB_PROVIDER` env (`postgresql` | `sqlserver`); default `postgresql`. The test bootstrap selects the testcontainer accordingly
- [ ] 5.3 Identify and abstract tests that depend on PG-specific behaviour (enum sort order, JSON path filters, identity vs sequence behaviour). Replace with provider-aware helpers or relax assertions

### Validation script

- [ ] 5.4 Create `packages/database/scripts/validate-sqlserver-version.ts` mirroring `validate-postgres-version.ts`; assert SQL Server >= 2019
- [ ] 5.5 Wire it into `prod:deploy:mssql` or document running it explicitly before deploy

### Parity reminders (the only "drift control" — no automated gate)

- [ ] 5.6 Add a checkbox to `.github/PULL_REQUEST_TEMPLATE.md` (create the file if it does not exist): "Schema changes are mirrored in both `prisma/postgresql/schema.prisma` and `prisma/sqlserver/schema.prisma`"
- [ ] 5.7 Update CLAUDE.md with the new layout, scripts, and a note: every schema-modifying PR MUST update both schemas in the same PR

### Documentation

- [ ] 5.8 Update `packages/database/README.md` with provider-aware instructions: choosing `DB_PROVIDER`, migrating/seeding/generating per provider, using `docker-compose.sqlserver.yml`, running the provisioning script
- [ ] 5.9 Create `docs/development/database-setup.md` covering both providers
- [ ] 5.10 Update `docs/operations/deployment.md` with the per-country provider-selection workflow (build-time env var, `CREATE DATABASE` collation requirement on SQL Server, connection-string formats: `postgresql://...` and `sqlserver://host:1433;database=...`)

### Validation

- [ ] 5.11 **[runs Prisma — user executes]** `TEST_DB_PROVIDER=postgresql pnpm test --filter=api -- --coverage=false` still passes
- [ ] 5.12 **[runs Prisma — user executes]** `TEST_DB_PROVIDER=sqlserver pnpm test --filter=api -- --coverage=false` passes (or the failures are documented and accepted as out of scope for this PR — capture in `docs/architecture/multi-db/known-test-gaps.md`)

### CI strategy (decide at this point)

- [ ] 5.13 Decide CI strategy (PR-blocking vs nightly vs manual trigger) based on measured boot times and CI resource impact; document the decision in `docs/operations/deployment.md`. If "nightly" or "manual", wire the workflow accordingly

### Merge

- [ ] 5.14 Open PR `feat/mati/sqlserver-testing-and-docs`; pass CI; merge to `main`

---

## 6. Ops — Staging validation and archive (no code branch)

**Branch base**: N/A (operational tasks, runs after PR 5 merged)
**Milestone**: a working SQL Server deployment in staging with documented performance characteristics. Openspec change archived.
**Estimated**: 3-5 days of ops work.

- [ ] 6.1 Provision a SQL Server 2019 instance in staging with the documented collation (run `provision-sqlserver.sh`)
- [ ] 6.2 Build and deploy the API with `DB_PROVIDER=sqlserver` and the staging `sqlserver://...` connection string
- [ ] 6.3 Run end-to-end flows: organization creation/accreditation, carbon inventory CRUD, submission lifecycle, reduction project CRUD
- [ ] 6.4 Bench the 4 views' performance against a representative seed dataset; record p50/p95 times
- [ ] 6.5 Bench JSON read paths (`gas_details` lookups in `getEmissionsDetailedSummary`) against the same dataset
- [ ] 6.6 If any view falls outside its SLA, design and implement the materialized-table fallback for that view (additional PR if needed); otherwise document the observed perf delta and accept it
- [ ] 6.7 Write a perf-comparison note in `docs/operations/multi-db-perf.md` summarizing observed differences between PG and SQL Server
- [ ] 6.8 Code review of every per-phase PR by at least one reviewer aware of the multi-DB plan (done before each PR merges, recorded here for completeness)
- [ ] 6.9 Update `openspec/changes/add-multi-database-support/` with any decisions amended during implementation
- [ ] 6.10 Archive the change via `openspec archive add-multi-database-support`

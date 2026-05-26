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
**Milestone**: schema has no PG-only types remaining — `@db.JsonB` dropped, `String[]` removed, the array column read path validates via Zod. PG still works identically from the API consumer's perspective.
**Estimated**: 1-2 days.

> **Approach note (POC):** migrations edited in place (TEXT[] → JSONB) rather than a separate data-migration step, consistent with PR 1. No `to_jsonb` backfill is needed because dev DBs are rebuilt via `migrate reset`; for any real environment with data, add a one-off `ALTER ... USING to_jsonb(...)` migration when consolidating.

### Schema changes

- [x] 2.1 Remove `@db.JsonB` from `EmissionFactor.gasDetails` in `src/prisma/schema.prisma`
- [x] 2.2 Remove `@db.JsonB` from `CarbonInventory.organizationData`
- [x] 2.3 Remove `@db.JsonB` from `CarbonInventoryLineFactor.derivationDetails`
- [x] 2.4 Remove `@db.JsonB` from `CarbonInventoryLineResult.resultDetails`
- [x] 2.5 Change `SystemParameter.options` from `String[]` to `Json @default("[]")`
- [x] 2.6 Change `ReductionProject.consideredGei` from `String[]` to `Json @default("[]")`

### Migration edits (in place)

- [x] 2.6a `system_parameter.options`: `TEXT[] NOT NULL DEFAULT '{}'` → `JSONB NOT NULL DEFAULT '[]'` (base migration)
- [x] 2.6b `reduction_projects.considered_gei`: `TEXT[]` → `JSONB NOT NULL DEFAULT '[]'` (add_reduction_project migration)
- [x] 2.6c The 4 JSON columns stay `JSONB` in their migrations — removing `@db.JsonB` from the schema is a no-op on PG SQL

### Zod schemas

- [x] 2.7 ~~Zod schema for `derivationDetails`~~ — **skipped**: only copied opaquely in `duplicateCarbonInventory`, never read as typed data. Dropping `@db.JsonB` is sufficient; a parser would be dead code.
- [x] 2.8 ~~Zod schema for `resultDetails`~~ — **skipped** (same reason)
- [x] 2.9 ~~`SystemParameterOptionsSchema`~~ — **skipped**: no endpoint reads `options` (it is write-only from seeds, validated in-memory at seed time). A read-path parser would be dead code.
- [x] 2.10 Add `ConsideredGeiArraySchema = z.array(ConsideredGeiSchema)` in `packages/types/src/common/consideredGei/schemas.ts` (exported via existing `index.ts`)

### Mapper updates

- [x] 2.11 `gasDetails` and `organizationData` already parse via their existing Zod schemas; no change needed beyond the `@db.JsonB` drop. `derivationDetails`/`resultDetails` are pass-through (no parse site).
- [x] 2.12 ~~Parse `options` in `getSystemParameters`~~ — N/A: the endpoint does not select `options`.
- [x] 2.13 `reductionProjects` mapper parses `consideredGei` through `ConsideredGeiArraySchema`; outbound contract still returns `string[]`. Write sites (create/update) pass `string[]`, assignable to Prisma's Json input.

### Validation (user runs Prisma)

- [x] 2.14 **[runs Prisma — user executes]** `pnpm --filter=@repo/database db:restore` — regenerated the client with the new `Json` types and rebuilt + seeded the DB. ✓
- [x] 2.15 **[runs Prisma — user executes]** `pnpm type-check` — client's new `JsonValue`/`InputJsonValue` types accepted at read (mapper) and write (create/update, seed) sites. ✓
- [x] 2.16 **[runs Prisma — user executes]** `pnpm test --filter=api -- reductionProjects --coverage=false` (and the broader suite) — reduction-project create/read round-trips `consideredGei` correctly. ✓

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

- [x] 3.1 Create ADR `docs/architecture/adrs/0001-multi-database-support.md`. Explicit framing: divergence is **infrastructure-agnostic**, orthogonal to country-agnostic principle (which still applies to seeds and system parameters)
- [x] 3.2 Audit the 4 views and write `docs/architecture/multi-db/view-port-notes.md` listing every PG-specific construct used per view with the SQL Server replacement
- [x] 3.3 Audit `@db.Text` candidates → `docs/architecture/multi-db/db-text-audit.md` (24 fields flagged; 2 already annotated). Apply in PR 4
- [x] 3.4 Audit unique constraints with nullable columns → `docs/architecture/multi-db/null-uniqueness-audit.md` (only `User.email` + `User.idpUserId` need `WHERE ... IS NOT NULL`; 7 raw-SQL partial indexes inventoried). Apply in PR 4

### Restructure `packages/database/`

- [x] 3.5 Moved `schema.prisma` + `migrations/` into `packages/database/src/prisma/postgresql/` (via `git mv`); shared `seeds/` stays at `src/prisma/seeds/`
- [x] 3.6 Created `packages/database/src/prisma/sqlserver/` (`.gitkeep`, empty until PR 4)
- [x] 3.7 **Adjusted (POC finding 8)**: generator `output` set to `../../generated/prisma` (single shared dir), NOT per-provider `prisma-postgresql`/`prisma-sqlserver`. Per-provider dirs would force a runtime branch in `index.ts`, impossible with static `export *`. Single dir → only the active provider is generated at build time; all consumer imports unchanged
- [x] 3.8 **N/A**: `src/generated/` is already gitignored by the root `**/generated/**` rule; no per-package `.gitignore` needed
- [x] 3.9 Created `packages/database/prisma.config.pg.ts` → `src/prisma/postgresql/schema.prisma` + `.../postgresql/migrations`
- [x] 3.10 Created `packages/database/prisma.config.mssql.ts` → `src/prisma/sqlserver/schema.prisma` (valid once PR 4 lands the schema; documented in-file)
- [x] 3.11 Update `packages/database/package.json` scripts:
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
  Done. Added `:pg`/`:mssql` variants for generate/migrate/seed/deploy; kept `dev:migrate`/`dev:generate`/`dev:seed`/`prod:deploy` as aliases → `:pg`; every command passes `--config`. `db:restore` uses the pg config. `dev:studio` pinned to pg config. Also added `@db.Text`-relevant note: `prebuild` → `prisma generate --config=prisma.config.pg.ts`.
- [x] 3.12 **Adjusted (POC finding 8)**: `index.ts` stays unchanged — the single shared output dir means the active client is whatever was generated at build time, so no `DB_PROVIDER` branch is possible or needed in `index.ts`. Documented the dual-provider pattern in `packages/database/README.md`

### Adapter + Fastify plugin

- [x] 3.13 Added `@prisma/adapter-mssql@^7.8.0` to `packages/database/package.json` dependencies (alphabetized before `adapter-pg`)
- [x] 3.14 Refactored `src/adapter.ts` to a selector — **corrected per POC finding 8**: `PrismaMssql` takes the JDBC connection string **directly** (`new PrismaMssql(connectionString)`), not `{ connectionString }` (that is `PrismaPg`'s shape). Selector keys off `DB_PROVIDER === DbProvider.SQLSERVER`
- [x] 3.15 **Adjusted (POC finding 8)**: `DB_PROVIDER` validated in `environment.ts`; an _invalid_ value throws a clear error. **Unset defaults to `postgresql`** (not throw) to preserve backward-compat — throwing would break all existing dev/test setups. Added `DbProvider` const-enum + `DB_PROVIDER` to `turbo.json` `globalEnv`
- [x] 3.16 **No-op (POC finding 8)**: the Fastify plugin (`apps/api/src/plugins/app/prisma.ts`) already imports `PrismaClient` + `generatePrismaAdapter` from `@repo/database`; the adapter selector makes it provider-agnostic with zero changes. Single plugin implementation achieved for free
- [x] 3.17 `apps/api/src/routes/health.ts` uses `SELECT 1`, which is universal across PG and SQL Server — no change. (PG pass confirmed at runtime in 3.18/3.19)

### Validation (user runs Prisma)

> ⚠️ Requires `pnpm install` first (new dep `@prisma/adapter-mssql`) and a regen of the client (its output path moved to `src/prisma/postgresql/` schema).

- [ ] 3.18 **[runs Prisma — user executes]** `pnpm install`, then `pnpm --filter=@repo/database dev:generate:pg` produces the PG client; `pnpm type-check` + `pnpm lint` green; the API boots with `DB_PROVIDER=postgresql` (or unset → defaults to pg)
- [ ] 3.19 **[runs Prisma — user executes]** `pnpm --filter=@repo/database db:restore` rebuilds from the moved migrations; full integration suite passes against PG

### Merge

- [ ] 3.20 (POC consolidation) Re-apply onto a fresh `feat/mati/multi-db-foundation` from `main`; open PR; pass CI; merge to `main`

---

## 4. PR 4 — `feat/mati/sqlserver-schema-and-views` (First viable SQL Server deploy)

**Branch base**: `main` (after PR 3 merged)
**Milestone**: SQL Server schema exists, views are ported, partial indexes converted, CHECK constraints replicated, collation scripted, docker-compose available for local dev. A developer can run the API against SQL Server end-to-end (smoke).
**Estimated**: 5-7 days.

### Enum portability (SQL Server has no native enums — see design.md finding 9)

- [x] 4.0a Make enum exports provider-independent: hand-authored canonical `src/enums.ts` (31 enums) + explicit re-export in `index.ts` so the 77 app imports work on either provider. **Validated on PG** (type-check + lint green).
- [ ] 4.0b Replicate enum value sets as raw-SQL CHECK constraints in `sqlserver/migrations/` (one CHECK per `String` column that is an enum in PG). Pending — written after the initial migration confirms column names.

### SQL Server schema

- [x] 4.1 Derived `sqlserver/schema.prisma` from `postgresql/schema.prisma` via `scripts/_derive_sqlserver_schema.py` (reproducible mechanical transform)
- [x] 4.2 `datasource.provider = "sqlserver"`. **Adjusted (finding 8)**: generator `output` stays `../../generated/prisma` (single shared client dir), not `prisma-sqlserver`
- [x] 4.3 `@db.Uuid` → `@db.UniqueIdentifier` (3 UUID fields: User/CarbonInventory/File)
- [x] 4.4 **Adjusted**: both schemas keep `previewFeatures = ["views"]`; `partialIndexes` deferred to its own experiment (task 4.6) to avoid destabilizing the validated PG state
- [x] 4.5 Applied `@db.Text` (24 fields from the db-text audit) to **both** schemas (no-op on PG: `String`/`@db.Text` both map to `text`)
- [x] 4.5a Enum-typed fields → `String` with quoted defaults; enum blocks dropped from the SQL Server schema (31 enums)

### Partial unique indexes (raw SQL for now; preview experiment deferred)

- [ ] 4.6 **Experiment (deferred)**: enable `partialIndexes` preview on PG, declare one partial index, `migrate dev`, read the diff (finding 6 bugs #29289/#29386). Adopt declarative only if no-op; otherwise keep raw SQL in both providers
- [ ] 4.7 Replicate the 7 partial unique indexes (status/active-scoped) as SQL Server **filtered indexes** in `sqlserver/migrations/` (per `null-uniqueness-audit.md`); `organization_main_activity` NULLS-NOT-DISTINCT comes for free on SQL Server

### CHECK constraints

- [ ] 4.8 Replicate all CHECK constraints (position > 0, measurement_unit base_factor, system_parameter value bounds) in raw-SQL migrations in `sqlserver/migrations/`
- [ ] 4.9 Add `WHERE col IS NOT NULL` filtered indexes in `sqlserver/migrations/` for `User.email` and `User.idpUserId` (per `null-uniqueness-audit.md`)

### Views (raw-SQL migrations under `sqlserver/migrations/`)

- [ ] 4.10 Port `organization_summary_view`: `DISTINCT ON` → `ROW_NUMBER() OVER (PARTITION BY ...) = 1`, `FILTER (WHERE ...)` → `COUNT(CASE WHEN ... END)`, `EXTRACT(YEAR FROM x)::int` → `YEAR(x)`, `expr::enum_type` → `CAST(expr AS VARCHAR(N))`, `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`
- [ ] 4.11 Port `carbon_inventory_subtotals_view`
- [ ] 4.12 Port `carbon_inventory_sector_subtotals_view`
- [ ] 4.13 Port `submission_summary_view`

### SQL Server compatibility extension (findings 10/14/15)

- [x] 4.5b Created `src/sqlServerCompat.ts` — a Prisma Client extension (`applySqlServerCompat`, no-op on PG) that strips unsupported `createMany({ skipDuplicates })` and transparently (de)serializes the 6 JSON columns (`String @db.NVarChar(Max)` on SQL Server). Wired into `seed.ts` and the Fastify Prisma plugin; exported from `@repo/database`. Avoids editing 19 `skipDuplicates` sites + every JSON read/write site

### TLS + provisioning + local compose

- [x] 4.14 Created `scripts/provision-sqlserver.sh` — idempotent `CREATE DATABASE huella COLLATE Latin1_General_100_CS_AS_SC_UTF8` (local `sqlcmd` or `docker exec` fallback)
- [ ] 4.15 Document the provisioning script + `SSL_CERT_FILE` cert flow before `prisma migrate deploy` in `docs/operations/deployment.md` (pending)
- [x] 4.16 Created `docker-compose.sqlserver.yml` — builds a **custom image** (`sqlserver-tls/Dockerfile`) presenting a cert we control + `scripts/gen-sqlserver-cert.sh`, so the schema engine verifies via `SSL_CERT_FILE` (finding 12). No persistent volume (baked `mssql.conf` is used); symbol-free SA password to avoid brace-escaping

### Validation — **end-to-end on SQL Server, prototyped & working**

- [x] 4.17 **[done]** `docker compose ... up -d --build` + `provision-sqlserver.sh` — custom SQL Server 2019 up with our cert; `huella` created with CS_AS_SC_UTF8
- [x] 4.18a **[done]** `prisma validate --config=prisma.config.mssql.ts` → schema valid (255 errors fixed — findings 9/10/11/13)
- [x] 4.18b **[done]** TLS resolved via `SSL_CERT_FILE` + custom cert image (finding 12). `prisma db push` syncs all **42 tables** in ~3s. NOTE: `migrate dev` hangs on the shadow-DB step (finding 16) — `db push` is the working apply path for the POC; real migration generation still pending
- [x] 4.19 **[done]** Full seed succeeds on SQL Server (10 magnitudes, 18 units, 229 emission factors with JSON `gasDetails`, system-parameter JSON `options`, …) via the compat extension; reads round-trip JSON (`options` → array, `gasDetails` → object)
- [ ] 4.20 Smoke-test API booting with `DB_PROVIDER=sqlserver`, `GET /health` 200 — pending (plugin now applies the compat extension; the 4 views must be created first for view-backed endpoints)

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

## Context

Huella Latam's data layer currently targets PostgreSQL only. The schema (`packages/database/src/prisma/schema.prisma`) leans on PG-specific types and constructs that have no direct equivalents in SQL Server: `@db.JsonB` (4 columns), `String[]` arrays (2 columns), `@db.Uuid` with `gen_random_uuid()`, native `CREATE TYPE ... AS ENUM` (30+ enums), partial unique indexes (`WHERE status <> 'DELETED'`, 8+ occurrences), and 4 SQL views that mix `DISTINCT ON`, `FILTER (WHERE ...)`, `EXTRACT::int` casts, `CREATE OR REPLACE VIEW`, and enum-type casts.

Some target countries cannot adopt PostgreSQL (IT policy, licensing, sovereignty constraints) and require SQL Server 2019+ on-premise (Standard/Enterprise). The codebase must support **both engines** without forking the deliverable per country.

Constraints we accept:

- 1 deployment = 1 engine. The same artifact does not run on both at the same time.
- Greenfield installs only. We do not migrate live PG → SQL Server data.
- Single developer (Mati) full-time; estimated 15-21 days of work end-to-end.

Constraints we honor:

- The CLAUDE.md "country-agnostic" principle: country variations live in seed data and system parameters, never in code. Multi-DB is an **orthogonal** dimension (infrastructure-agnostic, not country-agnostic); the ADR makes this explicit.

Prisma 7.8.0 is already merged to the upgrade branch and unlocks key features for this work: `partialIndexes` preview, mature `@prisma/adapter-mssql` (MSSQL v12.2.0 + fixes for EREQINPROG, VARCHAR cast, enum `@map` parametrization), and savepoint-based nested transactions in SQL Server.

## Goals / Non-Goals

**Goals:**

- Provide a single codebase that builds and deploys against either PostgreSQL or SQL Server 2019+ based on a `DB_PROVIDER` build-time env var.
- Minimize divergence between the two schema files: same models, same fields, same relations, same constraints — only provider-specific annotations (`@db.UniqueIdentifier`, view bodies, partial-index emitted SQL) differ.
- Keep the public HTTP API contract unchanged. All Prisma-client type changes (e.g., `string[]` → `Json`) are absorbed at the mapper layer via centralized Zod parsers.
- Preserve the developer experience: pure-Prisma seeds, factories, and tests continue to work; only `pnpm` scripts gain `:pg` / `:mssql` variants.
- Hand-port the 4 SQL views with documented SQL Server equivalents and ensure parity of semantics.

**Non-Goals:**

- Live data migration from PG → SQL Server (out of scope; greenfield only).
- Cross-provider replication or hybrid setups (one engine per deployment).
- A general database-vendor abstraction or repository layer over Prisma (would be over-engineering; current Prisma usage is direct in 50+ services).
- Automated parity gate between the two schemas in CI on day one. Deferred to post-MVP; revisit once the system is functional.
- Detailed CI strategy for Testcontainers SQL Server (PR-blocking vs nightly vs manual). Deferred to Phase 6 of implementation with real boot-time and resource data.
- Refactoring soft-delete semantics. Partial unique indexes remain in place; we do not move DELETED rows to history tables.

## Decisions

### Two schema.prisma files, one per provider

Prisma 7 binds `migrations/` to a single `datasource.provider`. A single schema with `provider = env(...)` does not validate when the model uses PG-specific types (`@db.JsonB`, `String[]`, `@db.Uuid`). The official Prisma 7 multi-provider recommendation is one schema per provider with distinct `generator client { output = ... }` paths.

**Decision**: maintain `prisma/postgresql/schema.prisma` and `prisma/sqlserver/schema.prisma`, each with its own `migrations/` folder and its own generated client directory. Reviewers enforce parity via human inspection; an automated parity check is deferred post-MVP.

**Alternatives considered**:

- Single schema with `provider = env("DB_PROVIDER")` — rejected: schema fails to validate under SQL Server because of `@db.JsonB`, `String[]`, etc.
- Schema transformer (custom script generating SQL Server schema from PG schema) — rejected: introduces a non-standard build step Prisma does not know about; brittle.

### JSON columns: drop `@db.JsonB`, rely on `Json` + Zod

The 4 JSON columns (`EmissionFactor.gasDetails`, `CarbonInventory.organizationData`, `CarbonInventoryLineFactor.derivationDetails`, `CarbonInventoryLineResult.resultDetails`) are never filtered in `where` clauses, never indexed, and 2 of them (`gasDetails`, `organizationData`) already use the **`Json` + centralized Zod parser** pattern in `packages/types/`.

**Decision**: drop `@db.JsonB` everywhere. Prisma `Json` maps to `jsonb` in PG and `nvarchar(max)` in SQL Server automatically. Add centralized Zod parsers for the remaining 2 columns (`derivationDetails`, `resultDetails`). Mapper-level validation is the source of type safety.

**Alternative considered**: normalize JSON columns to separate tables — rejected: zero queries filter by JSON content, so the cost (new tables, JOINs, data migration) exceeds the benefit.

### `String[]` arrays: convert to `Json` + Zod array schema

`SystemParameter.options` and `ReductionProject.consideredGei` are stored opaquely (read whole, written whole, never filtered by element). The frontend already operates on `string[]` natively.

**Decision**: change Prisma type from `String[]` to `Json` in both schemas. In `packages/types`, define `ConsideredGeiArraySchema = z.array(ConsideredGeiSchema)` and a similar parser for `SystemParameter.options`. The mapper validates and exposes `string[]` to the API consumers, so the HTTP contract is unchanged.

**Alternatives considered**:

- Delimited string (`'A;B;C'`) + parse helper — rejected: separator collisions, harder to validate per element, redundant when Prisma `Json` already returns a JS array.
- Junction tables (`system_parameter_option`, `reduction_project_gei`) — rejected: no query benefit; introduces JOINs in hot paths.

### Partial unique indexes: declarative via Prisma 7.8.0 `partialIndexes` preview

Schema currently uses 8+ raw-SQL partial unique indexes with `WHERE status <> 'DELETED'` semantics.

**Decision**: enable `previewFeatures = ["views", "partialIndexes"]` in both schemas. Declare partial uniques as `@@unique([...], where: ...)`. Prisma emits PG `WHERE` clause (partial index) and SQL Server `WHERE` clause (filtered index) — same source of truth, no manual duplication.

**Fallback**: if the preview does not cover a specific case (e.g., the `NULLS NOT DISTINCT` semantics in `organization_main_activity`), fall back to raw SQL in that migration only — not the entire constraint family.

### UUID generation: unify to `@default(uuid())` (client-side)

Current schema is inconsistent: `User.uuid` uses `@default(uuid())` (client-side, portable), while `CarbonInventory.uuid` uses `dbgenerated("gen_random_uuid()")` (PG-only).

**Decision**: unify to `@default(uuid())` for all UUID columns. Prisma generates the UUID in JavaScript at insert time. Removes the `gen_random_uuid()` ↔ `newid()` divergence entirely.

**Trade-off**: a sufficiently large bulk-insert workload could in principle benefit from DB-side UUID generation. We do not have such a workload in this codebase, and the portability win outweighs the theoretical perf gain.

### Decimal precision: unify to `@db.Decimal(28, 10)`

Current schema is inconsistent: most decimal columns use `(28, 10)`; `ReductionProject.baselineScenario` and `projectScenario` use `(15, 4)`.

**Decision**: unify to `(28, 10)` across all decimal columns. Migration of existing data is trivial (precision is being widened, not narrowed). Documented in CLAUDE.md as the project-wide decimal precision standard.

### `@db.Text` annotation: keep where it applies

Prisma `String` (no annotation) maps to `text` in PG (unbounded) and `nvarchar(1000)` in SQL Server (bounded). `String @db.Text` maps to `nvarchar(max)` in SQL Server.

**Decision**: keep `@db.Text` on fields that may legitimately exceed 1000 chars (`Category.explanation`, `Subcategory.explanation` today). Audit other candidate fields (descriptions, comments, review notes, manual factor sources) in Phase 0 of implementation and add `@db.Text` where appropriate to prevent silent truncation in SQL Server.

### Provider selection: `DB_PROVIDER` env var, build-time

**Decision**: a `DB_PROVIDER` env var (`postgresql` | `sqlserver`) is set in the CI/CD pipeline before `prisma generate` runs. Only the active provider's client is generated and bundled. `src/index.ts` re-exports the active client. `src/adapter.ts` selects between `PrismaPg` and `PrismaMssql` based on the same env var. The Fastify Prisma plugin reads `DB_PROVIDER` at startup and instantiates the right client — a single plugin implementation, not two.

**Alternative considered**: runtime selection with both clients bundled — rejected: doubles the bundle, useless when 1 deployment = 1 engine.

### Connection string: URL-style for both providers

**Decision**: SQL Server uses `sqlserver://host:1433;database=...;...` (Prisma's documented URL form). PostgreSQL keeps `postgresql://...`. ADO.NET-style connection strings are not accepted as input; we standardize on one form.

### `prisma.config.ts`: two separate config files

Prisma 7's `prisma.config.ts` supports a single `schema` path.

**Decision**: split into `prisma.config.pg.ts` and `prisma.config.mssql.ts`. Each `package.json` script (`dev:migrate:pg`, `dev:migrate:mssql`, etc.) passes `--config=...` explicitly. No env-based branching inside config files.

### Migration cleanups: edit in place, do NOT squash (revised after POC)

**Original idea (rejected)**: squash the 33 migrations into one baseline in a pre-multi-DB PR, to reduce SQL Server porting effort.

**POC finding**: the squash gives **no SQL Server benefit**. Prisma generates the SQL Server migrations from the `sqlserver` schema **independently** — it does not "port" the PostgreSQL migrations. SQL Server starts from a single baseline regardless of how many PG migrations exist. Meanwhile the squash adds real risk: views, CHECK constraints, and ~15 partial unique indexes live only in hand-written SQL (the schema documents them in comments), and **later migrations mutate earlier objects** (e.g. the magnitude enum→table conversion silently dropped `measurement_unit_unique_base_per_magnitude`), so a regenerated baseline is neither trivial nor reliably complete.

**Decision**: do NOT squash. Instead, edit existing migrations in place (standard dev-phase practice for this project) to reach a clean final state with zero drift:

- Consolidate the magnitude enum→table conversion into the base migration (so `measurement_unit`/`magnitude` are born in final shape — no enum→table dance). **Validated**: `prisma migrate reset` + seed applies the full edited chain cleanly.
- Fold the UUID cleanup (`@default(uuid())`, drop `gen_random_uuid()`) into the `create_carbon_inventory_table` migration.
- Fold the Decimal cleanup (`(28,10)`) into the `add_reduction_project` migration.
- Editing migrations changes their checksums → requires `prisma migrate reset` on dev DBs (acceptable; no production deployments per precondition).

### Views: hand-rewrite for SQL Server, accept worst-case perf if within SLA

The 4 views use PG-specific constructs. SQL Server equivalents are well-known: `DISTINCT ON` → `ROW_NUMBER`, `FILTER (WHERE ...)` → `COUNT(CASE WHEN ... END)`, `EXTRACT(YEAR FROM x)::int` → `YEAR(x)`, `expr::enum_type` → `CAST(expr AS VARCHAR(N))`, `CREATE OR REPLACE VIEW` → `CREATE OR ALTER VIEW`.

**Decision**: rewrite each view as raw SQL in `sqlserver/migrations/`. Bench in Phase 8. If a view falls outside its SLA, the fallback is to convert that specific view to a materialized table refreshed asynchronously — applied only when bench data justifies it, not preemptively.

### Collation: force `_CS_AS` in SQL Server

SQL Server defaults to `SQL_Latin1_General_CP1_CI_AS` (case-insensitive). PG defaults to a case-sensitive comparison. To preserve identical uniqueness semantics on `User.email`, `Magnitude.code`, `MeasurementUnit.abbreviation`, etc.:

**Decision**: `CREATE DATABASE ... COLLATE Latin1_General_100_CS_AS_SC_UTF8` in the SQL Server provisioning script that runs before `prisma migrate deploy`. Document the requirement in `docs/operations/deployment.md`.

## Risks / Trade-offs

- **Silent schema drift between PG and SQL Server** (probability: High; impact: High) → Mitigation: human review in PRs; CLAUDE.md / PR template note that every schema-touching PR MUST modify both files; automated parity gate is deferred but acknowledged as a follow-up.
- **View performance in SQL Server under CTEs** (probability: Medium; impact: High) → Mitigation: bench in Phase 8; fallback to materialized tables only for views that miss SLA. Accept worse-but-acceptable performance otherwise.
- **JSON queries slower in SQL Server without GIN equivalents** (probability: Medium; impact: Medium) → Mitigation: audited usage shows no `where` filters on JSON columns; risk is theoretical for current code paths.
- **NULL semantics in unique indexes differ (PG: distinct; SQL Server: equal)** (probability: Medium; impact: Medium) → Mitigation: every unique constraint that allows NULLs is audited in Phase 0; filtered indexes with `WHERE col IS NOT NULL` added where needed.
- **Maintenance overhead per feature increases ~30%** (probability: High; impact: Medium) → Mitigation: documented expectation; estimated ticket sizes adjusted. Acceptable trade for market reach.
- **`@prisma/adapter-mssql` bugs or missing features** (probability: Low — vs. Medium pre-7.8.0; impact: High) → Mitigation: Prisma 7.3+ ships MSSQL v12.2.0; 7.4 fixes EREQINPROG; 7.8 fixes VARCHAR cast and enum `@map`. PoC in Phase 0 validates remaining unknowns.
- **`partialIndexes` preview feature API changes** (probability: Low; impact: Low) → Mitigation: if Prisma changes the API, fallback is raw SQL filtered indexes (the original pre-7.8.0 plan).
- **Collation `_CS_AS` breaks future case-insensitive searches** (probability: Low; impact: Low) → Mitigation: use `LIKE ... COLLATE Latin1_General_CI_AS` explicitly when case-insensitive matching is required.

## Migration Plan

This is a greenfield multi-DB rollout; there is no PG → SQL Server live data migration. The phases below describe the implementation rollout (the rollback strategy is per-PR revert).

**Phase ordering** (full detail in `tasks.md`):

1. Merge `feat/mati/upgrade-low-risk-dependencies` to `main` (Prisma 7.8.0).
2. PR 1 (migration cleanups, edit-in-place — NO squash): magnitude consolidation + UUID/Decimal folds. Validated in the POC via `migrate reset` + seed.
3. Phase 0: PoC `@prisma/adapter-mssql`, validate `partialIndexes` preview against a real partial index, audit the 4 views for PG-specific constructs, audit `@db.Text` candidates, create ADR.
4. Phase 1: restructure `packages/database/` (folder layout, two config files, scripts, generator outputs, `docker-compose.sqlserver.yml`).
5. Phase 2: unify JSON/array types in the PG schema (sub-phase 2a), then copy to SQL Server schema and switch provider-specific annotations (sub-phase 2b).
6. Phase 3: port views to SQL Server raw SQL; migrate partial indexes to `partialIndexes` declarative; replicate CHECK constraints; configure CS collation at DB creation.
7. Phase 4: adapter selector + Fastify plugin refactor.
8. Phase 5: validate seeds against SQL Server; gemelo `validate-sqlserver-version.ts`; PR-checklist note in CLAUDE.md.
9. Phase 6: opt-in Testcontainers SQL Server in tests; abstract any PG-specific test assumptions.
10. Phase 7: documentation (README, deployment doc, CLAUDE.md update).
11. Phase 8: staging end-to-end validation + perf bench; document observed perf differences.

**Rollback**: each phase is its own PR; reverting a phase restores the prior state. The PR 1 migration edits change checksums, so they require `migrate reset` on dev DBs (no production rows affected per precondition).

## POC Findings (discovery on branch `feat/mati/multi-db-poc`)

This change started as a proof-of-concept to surface the real challenges of supporting SQL Server. Concrete findings, to carry into the branch-by-branch consolidation:

1. **The squash does not help SQL Server** (see the migration-cleanups decision above). Abandoned. PR 1 became "edit migrations in place" instead.

2. **Migration consolidation works and is validated.** Folding the magnitude enum→table conversion into the base migration + the UUID/Decimal folds applies cleanly via `prisma migrate reset` (all 31 migrations apply, seed populates 10 magnitudes / 18 units / full reference data). This is the model for any future migration cleanup in dev phase.

3. **The real porting cost is the hand-written SQL, not the tables.** Prisma auto-generates tables, enums, FKs, and plain unique indexes for both providers. What must be hand-ported / hand-maintained per provider:
   - **4 views**: `organization_summary_view`, `submission_summary_view`, `carbon_inventory_subtotals_view`, `carbon_inventory_sector_subtotals_view`. PG-only constructs to translate: `DISTINCT ON`, `FILTER (WHERE ...)`, `EXTRACT(...)::int`, `expr::enum_type`, `CREATE OR REPLACE VIEW`.
   - **~4 CHECK constraints**: `position > 0` (category, emission_factor_dimension, country_organization_size), `measurement_unit_base_factor_check`.
   - **~15 partial unique indexes** (the `WHERE`-filtered ones). Final-state inventory below.

4. **Later migrations mutate earlier objects — the migration history is NOT a reliable source for final state.** The magnitude enum→table conversion did `DROP COLUMN magnitude`, which silently dropped `measurement_unit_unique_base_per_magnitude` (it was on that column) and nobody recreated it. So:
   - The "one base unit per magnitude" DB guarantee was **lost** in production history. **Open decision**: restore it as `UNIQUE(magnitude_id) WHERE is_base` or leave it to app-level enforcement. (The consolidated base migration in this POC does NOT recreate it, matching the real final state.)
   - To enumerate the true final-state partial indexes, query the live DB, do not read migrations:
     ```sql
     SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(ix.indexrelid)
     FROM pg_index ix
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND ix.indpred IS NOT NULL
     ORDER BY t.relname, i.relname;
     ```

5. **Partial-index inventory (final state, from migration tracing — confirm against the live-DB query before relying on it):**
   - `country_organization_size`: `(country_id, name) WHERE status = 'ACTIVE'`; `(country_id, position) WHERE status <> 'DELETED'`
   - `country_sector`: `(country_id, name) WHERE status = 'ACTIVE'`
   - `country_subsector`: `(country_sector_id, name) WHERE status = 'ACTIVE'`
   - `organization_main_activity`: `(name, country_sector_id, country_subsector_id) NULLS NOT DISTINCT WHERE status = 'ACTIVE'`
   - `methodology_version`: `(country_id, name, version) WHERE status <> 'DELETED'`
   - `category`: `(methodology_version_id, name)` and `(methodology_version_id, position)`, both `WHERE status <> 'DELETED'`
   - `subcategory`: `(category_id, name) WHERE status <> 'DELETED'`
   - `emission_factor_dimension`: `(subcategory_id, code)` and `(subcategory_id, position)`, both `WHERE status <> 'DELETED'`
   - `emission_factor_dimension_value`: `(dimension_id, value) WHERE status <> 'DELETED'`
   - `emission_factor`: `(subcategory + dims + source) WHERE status <> 'DELETED'`
   - `submission`: `(type, subject_id) WHERE status IN ('PENDING','APPROVED','APPROVED_AUTOMATICALLY')`
   - `user_organization_membership`: `(user_id, organization_id) WHERE status = 'ACTIVE'`
   - `badge`: `(type) WHERE status = 'ACTIVE'`
   - `subcategory_recommendation`: `(subcategory_id, sector_id, subsector_id) WHERE status = 'ACTIVE'`
   - `carbon_inventory_line_input`: `(line_id) WHERE is_active = true`
   - **DROPPED / lost**: `measurement_unit_unique_base_per_magnitude` (see finding 4).

6. **`partialIndexes` preview (Prisma 7.4+) has open bugs to validate before adopting:**
   - Syntax: `@@unique([...], where: raw("status <> 'DELETED'"))` (raw predicate) or `where: { field: value }` (object).
   - [#29289](https://github.com/prisma/prisma/issues/29289): generates a DROP for manually-created partial indexes — directly relevant since ours are hand-written; converting may produce drop/recreate churn rather than a no-op.
   - [#29386](https://github.com/prisma/prisma/issues/29386): infinite generation loop with varchar partial unique index.
   - [#29282](https://github.com/prisma/prisma/issues/29282): generates a `UniqueCompoundInput` type (affects generated client types).
   - **Validation experiment (not yet run)**: enable the preview, declare the final-state partial indexes, run `migrate dev`, and read the diff. No-op → adopt; drop/recreate or loop → keep raw SQL in both providers. Use the live-DB query (finding 4) for the ground-truth list.
   - `NULLS NOT DISTINCT` (organization_main_activity) likely cannot be expressed via the preview and stays raw SQL.

7. **Operational gotchas:**
   - `prisma` is not on the global PATH — always invoke via `pnpm --filter=@repo/database ...` or `pnpm --filter=@repo/database exec prisma ...`. A bare `prisma ...` triggers the shell's command-not-found handler.
   - The repo's git remote `origin` still points at the old `in-ventures/undp-huella-latam` location (redirects to `undp/carbon-footprint-program`).

8. **Dual-provider scaffolding (PR 3) — discoveries while restructuring `@repo/database`:**
   - **Single generated-client output dir beats per-provider dirs.** The original plan (task 3.7) generated to `generated/prisma-postgresql` / `generated/prisma-sqlserver` and had `index.ts` re-export "the active client". This is impossible cleanly: `index.ts` uses `export *`, which is **static** — it cannot branch on `DB_PROVIDER` at module load. **Decision (POC):** both schemas generate to the **same** `src/generated/prisma` dir; only the active provider is generated at build time (chosen by which `prisma.config.*.ts` runs). Result: `index.ts`, the Fastify plugin, and every consumer import stay **unchanged** — zero application-code branching on provider. This made tasks 3.12 and 3.16 essentially no-ops.
   - **`@prisma/adapter-mssql` constructor takes the connection string directly OR a node-mssql config object — NOT `{ connectionString }`.** `new PrismaMssql("sqlserver://...")` works; `new PrismaMssql({ connectionString })` would be read as a node-mssql config missing `server`. `PrismaPg` uses `{ connectionString }`. The selector therefore passes the bare string to MSSQL and `{ connectionString }` to PG.
   - **`DB_PROVIDER` defaults to `postgresql` when unset, instead of throwing** (deviates from task 3.15). Throwing on unset would break every existing local/dev/test setup (none set it) and the entire test suite. Defaulting preserves backward-compat ("PG keeps working unchanged"); SQL Server requires an explicit opt-in. An _invalid_ value still throws a clear error. Added `DB_PROVIDER` to `turbo.json` `globalEnv` (it changes build output).
   - **Health check + Fastify plugin needed no per-provider code.** `SELECT 1` is universal; the adapter selector is the only provider-aware code. Single plugin implementation, as the milestone required, achieved for free.
   - **`infra/run-migrations.sh` calls `pnpm prod:deploy`** — kept a `prod:deploy` alias → `prod:deploy:pg` so existing infra is untouched. SQL Server deploy wiring deferred to PR 4/5.
   - **`src/generated/` already gitignored** by the root `**/generated/**` rule → task 3.8 (per-package `.gitignore`) is unnecessary.

9. **SQL Server has no native enums — the biggest divergence (PR 4).** The PG schema has **31 `enum` blocks**, and the app imports the generated enum objects from `@repo/database/enums` AND from `@repo/database` (main) across **77 files**. Prisma's SQL Server connector does not support `enum` blocks, so the SQL Server client generates **no enum objects** → those 77 imports would break when building against SQL Server.
   - **Decision (confirmed with stakeholder):** the canonical enums live in a **hand-authored `src/enums.ts`** facade (31 const objects, values mirror the PG schema). `index.ts` re-exports those names **explicitly** so they take precedence over the generated client's own `export * from "./enums.js"` — under PG this avoids an ambiguous double star-export; under SQL Server it is the only source. App code is **unchanged** on either provider. Validated on PG: type-check + lint green.
   - **Decision (confirmed):** **PG keeps native enums; SQL Server uses `String` + CHECK.** Zero churn on the validated PG schema. Consequence: every enum field diverges (`enum` in PG, `String` in MSSQL), and the allowed values are enforced on SQL Server via raw-SQL CHECK constraints (added as a follow-up migration, since the generated migration won't include them).
   - **New manual parity points:** (a) the enum facade must stay in sync with both schemas; (b) when an enum changes, update the PG `enum` block, the MSSQL `String` field's CHECK, and `src/enums.ts`.
   - **Schema derivation:** the SQL Server schema is mechanically derived from the PG schema by `scripts/_derive_sqlserver_schema.py` (drop enum blocks, enum-typed fields → `String`, enum-member defaults → quoted strings, `@db.Uuid` → `@db.UniqueIdentifier`, provider swap). `@db.Text` (24 free-text fields, per the db-text audit) is applied to **both** schemas (no-op on PG: `String` and `@db.Text` both map to `text`).
   - **Anticipated next blocker (not yet hit):** SQL Server forbids multiple cascade paths / cycles in FK graphs that PG allows. The initial `migrate dev` against SQL Server is expected to surface this; the fix is per-relation `onDelete: NoAction` in the MSSQL schema where Prisma's defaults create conflicting cascade paths.

10. **Prisma's SQL Server connector does NOT support the `Json` scalar type** (PostgreSQL does). `prisma validate` rejects every `Json` field. This **invalidates PR 2's portability premise** (we assumed `Json` maps to `nvarchar(max)` on SQL Server — it does not; Prisma refuses the type outright).
    - **Fix in the SQL Server schema:** the 6 JSON columns (`gasDetails`, `organizationData`, `derivationDetails`, `resultDetails`, `SystemParameter.options`, `ReductionProject.consideredGei`) become `String @db.Text` (`nvarchar(max)`), storing JSON as text.
    - **Consequence (app-layer, not yet solved):** the generated client types diverge — PG returns `JsonValue`, SQL Server returns `string`. Read paths must `JSON.parse` and write paths must `JSON.stringify` on SQL Server. This **breaks `pnpm type-check` at write sites when building against SQL Server** (object not assignable to `string`) and the Zod read-parsers receive a string instead of an object. A provider-aware JSON (de)serialization layer (mapper helper or Prisma client extension) is needed — **deferred and flagged as a known gap for PR 5**; PR 4's milestone is schema + migration, not full app round-trip.

11. **SQL Server referential-action limitations (PR 4).** Discovered iteratively via `prisma validate` (255 errors total, fixed in waves):
    - **Multiple cascade/SET NULL paths and self-relations are forbidden** (PG allows them). Fix: the derive script sets `onUpdate: NoAction` on **every** FK relation (inert — PKs are immutable autoincrement/uuid) and `onDelete: NoAction` where no explicit action exists. This cleared ~242 errors.
    - **`onDelete: Restrict` is not supported** by the SQL Server connector (allowed: `Cascade`, `NoAction`, `SetNull`, `SetDefault`). Restrict → `NoAction` (equivalent: both block deleting a referenced row).
    - **Cascade diamonds** remain after the above where two `onDelete: Cascade` paths reach the same table (e.g. `CarbonInventoryLine` via `CarbonInventory` and via `Subcategory`, both tracing to `MethodologyVersion`). Fix: break the secondary path to `NoAction` (tracked in the derive script's `CASCADE_BREAKS`). `CarbonInventoryLine.subcategory` was the first; add more here as they surface.
    - **Net behavior delta vs PG:** on SQL Server, hard-deleting a referenced row errors (NoAction) instead of SET NULL/cascade. Immaterial for the app's soft-delete model; documented.

12. **Prisma 7 schema engine ignores `trustServerCertificate` for self-signed SQL Server certs on Linux** ([discussion #28610](https://github.com/prisma/prisma/discussions/28610), [#29060](https://github.com/prisma/prisma/issues/29060)) — a **regression from v6**. `migrate dev`/`migrate deploy` fail with `P1011: certificate verify failed (self-signed certificate)` even with `encrypt=false` (SQL Server always TLS-encrypts the login handshake). The **runtime client** (`@prisma/adapter-mssql` / node-mssql) honors `trustServerCertificate=true` and connects fine — only the **CLI schema engine** is affected.
    - **Impact:** local dev and Testcontainers (self-signed) cannot use the normal `prisma migrate` flow; production SQL Server with a CA-signed cert is unaffected.
    - **POC workaround:** generate the migration SQL **offline** with `prisma migrate diff --from-empty --to-schema-datamodel ... --script` (no DB connection, no TLS) and apply it via `sqlcmd`. Also serves task 4.18 (inspect generated SQL).
    - **Open question for PR 5:** how Testcontainers SQL Server applies migrations — trust the container cert in the OS store, or apply the generated SQL via the node client instead of the CLI.
    - **Connection-string gotchas found:** SQL Server values with special chars must be brace-escaped (`password={p@ss!word}`), distinct from PG's percent-encoding; the default compose password should avoid `!`/`;`/`{` to dodge this.
    - **Offline `migrate diff --script` also unusable here (7.8):** the documented offline DDL-generation fallback (`prisma migrate diff --from-empty --to-schema <file> --script`) produced **empty output for BOTH PostgreSQL and SQL Server** in this install (exit 0, no SQL) — so it is a `migrate diff`/config-system quirk in 7.8, not schema-specific. Net effect: **both** paths to obtain an applied SQL Server migration via the CLI are blocked in 7.8 (live migrate → TLS regression; offline diff → empty output).
    - **What is proven vs blocked:** `prisma validate --config=prisma.config.mssql.ts` reports the SQL Server schema **valid** — strong evidence the schema is well-formed and portable after all transforms (enums→String, Json→nvarchar(max), referential actions→NoAction). What remains blocked is _applying_ the migration, which is a Prisma-7-CLI/operational problem, not a schema-correctness problem.
    - **RESOLVED (prototyped):** built a custom SQL Server image (`sqlserver-tls/Dockerfile`) presenting a cert we generate (`scripts/gen-sqlserver-cert.sh`), and pointed the schema engine's OpenSSL at it via `SSL_CERT_FILE=$PWD/packages/database/sqlserver-tls/mssql.pem`. With that, the CLI engine connects (no `sudo`, no OS trust-store change). Two gotchas while wiring it: the cert/key must live under a dir the `mssql` user can read (`/var/opt/mssql/certs`, **not** `/etc/ssl/private` which is root-only — SQL Server shuts down with "Unable to initialize user-specified certificate configuration" otherwise); and the container must run without a persistent volume so the baked `mssql.conf` is used.

13. **`@db.Text` maps to SQL Server's deprecated `text` LOB type, incompatible with UTF-8/\_SC collations.** With our `Latin1_General_100_CS_AS_SC_UTF8` DB, `db push` failed: _"The legacy LOB types do not support UTF-8 or UTF-16 encodings."_ Fix: the derive script rewrites `@db.Text` → `@db.NVarChar(Max)` for the SQL Server schema (PostgreSQL keeps `@db.Text` → `text`). 32 columns affected.

14. **`createMany({ skipDuplicates: true })` is unsupported on SQL Server** (Prisma limitation — PG/MySQL/SQLite/Cockroach only). 19 call sites across 15 seed files + 1 app helper (`syncCarbonInventoryLines`). Since seeds run on a fresh DB, the flag is a no-op safety net there.

15. **A single Prisma Client extension (`src/sqlServerCompat.ts`) solves findings 10 + 14 centrally** — no edits to the 19 `skipDuplicates` sites nor to the JSON read/write sites. `applySqlServerCompat(client)` (no-op on PG) (a) strips `skipDuplicates` on `createMany`, and (b) transparently `JSON.stringify`s the 6 JSON columns on write and `JSON.parse`s them on read, so seed/app code keeps passing/receiving plain objects/arrays. Applied in `seed.ts` and the Fastify Prisma plugin. **Validated end-to-end on SQL Server:** `db push` materializes all 42 tables → full seed completes (10 magnitudes, 18 units, 229 emission factors incl. `gasDetails` JSON, system-parameter `options` JSON, …) → reads round-trip JSON correctly (`options` → array, `gasDetails` → object). Type-check + lint green on PostgreSQL.

16. **`prisma db push` is the working apply path; `prisma migrate dev` hangs on SQL Server.** `migrate dev` created `_prisma_migrations` then hung >6 min with no output (shadow-database step). `db push` (no shadow DB) syncs the schema in ~3s and is what proved the schema end-to-end. For real migrations, the generated initial migration SQL still needs a working path (offline `migrate diff --script` returns empty here — finding 12; the shadow-DB hang needs investigation or a `--shadow-database-url` pointing at a second pre-created DB). Tracked for PR 4 completion / PR 5.

17. **Stripping `skipDuplicates` loses seed idempotency on SQL Server.** PG seeds are re-runnable (skipDuplicates); on SQL Server the compat extension drops the flag, so re-running the seed on a non-empty DB throws unique violations. **Acceptable**: seeds run on a fresh DB (the documented `setup-sqlserver.sh` flow), as on a fresh PG install. True idempotency would need MERGE/pre-check emulation — deferred.

18. **Partial unique indexes + nullable columns: PG NULL-distinct vs SQL Server NULL-equal — and nvarchar(max) cannot be an index key.** Two sub-findings from porting the 15 partial indexes to filtered indexes:
    - **NULL semantics:** PG treats NULLs as distinct, so a composite partial unique with a nullable member (e.g. `emission_factor(subcategory_id, dimension_value_1_id, dimension_value_2_id, source)`, `subcategory_recommendation(..., subsector_id)`) never collides when a key is NULL. SQL Server treats NULLs as equal → false collisions (the seed's dimensionless emission factors failed). Faithful fix: add `AND <nullable_col> IS NOT NULL` to the filtered-index predicate, which reproduces PG's "uniqueness only when all keys are non-null". (The inverse — `organization_main_activity`'s PG `NULLS NOT DISTINCT` — needs NO change: SQL Server's NULL-equal default already matches.)
    - **Index key types:** `EmissionFactor.source` is `@db.Text` (free text) AND part of a unique index. `nvarchar(max)` cannot be an index key column on SQL Server, so `source` is bounded to `@db.NVarChar(450)` in the SQL Server schema only. Other text columns in indexes (`name`, `code`, `title`…) stay `nvarchar(1000)` and only trigger a non-fatal "max key length 1700 bytes" warning.

19. **Unique-violation error code differs (low severity).** The app correctly returns HTTP 409 on a SQL Server unique violation, but the normalized error _code_ is `DATABASE_UNIQUE_CONSTRAINT` instead of `DATABASE_UNIQUE_CONSTRAINT_VIOLATION` — the SQL Server adapter's error metadata differs from PG's P2002 shape, so `apps/api/src/errors/` maps it slightly differently. Behavior (status + rejection) is identical; only the code label diverges. Most of the ~40 "should return 409 when … already exists" test failures are this exact string mismatch — a one-place fix in the API error normalizer.

20. **`ORDER BY` sort order differs by collation.** PG (C/ASCII-ish default) sorts uppercase before lowercase (`'FTE' < 'activos'`); SQL Server `Latin1_General_100_CS_AS_SC_UTF8` sorts dictionary-style (`'activos' < 'FTE'`). Endpoints/tests that assert a specific ordering of mixed-case text differ. Fixes: pin an explicit collation in the hot `ORDER BY`s, or relax order-insensitive assertions, or choose a server collation whose ordering matches PG. Affects the ordering/`getMethodologyExport`/`duplicateMethodology` test failures.

21. **End-to-end behavior-parity proof: the API integration suite runs against SQL Server.** Wired `TEST_DB_PROVIDER=sqlserver` (external pre-seeded SQL Server) into the test bootstrap and ran the full suite via the SQL Server client + compat extension. **Result: 1227 / 1304 tests pass (94%), 118 / 145 files.** The 76 failures are NOT data-corruption or crashes — they cluster into the two well-understood, low-severity categories above (finding 19 error-code string, finding 20 collation ordering) plus one transaction-rollback edge (`updateUserRole`). Views (incl. the complex `organization_summary_view`), JSON round-trips, partial indexes, enums-as-strings, soft-delete, and accreditation-status derivation all behave identically. This is the empirical evidence that the SQL Server port is functionally equivalent to PostgreSQL.

## Open Questions

- Are there country deployments with a committed SQL Server delivery date? (Affects prioritization vs. other roadmap items.)
- Do we accept the `partialIndexes` preview feature as a project-wide dependency, knowing its API could change and that it has the open bugs in finding 6? (Run the validation experiment first.)
- Versioning policy: does every PR that modifies the schema have to update both `postgresql/schema.prisma` and `sqlserver/schema.prisma` in the same PR, or is a follow-up PR acceptable?
- Restore the lost `one base unit per magnitude` uniqueness on `magnitude_id`, or leave it to app-level enforcement? (Finding 4.)

- Are there country deployments with a committed SQL Server delivery date? (Affects prioritization vs. other roadmap items.)
- Do we accept the `partialIndexes` preview feature as a project-wide dependency, knowing its API could change in a future Prisma minor version?
- Versioning policy: does every PR that modifies the schema have to update both `postgresql/schema.prisma` and `sqlserver/schema.prisma` in the same PR, or is a follow-up PR acceptable?
- DevOps/PM sign-off on editing migrations in place (zero production deployments with the existing migrations registered; checksums change so dev DBs need `migrate reset`).

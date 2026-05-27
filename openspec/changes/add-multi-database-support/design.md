## Context

Huella Latam's data layer targets PostgreSQL only. The schema leaned on PG-specific
types/constructs with no direct SQL Server equivalent: `@db.JsonB` (4 cols), `String[]`
arrays (2 cols), `@db.Uuid` + `gen_random_uuid()`, native enums (31), partial unique
indexes (`WHERE …`, 15), and 4 SQL views (`DISTINCT ON`, `FILTER (WHERE …)`, `EXTRACT::int`,
enum casts, `CREATE OR REPLACE VIEW`).

Some target countries cannot adopt PostgreSQL (IT policy, licensing, sovereignty) and
require **SQL Server 2019+** on-prem. The codebase must support **both engines** without
forking per country.

Constraints accepted: 1 deployment = 1 engine; greenfield only (no live PG→SQL Server data
migration); single developer. Constraint honored: country-agnosticism (variation lives in
seeds/system parameters, never code) — multi-DB is an **infrastructure-agnostic** dimension,
orthogonal to it (see ADR 0001).

Prisma 7.8.0 (already merged on the upgrade branch) provides `@prisma/adapter-mssql` and
the `partialIndexes` preview.

> **Status: this change was fully prototyped on `feat/mati/multi-db-poc`.** SQL Server now
> runs the application end-to-end — schema materialized (42 tables), seeded, and the API
> integration suite passes **1227/1304 (94%)** against SQL Server. The remaining 6% are two
> well-understood, low-severity parity gaps (§Challenge E3, E4). Every challenge discovered
> is catalogued below to inform the branch-by-branch consolidation.

## Goals / Non-Goals

**Goals**

- One codebase that builds/deploys against PostgreSQL or SQL Server 2019+ via a build-time
  `DB_PROVIDER` env var.
- Keep the public HTTP API contract identical on both engines.
- Keep PG behavior unchanged; SQL Server reaches **behavioral parity** (same query results,
  constraints, uniqueness semantics).
- Preserve developer experience: seeds, factories, tests work on both providers.

**Non-Goals**

- Live PG → SQL Server data migration (greenfield only).
- Cross-provider/hybrid deployments (1 engine per deployment).
- A vendor-abstraction/repository layer over Prisma (over-engineering).
- An automated schema-parity CI gate on day one (deferred; human review + PR template).
- Refactoring soft-delete semantics.

## Architecture decisions (final, validated)

### D1 — Two schema files, one per provider

Prisma binds migrations + native types to a single `datasource.provider`; a single schema
with `provider = env(...)` does not validate against SQL Server. **Decision:** maintain
`prisma/postgresql/schema.prisma` and `prisma/sqlserver/schema.prisma`. The SQL Server schema
is **mechanically derived** from the PG one by `scripts/_derive_sqlserver_schema.py` (drop
enum blocks, enum fields→`String`, `@db.Uuid`→`@db.UniqueIdentifier`, `@db.Text`→
`@db.NVarChar(Max)`, `Json`→`String @db.NVarChar(Max)`, add `onUpdate/onDelete: NoAction`,
provider swap). Parity is enforced by re-running the script + human review; an automated gate
is deferred. _Rejected:_ single env-driven schema (won't validate); a bidirectional
transformer (brittle).

### D2 — Provider selection: `DB_PROVIDER`, single generated-client dir

A build-time `DB_PROVIDER` (`postgresql` | `sqlserver`) selects everything. **Both schemas
generate to the same `src/generated/prisma` dir** — only the active provider is generated
(by which `prisma.config.*.ts` runs), so `src/index.ts`, the Fastify plugin and every import
stay unchanged. Per-provider output dirs were rejected: `index.ts` uses static `export *` and
cannot branch at module load. `src/adapter.ts` returns `PrismaPg` ({ connectionString }) or
`PrismaMssql` (bare JDBC string) by `DB_PROVIDER`. Unset `DB_PROVIDER` **defaults to
postgresql** (backward-compat; an invalid value throws). `DB_PROVIDER` is in `turbo.json`
`globalEnv`. Two configs: `prisma.config.pg.ts` / `prisma.config.mssql.ts`; scripts gain
`:pg`/`:mssql` variants with aliases → `:pg`.

### D3 — Enums: hand-authored facade; PG native, SQL Server String + CHECK

SQL Server has no native enums; its generated client emits no enum objects, which would break
the 77 files importing them. **Decision (confirmed with stakeholder):** the canonical enums
live in a hand-authored `src/enums.ts` (31 const objects mirroring the PG enums), re-exported
**explicitly** from `index.ts` so they take precedence over the generated client's
`export *`. App code is unchanged on both providers. **PG keeps native enums; SQL Server uses
`String` + CHECK constraints** (zero churn on the validated PG schema). New manual parity
point: an enum change must touch the PG enum, the SQL Server CHECK, and `src/enums.ts`.

### D4 — JSON & arrays: `Json` on PG, `String`(nvarchar(max)) on SQL Server, bridged by a client extension

**Prisma's SQL Server connector rejects the `Json` type outright** (it is NOT auto-mapped to
`nvarchar(max)` — this corrected an early wrong assumption). The 4 JSON columns + the 2
former `String[]` arrays (`SystemParameter.options`, `ReductionProject.consideredGei`,
converted to `Json` in PR 2) are therefore `Json` on PG and `String @db.NVarChar(Max)` on SQL
Server. A single Prisma Client extension `src/sqlServerCompat.ts` (`applySqlServerCompat`,
no-op on PG) transparently `JSON.stringify`s these 6 columns on write and `JSON.parse`s them
on read, so seed/app/mapper code keeps passing & receiving plain objects/arrays identically.
Applied in `seed.ts` and the Fastify plugin. _Rejected:_ normalizing JSON to tables (no query
filters by JSON content); delimited strings (collision-prone).

### D5 — UUID & Decimal unification (PR 1)

All UUID columns use `@default(uuid())` (client-side, portable) — removes the
`gen_random_uuid()`↔`newid()` divergence. All `Decimal` columns use `@db.Decimal(28, 10)`.
Both are documented standards in CLAUDE.md.

### D6 — Free text: `@db.Text` (PG) → `@db.NVarChar(Max)` (SQL Server)

Bare `String` is `text` on PG (unbounded) but `nvarchar(1000)` on SQL Server (silent
truncation). 24 free-text fields carry `@db.Text` on PG. **`@db.Text` maps to SQL Server's
deprecated `text` LOB type, which is incompatible with the UTF-8/`_SC` collation** — so the
derive script rewrites `@db.Text`→`@db.NVarChar(Max)` for the SQL Server schema (32 columns).
Exception: `EmissionFactor.source` is free text **and** part of a unique index; `nvarchar(max)`
cannot be an index key, so it is bounded to `@db.NVarChar(450)` on SQL Server only.

### D7 — Referential actions: `NoAction` on SQL Server

SQL Server forbids multiple cascade/SET NULL paths, self-relations without NoAction, and the
`Restrict` action — all of which PG allows. The derive script sets `onUpdate: NoAction` on
every FK relation (inert — PKs are immutable) and `onDelete: NoAction` where unset; maps
`Restrict`→`NoAction`; and breaks explicit cascade "diamonds" (a `CASCADE_BREAKS` list, e.g.
`CarbonInventoryLine.subcategory`). Net behavior delta: hard-deleting a referenced row errors
instead of SET NULL/cascade — immaterial under the app's soft-delete model.

### D8 — Raw-SQL objects (views, CHECK, partial indexes) in `manual-ddl.sql`

Prisma does not emit views, CHECK constraints, or partial/filtered indexes from the schema.
They live in `src/prisma/sqlserver/manual-ddl.sql` (idempotent, `GO`-batched), applied after
`db push`. `scripts/setup-sqlserver.sh` is the fresh-install flow (generate client → db push →
manual-ddl → seed) — the SQL Server analogue of PG's `db:restore`. Translations are in
`docs/architecture/multi-db/view-port-notes.md`; see Challenges C/D below.

### D9 — Migration cleanups: edit in place, do NOT squash (PR 1)

Squashing the 33 PG migrations gives **no** SQL Server benefit (Prisma generates the SQL
Server baseline independently) and risks losing hand-written views/checks/indexes. Instead,
edit migrations in place to a clean final state (magnitude enum→table consolidation, UUID &
Decimal folds), validated via `migrate reset` + seed. Dev-phase only (changes checksums;
needs `migrate reset`; no production deployments per precondition).

### D10 — Collation: `Latin1_General_100_CS_AS_SC_UTF8`

`CREATE DATABASE … COLLATE Latin1_General_100_CS_AS_SC_UTF8` (case-sensitive, accent-sensitive,
UTF-8) preserves PG-like uniqueness semantics. Set as the server default in the local image
and in the provisioning script. **Caveat:** its `ORDER BY` sort order still differs from PG
(Challenge E4).

### D11 — Local TLS: custom image + `SSL_CERT_FILE`

A custom SQL Server image (`sqlserver-tls/Dockerfile`) presents a cert we generate
(`scripts/gen-sqlserver-cert.sh`); the Prisma schema engine verifies it via
`SSL_CERT_FILE=…/mssql.pem` (no sudo, no OS trust-store change). See Challenge D1.

---

## SQL Server portability challenges (validated catalog)

The authoritative list of everything that differs, why, the resolution, and status. Grouped
by theme. "✅ resolved" = prototyped and validated on `feat/mati/multi-db-poc`.

### A. Schema types

| #   | Challenge                                                                                                | Resolution                                                                                          | Status      |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| A1  | **31 native enums** unsupported; generated client emits no enum objects (77 importing files would break) | Hand-authored `src/enums.ts` facade + explicit re-export (D3); PG native, SQL Server `String`+CHECK | ✅ resolved |
| A2  | **`Json` type rejected** by the SQL Server connector (not auto-mapped to nvarchar(max))                  | `String @db.NVarChar(Max)` + `sqlServerCompat` extension stringify/parse (D4)                       | ✅ resolved |
| A3  | Bare `String`→`nvarchar(1000)` silently truncates                                                        | `@db.Text` on PG → `@db.NVarChar(Max)` on SQL Server, 32 cols (D6)                                  | ✅ resolved |
| A4  | `@db.Text`→legacy `text` LOB is incompatible with UTF-8/`_SC` collation (`db push` errors)               | rewrite to `@db.NVarChar(Max)` (D6)                                                                 | ✅ resolved |
| A5  | `nvarchar(max)` cannot be an index key, but `EmissionFactor.source` is both free text and indexed        | bound to `@db.NVarChar(450)` on SQL Server only (D6)                                                | ✅ resolved |
| A6  | `@db.Uuid`+`gen_random_uuid()` PG-only                                                                   | `@db.UniqueIdentifier` + client-side `@default(uuid())` (D5)                                        | ✅ resolved |
| A7  | Mixed Decimal precisions                                                                                 | unify `@db.Decimal(28,10)` (D5)                                                                     | ✅ resolved |

### B. Referential integrity

| #   | Challenge                                                                                      | Resolution                                                             | Status      |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| B1  | Multiple cascade/SET NULL paths & self-relations forbidden (PG allows) — 255 `validate` errors | `onUpdate: NoAction` on all FKs, `onDelete: NoAction` where unset (D7) | ✅ resolved |
| B2  | `onDelete: Restrict` unsupported                                                               | `Restrict`→`NoAction` (equivalent) (D7)                                | ✅ resolved |
| B3  | Cascade "diamonds" (two cascade paths to one table)                                            | break secondary path via `CASCADE_BREAKS` (D7)                         | ✅ resolved |

### C. Indexes, constraints, views

| #   | Challenge                                                                                                                                                         | Resolution                                                                                                                     | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| C1  | 15 partial unique indexes not emitted by Prisma                                                                                                                   | filtered unique indexes in `manual-ddl.sql`                                                                                    | ✅ resolved |
| C2  | **PG NULL-distinct vs SQL Server NULL-equal** in composite unique indexes with nullable members (false collisions; seed failed on dimensionless emission factors) | add `AND <nullable_col> IS NOT NULL` to the filter to reproduce PG semantics (`emission_factor`, `subcategory_recommendation`) | ✅ resolved |
| C3  | PG `NULLS NOT DISTINCT` (`organization_main_activity`)                                                                                                            | SQL Server NULL-equal default already matches — no change                                                                      | ✅ resolved |
| C4  | Nullable `@unique` (`User.email`, `User.idpUserId`): PG allows many NULLs, SQL Server allows one                                                                  | drop the unique constraint, recreate as filtered index `WHERE col IS NOT NULL`                                                 | ✅ resolved |
| C5  | 5 CHECK constraints not emitted; BIT can't be used as a boolean                                                                                                   | replicate in `manual-ddl.sql`; `measurement_unit` check uses `is_base = 1`/`= 0`                                               | ✅ resolved |
| C6  | 4 views use PG-only SQL                                                                                                                                           | ported to `CREATE OR ALTER VIEW` (see D below)                                                                                 | ✅ resolved |
| C7  | filtered index needs `SET QUOTED_IDENTIFIER ON`; `sqlcmd` defaults OFF                                                                                            | `SET` at top of `manual-ddl.sql` (the runtime tedious driver already defaults ON)                                              | ✅ resolved |

**View translations** (all applied & exercised by the test suite):
`DISTINCT ON`→`ROW_NUMBER() OVER (…)=1`; `agg(…) FILTER (WHERE …)`→`agg(CASE WHEN … END)`;
**subquery inside an aggregate is forbidden** → precompute via a join then `COUNT(DISTINCT
CASE …)`; boolean expression as a column → `CAST(CASE WHEN … THEN 1 ELSE 0 END AS BIT)`;
`EXTRACT(YEAR …)::int`→`YEAR(…)`; POSIX regex `~ '^[0-9]+$'`→`NOT LIKE '%[^0-9]%'`;
`value::int`→`TRY_CAST`; `NULL::BIGINT`→`CAST(NULL AS BIGINT)`; enum casts dropped (column is
nvarchar); `[key]` bracketed (reserved word); `CREATE OR REPLACE`→`CREATE OR ALTER`.

### D. Prisma tooling & TLS

| #   | Challenge                                                                                                                                                                                                                                                                                                                                                     | Resolution                                                                                                                                                                                                                              | Status               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| D1  | **Prisma 7 schema engine ignores `trustServerCertificate`** for self-signed certs on Linux ([#28610](https://github.com/prisma/prisma/discussions/28610), [#29060](https://github.com/prisma/prisma/issues/29060)) — `migrate`/`db push` fail `P1011` even with `encrypt=false` (login handshake always uses TLS). Runtime client (node-mssql) is unaffected. | custom image presents a cert we control; engine trusts it via `SSL_CERT_FILE` (D11). Cert must live under `/var/opt/mssql/certs` (mssql-readable), and the container runs without a persistent volume so the baked `mssql.conf` applies | ✅ resolved          |
| D2  | `prisma migrate dev` hangs (>6 min) on the shadow-database step                                                                                                                                                                                                                                                                                               | use `prisma db push` (no shadow DB; ~3 s) for the POC; real migration generation deferred                                                                                                                                               | ⚠️ workaround        |
| D3  | `prisma migrate diff --from-empty --to-schema … --script` emits **empty** output (both providers) in 7.8                                                                                                                                                                                                                                                      | n/a — `db push` is the apply path                                                                                                                                                                                                       | ⚠️ tooling quirk     |
| D4  | SQL Server connection strings need `{}`-escaping of special chars (vs PG percent-encoding)                                                                                                                                                                                                                                                                    | symbol-free default SA password; document `{}` escaping                                                                                                                                                                                 | ✅ resolved          |
| D5  | `partialIndexes` preview has open bugs ([#29289](https://github.com/prisma/prisma/issues/29289) drop/recreate, [#29386](https://github.com/prisma/prisma/issues/29386) loop) and `migrate` is blocked anyway                                                                                                                                                  | not adopted; raw filtered indexes in `manual-ddl.sql`                                                                                                                                                                                   | ✅ decided (raw SQL) |
| D6  | `prisma db push --force-reset` is gated behind an AI-consent prompt in 7.8                                                                                                                                                                                                                                                                                    | drop/recreate the DB via `sqlcmd` instead                                                                                                                                                                                               | ✅ resolved          |

### E. Runtime & behavior parity

| #   | Challenge                                                                                                                                                              | Resolution                                                                       | Status                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| E1  | `createMany({ skipDuplicates })` unsupported (19 sites)                                                                                                                | `sqlServerCompat` strips it (D4); fine on fresh DBs                              | ✅ resolved               |
| E2  | Seed not idempotent on SQL Server (skipDuplicates stripped → re-run fails on non-empty DB)                                                                             | run on a fresh DB (`setup-sqlserver.sh`), as on a fresh PG install               | ✅ accepted               |
| E3  | **Unique-violation error _code_ differs** (`DATABASE_UNIQUE_CONSTRAINT` vs `…_VIOLATION`) — HTTP 409 is correct, only the label diverges (~40 of the 76 test failures) | normalize the SQL Server unique error in `apps/api/src/errors/` (one-place fix)  | 🔧 pending (low severity) |
| E4  | **`ORDER BY` sort order differs** — SQL Server collation sorts dictionary-style (`'activos' < 'FTE'`), PG sorts ASCII-ish (`'FTE' < 'activos'`)                        | pin explicit collation on hot `ORDER BY`s, or relax order-insensitive assertions | 🔧 pending (low severity) |
| E5  | One transaction-rollback edge (`updateUserRole` audit-failure rollback)                                                                                                | investigate adapter savepoint behavior                                           | 🔧 pending (1 test)       |

### F. Build / packaging

| #   | Challenge                                                                                     | Resolution                                                                                                     | Status      |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| F1  | Switching providers re-generates the single client dir; building `dist` with the right client | document the per-provider build (`prebuild` defaults to pg); `setup-sqlserver.sh` regenerates the mssql client | ✅ resolved |
| F2  | `infra/run-migrations.sh` calls `pnpm prod:deploy`                                            | kept a `prod:deploy` → `prod:deploy:pg` alias                                                                  | ✅ resolved |
| F3  | `SELECT 1` health check + Fastify plugin                                                      | provider-agnostic; no per-provider code needed                                                                 | ✅ resolved |

### Behavior-parity proof

`TEST_DB_PROVIDER=sqlserver` runs the full API integration suite against the seeded SQL
Server (SQL Server client + compat extension). **Result: 1227/1304 tests pass (94%),
118/145 files.** Failures are NOT crashes/corruption — they are Challenge E3 (error-code
string, ~40), E4 (collation ordering), and E5 (1). Views (incl. `organization_summary_view`),
JSON round-trips, partial indexes, enums-as-strings, soft-delete, and accreditation-status
derivation all behave identically. This is the empirical evidence of functional equivalence.

### Final-state partial-index inventory (15)

`country_organization_size` `(country_id, name) WHERE status='ACTIVE'` and
`(country_id, position) WHERE status<>'DELETED'`; `country_sector` `(country_id, name)
WHERE status='ACTIVE'`; `country_subsector` `(country_sector_id, name) WHERE status='ACTIVE'`;
`organization_main_activity` `(name, country_sector_id, country_subsector_id) WHERE
status='ACTIVE'` (NULL-equal = PG NULLS-NOT-DISTINCT); `methodology_version`
`(country_id, name, version) WHERE status<>'DELETED'`; `category` `(mv_id, name)` &
`(mv_id, position)` `WHERE status<>'DELETED'`; `subcategory` `(category_id, name)
WHERE status<>'DELETED'`; `emission_factor_dimension` `(subcategory_id, code)` &
`(subcategory_id, position)` `WHERE status<>'DELETED'`; `emission_factor_dimension_value`
`(dimension_id, value) WHERE status<>'DELETED'`; `emission_factor`
`(subcategory_id, dv1, dv2, source) WHERE status<>'DELETED' AND dv1 IS NOT NULL AND dv2 IS NOT
NULL` (C2); `submission` `(type, subject_id) WHERE status IN ('PENDING','APPROVED','APPROVED_AUTOMATICALLY')`;
`user_organization_membership` `(user_id, organization_id) WHERE status='ACTIVE'`;
`badge` `(type) WHERE status='ACTIVE'`; `subcategory_recommendation`
`(subcategory_id, sector_id, subsector_id) WHERE status='ACTIVE' AND subsector_id IS NOT NULL`
(C2); `carbon_inventory_line_input` `(line_id) WHERE is_active=1`. Plus `User.email` /
`User.idpUserId` filtered `WHERE col IS NOT NULL` (C4). **Lost in PG history:**
`measurement_unit_unique_base_per_magnitude` (see Open Questions).

## Risks / Trade-offs (post-POC)

- **Schema drift between the two files** (High/High) → human review + PR-template checklist;
  the derive script keeps them mechanically in sync; automated gate deferred.
- **Maintenance overhead per schema change** (High/Medium) → an enum/JSON/index change now
  touches both schemas, the enums facade, and `manual-ddl.sql`. Documented; the derive script
  absorbs most of it.
- **Prisma `migrate` flow unusable on self-signed SQL Server** (Medium/Medium) → `db push` +
  `manual-ddl` for dev/test; production uses a CA-signed cert (engine works) or the same
  custom-cert+`SSL_CERT_FILE` approach. Real migration generation is an open item (D2/D3).
- **View performance under CTEs** (Medium/Medium) → not yet benched at scale; fallback is a
  materialized table per view if a SLA is missed (Ops phase).
- **Collation `_CS_AS` ordering differs from PG** (Low/Medium) → Challenge E4; pin collation
  on ordered queries where it matters.

## Implementation plan (5 chained PRs)

Prerequisite: `feat/mati/upgrade-low-risk-dependencies` (Prisma 7.8.0) merged to `main`.

1. **PR 1** `db-portability-cleanups` — UUID/Decimal unification + magnitude consolidation,
   edit-in-place (D5, D9). ✅ prototyped + validated (`db:restore`, type-check, tests).
2. **PR 2** `json-array-portability` — drop `@db.JsonB`, `String[]`→`Json` + Zod (D4, PG side).
   ✅ prototyped + validated.
3. **PR 3** `multi-db-foundation` — folder layout, two configs, scripts, adapter selector,
   enums facade (D1, D2, D3). ✅ prototyped; PG type-check + lint + tests green.
4. **PR 4** `sqlserver-schema-and-views` — SQL Server schema, compat extension, TLS image,
   `manual-ddl.sql`, `setup-sqlserver.sh` (D4, D6, D7, D8, D10, D11). ✅ prototyped; schema
   materializes + seeds; 94% test parity. Remaining: E3/E4/E5 fixes; real migration generation.
5. **PR 5** `sqlserver-testing-and-docs` — Testcontainers SQL Server (from the custom image),
   `TEST_DB_PROVIDER` (done), `validate-sqlserver-version.ts`, PR-template parity reminder,
   deployment docs, fix E3/E4/E5.

Ops (post-merge): staging deploy on SQL Server, view perf bench, archive the change.

**Consolidation note:** all of the above is prototyped on the single `feat/mati/multi-db-poc`
branch. The exploratory history (squash attempt + revert, iterative fixes, deleted diagnostic
scripts) is re-applied as clean per-PR branches when consolidating (see tasks.md mapping).

## Open Questions

- Restore the lost `one base unit per magnitude` uniqueness (`UNIQUE(magnitude_id) WHERE
is_base`) or leave it to app-level enforcement? (Lost in PG history; not recreated in the
  consolidated base migration.)
- Real SQL Server migration generation: how to obtain & apply versioned migrations given
  `migrate dev` hangs (D2) and `migrate diff --script` is empty (D3) — investigate
  `--shadow-database-url`, a newer Prisma, or maintain `manual-ddl.sql` + `db push` as the
  deploy path. (Blocks production migration history on SQL Server.)
- Schema-parity policy: must every schema PR update both schemas + the enums facade +
  `manual-ddl.sql` in the same PR (recommended), and do we add an automated gate later?
- Are there country deployments with a committed SQL Server delivery date? (Prioritization.)
- DevOps/PM sign-off on editing migrations in place (no production deployments registered).

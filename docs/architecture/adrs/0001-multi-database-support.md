# ADR 0001 — Multi-database support (PostgreSQL + SQL Server)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** Platform team (Huella Latam)

## Context

Huella Latam is a country-agnostic digital public good. Each country deploys the
same codebase on its own infrastructure. Until now the platform required
PostgreSQL. Some adopting countries operate institutional infrastructure
standardized on **Microsoft SQL Server** and cannot provision PostgreSQL.

To remove this adoption blocker we must let a deployment select its relational
engine **at build/deploy time**, without forking the codebase.

## Decision

Support **two relational providers — PostgreSQL and SQL Server — selected by a
build-time `DB_PROVIDER` environment variable**, using Prisma's driver-adapter
architecture (Prisma 7.8.0).

Concretely:

1. **Two Prisma schemas**, one per provider, under
   `packages/database/src/prisma/postgresql/schema.prisma` and
   `packages/database/src/prisma/sqlserver/schema.prisma`. The models are kept in
   lock-step; only the `datasource.provider`, native type attributes
   (`@db.Uuid` vs `@db.UniqueIdentifier`, `@db.Text` where needed), and the
   generator `output` differ.
2. **One generated client output directory** (`src/generated/prisma`). Only the
   active provider's client is generated at build time (chosen by which
   `prisma.config.*.ts` is used). This keeps `src/index.ts` and every consumer
   import path unchanged — the application code never branches on provider.
3. **A single adapter selector** (`src/adapter.ts`) returns `PrismaPg` or
   `PrismaMssql` based on `DB_PROVIDER`. The Fastify Prisma plugin and the
   `SELECT 1` health check are provider-agnostic and need no per-provider code.
4. **Raw-SQL artifacts (views, CHECK constraints, partial/filtered indexes) are
   maintained per provider** under each schema's `migrations/` folder, because
   they use provider-specific SQL that Prisma cannot express declaratively.

## Why this framing matters: infrastructure-agnostic ≠ country-agnostic

The **country-agnosticism principle** (no code forks per country; variation lives
in seed data and system parameters) is **unchanged and still binding**. Database
provider choice is an **infrastructure** concern, orthogonal to country logic:

- Seeds, system parameters, methodologies, and all business logic remain
  identical across providers and countries.
- `DB_PROVIDER` is not a country switch. Two deployments of the same country
  could in principle run different engines; a country's _rules_ never depend on
  the engine.
- This divergence is therefore **infrastructure-agnostic support**, not a
  violation of country-agnosticism. We are widening the set of infrastructures
  the single codebase runs on, not branching behavior per deployment.

## Consequences

**Positive**

- Removes a hard adoption blocker for SQL-Server-only institutions.
- Application code, queries through Prisma Client, and the API are unaffected by
  the provider (single client surface).

**Negative / costs**

- **Schema duplication**: every model change must be mirrored in both schemas in
  the same PR. There is no automated drift gate; we rely on a PR-template
  checklist and reviewer discipline (see PR 5).
- **Raw-SQL views/indexes must be hand-ported** and kept in sync per provider.
  See [view-port-notes](../multi-db/view-port-notes.md).
- **Free-text truncation risk** on SQL Server (bare `String` → `nvarchar(1000)`):
  mitigated by the [`@db.Text` audit](../multi-db/db-text-audit.md).
- **NULL-uniqueness semantics differ** between engines: mitigated by the
  [null-uniqueness audit](../multi-db/null-uniqueness-audit.md).
- **Testing matrix doubles** (Testcontainers for both engines).

## Alternatives considered

- **Single schema with `migrations/postgresql` + `migrations/sqlserver`
  subfolders only** (the original proposal): rejected. Prisma generates a
  provider's migrations from _its_ schema; a single schema cannot carry both
  `@db.Uuid` and `@db.UniqueIdentifier`, nor both providers' native types. Two
  schemas are unavoidable.
- **Squashing existing migrations to ease porting**: rejected during the POC —
  Prisma generates the SQL Server baseline independently, so a PG squash gives no
  SQL-Server benefit while risking loss of hand-written views/checks/partial
  indexes. See the change's `design.md` POC findings.
- **An ORM-agnostic query layer / second ORM**: rejected as massive
  over-engineering; Prisma's driver adapters already abstract the engine.

## References

- Change: `openspec/changes/add-multi-database-support/`
- Prisma SQL Server adapter: `@prisma/adapter-mssql` (node-mssql driver)

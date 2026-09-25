# Migration History Reset (consolidated migrations)

The migration history was consolidated from 40 migrations into 7, one per domain:

| Migration                                 | Contents                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `20260925000000_platform_base`            | Countries and their catalogues, users (with role audit, access log, onboarding), units, help texts, files   |
| `20260925000001_methodology`              | Methodology versions, categories, subcategories, dimensions, emission factors, recommendations, initiatives |
| `20260925000002_organization`             | Organizations, organization data, user memberships                                                          |
| `20260925000003_carbon_inventory`         | Carbon inventories and their lines (inputs, factor snapshots, results, files)                               |
| `20260925000004_submission_and_reduction` | Submissions and their subjects, submission files, badges, reduction projects                                |
| `20260925000005_reporting_views`          | The four reporting views                                                                                    |
| `20260925000006_chatbot`                  | pgvector, chatbot conversations and retrieval corpus                                                        |

The resulting schema is identical to the one the old history produced (same tables, columns, constraints, indexes, views and enums; only the physical order of three columns changed), with one deliberate fix: `reduction_projects.subcategory_id` is now declared `onDelete: Restrict` in `schema.prisma`, matching the database. The migrations that only carried catalogue content (guides, dimension values, subcategory order, help texts) were dropped: the seed installs that content.

**Every database that ran the old history must be reset once.** There is no automatic detection: running `migrate deploy` of this version against a database with the old history tries to apply `20260925000000_platform_base`, fails on its first statement (`type "system_role" already exists`) and records the failure, after which every deploy stops with **P3009**. The schema itself is left untouched (each migration runs in a transaction). The fix is to run this procedure, which drops `_prisma_migrations` along with everything else — no `migrate resolve` is needed.

## What is kept and what is lost

| Kept (re-inserted with the same ids)                                                   | Lost                                                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `user`: identity, IdP link (`idp_user_id`), system role, terms acceptance, last access | Organizations, their data and memberships (organization roles) — organizations register again |
| `user_role_audit`: the history of system-role changes                                  | Carbon inventories, submissions, badges granted, reduction projects                           |
| `user_onboarding_completion`: users do not see the onboarding tours again              | Chatbot conversations and the ingested corpus (re-ingest it, see step 6)                      |
|                                                                                        | `user_access_log`                                                                             |
|                                                                                        | Catalogue edits made through the maintainers — the seed restores the repository catalogue     |

A user's job position is matched again by country and name after the reseed; the import lists any user whose position no longer exists (left empty).

Files already uploaded to object storage (submission attachments, line evidence) stay in the bucket without a `file` row. They are harmless; clean them up from the storage console if needed.

## Prerequisites

- A full `pg_dump` of the database, taken right before starting. It is the only rollback.
- `psql` and `pg_dump` for the database. Without PostgreSQL client tools on the host, run every command below inside the image instead, from the scripts directory: `docker run --rm -it --user "$(id -u):$(id -g)" -v "$PWD":/work -w /work -e MIGRATION_DATABASE_URL postgres:18 <command>` (add `--network host` when the database runs on the same host).
- The **migration user** credentials (the owner of the tables). On-premise deployments: also the application user name, to re-apply grants.
- Object storage configured for the seed (the base dataset uploads the badges and the terms & conditions PDF — see [Production Deployment](./production-deployment.md#2-seed-reference-data-first-deploy-only)).
- The pgvector extension present in the database. The reset keeps it; do **not** drop the schema by hand, because on a deployment where the DBA created the extension the migration user cannot create it again.

The scripts live in [`packages/database/scripts/reset-preserving-users/`](../../packages/database/scripts/reset-preserving-users/).

## Procedure

Stop the API first (`dcp stop api` on-premise), so no user signs in while the database is being rebuilt.

Every step connects as the migration user. Set its connection string once, in the shell that runs the procedure (quote it: it may contain `&` or `?`):

```bash
export MIGRATION_DATABASE_URL='postgresql://<migration-user>:<password>@<host>:5432/<database>'
cd packages/database/scripts/reset-preserving-users
```

### 1. Back up

```bash
pg_dump "$MIGRATION_DATABASE_URL" --format=custom --file huella-before-reset.dump
```

### 2. Export the users

```bash
./export-users.sh ./users-export
```

Check the row counts it prints against the application before going on. Keep `users-export/` private: it holds emails and IdP identifiers.

### 3. Empty the schema

```bash
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f reset-schema.sql
```

It drops every view, table and enum type in `public` — including `_prisma_migrations` — and leaves extensions in place. The final query must return no rows.

### 4. Apply the migrations and seed

Exactly as on a first deploy:

- **On-premise (Docker Compose):** `dcp --profile migrate run --rm migrate`, then `dcp --profile seed run --rm seed`.
- **Azure:** `infra/run-migrations.sh` (see [Migrations](../infrastructure/Migrations.md)), then the seed.
- **Local development:** `pnpm db:restore` in `packages/database` does steps 3 and 4 in one go (and drops the extension, which a local superuser recreates); skip this procedure unless you want to keep your local users.

### 5. Re-insert the users

From the directory holding the CSVs:

```bash
cd users-export
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f ../import-users.sql
```

It fails as a whole — nothing written — if anything does not fit (for instance, a user the seed already created). The last result lists users whose job position was not found.

On-premise, when the migration user is not the application user: **re-apply the grants** from the [DBA contract](./production-deployment.md#database-roles--privileges-dba-contract) now — every table is new and owned by the migration user.

### 6. Restart and re-ingest

Start the API (`dcp up --no-build -d`), sign in with an existing account and check that the system role is the expected one. If the chatbot is enabled, re-ingest the corpus with the `chatbot:ingest` / `chatbot:ingest-corpus` scripts of `apps/api`.

## Rollback

Restore the dump from step 1 with `pg_restore --clean --if-exists` and deploy the previous release: the old history is incompatible with this version.

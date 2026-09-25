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

**Every database that ran the old history must be reset once.** There is no automatic detection: running `migrate deploy` of this version against a database with the old history tries to apply `20260925000000_platform_base`, fails on its first statement (`type "system_role" already exists`) and records the failure, after which every deploy stops with **P3009**. The schema itself is left untouched (each migration runs in a transaction). The fix is `pnpm db:restore:keep-users`, which drops `_prisma_migrations` along with everything else — no `migrate resolve` is needed.

## What is kept and what is lost

| Kept (re-inserted with the same ids)                                                   | Lost                                                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `user`: identity, IdP link (`idp_user_id`), system role, terms acceptance, last access | Organizations, their data and memberships (organization roles) — organizations register again |
| `user_role_audit`: the history of system-role changes                                  | Carbon inventories, submissions, badges granted, reduction projects                           |
| `user_onboarding_completion`: users do not see the onboarding tours again              | Chatbot conversations and the ingested corpus (re-ingest it afterwards)                       |
|                                                                                        | `user_access_log`                                                                             |
|                                                                                        | Catalogue edits made through the maintainers — the seed restores the repository catalogue     |

A user's job position is matched again by country and name after the reseed; the import lists any user whose position no longer exists (left empty).

Files already uploaded to object storage (submission attachments, line evidence) stay in the bucket without a `file` row. They are harmless; clean them up from the storage console if needed.

## Running it

From the repository root, with `DATABASE_URL` pointing at the database to reset **as the owner of the tables** (on-premise: the migration user, not the application user) and the storage variables the seed needs (the base dataset uploads the badges and the terms & conditions PDF):

```bash
pnpm db:restore:keep-users
```

It asks for confirmation, then:

1. backs up the database (`pg_dump`) and exports the users to a `huella-reset.XXXXXX/` directory at the repository root (readable only by you, and ignored by git and by the Docker build context);
2. empties the schema: every view, table and enum type in `public`, including `_prisma_migrations`, but not the pgvector extension (the migration user may not be allowed to create it again);
3. runs `pnpm db:provision` — `migrate deploy` of the seven migrations, then the seed;
4. re-inserts the users with their ids and lists any whose job position was not found.

It needs `psql` and `pg_dump` besides the usual pnpm toolchain. Stop the API first (`dcp stop api` on-premise) so no one signs in halfway.

**If it fails** after emptying the schema, it prints the directory holding the export. Fix the cause and resume with `pnpm db:restore:keep-users <that directory>`: it skips the export and redoes steps 2–4. Running it again without the directory refuses, because the emptied database has no users left to export.

The seed must not create users: the default `base` dataset creates none, while `testing` creates one and the re-insert then fails as a whole (nothing written).

**Afterwards:**

- On-premise, when the migration user is not the application user: re-apply the grants from the [DBA contract](./production-deployment.md#database-roles--privileges-dba-contract) — every table is new and owned by the migration user.
- Start the API, sign in with an existing account and check the system role. If the chatbot is enabled, re-ingest the corpus (`pnpm chatbot:ingest-corpus`).
- Delete the `huella-reset.XXXXXX/` directory once the reset is verified: it holds a full backup and user emails.

## Rollback

Restore the backup (`before-reset.dump` in the `huella-reset.XXXXXX/` directory) with `pg_restore --clean --if-exists` and deploy the previous release: the old history is incompatible with this version.

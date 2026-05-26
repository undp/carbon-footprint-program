# NULL-uniqueness audit (PostgreSQL → SQL Server)

## Why

Unique constraints treat NULL differently per engine:

- **PostgreSQL (default):** NULLs are _distinct_ — a unique constraint on a
  nullable column allows **many** NULL rows. (PG 15+ `NULLS NOT DISTINCT` opts
  into the opposite.)
- **SQL Server:** a unique index treats NULLs as _equal_ — it allows only **one**
  NULL row.

So a plain Prisma `@unique` on a **nullable** column behaves differently: PG
allows many NULLs, SQL Server rejects the second NULL. To preserve PostgreSQL
semantics on SQL Server, add a **filtered unique index** `WHERE <col> IS NOT NULL`
for each such constraint, declared as a raw-SQL migration in
`src/prisma/sqlserver/migrations/`. **Applied in PR 4** (task 4.9).

There is a useful inverse: the existing PG `NULLS NOT DISTINCT` index on
`organization_main_activity` wants NULLs to _collide_. SQL Server's default
unique-index NULL handling already collides NULLs, so on SQL Server that index is
just a filtered unique index `WHERE status = 'ACTIVE'` — the NULLS-NOT-DISTINCT
behavior comes for free.

## Prisma `@unique` / `@@unique` on nullable columns (need `WHERE ... IS NOT NULL` on SQL Server)

| Model | constraint                                       | nullable column | SQL Server action                                     |
| ----- | ------------------------------------------------ | --------------- | ----------------------------------------------------- |
| User  | `@unique` on `idpUserId` (`idp_user_id String?`) | `idp_user_id`   | filtered unique index `WHERE idp_user_id IS NOT NULL` |
| User  | `@unique` on `email` (`email String?`)           | `email`         | filtered unique index `WHERE email IS NOT NULL`       |

These are the **only** two `@unique`/`@@unique` Prisma attributes that involve a
nullable column. All other Prisma unique attributes are on NOT-NULL columns and
need no special handling.

## Partial unique indexes already maintained as raw SQL

These are **not** Prisma `@@unique` attributes — they already live as hand-written
partial unique indexes and are ported to SQL Server **filtered indexes** in PR 4
(task 4.6). SQL Server filtered indexes support `= 'ACTIVE'`, `<> 'DELETED'`, and
`= 1` predicates.

| Index                                                             | predicate                                        | nullable concern                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `organization_main_activity_..._key`                              | `NULLS NOT DISTINCT` + `WHERE status = 'ACTIVE'` | NULLs must collide → SQL Server filtered unique index gives this for free                       |
| `user_organization_membership_user_id_organization_id_active_key` | `WHERE status = 'ACTIVE'`                        | —                                                                                               |
| `badge_type_active_key`                                           | `WHERE status = 'ACTIVE'`                        | —                                                                                               |
| `carbon_inventory_line_input_line_id_active_unique`               | `WHERE is_active = true` → `WHERE is_active = 1` | —                                                                                               |
| `subcategory_recommendation_active_unique`                        | `WHERE status = 'ACTIVE'`                        | columns `subsector_id` may be nullable — confirm filtered index covers NULL members during PR 4 |
| `reduction_plan_initiative_subcategory_id_title_active_unique`    | `WHERE status = 'ACTIVE'`                        | —                                                                                               |
| `methodology_version_country_id_name_version_active_unique`       | `WHERE status <> 'DELETED'`                      | —                                                                                               |

> **PR 4 reminder:** Prisma does not diff the `WHERE` clause of partial indexes
> (documented in the migration comments). Whether expressed declaratively via the
> `partialIndexes` preview or kept as raw SQL, the filtered predicate must be
> verified by hand against the live index after migration (see the change's
> design.md POC finding on partial-index validation).

# Database Seeding

Seed scripts populate reference data (countries, sectors, methodologies, emission factors, etc.) from JSON files under `packages/database/src/prisma/seeds/data/<dataset>/`.

Run them with:

```bash
cd packages/database
pnpm dev:seed                  # uses SEEDS_DATASET=base by default
SEEDS_DATASET=testing pnpm dev:seed
```

---

## Idempotency contract

Re-running the seed against an already-seeded database **must not** create duplicate rows and **must** propagate field-level changes made in the JSON files onto the existing rows. This is the guarantee every seed script enforces.

### What is guaranteed

- **Re-running is safe.** Running the seed multiple times produces the same end state as running it once. No row is duplicated.
- **Edits in JSON propagate.** Changing a non-key field in a JSON file (e.g. the name of a country, the description of a reduction-plan initiative, an emission factor's value) and re-running the seed updates the corresponding row in place. References (foreign keys) to that row stay valid because the primary key does not change.
- **New entries appear.** Adding a new entry to a JSON file and re-running the seed creates the new row.

### What is NOT handled

- **Row removal from JSON is not propagated.** If an entry is deleted from a seed JSON file, the corresponding row stays in the database. Re-running the seed will not delete it. If you need to retire a row, perform a soft-delete through the admin UI or via a migration — never by editing the seed JSON alone.
- **Renaming a row through its natural key is not propagated.** Each entity has a natural key that the upsert matches on (e.g. `(countryId, name)` for sectors, `(subcategoryId, title)` for reduction-plan initiatives). Changing one of these fields creates a _new_ row; the original stays in the database. Treat renames as a soft-delete-plus-create through the admin UI.
- **Runtime-mutable fields are not overwritten on update.** A few fields are intentionally treated as "seed-time defaults": once a row exists, the seed will not overwrite them on subsequent runs. This avoids reverting user changes made through the admin UI. Today this applies to:
  - `SystemParameter.value` — owned by the admin UI after initial seeding
  - `MethodologyVersion.status` — publication state is set on create only
  - `User.role` is propagated; ensure JSON reflects intended runtime role

---

## How idempotency is implemented

Most non-key uniqueness constraints in the schema are **partial unique indexes** scoped to non-DELETED rows (declared via raw SQL in the migrations because Prisma's `@@unique` does not support partial indexes). Examples:

```sql
CREATE UNIQUE INDEX "country_sector_country_id_name_key"
  ON "country_sector"("country_id","name") WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "subcategory_category_id_name_active_unique"
  ON "subcategory"("category_id","name") WHERE "status" <> 'DELETED';
```

Because Prisma cannot use a partial index as the `where` target of `upsert()`, each seed script implements the upsert at the application layer:

- For tables with a **full** `@unique` or `@@unique` on the natural key (e.g. `Country.isoCode`, `MeasurementUnit.abbreviation`, `User.idpUserId`, `(countryId, name)` on `CountryJobPosition`), the script uses `prisma.<model>.upsert({ where, update, create })`.
- For tables with a **partial** unique index, the script uses an `updateMany` + `create` pattern:
  ```ts
  const { count } = await tx.<model>.updateMany({
    where: { ...naturalKey, status: { not: 'DELETED' } },
    data: mutableFields,
  });
  if (count === 0) {
    await tx.<model>.create({ data: fullRow });
  }
  ```
- Tables with a `position` column that participates in a second partial unique index (e.g. `CountryOrganizationSize`, `Category`, `EmissionFactorDimension`) need an extra step. Reordering the JSON would otherwise cause a transient unique-violation mid-loop, so the script first shifts all existing positions by a large offset inside a transaction, then assigns the final positions row by row.

---

## Adding a new seed entity

When introducing a new seeded table, keep the contract above intact:

1. Add a partial unique index on the natural key in the migration (`WHERE status <> 'DELETED'` or `WHERE status = 'ACTIVE'`).
2. In the seed script, implement the upsert pattern that matches the table's index — full unique → `prisma.upsert`; partial unique → `updateMany + create`; partial unique with position → add the position-shift step.
3. On the `update` branch, include the fields that the seed JSON owns. Leave fields managed by the admin UI out of the update set.
4. Avoid post-seed count assertions like `if (rows.length !== data.length) throw …` — they break on the second run when soft-deleted rows accumulate.

# System Parameters Reference

System parameters are global configuration values stored in the database that control platform behavior without requiring a code deployment. They are managed by platform administrators and read at runtime by the API.

---

## Reading System Parameters

```
GET /api/system-parameters
GET /api/system-parameters?keys=KEY1,KEY2
```

Returns an array of `{ key, value }` objects. If `keys` is omitted, all parameters are returned. Access requires an authenticated user; no specific role is needed.

---

## Defined Parameters

### `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR`

Controls whether carbon inventory self-declarations are automatically recognized or require manual admin review.

| Attribute | Value                           |
| --------- | ------------------------------- |
| Type      | `selector`                      |
| Default   | `AUTOMATIC`                     |
| Options   | `HIDDEN`, `MANUAL`, `AUTOMATIC` |

**Option behavior:**

| Value       | Effect                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTOMATIC` | When a member self-declares an inventory (`POST /carbon-inventories/:id/self-declare`), the platform immediately creates a `CARBON_INVENTORY_CALCULATION` submission with status `APPROVED_AUTOMATICALLY` and assigns the active calculation badge. No admin action is needed. |
| `MANUAL`    | Self-declaration is recorded but does not create a submission. The member must separately submit for calculation review. An admin must then approve it before a badge is issued.                                                                                               |
| `HIDDEN`    | Self-declaration is recorded but no submission or badge path is triggered. The measurement recognition feature is effectively disabled.                                                                                                                                        |

**Where it is read:** `apps/api/src/features/carbonInventories/selfDeclareCarbonInventory/service.ts`

---

### `SUBCATEGORY_RECOMMENDATION_MODE`

Controls how subcategory recommendations are surfaced when an organization is filling out a carbon inventory. Recommendations are pre-configured per sector/subsector and guide members toward the most relevant emission subcategories.

| Attribute | Value               |
| --------- | ------------------- |
| Type      | `selector`          |
| Default   | `UNION`             |
| Options   | `UNION`, `SPECIFIC` |

**Option behavior:**

| Value      | Effect                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNION`    | Returns sector-level recommendations combined with subsector-specific recommendations. Produces a broader set of suggestions.                      |
| `SPECIFIC` | Returns only the recommendations that are explicitly configured for the organization's specific subsector. Produces a narrower, more targeted set. |

---

## Data Model

```prisma
model SystemParameter {
  id          BigInt    @id @default(autoincrement())
  key         String    @unique
  value       String
  description String
  type        String         // "selector"
  options     String[]       // valid values for selector types
  createdAt   DateTime  @default(now())
  updatedAt   DateTime?
  createdById BigInt?
  updatedById BigInt?
}
```

Parameters are seeded at database initialization from:

- `packages/database/src/prisma/seeds/data/base/systemParameters.json` — production defaults
- `packages/database/src/prisma/seeds/data/testing/systemParameters.json` — test environment values

---

## Changing a Parameter Value

Parameters can be updated directly in the database. There is no admin UI endpoint for updates in the current release.

```sql
UPDATE "SystemParameter"
SET value = 'MANUAL', "updatedAt" = now()
WHERE key = 'CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR';
```

Changes take effect on the next API request — no restart required since parameters are read per-request.

---

## Adding a New Parameter

To add a system parameter:

1. **Add the seed record** in `packages/database/src/prisma/seeds/data/base/systemParameters.json`:

   ```json
   {
     "key": "NEW_PARAMETER_KEY",
     "value": "DEFAULT_VALUE",
     "description": "What this parameter controls.",
     "type": "selector",
     "options": ["OPTION_A", "OPTION_B"]
   }
   ```

   Also add a corresponding entry in `…/testing/systemParameters.json`.

2. **Add the schema** in `packages/types/src/systemParameters/getSystemParameters/schemas.ts`:
   - Add the key to `SystemParameterKeySchema`
   - Define the value schema for the new parameter
   - Add a discriminated union entry

3. **Read it in service code** using the `getSystemParameterValue` helper:

   ```typescript
   const value = await getSystemParameterValue(
     prismaClient,
     SystemParameterKeyEnum.NEW_PARAMETER_KEY
   );
   ```

4. **Run migrations + reseed** if adding to an existing environment:

   ```bash
   # Local development
   cd packages/database && pnpm dev:seed

   # Or to fully reset
   pnpm db:reset
   ```

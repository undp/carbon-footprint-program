# Schema Refactoring Opportunities

This document identifies opportunities to refactor Zod schemas to reference base schemas instead of duplicating field definitions.

## ✅ Already Refactored

### `updateCarbonInventoryLines.ts`

- **Status**: ✅ Complete
- **Refactoring**: `UpdateCarbonInventoryLineRequestItemSchema` now uses `CarbonInventoryLineSchema.pick()` and `.extend()` to reference the base schema
- **Benefits**: Eliminates duplication, ensures consistency with base schema

## 🔍 Identified Opportunities

### 1. `measurementUnits.ts` - RateUnitComponentSchema ✅

**Status**: ✅ Complete

**Refactoring Applied:**
`RateUnitComponentSchema` now references `MeasurementUnitSchema` using `.pick()`:

```typescript
const RateUnitComponentSchema = MeasurementUnitSchema.pick({
  id: true,
  name: true,
  magnitude: true,
  abbreviation: true,
});
```

**Files modified:**

- `packages/types/src/measurementUnits.ts`

**Impact**: Eliminates duplication, ensures consistency with base schema

---

### 2. Reusable ID Schema Pattern ✅

**Status**: ✅ Utility Created (Available for future use)

**Implementation:**
A reusable `IdSchema` has been added to `packages/types/src/zod.ts`:

```typescript
export const IdSchema = z
  .string()
  .regex(/^\d+$/)
  .describe("An ID as a numeric string");
```

**Usage:**
Import and use it across schemas when creating new schemas or refactoring existing ones:

```typescript
import { IdSchema } from "@repo/types/zod";

const MySchema = z.object({
  id: IdSchema.describe("The ID of the entity"),
  // ... other fields
});
```

**Files that could benefit from this (future refactoring):**

- `packages/types/src/carbonInventories/base.ts`
- `packages/types/src/carbonInventories/updateCarbonInventoryLines.ts` (for `baseFactorId`)
- `packages/types/src/carbonInventories/getCarbonInventoryMethodology.ts`
- `packages/types/src/measurementUnits.ts`
- `packages/types/src/countrySectors.ts`
- `packages/types/src/organizationMainActivities.ts`
- `packages/types/src/countryOrganizationSizes.ts`
- `packages/types/src/jobPositions.ts`

**Impact**: Medium - Reduces duplication and makes it easier to change ID validation rules globally

---

## ✅ Already Well-Structured

These files already use base schemas properly:

1. **`createCarbonInventory.ts`** - Uses `CarbonInventorySchema.pick()` and `.omit()`
2. **`updateCarbonInventory.ts`** - Uses `CarbonInventorySchema.pick()` and `.omit()`
3. **`getAllCarbonInventories.ts`** - Uses `CarbonInventorySchema.omit()`
4. **`getCarbonInventoryById.ts`** - Directly uses `CarbonInventorySchema`
5. **`createCarbonInventoryLine.ts`** - Directly uses `CarbonInventoryLineSchema`

---

## 📋 Summary

| Priority | File                               | Opportunity                                     | Status   | Impact                                  |
| -------- | ---------------------------------- | ----------------------------------------------- | -------- | --------------------------------------- |
| ✅       | `measurementUnits.ts`              | Use `.pick()` for `RateUnitComponentSchema`     | Complete | Eliminates duplication                  |
| ✅       | `zod.ts`                           | Extract reusable `IdSchema`                     | Complete | Available for future use                |
| Low      | Multiple files                     | Migrate to `IdSchema` (optional)                | Future   | Reduces duplication, easier maintenance |
| N/A      | `getCarbonInventoryMethodology.ts` | Different entities, no base schema to reference | N/A      | N/A                                     |

---

## Notes

- The `updateCarbonInventoryLines.ts` refactoring demonstrates the pattern: use `.pick()` to select fields, `.extend()` to add new fields, and `.shape.fieldName` to reference specific fields for renaming.
- When extracting common patterns like ID schemas, ensure backward compatibility and test thoroughly.

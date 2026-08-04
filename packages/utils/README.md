# @repo/utils

Small, pure helper functions shared between `apps/api` and `apps/web` that don't belong to either app specifically — unit conversions, domain status predicates, and generic array/string helpers. Depends on `@repo/types` for domain enums.

## Exports

All re-exported from `src/index.ts`:

- `kgToTon`, `tonToKg` (`number.ts`) — kilogram/metric-ton conversions.
- `isCarbonInventoryEditable`, `isCarbonInventoryDeletable`, `canSubmitToMeasurement`, `canSubmitToVerification`, `canSelfDeclare` (`carbonInventory.ts`) — status-based predicates over `CarbonInventoryDisplayStatus`, used to gate UI actions and API mutations.
- `isReductionProjectEditable`, `canRequestReductionProjectVerification`, `isReductionProjectDeletable`, `getReductionProjectMissingFields`, `getReductionProjectInvalidFields` and the `ReductionProjectCompletenessFields` type (`reductionProject.ts`) — analogous predicates/completeness checks for reduction projects.
- `buildUserName` (`user.ts`) — builds a display name from first/last name, tolerating a missing last name.
- `arraysEqualUnordered` (`arrays.ts`) — order-independent string-array equality check.
- `sanitizeForFilename` (`sanitize.ts`) — normalizes a string (strips diacritics, replaces non-alphanumerics) for safe use in a filename, with a fallback for empty results.
- `CUSTOM_FACTOR_SOURCES` (`constants.ts`) — hardcoded list of custom emission-factor source labels (marked TODO to move to the database).

## Usage

```ts
import { kgToTon, buildUserName } from "@repo/utils";
```

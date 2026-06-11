---
name: shared-utils
description: Where to place utility / shared logic in the monorepo. Use when adding a helper or pure function and deciding the layer — packages/utils (framework-free logic shared by API and web), apps/api/src/utils (Prisma/backend), apps/web/src/utils (UI/React), or screen-scoped utils. Web and API never cross-import each other's utils.
---

# Utils & Shared Logic

Utils follow the same layering as constants — shared logic in the shared package, app-specific logic in the corresponding app. Web and API never cross-import each other's utils.

- **`packages/utils/`** (`@repo/utils`): pure business logic and formatting functions used by both API and web — status/workflow checks (`isCarbonInventoryEditable`, `canSubmitToVerification`, `isReductionProjectEditable`), unit conversions (`kgToTon`, `tonToKg`), date formatting, user display-name building. These must have no framework dependencies (no MUI, Prisma, or Fastify).
- **`apps/api/src/utils/`**: backend-specific utilities for Prisma type conversions (`mapBigIntField`, `mapDecimalField`, `toNumberOrNull`) and null-safe comparisons. May re-export shared utils from `@repo/utils`.
- **`apps/web/src/utils/`**: frontend-specific utilities for UI formatting (`formatEmissions`, `formatDate`), error message translation (`getApiErrorMessage`), category colors/icons, route guards (`requireRole`), status labels, and Excel export logic.
- **Screen-scoped utils** (e.g., `screens/CarbonInventory/utils/`): form validation and data transformers tightly coupled to a specific screen.

**Placement rule**: pure logic needed by both API and web → `packages/utils/`; depends on Prisma/backend → `apps/api/src/utils/`; depends on MUI/React → `apps/web/src/utils/`; tightly coupled to one screen → that screen's `utils/` folder.

---
name: Constants & Utils Placement
description: Decide where to place constants and utility functions across this monorepo (packages/constants, packages/utils, apps/api, apps/web, screen-scoped). Because each country deploys the platform independently, values that may vary per deployment must be named constants — never inline literals. Use when adding a configurable value, label, threshold, limit, precision rule, or a shared/util function.
when_to_use: Use when introducing a constant or magic value, a label/option list/threshold that could vary per country, or a new utility/helper function, and you need to choose the correct package or app layer for it.
---

# Constants & Utils Placement

This platform is deployed independently by each country, so values that may vary per deployment must be explicit, named constants — **never inline literals**. Utils follow the same layering: shared logic lives in shared packages, app-specific logic stays in the corresponding app. Web and API never cross-import each other's utils.

## Constants — where to place them

- **`packages/constants/`** (`@repo/constants`): domain constants used by **both** API and web (e.g. allowed greenhouse gases, GWP source options, max lengths, required documents). Often tied to database enums or Zod schemas — modifying them may require a data migration.
- **`apps/api/src/config/constants.ts`**: API-specific constants — numeric precision (`PERCENTAGE_PRECISION`, `EMISSIONS_PRECISION`), tolerances, SAS URL expiry times.
- **`apps/web/src/config/constants.ts`**: frontend-specific constants — stale times, debounce intervals, sidebar width, file upload limits, year ranges.
- **`apps/web/src/config/vocab.ts`**: localized terminology (e.g. organization/inscription names in Spanish). Country deployments may need to adjust these labels.
- **Screen-level `constants.ts`** (e.g. in `screens/Maintainer/`, `screens/ReductionProject/`): feature-specific labels, options, and UI content.

**Rule of thumb**: any value that could change per country deployment — labels, option lists, thresholds, limits, precision rules, normative standards, emission factor sources — must be a named constant at the correct level: shared if used by both API and web, otherwise in the corresponding app's config. Never inline these values.

## Utils — where to place them

- **`packages/utils/`** (`@repo/utils`): pure business logic and formatting used by **both** API and web — status/workflow checks (`isCarbonInventoryEditable`, `canSubmitToVerification`, `isReductionProjectEditable`), unit conversions (`kgToTon`, `tonToKg`), date formatting, user display name building. **No framework dependencies** (no MUI, no Prisma, no Fastify).
- **`apps/api/src/utils/`**: backend-specific utilities — Prisma type conversions (`mapBigIntField`, `mapDecimalField`, `toNumberOrNull`), null-safe comparisons. May re-export shared utils from `@repo/utils`.
- **`apps/web/src/utils/`**: frontend-specific utilities — UI formatting (`formatEmissions`, `formatDate`), error message translation (`getApiErrorMessage`), category colors/icons, route guards (`requireRole`), status labels, Excel export logic.
- **Screen-scoped utils** (e.g. `screens/CarbonInventory/utils/`): form validation and data transformers tightly coupled to one screen. Use only when the logic is not reusable elsewhere.

**Decision guide**:

- Pure logic needed by both API and web → `packages/utils/`.
- Depends on Prisma / backend concerns → `apps/api/src/utils/`.
- Depends on MUI / React / frontend concerns → `apps/web/src/utils/`.
- Tightly coupled to a single screen's forms or data flow → that screen's `utils/` folder.

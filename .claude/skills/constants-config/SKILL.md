---
name: constants-config
description: Where to place configurable / per-deployment values in the Huella Latam monorepo. Use when adding a label, option list, threshold, limit, precision rule, normative standard, or any value that could vary per country deployment — deciding between packages/constants, apps/api config, apps/web config, vocab, or screen-level constants. Never inline these literals.
---

# Constants & Configurable Values

This platform is deployed independently by each country, so values that may vary per deployment must be explicit named constants — never inline literals.

- **`packages/constants/`** (`@repo/constants`): domain constants used by both API and web (allowed greenhouse gases, GWP source options, max lengths, required documents). These are often tied to database enums or Zod schemas — modifying them may require data migration.
- **`apps/api/src/config/constants.ts`**: API-specific constants like numeric precision (`PERCENTAGE_PRECISION`, `EMISSIONS_PRECISION`), tolerances, and SAS URL expiry times.
- **`apps/web/src/config/constants.ts`**: frontend-specific constants like stale times, debounce intervals, sidebar width, file upload limits, and year ranges.
- **`apps/web/src/config/vocab.ts`**: localized terminology (e.g., organization/inscription names in Spanish). Country deployments may need to adjust these labels.
- **Screen-level `constants.ts`** files (e.g., `screens/Maintainer/`, `screens/ReductionProject/`): feature-specific labels, options, and UI content.

**Rule**: any value that could change per country deployment — labels, options lists, thresholds, limits, precision rules, normative standards, emission factor sources — must be a named constant at the correct level (shared if used by both API and web, otherwise the corresponding app's config). Never inline these values.

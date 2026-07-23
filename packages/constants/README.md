# @repo/constants

Shared constants used across the Huella Latam monorepo (`apps/api`, `apps/web`, `tools/seed`) as the single source of truth for values that must stay identical on both the frontend and the backend — validation limits, format regexes, and file-upload constraints.

## Exports

All constants are re-exported from `src/index.ts`. Submodules:

- `badge.ts` — `BADGE_HISTORY_LIMIT`, the max number of inactive badges kept in a badge type's history.
- `carbonInventory.ts` — allowed MIME types and size limits for carbon-inventory line attachments; enforced both by the API's upload validator and by the web `FileUpload` component (as `accept`/`maxSizeMB` hints).
- `explanations.ts` — `EXPLANATION_CONTENT_MAX_LENGTH`, the max length of an explanation's markdown content.
- `legal.ts` — blob-path constants for the LEGAL file family (currently Terms & Conditions), shared by the runtime `persistLegalFileRecord` helper and the `seedTermsConditions` script so blob paths never drift between them.
- `magnitude.ts` — name/code length limits and the code-format regex for magnitudes.
- `measurementUnit.ts` — name/abbreviation length limits and the abbreviation-format regex for measurement units.
- `reductionPlanInitiative.ts` — title/description length limits for reduction-plan initiatives.
- `reductionProject.ts` — description length limit and fixed lists (e.g. considered GEI) used to type and parse reduction-project data; entries must not be removed without first migrating existing database rows.

## Usage

```ts
import { BADGE_HISTORY_LIMIT } from "@repo/constants";
```

Built with `tsc` to `dist/`; the package's `exports` map resolves types from `src` and runtime code from `dist`, like the other `packages/*` libraries in this repo.

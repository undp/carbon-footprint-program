# Project Description

Huella Latam is a digital public good for Latin America: a country-agnostic platform for measuring, managing, and reducing carbon footprints, whose codebase is centrally distributed and deployed by each country on its own infrastructure. The system must allow for adaptation to local regulatory frameworks, methodologies, and business logic through configuration and extension, without modifying the core, integrating measurement and recognition into a single workflow, and supporting implementations that evolve independently on a common foundation.

# Commands

- `pnpm type-check`: Use to check for TypeScript compilation errors.
- `pnpm lint`: needs to be run after any code changes
- `pnpm test --filter=api -- /{feature-name}/integration.test.ts --coverage=false`: Use to run a single test file.
  - Example: `pnpm test --filter=api -- /getOrganizationById/integration.test.ts --coverage=false`
- `pnpm test --filter=api -- /{domain} --coverage=false`: Runs all tests for a domain.
  - Example: `pnpm test --filter=api -- organizations --coverage=false`: Runs all tests for the organizations feature

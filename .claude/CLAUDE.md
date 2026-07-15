# Huella Latam

A platform (digital public good for Latin America) for measuring, managing, and reducing carbon footprints.

Monorepo (pnpm + Turborepo): `apps/api` (Fastify + Prisma), `apps/web` (React + MUI v7 + Tailwind + TanStack), `packages/*` (`types`, `constants`, `utils`, `database`, `storage`, eslint/ts config), `tools/seed`. All user-facing text is Spanish (no i18n).

## Session setup

- `pnpm install` — required before format/lint/type-check.
- `.claude/setup.sh` — required before `/opsx:` commands.

## Commands

- `pnpm type-check` — TypeScript compilation check.
- `pnpm lint` — run after code changes (zero warnings — any warning fails CI).
- `pnpm format` — Prettier; **mandatory before every commit**.
- `pnpm test --filter=api -- /{feature}/integration.test.ts --coverage=false` — single test file.
- `pnpm test --filter=api -- /{domain} --coverage=false` — all tests in a domain.
- `pnpm --filter=web test` — apps/web Vitest suite (jsdom + React Testing Library). Filter goes **before** `test`; `pnpm test --filter=web` would run the api-matrix root `test` script instead. Config: `apps/web/vitest.config.ts` + `vitest.setup.ts`; tests are co-located `*.test.ts(x)` under `src/`.

CI runs lint, type-check, format:check, test (api matrix + `Test (web)`), and build in parallel on PRs to `main`; all must pass.

## Committing

Before every commit run `pnpm format && pnpm lint && pnpm type-check`. Use Conventional Commits and small, modular commits (one logical change each). Branch prefixes: `feat`/`fix`/`refactor`/`docs`/`chore`/`infra`/`claude`. See the **change-workflow** skill for PR titles and reviewer etiquette.

## Detailed conventions — skills (`.claude/skills/`, auto-loaded by task)

- **typescript-typing** — strict types, Prisma types, Zod schemas in `packages/types`, enums, response-derived types.
- **api-backend** — endpoint structure (route→handler→service→helpers), efficient Prisma, transactions, types-package layout.
- **api-authorization** — `requireAuth` / `requireRoles` / `requireOrganizationRole` / domain access hooks.
- **error-handling** — shared error classes, `ApiErrorResponseSchema`, `getApiErrorMessage`.
- **testing** — Vitest + Testcontainers, `app.inject()`, factories.
- **react-components** — one component/file, early returns, theme colors, memoization, Spanish UI.
- **frontend-routing-data** — TanStack Router/Query, query-key factories, `ky` client.
- **forms** — React Hook Form + Zod resolver, reusable form components.
- **constants-config** — per-deployment values as named constants (shared vs app-level).
- **shared-utils** — where logic lives (`packages/utils` vs app utils vs screen-scoped).
- **change-workflow** — commit/PR conventions, reviewer interaction, docs upkeep, plan-first for complex work.

## Task agents (`.claude/agents/`)

Delegate full-feature work; each agent follows the skills above:

- **api-feature-builder** — build a complete API endpoint + tests.
- **web-feature-builder** — build a web screen/component/route/form.
- **integration-test-writer** — add API integration test coverage.

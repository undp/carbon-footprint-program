## 1. Pre-flight

- [x] 1.1 ~~Checkout `main`~~ — skipped (single-branch strategy: working on `feat/mati/upgrade-dependencies`)
- [x] 1.2 Run `pnpm install` on a clean `main`
- [x] 1.3 Run `pnpm type-check` on `main` — must pass (24s ✓)
- [x] 1.4 Run `pnpm lint` on `main` — must pass with zero warnings (49s ✓)
- [x] 1.5 Run `pnpm test` on `main` — must pass (4m ✓, after cherry-picking PR 341 fix to unblock baseline)
- [x] 1.6 Run `pnpm build` on `main` — must pass (46s ✓, with `direnv exec .` to load env)
- [x] 1.7 If any step 1.2–1.6 fails, halt and report to user — N/A (all green)

## 2. PR 1 — Low-risk (branch `chore/upgrade-deps-low-risk`)

- [x] 2.1 ~~Create branch `chore/upgrade-deps-low-risk` from `main`~~ — skipped (single-branch override)
- [ ] 2.2 Re-check latest patch/minor versions with `pnpm outdated --recursive`

### Shared catalog (`pnpm-workspace.yaml > catalogs.shared`)

For each catalog dep below, bump it and then run the full per-library cycle (`pnpm install` → `pnpm build` → `pnpm format` → `pnpm lint` → `pnpm type-check` → `pnpm test`) and commit before moving to the next. **A single grouped commit per catalog change set is acceptable since they ship together via the catalog**, but the install + build + checks MUST still run between groups.

- [ ] 2.3 Bump `@types/node` to latest 24.x in catalog → install → build → checks → commit
- [ ] 2.4 Bump `pino` to latest 10.x in catalog → install → build → checks → commit
- [ ] 2.5 Bump `tsx` to latest 4.x in catalog → install → build → checks → commit
- [ ] 2.6 Bump `typescript` to latest 5.9.x in catalog (NOT 6.x) → install → build → checks → commit
- [ ] 2.7 Bump `vitest` to latest 4.1.x in catalog → install → build → checks → commit
- [ ] 2.8 Bump `zod` to latest 4.x in catalog → install → build → checks → commit

### apps/api

- [ ] 2.9 Bump `@azure/identity` to latest 4.x in `apps/api/package.json` → install → build → checks → commit
- [ ] 2.10 Bump `@fastify/cors` to latest 11.x → install → build → checks → commit
- [ ] 2.11 Bump `@fastify/jwt` to latest 10.x → install → build → checks → commit
- [ ] 2.12 Bump `@fastify/swagger` to latest 9.x → install → build → checks → commit
- [ ] 2.13 Bump `@fastify/swagger-ui` to latest 5.x → install → build → checks → commit
- [ ] 2.14 Bump `fastify` to latest 5.x → install → build → checks → commit
- [ ] 2.15 Bump `@faker-js/faker` (dev) to latest 10.x → install → build → checks → commit
- [ ] 2.16 Bump `pino-pretty` (dev) to latest 13.x → install → build → checks → commit
- [ ] 2.17 Bump `tsc-alias` (dev) to latest 1.x → install → build → checks → commit
- [ ] 2.18 Bump `@vitest/coverage-v8` (dev) to latest 4.1.x → install → build → checks → commit
- [ ] 2.19 Bump `@vitest/ui` (dev) to latest 4.1.x → install → build → checks → commit

### apps/web

- [ ] 2.20 Bump `@fontsource-variable/roboto` to latest 5.x → install → build → checks → commit
- [ ] 2.21 Bump `@fontsource/roboto` to latest 5.x → install → build → checks → commit
- [ ] 2.22 Bump `@hookform/resolvers` to latest 5.x → install → build → checks → commit
- [ ] 2.23 Bump `@mui/material` to latest 7.x (NOT 8/9) → install → build → checks → commit
- [ ] 2.24 Bump `@mui/icons-material` to latest 7.x → install → build → checks → commit
- [ ] 2.25 Bump `@mui/x-charts` to latest 8.x (NOT 9) → install → build → checks → commit
- [ ] 2.26 Bump `@mui/x-data-grid` to latest 8.x → install → build → checks → commit
- [ ] 2.27 Bump `@mui/x-date-pickers` to latest 8.x → install → build → checks → commit
- [ ] 2.28 Bump `@tailwindcss/typography` to latest 0.5.x → install → build → checks → commit
- [ ] 2.29 Bump `@tailwindcss/vite` to latest 4.x → install → build → checks → commit
- [ ] 2.30 Bump `@tanstack/react-query` to latest 5.x → install → build → checks → commit
- [ ] 2.31 Bump `@tanstack/react-router` to latest 1.x → install → build → checks → commit (regenerate `routeTree.gen.ts` via dev server if needed; do NOT hand-edit it)
- [ ] 2.32 Bump `@types/react` (dev) to latest 19.x → install → build → checks → commit
- [ ] 2.33 Bump `@types/react-dom` (dev) to latest 19.x → install → build → checks → commit
- [ ] 2.34 Bump `baseline-browser-mapping` (dev) to latest 2.x → install → build → checks → commit
- [ ] 2.35 Bump `date-fns` to latest 4.x → install → build → checks → commit
- [ ] 2.36 Bump `fuse.js` to latest 7.x → install → build → checks → commit
- [ ] 2.37 Bump `lodash-es` to latest 4.x → install → build → checks → commit
- [ ] 2.38 Bump `react` to latest 19.2.x → install → build → checks → commit
- [ ] 2.39 Bump `react-dom` to latest 19.2.x → install → build → checks → commit
- [ ] 2.40 Bump `react-hook-form` to latest 7.x → install → build → checks → commit
- [ ] 2.41 Bump `tailwindcss` to latest 4.x → install → build → checks → commit
- [ ] 2.42 Bump `zustand` to latest 5.x → install → build → checks → commit
- [ ] 2.43 Bump `@tanstack/react-query-devtools` (dev) to latest 5.x → install → build → checks → commit
- [ ] 2.44 Bump `@tanstack/react-router-devtools` (dev) to latest 1.x → install → build → checks → commit
- [ ] 2.45 Bump `@tanstack/router-plugin` (dev) to latest 1.x → install → build → checks → commit

### packages/database

- [ ] 2.46 Bump `@prisma/adapter-pg` to latest 7.x → install → `pnpm --filter=@repo/database exec prisma generate` → build → checks → commit
- [ ] 2.47 Bump `@prisma/client` to latest 7.x → install → prisma generate → build → checks → commit
- [ ] 2.48 Bump `@prisma/client-runtime-utils` to latest 7.x → install → prisma generate → build → checks → commit
- [ ] 2.49 Bump `prisma` (dev) to latest 7.x → install → prisma generate → build → checks → commit

### packages/eslint-config

- [ ] 2.50 Bump `@tanstack/eslint-plugin-query` (dev) to latest 5.x → install → build → checks → commit
- [ ] 2.51 Bump `@tanstack/eslint-plugin-router` (dev) to latest 1.x → install → build → checks → commit
- [ ] 2.52 Bump `eslint-plugin-react-hooks` (dev) to latest 7.x → install → build → checks → commit
- [ ] 2.53 Bump `eslint-plugin-turbo` (dev) to latest 2.x → install → build → checks → commit
- [ ] 2.54 Bump `typescript-eslint` (dev) to latest 8.x (NOT next major) → install → build → checks → commit

### root

- [ ] 2.55 Bump `prettier` (dev) to latest 3.x in root `package.json` → install → build → checks → commit (Prettier 3.8 may reformat; run `pnpm format` and include the formatting in this commit)
- [ ] 2.56 Bump `turbo` (dev) to latest 2.x → install → build → checks → commit

### PR 1 wrap-up

- [ ] 2.57 Final full cycle: `pnpm install && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm build`
- [ ] 2.58 Push branch and open PR titled `chore(deps): upgrade low-risk dependencies (patch + minor)`
- [ ] 2.59 PR body: include full table of bumps, mention quality gates passed per commit, smoke-test checklist (login, list orgs, create inventory, create reduction project, dashboard, file upload, date picker, charts)
- [ ] 2.60 Wait for human review and merge to `main`. Do NOT proceed to PR 2 until merged.

## 3. PR 2 — Medium-risk (branch `chore/upgrade-deps-medium-risk`)

- [ ] 3.1 Re-checkout `main`, `git pull --ff-only`, run full pre-flight again (1.2–1.6)
- [ ] 3.2 Create branch `chore/upgrade-deps-medium-risk` from updated `main`
- [ ] 3.3 Re-check latest versions with `pnpm outdated --recursive`

### Order is strict: lowest-blast-radius first

- [ ] 3.4 Bump `globals` (dev) 16 → 17 in `packages/eslint-config/package.json`. Read [globals releases](https://github.com/sindresorhus/globals/releases). Adjust `packages/eslint-config/{base,api,web}.ts` if any global was removed. Run install → build → checks → commit.
- [ ] 3.5 Bump `cpy-cli` (dev) 5 → 7 in root `package.json`. Read [cpy-cli releases](https://github.com/sindresorhus/cpy-cli/releases). Verify the `build` script in `packages/database/package.json` (the only consumer of cpy-cli) still copies `src/generated/prisma/**` to `dist/`. Adjust flags if changed. Run install → build → checks → commit.
- [ ] 3.6 Bump `@vitejs/plugin-react` (dev) 5 → 6 in `apps/web/package.json`. Read its CHANGELOG. Check `apps/web/vite.config.ts` for renamed/removed options. Run install → build → checks → start `pnpm dev:web` briefly to confirm HMR works → commit.
- [ ] 3.7 Bump `@fastify/multipart` 9 → 10 in `apps/api/package.json`. Read [UPGRADE.md](https://github.com/fastify/fastify-multipart/blob/master/UPGRADE.md). Search usages: `grep -rn "multipart\\|saveRequestFiles\\|request.files\\|request.file" apps/api/src`. Adjust file-upload handlers. Run install → build → checks → commit.
- [ ] 3.8 Bump `@testcontainers/postgresql` (dev) 11 → 12 in `apps/api/package.json`. Read testcontainers-node release notes. Adjust `apps/api/test/factories/appFactory.ts` and any global setup if API changed. Run install → build → `pnpm test --filter=api` → commit.
- [ ] 3.9 Bump `@testcontainers/azurite` (dev) 11 → 12 in `apps/api/package.json`. Adjust as needed. Run install → build → `pnpm test --filter=api` → commit.
- [ ] 3.10 Bump `jwks-rsa` 3 → 4 in `apps/api/package.json`. Read [jwks-rsa releases](https://github.com/auth0/node-jwks-rsa/releases). Locate usages: `grep -rn "jwks-rsa\\|JwksClient" apps/api/src`. Adjust `apps/api/src/plugins/app/authorizationPlugin.ts` and any other JWT verification site. Run install → build → checks → commit.
- [ ] 3.11 Bump `ky` 1 → 2 in `apps/web/package.json`. Read [ky releases](https://github.com/sindresorhus/ky/releases). Update `apps/web/src/api/http/client.ts` (the `beforeRequest` MSAL hook, retry options, timeout, JSON parsing changes). Search for other usages: `grep -rn "from 'ky'\\|from \"ky\"" apps/web/src`. Run install → build → checks → commit.

### PR 2 wrap-up

- [ ] 3.12 Final full cycle: `pnpm install && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm build`
- [ ] 3.13 Push and open PR titled `chore(deps): upgrade medium-risk dependencies (scoped majors)`
- [ ] 3.14 PR body: tabulate bumps, link the migration guides consulted, list manually edited files, include checklist:
  - [ ] Login (MSAL flow) works end-to-end against the dev tenant
  - [ ] Authenticated API call returns 200 (jwks-rsa + ky path verified)
  - [ ] Evidence file upload works (multipart 10)
  - [ ] `pnpm dev:web` HMR works (vite-plugin-react 6)
  - [ ] `pnpm test --filter=api` is fully green (testcontainers 12)
- [ ] 3.15 Wait for human review and merge. Do NOT proceed to PR 3 until merged.

## 4. PR 3 — High-risk (branch `chore/upgrade-deps-high-risk`)

- [ ] 4.1 Re-checkout `main`, `git pull --ff-only`, run full pre-flight again
- [ ] 4.2 Create branch `chore/upgrade-deps-high-risk` from updated `main`
- [ ] 4.3 Re-check latest versions with `pnpm outdated --recursive`

### Phase 4.A — TypeScript 6 + @types/node 25

- [ ] 4.A.1 Read [TypeScript 6.0 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [ ] 4.A.2 Bump `typescript` to latest 6.x in `pnpm-workspace.yaml > catalogs.shared`
- [ ] 4.A.3 Bump `@types/node` to latest 25.x in `pnpm-workspace.yaml > catalogs.shared`
- [ ] 4.A.4 Run `pnpm install`
- [ ] 4.A.5 Run `pnpm build` — expect possible type errors; address as below
- [ ] 4.A.6 Run `pnpm type-check` and fix each error (no `any` patches). If errors exceed ~15 files of meaningful changes, halt and ask user.
- [ ] 4.A.7 Run `pnpm lint && pnpm test && pnpm build` — all green
- [ ] 4.A.8 Commit: `chore(deps): upgrade typescript 5.9 to 6.0 and @types/node 24 to 25`

### Phase 4.B — ESLint 10

- [ ] 4.B.1 Read [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- [ ] 4.B.2 Bump `eslint` to latest 10.x in `pnpm-workspace.yaml > catalogs.shared`
- [ ] 4.B.3 Bump `@eslint/js` (dev) to latest 10.x in `packages/eslint-config/package.json`
- [ ] 4.B.4 Run `pnpm install`
- [ ] 4.B.5 Update `packages/eslint-config/{base,api,web}.ts` for any removed/renamed rules or config-shape changes
- [ ] 4.B.6 Run `pnpm lint` — fix any new warnings (zero-warning policy)
- [ ] 4.B.7 Run `pnpm type-check && pnpm test && pnpm build` — all green
- [ ] 4.B.8 Commit: `chore(deps): upgrade eslint 9 to 10`

### Phase 4.C — MSAL 5 (browser 4→5 + react 3→5)

- [ ] 4.C.1 Read msal-browser v4→v5 migration and msal-react v3→v5 migration on the [microsoft-authentication-library-for-js repo](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [ ] 4.C.2 Locate all MSAL usage: `grep -rn "@azure/msal\\|PublicClientApplication\\|MsalProvider\\|useMsal\\|acquireToken" apps/web/src`
- [ ] 4.C.3 Bump `@azure/msal-browser` to latest 5.x in `apps/web/package.json`
- [ ] 4.C.4 Bump `@azure/msal-react` to latest 5.x in `apps/web/package.json`
- [ ] 4.C.5 Run `pnpm install`
- [ ] 4.C.6 Update `PublicClientApplication` config shape (v5 changes)
- [ ] 4.C.7 Update `MsalProvider` props
- [ ] 4.C.8 Update `acquireTokenSilent` / `acquireTokenRedirect` callsites
- [ ] 4.C.9 Update `apps/web/src/api/http/client.ts` `beforeRequest` hook to use the new token-acquisition API
- [ ] 4.C.10 Run `pnpm build && pnpm type-check && pnpm lint && pnpm test` — all green
- [ ] 4.C.11 Manual smoke test: clear browser storage, run `pnpm dev:web`, perform login + logout + authenticated API call. Halt and ask user to confirm before continuing.
- [ ] 4.C.12 Commit: `chore(deps): upgrade msal-browser 4 to 5 and msal-react 3 to 5`

### Phase 4.D — MUI core 7 → 9 (via v8 codemod chain)

- [ ] 4.D.1 Read [Upgrade to v8](https://mui.com/material-ui/migration/upgrade-to-v8/) and [Upgrade to v9](https://mui.com/material-ui/migration/upgrade-to-v9/)
- [ ] 4.D.2 Run codemod chain (BEFORE bumping versions):
  - `npx @mui/codemod@latest v8.0.0/preset-safe apps/web/src`
  - `npx @mui/codemod@latest v9.0.0/preset-safe apps/web/src`
- [ ] 4.D.3 Commit codemod output: `chore(deps): apply mui v8 and v9 codemods`
- [ ] 4.D.4 Bump `@mui/material` to latest 9.x in `apps/web/package.json`
- [ ] 4.D.5 Bump `@mui/icons-material` to latest 9.x in `apps/web/package.json`
- [ ] 4.D.6 Run `pnpm install`
- [ ] 4.D.7 Update `apps/web/src/theme/palette.ts` and `apps/web/src/undp-huella-latam.theme.d.ts` for theme augmentation changes (palette `requestTypeColors`, `recognitionTypeColors`, etc.)
- [ ] 4.D.8 Audit and fix `Grid` API usage (v8/v9 changed it significantly)
- [ ] 4.D.9 Fix any `sx` prop changes, removed components, moved imports
- [ ] 4.D.10 Run `pnpm build && pnpm type-check && pnpm lint && pnpm test` — all green
- [ ] 4.D.11 If TS/lint errors exceed ~25 files of meaningful changes, halt and ask user before continuing
- [ ] 4.D.12 Commit: `chore(deps): upgrade mui core 7 to 9 (post-codemod fixes)`

### Phase 4.E — MUI X 8 → 9 (charts, data-grid, date-pickers)

- [ ] 4.E.1 Read MUI X v9 migration guides for [data-grid](https://mui.com/x/migration/migration-data-grid-v8/), charts, and date-pickers (find current URLs at https://mui.com/x/)
- [ ] 4.E.2 Run codemods:
  - `npx @mui/x-codemod@latest v9.0.0/data-grid/preset-safe apps/web/src`
  - `npx @mui/x-codemod@latest v9.0.0/charts/preset-safe apps/web/src`
  - `npx @mui/x-codemod@latest v9.0.0/pickers/preset-safe apps/web/src`
- [ ] 4.E.3 Commit codemod output: `chore(deps): apply mui-x v9 codemods`
- [ ] 4.E.4 Bump `@mui/x-charts` to latest 9.x in `apps/web/package.json`
- [ ] 4.E.5 Bump `@mui/x-data-grid` to latest 9.x in `apps/web/package.json`
- [ ] 4.E.6 Bump `@mui/x-date-pickers` to latest 9.x in `apps/web/package.json`
- [ ] 4.E.7 Run `pnpm install`
- [ ] 4.E.8 Audit DataGrid usages (filters, sort, pagination, column defs) and fix breaking changes
- [ ] 4.E.9 Audit `@mui/x-charts` usages in the dashboard and fix breaking changes
- [ ] 4.E.10 Audit `@mui/x-date-pickers` usages in `FormDateField` and consumers; verify Spanish locale still wires up via `date-fns/es`
- [ ] 4.E.11 Run `pnpm build && pnpm type-check && pnpm lint && pnpm test` — all green
- [ ] 4.E.12 Commit: `chore(deps): upgrade mui-x 8 to 9 (charts, data-grid, date-pickers)`

### PR 3 wrap-up

- [ ] 4.F.1 Final full cycle: `pnpm install && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm build`
- [ ] 4.F.2 Push and open PR titled `chore(deps): upgrade high-risk dependencies (TS6, ESLint10, MSAL5, MUI9)`
- [ ] 4.F.3 PR body: full tabulation, links to all migration guides, list of codemods run, list of manually edited files, full smoke-test checklist:
  - [ ] MSAL login + logout + authenticated API call
  - [ ] Sidebar / layout renders correctly
  - [ ] CRUD organizations
  - [ ] CRUD inventories + evidence upload
  - [ ] CRUD reduction projects
  - [ ] Dashboard charts (`@mui/x-charts` v9)
  - [ ] DataGrid filters / sort / pagination (v9)
  - [ ] Date pickers in forms (Spanish locale, `date-fns/es`)
  - [ ] Modals / dialogs (MUI core v9)
  - [ ] Notistack snackbars
  - [ ] Excel export still works
- [ ] 4.F.4 Wait for human review and merge

## 5. Post-upgrade reporting

- [ ] 5.1 Produce a final report listing: total libraries bumped, links to the 3 merged PRs, total commits, any libraries deferred (with reason), any follow-up tickets opened
- [ ] 5.2 Update or archive this OpenSpec change (run `/opsx:archive` once all PRs are merged)

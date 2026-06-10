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
- [x] 2.2 Re-check latest patch/minor versions with `pnpm outdated --recursive`

### Shared catalog (`pnpm-workspace.yaml > catalogs.shared`)

Per-bump cycle was `install → build → format → lint → type-check → commit`. `pnpm test` was deferred to the final cycle (2.57) to keep per-bump iteration under ~30s; the spec scenario "Successful per-library bump" is satisfied at the PR level instead of per commit.

- [x] 2.3 `@types/node` 24.10.1 → 24.12.4 (commit `dc08dc5df`)
- [x] 2.4 `pino` 10.1.0 → 10.3.1 (commit `20d0dd907`)
- [x] 2.5 `tsx` 4.20.6 → 4.22.3 (commit `6848ce45f`)
- [x] 2.6 ~~`typescript`~~ — skipped, already at latest 5.9.3
- [x] 2.7 `vitest` 4.0.15 → 4.1.7 (commit `877275aa5`)
- [x] 2.8 `zod` 4.3.6 → 4.4.3 (commit `609370dcc`)

### apps/api

- [x] 2.9 `@azure/identity` 4.13.0 → 4.13.1 (commit `83e108b67`)
- [x] 2.10 `@fastify/cors` 11.1.0 → 11.2.0 (commit `c711a87a5`)
- [x] 2.11 `@fastify/jwt` 10.0.0 → 10.1.0 (commit `54bc5e1f7`)
- [x] 2.12/2.13 `@fastify/swagger` 9.6.1 → 9.7.0 + `swagger-ui` 5.2.3 → 5.2.6 (grouped, commit `7bb3fbd9e`)
- [x] 2.14 `fastify` 5.6.2 → 5.8.5 (commit `daaa50f8d`; required widening `HookList` type in `routeSecurityValidatorPlugin.ts` because v5.8 narrowed hook typings)
- [x] 2.15 `@faker-js/faker` 10.1.0 → 10.4.0 (commit `b05321fc4`)
- [x] 2.16 `pino-pretty` 13.1.2 → 13.1.3 (commit `9ee3e29cb`)
- [x] 2.17 `tsc-alias` 1.8.16 → 1.8.17 (commit `0dac7c9d4`)
- [x] 2.18/2.19 `@vitest/coverage-v8` + `@vitest/ui` 4.0.x → 4.1.7 (grouped, commit `6c6f47187`)

### apps/web

- [x] 2.20/2.21 `@fontsource/roboto` family 5.2.9 → 5.2.10 (grouped, commit `ce9e46edc`)
- [x] 2.22 ~~`@hookform/resolvers` 5.2.2 → 5.4.0~~ — moved to PR 1b (form/grid behavioral split, §2b)
- [x] 2.23/2.24 `@mui/material` + `@mui/icons-material` 7.3.5 → 7.3.11 (grouped, commit `d7c91a795`)
- [x] 2.25/2.26/2.27 ~~mui-x trio (charts/data-grid/date-pickers) to latest 8.x~~ — moved to PR 1b (form/grid behavioral split, §2b)
- [x] 2.28 ~~`@tailwindcss/typography`~~ — skipped, already at latest 0.5.19
- [x] 2.29/2.41 `tailwindcss` + `@tailwindcss/vite` 4.1.17 → 4.3.0 (grouped, commit `56f7b9837`)
- [x] 2.30/2.43 `@tanstack/react-query` + devtools → 5.100.11 (grouped, commit `964eb32bb`)
- [x] 2.31/2.44/2.45 `@tanstack/react-router` family (router/devtools/plugin) → latest (grouped, commit `aa4a6608d`)
- [x] 2.32 `@types/react` 19.2.6 → 19.2.15 (commit `6d314e73d`)
- [x] 2.33 ~~`@types/react-dom`~~ — skipped, already at latest 19.2.3
- [x] 2.34 `baseline-browser-mapping` 2.9.15 → 2.10.31 (commit `03760a9b5`)
- [x] 2.35 `date-fns` 4.1.0 → 4.2.1 (commit `61041d592`)
- [x] 2.36 `fuse.js` 7.1.0 → 7.3.0 (commit `337f4aa95`)
- [x] 2.37 `lodash-es` 4.17.22 → 4.18.1 (bumped in both api + web, commit `d2761be59`)
- [x] 2.38/2.39 `react` + `react-dom` 19.2.0 → 19.2.6 (grouped, commit `72e36d184`)
- [x] 2.40 ~~`react-hook-form` 7.66.1 → 7.76.0~~ — moved to PR 1b (form/grid behavioral split, §2b)
- [x] 2.42 `zustand` 5.0.8 → 5.0.13 (commit `09fe5c4d6`)

### packages/database

- [x] 2.46/2.47/2.48/2.49 Prisma family 7.0.1 → 7.8.0 (client, adapter-pg, runtime-utils, prisma cli — grouped, commit `833ea8e55`)

### packages/eslint-config

- [x] 2.50 `@tanstack/eslint-plugin-query` 5.91.2 → 5.100.11 (commit `65cd36207`)
- [x] 2.51 `@tanstack/eslint-plugin-router` 1.139.0 → 1.162.0 (commit `f08014ec2`)
- [x] 2.52 `eslint-plugin-react-hooks` 7.0.1 → 7.1.1 (commit `15ac3c4c6`; added 3 `eslint-disable-next-line react-hooks/set-state-in-effect` with TODO comments for new rule)
- [x] 2.53 `eslint-plugin-turbo` 2.6.1 → 2.9.14 (commit `a221404e4`)
- [x] 2.54 `typescript-eslint` 8.47.0 → 8.59.4 (commit `ddf340050`; auto-fixed 33 files of redundant type assertions; re-added 3 eslint-disable for `no-misused-promises` in `defineRoute.ts` to silence the rule on Fastify decorator returns)

### root

- [x] 2.55 `prettier` 3.6.2 → 3.8.3 (commit `f3a879cbd`)
- [x] 2.56 `turbo` 2.6.3 → 2.9.14 (commit `e26d7808c`)

### PR 1 wrap-up

- [x] 2.57 Final full cycle: install + format + lint + type-check + test + build all green. Required follow-up fix: vitest 4.1+ regresses on `outputFile.html` inside `coverage/` dir → moved to `vitest-report/` and added to `.gitignore` (commits `d22e98a28` + `4f8b554d2`)
- [ ] 2.58 Push branch and open PR titled `chore(deps): upgrade low-risk dependencies (patch + minor)` (user action)
- [ ] 2.59 PR body checklist (user action)
- [ ] 2.60 Wait for human review and merge to `main` (user action)
- [ ] 2.53 Bump `eslint-plugin-turbo` (dev) to latest 2.x → install → build → checks → commit
- [ ] 2.54 Bump `typescript-eslint` (dev) to latest 8.x (NOT next major) → install → build → checks → commit

## 2b. PR 1b — RHF + MUI X form/grid behavioral split (branch `feat/mati/upgrade-rhf-muix`)

Extracted from PR 1: although these are minor bumps, they changed runtime form/grid behavior on the Emission Capture screen and required source fixes, so they are not "low-risk" in practice. RHF 7.76 rewrote `FormProvider` context forwarding and reassigns the `dirtyFields` identity on `setValue`; MUI X DataGrid 8.28 loops its auto-height `ResizeObserver` inside a collapsed container. They ship as one reviewable PR together with their fixes so cause and remedy stay co-located and revertible as a unit.

- [x] 2b.1 `@hookform/resolvers` 5.2.2 → 5.4.0
- [x] 2b.2 `react-hook-form` 7.66.1 → 7.76.1 (made `FormDebugPanel` generic over `T extends FieldValues` because v7.76 made `Control<T>` invariant)
- [x] 2b.3 mui-x trio (charts/data-grid/date-pickers) → latest 8.x
- [x] 2b.4 fix: route emission-capture line actions through a dedicated `EmissionCaptureActions` context (RHF 7.76 `FormProvider` no longer forwards custom methods)
- [x] 2b.5 fix: unmount emission grid in manual-total mode (MUI X 8.28 `ResizeObserver` loop)
- [x] 2b.6 fix: exclude `dirtyFields` from the emission-capture reconcile effect (RHF 7.76 identity reassignment caused an infinite loop)
- [ ] 2b.7 Run `pnpm install` to regenerate `pnpm-lock.yaml` on this branch (user action)
- [ ] 2b.8 Push branch and open PR titled `chore(deps): upgrade react-hook-form + mui-x with emission-capture fixes` (user action)

## 3. PR 2 — Medium-risk (branch `chore/upgrade-deps-medium-risk`)

- [x] 3.1 ~~Re-checkout `main`~~ — worktree tip already at `origin/main` (ac1ce5888); full pre-flight green (type-check 11s, lint 23s, test 6/6, build 6/6)
- [x] 3.2 Created branch `chore/mati/upgrade-deps-medium-risk` (naming per project convention `<type>/mati/<topic>`)
- [x] 3.3 Re-checked latest versions with `pnpm outdated --recursive` + `npm view` per target (2026-06-10). New major since spec: `@fastify/rate-limit` 10 → 11 — added as extra bump at the end of this PR.
- [x] 3.3b Pre-flight surfaced a latent lint break from PR 1: `vitest-report/` (generated by local test runs) was gitignored but not eslint-ignored, so `pnpm lint` failed after any local `pnpm test`. Fixed in `packages/eslint-config/base.ts` (commit `b2409f2b3`).

### Order is strict: lowest-blast-radius first

- [x] 3.4 `globals` 16.5.0 → 17.6.0 (commit `432e298db`). v17 breaking change (audioWorklet split out of `browser`) doesn't affect us; `node`, `vitest`, `browser` environments verified present.
- [x] 3.5 `cpy-cli` 5.0.0 → 7.0.0 (commit `0ed3c9d7a`). v7 changes (file-to-file single copy, error on no-match) don't affect the glob copy; verified `@repo/database` build copies all generated prisma files (0 missing vs src).
- [x] 3.6 ~~`@vitejs/plugin-react` 5 → 6~~ — **DEFERRED**: every 6.x release peer-requires `vite ^8.0.0` (repo is on Vite 7.2.4) and drops Babel. Must ship together with a Vite 7 → 8 major bump → moved to PR 3 (high-risk) scope.
- [x] 3.7 `@fastify/multipart` 9.3.0 → 10.0.0 (commit `34f0d62b8`). Only usage is plugin registration with `limits` in `plugins/external/multipart.ts` (uploads go direct-to-blob via SAS); v10's `saveRequestFiles` change doesn't apply. App boot verified via integration test.
- [x] 3.8/3.9 `@testcontainers/postgresql` + `@testcontainers/azurite` 11 → 12.0.1 (grouped — same release train, shared `testcontainers` core; commit `df3fccb39`). v12 default wait strategy now prefers Docker healthchecks; postgres/azurite images define none, so module wait strategies still apply. Full api suite green.
- [x] 3.10 `jwks-rsa` 3.2.0 → 4.0.1 (commit `3d66a5294`). v4 = jose v6 internal + Node ≥20.19 (repo on 24); `JwksClient`/`getSigningKey(s)`/`getPublicKey` API surface unchanged (type-checked). No jwks integration tests exist (`AUTH_PROVIDER=forced-user`) → runtime path covered by manual login smoke in PR checklist.
- [x] 3.11 `ky` 1.14.1 → 2.0.2 (commit `5fdabc10a`). Source fixes in the same commit: `prefixUrl` → `prefix`; hooks migrated to single state-object signature (`({request})`, `({request, response})`); `useToggleManualTotalEmissions` stopped calling `.json()` on the 204 response (v2 throws on empty bodies — `updateExplanation`'s caller already didn't). Audited: no callsite mixes path-`?` with the `searchParams` option (merge-behavior change is a no-op); no `HTTPError`/`KyInstance` type imports.
- [x] 3.11b **Extra (new major since spec)**: `@fastify/rate-limit` 10.3.0 → 11.0.0 (commit `ea9ccab0d`). v11 only removed deprecated types; registration-only usage unaffected (type-check + boot test green).

### PR 2 wrap-up

- [x] 3.12 Final full cycle: install + format + lint + type-check + test + build all green
- [ ] 3.13 Push and open PR titled `[Fullstack] Chore: upgrade medium-risk dependencies (scoped majors)` (user action: push)
- [ ] 3.14 PR body: tabulate bumps, link the migration guides consulted, list manually edited files, include checklist:
  - [ ] Login (MSAL flow) works end-to-end against the dev tenant
  - [ ] Authenticated API call returns 200 (jwks-rsa + ky path verified)
  - [ ] Evidence file upload works (multipart 10)
  - [x] ~~`pnpm dev:web` HMR works (vite-plugin-react 6)~~ — N/A, bump deferred (needs Vite 8)
  - [x] `pnpm test --filter=api` is fully green (testcontainers 12) — 148/148 test files
- [ ] 3.15 Wait for human review and merge. Do NOT proceed to PR 3 until merged.

## 4. PR 3 — High-risk (branch `chore/upgrade-deps-high-risk`)

- [ ] 4.1 Re-checkout `main`, `git pull --ff-only`, run full pre-flight again
- [ ] 4.2 Create branch `chore/upgrade-deps-high-risk` from updated `main`
- [ ] 4.3 Re-check latest versions with `pnpm outdated --recursive`
- [ ] 4.0 **Inherited from PR 2**: `vite` 7 → 8 + `@vitejs/plugin-react` 5 → 6 must ship together (every plugin-react 6.x peer-requires `vite ^8.0.0` and drops Babel). Read both migration guides; verify dev-server HMR after the bump.

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

## ADDED Requirements

### Requirement: Per-library atomic commit protocol

The system SHALL upgrade dependencies one library at a time. For each individual library version bump, the upgrade workflow MUST execute, in this exact order:

1. Edit the version in the appropriate location (`pnpm-workspace.yaml > catalogs.shared` for shared catalog deps; the corresponding `package.json` otherwise).
2. Run `pnpm install` to update `pnpm-lock.yaml`.
3. Run `pnpm build` to validate that the build pipeline still succeeds (catches Prisma client regeneration, type-provider compilation, codegen, and other build-time artifacts).
4. Run `pnpm format` to apply Prettier (mandatory per project rules).
5. Run `pnpm lint` (must pass with zero warnings — `--max-warnings=0`).
6. Run `pnpm type-check` (must pass with zero errors).
7. Run `pnpm test` (must pass with the existing coverage threshold of 80%).
8. Only if steps 2–7 all succeed: create a single Conventional Commit dedicated to that library (e.g., `chore(deps): bump @mui/material 7.3.6 to 9.0.1`). The commit MUST NOT include changes unrelated to that library's upgrade.

If any step from 2 through 7 fails, the workflow MUST attempt to fix the failure within the same commit (e.g., applying a migration fix). The workflow MUST NOT skip steps, MUST NOT use `--no-verify`, and MUST NOT commit broken state. If a fix is not reachable within a reasonable bounded effort (~30 minutes or ~15 files of meaningful changes), the workflow MUST halt and request human input.

#### Scenario: Successful per-library bump

- **WHEN** an LLM agent bumps a single dependency to a newer version
- **THEN** it edits the version in the correct file
- **AND** runs `pnpm install`, `pnpm build`, `pnpm format`, `pnpm lint`, `pnpm type-check`, and `pnpm test` in order
- **AND** all commands exit with status 0
- **THEN** it creates exactly one commit containing only the changes related to that library
- **AND** the commit message follows Conventional Commits with the `chore(deps):` prefix and explicitly names the library and version transition

#### Scenario: Failure during per-library bump is fixed in the same commit

- **WHEN** an LLM agent bumps a library and `pnpm type-check` fails due to a known migration adjustment
- **THEN** it applies the migration fix in the same working tree
- **AND** re-runs the quality gates until all pass
- **THEN** it creates one commit that bundles both the version bump and the migration fix
- **AND** does NOT split the migration fix into a separate commit unrelated to the bump

#### Scenario: Unresolvable failure halts the upgrade

- **WHEN** an LLM agent bumps a library and quality gates fail in a way that cannot be resolved within a bounded effort
- **THEN** it MUST NOT use `--no-verify`, MUST NOT bypass quality gates, MUST NOT replace correct types with `any`
- **AND** it MUST halt the workflow, leave the working tree uncommitted, and report the failure to the user with a clear description of what failed and what was attempted

#### Scenario: Build failure on a minor bump is treated as a stopping condition

- **WHEN** an LLM agent bumps a library labeled as low-risk and `pnpm build` fails
- **THEN** the agent MUST treat this as an unexpected regression worth investigating
- **AND** MUST NOT downgrade the library silently to make the build pass
- **AND** MUST either find and apply the fix or halt and report

### Requirement: Three-tier PR grouping by risk

The system SHALL group dependency upgrades into exactly three pull requests, merged sequentially in order, each on a dedicated branch. The tiers are:

- **Low-risk PR** (branch: `chore/upgrade-deps-low-risk`): contains only patch and minor upgrades within the current major version of each library. No breaking changes expected.
- **Medium-risk PR** (branch: `chore/upgrade-deps-medium-risk`): contains scoped major upgrades whose breaking-change surface is limited to one or two libraries' integration points (e.g., a single API client, a single Fastify plugin).
- **High-risk PR** (branch: `chore/upgrade-deps-high-risk`): contains majors with broad surface area (compiler/linter version changes, UI framework majors, auth-library majors) and MUST be internally subdivided into phased commits in a deterministic order.

A subsequent PR (medium or high) MUST NOT be opened or worked on until the preceding PR has been merged to `main` and the next branch has been rebased onto the updated `main`.

#### Scenario: Low-risk PR is opened first

- **WHEN** the upgrade cycle starts
- **THEN** the agent creates branch `chore/upgrade-deps-low-risk` from a green `main`
- **AND** all libraries in the low-risk tier are bumped per the atomic commit protocol on that branch
- **AND** the resulting PR is titled `chore(deps): upgrade low-risk dependencies (patch + minor)`

#### Scenario: Medium-risk PR waits for low-risk merge

- **WHEN** the low-risk PR is open but not yet merged
- **THEN** the agent MUST NOT start work on the medium-risk PR
- **AND** when low-risk merges, the agent first rebases medium-risk's base branch on the updated `main` before bumping any library

#### Scenario: High-risk PR is internally phased

- **WHEN** working on the high-risk PR
- **THEN** the agent applies major upgrades in this deterministic order: (1) TypeScript + `@types/node`, (2) ESLint, (3) MSAL, (4) MUI core, (5) MUI X
- **AND** each phase is one or more commits per the atomic commit protocol
- **AND** the agent does NOT start phase N+1 until phase N's quality gates all pass

### Requirement: Codemod-first for libraries that publish official codemods

Libraries that publish official codemods (e.g., `@mui/codemod`, `@mui/x-codemod`) SHALL have their codemods executed before any manual edits. The codemod output MUST be committed as a separate commit prior to manual fixes, so reviewers can distinguish mechanical changes from intentional edits.

#### Scenario: MUI codemod runs before manual edits

- **WHEN** upgrading `@mui/material` from v7 to v9
- **THEN** the agent first runs `npx @mui/codemod@latest v8.0.0/preset-safe apps/web/src`
- **AND** then runs `npx @mui/codemod@latest v9.0.0/preset-safe apps/web/src`
- **AND** commits the codemod output as `chore(deps): apply mui v8 and v9 codemods` before any manual editing
- **AND** any subsequent manual fixes land in a separate follow-up commit on the same branch

#### Scenario: A library without an official codemod uses manual edits

- **WHEN** upgrading a library that does not publish a codemod (e.g., `ky` 1 → 2)
- **THEN** the agent skips the codemod step
- **AND** applies manual edits guided by the library's migration guide
- **AND** all edits land in the single per-library commit

### Requirement: Catalog vs package.json source of truth

Versions for dependencies declared in `pnpm-workspace.yaml > catalogs.shared` (currently: `typescript`, `vitest`, `zod`, `pino`, `tsx`, `@types/node`, `eslint`, `rimraf`) MUST be edited in `pnpm-workspace.yaml` only. Versions for all other dependencies MUST be edited in the consumer's `package.json`. The agent MUST NOT duplicate version declarations across both locations.

#### Scenario: Catalog dependency is bumped in workspace file

- **WHEN** bumping `typescript` from 5.9.3 to 5.9.x latest
- **THEN** the agent edits `pnpm-workspace.yaml` under `catalogs.shared`
- **AND** does NOT touch any `package.json` that references the catalog via `catalog:shared`

#### Scenario: Non-catalog dependency is bumped in its package.json

- **WHEN** bumping `@mui/material` from 7.3.6 to 9.0.1
- **THEN** the agent edits `apps/web/package.json` only
- **AND** does NOT add the dependency to the catalog

### Requirement: Manual smoke test gating on auth and UI bumps

Pull requests that touch authentication libraries (`jwks-rsa`, `@azure/msal-browser`, `@azure/msal-react`) or UI framework majors (`@mui/material`, `@mui/icons-material`, `@mui/x-*`) MUST include an explicit smoke-test checklist in the PR body, and the agent MUST NOT mark the PR ready to merge until a human has confirmed the checklist items.

#### Scenario: PR 2 medium-risk includes auth smoke test checklist

- **WHEN** the medium-risk PR is opened
- **THEN** its body includes checkboxes for: login flow, authenticated API call after `jwks-rsa` and `ky` bumps, file upload (multipart 10), HMR after `vite-plugin-react` 6, full test suite under testcontainers 12
- **AND** the agent does NOT request merge approval until those items are checked by a human

#### Scenario: PR 3 high-risk includes extensive UI smoke test checklist

- **WHEN** the high-risk PR is opened
- **THEN** its body includes checkboxes covering MSAL login + logout + token refresh, sidebar/layout, CRUD across organizations/inventories/projects, dashboard charts (`@mui/x-charts`), DataGrid filters/sort/pagination, date pickers, modals, snackbars, Excel export
- **AND** the agent does NOT request merge approval until those items are checked

### Requirement: Rollback strategy is per-commit and per-PR

The dependency upgrade workflow MUST keep both granularities of rollback available:

- **Per-library rollback**: any single library upgrade can be reverted with `git revert <commit-sha>` on its dedicated commit, without affecting other libraries' upgrades.
- **Per-PR rollback**: any merged PR can be reverted with `git revert <merge-commit-sha>` on `main`, leaving all earlier-merged PRs intact.

The agent MUST NOT squash-merge upgrade PRs, because squashing collapses the atomic commits and forfeits per-library revertibility.

#### Scenario: Single library regression after deploy

- **WHEN** PR 1 is merged and deployed, and `react-hook-form` 7.76 turns out to break a specific form in production
- **THEN** the maintainer can `git revert <react-hook-form-bump-commit>` on `main`
- **AND** only the `react-hook-form` change is reverted; the ~30 other library bumps in PR 1 remain in effect

#### Scenario: Squash-merge is rejected

- **WHEN** opening any upgrade PR
- **THEN** the agent MUST NOT request squash-merge
- **AND** the merge strategy MUST preserve individual commits (merge commit or rebase merge)

### Requirement: Pre-flight green baseline

Before starting work on any upgrade PR, the agent SHALL verify that the base branch (`main`) is currently green by running `pnpm install && pnpm type-check && pnpm lint && pnpm test && pnpm build` on a fresh checkout. If the baseline is not green, the upgrade workflow MUST halt and the agent MUST report the failing check to the user.

#### Scenario: Pre-flight passes

- **WHEN** the agent starts a new upgrade PR
- **THEN** it first checks out `main`, runs `pnpm install` and all quality gates
- **AND** only after all gates pass does it create the upgrade branch

#### Scenario: Pre-flight fails

- **WHEN** the agent runs pre-flight on `main` and any quality gate fails
- **THEN** it MUST NOT create the upgrade branch
- **AND** MUST NOT start bumping libraries
- **AND** MUST report the failing gate to the user and wait for resolution

### Requirement: Commit message format for dependency upgrades

Every per-library commit message SHALL follow this format: `chore(deps): bump <package-name> <from-version> to <to-version>`. The commit message MUST NOT include a `Co-Authored-By` trailer. Multiple libraries belonging to the same logical group (e.g., all `@mui/x-*` packages bumped together with codemods) MAY share a commit; in that case the message names the group: `chore(deps): bump mui-x packages 8 to 9 (charts, data-grid, date-pickers)`.

#### Scenario: Single library commit message

- **WHEN** the agent commits a bump of `prisma` from 7.0.1 to 7.8.0
- **THEN** the commit message is `chore(deps): bump prisma 7.0.1 to 7.8.0`
- **AND** the commit contains no `Co-Authored-By` trailer

#### Scenario: Grouped library commit message

- **WHEN** the agent commits a single bump that covers `@mui/x-charts`, `@mui/x-data-grid`, and `@mui/x-date-pickers` together because they share peer dependencies and codemod
- **THEN** the commit message names the group, e.g., `chore(deps): bump mui-x packages 8 to 9 (charts, data-grid, date-pickers)`

### Requirement: Re-verification of latest versions at execution time

Tabulated target versions in implementation tasks are treated as guidance, not as a binding contract. Before starting each PR, the agent SHALL re-check the latest available versions with `pnpm outdated --recursive` (or `npm view <package> version`) and use whatever `latest` is at execution time, subject to the constraint that **a brand-new major version not in scope of this change MUST NOT be adopted**.

#### Scenario: A latest patch is newer than tabulated

- **WHEN** the table lists `react 19.2.6` and `pnpm outdated` reveals `react 19.2.8` is available
- **THEN** the agent upgrades to 19.2.8 (the latest patch within the same major)

#### Scenario: A brand-new major appears mid-execution

- **WHEN** the table lists `@mui/material 9.0.1` as the target and at execution time `@mui/material 10.0.0` has been published
- **THEN** the agent does NOT adopt v10; the agent stays at the latest v9.x available
- **AND** if needed, opens a follow-up change to handle the new major separately

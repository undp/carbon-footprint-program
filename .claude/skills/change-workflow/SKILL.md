---
name: change-workflow
description: How to finish and ship a change in this repo. Use when committing, opening or describing a PR, responding to reviewers, keeping docs in sync, or planning a complex change.
---

# Change Workflow

> Branch prefixes, Conventional Commits, modular commits, and the pre-commit gate (`pnpm format && pnpm lint && pnpm type-check`) are always-on in CLAUDE.md. This skill covers what CLAUDE.md delegates: PR titles, reviewer interaction, docs upkeep, and complex-change planning.

## PR titles

Use the **Conventional Commits** format — `<type>(<scope>): <short description>` (e.g. `feat(organizations): add bulk accreditation endpoint`, `fix(carbonInventory): correct emission factor lookup`). The PR title becomes the squash commit message when merged, so it must be a valid Conventional Commit. Types: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `perf` / `ci` / `infra`. Use the imperative mood and keep the subject under 72 characters. See `docs/development/contributing.md` and `docs/release/versioning.md#commit-convention` for the full reference.

## PR labels

Apply the repo's **namespaced** labels when opening a PR — never bare/legacy ones — to drive triage and filtering alongside the Conventional-Commit title. The source of truth is `.github/labels.yml` (managed as code and synced to the repo; a label removed there is removed from the repo).

- `type:` — the kind of change: `bug` / `feature` / `refactor` / `tech-debt` / `performance` / `chore` / `security` / `docs` / `dpg`. This taxonomy is broader than the commit types, so pick the closest match and align it with the PR's "Type of change" checkbox.
- `area:` — the part of the monorepo touched (mirrors the commit scope): `web` / `api` / `database` / `packages` / `infra` / `ci` / `docs`. Add more than one for cross-cutting PRs.
- `priority:` — `critical` / `high` / `medium` / `low`. Always **ask the user** which priority level applies before opening the PR, and apply the matching label; never guess it.
- Leave `status:` labels (`triage` / `blocked` / `needs-repro` / `duplicate` / `wontfix`) to triage; only add one if it genuinely applies (e.g. `blocked`).
- Don't hand-apply the Dependabot-managed labels (`dependencies`, `github_actions`, `docker`, `javascript`) — those are auto-applied to dependency PRs.

Apply labels at creation time: `gh pr create ... --label "type: feature" --label "area: api"`. This mirrors the namespaced taxonomy the issue-form templates auto-apply, keeping triage and filtering consistent.

## Reviewer interaction

- For automated reviewers (CodeRabbit), use `@coderabbitai` commands as needed to control the review flow.
- For human reviewer comments: address each one, reply explaining the solution, and reference the fixing commit SHA. By default resolve each comment in its own dedicated commit; closely-related comments may be grouped.
- Skip a comment only with a brief justification (e.g., a nitpick that contradicts project conventions).
- Never use a bare `#N` for internal cross-references in PR bodies — it autolinks to an unrelated issue/PR.
- Implement grouped review comments (submitted as a single review) together to ensure consistency.

## Documentation

On every new feature or significant change, update the documentation in `docs/` (`docs/architecture/`, `docs/data-model/`, `docs/development/`, `docs/operations/`, etc.). Place documentation in the appropriate location.

## Complex changes

Prefer working from a plan document that outlines the implementation strategy before coding.

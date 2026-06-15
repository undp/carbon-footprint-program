---
name: change-workflow
description: How to finish and ship a change in this repo. Use when committing, opening or describing a PR, responding to reviewers, keeping docs in sync, or planning a complex change.
---

# Change Workflow

> Branch prefixes, Conventional Commits, modular commits, and the pre-commit gate (`pnpm format && pnpm lint && pnpm type-check`) are always-on in CLAUDE.md. This skill covers what CLAUDE.md delegates: PR titles, reviewer interaction, docs upkeep, and complex-change planning.

## PR titles

Use the `[AREA] Type: description` format (e.g. `[API] Feat: ...`, `[FRONT] Fix: ...`, `[Fullstack] Refactor: ...`), not the commit-style `type(scope):`.

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

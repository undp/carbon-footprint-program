---
name: change-workflow
description: How to finish and ship a change in this repo. Use when committing, opening or describing a PR, responding to reviewers (CodeRabbit / humans), keeping docs in sync, or planning a complex change. Covers branch naming, Conventional Commits, modular commits, the pre-commit gate, reviewer-comment etiquette, and documentation upkeep.
---

# Change Workflow

## Branches & commits

- **Branch naming**: use prefixes `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `infra/`, or `claude/` (for AI-authored work).
- **Conventional Commits** for all messages (e.g., `feat(api): add inventory export endpoint`, `fix(web): correct emission factor calculation`, `refactor: extract helper functions`). Include a scope when relevant.
- **Modular commits**: break work into small, focused commits that are easy to review. Each commit should be a single logical change (one per endpoint, one per component, one for types, etc.). Do NOT push all implementation in a single commit.
- **PR titles** use the `[AREA] Type: description` format (e.g. `[API] Feat: ...`, `[FRONT] Fix: ...`, `[Fullstack] Refactor: ...`), not the commit-style `type(scope):`.

## Before every commit

Run `pnpm format && pnpm lint && pnpm type-check`. `pnpm format` is mandatory — never commit unformatted code. `pnpm lint` enforces zero warnings (any warning fails CI).

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

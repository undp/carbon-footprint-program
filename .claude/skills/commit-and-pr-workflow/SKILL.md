---
name: Commit & PR Workflow
description: Commit and pull-request conventions for this repo — branch naming, Conventional Commits, modular commits, the mandatory pre-commit checks (format/lint/type-check), the CI pipeline, and how to respond to PR review comments from humans and automated reviewers like CodeRabbit. Use when committing changes, structuring commits, opening or updating a PR, or addressing reviewer feedback.
when_to_use: Use when about to commit, choosing a branch name or commit message, splitting work into commits, preparing or updating a PR, planning a complex change, or replying to/resolving review comments (human or CodeRabbit).
---

# Commit & PR Workflow

## Before every commit (mandatory)

Run, in order:

```
pnpm format && pnpm lint && pnpm type-check
```

- `pnpm format` formats files with Prettier — never commit unformatted code.
- `pnpm lint` enforces **zero warnings**; any warning is a CI failure.
- `pnpm type-check` checks for TypeScript compilation errors.

## Branch naming

Use one of these prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `infra/`, or `claude/` (for AI-authored work).

## Conventional Commits

Use the [Conventional Commits](https://www.conventionalcommits.org/) format for all messages, with a scope when relevant:

- `feat: add inventory export endpoint`
- `fix: correct emission factor calculation`
- `refactor: extract helper functions`
- `docs: update API documentation`
- `feat(api): ...`, `fix(web): ...`

## Modular commits

Break work into small, focused commits that are easy to review. Each commit should represent a single logical change (one endpoint, one component, one for types, etc.). **Do NOT push all implementation in a single commit.**

## CI pipeline

CI runs automatically on PRs to `main`: lint, type-check, format:check, test, and build — all in parallel. All checks must pass before merge. Lint enforces zero warnings — any warning fails CI.

## Responding to PR review comments

- **Default**: resolve each reviewer comment in its own dedicated commit. When multiple comments are closely related (e.g. the same refactor touches both), group them into a single commit.
- In all cases, reply to each comment individually, explaining the solution and referencing the fixing commit SHA.
- **Human reviewers**: address each comment, explain the solution in a reply, reference the fixing commit. If a comment isn't worth addressing (e.g. a stylistic nitpick that contradicts project conventions), explain why and skip it — use good judgment.
- **Automated reviewers (CodeRabbit, etc.)**: use `@coderabbitai` commands as needed to control the review flow.
- **Grouped review comments** (submitted as a single review): implement them together to ensure consistency.

## Complex changes

For complex changes, work from a plan document that outlines the implementation strategy before coding.

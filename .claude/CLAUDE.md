# Huella Latam

Country-agnostic digital public good for measuring, managing, and reducing carbon footprints in Latin America. One core codebase, deployed by each country on its own infrastructure.

**Country-agnosticism (non-negotiable):** handle all country-specific variation through seed data and system parameters — never code forks or country branches. Every contribution must be country-agnostic and backward-compatible.

## Session setup

- `pnpm install` — required before any format/lint/type-check.
- `.claude/setup.sh` — required before any `/opsx:` command.

## Before every commit

Run `pnpm format && pnpm lint && pnpm type-check` (mandatory; lint is zero-warning). Use Conventional Commits and a branch prefix: `feat/ fix/ refactor/ docs/ chore/ infra/ claude/`.

## Design patterns

Each design pattern is documented as a skill in `.claude/skills/` (API features, TypeScript conventions, integration testing, frontend, constants & utils placement, commit & PR workflow, documentation). Claude loads the relevant skill automatically — follow it when working in that area.

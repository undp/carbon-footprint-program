# Contributing to Huella Latam

Thank you for considering a contribution to Huella Latam. The project
is a Digital Public Good (DPG) developed by UNDP under Project 01000983
and released under the MIT License (see `LICENSE`). Anyone is welcome
to file issues and submit pull requests, subject to the rules below.

This file is the entry point for new contributors. The full technical
contributing guide — branch naming, commit conventions, mandatory
checks before commit, modular-commit policy, and PR-review
expectations — lives at `docs/development/contributing.md`. Please
read both before opening a pull request.

## Code of Conduct

By participating in this project you agree to abide by the
`CODE_OF_CONDUCT.md` (Contributor Covenant 2.1). Reports of unacceptable
behaviour may be sent privately to the maintainers — see
`CODE_OF_CONDUCT.md` for the contact address.

## Country-agnosticism principle

Huella Latam is designed for adoption by any country in Latin America
and the Caribbean (and beyond). All contributions **must** preserve
that property:

- Country variation goes through **configuration**, **seed data**, and
  **system parameters** — never through code forks or country-specific
  code branches.
- Pull requests that hard-code country-specific behaviour will be
  rejected on first review and the author will be invited to refactor
  the change into a configurable form.
- See `docs/overview/project-overview.md` and
  `docs/development/country-onboarding.md` for the country-onboarding
  pattern.

## Backward compatibility

Each country runs its own deployment of the platform. Breaking changes
to the data model, API contracts, or system parameters affect every
existing country. Pull requests must:

- Provide a non-destructive Prisma migration path for any schema
  change.
- Provide a deprecation window for breaking API changes.
- Document any new configuration knob required by adopters.

## Before opening a pull request

1. Read the full guide at `docs/development/contributing.md`.
2. Read `docs/development/local-setup.md` to set up the development
   environment locally.
3. Run the mandatory checks before every commit:

   ```sh
   pnpm format
   pnpm lint
   pnpm type-check
   pnpm test
   ```

4. Use the conventional-commit format documented in
   `docs/development/contributing.md`.
5. Use a branch name with one of the project prefixes:
   `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `infra/`, or
   `claude/` (for AI-authored work).
6. Break work into **small, focused commits**. Each commit should
   represent a single logical change. Bundling everything into one
   commit makes review harder and is grounds for a request to
   restructure the PR.

## Reporting bugs and security issues

- **General bugs** — open a GitHub issue using the `Bug report`
  template.
- **Feature requests** — open a GitHub issue using the `Feature
request` template.
- **Security vulnerabilities** — **do not** open a public issue. Use
  the private disclosure process described in `SECURITY.md`.
- **Privacy and data-protection concerns** — see `PRIVACY.md` for the
  contact and process.

## Adding documentation

Documentation lives under `docs/` and is organised by domain
(`architecture`, `data-model`, `development`, `infrastructure`,
`operations`, `overview`, `release`, `security`, `governance`). On any
feature change, contributors are expected to update the relevant
documentation in the same pull request.

## Licensing of contributions

By submitting a pull request you agree to license your contribution
under the same MIT License as the rest of the project (see `LICENSE`).
You retain the copyright on your contribution. If the contribution is
made as part of your employment, please make sure your employer agrees
with this licensing before opening the PR.

## Questions

For project-level questions that are not bug reports, please open a
GitHub Discussion or contact the maintainers — see `MAINTAINERS.md`.

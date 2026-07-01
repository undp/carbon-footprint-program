# Contributing to Huella Latam

Thank you for your interest in contributing! Huella Latam is a digital public good
maintained by the United Nations Development Programme (UNDP). Contributions of all
kinds — bug reports, documentation, and code — are welcome.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Licensing of contributions

This project is licensed under the **GNU Affero General Public License v3.0**
([`LICENSE`](./LICENSE)). By submitting a contribution, you agree that your work is
licensed under the same AGPL-3.0 terms. Do not submit code you are not authorized to
license this way.

## Reporting bugs & requesting features

- Search existing issues first to avoid duplicates.
- For bugs, include reproduction steps, expected vs. actual behavior, and environment
  details.
- **Do not** file security vulnerabilities as public issues — follow
  [`SECURITY.md`](./SECURITY.md) instead.

## Development setup

See the [README](./README.md#-getting-started) for prerequisites and local setup, and
the detailed [Contributing Guide](./docs/development/contributing.md) for the technical
workflow (branch naming, PR template, local database, testing).

Quick reference:

```bash
pnpm install
pnpm dev            # start API + web
pnpm test           # run tests
pnpm lint && pnpm type-check && pnpm format:check
```

## Pull request process

1. Create a feature branch using the project's prefixes: `feat/`, `fix/`, `refactor/`,
   `docs/`, `chore/`, or `infra/`.
2. Make small, modular commits following [Conventional Commits](https://www.conventionalcommits.org/).
3. Run `pnpm format && pnpm lint && pnpm type-check` and the test suite before pushing.
4. Open a pull request against `main`. CI (lint, type-check, format, test, build) must pass.
5. Address review feedback. A maintainer will merge once approved.

## Contribution acceptance criteria

Per [`docs/governance.md`](./docs/governance.md), pull requests are evaluated for:

- **Country-agnosticism** — no hard-coded country-specific logic (use seed data / parameters).
- **Backward compatibility** — no breaking changes to existing country deployments without a
  migration path.
- **Test coverage** — new features include integration tests.
- **Documentation** — user-visible or schema changes update the relevant docs.
- **Security review** — changes to auth, authorization, file upload, or DB queries require an
  explicit maintainer security review.

## Governance

Ownership, decision-making, and maintainer roles are documented in
[`GOVERNANCE.md`](./GOVERNANCE.md).

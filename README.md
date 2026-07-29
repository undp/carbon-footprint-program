# Huella Latam

[![CI](https://github.com/undp/carbon-footprint-program/actions/workflows/ci.yml/badge.svg)](https://github.com/undp/carbon-footprint-program/actions/workflows/ci.yml) [![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/undp/carbon-footprint-program/badge)](https://securityscorecards.dev/viewer/?uri=github.com/undp/carbon-footprint-program) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

A platform — a **digital public good for Latin America** — for measuring, managing, and reducing carbon footprints.

Monorepo (pnpm + Turborepo): a Fastify + Prisma API (`apps/api`), a React + Vite + MUI web app (`apps/web`), shared libraries (`packages/*`), and Azure Bicep infrastructure (`infra/`).

## Documentation

Full documentation lives in **[`docs/`](./docs/README.md)** — start with the index. Key entry points:

| Topic                           | Where                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Getting started (local dev)** | [`docs/development/local-setup.md`](./docs/development/local-setup.md) — canonical                                             |
| Documentation index             | [`docs/README.md`](./docs/README.md)                                                                                           |
| Project overview                | [`docs/overview/project-overview.md`](./docs/overview/project-overview.md)                                                     |
| System architecture             | [`docs/architecture/system-architecture.md`](./docs/architecture/system-architecture.md)                                       |
| Tech stack                      | [`docs/architecture/tech-stack.md`](./docs/architecture/tech-stack.md)                                                         |
| Data model                      | [`docs/data-model/developer-guide.md`](./docs/data-model/developer-guide.md)                                                   |
| Environment variables           | [`docs/development/environment-variables.md`](./docs/development/environment-variables.md)                                     |
| API conventions                 | [`docs/development/api-conventions.md`](./docs/development/api-conventions.md)                                                 |
| Testing                         | [`docs/development/testing.md`](./docs/development/testing.md)                                                                 |
| Contributing                    | [`docs/development/contributing.md`](./docs/development/contributing.md)                                                       |
| Deployment (Azure)              | [`docs/infrastructure/Deployment.md`](./docs/infrastructure/Deployment.md)                                                     |
| App / package READMEs           | [`apps/api`](./apps/api/README.md) · [`apps/web`](./apps/web/README.md) · [`packages/database`](./packages/database/README.md) |

## Quick start

Prerequisites: **Node.js**, **pnpm**, and **Docker** — exact versions are pinned in [`.tool-versions`](./.tool-versions) and [`.nvmrc`](./.nvmrc) (usable with asdf, mise, or nvm).

```bash
pnpm install
cp .envrc.template .envrc     # fill in, then: direnv allow   (or: source .envrc)

# Start supporting services (Postgres + Keycloak IdP + MinIO object storage)
cd packages/database && docker compose up -d && cd ../..
docker compose -f docker-compose.yml -f compose/keycloak-db.yaml -f compose/keycloak.dev.yaml --env-file .env.dockercompose up -d keycloak keycloak-db keycloak-init
docker compose -f docker-compose.minio.yml up -d

pnpm db:restore               # reset + migrate + seed
pnpm dev                      # API :8080 · Web :5173 · Swagger :8080/api/docs
```

**[`docs/development/local-setup.md`](./docs/development/local-setup.md) is the canonical, step-by-step guide** — follow it for auth options (Keycloak / Azure Entra / `forced-user`), the full environment-variable reference, and troubleshooting.

## Contributing

See [`docs/development/contributing.md`](./docs/development/contributing.md). In brief: Conventional Commits, small and modular commits, and `pnpm format && pnpm lint && pnpm type-check` must pass before every commit.

## 🌍 Relevance to the Sustainable Development Goals

Huella Latam is a digital public good that helps organizations and Latin American countries
measure, report, and reduce greenhouse-gas emissions. It advances the following UN
Sustainable Development Goals:

| SDG                                               | How Huella Latam contributes (specific targets)                                                                                                                                                                                                                                   | Evidence                                                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SDG 13 — Climate Action**                       | Provides the measurement, inventory, and reduction-planning infrastructure countries need to **integrate climate-change measures into national policies and planning (Target 13.2)** and to **improve institutional capacity for mitigation and impact reduction (Target 13.3)**. | Carbon inventory, emissions summaries, and reduction-plan features (`apps/api` carbon-inventory domain; `docs/architecture/emission-calculation.md`) |
| **SDG 12 — Responsible Consumption & Production** | Enables organizations to **adopt sustainable practices and integrate sustainability information into their reporting (Target 12.6)** through standardized carbon footprints and verifiable submissions.                                                                           | Organization inventories, verification/submission flow, methodology export (`docs/development/data-export.md`)                                       |
| **SDG 9 — Industry, Innovation & Infrastructure** | Supports **sustainable, resource-efficient upgrading of industries (Target 9.4)** by giving sectors comparable emissions data and sector rankings to prioritize reductions.                                                                                                       | Sector ranking and equivalence features (carbon-inventory summaries)                                                                                 |

## 🔓 Platform Independence

Huella Latam is built primarily on open-source components and open standards, and can be run
without proprietary software. The default deployment targets Microsoft Azure, but the
application layer is cloud-portable.

| Dependency                                | Open / closed        | Notes & open alternative                                                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js, TypeScript, Fastify, React, Vite | Open                 | Core runtime/frameworks; no lock-in                                                                                                                                                                                                                                |
| PostgreSQL (via Prisma ORM)               | Open                 | Runs on any PostgreSQL; Azure Database for PostgreSQL is one option, not a requirement                                                                                                                                                                             |
| Object storage                            | Open/closed          | Provider-agnostic storage adapter supports **Azure Blob Storage** _and_ **MinIO** (S3-compatible, open source) — see `packages/storage`                                                                                                                            |
| Authentication (OIDC)                     | Open standard        | Uses OpenID Connect; default provider is Microsoft Entra ID, but any OIDC provider (e.g. Keycloak — an open-source option already used in local `compose/`) can be configured — see `docs/security/authentication.md`                                              |
| Secrets management                        | Closed (swappable)   | Azure Key Vault by default; any secrets manager or environment injection can be substituted — see `docs/security/secrets.md`                                                                                                                                       |
| Infrastructure as Code                    | Closed (Azure Bicep) | Bicep templates provision the Azure reference deployment; containers (`Dockerfile`, `docker-compose*.yml`) allow deployment to any container platform. **TODO:** provide a cloud-neutral IaC example (e.g. Terraform/Kubernetes manifests) for non-Azure adopters. |

All mandatory application dependencies are open source. The closed dependencies above are
**operational conveniences of the reference deployment**, each with a documented open
alternative, so no adopter is locked into a single vendor.

## ✅ Standards & Best Practices

Huella Latam aims to follow the [Principles for Digital Development](https://digitalprinciples.org/)
and recognized software best practices:

- **Open standards:** OpenID Connect for auth, OpenAPI/Swagger for the API
  (`http://localhost:8080/api/docs`), and data export in XLSX (Office Open XML) format (see
  [`docs/development/data-export.md`](./docs/development/data-export.md)).
- **Reuse & open source:** built on open-source components; provider-agnostic storage;
  AGPL-3.0 licensed for the public good.
- **Privacy & security by design:** RBAC, OIDC, secrets in a vault, encryption at rest/in
  transit, and audit logging — see [`docs/security/`](./docs/security/) and
  [`PRIVACY.md`](./PRIVACY.md).
- **Supply-chain hygiene (OpenSSF):** CI runs lint, type-check, format, tests, and build on
  every PR; GitHub Actions are **pinned to commit SHAs**; workflow tokens use **least
  privilege**; dependencies are kept current via [Dependabot](./.github/dependabot.yml)
  (version updates + security alerts).
- **Static analysis (SAST):** a [CodeQL workflow](./.github/workflows/codeql.yml) scans the
  code on every push, PR, and weekly. Results upload to GitHub code scanning.
- **Responsible disclosure:** see [`SECURITY.md`](./SECURITY.md).

**Standards in progress:** code scanning (CodeQL), secret scanning, and push protection are all
active, and the OpenSSF Scorecard workflow publishes results (badge above). The OpenSSF Best
Practices Badge is not yet registered. See [`SECURITY.md`](./SECURITY.md).

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** — see the [`LICENSE`](./LICENSE) file for the full text ([SPDX: `AGPL-3.0-only`](https://spdx.org/licenses/AGPL-3.0-only.html)).

AGPL-3.0 is a strong (network) copyleft license: if you run a modified version of this software to provide a service over a network, you must make the corresponding source code of your modified version available to its users under the same license.

## 🏛 Ownership

Copyright © 2026 United Nations Development Programme (UNDP).

Huella Latam is owned and maintained by the **United Nations Development Programme (UNDP)** as a digital public good. Contributions are accepted under the project's AGPL-3.0 license; see [`GOVERNANCE.md`](./GOVERNANCE.md) for the governance and contribution model and [`docs/governance.md`](./docs/governance.md) for licensing and country-level deployment details.

## 👥 Team

UNDP Huella Latam Team

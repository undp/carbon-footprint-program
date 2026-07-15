# Huella Latam – Documentation Index

Welcome to the project documentation. Use this index to navigate all available docs.

---

## Overview

| Document                                                                       | Description                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [Project Overview](./overview/project-overview.md)                             | Goal, use cases, scope, and key assumptions                                                            |
| [Submission Workflow](./overview/submission-workflow.md)                       | End-to-end flow: inventory creation → submission → admin review → external validation → badge issuance |
| [Reduction Projects Workflow](./overview/reduction-projects.md)                | Creation, verification, and re-submission of GHG reduction projects                                    |
| [Transparency Portal](./overview/transparency.md)                              | Public endpoint: what is exposed, what is redacted, inclusion criteria                                 |
| [User and Organization Membership](./overview/user-organization-membership.md) | User creation, joining organizations, organization roles and permissions, membership audit trail       |
| [Neutralization Plan](./overview/neutralization-plan.md)                       | Planned feature: what is already scaffolded (enums, badges, type system) and what remains to be built  |

## Architecture

| Document                                                                           | Description                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Codebase Map](./architecture/codebase-map.md)                                     | One-screen orientation: monorepo layout, where things live, request flow (start here)                              |
| [System Architecture](./architecture/system-architecture.md)                       | Components, services, data flow, and integrations                                                                  |
| [Tech Stack](./architecture/tech-stack.md)                                         | Validated technology decisions with rationale                                                                      |
| [Emission Calculation Logic](./architecture/emission-calculation.md)               | Core formulas, data model, input types, aggregation, and end-to-end example                                        |
| [Methodology and Emission Factor Taxonomy](./architecture/methodology-taxonomy.md) | MethodologyVersion → Category → Subcategory → Dimension → EmissionFactor hierarchy, seed format, and API endpoints |

## Data Model

| Document                                                               | Description                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Conceptual Guide](./data-model/conceptual-guide.md)                   | Domain concepts and modeling principles                                  |
| [Developer Guide](./data-model/developer-guide.md)                     | Database developer reference                                             |
| [ER Diagram](./data-model/er-diagram.svg)                              | Entity-relationship diagram                                              |
| [Organization Model](./data-model/organization.md)                     | Organization entity deep-dive                                            |
| [Organization Summary View](./data-model/organization-summary-view.md) | Organization summary view reference                                      |
| [Submission Summary View](./data-model/submission-summary-view.md)     | Submission summary view reference — fields, SQL, and admin queue queries |

## Infrastructure

| Document                                                                        | Description                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Infrastructure Requirements](./infrastructure/requirements.md)                 | Consolidated Azure services, SKUs, capacity sizing per environment                 |
| [App Usage Assumptions](./infrastructure/app-usage-assumptions.md)              | Expected load, reliability targets, AI/background workloads (Staging & Production) |
| [Infrastructure Provisioning Model](./infrastructure/provisioning-model.md)     | IaC standard, CI/CD approach, IT team prerequisites                                |
| [Deployment Guide](./infrastructure/Deployment.md)                              | Azure Bicep infrastructure deployment                                              |
| [API Deployment](./infrastructure/ApiDeployment.md)                             | Deploying the API via Docker + ACR + App Service                                   |
| [Frontend Deployment](./infrastructure/StaticWebAppDeployment.md)               | Deploying the frontend via Azure Static Web Apps                                   |
| [File Storage](./infrastructure/FileStorage.md)                                 | Azure Blob Storage setup and SAS upload flow                                       |
| [Database Migrations](./infrastructure/Migrations.md)                           | Running Prisma migrations against Azure PostgreSQL                                 |
| [OIDC authentication setup](./infrastructure/GenericOidcAuthenticationSetup.md) | Auth contract + JWKS/OIDC config; links to Azure Entra and Keycloak setup guides   |

## Development

| Document                                                          | Description                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Local Setup](./development/local-setup.md)                       | Step-by-step local development setup                                                                               |
| [Worktree Isolation](./development/worktree-isolation.md)         | Running several git worktrees at once: opt-in per-worktree API port + database, ADE hooks, and common pitfalls     |
| [Environment Variables](./development/environment-variables.md)   | Complete reference for all environment variables                                                                   |
| [Contributing Guide](./development/contributing.md)               | Branch workflow, code review, adding a new API feature                                                             |
| [Frontend Architecture](./development/frontend-architecture.md)   | React + Vite structure, TanStack Router, state management, forms, theme, adding a new screen                       |
| [API Design Conventions](./development/api-conventions.md)        | Feature folder pattern, route/handler/service layering, plugin architecture, error handling, adding a new endpoint |
| [Data Export and Reporting](./development/data-export.md)         | Excel exports (inventory, reduction project, reduction plan), file downloads, and what is not yet supported        |
| [Testing Guide](./development/testing.md)                         | Vitest + Testcontainers setup, test structure, writing integration tests                                           |
| [Packages and Monorepo Internals](./development/packages.md)      | Shared packages, dependency graph, Turborepo pipeline, schema change propagation                                   |
| [System Parameters Reference](./development/system-parameters.md) | Database-backed configuration parameters and their effects on platform behavior                                    |
| [User Activity Tracking](./development/user-activity-tracking.md) | Session-level access logging, active/inactive classification, and admin UI integration                             |
| [Country Onboarding Guide](./development/country-onboarding.md)   | How to deploy the platform in a new country: seed data, methodology, OIDC IdP, and infrastructure                  |
| [Internationalization Plan](./development/i18n-plan.md)           | Forward-looking plan for adding i18n (not yet implemented)                                                         |
| [CI/CD Pipeline](./development/ci-cd.md)                          | GitHub Actions workflow: triggers, jobs, debugging failures, and adding new steps                                  |
| [Troubleshooting and FAQ](./development/troubleshooting.md)       | Common problems and fixes: local dev, testing, authentication, deployments, and application behaviour              |
| [Docker Compose](./operations/docker-compose.md)                  | Local & full-stack Docker Compose guide (services, env, auth + storage setup, troubleshooting)                     |

## Security

| Document                                                       | Description                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Authentication](./security/authentication.md)                 | Authentication providers, token validation, provider selection        |
| [Frontend Auth Recovery](./security/frontend-auth-recovery.md) | Recovery flow when OIDC login succeeds but `GET /users/me` fails      |
| [RBAC and Authorization](./security/rbac.md)                   | Role model, authorization plugins, permission matrix                  |
| [Sensitive Data Handling](./security/sensitive-data.md)        | PII inventory, encryption at rest/transit, compliance considerations  |
| [Secrets Management](./security/secrets.md)                    | Managed identities, Key Vault, env var classification, anti-patterns  |
| [Infrastructure Hardening](./security/hardening.md)            | TLS, CORS, security headers, network isolation, WAF, input validation |
| [Audit and Logging](./security/audit-logging.md)               | Log structure, redaction, security events, database audit trail       |

## Operations

| Document                                                             | Description                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Observability](./operations/observability.md)                       | Logs, metrics, alerts, and monitoring recommendations                                          |
| [Operations Runbook](./operations/runbook.md)                        | Backup, restore, rollback, and incident management                                             |
| [Risks and Limitations](./operations/risks-and-limitations.md)       | Known technical risks, single points of failure, critical dependencies, and system limitations |
| [Admin Operations Guide](./operations/admin-guide.md)                | Reviewing the submission queue, approving/reviewing/rejecting requests, managing organizations |
| [Performance and Scaling Playbook](./operations/scaling-playbook.md) | Redis-backed rate limiting, PgBouncer, PostgreSQL HA, App Service scale-out decision criteria  |

## Integrations

| Document                                   | Description                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| [Integrations and APIs](./integrations.md) | REST API overview, OpenAPI spec, external dependencies, and third-party SLAs |

## Release

| Document                                         | Description                                               |
| ------------------------------------------------ | --------------------------------------------------------- |
| [Versioning & Releases](./release/versioning.md) | Versioning strategy, branching model, and release process |

## Reference

| Document                                    | Description                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Glossary](./glossary.md)                   | Domain terminology reference (carbon accounting, platform workflow, technical terms)      |
| [Governance and Licensing](./governance.md) | Digital public good status, license, contribution model, and recommended root-level files |

## Other

| Document                                                    | Description                                     |
| ----------------------------------------------------------- | ----------------------------------------------- |
| [Refactoring Opportunities](./REFACTORING_OPPORTUNITIES.md) | Known technical debt and improvement areas      |
| [Infra Cost Estimation](./infra%20cost%20estimation.pdf)    | Azure cost estimates for staging and production |
| [Tech Stack (original)](./tech%20stack.pdf)                 | Original tech stack proposal document           |

## Annexes

Original source documents used as input for the written documentation above.

| Document                                                                                                                                        | Description                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Infrastructure Provisioning & Deployment Model](./infrastructure/annexes/Infrastructure%20Provisioning%20%26%20Deployment%20Model.pdf)         | Original infrastructure provisioning and deployment model document |
| [Production — App Usage Assumptions & Estimations](./infrastructure/annexes/Production-App%20Usage%20Assumptions%20%26%20Estimations.pdf)       | Original production app usage assumptions and estimations          |
| [Production — Consolidated Azure Services Requirements](./infrastructure/annexes/Production-Consolidated%20Azure%20Services%20Requirements.pdf) | Original production Azure services requirements                    |
| [Staging — App Usage Assumptions & Estimations](./infrastructure/annexes/Staging-App%20Usage%20Assumptions%20%26%20Estimations.pdf)             | Original staging app usage assumptions and estimations             |
| [Staging — Consolidated Azure Services Requirements](./infrastructure/annexes/Staging-Consolidated%20Azure%20Services%20Requirements.pdf)       | Original staging Azure services requirements                       |

---

> All legacy `DataModel/` and `Infra/` folder references have been migrated to `data-model/` and `infrastructure/` respectively.

# Development

Everything a developer needs to work on the Huella Latam codebase: environment setup, code conventions, testing, cross-cutting concerns, and how to extend the platform.

---

## Getting started

| Document                                            | Description                                           |
| --------------------------------------------------- | ----------------------------------------------------- |
| [Local Setup](./local-setup.md)                     | Step-by-step local development environment setup      |
| [Environment Variables](./environment-variables.md) | Complete reference for all environment variables      |
| [Docker Compose](../DockerCompose.md)               | Local Docker Compose configuration for the database   |
| [Contributing Guide](./contributing.md)             | Branch workflow, code review process, and conventions |

## Codebase guides

| Document                                            | Description                                                                                                                                                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Frontend Architecture](./frontend-architecture.md) | React + Vite structure, TanStack Router, Zustand, TanStack Query, ky, react-hook-form, MUI + Tailwind, and how to add a new screen                                                                                                       |
| [API Design Conventions](./api-conventions.md)      | Feature folder pattern, route/handler/service layering, plugin architecture, authorization, error handling, and how to add a new endpoint                                                                                                |
| [Packages and Monorepo Internals](./packages.md)    | Shared packages (`@repo/types`, `@repo/database`, `@repo/utils`), dependency graph, Turborepo pipeline, and schema-change propagation                                                                                                    |
| [Data Export and Reporting](./data-export.md)       | Excel exports (inventory, reduction project, reduction plan), file downloads via SAS URL, and what is not yet supported                                                                                                                  |
| [Profiling Maintainers](./maintainers/profiling.md) | Admin maintainers for `country_sector` / `country_subsector` / `organization_main_activity` / `country_organization_size`: soft-delete lifecycle, blocking matrix, partial unique indexes, in-use warning dialog, selector union helper. |

## Configuration and operations

| Document                                              | Description                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [System Parameters Reference](./system-parameters.md) | Database-backed configuration parameters and their effects on platform behaviour                  |
| [Country Onboarding Guide](./country-onboarding.md)   | How to deploy the platform in a new country: seed data, methodology, Entra ID, and infrastructure |
| [Internationalization Plan](./i18n-plan.md)           | Forward-looking plan for adding i18n (not yet implemented)                                        |

## Quality and CI

| Document                                        | Description                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [Testing Guide](./testing.md)                   | Vitest + Testcontainers setup, globalSetup lifecycle, factory utilities, and writing integration tests                        |
| [CI/CD Pipeline](./ci-cd.md)                    | GitHub Actions workflow: triggers, jobs (lint / type-check / format / test / build), debugging failures, and adding new steps |
| [Troubleshooting and FAQ](./troubleshooting.md) | Common problems and fixes: local dev, testing, authentication, deployments, and application behaviour                         |

# Huella Latam – Documentation Index

Welcome to the project documentation. Use this index to navigate all available docs.

---

## Overview

| Document | Description |
|---|---|
| [Project Overview](./overview/project-overview.md) | Goal, use cases, scope, and key assumptions |

## Architecture

| Document | Description |
|---|---|
| [System Architecture](./architecture/system-architecture.md) | Components, services, data flow, and integrations |
| [Tech Stack](./architecture/tech-stack.md) | Validated technology decisions with rationale |

## Data Model

| Document | Description |
|---|---|
| [Conceptual Guide](./DataModel/Conceptual%20Guide.md) | Domain concepts and modeling principles |
| [Developer Guide](./DataModel/Developer%20Guide.md) | Database developer reference |
| [ER Diagram](./DataModel/ER%20Diagram.svg) | Entity-relationship diagram |
| [Organization Model](./DataModel/Organization.md) | Organization entity deep-dive |
| [Organization Summary View](./DataModel/OrganizationSummaryView.md) | Organization summary view reference |

## Infrastructure

| Document | Description |
|---|---|
| [Infrastructure Requirements](./infrastructure/requirements.md) | CPU, RAM, storage, OS sizing guide |
| [Deployment Guide](./Infra/Deployment.md) | Azure Bicep infrastructure deployment |
| [API Deployment](./Infra/ApiDeployment.md) | Deploying the API via Docker + ACR + App Service |
| [Frontend Deployment](./Infra/StaticWebAppDeployment.md) | Deploying the frontend via Azure Static Web Apps |
| [File Storage](./Infra/FileStorage.md) | Azure Blob Storage setup and SAS upload flow |
| [Database Migrations](./Infra/Migrations.md) | Running Prisma migrations against Azure PostgreSQL |

## Development

| Document | Description |
|---|---|
| [Local Setup](./development/local-setup.md) | Step-by-step local development setup |
| [Environment Variables](./development/environment-variables.md) | Complete reference for all environment variables |
| [Docker Compose](./DockerCompose.md) | Local Docker Compose configuration |
| [MSAL / Easy Auth Setup](./MSAL-EasyAuth-Setup.md) | Azure authentication configuration |

## Operations

| Document | Description |
|---|---|
| [Observability](./operations/observability.md) | Logs, metrics, alerts, and monitoring recommendations |
| [Operations Runbook](./operations/runbook.md) | Backup, restore, rollback, and incident management |

## Release

| Document | Description |
|---|---|
| [Versioning & Releases](./release/versioning.md) | Versioning strategy, branching model, and release process |

## Other

| Document | Description |
|---|---|
| [Refactoring Opportunities](./REFACTORING_OPPORTUNITIES.md) | Known technical debt and improvement areas |
| [Infra Cost Estimation](./infra%20cost%20estimation.pdf) | Azure cost estimates for staging and production |
| [Tech Stack (original)](./tech%20stack.pdf) | Original tech stack proposal document |

---

> **Note on folder organization:** The docs currently contain a mix of new organized folders (`overview/`, `architecture/`, `infrastructure/`, `development/`, `operations/`, `release/`) and legacy folders (`DataModel/`, `Infra/`) kept in place to preserve existing links. Future maintenance should consider consolidating into the new structure.

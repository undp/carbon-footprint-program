# Infrastructure

Azure infrastructure for the Huella Latam platform: service requirements, provisioning, deployment scripts, and configuration guides. Every country deployment runs its own isolated Azure environment from this shared set of scripts and templates.

---

## Planning and sizing

| Document                                                     | Description                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [Infrastructure Requirements](./requirements.md)             | Consolidated Azure services, SKUs, and capacity sizing per environment (Development / Staging / Production) |
| [App Usage Assumptions](./app-usage-assumptions.md)          | Expected load, reliability targets, and AI/background workload estimates for Staging and Production         |
| [Infrastructure Provisioning Model](./provisioning-model.md) | IaC standard (Azure Bicep), CI/CD approach, and IT team prerequisites                                       |

## Deployment guides

| Document                                           | Description                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Deployment Guide](./Deployment.md)                | Full Azure infrastructure deployment via Bicep (`deploy.sh`)                    |
| [API Deployment](./ApiDeployment.md)               | Building and deploying the API via Docker, ACR, and App Service                 |
| [Frontend Deployment](./StaticWebAppDeployment.md) | Deploying the frontend via Azure Static Web Apps                                |
| [File Storage](./FileStorage.md)                   | Azure Blob Storage setup, container configuration, and SAS upload/download flow |
| [Database Migrations](./Migrations.md)             | Running Prisma migrations against Azure PostgreSQL Flexible Server              |

## Authentication

The app uses a generic OIDC client (`oidc-client-ts`) + JWKS token validation (`AUTH_PROVIDER=jwks`); any compliant OIDC provider works. Start with the contract, then the specific IdP guide.

| Document                                                                 | Description                                                                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Generic OIDC Authentication Setup](./GenericOidcAuthenticationSetup.md) | Provider-agnostic contract: token claims, JWKS/OIDC env vars, IdP checklist                                                                                           |
| [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md)        | Azure Entra app registration (external CIAM / organizational) + JWKS                                                                                                  |
| [Keycloak Setup](./KeycloakSetup.md)                                     | Keycloak IdP for local dev **and** production — bring-up (dev + prod), hardened realm, admin-console hardening, and how to derive each `JWKS_*` / `VITE_OIDC_*` value |
| [Auth Config Migration](./AuthConfigMigration.md)                        | Upgrade runbook: migrate existing `.envrc` / Azure deployments to `JWKS_*`                                                                                            |

## Source documents

Original PDF documents used as input for the written guides above.

| Document                                                                                                                         | Description                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [Infrastructure Provisioning & Deployment Model](./annexes/Infrastructure%20Provisioning%20%26%20Deployment%20Model.pdf)         | Original provisioning and deployment model      |
| [Production — App Usage Assumptions & Estimations](./annexes/Production-App%20Usage%20Assumptions%20%26%20Estimations.pdf)       | Original production usage assumptions           |
| [Production — Consolidated Azure Services Requirements](./annexes/Production-Consolidated%20Azure%20Services%20Requirements.pdf) | Original production Azure services requirements |
| [Staging — App Usage Assumptions & Estimations](./annexes/Staging-App%20Usage%20Assumptions%20%26%20Estimations.pdf)             | Original staging usage assumptions              |
| [Staging — Consolidated Azure Services Requirements](./annexes/Staging-Consolidated%20Azure%20Services%20Requirements.pdf)       | Original staging Azure services requirements    |

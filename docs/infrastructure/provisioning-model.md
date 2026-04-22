# Infrastructure Provisioning & Deployment Model

This document describes how cloud resources for the Huella Latam platform are created, managed, and deployed. The model emphasizes an **Infrastructure as Code (IaC)** approach using **Azure Bicep** and automated **CI/CD pipelines**, to ensure consistency, security, auditability, and repeatability across environments.

For the actual Bicep modules and deployment scripts, see [`infra/`](../../infra/) and [Deployment Guide](./Deployment.md).
For the expected load and service requirements, see [App Usage Assumptions](./app-usage-assumptions.md) and [Azure Services Requirements](./requirements.md).

---

## Architecture Overview

The platform is composed of the following zones (each Azure service is provisioned as part of a single resource group per environment):

```
                        ┌──────────────────┐
                        │   Entra ID /     │
User ──── Azure DNS ────│  External ID     │
                        │  (Authentication)│
                        └────────┬─────────┘
                                 │ Token issuance
                                 ▼
                        ┌──────────────────┐
                        │   Static Web     │
                        │   App (Frontend) │
                        └────────┬─────────┘
                                 │ API calls
                                 ▼
        ┌────────────────────────┴────────────────────────┐
        │                Core Logic Zone                   │
        │  ┌─────────────┐              ┌──────────────┐  │
        │  │ App Service │◄────────────►│   Functions  │  │
        │  │  (REST API) │              │ (background) │  │
        │  └──────┬──────┘              └──────┬───────┘  │
        └─────────┼────────────────────────────┼──────────┘
                  │                            │
           ┌──────┴──────┐              ┌──────┴────────┐
           │  Storage    │              │   AI Zone     │
           │  ┌────────┐ │              │ ┌───────────┐ │
           │  │Postgres│ │              │ │  OpenAI   │ │
           │  └────────┘ │              │ ├───────────┤ │
           │  ┌────────┐ │              │ │ AI Search │ │
           │  │ Blobs  │ │              │ ├───────────┤ │
           │  └────────┘ │              │ │ Functions │ │
           └─────────────┘              │ │(orchestr.)│ │
                                        │ └───────────┘ │
                                        └───────────────┘
                                 │
                                 ▼
        ┌──────────────────────────────────────────────┐
        │            Security / Shared                  │
        │  ┌────────────┐      ┌───────────────────┐   │
        │  │ Key Vault  │      │ Communication     │   │
        │  │            │      │ Services (Email)  │   │
        │  └────────────┘      └───────────────────┘   │
        └──────────────────────────────────────────────┘
                                 │
                                 ▼
        ┌──────────────────────────────────────────────┐
        │            Observability Zone                 │
        │  Azure Monitor + Log Analytics + App Insights │
        │                     + Alerts                  │
        └──────────────────────────────────────────────┘
```

All resources within an environment live in a **single Azure Resource Group**, managed exclusively by Bicep.

---

## Infrastructure Provisioning — Mandatory Approach

**All infrastructure must be provisioned using Infrastructure as Code (Bicep).**

### Manual resource creation is explicitly out of scope

- Resources **must not** be created manually in the Azure Portal.
- Resources **must not** be pre-created and handed over.
- Any manually created infrastructure is considered **non-compliant**.

### Why manual provisioning is prohibited

Manual creation would:

- Break environment consistency
- Introduce configuration drift
- Make environments non-reproducible
- Increase operational and security risk
- Prevent reliable promotion from Staging to Production

### IaC standard

| Aspect              | Standard                                    |
| ------------------- | ------------------------------------------- |
| **Tooling**         | Azure Bicep                                 |
| **Execution**       | Automated CI/CD pipelines (GitHub Actions)  |
| **Source of truth** | Git repository (`infra/` folder)            |
| **Environments**    | Reproducible, auditable, version-controlled |

All infrastructure changes flow through:

1. **Code** — edited in Bicep files under `infra/`
2. **Pull requests** — reviewed and approved before merge
3. **Controlled deployments** — applied via CI/CD pipelines

### What IaC enables

- Provision **identical, reproducible** environments
- **Version-control** all infrastructure changes
- Enforce **security, naming, tagging, and configuration** standards
- **Audit** infrastructure changes over time
- **Recreate** environments safely if needed
- Reduce human error and misconfiguration
- Align with Azure and industry best practices

> In short: the assumption and requirements documents describe **what** is needed; Bicep defines **how** it is created.

---

## CI/CD Pipelines

| Component                     | Tool                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Source control**            | GitHub                                                                                                           |
| **CI/CD orchestration**       | GitHub Actions                                                                                                   |
| **Infrastructure deployment** | Bicep via `az deployment`                                                                                        |
| **Application deployment**    | Docker image push → Azure Container Registry → App Service (API); static asset build → Static Web App (frontend) |

Pipelines are responsible for:

- Creating and updating Staging environments
- Applying infrastructure changes to Production (with manual approval gates)
- Running application deployments (API, web, migrations) in the correct order
- Repeatable and idempotent deployments

---

## Prerequisites Required From the IT Team

The following prerequisites must be fulfilled by the IT team **before** infrastructure deployment can begin. Until these are in place, CI/CD pipelines and Bicep deployments cannot be executed.

### 1. Azure Subscription

- [ ] Existing Azure subscription available
- [ ] Permission to deploy resources programmatically
- [ ] Subscription policies (if any) documented and shared in advance

### 2. Access via Entra ID + PIM

- [ ] Access granted through Microsoft Entra ID
- [ ] **Privileged Identity Management (PIM)** preferred for just-in-time elevation
- [ ] Required roles (scope: subscription or resource group):
  - **Contributor** (minimum)
  - **User Access Administrator** (if required by subscription policy)

### 3. Resource Group Management

One of the following is required:

- Permission to **create resource groups via IaC**, _or_
- Ownership of **empty, pre-created resource groups**

In either case:

- Resource group **contents are managed exclusively by Bicep**
- No manual resource creation within managed resource groups

### 4. Entra External ID / Authentication Setup

- [ ] Entra tenant available (external/CIAM or organizational)
- [ ] Initial setup of:
  - App registrations (API + frontend)
  - Required claims exposure (`access_as_user` scope)
- [ ] Ability for the project team to:
  - Configure claims
  - Integrate authentication flows

For details on the Entra ID setup, see [MSAL / Easy Auth Setup](../MSAL-EasyAuth-Setup.md).

### 5. Azure Resource Provider Availability

The subscription must allow registration and usage of the following resource providers:

| Provider                        | Used for                               |
| ------------------------------- | -------------------------------------- |
| `Microsoft.Web`                 | App Service, Static Web App, Functions |
| `Microsoft.Storage`             | Blob Storage                           |
| `Microsoft.DBforPostgreSQL`     | PostgreSQL Flexible Server             |
| `Microsoft.Search`              | Azure AI Search                        |
| `Microsoft.CognitiveServices`   | Azure OpenAI                           |
| `Microsoft.Insights`            | Application Insights, Azure Monitor    |
| `Microsoft.KeyVault`            | Key Vault                              |
| `Microsoft.Communication`       | Communication Services (Email)         |
| `Microsoft.OperationalInsights` | Log Analytics Workspace                |

These are required for Bicep deployments to succeed.

### 6. OpenID Connect (OIDC) Federation between GitHub and Azure

GitHub Actions authenticates to Azure using **OIDC (federated identity)**.

| Property                             | Value |
| ------------------------------------ | ----- |
| No secrets stored in GitHub          | ✓     |
| No client secrets or passwords       | ✓     |
| Short-lived tokens issued at runtime | ✓     |
| Full auditability and compliance     | ✓     |

**This setup is mandatory.** A federated credential must be configured on the Azure-side App Registration (or Managed Identity) that trusts the GitHub repository and branch.

---

## Responsibilities Split

### Client IT Team

- Provide **subscription, access, and identity foundations** (Sections 1–6 above)
- **Review and approve** architecture and requirements documents
- Manage Azure billing and subscription-level governance
- Respond to resource provider registration and policy requests

### Project Team

- **Provision** infrastructure via Bicep (code in `infra/`)
- **Deploy** applications via CI/CD pipelines
- **Maintain** infrastructure definitions as code (pull requests, reviews)
- Operate and monitor the deployed environments
- Coordinate release cadence and environment promotion

---

## Deployment Flow Summary

```
Developer opens PR with Bicep changes
    │
    ▼
CI validates Bicep (az bicep build / what-if)
    │
    ▼
PR reviewed + merged to main
    │
    ▼
GitHub Actions authenticates to Azure via OIDC
    │
    ▼
Deploy to Staging (automatic)
    │  az deployment group create ...
    ▼
Staging validation
    │
    ▼
Deploy to Production (manual approval gate)
    │  az deployment group create ...
    ▼
Application deployment (API image + web build)
    │
    ▼
Post-deployment smoke tests + monitoring
```

---

## Delivered Documentation Package

The Cloud Infrastructure Assessment handed off to the IT team consists of:

| Artifact                                                            | Purpose                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [App Usage Assumptions & Estimations](./app-usage-assumptions.md)   | Expected load, reliability targets, AI/background workloads |
| [Azure Services Requirements](./requirements.md)                    | Consolidated SKUs, capacity, and configuration per service  |
| [Azure Pricing Calculator Output](../infra%20cost%20estimation.pdf) | Cost estimation per environment                             |
| Infrastructure Provisioning & Deployment Model (this document)      | IaC standard, prerequisites, CI/CD approach                 |

---

## Final Note

The documents and diagrams describe the **required target state**.

**The only supported path to reach that target state is:**

> Infrastructure as Code (Azure Bicep) + GitHub Actions + OIDC Federation

Any deviation from this approach introduces risk and is not aligned with the project's delivery model.

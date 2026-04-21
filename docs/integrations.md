# Integrations and APIs

This document describes the REST API exposed by the platform, its current external integrations, planned future integrations, and the published SLAs of all third-party services the platform depends on.

---

## REST API

### Overview

The Huella Latam backend exposes a single REST API built with Fastify. All endpoints are served under the `/api` prefix.

| Property | Value |
|---|---|
| **Framework** | Fastify (Node.js) |
| **Schema validation** | Zod via `fastify-type-provider-zod` |
| **Authentication** | Bearer token (JWT) — see [Authentication](./security/authentication.md) |
| **Authorization** | Role-based — see [RBAC and Authorization](./security/rbac.md) |
| **Rate limit** | 100 requests / minute per IP (in-memory; see note below) |
| **Max request timeout** | 10 seconds (hard cutoff) |
| **Content type** | `application/json` for all endpoints except file upload (`multipart/form-data`) |

> **Rate limit note:** The current rate limiter (`@fastify/rate-limit`) uses an in-memory store. In a multi-instance deployment (Production with autoscaling), limits are not shared across instances. Each instance enforces its own counter, making the effective limit `100 × instance_count` per IP. Upgrading to a Redis-backed store is required before rate limiting provides meaningful protection under horizontal scaling.

---

### OpenAPI / Swagger Documentation

An interactive OpenAPI 3.0 specification is served at runtime:

| Environment | URL |
|---|---|
| Local development | `http://localhost:3000/api/docs` |
| Staging | `https://<staging-app-service-hostname>/api/docs` |
| Production | `https://<production-app-service-hostname>/api/docs` |

The raw JSON spec is available at `/api/docs/json` and the YAML version at `/api/docs/yaml`.

> The spec is generated dynamically from route schemas at startup. Only routes decorated with an OpenAPI `tag` are included (routes with `hideUntagged: true`). All production-relevant endpoints are tagged.

---

### Health Check

```
GET /health
```

Public endpoint (no authentication required). Returns HTTP 200 when the API process is running. Used by Azure App Service health probes and load balancer readiness checks.

---

### API Endpoint Groups

All endpoints are served under `/api/`. The table below lists the 22 domain groups. For detailed request/response schemas, consult the live Swagger UI at `/api/docs`.

| Group | Path prefix | Description |
|---|---|---|
| Users | `/api/users` | User profile read and update; system role management |
| Organizations | `/api/app/organizations` | Organization CRUD, membership management |
| Carbon Inventories | `/api/carbon-inventories` | Carbon inventory lifecycle — create, fill, submit |
| Inventory Lines | (nested under carbon inventories) | Individual emission line items per category |
| Reduction Projects | `/api/reduction-projects` | Reduction initiative tracking |
| Submissions | `/api/submissions` | Submission and certification workflow |
| Badges | `/api/badges` | Certification badge issuance and retrieval |
| Files | `/api/files` | SAS URL generation for document upload and download |
| Forms | `/api/forms` | Form submission handling |
| Explanations | `/api/explanations` | Content help texts and explanations |
| Categories | `/api/categories` | Emission category reference data |
| Subcategories | `/api/subcategories` | Emission subcategory reference data |
| Emission Factors | `/api/emission-factors` | Emission factor values and dimensions |
| Emission Factor Dimensions | `/api/emission-factor-dimensions` | Dimension metadata for emission factors |
| Methodologies | `/api/methodologies` | Methodology version definitions |
| Measurement Units | `/api/measurement-units` | Unit reference data |
| Country Sectors | `/api/country-sectors` | Country-specific sector classification |
| Country Organization Sizes | `/api/country-organization-sizes` | Organization size categories per country |
| Organization Activities | `/api/organization-main-activities` | Main economic activity classification |
| System Parameters | `/api/system-parameters` | Runtime configuration parameters |
| Transparency | `/api/transparency` | Public-facing data and reports |
| Admin | `/api/admin/...` | SUPERADMIN / ADMIN-only operations |

### Access Control Summary

| Route group | Required role |
|---|---|
| `/api/admin/*` | `SystemRole.SUPERADMIN` or `SystemRole.ADMIN` |
| `/api/app/organizations/*` | Authenticated user (any role) |
| `/api/transparency/*` | Public or authenticated depending on endpoint |
| `/api/files` (SAS generation) | Authenticated user |
| Most other routes | Authenticated user with appropriate `OrganizationRole` |

Full permission matrix: [RBAC and Authorization](./security/rbac.md).

---

## External Integrations

### Currently Implemented

#### Azure Blob Storage

| Property | Detail |
|---|---|
| **SDK** | `@azure/storage-blob` v12 |
| **Credential** | `DefaultAzureCredential` (Managed Identity in Azure; `az login` locally) |
| **Pattern** | API generates short-lived SAS URLs; clients upload/download directly to/from Blob Storage |
| **Used for** | User-uploaded documents, images, generated PDF reports, application metadata |
| **Configuration** | `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_CONTAINER_NAME` env vars |

The API never streams file content through its own process. It generates a SAS URL and returns it to the client, which performs the upload or download directly. This keeps the API stateless with respect to file content.

For full setup details, see [File Storage](./infrastructure/FileStorage.md).

#### Microsoft Entra ID (JWKS / Authentication)

| Property | Detail |
|---|---|
| **Protocol** | OpenID Connect / JWT (RS256) |
| **Integration point** | JWKS endpoint (`JWKS_URI`) polled at token validation time |
| **Cache** | Signing keys cached for 10 minutes (max 5 entries) |
| **Validated claims** | `iss` (issuer), `aud` (audience), `exp` (expiry), `scp` (scope) |
| **User identifier** | `oid` claim preferred; falls back to `sub` |
| **Configuration** | `AUTH_PROVIDER=jwks`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` |

No token issuance or refresh logic runs inside the API. The API only validates tokens already issued by Entra ID and presented by the client.

For full setup details, see [Authentication](./security/authentication.md) and [MSAL / Easy Auth Setup](./MSAL-EasyAuth-Setup.md).

#### Azure Database for PostgreSQL (Prisma)

| Property | Detail |
|---|---|
| **ORM** | Prisma |
| **Connection** | Direct TCP to PostgreSQL Flexible Server |
| **Configuration** | `DATABASE_URL` env var (connection string) |
| **Schema** | ~45 tables; see [Developer Guide](./data-model/developer-guide.md) |

PostgreSQL is a first-party infrastructure component, not a third-party SaaS. It is provisioned and operated by the project team via Azure Bicep. It is listed here because it is an external process dependency at runtime.

---

### Planned Integrations (Not Yet Implemented)

The following integrations are provisioned in the infrastructure plan but have no application code in the current codebase.

| Integration | Purpose | Status |
|---|---|---|
| **Azure OpenAI (GPT-4o-mini)** | LLM inference for document analysis, summarization, RAG output generation | Planned |
| **Azure AI Search** | Vector/full-text index for RAG document retrieval | Planned |
| **Azure Functions (orchestration)** | LangChain-based workflow orchestrating OpenAI + AI Search calls | Planned |
| **Azure Functions (background tasks)** | Scheduled jobs: DB cleanup, reminders, data lifecycle management | Planned |
| **Azure Communication Services (Email)** | Transactional email: verification, OTP, workflow notifications | Planned |
| **Application Insights** | Distributed tracing, APM, custom metrics (SDK not yet wired into app code) | Planned |

Implementing any of these integrations requires dedicated work outside the current scope. Each will require environment variable additions documented in [Environment Variables](./development/environment-variables.md).

---

## Third-Party SLAs

The table below lists the published availability SLAs for each external service the platform depends on. Composite availability — the probability that all required services are up simultaneously — is always lower than any individual SLA.

> **Note:** SLAs below are sourced from Azure and GitHub's published service agreements. Always verify current values at [Azure SLA Summary](https://azure.microsoft.com/en-us/support/legal/sla/summary/) and [GitHub's status page](https://www.githubstatus.com/) before contractual commitments.

### Azure Services

| Service | SKU (Staging) | SKU (Production) | Published SLA |
|---|---|---|---|
| Azure App Service | S1 (Standard) | S2 / P1v3 (Standard / Premium) | **99.95%** |
| Azure PostgreSQL Flexible Server | Burstable B2ms (no HA) | D4ds v5 (no HA initially) | **99.9%** (no HA) / **99.99%** (zone-redundant HA) |
| Azure Blob Storage | LRS | ZRS | **99.9%** write / **99.99%** read (both tiers) |
| Azure Static Web Apps | Standard | Standard | **99.95%** |
| Azure Container Registry | Basic | Standard | **99.9%** |
| Azure Key Vault | Standard | Standard | **99.99%** |
| Azure Functions (Consumption) | Consumption | Consumption | **99.95%** |
| Azure AI Search | Basic | S1 | **99.9%** |
| Azure OpenAI Service | Pay-as-you-go | Pay-as-you-go | **99.9%** |
| Azure Communication Services (Email) | Pay-as-you-go | Pay-as-you-go | **99.9%** |
| Microsoft Entra ID (External) | — | — | **99.99%** |

### GitHub

| Service | SLA |
|---|---|
| GitHub Actions (CI/CD pipelines) | **99.9%** (GitHub Enterprise agreement) |
| GitHub code hosting (source of truth) | **99.9%** |

> GitHub does not publish a formal SLA for free or Team plans. The 99.9% figure applies to GitHub Enterprise Cloud. For teams on Team or Free plans, treat GitHub availability as best-effort with reference to the public [GitHub Status](https://www.githubstatus.com/) page.

---

### Composite Availability Estimate

For a user request that requires: App Service + PostgreSQL + Blob Storage + Entra ID, the composite availability is approximately:

```
0.9995 × 0.999 × 0.9999 × 0.9999 ≈ 98.83% (no HA on PostgreSQL)
0.9995 × 0.9999 × 0.9999 × 0.9999 ≈ 99.92% (with zone-redundant HA on PostgreSQL)
```

This illustrates why PostgreSQL HA is the single most impactful SLA improvement available. Enabling zone-redundant HA on the Production database raises composite availability from ~98.8% to ~99.9%.

**Monthly downtime equivalent:**

| Composite availability | Monthly downtime |
|---|---|
| 98.83% (current, no HA) | ~5 hours |
| 99.92% (with HA) | ~35 minutes |
| 99.95% (App Service SLA alone) | ~22 minutes |

These estimates assume all services fail independently, which is not always true (e.g., a regional Azure outage affects multiple services simultaneously). For single-region deployments, correlated failures are the primary risk driver beyond what individual SLAs cover.

---

### SLA Gap vs Platform Targets

The platform's reliability targets (from [App Usage Assumptions](./infrastructure/app-usage-assumptions.md)) compared to the achievable composite:

| Target | Value | Achievable with current setup | Achievable with HA enabled |
|---|---|---|---|
| Production error rate | ≤ 0.5% | Depends on application code | Depends on application code |
| Production RTO | ≤ 4 hours | Achievable via backup restore | Achievable via automatic failover |
| Production RPO | ≤ 15 minutes | Achievable via PITR backups | Better with synchronous HA replica |
| Staging RTO | ≤ 24 hours | Achievable | N/A |
| Staging RPO | ≤ 24 hours | Achievable | N/A |

The ≤ 0.5% error rate target is an application-level target, not an infrastructure-level SLA. Application bugs, unhandled edge cases, and dependency timeouts all contribute to it independent of infrastructure availability.

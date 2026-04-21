# Azure Services Requirements

This document consolidates the Azure service requirements for the Huella Latam platform per environment: **service tier, SKU, capacity sizing, usage volumes, and pricing calculator inputs**. It is the canonical reference for cloud readiness validation, cost estimation, and Infrastructure as Code provisioning.

For the expected load and reliability targets behind these sizing decisions, see [App Usage Assumptions](./app-usage-assumptions.md).
For how these services are provisioned, see [Infrastructure Provisioning Model](./provisioning-model.md).
For the Azure-side cost breakdown see [`docs/infra cost estimation.pdf`](../infra%20cost%20estimation.pdf).
For the deployment scripts and Bicep modules, see [`infra/`](../../infra/) and [Deployment Guide](./Deployment.md).

> **Status note:** Some services below (Azure Functions, OpenAI, AI Search, Communication Services, Application Insights) are part of the **target architecture** but not yet implemented in the current codebase. They are listed here so country deployment teams can provision them when the corresponding application features ship.

---

## Environment Tiers

The platform is deployed in at least two environments:

| Environment | Purpose |
|---|---|
| **Staging** | Internal QA, demos, pilot tests with real organizations |
| **Production** | Live country-level system serving real users |

Each environment is an independent Azure Resource Group with its own set of resources. All resources are provisioned via Bicep — no manual creation.

---

## Service-by-Service Requirements

### Azure Static Web Apps (Frontend)

| Parameter | Staging | Production |
|---|---|---|
| **Service** | Azure Static Web Apps | Azure Static Web Apps |
| **Plan** | Standard | Standard |
| **Custom domain** | Enabled | Enabled |
| **Authentication** | Entra ID | Entra ID |
| **Traffic (page views/month)** | ~1,500–6,000 | ~30,000–90,000 |
| **Bandwidth/month** | ~2–6 GB | Higher, scales with traffic |
| **Billing model** | Fixed monthly | Fixed monthly |

**Pricing calculator inputs (Staging):** Tier Standard, 1 app, 6 GB bandwidth.
**Pricing calculator inputs (Production):** Tier Standard.

---

### Azure App Service (Backend API)

The API is deployed as a Linux container (currently Docker, pulled from Azure Container Registry).

| Parameter | Staging | Production |
|---|---|---|
| **Service** | Azure App Service (Linux) | Azure App Service (Linux) |
| **Plan tier** | Standard S1 | Standard S2 (baseline) / **Premium P1v3 (preferred)** |
| **Instance count** | 1 | 2 minimum |
| **Autoscale** | Disabled | Enabled (target CPU > 70%) |
| **vCPU per instance** | ~1 | ~2 |
| **RAM per instance** | 1.75–3.5 GB | S2: ~3.5 GB · P1v3: ~8 GB |
| **OS** | Linux | Linux |
| **Runtime** | Node.js ≥ 24 | Node.js ≥ 24 |
| **Billing model** | Fixed monthly (App Service Plan) | Fixed monthly (App Service Plan) |

**Pricing calculator inputs (Staging):** Linux, Standard S1, 1 instance × 730 hours.
**Pricing calculator inputs (Production):** App Service Plan Standard S2 (or Premium P1v3), 2 instances, Linux.

> The API is **stateless** — horizontal scaling via App Service scale-out is supported. For Production, set auto-scale triggers at CPU > 70%.

---

### Azure Container Registry (ACR)

Used to store the API Docker image. Required for the current Docker-based API deployment flow.

| Parameter | Staging | Production |
|---|---|---|
| **SKU** | Basic | Standard |

---

### Azure Functions

> **Planned.** Required once background tasks and AI orchestration features are implemented.

| Parameter | Staging | Production |
|---|---|---|
| **Plan** | Consumption | Consumption |
| **Runtime** | Python | Python |
| **Region** | Same as backend | Same as backend |
| **Execution model** | Event-driven | Event-driven |
| **Total executions/month** | ~6,400 | ~7,400 → 15,000+ |
| **Execution mix** | Background tasks + AI orchestration | Background tasks ~5,400 + AI orchestration 2,000–10,000+ |
| **Avg execution duration** | 5–40 seconds | 5–40 seconds |
| **Memory — background tasks** | 512 MB | 512 MB |
| **Memory — AI orchestration** | 1–2 GB | 1–2 GB |
| **Billing model** | Pay-per-execution | Pay-per-execution |

**Pricing calculator inputs (Staging):** Consumption, memory 1024 MB, avg 20,000 ms, ~6,400 executions/month.
**Pricing calculator inputs (Production):** Consumption, ~10,000 executions/month (safe average), avg 20s, 1 GB.

---

### Azure Database for PostgreSQL — Flexible Server

Minimum version: **PostgreSQL 15** (the schema uses `NULLS NOT DISTINCT` syntax). Currently deployed on PostgreSQL 18 as of 2026-04-21.

| Parameter | Staging | Production |
|---|---|---|
| **Tier** | Burstable | General Purpose |
| **SKU** | Standard_B2ms | **Standard_D4ds v5** |
| **vCores** | 2 | 4 |
| **Memory** | 8 GB | 16 GB |
| **Storage type** | Premium SSD | Premium SSD |
| **Storage size** | 32 GB | 50 GB (growing) |
| **Provisioned IOPS** | 0 (default / auto) | 0 (auto) |
| **High availability** | Disabled | Disabled (initial Production phase) |
| **PITR backup** | Enabled | Enabled |
| **Backup storage size** | 32 GB | 50 GB |
| **Backup redundancy** | LRS | LRS |
| **Billing model** | Compute + storage (hourly) | Compute + storage (hourly) |

**Pricing calculator inputs (Staging):** Flexible Server, Burstable, B2ms (2 vCore), 1 server × 730 hours; Premium SSD 32 GB; Backup LRS 32 GB.
**Pricing calculator inputs (Production):** General Purpose, D4ds v5, Premium SSD 50 GB, HA disabled.

**Production notes:**
- Database size is expected to **double every year**
- Storage autoscale is recommended
- Consider enabling HA and geo-redundant backups as adoption grows

---

### Azure Blob Storage

Stores user-uploaded documents, images, generated PDF reports, and application metadata.

| Parameter | Staging | Production |
|---|---|---|
| **Account type** | General Purpose v2 (GPv2) | GPv2 |
| **Hierarchical Namespace** | Enabled (ADLS Gen2) | Enabled (ADLS Gen2) |
| **Redundancy** | LRS | **ZRS** |
| **Access tier** | Hot | Hot |
| **Capacity target** | 50 GB | 1,000 GB (1 TB) |
| **Soft limit alert** | 40 GB | — (growth expected) |
| **Writes/month** | ~10,000 | ~2,000 |
| **Reads/month** | ~20,000 | ~5,000 |
| **Iterative read/write** | ~3,000 each | Moderate |
| **Data write/month** | ~30 GB | ~100 GB |
| **Data retrieval/month** | ~10 GB | ~5–10 GB |
| **SSH File Transfer Protocol** | Disabled | Disabled |
| **Billing model** | Pay-as-you-go | Pay-as-you-go |

**Pricing calculator inputs (Staging):** Block Blob, Standard, GPv2, Hierarchical Namespace, Hot, LRS, 50 GB, write 10k, read 20k, iter 3k each, retrieval 10 GB.
**Pricing calculator inputs (Production):** Blob (Hot), 1 TB, ZRS.

> All files are private (no anonymous public access). Access is via time-limited SAS URLs generated by the API. Enable **soft delete** for blobs in production (30-day retention recommended).

---

### Azure Key Vault

| Parameter | Staging | Production |
|---|---|---|
| **Tier** | Standard | Standard |
| **Managed HSM** | No | No |
| **Secrets** | ~8–15 | ~10–20 |
| **Keys (software)** | 0–1 | 0–2 |
| **Certificates** | 0–1 | 0–2 |
| **Operations/month** | ~200–300 | ~400–500 |
| **Billing model** | Per-operation | Per-operation |

**Pricing calculator inputs (Staging):** Vaults, ~300 standard operations/month.
**Pricing calculator inputs (Production):** Standard tier, ~500 operations/month.

---

### Azure Monitor (Log Analytics + Application Insights)

> **Partially planned.** Current implementation logs via Pino to stdout (captured by App Service log stream). Full observability requires enabling Log Analytics and Application Insights.

| Parameter | Staging | Production |
|---|---|---|
| **Services** | Application Insights + Log Analytics Workspace | Application Insights + Log Analytics Workspace |
| **Traffic context** | 60k–270k requests/month | ~6M requests/month |
| **Total ingestion/month** | ~0.5–1.5 GB | ~5–15 GB |
| **Analytics Logs** | ~0.5–1 GB | ~4–10 GB |
| **Basic Logs** | ~0.3–0.5 GB | ~1–5 GB |
| **Sampling** | 10–25% | 5–10% |
| **Retention** | 30 days | 90 days |
| **Billing model** | Ingestion-based | Ingestion-based |

**Pricing calculator inputs (Staging):** Basic Logs 0.5 GB/mo, Analytics Logs 1 GB/mo, Interactive Retention 30 days, 50 daily queries, 1 GB scanned per query. App Insights: 0.05 GB/day ingestion, 1-month retention, 1 web test every 5 min × 730 hrs.
**Pricing calculator inputs (Production):** Analytics Logs 8 GB/month, Basic Logs 3 GB/month, 90-day retention.

---

### Azure Communication Services (Email)

> **Planned.** Transactional email delivery. Not yet integrated.

| Parameter | Staging | Production |
|---|---|---|
| **Emails/month** | ~300–800 | ~2,000 typical / up to 5,000 modeled |
| **Avg payload size** | up to 5 MB | up to 5 MB |
| **Features used** | Transactional only | Transactional only (account verification, OTP/MFA, status notifications) |
| **SMS / Voice / Chat** | Not used | Not used |
| **Billing model** | Pay-as-you-go | Pay-as-you-go |

**Pricing calculator inputs (Staging):** 500 emails/month, 5 MB/mail.
**Pricing calculator inputs (Production):** 5,000 emails/month, payload size large (upper bound).

---

### Azure AI Search

> **Planned.** Required for RAG-powered AI features.

| Parameter | Staging | Production |
|---|---|---|
| **Tier** | Basic | Standard (S1) |
| **Search Units** | 1 | 1 (baseline) or 2 (HA / throughput) |
| **Partitions** | 1 | 1–2 |
| **Replicas** | 1 | 1–2 |
| **Indexed documents** | ~100–500 | ~10,000–50,000 |
| **Indexed chunks** | ~50k–300k | ~5–50 million |
| **Queries/month** | — | ~6,000–15,000 |
| **Billing model** | Fixed monthly | Fixed monthly per Search Unit |

**Pricing calculator inputs (Staging):** Basic, 1 Search Unit × 730 hours.
**Pricing calculator inputs (Production):** Standard S1, 1–2 Search Units.

---

### Azure OpenAI Service

> **Planned.** AI features for document analysis and summarization.

| Parameter | Staging | Production (initial) | Production (mature) |
|---|---|---|---|
| **Model** | GPT-4o-mini | GPT-4o-mini | GPT-4o-mini |
| **Deployment type** | Standard (on-demand) | Standard (on-demand) | Standard (on-demand) |
| **Throughput reservation (PTUs)** | None | None | None |
| **Requests/month** | ~1,000 | 2,000–3,000 | 10,000+ |
| **Tokens per request** | ~9,500 | ~9,500 | ~9,500 |
| **Total tokens/month** | ~9.5M | ~20–30M | ~95M+ |
| **Billing model** | Token-based consumption | Token-based consumption | Token-based consumption |

**Pricing calculator inputs (Staging):** GPT-4o-mini, Standard, Global deployment, Input tokens 8M/mo, Cached input 8M/mo, Output 1.5M/mo.
**Pricing calculator inputs (Production):** GPT-4o-mini, input tokens ~70–80% of total, output tokens ~20–30%.

---

### Azure Front Door (Optional)

Currently optional. Recommended for Production when the deployment requires:
- A custom domain (e.g., `app.huellalatam.org`)
- WAF rules (protection against OWASP top 10)
- Global CDN for frontend assets
- Locking the App Service to accept traffic only from Front Door

| Parameter | Production |
|---|---|
| **SKU** | Standard |

---

## OS and Runtime Requirements

### API Server (App Service)
- **Container OS:** Linux (Debian-based Node.js Docker image)
- **Node.js:** ≥ 24.0.0 (as specified in `engines` field of `package.json`)
- **Docker:** Any recent version (used locally and in CI for image builds)

### Database Server
- **OS:** Managed by Azure (Ubuntu-based)
- **PostgreSQL:** ≥ 15 (as of 2026-04-21, deployed on PostgreSQL 18)

### Functions (planned)
- **Runtime:** Python (chosen for LangChain compatibility)

### Local Development
- **OS:** Any (macOS, Linux, Windows with WSL2 recommended)
- **Node.js:** ≥ 24.0.0
- **pnpm:** ≥ 10.23.0
- **Docker:** Any recent version (required for local PostgreSQL via Docker Compose)
- **Azure CLI:** ≥ 2.59.0 (required for deployments)

---

## Networking Considerations

- **PostgreSQL Flexible Server firewall:** Must explicitly allow the App Service IP range (or use VNet integration). For local development, developers add their IP manually in Azure Portal.
- **Blob Storage:** Network ACLs set to `Deny` by default; only Azure services bypass. For development, `Allow` or specific IP exceptions are configured.
- **VNet integration:** Optional but recommended for Production to isolate API ↔ DB communication.
- **Front Door:** Routes external traffic; App Service can be locked to only accept traffic from Front Door.

---

## Cost Modeling Notes

> **As of 2026-04-21.** Azure pricing changes over time — treat these figures as a planning baseline, not a current quote. The linked [`docs/infra cost estimation.pdf`](../infra%20cost%20estimation.pdf) was generated at project inception and reflects pricing at that date.

### Staging (right-sized for cost-efficiency)
- All services right-sized for pilot/demo load
- No autoscaling-heavy or premium SKUs
- Flat-cost services dominate (predictable billing)
- Usage-based services are capped and observable (AI requests, email volume, log ingestion)
- Architecture preserves **full parity with Production**

### Production (conservatively sized)
- All services are production-grade
- Flat-cost services dominate predictable spend
- Usage-based services have clear caps and monitoring
- AI costs remain small relative to core infrastructure
- Architecture is national-scale ready **without overengineering** (no global active/active, no 24/7 SRE)

---

## Scaling Considerations

- **API:** Stateless → supports horizontal scaling via App Service scale-out rules. Set auto-scale trigger at CPU > 70%.
- **Database:** PostgreSQL Flexible Server supports read replicas for read-heavy workloads. Consider enabling HA and geo-redundant backups as the platform matures.
- **Frontend:** Azure Static Web App uses global CDN; no manual scaling needed.
- **Storage:** Azure Blob Storage scales automatically.
- **Functions:** Consumption plan scales automatically per execution volume.
- **AI Search / OpenAI:** Scale search units / token reservations based on measured AI adoption.

For high-traffic scenarios (thousands of concurrent organizations), consider:
- Upgrading to PostgreSQL General Purpose or Memory-Optimized tiers (from Burstable)
- Adding a Redis cache layer for frequently accessed reference data (methodology, emission factors)
- Enabling PostgreSQL connection pooling (e.g., PgBouncer)
- Reserving Azure OpenAI Provisioned Throughput Units (PTUs) if AI latency becomes critical

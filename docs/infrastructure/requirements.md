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

## How Assumptions Drive Sizing (Quick Reference)

The tier and capacity of each service is derived from the usage assumptions in [App Usage Assumptions](./app-usage-assumptions.md). The following table maps the most consequential assumptions to the service decisions they justify — each service section below expands on the rationale.

| Assumption (Staging → Production) | Drives |
|---|---|
| **DAU: 10–30 → 200** | App Service instance count (1 → 2 min), autoscale (off → on) |
| **API RPS peak: 1–3 → ~20** | App Service SKU (S1 single core → S2/P1v3 dual core) |
| **API requests: 60k–270k/mo → 6M/mo** | Log sampling (10–25% → 5–10%), Monitor ingestion sizing |
| **DB size: 5–20 GB → hundreds of GB (doubles yearly)** | PostgreSQL tier (Burstable B2ms → General Purpose D4ds v5), storage autoscale |
| **Concurrent DB queries: < 10 → moderate** | PostgreSQL vCores (2 → 4), RAM (8 → 16 GB) |
| **Blob storage: < 50 GB → 1 TB+** | Storage capacity target, redundancy (LRS → ZRS) |
| **Error rate: ≤ 5% → ≤ 0.5%** | Production requires 2 App Service instances; HA path documented |
| **RTO: ≤ 24 h → ≤ 4 h** | Backup configuration (PITR), monitoring verbosity, alert thresholds |
| **RPO: ≤ 24 h → ≤ 15 min** | PostgreSQL transaction log backups, Storage ZRS in Production |
| **Log retention: 30 d → 90 d** | Log Analytics workspace retention policy |
| **AI requests: ~1,000/mo → 10,000+/mo** | AI Search tier (Basic → Standard S1), OpenAI token budget, Functions execution volume |
| **Emails: very low → 2–5k/mo** | Communication Services capacity planning |
| **Background tasks: 5,400/mo (both)** | Azure Functions Consumption plan suffices (no Premium needed) |
| **Backend is stateless** | Enables horizontal scale-out; no sticky sessions required |

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

**Sizing rationale:**
- **Standard tier (both environments):** Required to enable custom domain and Entra ID authentication integration. The Free tier lacks these capabilities and cannot meet the reliability targets during pilots.
- **Bandwidth 6 GB (Staging):** With 10–30 DAU and ~1,500–6,000 page views/month at ~1 MB average, expected bandwidth is ~2–6 GB/month. 6 GB provides headroom.
- **Production traffic (30k–90k views/month):** Well within Standard tier limits; no need for Enterprise tier.

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **Staging S1 (1 core, 1.75 GB)** | 10–30 DAU with 1–3 peak RPS and intermittent 8–10 hr/day usage fits comfortably in a single burstable instance. No sustained load expected; no autoscaling needed. |
| **Staging — autoscale disabled** | No concurrency spikes anticipated. Cost efficiency is preferred over performance headroom. |
| **Production S2 / P1v3 (2 cores, 3.5–8 GB)** | 200 DAU with ~20 peak RPS and 2s worst-case execution time requires ≥ 2 vCPU per instance to avoid queuing. P1v3 is preferred for the 8 GB RAM headroom supporting AI orchestration paths. |
| **Production — 2 instances minimum** | Required for the ≤ 0.5% error rate target and ≤ 4 hour RTO — a single instance restart would violate both. |
| **Production — autoscale enabled** | 6M requests/month concentrated in ~12 working hours creates predictable but non-flat traffic; CPU > 70% is the standard trigger. |
| **Linux + Node.js 24** | Matches the API codebase (`engines.node ≥ 24.0.0`). |

> The API is **stateless** — horizontal scaling via App Service scale-out is supported. For Production, set auto-scale triggers at CPU > 70%.

---

### Azure Container Registry (ACR)

Used to store the API Docker image. Required for the current Docker-based API deployment flow.

| Parameter | Staging | Production |
|---|---|---|
| **SKU** | Basic | Standard |

**Sizing rationale:**
- **Basic (Staging):** Sufficient for a single-image, single-developer deployment pattern with low image pull frequency.
- **Standard (Production):** Higher included storage and throughput, which matter when multiple instances pull images on scale-out events.

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **Consumption plan (both)** | Executions are user-triggered, intermittent, and well below 1 execution/second sustained — serverless best fits the workload. No background scheduled AI jobs exist. |
| **Python runtime** | Chosen for LangChain compatibility (AI orchestration layer). |
| **512 MB — background tasks** | Background workloads (DB cleanup, reminders, lifecycle) are lightweight; 512 MB is standard practice. |
| **1–2 GB — AI orchestration** | Loading LangChain + orchestrating HTTP calls to external LLM/search services requires ~1 GB; headroom to 2 GB for concurrent chains. |
| **~6,400/mo (Staging) vs ~15,000/mo (Production mature)** | Driven by (a) fixed 5,400 background executions/month (720 cleanup + 4,300 reminders + 360 lifecycle), plus (b) 1,000 AI requests (Staging) scaling to 10,000+ (mature Production). |
| **No Premium plan** | Execution durations (5–40s) fit within Consumption plan's 10-minute timeout. Heavy compute runs on external managed AI services, not in the Function runtime. |

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **Staging Burstable B2ms (2 vCore, 8 GB)** | DB is 5–20 GB with simple CRUD + joins, < 10 concurrent queries. Burstable tier absorbs intermittent demo/test spikes at minimum cost. 8 GB RAM comfortably caches the working set. |
| **Staging 32 GB Premium SSD** | Expected DB size is 5–20 GB with periodic resets; 32 GB is the minimum Flexible Server storage and provides 10–15 GB of free headroom. |
| **Production General Purpose D4ds v5 (4 vCore, 16 GB)** | 6M queries/month at 20 peak RPS needs sustained (not burstable) CPU. 16 GB RAM targets a hot working set that fits in memory, avoiding IO-bound queries. |
| **Production 50 GB + storage autoscale** | Initial footprint is modest, but DB size **doubles every year** — autoscale prevents premature resizing operations. |
| **PITR backup enabled (both)** | Required to meet the RPO targets: ≤ 24 h (Staging) and ≤ 15 min (Production). Transaction log backups every 5–10 min cover Production's 15-min RPO. |
| **LRS backup redundancy (both initially)** | Matches the 4-hour RTO without geo-failover complexity. Upgrade to GRS once the deployment's risk profile warrants cross-region recovery. |
| **HA disabled (initial Production)** | No life-critical impact; 4-hour RTO is achievable with PITR restore and a manual failover procedure. Enable zone-redundant HA once DAU crosses a defined threshold (e.g., 500+) or regulatory obligations tighten. |
| **No PostGIS** | Application assumptions explicitly exclude geospatial queries. |

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
| **Writes/month** | ~2,000 | ~10,000 |
| **Reads/month** | ~5,000 | ~20,000 |
| **Iterative read/write** | ~3,000 each | Moderate |
| **Data write/month** | ~30 GB | ~100 GB |
| **Data retrieval/month** | ~10 GB | ~5–10 GB |
| **SSH File Transfer Protocol** | Disabled | Disabled |
| **Billing model** | Pay-as-you-go | Pay-as-you-go |

**Pricing calculator inputs (Staging):** Block Blob, Standard, GPv2, Hierarchical Namespace, Hot, LRS, 50 GB, write 2k, read 5k, iter 3k each, retrieval 10 GB.
**Pricing calculator inputs (Production):** Blob (Hot), 1 TB, ZRS.

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **GPv2 + Hierarchical Namespace (both)** | ADLS Gen2 semantics enable future analytics use cases and cleaner folder-based organization; no cost penalty vs flat namespace. |
| **Hot access tier (both)** | Files are accessed frequently during certification workflows (reads ~5k/mo Staging, ~20k/mo Production); cool/archive tiers would add retrieval costs and latency. |
| **Staging LRS, Production ZRS** | Staging is disposable, LRS is sufficient. Production ZRS provides zone-redundancy within a region, aligning with the 4-hour RTO and 15-min RPO without cross-region complexity. |
| **Staging 50 GB cap + 40 GB alert + 90-day purge** | Usage is user-driven, low volume, often repeated/disposable. No long-term retention required. |
| **Production 1 TB target** | Data accumulates across many organizations; growth expected from hundreds of GB to TB-scale over time. |
| **SFTP disabled** | Uploads are user-driven via SAS URLs generated by the API — no external SFTP ingestion pattern exists. |
| **Private access + SAS URLs** | Files may contain sensitive organizational data (certifications, evidence); SAS URLs enforce time-bound access without exposing the account key. |

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

**Sizing rationale:**
- **Standard tier (both):** Sufficient for storing ~10–20 secrets, ≤ 2 keys, and ≤ 2 certificates used by the platform (DB credentials, storage keys, auth secrets).
- **No Premium / Managed HSM:** No FIPS 140-2 Level 3 / HSM-backed key requirements; Standard tier's software-protected keys are adequate for the non-financial-ledger trust model.
- **Operations volume (~300/mo Staging, ~500/mo Production):** Derived from App Service startup secret fetches plus routine rotation checks.

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **Sampling 10–25% (Staging), 5–10% (Production)** | At ~6M Production requests/month, 100% ingestion would generate ~50–100 GB/month — unnecessary for error diagnosis. 5–10% preserves statistical validity for performance insights while capping cost. |
| **Retention 30 days (Staging), 90 days (Production)** | Staging retention matches the pilot cycle length (sufficient for debugging/validation). Production 90 days covers the RCA window for P1/P2 incidents and audit traceability without triggering archival cost tiers. |
| **App Insights availability test every 5 min** | Detects downtime within 1 RTO unit (5 min) for Production; cost is negligible per test run. |
| **Basic Logs vs Analytics Logs split** | Basic Logs (lower cost, limited query) hold verbose diagnostics; Analytics Logs hold the structured, queryable signals used for alerts and dashboards. |

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

**Sizing rationale:**
- **Pay-as-you-go (both):** Email volume is tied to transactional workflows (verification, OTP, status notifications) and scales with user activity; flat reservations would under-use capacity at current DAU.
- **5,000/mo Production upper bound:** Derived from 200 DAU × a conservative 25 emails/user/month (verification, MFA, status updates for submissions). Typical is ~2,000/mo.
- **5 MB payload ceiling:** Matches API-generated PDF reports that may be attached to email notifications.

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **Staging Basic, 1 SU** | 100–500 indexed documents and 50k–300k chunks fit within Basic's 2 GB storage limit. Query volume is demo-scale; no HA or high-throughput requirements. |
| **Production Standard S1** | 10k–50k documents and 5–50M chunks exceed Basic's 2 GB / 3 indexes limit. S1 supports the mid-term growth path. |
| **Production 1–2 SUs** | 1 SU for baseline (6k–15k queries/month with low concurrency); scale to 2 SUs once HA or query throughput becomes a constraint (partitions for index size, replicas for query availability). |

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

**Sizing rationale:**

| Decision | Justification (from assumptions) |
|---|---|
| **GPT-4o-mini (both)** | Balances quality and cost for summarization/RAG use cases at the scale of 1k–10k+ requests/month. Upgrade to GPT-4o only if quality evaluation shows mini is insufficient. |
| **Standard (on-demand) — no PTU reservation** | Usage is user-triggered and bounded by application workflows (not open-ended chat). Token volume (9.5M/mo Staging → 95M+ mature Production) is well below the break-even threshold for Provisioned Throughput Units. |
| **Token budget per request (5k new + 3k cached input + 1.5k output)** | Intentional conservative upper bound — covers worst-case RAG retrieval (multiple document chunks) plus long-form responses (2–3 Word pages equivalent). Typical requests consume less. |
| **User-triggered only, no background AI** | No batch or scheduled AI processing — keeps throughput predictable and avoids surprise token bills. |

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

- **PostgreSQL Flexible Server firewall:** The App Service outbound IP range must be added via the `allowedIpRanges` parameter in `infra/modules/postgres.bicep` — this is the Bicep-managed path and the only sanctioned way to make permanent firewall changes.

  > **Break-glass exception — developer local IPs only.** If a developer needs temporary direct database access from a local workstation (e.g., to run a migration or inspect data), they may add their IP via Azure Portal under **PostgreSQL → Networking → Add current client IP**. This exception requires: (1) approval from the tech lead or on-call engineer, (2) a maximum TTL of 8 hours, and (3) explicit removal of the rule before the TTL expires. Persistent entries not backed by a Bicep change are non-compliant and will be removed on the next `deploy.sh` run (which reconciles the stack to the declared state).
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

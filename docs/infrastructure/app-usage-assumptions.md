# App Usage Assumptions & Estimations

This document describes the expected usage patterns, load, and reliability targets for each environment. It serves as the canonical input for infrastructure sizing, autoscaling rules, and cost estimation.

For the resulting Azure service requirements (SKUs, capacity), see [Azure Services Requirements](./requirements.md).
For how those services are provisioned, see [Infrastructure Provisioning Model](./provisioning-model.md).

---

## About the Product

Huella Latam is a **carbon footprint traceability and transparency platform** designed for country-level adoption and long-term operation. It enables organizations to measure and manage their GHG emissions, submit inventories for external validation by certified third parties, and receive official recognition badges. Both environments run the same application codebase; they differ in scale, reliability targets, and operational posture.

Primary use cases (both environments):
- Document upload and management
- Report generation
- Status tracking of submissions and external validation workflows
- User notifications and communications

System characteristics:
- No external business-logic integrations
- No batch operations triggered by users, except internal maintenance tasks
- Backend is **stateless**, supporting horizontal scalability

---

## Environment Purpose

| Aspect | Staging | Production |
|---|---|---|
| **Purpose** | Internal QA, demos, pilot tests with real organizations | Live country-level system, serving real users |
| **User base** | Internal team + selected testers + pilot organizations | Multiple organizations, general user base |
| **Data** | Disposable, resettable | Durable, long-term retention |
| **SLA** | None | Production-grade targets |
| **Deployment posture** | Cost-optimized, minimal resources | Conservative sizing with headroom for growth |

> **Important:** Although Staging is cost-optimized, any pilot involving real organizations must still meet baseline production-grade safeguards for data protection, security, recovery, and operational control.

---

## Traffic & Load

| Metric | Staging | Production |
|---|---|---|
| **Daily Active Users (DAU)** | 10–30 | 200 |
| **API requests per user per day** | 100–300 | ~1,000 |
| **API requests per day** | 2,000–9,000 | ~200,000 |
| **API requests per month** | 60,000–270,000 | ~6,000,000 |
| **Peak traffic (RPS)** | 1–3 | ~20 |
| **Traffic pattern** | Intermittent, 8–10 hours/day | Concentrated in working hours, evenly distributed across ~12 hours/day |
| **Concurrency** | Low, no sustained load | Predictable, moderate |
| **Bulk/stress traffic** | None unless explicitly triggered | None |

In both environments:
- The backend is **stateless** — horizontal scaling is supported
- No bursty or bulk-user behavior is expected
- No large batch operations are triggered by user actions

---

## API and Containers

| Metric | Staging | Production |
|---|---|---|
| **Codebase** | Same as Production | Production codebase |
| **Execution time (worst case)** | ~2s per request | ~2s per request |
| **Concurrency** | Low | Moderate, predictable |
| **Autoscaling** | Disabled | Enabled (target CPU > 70%) |
| **Design goal** | Scale minimally, favor cost efficiency | Scale horizontally as load grows |

The 2-second worst-case execution time is used for autoscaling calculations, concurrency estimation, and cost modeling.

---

## Database

Shared characteristics:
- **Engine:** PostgreSQL (Flexible Server)
- **Extensions:** No PostGIS or geospatial extensions
- **Query profile:** Simple CRUD + joins, no heavy analytics
- **Schema:** ~45 tables, all with foreign keys
- **Design focus:** Transactional consistency, not analytics

| Metric | Staging | Production |
|---|---|---|
| **Expected DB size (initial)** | 5–20 GB | ~50 GB baseline |
| **Expected DB size (mature)** | 5–20 GB (stable) | Hundreds of GB → TB-scale |
| **Growth expectation** | Small, controlled, periodic resets | ~Doubles every year |
| **Concurrent queries baseline** | < 10 | Scales with DAU |
| **Provisioned IOPS** | Baseline (default) | Baseline, storage scales independently |
| **Backup/restore use** | Environment recovery, demo preparation | Business continuity, point-in-time restore |

---

## File Storage

Both environments store:
- User-uploaded documents
- Images
- Generated PDF reports
- Application metadata

| Metric | Staging | Production |
|---|---|---|
| **Upload pattern** | User-driven, low volume, disposable | User-driven, no bulk ingestion |
| **Expected storage size** | Target < 50 GB; alert at 40 GB; purge every 90 days | Hundreds of GB → TB-scale over time |
| **Long-term retention** | Not required | Required |
| **Data classification** | Can be periodically purged | Durable, production-grade repository |

---

## Logs & Observability

> **Status:** The values below are **target-state** targets, not current implementation. Application Insights and Azure Monitor are provisioned in the infrastructure plan but the SDK is not yet instrumented in the application code. Current observability relies on Pino structured logs written to stdout only.

| Metric | Staging | Production |
|---|---|---|
| **APM** | Application Insights (target) | Application Insights + Azure Monitor (target) |
| **Log ingestion verbosity** | Reduced | Standard |
| **Sampling** | ≥ 10% (adjustable) | ~10% |
| **Retention** | 30 days | 90 days (3 months) |
| **Focus** | Error tracking, basic performance, demo diagnosis | Errors, performance, operational diagnostics |

---

## Authentication

Both environments use **Microsoft Entra ID** as the identity provider.

| Metric | Staging | Production |
|---|---|---|
| **Active users** | 20–50 total | Aligned with DAU, grows over time |
| **Monthly Active Users (MAU) target** | N/A | Up to ~10,000 over time |
| **User onboarding** | No real onboarding; mocked/reused identities | Real end-user onboarding |
| **Multi-organization support** | Yes | Yes (designed for future growth without architectural change) |

---

## Email / Notifications

| Metric | Staging | Production |
|---|---|---|
| **Volume** | Very low (functional testing, demo flows) | 2,000–5,000 emails/month |
| **Avg email size** | Up to 5 MB (infrequent) | Up to 5 MB |
| **Use cases** | Functional testing, demo flows | Account verification, OTP/MFA, status notifications, workflow events |
| **Delivery provider** | Sandbox provider, restricted distribution lists | Azure Communication Services (Email) |
| **Marketing / bulk** | None | None |

---

## Reliability & Failure Tolerance

| Target | Staging | Production |
|---|---|---|
| **Acceptable error rate (5xx)** | ≤ 5% | ≤ 0.5% |
| **API timeout threshold** | 10 seconds (hard) | 10 seconds (hard) |
| **RTO (Recovery Time Objective)** | ≤ 24 hours | ≤ 4 hours |
| **RPO (Recovery Point Objective)** | ≤ 24 hours | ≤ 15 minutes |

### Rationale

**Error rate:**
- Staging ≤ 5% balances realism and cost efficiency during demos and pilot validation. Errors must still be visible, diagnosable, and recoverable without data corruption.
- Production ≤ 0.5% is a strong but realistic target for a regulatory platform — stronger than consumer SaaS (≤ 1%), less strict than financial trading (≤ 0.1%).

**Timeout:**
- Both environments use the same 10-second hard timeout intentionally — keeping parity ensures timeout behavior is validated in Staging before reaching Production, and differences would hide issues. Practical breakdown: normal requests 1–3s, slow requests 3–6s, hard cutoff 10s.

**RTO:**
- Staging ≤ 24 hours is appropriate because no contractual SLA applies, no continuous user dependency exists, and downtime can be planned around.
- Production ≤ 4 hours shows seriousness without overengineering. Comparable national registries typically target 2–8 hours.

**RPO:**
- Staging ≤ 24 hours is acceptable because pilot data can often be re-created, and no legal/regulatory commitments depend on it.
- Production ≤ 15 minutes is conservative and defensible. Even small data loss on a traceability and regulatory evidence platform can create legal or audit issues and undermine trust. Comparable regulatory record systems target 5–30 minutes.

### What these targets do and do not require

**Do NOT require** (either environment):
- Global multi-region active/active deployments
- 24/7 SRE on-call rotation
- Extreme cost/infrastructure complexity

**DO require:**
- Automated backups (both environments)
- Documented restore procedures (both environments)
- Basic monitoring and alerting (both environments)
- Clear incident procedures (Production)
- Health monitoring (Production)

---

## AI Usage

> **Status:** AI-powered features are planned for both environments. They are not currently implemented in the codebase.

### Scope (both environments)

AI is used for:
- AI-assisted reading and analysis of uploaded documents
- Retrieval-Augmented Generation (RAG) using indexed documents
- Summarization and explanation of reports and evidence files
- AI-supported user interactions within the application

AI usage characteristics:
- **User-triggered only** — no background, batch, or scheduled AI jobs
- **No public or anonymous access**
- **Heavy computation (LLM inference, embeddings) runs on external managed AI services** (Azure OpenAI), not inside the application runtime
- **Orchestration** is handled by Azure Functions (LangChain workflows coordinating LLM calls, RAG retrieval, prompt assembly, response post-processing)

### Out of scope (both environments)

- High-volume conversational AI
- Large-scale document ingestion
- Batch or scheduled AI processing
- SLA-driven or latency-critical AI workloads
- Public or anonymous AI access

### Volume expectations

| Metric | Staging | Production (initial) | Production (mature) |
|---|---|---|---|
| **AI requests/month** | ~1,000 | 2,000–3,000 | 10,000+ |
| **Usage pattern** | Concentrated during QA, demos, pilots | Gradual adoption across organizations | National rollout |

### Per-request token assumptions (conservative upper bounds)

| Token type | Amount |
|---|---|
| **New input (non-cached)** | ~5,000 tokens |
| **Cached / repetitive input** | ~3,000 tokens |
| **AI output** | ~1,500 tokens (≈ 1,100–1,200 words, or 2–3 Word document pages — long-form responses) |

These values intentionally overestimate typical usage to provide safety margin. They may increase as adoption grows.

> Although the absolute number of AI requests in Staging and early Production may appear similar, the usage patterns differ significantly. Staging AI usage is concentrated during demos, QA, and pilot scenarios with repeated flows, while Production AI usage starts conservatively and grows gradually as adoption increases across organizations.

---

## Background Tasks

> **Status:** Background tasks are planned but not currently implemented. They will run on Azure Functions (Consumption plan).

Three categories of background tasks are anticipated (same in both environments):

### 1. Database Cleanup
- Examples: deleting obsolete or expired records, clearing orphaned data, lightweight maintenance logic
- Typical execution time: 20–60 seconds (avg ~40s)
- Frequency: 1 execution per hour

### 2. Reminders & Pending Tasks
- Examples: check pending workflows, send notifications (email, webhook, queue messages), trigger periodic application-level checks
- Typical execution time: 1–10 seconds (avg ~5s)
- Frequency: every 10 minutes

### 3. Data Lifecycle Management
- Examples: archiving old documents, moving data between storage tiers, expiring or reclassifying items
- Typical execution time: 5–30 seconds (avg ~15s)
- Frequency: every 2 hours

### Estimated monthly executions

| Task Type | Frequency | Monthly Executions |
|---|---|---|
| Database Cleanup | 1/hour | ~720 |
| Reminders | 1/10 min | ~4,300 |
| Data Lifecycle | 1/2 hours | ~360 |
| **Total (background only)** | | **~5,400/month** |

**Average memory per execution:** 512 MB (0.5 GB). Well within serverless best practices — no premium or dedicated hosting required.

---

## Key Differences: Staging vs Production

| Aspect | Staging | Production |
|---|---|---|
| Traffic | Much lower | National scale |
| Concurrency | Low, intermittent | Moderate, sustained |
| Database footprint | 5–20 GB | Hundreds of GB → TB |
| Storage footprint | < 50 GB | 1 TB+ |
| Log retention | 30 days | 90 days |
| Scaling | Cost-optimized, manual | Autoscale enabled |
| Client SLA | None | Production-grade |
| Data | Disposable, resettable | Durable, long-term |
| AI usage (mature) | ~1,000/month | 10,000+/month |

# Risks and Limitations

This document consolidates the known technical risks, single points of failure, critical external dependencies, and inherent system limitations of the Huella Latam platform. It is intended to inform architecture decisions, operational planning, and client expectation-setting.

---

## Known Technical Risks

### Database Migration Rollback

Prisma does not provide automatic migration rollback. Once a migration is applied — especially destructive ones (column drops, table renames, constraint changes) — reverting requires a manually written `down` migration or a database restore.

**Mitigations:**
- Always write a manual rollback script before applying destructive migrations.
- Apply migrations in Staging first and validate for at least one full working day.
- Never drop columns in the same migration that removes them from application code; use a two-phase approach (stop writing → verify → drop).
- Keep automated backups enabled so a restore is always available as the last resort.

### JWKS Key Cache During Rotation

The JWKS authentication provider caches signing keys for 10 minutes. During an Entra ID key rotation event, tokens signed with the new key will fail validation for up to 10 minutes until the cache refreshes.

**Mitigations:**
- Microsoft Entra ID key rotations are announced in advance and are infrequent.
- Evaluate shortening the cache TTL if the platform moves to high-frequency rotations.
- Monitor 401 error spikes after any known key rotation event.

### `BOOTSTRAP_SUPERADMIN` Left Enabled in Production

The `BOOTSTRAP_SUPERADMIN` environment variable auto-promotes the first resolved user to SUPERADMIN on their initial login. If accidentally left set to `true` in a Production environment, any new user who logs in before a legitimate SUPERADMIN is established can claim the highest system privilege.

**Mitigations:**
- Unset or explicitly set `BOOTSTRAP_SUPERADMIN=false` before any Production deployment after the first SUPERADMIN account is established.
- Include a post-deployment checklist item to verify this value via Key Vault.
- Audit the SUPERADMIN role assignment after every environment promotion.

### Growing Database and Migration Risk Over Time

Production database size is expected to double roughly every year, reaching hundreds of GB to TB scale. As the schema matures and data volume grows, the cost and risk of schema migrations increases significantly — long-running `ALTER TABLE` operations can cause table locks and elevated error rates.

**Mitigations:**
- Plan schema changes earlier in the development cycle to avoid rushed migrations.
- For tables exceeding ~10 million rows, evaluate online schema change tools (e.g., `pg_repack`, Azure Database for PostgreSQL online DDL support).
- Coordinate migration windows with stakeholders in Production.

### Single App Service Instance in Staging

Staging runs with a single App Service instance (no scaling). A deployment or restart causes full downtime for Staging users, including during active demos or pilot tests.

**Mitigations:**
- Schedule deployments outside demo windows.
- Notify all Staging users before deploying.
- Accept this as a known cost/reliability trade-off for Staging.

### Container Image Tagging

If Docker images are tagged with `latest` instead of an immutable identifier (e.g., the git commit SHA), it becomes impossible to precisely identify which version is running or to reliably roll back to a specific prior version.

**Mitigations:**
- Always tag production images with the git commit SHA as part of the CI/CD pipeline.
- Retain the `latest` tag only as a convenience reference, never as the deployment source of truth.
- Azure Container Registry retains previous images; rollback requires updating the App Service image tag to the previous SHA.

### Features Planned but Not Yet Implemented

Several components referenced in architecture and requirements documents are not yet present in the codebase:

| Feature | Status | Risk |
|---|---|---|
| Azure Functions (background tasks) | Not implemented | No automated cleanup, reminders, or lifecycle management yet |
| Azure OpenAI + AI Search (RAG) | Not implemented | AI-assisted document analysis is unavailable |
| Application Insights / Azure Monitor | Not implemented | Observability relies on stdout (Pino) only |
| Azure Communication Services (email) | Not implemented | No transactional email delivery |
| Internationalization (i18n) | Not implemented | Platform is Spanish-only |
| Redis / connection pooling (PgBouncer) | Not planned | Under load, database connection count may become a bottleneck |

Shipping any of these services introduces integration risk proportional to their absence in the current test suite.

---

## Single Points of Failure

### PostgreSQL Flexible Server

All application data — organizations, users, carbon inventories, certification records — resides in a single PostgreSQL Flexible Server instance. High Availability (HA) with a standby replica is not enabled in the initial Production configuration.

**Impact:** A server failure causes complete application downtime. Recovery depends on Azure's automated failover (if HA is later enabled) or a manual restore from backup.

**Risk threshold:** Acceptable for initial rollout. HA should be enabled when Production reaches sustained daily usage and when RPO ≤ 15 min becomes a hard contractual requirement.

### Microsoft Entra ID (Authentication)

Every user-facing request requires a valid token issued by Azure Entra ID. If the Entra ID tenant or the app registration becomes unavailable, no user can authenticate. The entire platform is effectively offline for authenticated users, even if the API and database are healthy.

**Impact:** Complete user lockout. No fallback authentication mechanism exists.

**Mitigations:**
- Entra ID is a highly available Microsoft-managed service with strong SLA coverage.
- Monitor authentication failure rates as a leading indicator.
- Maintain contact with the client IT team who administers the Entra tenant.

### Azure Blob Storage (File Access)

All uploaded documents, images, and generated PDF reports are stored in Azure Blob Storage. Access to these files is provided exclusively via short-lived SAS URLs generated by the API. If Blob Storage is unavailable, all file operations fail — uploads, downloads, and PDF report generation.

**Impact:** Users cannot upload or retrieve documents. Report generation fails.

**Mitigations:**
- Production uses ZRS (Zone-Redundant Storage), which survives availability zone failures.
- No application-level fallback to an alternative storage backend exists.

### Azure Container Registry (API Deployments)

Every API deployment pulls the container image from Azure Container Registry. If ACR is unavailable at deployment time, CI/CD pipelines cannot deploy new versions. Running instances are unaffected (they continue running the last successfully pulled image).

**Impact:** Deployment pipelines fail; rollbacks and hotfixes cannot be deployed.

**Mitigations:**
- ACR is not on the critical path for runtime operation, only for deployments.
- Keep the last known-good image tag documented for emergency manual redeployment.

### GitHub and CI/CD Pipeline

All infrastructure changes and application deployments are gated through GitHub Actions. If GitHub is unavailable or the OIDC federation between GitHub and Azure is broken, no deployments or infrastructure changes can be applied.

**Impact:** Hotfixes and rollbacks require manual intervention outside the pipeline.

**Mitigations:**
- Document an emergency manual deployment procedure (manual `az deployment` and `az webapp` commands) in the runbook.
- The OIDC federated credential must be kept valid and rotated according to the app registration lifecycle.

### Azure OpenAI (AI Features)

When AI features are active, all LLM inference runs on Azure OpenAI — a managed external service. There is no local fallback or alternative model endpoint.

**Impact:** All AI-assisted document analysis and RAG features become unavailable. The rest of the application continues to operate normally.

**Mitigations:**
- AI features are user-triggered, not on the critical path for core registry operations.
- Implement graceful degradation in AI-consuming endpoints (return a clear error; do not block non-AI workflows).

---

## Critical Dependencies

| Dependency | Used For | Failure Impact | Owned By |
|---|---|---|---|
| **Microsoft Azure** | All infrastructure (compute, storage, DB, networking) | Complete platform outage | Client IT / Microsoft |
| **Azure Entra ID** | User authentication and token issuance | Full user lockout | Client IT |
| **PostgreSQL Flexible Server** | All application data persistence | Complete application failure | Azure (managed) |
| **Azure Blob Storage** | File uploads, document storage, SAS URL generation | File operations unavailable | Azure (managed) |
| **Azure Container Registry** | API container image hosting | Deployments blocked | Azure (managed) |
| **GitHub** | Source control, CI/CD orchestration, OIDC federation | Deployments and infra changes blocked | GitHub / Anthropic-owned org |
| **Azure Bicep + Azure CLI** | Infrastructure provisioning | IaC deployments fail | Microsoft (open source) |
| **Azure OpenAI** | LLM inference and embedding generation (AI features) | AI features unavailable | Microsoft (managed service) |
| **Azure AI Search** | RAG document index and retrieval (AI features) | RAG features unavailable | Microsoft (managed service) |
| **Azure Communication Services** | Transactional email delivery | No email notifications | Microsoft (managed service) |
| **Node.js / pnpm** | Runtime and package management | Build and runtime failures | Open source ecosystem |
| **Prisma ORM** | Database access and migrations | All data access fails | Open source (Prisma Inc.) |

### Dependency Risk Notes

**Azure platform concentration:** The entire platform runs on a single cloud provider. A region-level Azure outage would take down all services simultaneously. Multi-region or multi-cloud architecture is out of scope for the current delivery but should be revisited if the platform reaches national critical-infrastructure classification.

**Entra External ID tenant:** The authentication tenant is provisioned and administered by the client IT team, not the project team. Any misconfiguration, app registration expiry, or policy change on the tenant side directly impacts the platform's ability to authenticate users. Coordination protocols between the IT team and project team are essential.

**Open-source package ecosystem:** The monorepo has a large number of npm dependencies. Supply chain compromises (malicious packages, breaking changes) are a persistent industry-wide risk. The `pnpm` lockfile pins exact versions; dependency updates should go through the standard PR review process, not be applied automatically.

---

## System Limitations

### Spanish-Only Interface

All user-facing strings, labels, error messages, and date/number formats are hardcoded in Spanish (`"es"` locale). There is no internationalization (i18n) infrastructure in place. Deploying the platform in a country where Spanish is not the primary language — or supporting multilingual organizations — requires implementing the i18n plan described in [Internationalization Plan](../development/i18n-plan.md) first.

### No Offline Mode

The platform requires continuous connectivity to Azure services. There is no offline mode, local-first data sync, or Progressive Web App (PWA) caching strategy. Users in areas with unreliable internet connectivity will experience degraded reliability.

### No Batch or Bulk User Operations

By design, the system does not support user-triggered bulk operations (e.g., bulk document upload, bulk status changes, bulk exports). All operations are single-entity, user-initiated API calls. Bulk data ingestion or mass updates must be performed via direct database operations with DBA involvement.

### No Rate Limiting

The API does not currently implement per-user or per-IP rate limiting. Under sustained abuse or accidental client-side retry storms, the database connection pool and App Service compute can become saturated. This is acceptable at current DAU levels (≤ 200) but becomes a risk as adoption grows.

**Recommended action:** Implement rate limiting (e.g., via `@fastify/rate-limit` with Redis backend) before the platform reaches national-scale traffic.

### No Connection Pooling (PgBouncer)

The API connects directly to PostgreSQL without a connection pooler. Each App Service instance maintains its own pool. Under horizontal scaling (multiple instances), the total number of simultaneous database connections can approach PostgreSQL's connection limit.

With PostgreSQL Flexible Server D4ds v5 (Production SKU), the default `max_connections` is approximately 860. At 3+ App Service instances with default Prisma pool settings, this limit can be reached under load.

**Recommended action:** Deploy PgBouncer (as a sidecar or as Azure Database for PostgreSQL's built-in PgBouncer feature) before enabling aggressive horizontal autoscaling.

### Observability Not Yet Wired to Azure

Application Insights and Azure Monitor are provisioned in the infrastructure plan but are not yet integrated into the application code. Current observability relies exclusively on Pino structured logs written to stdout, which are available via App Service log streaming and Log Analytics ingestion but without APM-level tracing or distributed correlation.

**Impact:** No request-level tracing, no dependency maps, no availability tests, no automated alerting — until Application Insights is instrumented.

### Static Web App Rollback Requires Redeployment

Azure Static Web Apps does not support instant slot-based rollback. Rolling back the frontend to a previous version requires re-triggering the CI/CD pipeline with a previous git tag. In a critical incident, this adds deployment pipeline latency (~5–10 minutes) to the recovery time.

**Mitigations:**
- Document the exact rollback procedure in the [Operations Runbook](./runbook.md).
- Keep git tags for every Production frontend release so the rollback target is always unambiguous.

### Database Growth and Long-Term Manageability

With storage expected to reach TB scale and doubling yearly, several operational concerns grow over time:

- **Backup and restore time** increases with data volume. Point-in-time restore that takes minutes today may take hours at TB scale.
- **Index maintenance** becomes more expensive; `VACUUM` and `ANALYZE` operations take longer.
- **Query performance** on large tables requires periodic review of indexes and query plans.
- **Migration cost** for schema changes on large tables increases linearly with row count.

These are not blockers today but require proactive capacity and maintenance planning as adoption grows.

### AI Features: No Cost Cap or Throttling

Azure OpenAI usage is billed per token. There is no application-level guardrail (max tokens per user per day, per organization per month) preventing runaway AI usage costs. At production scale (10,000+ AI requests/month), unexpected usage spikes directly translate to cost overruns.

**Recommended action:** Implement usage quotas per organization and per user before national rollout of AI features.

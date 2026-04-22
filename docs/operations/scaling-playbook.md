# Performance and Scaling Playbook

This document consolidates scaling guidance for the Huella Latam platform: when to act, what to deploy, and how to configure each scaling lever. It translates the risks identified in [Risks and Limitations](./risks-and-limitations.md) into concrete operational decisions.

---

## Scaling Decision Framework

Before changing any configuration, measure first. The triggers below are guidance, not hard thresholds — your actual numbers depend on workload shape, usage patterns, and the PostgreSQL SKU in use.

| Signal | Metric to watch | Tooling |
|---|---|---|
| API response latency rising | p95 response time > 2 s | App Service metrics / Application Insights |
| Database CPU sustained high | CPU utilization > 70% for > 15 min | Azure Monitor → PostgreSQL metrics |
| Database connections approaching limit | Active connections > 60% of `max_connections` | `pg_stat_activity` / PostgreSQL metrics |
| Memory pressure | Working set > 70% of instance RAM | App Service metrics |
| Rate limiting ineffective | 429 responses not uniformly distributed across users | API logs (Pino structured output) |

---

## App Service: Vertical Scale-Up

**When:** Single-instance CPU or memory is consistently high, before adding more instances.

**Action:** Upgrade the App Service Plan SKU.

```bash
az appservice plan update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<plan-name>" \
  --sku P2v3    # or P3v3 for larger workloads
```

**SKU progression:**

| SKU | vCPU | RAM | Use case |
|---|---|---|---|
| B2 | 2 | 3.5 GB | Initial staging |
| P1v3 | 1 | 8 GB | Low-traffic production |
| P2v3 | 2 | 16 GB | Standard production |
| P3v3 | 4 | 32 GB | High-traffic or memory-intensive |

Scale-up is instant (restart required) and does not require code changes. It is the safest first step.

---

## App Service: Horizontal Scale-Out

**When:** Vertical scaling is exhausted or cost-inefficient, and CPU is the bottleneck rather than memory.

**Action:** Increase the instance count on the App Service Plan.

```bash
az appservice plan update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<plan-name>" \
  --number-of-workers 3
```

**Prerequisites before scaling out:**

1. **Redis-backed rate limiting** — the in-memory rate limiter is per-instance. With 3 instances, the effective rate limit is 3× the configured value. Back the `@fastify/rate-limit` store with Azure Cache for Redis before enabling multiple instances.
2. **PgBouncer** — each instance opens its own database connection pool. Without connection pooling, 3 instances at default Prisma pool settings (default pool: 5 connections) can push past the recommended connection threshold on smaller PostgreSQL SKUs.

Both prerequisites are described in detail below.

---

## Redis-Backed Rate Limiting

**Problem:** The API's `@fastify/rate-limit` store is in-memory. Each App Service instance tracks request counts independently, making the effective per-IP limit `100 × instance_count`.

**Solution:** Provision Azure Cache for Redis and configure the rate limiter to use it as the shared store.

### Provision Redis

```bash
az redis create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<redis-name>" \
  --location "<location>" \
  --sku Basic \
  --vm-size C1
```

For production, use the **Standard** tier (with replication) rather than Basic.

### Configure the API

Add the Redis connection string to the App Service environment variables (sourced from Key Vault):

```bash
REDIS_URL=rediss://<redis-name>.redis.cache.windows.net:6380?password=<access-key>
```

Update the Fastify rate-limit plugin registration to use the `@fastify/rate-limit` Redis store adapter:

```typescript
// apps/api/src/plugins/external/rateLimiter.ts
import fastifyRateLimit from "@fastify/rate-limit";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

await fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "1 minute",
  redis: redisClient,
});
```

**Trigger for action:** Before enabling more than one App Service instance.

---

## PgBouncer: Connection Pooling

**Problem:** Without connection pooling, each App Service instance opens up to `pool_size` connections directly to PostgreSQL. With 3+ instances and the default Prisma pool size, connection counts approach the `max_connections` limit on typical Azure PostgreSQL SKUs.

**PostgreSQL Flexible Server connection limits by SKU:**

| SKU | `max_connections` (approx.) |
|---|---|
| D2ds v5 (2 vCPU, 8 GB) | ~432 |
| D4ds v5 (4 vCPU, 16 GB) | ~860 |
| D8ds v5 (8 vCPU, 32 GB) | ~1720 |

With 3 App Service instances and Prisma's default pool of 5 connections: `3 × 5 = 15` connections minimum. This seems comfortable, but connection bursts during high load can multiply this significantly.

**Solution options:**

### Option A — Azure Database for PostgreSQL Built-in PgBouncer (recommended)

Azure PostgreSQL Flexible Server includes PgBouncer as a managed feature. Enable it via the Azure Portal or CLI:

```bash
az postgres flexible-server update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --set pgBouncer.enabled=true
```

Update `DATABASE_URL` in the App Service to use the PgBouncer port (typically `5432` → `6432`):
```
postgresql://<user>@<server>:6432/<db>?sslmode=require&pgbouncer=true
```

Also add `&connection_limit=1` to the Prisma connection URL when using PgBouncer in transaction mode (prevents prepared statement conflicts).

### Option B — PgBouncer as a Sidecar Container

For custom pooling configuration, deploy PgBouncer as a sidecar alongside the API in a multi-container App Service setup. This gives full control over pool mode, pool size, and auth settings.

**When to act:** When the total active connection count from `pg_stat_activity` exceeds 50% of `max_connections` under normal (non-peak) load. Do not wait for connection exhaustion — connection errors cascade and cause API failures.

---

## PostgreSQL: Vertical Scale-Up

**When:** Database CPU is the bottleneck, or `max_connections` requires a larger SKU.

```bash
az postgres flexible-server update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --tier GeneralPurpose \
  --sku-name Standard_D4ds_v5
```

This operation requires a brief maintenance window (typically < 1 minute on Flexible Server).

**SKU guidance:**

| Use case | Recommended SKU |
|---|---|
| Staging | B2ms (Burstable, 2 vCPU, 8 GB) |
| Production initial | D4ds v5 (4 vCPU, 16 GB) |
| Production at scale | D8ds v5 (8 vCPU, 32 GB) or higher |

---

## PostgreSQL: High Availability

**Problem:** The initial production configuration uses a single PostgreSQL instance. A server failure requires a manual restore from backup, causing extended downtime.

**When to enable HA:** When the platform reaches sustained daily usage and an RPO (Recovery Point Objective) of ≤ 15 minutes or an RTO (Recovery Time Objective) of ≤ 1 minute becomes a contractual or operational requirement.

**Action:** Enable zone-redundant HA on the PostgreSQL Flexible Server:

```bash
az postgres flexible-server update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --high-availability ZoneRedundant
```

This adds a hot standby in a different availability zone. Failover is automatic (typically < 60 seconds) with no connection string change required.

**Cost impact:** HA roughly doubles the database compute cost.

---

## Caching: Azure Cache for Redis

Beyond rate limiting, Redis can be used to cache expensive, infrequently-changing read results (e.g., transparency portal data, reference data like emission factors and methodologies).

**Candidates for caching:**

| Endpoint | Cache TTL (suggested) | Justification |
|---|---|---|
| `GET /api/transparency` | 60–300 seconds | Public endpoint; read-heavy; data changes only on approval events |
| `GET /emission-factors` | 600 seconds | Reference data; changes only during methodology updates |
| `GET /countries` / `GET /sectors` | 3600 seconds | Seed data; changes only during deployments |

**Implementation pattern:**

```typescript
const cacheKey = `transparency:${year ?? "all"}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await getTransparencyDataService(year);
await redis.setEx(cacheKey, 120, JSON.stringify(data));
return data;
```

Invalidate the cache on relevant status changes (e.g., when a submission is approved, invalidate the transparency cache).

---

## Application Insights Integration

Current observability relies on Pino structured logs written to stdout — there is no distributed tracing or application-level alerting.

**When to integrate Application Insights:** Before a production launch with sustained user traffic. Without Application Insights, slow endpoints are hard to identify, and errors that do not cause 500s (e.g., slow queries, rising latency) go undetected.

**How to add it:**

1. Provision Application Insights in the same resource group (already included in the infrastructure Bicep modules).
2. Install the Node.js SDK: `pnpm add @azure/monitor-opentelemetry`
3. Bootstrap OpenTelemetry at the API entry point before Fastify starts.
4. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` in the App Service environment (from Key Vault).

This gives:
- Request/response tracing with latency percentiles
- Dependency tracking (PostgreSQL query duration, Blob Storage calls)
- Exception telemetry with stack traces
- Live Metrics and custom alerts

---

## Large Inventory Migration Strategy

As database size grows to hundreds of GB and schema changes become riskier:

| Table size | Recommended approach |
|---|---|
| < 10M rows | Standard `ALTER TABLE` via Prisma migrations |
| 10M – 100M rows | Schedule maintenance window; run during off-hours; pre-create a manual backup |
| > 100M rows | Use `pg_repack` or an online schema change tool; coordinate with stakeholders |

**Two-phase column removal pattern:**
1. **Phase 1:** Remove all writes to the column in application code; deploy.
2. **Phase 2 (next release):** Drop the column from the schema; run migration.

This avoids locking the table while the application is still writing to the column.

---

## Scaling Checklist

Use this checklist when planning a scale-out event (going from 1 to N instances):

- [ ] Redis instance provisioned and `REDIS_URL` configured in App Service
- [ ] Rate limiter updated to use Redis store
- [ ] PgBouncer enabled (Azure built-in or sidecar)
- [ ] `DATABASE_URL` updated to PgBouncer port with `?pgbouncer=true`
- [ ] Prisma `connection_limit=1` set if using transaction mode PgBouncer
- [ ] PostgreSQL `max_connections` verified against projected connection count
- [ ] App Service Plan SKU verified (minimum P2v3 for multi-instance)
- [ ] Load tested in Staging before applying to Production
- [ ] Application Insights configured to observe the scaled environment
- [ ] Autoscale rules defined (CPU > 70% trigger scale-out, CPU < 30% trigger scale-in)

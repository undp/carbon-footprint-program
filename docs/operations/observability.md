# Observability: Logs, Metrics, and Alerts

This document describes the current observability setup and recommendations for improving monitoring in production.

---

## Current State

### Logging (Pino)

The API uses **Pino** — Fastify's native structured JSON logger. All log entries are emitted as JSON to stdout.

**Log levels:**

| Level | When |
|---|---|
| `debug` | Verbose output for development (default in `NODE_ENV=development`) |
| `info` | Default for production |
| `warn` | Non-critical issues |
| `error` | Unhandled errors or request failures |

**Configure log level:**
```bash
export LOG_LEVEL="info"   # Options: debug, info, warn, error
```

**Local development — pretty-print logs:**
```bash
pnpm dev:api | npx pino-pretty
```
`pino-pretty` is included as a dev dependency in `apps/api`.

**What is logged:**
- All incoming HTTP requests (method, URL, status, response time) — Fastify built-in
- Unhandled errors and stack traces
- Application startup events (server listening, plugins loaded)
- Explicit `server.log.info(...)` / `server.log.error(...)` calls within handlers

**Azure App Service:** stdout logs are available in Azure Portal under **App Service → Log Stream** or by enabling **Application Logging** to Azure Blob Storage or Log Analytics.

---

## Recommended Observability Stack

The following tools are **not yet implemented** but strongly recommended for production deployments.

### 1. Structured Log Collection — Azure Log Analytics

**Purpose:** Centralize and query all application logs.

**Setup:**
1. In Azure Portal, create a **Log Analytics Workspace**
2. In the App Service, enable **Diagnostic Settings** → send logs to the workspace
3. Query logs with KQL (Kusto Query Language)

```kql
// Example: find all 5xx errors in the last 24 hours
AppServiceHTTPLogs
| where TimeGenerated > ago(24h)
| where ScStatus >= 500
| project TimeGenerated, CsMethod, CsUriStem, ScStatus, TimeTaken
| order by TimeGenerated desc
```

**Alternative — OpenTelemetry + any backend:**
The API could be instrumented with [OpenTelemetry for Node.js](https://opentelemetry.io/docs/languages/js/) to export structured traces and metrics to any OTLP-compatible backend (Grafana Tempo, Jaeger, Azure Monitor, etc.).

---

### 2. Metrics — Azure Monitor or Prometheus + Grafana

#### Option A: Azure Monitor (recommended for Azure-native deployments)

Azure Monitor is already available for all App Service and PostgreSQL resources. No additional setup needed to get basic infrastructure metrics.

**Built-in metrics available out of the box:**
- App Service: CPU %, Memory %, HTTP request rate, response times, 5xx error rate
- PostgreSQL: CPU %, Storage %, Active connections, I/O throughput
- Blob Storage: Blob count, storage capacity, transactions

**Enable:**
- Azure Portal → App Service → Metrics → select metric → pin to Dashboard

#### Option B: Prometheus + Grafana (recommended for self-hosted or more detailed metrics)

For application-level metrics (request duration histograms, custom business metrics), add a Prometheus metrics endpoint to Fastify:

```bash
pnpm --filter api add @fastify/metrics prom-client
```

Then expose `/metrics` and scrape with Prometheus. Visualize in Grafana with pre-built Node.js and PostgreSQL dashboards.

**Useful dashboards:**
- [Node.js Application Dashboard](https://grafana.com/grafana/dashboards/11159)
- [PostgreSQL Dashboard](https://grafana.com/grafana/dashboards/9628)

**Deployment options for Prometheus + Grafana on Azure:**
- Azure Container Apps (serverless, pay-per-use)
- Azure VM with Docker Compose
- Azure Kubernetes Service (for larger deployments)

---

### 3. Application Performance Monitoring — Azure Application Insights

Azure Application Insights provides end-to-end request tracing, dependency tracking, and frontend behavior analytics.

**Backend integration:**
```bash
pnpm --filter api add applicationinsights
```

```typescript
// apps/api/src/server.ts (before any other import)
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
```

**Frontend integration:**
```bash
pnpm --filter web add @microsoft/applicationinsights-web
```

**What it provides:**
- Request traces with dependency calls (DB queries, storage)
- Error tracking with stack traces
- Performance baselines and anomaly detection
- User behavior analytics (page views, session duration)
- Availability tests (ping checks)

---

### 4. Alerts

Once metrics are available (via Azure Monitor, Prometheus, or App Insights), configure alerts for:

**Critical alerts (page immediately):**

| Alert | Condition | Recommended threshold |
|---|---|---|
| API 5xx error rate | HTTP 5xx > N requests/min | > 5 errors/min for 5 min |
| API response time P95 | P95 latency > N ms | > 3000 ms for 5 min |
| API unavailability | Health check fails | 2 consecutive failures |
| PostgreSQL CPU | CPU > N% | > 85% for 10 min |
| PostgreSQL connections | Active connections > N | > 80% of max |
| Disk usage | Storage > N% | > 80% |

**Warning alerts (non-urgent):**

| Alert | Condition |
|---|---|
| App Service CPU | > 70% for 15 min |
| App Service memory | > 80% for 15 min |
| PostgreSQL storage | > 70% used |
| Failed login attempts | > 50/min |

**Setup in Azure Monitor:**
1. Azure Portal → Monitor → Alerts → Create alert rule
2. Select the resource (App Service, PostgreSQL)
3. Select the signal (metric condition)
4. Configure action group (email, SMS, webhook, PagerDuty, etc.)

---

### 5. Uptime Monitoring

Configure an external HTTP probe to verify the API is responding:

**Option A: Azure Application Insights Availability Tests**
- Pings `https://<api-url>/api/health` every 5 minutes from multiple regions
- Alerts on failures

**Option B: UptimeRobot, Betterstack, or similar**
- Free tier available
- Simple HTTP monitoring with email/Slack alerts

---

### 6. Log Retention

| Environment | Recommended log retention |
|---|---|
| Development | 3–7 days |
| Staging | 14–30 days |
| Production | 90–180 days (compliance may require longer) |

Configure in Azure Log Analytics workspace settings.

---

## Recommended Priority Order

For a new production deployment, implement in this order:

1. **Azure Log Analytics** — centralize existing Pino logs immediately
2. **Azure Monitor alerts** — critical alerts for uptime and errors (no code changes needed)
3. **Azure App Insights** — add APM tracing to API and frontend
4. **Prometheus + Grafana** — if custom application metrics are needed
5. **Uptime monitoring** — external probe for public endpoint health

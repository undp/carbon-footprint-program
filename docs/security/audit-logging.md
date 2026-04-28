# Audit and Logging

This document describes the logging architecture, what security-relevant events are recorded, how sensitive fields are redacted, and the current state of the observability stack — including what is implemented and what is planned.

---

## Logging Stack

| Component                          | Technology                              | Status                                            |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------- |
| Structured logger                  | Pino (built into Fastify)               | Implemented                                       |
| Log transport                      | stdout (collected by Azure App Service) | Implemented                                       |
| Log aggregation                    | Azure Log Analytics Workspace           | Provisioned; App Service integration required     |
| Application Performance Monitoring | Application Insights                    | Provisioned; SDK not yet instrumented in app code |
| Distributed tracing                | Application Insights (planned)          | Not implemented                                   |
| Security alerts                    | Azure Monitor alert rules               | Not configured                                    |

All log output is structured JSON written to stdout. In production, Azure App Service streams stdout to the connected Log Analytics Workspace, where logs are queryable via KQL (Kusto Query Language).

---

## Log Levels and Configuration

The Pino logger is configured in `apps/api/src/app.ts`:

| Environment | Log level | Effect                                                            |
| ----------- | --------- | ----------------------------------------------------------------- |
| Production  | `info`    | Request/response summaries, warnings, errors                      |
| Development | `debug`   | All of the above plus verbose plugin and auth diagnostic messages |

Log level in Production is set to `info` to avoid excessive verbosity while ensuring all security-relevant events at `info`, `warn`, and `error` levels are recorded.

---

## Per-Request Logging

Every HTTP request handled by the API produces a structured log entry containing:

| Field            | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `reqId`          | UUID generated per request — correlates all log lines for a single request |
| `req.method`     | HTTP method (`GET`, `POST`, etc.)                                          |
| `req.url`        | Full request URL including path and query string                           |
| `req.params`     | Parsed path parameters                                                     |
| `res.statusCode` | HTTP response status code                                                  |
| `responseTime`   | Request duration in milliseconds                                           |

These fields are present on every request/response pair and provide a baseline audit trail of all API activity.

---

## Sensitive Field Redaction

Pino is configured to redact the following fields from all log output:

| Redacted path               | Reason                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| `req.headers.authorization` | Contains the Bearer token — must never appear in logs                            |
| `req.headers.cookie`        | May contain session or auth cookies                                              |
| `req.body.password`         | Defense-in-depth; passwords are not stored, but this prevents accidental leakage |

Redacted fields appear as `"[Redacted]"` in log output. Token values, credential material, and passwords are never written to logs in any form.

---

## Security Event Logging

The following security-relevant events are explicitly logged by the application:

### Authentication events

| Event                                         | Level   | Fields logged |
| --------------------------------------------- | ------- | ------------- |
| Auth provider disabled (`AUTH_PROVIDER=none`) | `debug` | Message only  |
| Token validation failure                      | `warn`  | Error message |
| Auth plugin registered                        | `info`  | Provider name |

Location: `apps/api/src/plugins/app/authenticationPlugin.ts`

### Authorization events

| Event                                        | Level   | Fields logged                         |
| -------------------------------------------- | ------- | ------------------------------------- |
| Public route accessed (no auth check)        | `debug` | Route path                            |
| Unauthenticated request to protected route   | `warn`  | —                                     |
| User resolved from token but not found in DB | `warn`  | `idpUserId`                           |
| Insufficient system role                     | `warn`  | `userId`, `userRole`, `requiredRoles` |
| Authorization granted                        | `debug` | —                                     |

Location: `apps/api/src/plugins/app/authorizationPlugin.ts`

### User lifecycle events

| Event                                    | Level   | Fields logged        |
| ---------------------------------------- | ------- | -------------------- |
| New user auto-provisioned on first login | `info`  | `idpUserId`          |
| User record created                      | `info`  | `userId`             |
| User resolution failure (DB error)       | `error` | `error`, `idpUserId` |

Location: `apps/api/src/plugins/app/userResolvePlugin.ts`

### What is NOT explicitly logged

- Successful data access (reads/writes to individual records)
- Organization membership changes
- File uploads and downloads
- Submission status transitions

These events are traceable via the `createdById`/`updatedById` database fields (see [Database Audit Trail](#database-audit-trail) below), but they do not produce explicit security log entries.

System role changes are exempt: they are persisted in the dedicated `UserRoleAudit` table (see [User role transitions](#user-role-transitions-userroleaudit)), which records every transition with its actor and timestamp.

---

## Database Audit Trail

Most domain models carry implicit audit fields:

| Field         | Type               | Present on         |
| ------------- | ------------------ | ------------------ |
| `createdAt`   | DateTime           | All major models   |
| `updatedAt`   | DateTime           | All major models   |
| `createdById` | BigInt (FK → User) | Most domain models |
| `updatedById` | BigInt (FK → User) | Most domain models |

These fields record _who_ made a change and _when_, providing a lightweight audit trail for data modifications. They are set automatically by the application at write time.

**Limitation:** This is a "last writer wins" record — it captures the current creator/modifier but does not retain the full history of changes (previous values, all intermediate states). A complete audit log would require an event sourcing or change data capture (CDC) pattern.

### User role transitions (`UserRoleAudit`)

System role changes (`USER`/`ADMIN`/`SUPERADMIN`) are an exception to the "last writer wins" pattern: every role transition is recorded in the dedicated `UserRoleAudit` table. The insert is performed inside the same transaction that updates `User.role`, so the audit row is guaranteed to match the persisted role.

| Field          | Type      | Description                           |
| -------------- | --------- | ------------------------------------- |
| `id`           | BigInt PK | Audit row id                          |
| `userId`       | BigInt FK | User whose role changed               |
| `previousRole` | enum      | Role before the change                |
| `newRole`      | enum      | Role after the change                 |
| `changedById`  | BigInt FK | `SUPERADMIN` who performed the change |
| `createdAt`    | DateTime  | When the change happened              |

Foreign keys use `onDelete: Restrict` on both relations, so the database blocks deletion of any referenced user record (target or actor) while audit rows still point to it — preserving the audit trail by preventing the upstream delete rather than orphaning rows. No-op transitions (target role already equals new role) do not insert a row. The full history for a user is queryable via `GET /users/:id/role-history`.

### User access log (`UserAccessLog`)

Session-level access events are recorded in the `UserAccessLog` table. Every time a user starts a session (via `GET /users/me`), a timestamped row is inserted. This provides a complete history of when each user accessed the platform.

For full details on the data model, configuration, and admin UI integration, see [User Activity Tracking](../development/user-activity-tracking.md).

---

## Log Querying in Azure (Log Analytics)

Once App Service diagnostic settings are configured to route logs to Log Analytics, request logs are queryable via KQL. Example queries:

**All 4xx and 5xx responses in the last hour:**

```kql
AppServiceHTTPLogs
| where TimeGenerated > ago(1h)
| where ScStatus >= 400
| project TimeGenerated, CsMethod, CsUriStem, ScStatus, TimeTaken
| order by TimeGenerated desc
```

**Authorization failures from application logs:**

```kql
AppServiceConsoleLogs
| where TimeGenerated > ago(24h)
| where ResultDescription contains "Insufficient role"
| project TimeGenerated, ResultDescription
```

**Requests from a specific user (by correlating reqId):**

```kql
AppServiceConsoleLogs
| where TimeGenerated > ago(7d)
| where ResultDescription contains "<userId>"
| project TimeGenerated, ResultDescription
```

> These queries require App Service diagnostic settings to be enabled and routed to the Log Analytics Workspace. This is a configuration step that must be performed after initial infrastructure deployment.

---

## Application Insights (Planned)

Application Insights is provisioned in the infrastructure but the SDK is not yet instrumented in the application code. When implemented, it will provide:

| Capability                  | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| Distributed request tracing | End-to-end trace from HTTP request through DB query                      |
| Dependency tracking         | Automatic tracking of PostgreSQL and Blob Storage calls                  |
| Availability tests          | Synthetic health checks from multiple Azure regions                      |
| Custom events               | Application-defined events (e.g., "submission approved", "badge issued") |
| Smart alerts                | Anomaly detection on error rates and response times                      |
| Live metrics                | Real-time request rate, failure rate, server telemetry                   |

Instrumentation requires adding the `applicationinsights` Node.js SDK to the API and configuring the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.

---

## Log Retention

| Environment | Retention | Location                |
| ----------- | --------- | ----------------------- |
| Staging     | 30 days   | Log Analytics Workspace |
| Production  | 90 days   | Log Analytics Workspace |

Retention is configured at the Log Analytics Workspace level via Bicep. After the retention period, logs are automatically deleted. For compliance contexts requiring longer retention (e.g., regulatory audit periods), an Azure Storage export or long-term retention tier should be configured.

---

## Known Gaps and Recommendations

| Gap                                            | Risk                                                    | Recommendation                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| No explicit log for data access events         | Difficult to audit who accessed specific records        | Log read operations on sensitive resources (user PII, submission data) at `info` level          |
| No explicit log for file upload/download       | No audit trail for document access                      | Log file access events with userId, fileId, and action                                          |
| Application Insights not instrumented          | No distributed tracing or APM                           | Instrument SDK before Production launch                                                         |
| No security alert rules configured             | Anomalies in auth failures or error rates go unnoticed  | Configure Azure Monitor alerts for sustained 401/403 spikes and 5xx error rate thresholds       |
| App Service diagnostic settings not documented | Logs may not reach Log Analytics                        | Document and automate diagnostic settings configuration in Bicep or runbook                     |
| No structured security audit log table         | Compliance contexts may require immutable audit records | Consider a dedicated `AuditLog` table populated by service-layer hooks for sensitive operations |

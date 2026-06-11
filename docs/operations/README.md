# Operations

Running the Huella Latam platform in production: admin workflows, monitoring, incident response, known risks, and scaling guidance.

---

| Document                                                         | Description                                                                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Admin Operations Guide](./admin-guide.md)                       | Reviewing the submission queue, approving / reviewing / rejecting requests, and managing organizations as a platform admin                                  |
| [Observability](./observability.md)                              | Logs, metrics, alerts, and monitoring recommendations                                                                                                       |
| [Operations Runbook](./runbook.md)                               | Backup, restore, rollback procedures, incident severity levels, and response steps                                                                          |
| [Risks and Limitations](./risks-and-limitations.md)              | Known technical risks, single points of failure, critical external dependencies, and inherent system limitations                                            |
| [Performance and Scaling Playbook](./scaling-playbook.md)        | Metric-based decision criteria for App Service scale-out, Redis-backed rate limiting, PgBouncer, PostgreSQL HA, and Application Insights integration        |
| [Docker Compose — Full Stack](./docker-compose.md)               | The dev compose scenario: services overview, env configuration, auth + storage SP setup (portal + CLI), common workflows, troubleshooting                   |
| [Production Deployment (on-premise)](./production-deployment.md) | The `prod-external-db` scenario against an external PostgreSQL: env setup, DB roles & privileges, manual migrations/seed runbook, air-gapped image delivery |
| [Deployment Scenarios](../../deploy/README.md)                   | The compose layering system: production-grade base + component overlays, env-file-selected scenarios, conventions for adding new ones                       |
| [Web App Docker Image](./web-docker.md)                          | Reference for the `apps/web` container image: architecture, build args, standalone build/run                                                                |

# Security

Security model, controls, and compliance considerations for the Huella Latam platform. Covers authentication, authorization, data protection, secrets management, infrastructure hardening, and audit logging.

---

| Document                                       | Description                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Authentication](./authentication.md)          | Authentication providers (`jwks`, `easy-auth`, `forced-user`, `none`), token validation, JWKS key caching, and provider selection guidance              |
| [Route Access Modes](./route-access-modes.md)  | Per-route access mode flags — private (default), `allowPublicAccess`, `allowAnonymousAccess` — and when to use each                                     |
| [RBAC and Authorization](./rbac.md)            | Role model (system roles + organization roles), authorization plugins (`requireAuth`, `requireRoles`, `requireOrganizationRole`), and permission matrix |
| [Sensitive Data Handling](./sensitive-data.md) | PII inventory, encryption at rest and in transit, and Latin American data protection compliance considerations                                          |
| [Secrets Management](./secrets.md)             | Managed identities, Key Vault integration, environment variable classification, and anti-patterns to avoid                                              |
| [Infrastructure Hardening](./hardening.md)     | TLS configuration, CORS policy, security headers, network isolation, WAF, input validation, and pre-production checklist                                |
| [Audit and Logging](./audit-logging.md)        | Pino log structure, redacted fields, security event catalogue, and database audit trail                                                                 |

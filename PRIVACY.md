# Privacy Notice

This notice describes how the Huella Latam platform handles personal data, the rights of data subjects, and the responsibilities of adopting governments and organisations. It applies to the **upstream codebase** published at this repository. The platform is designed for independent, country-level deployment: each country instance is operated by an **adopting government or government-mandated agency**, which is the **data controller** for its own instance and may publish a country-specific addendum that supplements or supersedes this notice for its jurisdiction. The upstream maintainer team — United Nations Development Programme (UNDP) and its delivery partner — acts as a **processor** only when it receives logs or telemetry from country deployments under a separate Data Processing Agreement (DPA); it is not a controller of country data unless explicitly agreed in writing.

This document is intentionally aligned with the **DPGA Standard v1.1.6** (Indicators 7 and 9A) and the **UN Personal Data Protection and Privacy Principles** (UN System Chief Executives Board for Coordination, 2018).

---

## Roles and Responsibilities

- **Adopting government or agency** — data controller for all personal data submitted by organisations and users within its jurisdiction. Responsible for publishing a country-specific privacy notice, designating a data-protection contact, maintaining a legal basis for each processing activity, and fulfilling data-subject requests.
- **Reporting organisation** — data controller for the personal data of its own employees who use the platform; simultaneously a data subject with respect to any organisation-level identifiers (legal name, tax identifier, representative contact details) that the platform stores on its behalf.
- **Upstream maintainer team (UNDP and delivery partner)** — processor for any operational data that flows upstream (e.g., diagnostic telemetry shared under a DPA); not a controller of country data unless explicitly agreed. Responsible for maintaining the security and privacy properties of the shared codebase.
- **Each natural-person user** — data subject whose identity data (name, email, identity-provider subject identifier) is stored and processed by the platform.

---

## Data We Collect

The authoritative inventory of personal data fields is maintained in [`docs/security/sensitive-data.md`](docs/security/sensitive-data.md). The high-level categories are:

- **Account identifiers** — email address, given name, family name, identity-provider subject identifier (`oid` / `sub` claim), and identity-provider name. These are sourced from token claims issued by the configured identity provider (Microsoft Entra ID by default) at first login. The platform does not collect or store passwords.
- **Organisation identifiers** — registered legal name, trade name, tax identification number, registered address, and the full name, tax ID, phone number, and email address of the organisation's legal representative. This data is entered by users and is considered personally identifiable information (PII); tax identifiers may carry additional legal obligations in some jurisdictions.
- **Carbon-inventory and environmental data** — emission inventories, reduction projects, supporting submissions, and recognition records. This data is not personal data in itself, but may include uploaded supporting documents (e.g., utility bills, certificates) that contain PII such as addresses or names. Uploaded files are stored in Azure Blob Storage and accessed only via time-limited, signed URLs.
- **Audit-log entries** — per-request structured log records (HTTP method, URL, response status, response time, request correlation ID) and database-level audit fields (`createdAt`, `updatedAt`, `createdById`, `updatedById`) attached to most domain models. System-role changes are stored in the dedicated `UserRoleAudit` table. User access events are recorded in the `UserAccessLog` table.
- **Technical telemetry** — IP address and user-agent string captured as part of HTTP request logs; retained only as long as needed for security and abuse prevention (see Retention below).

The platform does **not** intentionally collect special categories of personal data as defined by GDPR Article 9 or equivalent provisions in Latin American data-protection laws — specifically, it does not collect or process data concerning health or medical conditions, racial or ethnic origin, religious beliefs, sexual orientation, political opinions, trade-union membership, or biometric data.

---

## Purposes and Legal Basis

- **Provide the service** — to authenticate users, authorise resource access, and deliver carbon-measurement and MRV (Monitoring, Reporting, and Verification) functionality. Legal basis: performance of a contract or exercise of a public task, depending on the deployment context.
- **Authenticate and authorise users** — to verify identity via the configured identity provider and enforce role-based access control. Legal basis: performance of a contract.
- **Audit, security, and abuse prevention** — to maintain append-only audit records, detect unauthorised access, and support incident response. Legal basis: legitimate interest of the controller and, where applicable, legal obligation.
- **National greenhouse-gas reporting and public-transparency outputs** — to support the adopting country's statutory reporting obligations and produce the public transparency portal listing accredited organisations and their recognition badges. Legal basis: public interest in environmental information; statutory obligations of the adopting country.
- **Aggregate, anonymised statistics for SDG and DPG reporting** — to support the upstream maintainer team's obligations as a Digital Public Good and UNDP programme reporting. All such statistics are anonymised and are never linked back to natural persons.

Marketing, profiling, and automated decision-making with legal effect are **not** purposes of this platform.

---

## Retention

- **Account data** — kept while the account is active and for the period required by applicable national archival rules in the deploying country. As a general reference, typical Latin American frameworks require retention for up to 5–6 years after the end of the processing relationship. Note: no automated account-deactivation or anonymisation pipeline is currently implemented; deletion requests must be fulfilled manually by platform administrators using direct database access. This is a known gap on the remediation roadmap (see Roadmap below).
- **Carbon-inventory and environmental data** — kept indefinitely while it retains public-interest and regulatory-evidence value, in line with national MRV requirements. Adopting countries may impose shorter or longer periods in their country-specific notices.
- **Uploaded supporting files** — target retention is 90 days after the parent carbon inventory is published or rejected. An automated purge pipeline is not yet implemented and is listed on the roadmap. In the interim, files in staging environments are purged every 90 days; production files are currently retained permanently pending the automated pipeline.
- **Audit logs (application logs)** — kept for 30 days in staging environments and 90 days in production (Log Analytics Workspace retention). For deployment contexts where regulatory audit periods require longer retention, an Azure Storage export or long-term retention tier must be configured by the deployment team.
- **Database audit records** (`UserRoleAudit`, `UserOrganizationMembership` history) — kept for the lifetime of the platform or until explicitly purged by an administrator. Foreign-key constraints prevent deletion of any user whose records are still referenced in audit tables.
- **Technical telemetry** — kept for the shortest period needed for security investigation, generally 90 days in production.

---

## Your Rights

Data subjects may exercise the following rights against the **controller** — the adopting government or agency operating the instance — not against the upstream maintainer team. The platform recognises:

- **Right of access** — the right to obtain confirmation of whether personal data is being processed and to receive a copy of that data.
- **Right of rectification** — the right to have inaccurate or incomplete personal data corrected.
- **Right of erasure ("right to be forgotten")** — the right to request deletion of personal data where it is no longer necessary for the purposes for which it was collected, or where consent has been withdrawn. Note: the automated endpoint for self-service erasure (`DELETE /users/me`) is not yet implemented; requests are currently fulfilled manually by administrators. This is a known gap on the roadmap.
- **Right to restriction of processing** — the right to request that processing be limited in certain circumstances (e.g., while accuracy is contested).
- **Right to data portability** — the right to receive personal data in a structured, commonly used, machine-readable format. The platform offers structured data exports in non-proprietary formats (CSV, XLSX, JSON); see [`docs/development/data-export.md`](docs/development/data-export.md). Note: the automated self-service export endpoint (`GET /users/me/export`) is not yet implemented and is on the roadmap.
- **Right to object** — the right to object to processing carried out on grounds of legitimate interest or public interest, including profiling.
- **Right to lodge a complaint** — the right to lodge a complaint with the competent national supervisory authority or data-protection agency in the adopting country.

Rights are exercised against the controller (the adopting government or agency), not against the upstream maintainer team. The maintainer team can be contacted for issues specifically related to the upstream codebase or any telemetry flowing upstream (see How to Exercise Your Rights below).

---

## Cross-Border Transfers

Each country deployment is hosted in a region chosen by the adopting government; the upstream maintainer team does not move country data across borders. Any cross-border transfer of derivative or aggregated data — including transfers from a country deployment to UNDP headquarters or to a shared analytics service — must be governed by a separate agreement and aligned with national data-protection rules. Where relevant, appropriate transfer mechanisms must be in place, such as Standard Contractual Clauses, adequacy decisions, or equivalent safeguards recognised by the applicable jurisdiction.

---

## Country Variants

Adopting countries publish their own privacy notices for their respective deployments. Those country-specific notices **prevail** over this upstream notice for all matters within their jurisdiction. The upstream codebase is designed to operate in compliance with the following legal frameworks, among others:

- **Mexico** — Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
- **Colombia** — Ley 1581 de 2012 (Estatutaria de Protección de Datos Personales).
- **Brazil** — Lei Geral de Proteção de Dados Pessoais (LGPD).
- **Chile** — Ley 19.628 sobre Protección de la Vida Privada.
- **Argentina** — Ley 25.326 de Protección de los Datos Personales.
- **Peru** — Ley 29733 de Protección de Datos Personales.
- **Other LAC jurisdictions** — equivalent national frameworks; country implementation teams are responsible for documenting jurisdiction-specific requirements in their own privacy notices and compliance materials.

All of the above frameworks share core principles with the GDPR — lawful basis for processing, purpose limitation, data minimisation, data-subject rights, and security obligations — which are the basis on which the upstream codebase is designed.

The upstream maintainer team does not provide legal compliance certification for any specific jurisdiction. The deploying country's legal and IT teams are responsible for verifying and declaring compliance.

---

## How to Exercise Your Rights

- **Primary contact** — for all data-subject requests relating to a specific country deployment, contact the privacy or data-protection contact published by the adopting government for that instance. This contact is identified in the country-specific privacy notice.
- **Upstream maintainer contact** — for issues specifically related to the upstream codebase, security vulnerabilities in the codebase, or any telemetry flowing to the maintainer team under a DPA: `privacy@huella-latam.undp.org` (placeholder address pending official UNDP confirmation; check the project's `SECURITY.md` for the current verified contact).
- **Acknowledgment SLA** — the controller must acknowledge receipt of a data-subject request within 5 business days. A substantive response must be provided within 30 calendar days. Where applicable national law sets a stricter deadline, that deadline prevails.
- **Security vulnerabilities** — for reporting security vulnerabilities in the codebase, see [`SECURITY.md`](SECURITY.md) instead of this notice.

---

## Cookies and Analytics

The upstream codebase ships **without** third-party analytics, tracking pixels, or advertising cookies by default. No analytics SDK (e.g., Google Analytics, Mixpanel) is bundled in the default build.

Country deployments may choose to enable observability tools (e.g., Azure Application Insights, which is provisioned in the reference infrastructure but not yet instrumented in the application code). Any analytics or telemetry tools introduced by a country deployment must be:

- Declared in the country-specific privacy notice for that instance.
- Subject to any consent requirements mandated by applicable national law.
- Configured to respect data minimisation principles.

---

## Minors

The platform is intended for use by adult professionals representing reporting organisations in a professional capacity. It is not designed or marketed for use by minors. Where an adopting government's national rules permit minors to act as authorised representatives or users, additional safeguards required by applicable law apply. The upstream codebase exposes the audit-logging and role-based access-control hooks necessary to support those safeguards, but does not enable a youth-specific workflow, age-verification mechanism, or parental-consent flow by default.

---

## Do-No-Harm Safeguards

The upstream codebase implements the following technical and organisational safeguards to protect personal data and minimise harm:

- **Two-dimension role-based access control (RBAC)** — system-level roles (`USER`, `ADMIN`, `SUPERADMIN`) and organisation-scoped roles (`VIEWER`, `CONTRIBUTOR`, `ADMIN`) are enforced independently. PII is accessible only to users with the appropriate role within the same organisation, or to platform administrators. See [`docs/security/rbac.md`](docs/security/rbac.md).
- **Least-privilege secrets management** — credentials and connection strings are managed via Azure Key Vault by default, with environment-variable abstractions planned for cloud-neutral deployments. See [`docs/security/secrets.md`](docs/security/secrets.md).
- **Encryption in transit** — TLS 1.2 or higher is enforced on all channels: client to API, API to PostgreSQL, API to Blob Storage, and client to Blob Storage via signed URLs.
- **Encryption at rest** — AES-256 encryption is applied at the platform level to all database storage (Azure Database for PostgreSQL Flexible Server) and file storage (Azure Blob Storage) using Microsoft-managed keys by default. Customer-managed keys (CMK) are a configurable option for deployments with stricter compliance requirements.
- **Sensitive field redaction in logs** — the Pino logger is configured to redact `Authorization` headers and cookie values from all log output. Token values and credential material never appear in logs. See [`docs/security/audit-logging.md`](docs/security/audit-logging.md).
- **Append-only audit records** — the `UserRoleAudit` table records every system-role change with actor, timestamp, previous role, and new role inside the same database transaction as the role update. The `UserOrganizationMembership` table retains full membership history using a supersession pattern rather than in-place updates. Foreign-key constraints prevent deletion of records that are still referenced in audit tables.
- **Open-source codebase** — the full source code is publicly available for independent security audit and review under the project licence.
- **Public transparency portal with deliberate redaction** — the public `GET /api/transparency` endpoint exposes only allowlisted fields (organisation name, sector, subsector, year, and boolean recognition flags). All PII fields, tax identifiers, representative contact details, and detailed emission data are explicitly excluded from this endpoint.

---

## Roadmap of Planned Privacy Enhancements

The following items are committed improvements on the DPG remediation roadmap. They represent known gaps acknowledged in the platform's security documentation and are being addressed as part of the ongoing development programme:

- **Automated 90-day purge of uploaded files past retention** — implement an automated pipeline to delete supporting documents from Blob Storage 90 days after the parent carbon inventory is published or rejected, honouring the target retention period stated above.
- **Self-service erasure endpoint** — implement `DELETE /users/me` to mechanise the right-to-erasure workflow, enabling users and administrators to initiate account deletion without requiring direct database access.
- **Self-service data-portability export** — implement `GET /users/me/export` to provide a structured, machine-readable export of a user's personal data in satisfaction of the right to data portability.
- **Field-level encryption for high-sensitivity attributes** — apply application-layer encryption (e.g., via Prisma middleware) to the `taxId`, `representativeTaxId`, and `representativeEmail` fields, so that a database-level breach does not expose these values as plaintext.
- **Helmet HTTP-hardening plugin** — register the `helmet` plugin globally in the Fastify application to apply security-relevant HTTP response headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.).
- **MIME-type validation and antivirus scanning on file uploads** — validate uploaded files against declared MIME types and scan for malicious content before accepting them into storage.
- **Fail-fast configuration validation** — implement startup checks that cause the application to refuse to start in a production environment when required security configuration (CORS allow-list, JWT secret, identity-provider settings) is absent or set to insecure defaults.

---

## Changes to This Notice

Material changes to this notice are recorded in [`CHANGELOG.md`](CHANGELOG.md) and announced in release notes accompanying each versioned release. Adopting countries that have published country-specific privacy notices are responsible for reviewing upstream changes and updating their notices accordingly. Where applicable national rules require data subjects to be re-notified or re-consent to be obtained following a material change in processing, the adopting government is responsible for fulfilling that obligation.

---

## References

- DPGA Standard v1.1.6 — Indicator 7 (Privacy and Applicable Laws) and Indicator 9A (Privacy and Security of PII).
- United Nations — _Personal Data Protection and Privacy Principles_ (UN System Chief Executives Board for Coordination, 2018).
- Internal: [`docs/security/sensitive-data.md`](docs/security/sensitive-data.md), [`docs/security/rbac.md`](docs/security/rbac.md), [`docs/security/audit-logging.md`](docs/security/audit-logging.md), [`docs/security/secrets.md`](docs/security/secrets.md), [`SECURITY.md`](SECURITY.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), [`LICENSE`](LICENSE).

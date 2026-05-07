# Acceptable Use Policy

This policy describes the kinds of content and behaviour that are not acceptable on Huella Latam
deployments and the processes by which inappropriate or illegal content is detected, reported,
moderated, and removed. The policy applies to:

- The upstream codebase and the official sandbox / demo deployments operated by the upstream
  maintainer team.
- Country deployments that adopt this codebase. Each adopting government may publish a
  country-specific addendum aligned with its national legal framework. Where the addendum is more
  strict, the addendum prevails.

This document is the project's formal response to **DPGA Standard v1.1.6 — Indicator 9B
(Inappropriate and Illegal Content)**. It also provides supporting evidence for **Indicator 9A
(Data Privacy and Security)**.

---

## Scope of User-Generated Content

Users of the Huella Latam platform can submit the following categories of content:

- **Carbon-inventory data** — numerical and categorical fields describing organisational greenhouse
  gas emissions (activity data, emission factors, quantities, units, source references).
- **Supporting documentation files** — PDFs, spreadsheets, and images uploaded as evidence of
  utility bills, contracts, certificates, and other compliance documents.
- **Free-text descriptions** — narrative fields attached to organisations, projects, methodologies,
  and reduction measures.
- **Profile and organisation metadata** — legal names, tax identifiers, addresses, and contact
  details for the registered entity and its representative.
- **Recognition and submission attachments** — documents and files uploaded as part of the
  verification and badge-issuance workflow.

The platform does **not** offer public chat, public forums, direct user-to-user messaging, or
comment threads. The interaction model is a structured, role-gated workflow between an organisation
team and a competent administrator. This design substantially limits the attack surface for
user-generated harmful content compared with open social platforms. This characteristic is cited as
the rationale for the project's Indicator 9C self-assessment.

---

## Prohibited Content

The following content categories are absolutely prohibited on any deployment of Huella Latam,
regardless of the deployment country:

1. **Child sexual abuse material (CSAM)** — Content of this nature is subject to a zero-tolerance
   policy. It is removed immediately upon detection and reported without delay to the relevant
   national authority and, where applicable, to the National Center for Missing and Exploited
   Children (NCMEC) or the equivalent body in the deployment country.

2. **Other sexual content involving minors** — Any content that sexualises individuals under the
   age of 18 in any form, regardless of whether it constitutes CSAM under the applicable national
   definition.

3. **Terrorist or violent-extremist content** — Content that promotes, glorifies, recruits for, or
   facilitates acts of terrorism or other forms of violent extremism, including written, graphic,
   and documentary material.

4. **Incitement to violence or hate speech** — Content that incites, threatens, or celebrates
   violence, or that promotes hatred or discrimination targeting individuals or groups based on
   race, ethnicity, national origin, religion, gender, gender identity, sexual orientation,
   disability, or any other protected characteristic under the deployment country's law.

5. **Personal data of third parties uploaded without lawful basis** — Uploading personally
   identifiable information (PII) of third parties beyond what is required by the inventory
   workflow and what is lawful under the data controller's national legal framework. See
   `../security/sensitive-data.md` for the platform's data inventory and applicable legal
   frameworks.

6. **Malware and exploits** — Files designed to compromise the platform, its users, or third-party
   systems, including executables, macro-enabled documents, web shells, polyglot files, and any
   other content whose primary purpose is to cause harm or gain unauthorised access.

7. **Fraudulent or fabricated emissions data** — Data entered with the intent to deceive verifiers,
   regulators, the public, or carbon markets. This includes artificially inflated or deflated
   figures, fabricated source references, and altered supporting documents.

8. **Intellectual-property infringement** — Uploading or distributing copyrighted material
   (reports, methodology documents, images, data sets) without the rights or a valid licence to do
   so.

9. **Spam and abusive automation** — Automated or bulk submissions that degrade the platform's
   availability or usability for legitimate users, including credential-stuffing attacks, bulk
   inventory creation for non-genuine purposes, and API abuse.

10. **Any content that is illegal under the law of the deployment country** — Including content
    prohibited by national data protection, consumer protection, financial regulation, or
    environmental law.

---

## Detection and Prevention Controls

### Current Controls

The following controls are demonstrably in place at the time of writing, based on the documented
state of the codebase and infrastructure:

- **Authenticated-only uploads** — File uploads and all content-bearing API operations require a
  valid authenticated session. Anonymous file submission is not possible outside the explicitly
  scoped inventory workflow. Route-level authentication and organisation-role guards are enforced
  via `fastify.requireAuth` and `fastify.requireOrganizationRole` hooks.

- **File-size limits** — Uploads are restricted to 20 MB per file and 5 files per request, enforced
  by `@fastify/multipart` configuration. Non-file form fields are capped at 10 KB with a maximum of
  20 fields.

- **Filename sanitisation** — Uploaded filenames are validated against a Zod schema: maximum 255
  characters, printable ASCII only, and the characters `/`, `\`, and `:` are forbidden to prevent
  path-traversal attacks.

- **Structured input validation** — All API endpoints validate request bodies, path parameters, and
  query strings using Zod schemas enforced at the Fastify framework level before any handler code
  executes. All database access goes through Prisma parameterised queries, preventing SQL injection.

- **Role-based access control (RBAC)** — A two-dimension role model (system roles: `USER`, `ADMIN`,
  `SUPERADMIN`; organisation roles: `VIEWER`, `CONTRIBUTOR`, `ADMIN`) restricts who can create,
  modify, publish, or approve inventories, submissions, and recognition artefacts. Only authorised
  roles can take actions that make content visible beyond the submitting organisation.

- **Per-request audit log** — Every HTTP request produces a structured JSON log entry (via Pino)
  recording the request ID, HTTP method, URL, path parameters, response status code, and response
  time. These logs are written to stdout and collected by Azure App Service into the connected Log
  Analytics Workspace.

- **Database audit trail** — All major domain models carry `createdAt`, `updatedAt`, `createdById`,
  and `updatedById` fields that record the actor and timestamp of every write operation. System role
  changes are additionally recorded in the dedicated `UserRoleAudit` table, with every transition
  preserved in a transaction-safe, append-only manner.

- **User access log** — Every `GET /users/me` request inserts a timestamped row into the
  `UserAccessLog` table, providing a request-level history of user access events.

- **Sensitive-field redaction in logs** — The `Authorization` header (Bearer token), cookies, and
  any `password` field are redacted to `[Redacted]` in all log output, preventing credential
  material from appearing in the audit trail.

- **Transport encryption** — All data in transit is encrypted via TLS 1.2 or higher, enforced at
  the Azure App Service, Azure Front Door, PostgreSQL, and Blob Storage layers.

- **Network isolation** — The PostgreSQL database is protected by an IP allowlist firewall that
  permits connections only from the application's outbound IPs. Blob Storage uses
  `defaultAction: Deny` with Azure-managed service bypass. All client file access is mediated
  through short-lived, scoped SAS tokens generated by the API.

- **WAF rate limiting** _(when Azure Front Door Premium is deployed)_ — 100 requests per minute per
  IP, configurable between 10 and 10,000 rpm. When Front Door is not deployed, the API's in-memory
  rate limiter provides a baseline protection.

- **MIME-type validation** `(planned, Sprint 2)` — No server-side MIME-type validation is currently
  performed on uploaded files. The file's declared type and extension are not cross-checked against
  actual binary content. This is a documented known gap in
  [`../security/hardening.md`](../security/hardening.md) and is tracked as a Sprint 2 remediation
  item; the acceptance criteria (per-feature MIME allow-list, magic-byte verification, size cap)
  are documented in the
  [governance summary roadmap](./governance-summary.md#roadmap-and-known-gaps).

- **HTTP security headers** `(planned, Sprint 2)` — `@fastify/helmet` is declared as a dependency
  but the plugin is not yet registered, meaning headers such as `X-Content-Type-Options`,
  `X-Frame-Options` and `Content-Security-Policy` are not currently set by the API. Registration
  is documented as a pre-production action item in
  [`../security/hardening.md`](../security/hardening.md) and is tracked as a Sprint 2 remediation
  item; the acceptance criteria (Helmet defaults plus a strict CSP for the Swagger UI route) are
  documented in the
  [governance summary roadmap](./governance-summary.md#roadmap-and-known-gaps).

- **Explicit audit log for file uploads and data-access events** `(planned)` — File uploads,
  downloads, and read access to sensitive records do not currently produce explicit security log
  entries. They are traceable via the database audit fields but are not yet surfaced as discrete
  security events. This gap is documented in `docs/security/audit-logging.md`.

### Roadmap Controls

The following controls are explicitly planned on the DPG remediation roadmap and will be
implemented prior to or shortly after general availability:

- **MIME-type validation with strict allow-lists per feature** — Server-side validation of actual
  file content against feature-specific allow-lists (e.g., badge uploads restricted to PNG, JPEG,
  and SVG; supporting documents restricted to PDF and XLSX). Implementation will use a streaming
  byte-signature check (e.g., the `file-type` npm package) before the upload is persisted.

- **Antivirus scanning on every upload** — Integration with ClamAV for self-hosted deployments and
  Microsoft Defender for Storage for Azure-native deployments. All uploaded files will be scanned
  before the SAS token is issued to the requester.

- **Hash-based CSAM pre-screening** — Hash-based pre-screening of uploaded media against published
  CSAM hash lists (PhotoDNA or NCMEC hash database where licences allow). This control will be
  offered as a configurable feature to be enabled by adopting governments under their applicable
  national legal framework and licensing arrangements.

- **Per-user and per-organisation rate limiting** — Complementing the existing IP-level WAF rate
  limit, a per-authenticated-user and per-organisation request quota will be enforced to deter spam,
  bulk-upload abuse, and scripted credential stuffing.

- **Configurable text-content filtering for free-text fields** — A pluggable filtering layer for
  free-text description and metadata fields, to be enabled and configured by deployment country
  administrators where national law or policy requires automated content moderation.

- **Explicit security audit log entries for uploads and sensitive reads** — Dedicated, structured
  log entries for file upload, file download, and access to PII-bearing records, as recommended in
  `docs/security/audit-logging.md`.

- **Helmet plugin registration** — Registration of `@fastify/helmet` to enforce `X-Content-Type-Options`,
  `X-Frame-Options`, and related HTTP security headers on all API responses.

---

## Reporting Inappropriate or Illegal Content

- **Public report channel** — `report@huella-latam.undp.org` (placeholder address; adopting
  governments must expose their own country-specific reporting channel for their deployments and
  publish it prominently in the deployment's user interface).

- **Internal report channel** — Authenticated users may use the contact information published in
  the country deployment's footer or help section to report content that violates this policy.
  Country deployment operators are responsible for staffing and monitoring this channel.

- **Security vulnerabilities (not content)** — Technical vulnerabilities in the platform should
  be reported via the process described in `../../SECURITY.md`, not via the content reporting
  channel.

- **Privacy concerns** — Reports concerning personal data handling, data subject rights requests,
  or data protection complaints should be directed to the contact information in `../../PRIVACY.md`.

- **Reports involving CSAM** — Any report that may involve child sexual abuse material must be
  escalated immediately to the competent national authority regardless of the status of the
  internal triage process. Country deployments must publish the local reporting hotline (e.g.,
  INHOPE member hotline or the national equivalent) in the deployment's user interface and in their
  country addendum to this policy.

---

## Triage and Response SLA

All content reports will be handled according to the following process:

1. **Acknowledgement** — The reporter will receive an acknowledgement of their report within
   **2 business days** of submission.

2. **Initial triage** — Within **5 business days**: the report is classified by type and severity,
   evidence is preserved, and the content is reviewed by the security and governance team. Content
   that is obviously illegal — in particular any material that may constitute CSAM — is taken down
   immediately on sight, regardless of the triage timeline. The 5-business-day clock does not apply
   to CSAM removal.

3. **Investigation** — The depth and duration of investigation is proportional to the severity of
   the alleged violation. The process involves both the security team (technical evidence
   collection, log review) and the governance team (policy interpretation, proportionate response
   determination). Audit-log integrity is maintained throughout and the investigation record is
   preserved.

4. **Resolution** — The content is removed or the account is actioned as appropriate. The reporter
   is informed of the outcome to the extent permitted by legal constraints (e.g., confidentiality
   of the investigation, data protection obligations toward the subject). Evidence is preserved in
   accordance with national legal-hold requirements applicable to the deployment country.

5. **Public reporting** — Aggregate, anonymised takedown statistics (number of reports received,
   number of takedowns by category, number of law-enforcement referrals) are published annually
   as part of the project's transparency commitments.

---

## Enforcement Actions

The following graduated enforcement actions may be taken, depending on the severity of the
violation, the history of the account, and the applicable national law:

- **Warning** — Issued for first-time, low-severity violations where the content does not pose an
  immediate risk and the violation appears unintentional. The warning is documented and the user is
  notified.

- **Temporary suspension** — Applied for repeated violations, higher-severity content, or
  first-time violations where the content poses a meaningful risk. The suspended account cannot
  access the platform for a defined period.

- **Permanent ban and account deletion** — Applied for severe violations (including any CSAM
  incident) or for repeat offences following a temporary suspension. The account and its associated
  content are removed from the platform.

- **Referral to law enforcement** — When content is illegal under the deployment country's law,
  the case is referred to the competent national authority. Referral is mandatory for CSAM and for
  credible threats of physical violence, and occurs in parallel with — not after — the internal
  enforcement action.

- **Loss of recognition or submission status** — For fraudulent or fabricated emissions data, the
  affected inventory or submission may be revoked or invalidated in coordination with the country
  administrator and, where applicable, the competent verification or regulatory body.

All enforcement actions are recorded in the audit log with the actor, timestamp, and rationale.
Affected users are notified of the action taken and of any appeal mechanism available in the
deployment country.

---

## Appeals

Each adopting government defines its own appeals mechanism in its country addendum to this policy.
The upstream maintainer team will preserve all evidence collected during an investigation and will
cooperate with any appeals process initiated by the deployment country administrator or a competent
authority, consistent with applicable national law. The upstream team does not adjudicate appeals
arising from country deployment decisions.

---

## Country Addenda

This document establishes a baseline policy binding on all deployments of the Huella Latam
codebase. Adopting governments must publish a country addendum that, at minimum, identifies:

- **The local report channel** — the specific email address, web form, or helpdesk contact that
  end users in the deployment country should use to report prohibited content.
- **The competent national authority for each prohibited-content category** — the government body
  or law-enforcement agency responsible for receiving referrals involving CSAM, hate speech,
  intellectual-property infringement, and other illegal content categories under national law.
- **The applicable retention rules for evidence and audit logs** — the minimum retention period
  that national law or regulation requires for content-related evidence and system audit logs,
  replacing the upstream defaults documented in `docs/security/audit-logging.md` where the national
  requirement is longer.
- **The appeals process** — the mechanism by which users or organisations can challenge enforcement
  actions taken by the country deployment administrator, including the responsible body, the
  timeline, and the form in which appeals must be submitted.

---

## References

- DPGA Standard v1.1.6 — Indicator 9B (Inappropriate and Illegal Content).
- DPGA Standard v1.1.6 — Indicator 9A (Data Privacy and Security).
- UN Guiding Principles on Business and Human Rights (UNGPs), Pillar II (Corporate Responsibility
  to Respect Human Rights).
- Internal: [`../security/hardening.md`](../security/hardening.md)
- Internal: [`../security/audit-logging.md`](../security/audit-logging.md)
- Internal: [`../security/sensitive-data.md`](../security/sensitive-data.md)
- Internal: [`../../PRIVACY.md`](../../PRIVACY.md)
- Internal: [`../../SECURITY.md`](../../SECURITY.md)
- Internal: [`../governance.md`](../governance.md)

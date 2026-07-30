# Privacy Policy

**Project:** Huella Latam
**Last updated:** 2026-07-01

> This document describes how the Huella Latam **platform** is designed to handle personal
> data. Huella Latam is deployed independently by each adopting country; **the operator of each
> deployment is its data controller** and is responsible for publishing a user-facing privacy
> notice and for legal compliance in its jurisdiction. That includes UNDP for the demonstration
> deployment it operates at <https://www.huellaslatam.org> — a demo is not exempt, because signing
> in creates a user record from the identity provider's claims. This policy documents the
> platform's built-in privacy posture and the gaps a deployment must close.
>
> A detailed technical companion to this policy lives in
> [`docs/security/sensitive-data.md`](./docs/security/sensitive-data.md).

## Summary

**Yes — the platform collects and stores personally identifiable information (PII).** It
stores identity data for users (email, name, identity-provider subject id) and contact/legal
data for organization representatives (legal name, tax id, address, representative name, phone,
email). It does **not** store passwords, payment data, health/biometric data, minors' data, or
GDPR Art. 9 special-category data.

## 1. Data minimization

_(EPF requirement 1)_

- **PII collected — Users:** `email`, `firstName`, `lastName`, `idpUserId`, `idpName`. These
  originate from identity-provider (e.g. Microsoft Entra ID) token claims at first login.
- **PII collected — Organization representatives:** `legalName`, `tradeName`, `taxId`,
  `address`, `representativeFullName`, `representativeTaxId`, `representativePhone`,
  `representativeEmail`.
- **Why necessary:** to identify users, associate them with the organizations they represent,
  and attribute carbon-inventory records (`createdById`/`updatedById`) for auditability.
- **Deliberately NOT collected:** passwords (delegated to the identity provider), payment/
  financial account data, health or biometric data, minors' data, or special-category data.

## 2. User consent

_(EPF requirement 2)_

- Authentication and account creation are delegated to the deployment's identity provider;
  organizational data is entered by the users themselves.
- **Gap (deployment responsibility):** the platform does **not** ship a consent banner or a
  privacy-notice acknowledgement flow. Each deployment must present a privacy notice and obtain
  consent as required by its national law.
  <!-- TODO: Decide whether to add a first-login privacy-notice acknowledgement to the app,
       or document that each deployment handles consent externally. -->

## 3. Transparency in data usage

_(EPF requirement 3)_

- **Use:** PII is used only to identify users, manage organizational affiliation, and attribute
  records. It is **not** used for marketing, profiling, or any secondary purpose.
- **Where processed / who can access:** access is restricted by role-based access control
  (see [`docs/security/rbac.md`](./docs/security/rbac.md)) — PII is readable only by authorized
  users within the same organization and by ADMIN/SUPERADMIN roles.
- **Third parties:** the platform itself sends no PII to third parties. Infrastructure
  sub-processors depend on the deployment (e.g. Microsoft Azure for hosting/identity when
  deployed on Azure).
  Each deployment lists its own infrastructure sub-processors and any Data Processing
  Agreements in its user-facing privacy notice — a required step of country onboarding (see
  [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md), Step 12).
  The list is inherently per-deployment: it depends on the cloud, region, and identity provider
  that deployment chose.

## 4. Privacy by design — deletion

_(EPF requirement 4)_

- Records support administrative deletion via the database and application layer.
- **Gap (deployment responsibility):** there is currently **no automated data-subject-request
  (DSAR) workflow**. Access, deletion, and portability requests must be fulfilled **manually**
  by administrators using authorized database/application access.
  <!-- TODO: Consider building a DSAR (access/delete/export) workflow; until then, document the
       manual runbook each deployment's administrators will follow. -->

## 5. Data retention

_(EPF requirement 5)_

The platform's default retention posture (see `docs/security/sensitive-data.md`):

| Data type                | Production retention                        |
| ------------------------ | ------------------------------------------- |
| User & organization data | Retained for the platform lifetime          |
| Carbon inventory data    | Long-term (regulatory evidence)             |
| Uploaded files           | Retained (no automatic purge in production) |
| Application logs         | ~90 days                                    |
| Database backups         | Point-in-time recovery per Azure defaults   |

- **Gap (deployment responsibility):** there is no automated anonymization/erasure schedule for
  PII once it is no longer needed.
  Concrete retention limits and an anonymization trigger are set per deployment, in line with
  its national data-protection law, and recorded at onboarding (see
  [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md), Step 12).
  <!-- TODO: UNDP to set the upstream *baseline* retention limit and anonymization trigger that a
       deployment may strengthen but should not silently drop. Tracked in issue #460 (§4). -->

## 6. Data governance, security & access controls

_(EPF requirement 6 — also Indicator 9A)_

- **Access controls:** role-based authorization; PII limited to same-organization users and
  ADMIN/SUPERADMIN. Authentication delegated to the identity provider (no password storage).
- **Encryption in transit:** TLS 1.2+ enforced on all channels (client→API, API→PostgreSQL via
  `sslmode=require`, API→Blob Storage HTTPS-only). CI→cloud uses OIDC federation (no long-lived
  credentials).
- **Encryption at rest:** AES-256 (Microsoft-managed keys) for database and blob storage.
  **Known gap:** no application-layer field-level encryption and customer-managed keys (CMK) are
  not configured by default — add via Bicep if a deployment requires CMK.
- **Data integrity:** `createdById`/`updatedById`/`createdAt`/`updatedAt` audit columns on
  records; audit logging per [`docs/security/audit-logging.md`](./docs/security/audit-logging.md).
- **Incident/breach response:** see [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure.
  The breach-notification window is committed to per deployment and recorded at onboarding
  (see [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md),
  Step 12); many applicable laws expect notification within 72 hours.
  <!-- TODO: UNDP to ratify the upstream *baseline* breach-notification window. Tracked in issue
       #460 (§4). -->
- **Applicable laws (by design):** the platform aligns with core principles shared by Latin
  American data-protection frameworks — Mexico (LFPDPPP), Colombia (Ley 1581/2012), Argentina
  (Ley 25.326), Brazil (LGPD), Chile (Ley 19.628), Peru (Ley 29733) — and GDPR: lawful basis,
  purpose limitation, data minimization, data-subject rights, and security obligations. The
  project team does **not** certify legal compliance; the deploying country's legal/IT teams are
  responsible for verifying and declaring compliance.

## Reporting a privacy concern

Privacy concerns divide into two kinds, and they go to different places. This is a consequence
of the ownership model stated at the top of this document: **each deployment is the data
controller for its own instance**, while this repository provides the software.

### If your concern is about the software

Route it to the **upstream maintainer team** — the `@undp/carbon-footprint-program-maintainers`
GitHub team (see [`.github/CODEOWNERS`](./.github/CODEOWNERS) and
[`GOVERNANCE.md`](./GOVERNANCE.md)). This covers, for example: a field that records more personal
data than it needs, a defect that could expose one organization's data to another, a log line
that captures something it should not, or a question about how the data model handles personal
data.

- If the concern has security impact — anything that could expose data if described publicly —
  use the private channel in [`SECURITY.md`](./SECURITY.md): GitHub **Security → Report a
  vulnerability**. Do not open a public issue for it.
- Otherwise, open a normal GitHub issue.

### If your concern is about your own personal data

Route it to **the operator of the deployment you use** — the government body or organization
running that instance. They are the data controller, and they are the only party who can act.

The upstream maintainer team **cannot** service these requests: it has no access to any
deployment's database, object storage, or identity provider, and no legal authority over data
another organization controls. Requests that must go to the controller include:

- Access to, correction of, deletion of, or export of your personal data (data-subject
  requests).
- Questions about the lawful basis, retention period, or sub-processors applying to your data.
- Notification obligations following a personal-data breach.

Each deployment publishes its own privacy contact — and, where its national law requires one, a
designated data-protection officer. That contact appears in the deployment's own privacy notice,
not here; publishing it is a required onboarding step for **every** operator, including the
UNDP-run demonstration deployment (see
[`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md), Step 12).

> **On the term "DPO":** the upstream maintainer team is **not** a data-protection officer for
> any deployment and must not be described as one. Under GDPR Art. 37–39 and comparable Latin
> American provisions, a DPO is a designated role with independence requirements and a
> conflict-of-interest bar; the team that builds the processing software cannot hold it. Where a
> DPO is required, the deploying controller designates one.

<!-- TODO: A monitored upstream inbox would give people with no GitHub account a route to the
     maintainer team for software-level privacy concerns. UNDP decision, tracked in issue #460
     (§1). The deployment-level contacts are deliberately NOT listed here — they are per-country
     and gated at onboarding. -->

---

_References: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicators 7 & 9A; [DPGA Enhanced Privacy Framework](https://www.digitalpublicgoods.net/dpg-privacy-report)._

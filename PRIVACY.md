# Privacy Policy

**Project:** Huella Latam
**Last updated:** 2026-07-01

> This document describes how the Huella Latam **platform** is designed to handle personal
> data. Huella Latam is deployed independently by each adopting country; **each country
> deployment is the data controller** for its instance and is responsible for publishing a
> user-facing privacy notice and for legal compliance in its jurisdiction. This policy
> documents the platform's built-in privacy posture and the gaps a deployment must close.
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
  <!-- TODO: Each deployment should list its actual infrastructure sub-processors and any
       Data Processing Agreements (DPAs) in its user-facing privacy notice. -->

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
  <!-- TODO: Define retention limits and an anonymization trigger for PII in line with each
       deployment's national data-protection law. -->

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
  <!-- TODO: Define the breach-notification commitment and timeline each deployment will honor
       (e.g. notify affected data subjects and the national authority within N hours). -->
- **Applicable laws (by design):** the platform aligns with core principles shared by Latin
  American data-protection frameworks — Mexico (LFPDPPP), Colombia (Ley 1581/2012), Argentina
  (Ley 25.326), Brazil (LGPD), Chile (Ley 19.628), Peru (Ley 29733) — and GDPR: lawful basis,
  purpose limitation, data minimization, data-subject rights, and security obligations. The
  project team does **not** certify legal compliance; the deploying country's legal/IT teams are
  responsible for verifying and declaring compliance.

## Reporting a privacy concern

<!-- TODO: Add a monitored privacy contact (email or the deployment's data-protection officer). -->

Contact: `TODO: privacy contact` — see also [`SECURITY.md`](./SECURITY.md) for vulnerability
disclosure.

---

_References: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicators 7 & 9A; [DPGA Enhanced Privacy Framework](https://www.digitalpublicgoods.net/dpg-privacy-report)._

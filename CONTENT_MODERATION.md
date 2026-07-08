# Content Moderation & Acceptable-Use Policy

**Project:** Huella Latam
**Last updated:** 2026-07-01

> Huella Latam is **not** a public content-sharing or publishing platform. The only
> user-supplied content is (a) structured data entered into carbon inventories and
> organizational profiles, and (b) **supporting evidence files** uploaded to substantiate
> emissions data. This content is **private to an authenticated organization workspace** and
> its authorized verifier — it is not broadcast or made publicly discoverable. Under the DPG
> Standard this places Indicator 9B at the low-risk end, but because file uploads exist, this
> policy documents the platform's acceptable-use expectations and removal process.

## Scope

- **Content users can submit:** carbon-inventory data, organization/representative details, and
  uploaded evidence documents (e.g. invoices, meter readings, certificates) attached to
  inventories.
- **Where it is stored / who can view it:** in the deployment's database and object storage
  (Azure Blob or MinIO), access-controlled via RBAC. Visibility is limited to authorized users
  of the owning organization and its assigned verifier/administrators.

## 1. Prohibited content

Users must not upload or enter, at minimum:

- **Child sexual abuse material (CSAM)** — zero tolerance.
- Content that is illegal in the deployment's operating jurisdiction.
- Malware or content intended to compromise the platform or its users.
- Content unrelated to the platform's purpose (carbon measurement/reporting), including
  harassment, hate speech, or personal data of third parties uploaded without a lawful basis.

## 2. Detection

- **Primary control is preventive and access-based:** uploads are tied to an authenticated
  user within a scoped organization workspace and are not publicly accessible, which sharply
  limits exposure and abuse incentives.
- **Human review on report:** the deployment operator (and organization/verifier
  administrators) can review uploaded evidence in the course of verification and act on
  anything prohibited.
- **CSAM specifically:** the platform does not host public media galleries, but any discovery
  of CSAM must be treated as a criminal matter and escalated immediately (see §3). Operators
  requiring proactive scanning should integrate a hashing service (e.g. PhotoDNA) at the
  storage layer.
  <!-- TODO: If a deployment expects higher-risk uploads, document/enable automated CSAM
       hash-scanning at the storage tier. -->

## 3. Reporting

- **Users/organizations** report concerning content to their deployment operator.
  <!-- TODO: Each country deployment should publish a monitored abuse-report contact. -->
- **Operators** escalate confirmed illegal content — and CSAM without exception — to the
  competent law-enforcement authority and, where applicable, an INHOPE-member hotline in their
  jurisdiction.
  <!-- TODO: Confirm the per-country law-enforcement / hotline escalation path. -->

## 4. Moderation & removal

- The deployment operator and organization administrators can **remove uploaded files and
  revoke user access** through role management and storage administration.
- **Target response:** illegal content (especially CSAM) is removed and escalated
  **immediately** upon confirmation; other prohibited content is actioned promptly.
  <!-- TODO: Set concrete SLA targets per severity for your deployment. -->
- Available actions: remove the file/record, restrict or suspend the user's access, and report
  to authorities.

## 5. Appeals

- A user whose content or access was restricted may appeal to the deployment operator, who
  reviews the decision and responds.
  <!-- TODO: Define the appeal contact and timeline per deployment. -->

## Contact

Report content concerns to: `TODO: content/abuse contact` — see also
[`SECURITY.md`](./SECURITY.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

---

_Reference: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicator 9B._

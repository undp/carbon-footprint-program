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
  Whether to enable automated CSAM hash-scanning is decided and recorded per deployment at
  onboarding (see
  [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md), Step 12);
  it is advisable for any deployment expecting higher-risk uploads.
  <!-- TODO: UNDP to decide whether upstream should make hash-scanning REQUIRED rather than
       advisable for all deployments. Tracked in issue #460 (§3). -->

## 3. Reporting

- **Users/organizations** report concerning content to their deployment operator, who publishes a
  monitored abuse contact as a required step of country onboarding — see
  [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md). Reports do
  not go upstream; see [Contact](#contact) for why.
- **Operators** escalate confirmed illegal content — and CSAM without exception — to the
  competent law-enforcement authority and, where applicable, an INHOPE-member hotline in their
  jurisdiction. Each operator identifies and publishes that jurisdiction-specific route at
  onboarding; it cannot be specified centrally, because the competent authority and the
  reporting duty differ by country.

## 4. Moderation & removal

- The deployment operator and organization administrators can **remove uploaded files and
  revoke user access** through role management and storage administration.
- **Target response:** illegal content (especially CSAM) is removed and escalated
  **immediately** upon confirmation; other prohibited content is actioned promptly.
  Concrete response targets per severity are set per deployment and recorded at onboarding
  (see [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md),
  Step 12).
  <!-- TODO: UNDP to set the upstream *baseline* moderation SLA per severity. Tracked in issue
       #460 (§3). -->
- Available actions: remove the file/record, restrict or suspend the user's access, and report
  to authorities.

## 5. Appeals

- A user whose content or access was restricted may appeal to the deployment operator, who
  reviews the decision and responds.
  The appeal contact and timeline are published per deployment and recorded at onboarding (see
  [`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md),
  Step 12).

## Contact

Where to report depends on what the concern is. User-submitted content lives in a **specific
deployment's** database and object storage, so only that deployment's operator can see it or act
on it.

### Content inside a deployment → that deployment's operator

Report abusive, prohibited, or illegal content to **the operator of the instance you are using**
— the government body or organization running it. They hold the access and the legal standing to
remove content, suspend a user, and escalate to authorities in their jurisdiction. Each operator
publishes its own monitored abuse contact and its child-safety escalation path; publishing them
is a required step of country onboarding (see
[`docs/development/country-onboarding.md`](./docs/development/country-onboarding.md)).

**If the content is CSAM or otherwise criminal, contact law enforcement or an INHOPE-member
hotline in that jurisdiction directly** — do not wait on any project channel, upstream or
otherwise.

The upstream maintainer team is deliberately **not** the contact for content reports. It has no
access to any deployment's data and cannot remove a file from an instance it does not operate, so
routing reports upstream would add a hop to the one process where delay causes real harm.

### The moderation capability itself → the upstream maintainer team

Report to the `@undp/carbon-footprint-program-maintainers` team (see
[`.github/CODEOWNERS`](./.github/CODEOWNERS)) when the concern is about the software rather than a
piece of content — for example a missing moderation control, an upload path that bypasses access
checks, or a defect that makes prohibited content harder to find or remove. Use the private
channel in [`SECURITY.md`](./SECURITY.md) if disclosing it publicly would create risk; otherwise
open a normal GitHub issue.

See also [`SECURITY.md`](./SECURITY.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) —
conduct between community members is handled under the latter.

---

_Reference: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicator 9B._

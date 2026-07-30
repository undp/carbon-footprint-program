# Security Policy

Huella Latam is a digital public good that stores organizational and personal data
(see [`docs/security/sensitive-data.md`](./docs/security/sensitive-data.md)). We take
security seriously and appreciate responsible disclosure.

## Supported versions

The platform is continuously delivered from the `main` branch; security fixes are applied to
`main` and released promptly. Country deployments should track the latest release.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or
pull requests.**

The **security contact for this project is the maintainer team collectively** — the
`@undp/carbon-footprint-program-maintainers` GitHub team (see
[`.github/CODEOWNERS`](./.github/CODEOWNERS) and [`GOVERNANCE.md`](./GOVERNANCE.md)). Reports
are handled by the team, not by any single individual, so disclosure never depends on one
person's availability.

Use the private channel below:

**GitHub private vulnerability reporting** — open a report via the repository's
**Security → Report a vulnerability** tab (GitHub private advisories). This notifies the whole
maintainer team privately and is the preferred route: it keeps the report, the discussion, the
fix and the eventual CVE/advisory in one place, with no dependency on an individual mailbox.

If you cannot use GitHub private vulnerability reporting, open a regular issue containing **no
technical detail** — just a request for a private channel — and a maintainer will respond with
one. Never put the vulnerability itself in a public issue.

**On timing:** we aim to acknowledge a report within **3 business days** (see
[What to expect](#what-to-expect)). That is our target, not a guarantee — so if **5 business
days** pass with no acknowledgement at all, treat the report as having gone unseen and escalate
to the maintainer team through the channels in [`GOVERNANCE.md`](./GOVERNANCE.md). The two-day
gap is deliberate slack for holidays and handover; it is not a second, slower SLA.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected component(s), version/commit, and deployment context.

## What to expect

- **Acknowledgement:** we aim to acknowledge a report within **3 business days**. If nothing has
  reached you by 5, escalate as described under
  [Reporting a vulnerability](#reporting-a-vulnerability).
- **Assessment:** we will validate the issue, determine severity, and agree on a remediation
  timeline with you.
- **Disclosure:** we practise coordinated disclosure — we will credit reporters (unless you
  prefer to remain anonymous) once a fix is available.
  <!-- TODO: Confirm the acknowledgement/remediation SLAs UNDP wants to commit to.
       The 3-business-day acknowledgement above is the maintainer team's working
       target and is what the project's OpenSSF Best Practices entry declares; it
       is NOT yet ratified by UNDP. Tracked in https://github.com/undp/carbon-footprint-program/issues/460 (§3). Also pending: a
       monitored team inbox to complement GitHub private vulnerability reporting. -->

## Scope

In scope: the application code in this repository (`apps/`, `packages/`), infrastructure
templates (`infra/`), and CI/CD configuration.

Out of scope: vulnerabilities in third-party dependencies (report upstream; we track these via
Dependabot), and issues specific to a country deployment's own infrastructure (report to that
deployment's operators).

## Security documentation

The platform's security model is documented under [`docs/security/`](./docs/security/):
authentication, RBAC/authorization, sensitive-data handling, secrets management,
infrastructure hardening, and audit logging.

## Hardening & tooling status

- ✅ Secrets managed via Azure Key Vault + managed identities (no credentials in code).
- ✅ Encryption at rest (AES-256) and in transit (TLS 1.2+).
- ✅ Dependency version updates via [Dependabot](./.github/dependabot.yml).
- ✅ Secret scanning with push protection enabled (free for this public repository).
- ✅ Dependabot security alerts and security updates enabled.
- ✅ CodeQL (SAST) scanning via [`.github/workflows/codeql.yml`](./.github/workflows/codeql.yml), running on pull requests, pushes to `main`, and on a weekly schedule. See the "Standards & Best Practices" section of the README.

---

_Reference: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicators 8 & 9A._

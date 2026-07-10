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

Instead, use one of the following private channels:

1. **GitHub private vulnerability reporting** — open a report via the repository's
   **Security → Report a vulnerability** tab (GitHub private advisories).
   <!-- TODO: A maintainer must enable "Private vulnerability reporting" in
        Settings → Code security and analysis for this to be available. -->
2. **Email** — <!-- TODO: add a monitored security contact, e.g. security@… or the UNDP
   Huella Latam team distribution list. --> `TODO: security contact email`.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected component(s), version/commit, and deployment context.

## What to expect

- **Acknowledgement:** we aim to acknowledge a report within **3 business days**.
- **Assessment:** we will validate the issue, determine severity, and agree on a remediation
  timeline with you.
- **Disclosure:** we practise coordinated disclosure — we will credit reporters (unless you
  prefer to remain anonymous) once a fix is available.
  <!-- TODO: Confirm the acknowledgement/remediation SLAs UNDP wants to commit to. -->

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

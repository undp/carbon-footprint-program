# Security Policy

Huella Latam is a Digital Public Good developed by the United Nations
Development Programme (UNDP) under Project 01000983 — Climate Hub.
The maintainer team takes the security of the platform seriously and
welcomes responsible reports from the community.

This document describes how to report vulnerabilities in the upstream
codebase that lives in this repository. Country deployments are
operated by adopting governments and have their own contact channels;
issues that affect a specific live deployment must be reported to that
country's operator directly.

## Reporting a Vulnerability

The preferred channel for reporting vulnerabilities is **GitHub
Private Vulnerability Reporting** for this repository:

- <https://github.com/in-ventures/undp-huella-latam/security/advisories/new>

If GitHub is not accessible to you, use the fallback email address
`security@huella-latam.undp.org` (placeholder until UNDP confirms the
canonical address).

Please **do not** open public GitHub issues for security
vulnerabilities, and do not discuss them in pull request descriptions
until a coordinated disclosure date has been agreed.

## What to Include

To help us triage quickly, please include:

- A clear description of the issue and its potential impact.
- Steps to reproduce, including any specific data or configuration
  required.
- The version, commit SHA, or deployment URL where you observed the
  issue.
- A suggested fix, if you have one.
- Your contact information and whether you wish to be credited.

## Our Commitments

- **Acknowledgment** within **3 business days** of receipt.
- **Initial triage** with a severity classification within
  **10 business days**.
- **Status updates** at least monthly until the issue is resolved.
- **Coordinated public disclosure** at a date agreed with the
  reporter. Critical issues affecting active deployments may be
  disclosed earlier with a fix or mitigation.
- **No retaliation** against good-faith researchers who follow this
  policy.

## Scope

In scope:

- The source code, configuration, infrastructure templates, and
  documentation in this repository (`in-ventures/undp-huella-latam`).
- The official upstream sandbox / demo deployment, when announced.

Out of scope:

- Vulnerabilities in third-party dependencies — please report those
  upstream to the maintainers of each dependency. We track and patch
  affected dependencies as soon as a fix is available.
- Country deployments operated by adopting governments — contact the
  operator directly. The upstream maintainer team can act as a
  forwarding channel only when the issue also affects the upstream
  codebase.
- Social-engineering attacks against UNDP staff or country
  administrators.
- Volumetric denial-of-service attacks against any deployment.

## Safe Harbor

We will not pursue legal action against, or report to law enforcement,
researchers who:

- Make a good-faith effort to follow this policy.
- Avoid privacy violations, destruction of data, and degradation of
  service to other users.
- Limit testing to systems and data that they own or have explicit
  permission to test.

If your security research crosses these lines, please contact us
before continuing so that we can authorise the work or scope it
differently.

## Supported Versions

| Version          | Status                         |
| ---------------- | ------------------------------ |
| `main`           | Supported (active development) |
| Latest minor tag | Supported                      |
| Older minor tags | Best-effort, no guaranteed fix |

Adopting countries are responsible for staying within the supported
range; the upstream maintainer team will only backport fixes to the
latest minor version.

## Acknowledgment

Reporters who consent to public credit will be acknowledged in
[`CHANGELOG.md`](./CHANGELOG.md) and on a future security
acknowledgment page once the project establishes one. Reporters who
prefer to remain anonymous will be respected.

## See Also

- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- [`PRIVACY.md`](./PRIVACY.md)
- [`docs/security/`](./docs/security/) — internal security
  documentation (hardening, audit logging, RBAC, sensitive-data
  handling).

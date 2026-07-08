# Getting Support

Huella Latam is a Digital Public Good developed by the United Nations
Development Programme (UNDP) under Project 01000983. This document
routes you to the right channel for your question or report.

## Where to ask questions

For general questions about how to use, deploy, configure, or extend
the platform, start with the documentation:

- <https://github.com/undp/carbon-footprint-program/tree/main/docs>

Please **do not** file GitHub issues for questions. Issues are reserved
for confirmed bugs, feature requests, and DPG-compliance gaps.

## Where to report bugs

Use the **Bug report** issue template:

- <https://github.com/undp/carbon-footprint-program/issues/new/choose>

Before filing, please confirm that the bug is reproducible against the
latest `main` and that no existing issue already tracks it.

## Where to request features

Use the **Feature request** issue template (same URL as above).
Feature proposals must respect the project's country-agnosticism
principle: if a feature only makes sense for a single country it
should be expressed through configuration or seed data instead.

## Where to report security vulnerabilities

**Do not** file a public issue. Follow the responsible-disclosure
process documented in [`SECURITY.md`](../SECURITY.md). The preferred
channel is GitHub Private Vulnerability Reporting.

## Where to raise privacy or data-protection concerns

See [`PRIVACY.md`](../PRIVACY.md). For issues with the upstream
codebase use the upstream contact listed there. For issues with a
specific country deployment, contact that deployment's data-protection
officer — each adopting government publishes its own contact.

## Where to report DPG-compliance gaps

Use the **DPG compliance report** issue template. We track these
issues against the DPGA Standard v1.1.6 indicators and use them to
maintain the public self-assessment at
[`../dpg-assessment.json`](../dpg-assessment.json) and
[`../GOVERNANCE.md`](../GOVERNANCE.md).

## Country-deployment support

Each adopting government operates its own production deployment of
Huella Latam. **Operational support** for those deployments is the
responsibility of the country team, not the upstream maintainer team.
Country teams publish their own help channels in the deployment
itself.

The upstream maintainer team only provides:

- Platform-level bug fixes and security patches.
- Guidance on country onboarding (see
  [`../docs/development/country-onboarding.md`](../docs/development/country-onboarding.md)).
- Coordination of multi-country features through GitHub issues.

## Contributing

If you want to contribute changes back to the upstream codebase, read
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) and the full guide at
[`../docs/development/contributing.md`](../docs/development/contributing.md).

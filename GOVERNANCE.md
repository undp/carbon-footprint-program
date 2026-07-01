# Governance

**Project:** Huella Latam

Huella Latam is a digital public good for measuring, managing, and reducing carbon
footprints, intended for adoption by Latin American countries. This document defines who
owns the project and how decisions are made. For licensing and country-level deployment
details, see [`docs/governance.md`](./docs/governance.md).

## Ownership

- **Owner:** United Nations Development Programme (UNDP).
- **Type of owning organization:** Intergovernmental organization (an agency of the United
  Nations).
- **Country of legal establishment:** UNDP is an organ of the United Nations, headquartered
  in New York, United States, and operating under the United Nations' international legal
  status.
- **Copyright:** Copyright © 2026 United Nations Development Programme (UNDP).
- **License / basis for redistribution:** The source code is distributed under the
  [GNU Affero General Public License v3.0](./LICENSE) (SPDX: `AGPL-3.0-only`). Contributions
  are accepted under the same license. Third-party dependencies retain their own licenses.

## Decision-making

- **Model:** The platform is centrally maintained by the UNDP Huella Latam team. Changes are
  proposed via pull requests to `main` and require review and passing CI (lint, type-check,
  format, tests, build) before merge.
- **Merge / release authority:** UNDP Huella Latam maintainers.
  <!-- TODO: List the specific maintainer handles or team, or point to a CODEOWNERS file. -->
- **Disagreements:** Resolved by maintainer consensus; the UNDP Huella Latam team lead has
  final say where consensus cannot be reached.

## Roles

- **Maintainers** — UNDP Huella Latam team members with merge and release authority.
- **Reviewers / Approvers** — maintainers and designated contributors who review pull
  requests.
- **Contributors** — anyone submitting issues or pull requests under the AGPL-3.0 license.
- **Adopters** — countries and delivery partners deploying their own instance (see
  [`docs/governance.md`](./docs/governance.md) for deployment rights and obligations).

## Becoming a maintainer

Contributors who demonstrate sustained, high-quality contributions and familiarity with the
codebase may be invited to become maintainers by the existing maintainer team.

<!-- TODO: Confirm the exact criteria/process UNDP wants for granting maintainer status. -->

## Escalation & do-no-harm

- **Conduct / harassment concerns:** raise via the project's code of conduct process.
  <!-- TODO: Add CODE_OF_CONDUCT.md and a contact channel (closes DPG Indicator 9C). -->
- **Security vulnerabilities:** report privately following the guidance in
  [`docs/security/`](./docs/security/); a top-level `SECURITY.md` disclosure policy is planned.
  <!-- TODO: Add SECURITY.md with a private disclosure contact (supports DPG Indicator 8). -->
- **Privacy / data decisions:** the UNDP Huella Latam team is responsible for privacy and
  data-handling decisions. See [`docs/security/sensitive-data.md`](./docs/security/sensitive-data.md).
  _(Supports DPG Indicators 7 and 9A–9C.)_

---

_Reference: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicator 3 (Clear Ownership)._

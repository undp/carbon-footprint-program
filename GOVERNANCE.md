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
- **Merge / release authority:** the @undp/carbon-footprint-program-maintainers team, whose membership is managed in the org team settings (see [`.github/CODEOWNERS`](./.github/CODEOWNERS)).
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

**Who you are escalating to.** Every route below terminates at the same body: the
`@undp/carbon-footprint-program-maintainers` GitHub team, acting collectively — the same team
that holds merge and release authority above, and whose membership is managed in the org's team
settings (see [`.github/CODEOWNERS`](./.github/CODEOWNERS)). Escalation is deliberately to a
team rather than to a named individual, so that no report depends on one person's availability,
and so that a report about a maintainer can be handled by the others.

**The channels themselves,** so that escalating never requires reading another document first:

| Concern                       | Channel                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security vulnerability**    | This repository's **Security → Report a vulnerability** tab (GitHub private advisories). Private, reaches the whole team, no individual mailbox involved.                                                                                                      |
| **Conduct / harassment**      | Any individual maintainer via their GitHub profile — you need not pick one involved in the incident — or, for behavior that occurred on GitHub, [GitHub's Report abuse form](https://github.com/contact/report-abuse), which is monitored independently of us. |
| **Neither of the above fits** | Open a GitHub issue with **no sensitive detail**, requesting a private channel. Note this is publicly visible: its existence, your username and its timestamp are permanent, so prefer a private route whenever that exposure is itself the risk.              |

The policy documents give the full process for each: [`SECURITY.md`](./SECURITY.md) for
vulnerability disclosure and its timelines (see also [`docs/security/`](./docs/security/)), and
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for conduct reports and enforcement guidelines.
Those documents point back here for escalation; this section is where the pointer stops.

**Privacy / data decisions.** The UNDP Huella Latam team is responsible for privacy and
data-handling decisions in the upstream project. For personal data held by a running instance,
however, the **deployment operator is the data controller** — not this team, which has no access
to any deployment's data and cannot service a data-subject request against it. See
[`PRIVACY.md`](./PRIVACY.md) for that split and
[`docs/security/sensitive-data.md`](./docs/security/sensitive-data.md) for the technical detail.
_(Supports DPG Indicators 7 and 9A–9C.)_

---

_Reference: [DPG Standard](https://www.digitalpublicgoods.net/standard) Indicator 3 (Clear Ownership)._

# Governance Summary

This document is a public, evaluator-facing summary of how Huella
Latam meets the
[Digital Public Goods Alliance (DPGA) Standard v1.1.6](https://digitalpublicgoods.net/standard/).
It consolidates pointers to the indicator-specific evidence that
lives elsewhere in the repository.

It is intended to be read by:

- DPGA evaluators reviewing the project's submission to the DPG
  registry.
- Adopting-country teams assessing the platform before deployment.
- The general public looking for a single page that answers "is this
  really a Digital Public Good?".

## Project identity and copyright

| Field                     | Value                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Project name              | Huella Latam                                                                           |
| Source repository         | <https://github.com/in-ventures/undp-huella-latam>                                     |
| Copyright holder          | United Nations Development Programme (UNDP)                                            |
| Funding programme         | UNDP Project 01000983 — Climate Hub, in support of the UNDP Climate Promise initiative |
| Active maintainer team    | Documented at [`MAINTAINERS.md`](../../MAINTAINERS.md)                                 |
| Code-owner routing        | [`.github/CODEOWNERS`](../../.github/CODEOWNERS)                                       |
| Use of UN name and emblem | Reserved per [`LICENSE`](../../LICENSE) addendum and [`NOTICE`](../../NOTICE)          |

## Licensing

| Asset                    | Licence                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Source code              | MIT (OSI-approved). See [`LICENSE`](../../LICENSE).                                                               |
| Documentation            | MIT, alongside the source. Country deployments may publish documentation under CC-BY-4.0 if they prefer.          |
| Methodology data         | Public-domain references (GHG Protocol, IPCC, IEA) — explicit data licence (CC-BY-4.0 or ODbL) is on the roadmap. |
| Third-party dependencies | Each under its own OSS licence; report obtainable via `pnpm licenses list`.                                       |

## SDG alignment summary

Primary goal **SDG 13 (Climate Action)** with secondary alignment to
SDGs 12, 17, 11 and 9. Detailed target-by-target mapping with
evidence in
[`../overview/sdg-alignment.md`](../overview/sdg-alignment.md).

## Self-assessment against the nine DPGA indicators

| #   | Indicator                         | Status         | Primary evidence                                                                                                                                                                                                                                                                             |
| --- | --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SDG Relevance                     | Met            | [`../overview/sdg-alignment.md`](../overview/sdg-alignment.md)                                                                                                                                                                                                                               |
| 2   | Open Licensing                    | Met            | [`../../LICENSE`](../../LICENSE) (MIT, OSI-approved). Open-data licence for methodology content is on the roadmap.                                                                                                                                                                           |
| 3   | Clear Ownership                   | Met            | [`../../AUTHORS`](../../AUTHORS), [`../../MAINTAINERS.md`](../../MAINTAINERS.md), [`../../NOTICE`](../../NOTICE), [`../../.github/CODEOWNERS`](../../.github/CODEOWNERS), and the Copyright section of [`../governance.md`](../governance.md).                                               |
| 4   | Platform Independence             | Partially met  | Today the production deployment uses Azure components (Bicep, Entra ID, Blob Storage, Key Vault). Open-source alternatives are documented as a roadmap item — see "Roadmap and known gaps" below. The platform itself uses open standards (REST, OpenAPI, OAuth2/OIDC, JWT, JSON, CSV/XLSX). |
| 5   | Documentation                     | Met            | [`../`](../) (architecture, data-model, development, infrastructure, operations, overview, release, security, governance), Swagger/OpenAPI auto-generated at runtime, and a quickstart in the root [`../../README.md`](../../README.md).                                                     |
| 6   | Data Extraction (non-PII)         | Met (minimum)  | [`../development/data-export.md`](../development/data-export.md) — Excel/CSV/JSON exports today; dedicated public-data endpoints with an open-data licence are on the roadmap.                                                                                                               |
| 7   | Privacy and Applicable Laws       | Partially met  | [`../../PRIVACY.md`](../../PRIVACY.md), [`../security/sensitive-data.md`](../security/sensitive-data.md), [`../security/rbac.md`](../security/rbac.md), [`../security/audit-logging.md`](../security/audit-logging.md). Automated data-subject rights mechanisation is on the roadmap.       |
| 8   | Standards and Best Practices      | Met            | [`./principles-for-digital-development.md`](./principles-for-digital-development.md). Cross-cutting practices include TypeScript-strict + Zod, integration testing with Testcontainers, conventional commits, and CI quality gates with zero-warning lint.                                   |
| 9A  | Privacy and Security of PII       | Partially met  | [`../security/`](../security/), [`../../PRIVACY.md`](../../PRIVACY.md). Helmet registration, MIME validation, antivirus scanning and field-level encryption are on the roadmap.                                                                                                              |
| 9B  | Inappropriate and Illegal Content | Partially met  | [`./acceptable-use.md`](./acceptable-use.md). Antivirus and MIME validation are documented as roadmap controls.                                                                                                                                                                              |
| 9C  | Anti-Harassment                   | Not Applicable | The platform does not facilitate user-to-user interactions; rationale documented in [`../governance.md`](../governance.md). Contributor-community conduct is governed by [`../../CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).                                                             |

## Open standards and best practices

- **REST + OpenAPI** for the public API, with an auto-generated
  Swagger UI in development.
- **OAuth2 / OIDC** for authentication, with **JWKS** validation
  pluggable across identity providers.
- **JSON, CSV and XLSX** for data interchange — no proprietary
  formats.
- **GHG Protocol** and **ISO 14064** for emissions calculation;
  alignment with **GRI**, **ESRS**, **SBTi** and **CDP** documented
  through the planned `docs/architecture/standards-compliance.md`
  matrix.
- **Conventional Commits** + Semantic Versioning + a modular-commit
  policy enforced at code review.
- **CI quality gates**: zero-warning lint, type-check, format-check,
  build and test on every pull request.

## Privacy and do-no-harm

- A two-dimension role-based access-control model
  ([`../security/rbac.md`](../security/rbac.md)).
- Append-only audit logging for sensitive actions
  ([`../security/audit-logging.md`](../security/audit-logging.md)).
- Encryption in transit (TLS 1.2+) and at rest (AES-256 at the
  storage layer).
- Documented sensitive-data inventory by country legal framework
  ([`../security/sensitive-data.md`](../security/sensitive-data.md)).
- A public privacy notice ([`../../PRIVACY.md`](../../PRIVACY.md))
  and a public acceptable-use policy
  ([`./acceptable-use.md`](./acceptable-use.md)).
- The interaction model is structured (organisation ↔ administrator),
  with no public chat, forum, comment thread or direct messaging —
  see Indicator 9C above.

## Roadmap and known gaps

The following items are tracked publicly and will be addressed in
upcoming sprints. They are listed here transparently so that
evaluators and adopting countries have a complete picture:

- **Indicator 4 — Platform Independence**: storage, authentication
  and secrets-management abstractions, an alternative IaC stack
  (Helm / Terraform) and a CI test path against an OSS-only stack
  (PostgreSQL + MinIO + Keycloak).
- **Indicator 5 — Documentation**: a complete data-governance plan
  (10 sections required by the project ToR), a disaster-recovery and
  business-continuity runbook, a data-quality plan, a change-
  management plan and embedded tutorials / FAQ inside the web
  application.
- **Indicator 6 — Data Extraction**: dedicated public endpoints for
  open emission factors and aggregated, anonymised statistics, with
  an explicit CC-BY-4.0 or ODbL licence on the dataset.
- **Indicator 7 / 9A — Privacy / PII**: registration of the Helmet
  HTTP-hardening plugin, MIME-type validation and antivirus scanning
  on uploads, fail-fast configuration when CORS allow-list or JWT
  secret are missing in production, field-level encryption for
  high-sensitivity attributes, and `DELETE /users/me` /
  `GET /users/me/export` endpoints to mechanise the rights of
  erasure and portability.
- **Indicator 8 — Standards and best practices**: frontend test
  coverage with Vitest + React Testing Library + axe accessibility
  checks, CodeQL and dependency-review workflows in CI, container-
  image scanning (Trivy or Grype), and a published
  `standards-compliance.md` matrix covering GHG Protocol, ISO 14064,
  GRI, ESRS, SBTi and CDP.
- **Indicator 9B — Inappropriate content**: ClamAV (or Defender for
  Storage in Azure) scanning of uploads, hash-based pre-screening
  against published abuse-material hash lists where licences allow,
  rate-limiting per user and per organisation.

## Contacts

| Concern                              | Channel                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Security vulnerability               | [`../../SECURITY.md`](../../SECURITY.md) — GitHub Private Vulnerability Reporting first.               |
| Privacy or data-protection concern   | [`../../PRIVACY.md`](../../PRIVACY.md). Country deployments publish their own data-protection contact. |
| Code of conduct violation            | `conduct@huella-latam.undp.org` (placeholder until UNDP confirms).                                     |
| Inappropriate content                | [`./acceptable-use.md`](./acceptable-use.md).                                                          |
| DPG-compliance gap                   | Open a `[DPG]` issue using `.github/ISSUE_TEMPLATE/dpg_compliance.yml`.                                |
| Country-deployment operational issue | Contact the operating country team. Upstream maintainers do not operate country deployments.           |

## How this summary is kept current

Material changes are recorded in
[`../../CHANGELOG.md`](../../CHANGELOG.md) under the relevant release.
This document is reviewed at minimum on every release that touches
governance, security, privacy or documentation. The maintainer team
welcomes external pull requests that update or correct the table
above.

## References

- DPGA — Standard v1.1.6 — <https://digitalpublicgoods.net/standard/>.
- UN Secretary-General — _Roadmap for Digital Cooperation_ (June 2020).
- Principles for Digital Development — <https://digitalprinciples.org/>.
- UN — Personal Data Protection and Privacy Principles.
- Internal: [`../governance.md`](../governance.md),
  [`./principles-for-digital-development.md`](./principles-for-digital-development.md),
  [`./acceptable-use.md`](./acceptable-use.md),
  [`../overview/sdg-alignment.md`](../overview/sdg-alignment.md),
  [`../../LICENSE`](../../LICENSE),
  [`../../PRIVACY.md`](../../PRIVACY.md),
  [`../../SECURITY.md`](../../SECURITY.md),
  [`../../CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).

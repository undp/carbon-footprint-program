# Governance and Licensing

This document describes the governance model for the Huella Latam platform as a digital public good, the licensing considerations for distribution and country-level adoption, and the contribution acceptance process.

---

## Digital Public Good Status

Huella Latam is designed and maintained as a **digital public good**: a country-agnostic platform intended for adoption by any Latin American country (and potentially beyond) to support their carbon footprint measurement and transparency commitments.

Practical consequences of this status:

- The codebase is **centrally maintained** but **independently deployed** by each adopting country.
- Each country **operates its own deployment** on its own Azure infrastructure, with its own data sovereignty.
- The **core platform** (common methodology, submission flow, user management) evolves in the central repository.
- **Country-specific extensions** (local regulations, methodologies, sector taxonomies) are expressed via configuration and seed data — not by forking the codebase.

---

## License

The project is licensed under the **MIT License**. The full license
text lives at [`/LICENSE`](../LICENSE) at the repository root, naming
the **United Nations Development Programme (UNDP)** as the copyright
holder.

The MIT licence was selected because it is OSI-approved (a hard
requirement for DPGA Standard v1.1.6 Indicator 2 — Open Licensing),
imposes minimal obligations on country deployers, and is broadly
compatible with the licences of the third-party dependencies the
project relies on.

A `pnpm licenses list` report can be produced at any time to audit
the licences of bundled dependencies.

If a country-level adopter produces local extensions, the license of
those extensions should be compatible (MIT, Apache-2.0, BSD-3-Clause).

## Copyright and Trademark

Per the project Terms of Reference (UNDP Project 01000983 — Climate
Hub, section K), **all background compiled and deliverables produced
under the project are the property of UNDP**. The codebase is
released to the public under the MIT licence pursuant to UNDP's
Digital Public Good policy, but copyright is retained by UNDP.

The `LICENSE` file at the repository root therefore reads:

> Copyright (c) 2024-2026 United Nations Development Programme (UNDP)

The use of the **name, emblem and official seal** of the United
Nations and of UNDP is reserved and may not be used by licensees,
contributors, or country deployments to imply endorsement without the
prior written authorisation of UNDP. This reservation is included as
an addendum in the `LICENSE` file and reproduced in `NOTICE`.

Country deployments may publish their own brand alongside, but not
in place of, the upstream attribution. See `NOTICE`.

---

## Country-Level Deployment Rights

Under MIT (or any OSI-approved permissive license), countries and delivery partners may:

- Fork the repository and run their own deployment.
- Modify the code to meet local regulatory requirements.
- Keep their modifications private (MIT does not require disclosure of derivative works).
- Rebrand or rename the platform for local distribution.

They **must not**:

- Remove the original license notice from derivative works.
- Claim official endorsement by the original project team without explicit agreement.

---

## Contribution Model

### Who can contribute

- **Core maintainers** (the delivery team) review and merge PRs, drive the roadmap, and own release decisions.
- **Country implementation teams** contribute country-agnostic improvements back to the central repository via pull requests.
- **External contributors** may open issues and submit PRs subject to the same review process.

### Acceptance criteria

Pull requests are evaluated against:

1. **Country-agnosticism.** Changes must not hard-code country-specific logic. Country variation goes through seed data, system parameters, or country parameters.
2. **Backward compatibility.** Changes must not break existing country deployments. Schema migrations must preserve existing data; breaking API changes require a deprecation path.
3. **Test coverage.** New features include integration tests per the [Testing Guide](./development/testing.md).
4. **Documentation.** User-visible changes update the relevant doc under `docs/`. Schema changes are reflected in the data model docs.
5. **Security review.** Changes touching authentication, authorization, file upload, or database queries require an explicit security review by a maintainer.

### Contribution workflow

See [Contributing Guide](./development/contributing.md) for the technical workflow (branch naming, PR template, local setup).

---

## Release Governance

- Releases are tagged in Git using semantic versioning (see [Versioning & Releases](./release/versioning.md)).
- Breaking changes are announced in the release notes with a migration path for country deployers.
- Security patches are released promptly; CVE-affected dependencies are upgraded without waiting for a scheduled release.

---

## Code Ownership and Security Contacts

Sensitive areas of the codebase (authentication, data encryption,
key management, file uploads, the Prisma schema, infrastructure-as-
code) have designated reviewers configured at
[`.github/CODEOWNERS`](../.github/CODEOWNERS). GitHub branch
protection enforces that at least one code owner reviews every pull
request that touches paths under their ownership.

The active maintainer team and its area assignments are documented
publicly at [`MAINTAINERS.md`](../MAINTAINERS.md).

Security vulnerabilities are reported **privately** through the
process documented at [`SECURITY.md`](../SECURITY.md) — primarily
through GitHub Private Vulnerability Reporting, with a fallback email
address for users who cannot reach GitHub.

---

## Intellectual Property Notes

- **Methodology content** (emission factors, categories, subcategories) seeded for a specific country is the responsibility of that country's deployment team. The default seed data (currently for Chile) is provided as an example and may cite public sources (GHG Protocol, IPCC, IEA).
- **Third-party dependencies** are licensed under their respective terms. The `pnpm-lock.yaml` records exact versions. `pnpm licenses list` can produce a license report for compliance checks.
- **User-generated content** (carbon inventories, uploaded documents) is owned by the submitting organization. The platform is a processor, not a controller, of that data. See [Sensitive Data Handling](./security/sensitive-data.md).

---

## Root-Level Files

For a mature open-source digital public good, the repository root
contains the following governance files:

| File                 | Purpose                                                               | Currently present? |
| -------------------- | --------------------------------------------------------------------- | ------------------ |
| `LICENSE`            | MIT licence text with UNDP copyright                                  | Yes                |
| `NOTICE`             | Attribution to UNDP Project 01000983 / Climate Promise                | Yes                |
| `AUTHORS`            | Public statement of project ownership                                 | Yes                |
| `MAINTAINERS.md`     | Active maintainer team and review areas                               | Yes                |
| `.github/CODEOWNERS` | Path-based PR review routing                                          | Yes                |
| `CONTRIBUTING.md`    | DPG-aligned entry point linking to `docs/development/contributing.md` | Yes                |
| `CODE_OF_CONDUCT.md` | Community standards (Contributor Covenant 2.1)                        | Yes                |
| `SECURITY.md`        | Responsible-disclosure policy                                         | Yes                |
| `PRIVACY.md`         | Public privacy notice (DPGA Standard Indicator 7 + 9A)                | Yes                |
| `CHANGELOG.md`       | Version history (Keep a Changelog 1.1.0)                              | Yes                |

These artefacts collectively address DPGA Standard v1.1.6 indicators
2, 3, 5 and 7. The DPG-specific evidence documents live under
[`./governance/`](./governance/):

- `principles-for-digital-development.md` — Indicator 8.
- `acceptable-use.md` — Indicator 9B.
- `governance-summary.md` — public, evaluator-facing self-assessment.

The SDG-relevance evidence (Indicator 1) lives at
[`./overview/sdg-alignment.md`](./overview/sdg-alignment.md).

## DPGA Indicator 9C — Anti-Harassment (Not Applicable)

DPGA Standard v1.1.6 Indicator 9C requires that platforms which
**facilitate interactions between users** establish processes to
protect users against harassment, abuse and hostile behaviour,
including specific safeguards for users who are minors.

Huella Latam does **not** facilitate user-to-user social
interactions. The platform does not offer:

- Public chat, forums or comment threads.
- Direct messaging between users.
- User-generated profiles visible to other users beyond
  organisational role information.
- Public broadcast or follow features.

The interaction model is a structured **organisation ↔ administrator**
workflow: a reporting organisation submits an inventory or project,
and a competent administrator reviews and decides on it. All
communication between these parties happens through the workflow's
explicit fields and through the audit log.

Because the platform does not facilitate user-to-user interactions,
Indicator 9C is documented here as **Not Applicable**, with the
above rationale provided as evidence to the DPGA evaluator.

If a future version of the platform introduces direct user-to-user
interactions (for example, a public discussion feature for country
implementers), this assessment will be revisited and the appropriate
anti-harassment controls will be designed and documented before the
feature is released.

The anti-harassment expectations that **do** apply to this project's
own contributor community are addressed by `CODE_OF_CONDUCT.md` (the
Contributor Covenant 2.1) — see that file for the reporting and
enforcement model.

---

## Project Steering

The project's long-term direction — roadmap priorities, acceptance of new country deployments, major architectural decisions — should be steered by a documented governance body (e.g., a steering committee of UNDP representatives plus country implementation leads). This governance should be reflected in a `GOVERNANCE.md` file at the repository root when the project reaches that maturity level.

Current state: informal governance led by the delivery team. Formalization is a post-launch concern.

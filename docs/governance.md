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

The project is licensed under the **GNU Affero General Public License v3.0** (SPDX: `AGPL-3.0-only`). The full license text lives in the root [`LICENSE`](../LICENSE) file, and the copyright holder is the **United Nations Development Programme (UNDP)**.

AGPL-3.0 is a strong (network) copyleft license. In addition to the usual GPL obligations, it requires that anyone who **runs a modified version of the software to provide a service over a network** make the corresponding source code of that modified version available to its users under the same license.

**Notes for adopters and contributors:**

1. All contributions are accepted under AGPL-3.0; by submitting a pull request, contributors license their work under the same terms.
2. Country-level extensions and derivative works must remain licensed under AGPL-3.0 (or a compatible license) and must honor the network-copyleft source-availability obligation.
3. Third-party dependencies retain their own licenses; only the project's own code is AGPL-3.0.

---

## Country-Level Deployment Rights

Under AGPL-3.0, countries and delivery partners may:

- Fork the repository and run their own deployment.
- Modify the code to meet local regulatory requirements.
- Rebrand or rename the platform for local distribution (subject to the notice requirements below).

They **must**:

- Keep derivative works licensed under AGPL-3.0.
- Make the complete corresponding source code of any modified version **available to the users of their network service**, as required by AGPL-3.0 §13. (This is a change from the project's earlier MIT license, which did not require publishing modifications.)
- Preserve the original license and copyright notices in derivative works.

They **must not**:

- Distribute or operate a modified version over a network without offering its source to users.
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

Sensitive areas of the codebase (authentication, data encryption, key management) should have **designated maintainers** whose review is required before merging changes. A `CODEOWNERS` file at the repository root is recommended to enforce this automatically via GitHub PR review rules.

Security vulnerabilities should be reported **privately** to the maintainer team — not via public GitHub issues. A `SECURITY.md` file at the repository root is recommended, describing:

- Where to report vulnerabilities (a dedicated email address).
- Expected response time.
- Coordinated disclosure policy.

---

## Intellectual Property Notes

- **Methodology content** (emission factors, categories, subcategories) seeded for a specific country is the responsibility of that country's deployment team. The default seed data (currently for Chile) is provided as an example and may cite public sources (GHG Protocol, IPCC, IEA).
- **Third-party dependencies** are licensed under their respective terms. The `pnpm-lock.yaml` records exact versions. `pnpm licenses list` can produce a license report for compliance checks.
- **User-generated content** (carbon inventories, uploaded documents) is owned by the submitting organization. The platform is a processor, not a controller, of that data. See [Sensitive Data Handling](./security/sensitive-data.md).

---

## Recommended Root-Level Files

For a mature open-source digital public good, the repository root should contain:

| File                            | Purpose                                                            | Currently present?                     |
| ------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| `LICENSE`                       | License text                                                       | ✅ Present (AGPL-3.0-only)             |
| `GOVERNANCE.md`                 | Ownership & decision-making                                        | ✅ Present at root                     |
| `CODE_OF_CONDUCT.md`            | Community standards                                                | ❌ Missing                             |
| `CONTRIBUTING.md`               | How to contribute (can link to `docs/development/contributing.md`) | ❌ Missing at root                     |
| `SECURITY.md`                   | Security reporting process                                         | ❌ Missing                             |
| `CODEOWNERS`                    | PR review assignments                                              | ❌ Missing                             |
| `CHANGELOG.md` or release notes | Version history                                                    | ❌ Missing (releases in Git tags only) |

Adding these files is a prerequisite for acceptance into the [Digital Public Goods Alliance](https://digitalpublicgoods.net/) registry, if that is a goal for the project.

---

## Project Steering

The project's long-term direction — roadmap priorities, acceptance of new country deployments, major architectural decisions — should be steered by a documented governance body (e.g., a steering committee of UNDP representatives plus country implementation leads). This governance should be reflected in a `GOVERNANCE.md` file at the repository root when the project reaches that maturity level.

Current state: informal governance led by the delivery team. Formalization is a post-launch concern.

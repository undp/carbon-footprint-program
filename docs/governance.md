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

The root `README.md` currently declares the project as **MIT**. A formal `LICENSE` file at the repository root should be added to make the license unambiguous for adopters and contributors.

**Recommended action:**

1. Add a `LICENSE` file at the repository root with the full MIT license text, naming the copyright holder (e.g., "United Nations Development Programme" or the delivery organization).
2. Confirm that all current contributors have licensed their contributions compatibly.
3. If any country-level adopter produces local extensions, the license of those extensions should be compatible (MIT, Apache-2.0, BSD).

If the project's licensing intent differs from MIT (e.g., Apache-2.0 for patent grant, or a more restrictive license), this should be clarified by the project owners before the first official release.

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
| `LICENSE`                       | License text                                                       | ❌ Missing (README declares MIT)       |
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

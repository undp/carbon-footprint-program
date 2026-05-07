# Principles for Digital Development

The **Principles for Digital Development** (https://digitalprinciples.org/) are nine living guidelines maintained by a community of digital-development practitioners and endorsed by UN agencies, donors, NGOs, and implementing partners. The DPGA Standard v1.1.6 cites them as a recognised reference for **Indicator 8 — Standards and Best Practices**. This document maps each principle to concrete practices and artefacts in the Huella Latam codebase. Where a practice is incomplete or planned, it is explicitly called out.

## How to read this document

Each principle section contains three parts: a **Statement** quoting the canonical 2024 wording of the principle; **How we apply it**, a bulleted list of concrete practices with references to specific files, directories, or documented behaviours in this repository; and **Gaps and roadmap**, an honest bulleted list of what is missing or incomplete and what is planned to address it.

---

## 1. Design with the user

**Statement:** Design with the user — develop context-appropriate solutions informed by the communities and individuals who will use them.

### How we apply it

- The platform serves Latin American organizations submitting carbon inventories for regulatory recognition. The user model maps directly to real-world roles: organization representatives (owners and contributors), auditors (third-party verifiers), and country administrators. This role model is documented in [`docs/security/rbac.md`](../security/rbac.md) and realized as the two-dimension RBAC system (system roles + organization roles).
- The user-organization membership model — with distinct `VIEWER`, `CONTRIBUTOR`, and `ADMIN` organization roles — reflects the actual workflow of multi-user organizations managing a single inventory. Access control is fine-grained so that users only see and act on what their role permits.
- The entire user-facing interface is written in Spanish, the primary working language of the target countries. All labels, form validation messages, placeholders, error notifications, and button text use Spanish copy (`apps/web/src/`). Date formatting uses `date-fns` with the Spanish locale (`es`). This is a deliberate design decision, not a default.
- The UI stack (Material UI v7 + Tailwind CSS v4) provides accessible, well-tested component primitives. MUI components ship with ARIA attributes and keyboard navigation support by default, lowering the barrier for users with assistive technologies.
- Country-level configurability is designed around the needs of national deployers: sectors, organization sizes, emission factor methodologies, and system parameters are all configurable via seed data rather than code changes, meaning each country can adapt the platform to its own regulatory context without forking the codebase (`docs/overview/project-overview.md`, Key Assumptions 9).

### Gaps and roadmap

- No formal user-research artefacts (interview notes, usability test reports, personas) are committed to the repository. The role model and workflow were derived from existing national MRV programmes rather than primary user research.
- No documented usability-testing cadence has been established. Structured usability sessions with actual organization representatives in target countries are planned before the first production launch.
- Internationalization (i18n) is not yet implemented. The platform currently supports Spanish only. A detailed migration plan for `react-i18next` is documented at [`docs/development/i18n-plan.md`](../development/i18n-plan.md), covering Spanish, Portuguese, and English as initial target locales.

---

## 2. Understand the existing ecosystem

**Statement:** Understand the existing ecosystem — participate in peer learning and leverage the existing infrastructure, policies, and communities that can help you succeed.

### How we apply it

- Emission factor methodology data (categories, subcategories, factor values) is sourced from and aligned with the GHG Protocol Corporate Accounting and Reporting Standard, IPCC assessment reports, and IEA emission factor publications. The methodology loader (`load_methodologies/`) reads from country-provided Excel spreadsheets that reference these public sources, and the `docs/governance.md` notes that default seed data may cite GHG Protocol, IPCC, and IEA.
- The submission and recognition workflow — carbon inventory creation, third-party verification, official recognition with badge issuance — is inspired by established national MRV (Monitoring, Reporting, and Verification) programmes across Latin America, including HuellaChile and Huella de Carbono Peru. The platform formalizes and digitizes a workflow that already exists in policy, rather than inventing a new one.
- External integrations are documented in [`docs/integrations.md`](../integrations.md), covering the REST API, Azure Entra ID (OIDC/OAuth2), Azure Blob Storage, and PostgreSQL. The API surface is fully described via auto-generated OpenAPI/Swagger documentation served at `/api/docs`.
- The platform deliberately avoids reinventing the authentication stack. It delegates identity management to Azure Entra ID (CIAM or organizational), which is already operated by many government agencies and enterprises in the target countries. Generic JWKS support also allows integration with any compliant OIDC provider.
- Infrastructure patterns follow established Azure reference architectures (Azure App Service + Blob Storage + Key Vault + Front Door) rather than custom solutions, allowing country IT teams to operate within their existing Azure expertise.

### Gaps and roadmap

- An explicit ecosystem map — comparing Huella Latam feature-by-feature to peer platforms (HuellaChile, Huella de Carbono Peru, Mexico's national registry tool, Brazil's GHG Protocol Program) — is planned for a later sprint. This would make interoperability opportunities and differentiation explicit for new country deployers.
- No formal partnerships or data-sharing agreements with existing national platforms are documented. These are policy-level concerns that fall to the deploying country's environment ministry, but the technical basis for interoperability (open REST API, standard data formats) is already in place.

---

## 3. Design for scale

**Statement:** Design for scale — build for sustainability and the potential for growth, replication, or adaptation as the programme scales.

### How we apply it

- The project is organized as a **pnpm monorepo** managed with **Turborepo**, enabling parallel builds, shared packages, and independent deployment of the API and frontend. The build graph ensures only affected packages are rebuilt on each change (`docs/architecture/system-architecture.md`).
- The backend is a **stateless Fastify API** deployed as a Docker container on Azure App Service. Statelessness means horizontal scaling requires no session-sharing infrastructure. The overload protection plugin (`@fastify/under-pressure`) sheds load gracefully when the process is near capacity.
- All database-intensive operations push filtering, aggregation, and computation to PostgreSQL rather than processing records in application memory. Pagination is enforced across list endpoints. This design preserves acceptable response times as the dataset grows across multiple reporting years and thousands of organizations.
- **Azure-managed PostgreSQL Flexible Server** provides Point-in-Time Recovery (PITR), automated backups, and optional zone-redundant high availability without operational burden on country IT teams. The minimum required version is PostgreSQL 15, and the current deployment targets PostgreSQL 18 (`docs/architecture/tech-stack.md`).
- The **country-agnosticism principle** is the primary mechanism for scale across countries. Country-specific variation — sectors, emission factor methodologies, organization categories, system parameters — is expressed entirely through database seed data and system parameters, not through code forks. This means a second or third country deployment is a configuration exercise, not a development exercise. The principle is enforced in the contribution acceptance criteria at [`docs/governance.md`](../governance.md) and in the `CLAUDE.md` project instructions.
- Reference Infrastructure as Code (`infra/`) is written in Azure Bicep and uses Azure Deployment Stacks for atomic resource lifecycle management. Each country deployer starts from the same IaC baseline and parameterizes it for their subscription.

### Gaps and roadmap

- Load-test artefacts (Locust, k6, or similar scripts and their results) are not committed to the repository. Load testing against realistic data volumes and concurrent user counts is planned before the first production launch.
- Multi-tenant boundaries are per-country-deployment (separate Azure subscriptions, separate databases), not in-application. There is currently no single-instance multi-tenant mode. This is an intentional data sovereignty choice, but limits the ability to share infrastructure costs across countries.
- Caching (Redis) and asynchronous job processing (BullMQ) are noted as planned but not yet implemented (`docs/architecture/tech-stack.md`). At current projected load levels the synchronous-only design is acceptable, but these gaps will need to be addressed for high-volume deployments.

---

## 4. Build for sustainability

**Statement:** Build for sustainability — plan for the long-term financial health of the initiative.

### How we apply it

- The **country-agnosticism principle** prevents the codebase from fragmenting into country-specific forks that diverge over time and cannot be merged back. All country variation goes through seed data and system parameters. Backward compatibility is an explicit acceptance criterion: schema migrations must preserve existing data, and breaking API changes require a deprecation path (`docs/governance.md`).
- The project uses **Conventional Commits** and modular commit policy to keep the Git history readable and reviewable. This reduces the onboarding cost for new maintainers and makes bisecting regressions tractable. The commit convention and branch workflow are documented at [`docs/development/contributing.md`](../development/contributing.md).
- **CI quality gates** run automatically on every pull request: ESLint with zero-warnings enforcement, TypeScript type-check, Prettier format-check, integration test suite, and production build. These gates prevent regressions from entering `main` and ensure the codebase remains deployable at all times (`.github/workflows/ci.yml`).
- Security-sensitive areas of the codebase (authentication, authorization, file upload, database queries) require an explicit security review by a maintainer before merging, per the acceptance criteria in `docs/governance.md`. A `CODEOWNERS` file is recommended (documented as a planned root-level file) to enforce this automatically via GitHub required-review rules.
- The versioned release process uses semantic versioning with Git tags, and breaking changes are announced in release notes with migration paths for country deployers (`docs/release/versioning.md`).
- Security patches are released promptly without waiting for a scheduled release cycle, per the release governance documented in `docs/governance.md`.

### Gaps and roadmap

- No formal long-term stewardship commitment (a signed memorandum of understanding or service-level agreement) from adopting governments is yet in place. This is a policy-level prerequisite for long-term sustainability rather than a technical one.
- Community channels (GitHub Discussions, a mailing list, or a Slack workspace for country deployers) have not been established. A communication channel for country implementation teams to share lessons learned and coordinate on shared improvements is planned.
- The `CODEOWNERS`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CONTRIBUTING.md` root-level files are documented as missing in `docs/governance.md` and are prerequisite for DPGA acceptance. Adding them is a tracked pre-submission task.

---

## 5. Be data-driven

**Statement:** Be data-driven — use data to understand the needs of the people you are serving and to continuously improve the programme.

### How we apply it

- The entire purpose of the platform is to produce structured, auditable carbon emissions data. The data model (`docs/data-model/`) captures not only emission results but also the methodology version, emission factor values used at calculation time (`factor_used` table), activity data inputs, and the full submission and review history. This design ensures that reported figures are traceable and reproducible.
- All major domain models carry `createdAt`, `updatedAt`, `createdById`, and `updatedById` audit fields, providing a lightweight audit trail of who changed what and when. System role changes are tracked in the dedicated `UserRoleAudit` table with full history queryable via `GET /users/:id/role-history`. User access events are recorded in the `UserAccessLog` table (`docs/security/audit-logging.md`).
- The API enforces **pagination and server-side filtering** across all list endpoints, and aggregations (counts, sums, group-by operations) are pushed to the database rather than computed in application memory. This means the data layer is designed to remain performant as datasets grow.
- Structured JSON logging via Pino captures every HTTP request with method, URL, status code, and response time. In production, these logs are streamed to Azure Log Analytics and queryable via KQL, enabling operational monitoring and anomaly detection (`docs/security/audit-logging.md`).
- The platform includes a data export feature that allows organizations and administrators to download inventory data in Excel/CSV/JSON formats (`docs/development/data-export.md`), supporting external analysis and reporting workflows.
- The transparency module (`/api/transparency`) exposes public-facing sector-level and cross-organization emissions rankings, enabling benchmarking and public accountability.

### Gaps and roadmap

- An open-data publishing channel (a publicly accessible data dump or API endpoint with a CC-BY or ODbL licence for the anonymized emissions dataset) is planned but not implemented. Country deployers are responsible for deciding what data is made public under their national transparency frameworks.
- Application Insights is provisioned in the infrastructure but the SDK has not yet been instrumented in the application code. Distributed request tracing, dependency tracking, and custom business events (e.g., "submission approved", "badge issued") are planned for a future sprint (`docs/security/audit-logging.md`).
- Security alert rules in Azure Monitor (sustained 401/403 spikes, 5xx error rate thresholds) are not yet configured. These are documented as known gaps in `docs/security/audit-logging.md`.

---

## 6. Use open standards, open data, open source, open innovation

**Statement:** Use open standards, open data, open source, and open innovation — leverage existing open source solutions, open standards, open data, and open innovation ecosystems.

### How we apply it

- The codebase is released under the **MIT License** (declared in `README.md`; a formal `LICENSE` file at the repository root is a tracked pre-submission task per `docs/governance.md`). MIT is an OSI-approved permissive license that allows any country or organization to adopt, modify, and deploy the platform without royalty obligations.
- The API contract is described using **OpenAPI 3.0**, auto-generated from Zod route schemas via `@fastify/swagger`. The live spec is served at `/api/docs/json` and `/api/docs/yaml` in every deployment environment, making the API surface inspectable by any standard OpenAPI tooling.
- Authentication relies on **OAuth 2.0 / OpenID Connect** with standard JWT (RS256) token validation via the JWKS protocol. The platform is not locked to a single identity provider: any OIDC-compliant IdP that exposes a JWKS endpoint is supported via the `AUTH_PROVIDER=jwks` configuration (`docs/integrations.md`).
- Data transport uses **HTTPS/TLS 1.2+** throughout (client to API, API to PostgreSQL, API to Blob Storage, client to Blob Storage via SAS URLs). There are no proprietary transport protocols.
- Emission factors and methodology structures follow the **GHG Protocol Corporate Accounting and Reporting Standard** and **ISO 14064** conventions for scope categorization and emissions calculation, as documented in `docs/architecture/emission-calculation.md` and `docs/architecture/methodology-taxonomy.md`.
- The entire technology stack is built on mature, widely-adopted open-source components: Node.js, Fastify, Prisma, React, Material UI, TanStack Router, TanStack Query, Zod, Vitest, Turborepo, PostgreSQL, and others. No proprietary framework or runtime is required to operate the platform.

### Gaps and roadmap

- A formal data-licence declaration for the methodology content (emission factor tables and category hierarchies seeded into the platform) has not been published. The intent is to release this under CC-BY 4.0 or ODbL; this requires legal review by UNDP. It is a tracked pre-submission task.
- A published `standards-compliance.md` matrix mapping the platform's data model to international reporting frameworks (GRI Standards, ESRS, SBTi, CDP disclosure) is planned for a later sprint. This would make it easier for organizations to use the platform's output to feed into broader ESG reporting.
- The `LICENSE` file at the repository root is documented as missing in `docs/governance.md` and must be added before the DPGA submission.

---

## 7. Reuse and improve

**Statement:** Reuse and improve — reuse and improve existing open source software, and contribute improvements back to the community.

### How we apply it

- The platform makes extensive use of mature open-source projects rather than building custom solutions: Fastify (web framework), Prisma (ORM), React (UI), Material UI (component library), TanStack Router and TanStack Query (routing and data fetching), Zod (schema validation), Vitest and Testcontainers (testing), and Turborepo (monorepo build). These choices reduce implementation risk and maintenance burden while benefiting from the security and reliability improvements that the upstream communities continuously contribute.
- Emission factor methodology data is derived from publicly available sources (GHG Protocol, IPCC, IEA), reusing the work of the international scientific and policy community rather than commissioning bespoke emission factor research. Country deployers extend this baseline with their own national factors using the same data loading pipeline (`load_methodologies/`).
- The feature-based modular monolith architecture (`apps/api/src/features/`) is a deliberate reuse of an established pattern from the Fastify and Node.js communities. Each feature follows the same `route.ts` → `handler.ts` → `service.ts` (→ `helpers.ts`) structure, which new contributors can learn by reading any existing feature module.
- Shared packages (`@repo/types`, `@repo/constants`, `@repo/utils`, `@repo/database`) centralize logic that would otherwise be duplicated across the API and frontend. This reuse reduces drift and ensures that schema changes propagate consistently across the full stack.
- The CI pipeline, Bicep IaC modules, and GitHub Actions workflow patterns follow community-standard patterns for Azure deployments, making them immediately comprehensible to Azure-experienced engineers in any country IT team.

### Gaps and roadmap

- No upstream contributions have been made to the open-source libraries this project depends on. As the project matures and encounters edge cases in Fastify, Prisma, or Testcontainers, contributing bug reports or fixes upstream would be consistent with this principle.
- A public showcase of derivative country deployments — once the first national instances go live — would demonstrate the reuse model concretely and encourage further adoption.

---

## 8. Address privacy and security

**Statement:** Address privacy and security — assess and mitigate risks to the security and privacy of those whose data you collect.

### How we apply it

- A documented **sensitive data inventory** classifies all personal data the platform stores, describes encryption controls at rest (AES-256, Azure-platform-managed keys) and in transit (TLS 1.2+ on all channels), and maps applicable legal frameworks by country (LGPD, Ley 1581/2012, Ley 19.628, LFPDPPP, Ley 25.326, Ley 29733). See [`docs/security/sensitive-data.md`](../security/sensitive-data.md).
- The **two-dimension RBAC model** (system roles: `USER`, `ADMIN`, `SUPERADMIN`; organization roles: `VIEWER`, `CONTRIBUTOR`, `ADMIN`) limits data access to authorized users. Every API route declares the minimum required role, and the authorization plugin chain enforces these checks before any business logic executes. See [`docs/security/rbac.md`](../security/rbac.md).
- **Audit logging** records all authentication and authorization events (token validation failures, insufficient role attempts, new user provisioning) via structured Pino JSON logs. System role changes are recorded in the `UserRoleAudit` table with full transaction-level consistency. User access events are recorded in the `UserAccessLog` table. See [`docs/security/audit-logging.md`](../security/audit-logging.md).
- **Secrets are managed via Azure Key Vault** with Managed Identity authentication. The API process authenticates to the Key Vault without stored credentials. No secrets are committed to the repository. The `GITHUB_TOKEN` and Azure deployment credentials use OIDC federation in GitHub Actions, eliminating long-lived credentials from CI/CD pipelines (`docs/security/secrets.md`).
- **Security HTTP headers** (`@fastify/helmet`), **CORS policy** (`@fastify/cors`), and **rate limiting** (`@fastify/rate-limit`, 100 requests/minute per IP) are applied to all API routes. Azure Front Door provides WAF capabilities as an optional layer (`docs/security/hardening.md`).
- The platform does not collect passwords. Credential management is fully delegated to Azure Entra ID. The platform stores only the `idpUserId` (the IdP's subject identifier) and a display name and email sourced from token claims.
- Authorization tokens (`Authorization: Bearer ...`) and cookies are redacted from all log output via Pino's `redact` configuration, preventing credential leakage into log storage.

### Gaps and roadmap

- **Data-subject-access-request (DSAR) automation** is not implemented. Fulfilling requests for data access, deletion, or portability currently requires manual database operations by an administrator. This is a compliance gap relative to all target-country data protection laws (`docs/security/sensitive-data.md`).
- **File MIME-type validation and antivirus scanning** for uploaded documents are tracked as open remediation items. Currently the API verifies blob existence and reads the MIME type from Azure's storage metadata, but does not independently validate the content against the declared type or scan for malware.
- **Application Insights SDK** has not been instrumented, leaving the platform without distributed request tracing or custom security-event telemetry.
- **Field-level encryption** for PII fields (`email`, `taxId`, `representativeTaxId`) is not implemented. Protection relies on platform-level AES-256 encryption and network controls. For high-sensitivity deployments, Prisma middleware encryption is recommended in `docs/security/sensitive-data.md`.
- A public `PRIVACY.md` file at the repository root and a privacy notice in the frontend UI are documented as planned in `docs/governance.md`. These are prerequisites for regulatory compliance in all target countries.

---

## 9. Be collaborative

**Statement:** Be collaborative — work collaboratively to create solutions, share information, document your work, share your tools, and reuse the work of others.

### How we apply it

- The repository is publicly hosted under the `in-ventures/undp-huella-latam` GitHub organization. Pull requests, issues, and the full commit history are visible to anyone. The open-repository model is the primary mechanism for collaborative development.
- `CONTRIBUTING.md` (at the repository root, linking to the full guide at [`docs/development/contributing.md`](../development/contributing.md)) documents the branch workflow, commit conventions, code review expectations, and the step-by-step process for adding a new feature. Lowering the onboarding cost for new contributors is an explicit design goal.
- `CODE_OF_CONDUCT.md` based on the **Contributor Covenant 2.1** establishes community standards for respectful collaboration. It is documented as a planned root-level file in `docs/governance.md`.
- **CODEOWNERS** routing ensures that changes to security-sensitive paths require review from designated maintainers, making review responsibilities transparent and enforcing four-eyes on critical code. It is documented as a planned root-level file.
- The **modular commit policy** (one commit per logical change, Conventional Commits format, subject line under 72 characters) makes the history reviewable and every change attributable. PR authors address reviewer comments in dedicated follow-up commits with explanations, making the review dialogue traceable.
- Documentation in `docs/` is updated as part of the definition of done for every new feature or significant change. Architecture decisions, security controls, data model structure, and operational runbooks are all maintained alongside the code they describe.
- The **CodeRabbit** automated PR reviewer provides a second-opinion layer on every pull request, commenting on style, potential bugs, and missing test coverage. Contributors are expected to engage with and address its comments.
- The project is developed under UNDP Project 01000983 ("Climate Hub"), which situates it within the broader UN development cooperation ecosystem and aligns it with the DPGA's mission.

### Gaps and roadmap

- A formal **multi-country steering committee** — with representatives from each adopting country's environment ministry or IT team — is yet to be constituted. Informal governance is led by the delivery team. Formalization is planned as a post-launch activity.
- No **joint roadmap** visible to all country deployers has been published. Country-specific feature requests and priorities are currently handled through bilateral conversations rather than a shared backlog.
- Community channels (GitHub Discussions, a mailing list, or a dedicated Slack workspace for country deployers) have not been established. These are planned once the first national deployments are live.

---

## Cross-cutting practices

The following practices apply across all nine principles and reinforce the overall quality and trustworthiness of the platform:

- **TypeScript strict mode and Zod-everywhere validation:** all API contracts are defined as Zod schemas in `packages/types`, inferred as TypeScript types, and reused in the API and frontend. Runtime validation and static type safety are enforced together. `any` is prohibited by ESLint rules.
- **Test pyramid with real infrastructure:** the API test suite uses Vitest with Testcontainers, running integration tests against real PostgreSQL 18 and Azurite (Azure Storage emulator) containers. There are no database mocks. An 80% coverage threshold is enforced locally. Frontend automated testing is planned.
- **CI quality gates:** every pull request to `main` runs ESLint with `--max-warnings=0` (any warning is a CI failure), TypeScript type-check, Prettier format-check, the full integration test suite, and a production build. All checks must pass before merge. This keeps `main` perpetually deployable.
- **Conventional commits and modular commit policy:** the Git history is structured to be readable as a changelog. Each commit represents a single logical change, is prefixed with a Conventional Commits type and scope, and includes a meaningful subject line. This practice supports release automation and makes archaeological debugging tractable.

---

## References

- Principles for Digital Development — https://digitalprinciples.org/
- DPGA Standard v1.1.6 — https://digitalpublicgoods.net/standard/
- UN Roadmap for Digital Cooperation (June 2020) — https://www.un.org/en/content/digital-cooperation-roadmap/
- Internal: [`../governance.md`](../governance.md) — Governance and licensing overview.
- Internal: [`../security/README.md`](../security/README.md) — Security model index.
- Internal: [`../development/contributing.md`](../development/contributing.md) — Contributor guide.

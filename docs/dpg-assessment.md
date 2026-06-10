# Digital Public Good (DPG) Compliance Assessment

**Project:** Huella Latam — carbon footprint measurement, management, and reduction platform for Latin America
**Repository:** `undp/carbon-footprint-program` (GitHub)
**Assessment date:** 2026-06-10
**Standard assessed against:** Digital Public Goods Alliance (DPGA) **DPG Standard**, 9-indicator structure (v1.1.x line; see [Standard version note](#standard-version-note))
**Method:** Static review of the full repository (source code, Prisma schema, infrastructure-as-code, CI configuration, documentation) plus verification of repository metadata via the GitHub API. No runtime penetration testing was performed.

**Evidence labels used throughout:**

- **[V]** Verified directly (file read or API response inspected during this assessment)
- **[A]** Found by audit sweep with cited file paths (key claims spot-checked; see Methodology)
- **[I]** Reasonable inference from verified evidence
- **[U]** Unknown / could not be verified from the repository

---

## 1. Executive Summary

**Huella Latam is not yet eligible as a Digital Public Good, but it is unusually close for a project at this stage — most blockers are administrative rather than architectural.**

The project fails the DPG Standard's hardest gate today: **Indicator 2 (Use of Approved Open Licenses)**. The GitHub repository is **private** [V], and although MIT is declared in the README and in all four `package.json` files [V], **no `LICENSE` file exists anywhere in the repository** [V]. A DPG must carry an OSI-approved license applied in a publicly accessible repository; neither condition is met. The project's own `docs/governance.md` already acknowledges this and lists the missing root-level files as "a prerequisite for acceptance into the Digital Public Goods Alliance registry" [V].

Beyond licensing, one **critical do-no-harm finding** must be fixed before any public release or DPG submission: every newly created user is automatically assigned the `SUPERADMIN` system role (`apps/api/src/plugins/app/userResolvePlugin.ts:52-53`, marked `// TODO: remove when finishing the demo`) [V]. A hardcoded JWT secret fallback (`apps/api/src/config/environment.ts:4`) [V] compounds this.

Counterbalancing these gaps, the project shows **strong DPG-aligned engineering**: an exceptionally complete documentation set (80+ documents covering architecture, data model, security, operations, and a dedicated country-onboarding guide), genuine open-standards adoption (GHG Protocol, ISO 14064-1:2018, IPCC emission factors, OpenAPI 3.0, OIDC/JWKS, OOXML exports), a candid self-assessment culture (`governance.md`, `sensitive-data.md`, `risks-and-limitations.md` all document their own gaps honestly), pluggable backend authentication that supports any OIDC provider, deliberate use of open-source-only MUI X packages, and a country-agnostic configuration model that is the core design principle of the platform.

**Verdict: NOT DPG-READY today.** Estimated path to a credible DPGA submission: **2–4 weeks** of focused work for eligibility blockers (Phase 0–1 of the roadmap below), **2–3 months** for a strong application. Confidence in this assessment: **high** for repository-level findings (directly verified), **medium** for the mapping to the exact current DPG Standard text (the DPGA website was unreachable during this assessment; see Standard version note).

---

## 2. Standard Version Note

The DPGA publishes the DPG Standard at <https://www.digitalpublicgoods.net/standard>. That page returned HTTP 403 to automated access during this assessment, so the indicator set was cross-checked against:

- The DPGA's GitHub mirror (<https://github.com/DPGAlliance/DPG-Standard>), which reflects the stable 9-indicator structure (1. SDG relevance, 2. open licensing, 3. clear ownership, 4. platform independence, 5. documentation, 6. mechanism for extracting data, 7. privacy and applicable laws, 8. standards & best practices, 9. do no harm by design, with sub-indicators 9a/9b/9c).
- Public reporting that the current published version is **v1.1.6 (September 2024)** and that **2025 updates** added AI-system requirements and an annex of privacy and data security best practices.

This project is a **software** DPG candidate (not an AI system, content collection, or dataset), so the classic 9 indicators are the applicable requirement set. Before submission, the team should re-verify the exact questionnaire wording on the DPGA submission portal. **[U: exact current questionnaire text]**

---

## 3. Compliance Matrix

| #   | DPG Standard indicator                  | Status                                           | One-line basis                                                                                                                                                           |
| --- | --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Relevance to SDGs                       | 🟡 **Partially met**                             | Clear climate-action purpose (SDG 13), but zero explicit SDG references anywhere in README or docs [V]                                                                   |
| 2   | Use of approved open licenses           | ❌ **Not met**                                   | MIT declared [V] but no `LICENSE` file [V] and repository is **private** [V] — license is neither applied nor publicly verifiable                                        |
| 3   | Clear ownership                         | 🟡 **Partially met**                             | Repo sits in the UNDP GitHub org [V]; README credits "UNDP Huella Latam Team" [V]; but no copyright notice exists and `governance.md` leaves the holder TBD [V]          |
| 4   | Platform independence                   | 🟡 **Partially met**                             | Open core stack; pluggable backend auth (any OIDC) [V]; but Azure Blob Storage is mandatory with no abstraction [A], frontend is MSAL-locked [A], IaC is Azure-only [V]  |
| 5   | Documentation                           | ✅ **Met (content)** — blocked by repo privacy   | 80+ docs incl. setup, deployment, country onboarding, ops runbook [V]; inaccessible to the public while the repo is private [V]                                          |
| 6   | Mechanism for extracting data           | ✅ **Met (with caveats)**                        | OOXML/Excel exports, bulk ZIP download, JSON REST API with OpenAPI 3.0 spec, JSON seed import path [V/A]; no CSV or whole-dataset portability export                     |
| 7   | Adherence to privacy & applicable laws  | 🟡 **Partially met**                             | Six countries' privacy laws mapped and T&C acceptance flow implemented [V/A]; but no privacy policy artifact, no data-subject-rights workflow, hard-delete only [V/A]    |
| 8   | Adherence to standards & best practices | ✅ **Largely met**                               | GHG Protocol / ISO 14064 / IPCC / GWP [A], OpenAPI 3.0, OIDC/JWKS, ISO 3166, SemVer + Conventional Commits, 5-gate CI, 148 API test files [V/A]; no release tags yet [V] |
| 9   | Do no harm by design                    | 🟡 **Partially met** (one critical blocker)      | Sound security architecture documented, but demo-era SUPERADMIN auto-assignment [V] and hardening gaps must be closed                                                    |
| 9a  | — Data privacy & security               | 🟡 **Partially met**                             | Encryption at rest/in transit, RBAC, audit models, short-lived SAS URLs, log redaction [V/A]; offset by critical/high code findings (see §5.9)                           |
| 9b  | — Inappropriate & illegal content       | 🟡 **Undocumented (likely low exposure)**        | No public user-generated content; uploads are org-scoped and access-controlled [V]; no content policy exists to state this [V]                                           |
| 9c  | — Protection from harassment            | ⚪ **Likely N/A — justification not documented** | No user-to-user interaction/messaging features found [A/I]; DPGA submission requires an explicit justification statement                                                 |

---

## 4. Methodology and Evidence Basis

1. **Direct file review [V]:** README, root `package.json`, `docs/governance.md`, `docs/development/contributing.md`, `docs/overview/project-overview.md`, `docs/overview/transparency.md`, `docs/security/sensitive-data.md`, `docs/security/authentication.md`, `docs/development/data-export.md`, `docs/development/country-onboarding.md`, `docs/operations/risks-and-limitations.md`, `docs/development/i18n-plan.md`, `docs/integrations.md`, `docs/release/versioning.md`, `docs/README.md`, `.github/workflows/ci.yml`, `docker-compose.yml` service list, `apps/web/index.html`, `apps/api/src/plugins/app/userResolvePlugin.ts`, `apps/api/src/config/environment.ts`.
2. **Repository metadata [V]:** GitHub API confirms `"visibility": "private"`, owner `undp`, created 2025-11-18, default branch `main`, 0 stars, 1 fork, issues enabled, wiki/discussions disabled, **no git tags / releases**. An unauthenticated request to the repository URL returns 404, confirming no anonymous public access.
3. **Audit sweeps [A]:** two systematic code audits (security/privacy; platform-independence/standards/accessibility) covering ~150 files with path-level citations. The two highest-severity claims (SUPERADMIN default, JWT fallback secret) were independently re-verified by direct file read before inclusion. Remaining [A] items cite specific paths and are consistent with the documentation, but were not all individually re-read.
4. **External verification:** DPG Standard structure cross-checked as described in §2. The live deployment(s) were **not** accessed; all findings are repository-based. **[U: production configuration may differ from repository defaults]**

**Not assumed:** absence of evidence is reported as absence (e.g., no SDG mapping, no privacy policy, no accessibility statement), not as silent compliance.

---

## 5. Detailed Findings by Indicator

### 5.1 Indicator 1 — Relevance to SDGs: 🟡 Partially met

**What exists:**

- The platform's purpose — organizational GHG inventory measurement, verification, reduction projects, and public transparency — is squarely within **SDG 13 (Climate Action)**, with credible secondary relevance to SDG 12 (responsible production, corporate reporting) and SDG 17 (multi-country partnership model). `docs/overview/project-overview.md` states the goal and use cases clearly [V].
- DPG intent is explicit: `docs/governance.md` has a "Digital Public Good Status" section [V].

**Gap:** a repository-wide search for "SDG" / "Sustainable Development" / "Desarrollo Sostenible" returns **zero matches** in any markdown documentation [V]. DPGA requires the applicant to _state_ the relevant SDG(s) and provide supporting evidence links. This is a documentation-only gap and trivially fixable.

### 5.2 Indicator 2 — Use of Approved Open Licenses: ❌ Not met (eligibility blocker)

**What exists:**

- `README.md` §License declares "MIT" [V].
- All four `package.json` files declare `"license": "MIT"` [V].
- `docs/governance.md` describes intended MIT licensing, country deployment rights, and explicitly recommends adding a LICENSE file naming the copyright holder [V].

**Gaps (each independently blocking):**

1. **No `LICENSE` file exists** at the root or anywhere in the tree [V]. Under the DPG Standard, the license must be _applied_ — a README mention is not sufficient, and without a license grant the code is legally all-rights-reserved regardless of intent.
2. **The repository is private** [V — GitHub API `"visibility": "private"`; anonymous HTTP 404]. A DPG's source and license must be publicly accessible and verifiable. There is no evidence of a public mirror. **[U: whether publication is already planned/scheduled]**
3. Contributor licensing has not been confirmed (governance.md itself lists "confirm that all current contributors have licensed their contributions compatibly" as a pending action) [V]. No CLA/DCO process exists [V — no such files].

### 5.3 Indicator 3 — Clear Ownership: 🟡 Partially met

**What exists:**

- The repository lives in the **UNDP GitHub organization** [V], which is meaningful public signal of organizational ownership.
- README "Team" section: "UNDP Huella Latam Team" [V].
- `docs/governance.md` addresses IP for methodology content, third-party dependencies, and user-generated content (organizations own their inventory data; platform acts as processor) [V] — a thoughtful data-ownership position that many applicants lack.

**Gaps:**

- **No copyright notice anywhere** (no LICENSE, no NOTICE, no headers) [V].
- `governance.md` itself leaves the copyright holder undecided: _"naming the copyright holder (e.g., 'United Nations Development Programme' **or the delivery organization**)"_ [V]. DPGA requires ownership to be clearly defined and documented. The UNDP-vs-vendor question must be legally resolved and written down. **[U: contractual IP arrangement between UNDP and the delivery team]**
- No trademark/name-rights statement (relevant because governance.md permits rebranding by adopters) [V].

### 5.4 Indicator 4 — Platform Independence: 🟡 Partially met

The DPG Standard requires that mandatory closed/proprietary components be identified and that functional, open alternatives exist (or independence be demonstrated).

**Open by design [V/A]:**

- Core stack fully open source: Node.js, Fastify, Prisma, PostgreSQL, React, Vite, MUI, Tailwind.
- **Deliberate open-source choice documented:** `docs/development/datagrid.md` states the project intentionally uses `@mui/x-data-grid` community edition and _not_ the commercial Pro build [V]; no MUI X license keys exist [A].
- **Backend authentication is provider-agnostic:** four `AUTH_PROVIDER` implementations (`jwks`, `easy-auth`, `forced-user`, `none`) behind an interface (`apps/api/src/auth/AuthProvider.ts`) [A]; the generic JWKS provider supports `JWKS_URI`/`JWKS_ISSUER`/`JWKS_AUDIENCE` overrides and its code comments name Auth0, Okta, Keycloak, and Google as supported [A]. `docs/overview/project-overview.md` confirms: "Alternative OIDC/JWKS providers are supported via generic JWKS configuration, but Azure is the primary tested path" [V].
- No analytics, error-tracking, or email SaaS integrations in application code [A].
- `docker-compose.yml` provides a self-hostable local stack: `postgres` (v18-alpine), `api`, `web`, `migrate` [V].

**Closed/proprietary dependencies and their status:**

| Component                                                      | Mandatory?                                                                      | Open alternative                                                                                                                                                                                                                                                                                                                                       | Evidence |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Azure Blob Storage**                                         | Yes, in production (file uploads, badges, T&C files)                            | **None implemented.** `@azure/storage-blob` SDK used directly across ~26 files; no storage abstraction layer; `docs/operations/risks-and-limitations.md` states "No application-level fallback to an alternative storage backend exists" [V/A]. Azurite (open-source emulator) is used in tests only — it is **not** a service in docker-compose [V/A] |
| **Microsoft Entra ID (frontend)**                              | Yes — `apps/web` is hard-wired to `@azure/msal-browser`/`@azure/msal-react` [A] | None without code changes; backend would accept any OIDC issuer but the SPA cannot produce tokens from a non-MSAL IdP today [A/I]                                                                                                                                                                                                                      |
| **Azure IaC (Bicep), App Service, Front Door, ACR, Key Vault** | For the reference deployment                                                    | Docker images + docker-compose exist [V]; `project-overview.md` is candid: "Deploying to other cloud providers would require rewriting the IaC layer" [V]                                                                                                                                                                                              |
| **Microsoft Entra ID (backend validation)**                    | No — generic JWKS path exists                                                   | ✅ Any OIDC provider [A/V]                                                                                                                                                                                                                                                                                                                             |

**Assessment:** the _application_ is closer to platform-independent than the _deployment_. For DPG purposes the team must either (a) implement/document a fully open self-host path (e.g., MinIO or filesystem storage adapter + Keycloak walkthrough + Azurite in docker-compose), or (b) explicitly document the closed components and their functional open alternatives in line with DPGA guidance. Currently the honest docs document the _lock-in_, not the _alternative_.

### 5.5 Indicator 5 — Documentation: ✅ Met on content; blocked by repository privacy

**What exists [V]:** an unusually complete `docs/` tree (80+ files) with a navigable index (`docs/README.md`), covering: project overview and workflows; system architecture and emission-calculation logic; full data-model documentation with ER diagram; local setup, environment variables, testing, CI/CD; deployment guides (Bicep, App Service, Static Web Apps, migrations, file storage, MSAL setup); operations (runbook with backup/restore, observability, scaling playbook, admin guide, risks); security (authentication, RBAC, sensitive data, secrets, hardening, audit logging); release/versioning; glossary; and — directly relevant to DPG reuse — a **Country Onboarding Guide** (`docs/development/country-onboarding.md`) explaining exactly how a new country deploys the platform via seed data and configuration [V].

**Gaps:**

- All of it is **inaccessible to the public** while the repo is private [V] — the indicator requires documentation available to "anyone" who wants to launch the solution.
- README drift [V]: points to `docs/Infra/Deployment.md` (actual: `docs/infrastructure/Deployment.md`), describes a books-feature example structure and JWT-auth stack that don't match the current codebase, and contains the placeholder clone URL `github.com/your-org/undp-huella-latam`. Minor, but it is the first document an evaluator reads.

### 5.6 Indicator 6 — Mechanism for Extracting Data: ✅ Met (with caveats)

The requirement: non-PII data must be extractable/importable in non-proprietary formats.

**What exists:**

- **Excel (OOXML — an ISO/IEC 29500 open standard) exports** built client-side with the open-source `exceljs`: carbon inventory (3-sheet workbook incl. per-line factors and sources), methodology export, reduction project, reduction plan (`apps/web/src/utils/export*.ts`, documented in `docs/development/data-export.md`) [V/A].
- **Bulk ZIP download** of a complete carbon inventory (workbooks + README + all attached evidence files) via `client-zip` (`useDownloadCarbonInventory`; PR #328 in git history) [V/A].
- **JSON REST API with OpenAPI 3.0 spec** generated from Zod schemas; raw spec served at `/api/docs/json` and `/api/docs/yaml` [V — `docs/integrations.md`]. All domain data is reachable through documented endpoints.
- **Public transparency endpoint** (`GET /api/transparency`) exposing the non-PII public registry without authentication [V].
- **Import path:** country methodologies, sectors, factors etc. load from declarative JSON seed files (`packages/database/src/prisma/seeds/data/base/`) [V] — the de facto data import mechanism for new deployments. Database-level backup/restore is documented in the operations runbook [V — index entry].

**Caveats [V — the project's own data-export doc]:** no CSV, no batch/whole-dataset export, no scheduled exports, no server-side export; JSON is available via API but not packaged as a one-click portability export. Acceptable for the indicator, but worth strengthening (see roadmap).

### 5.7 Indicator 7 — Adherence to Privacy and Applicable Laws: 🟡 Partially met

**What exists:**

- `docs/security/sensitive-data.md` is a genuine privacy analysis [V]: a PII inventory (user identity fields; organization representative name, tax ID, phone, email), data classification, at-rest/in-transit protection description, retention table, and — notably — a **mapping of the applicable data-protection law in six target countries** (Mexico LFPDPPP, Colombia Ley 1581/2012, Argentina Ley 25.326, Brazil LGPD, Chile Ley 19.628, Peru Ley 29733) with GDPR-aligned principles.
- **Terms & conditions acceptance is implemented end-to-end** [A]: `termsAccepted`/`termsAcceptedAt` on the `User` model, `/api/terms-conditions/current` and `/file` endpoints, and a frontend acceptance checkbox referencing the "política de uso de datos personales".
- Purpose limitation and data minimization are designed in (PII originates from IdP token claims; no marketing/profiling use) [V — sensitive-data.md].

**Gaps (all acknowledged in the project's own docs [V]):**

- **No privacy policy/notice artifact exists in the product** — only the T&C file slot [A].
- **No data-subject-rights workflow** (access/rectification/erasure/portability): requests "must be fulfilled manually by administrators using direct database access" [V].
- User deletion is a **hard delete** with no anonymization option (`apps/api/src/features/users/deleteUser/service.ts`) [A] — in tension with the documented audit-trail design intent.
- No DPIA, no breach-notification workflow, no legal-basis documentation, no DPA templates [V — listed as deployment-team responsibilities].
- The platform disclaims compliance certification and delegates it to deploying countries [V]. That split of responsibility is legitimate for a DPG _if documented_ — but the platform must still ship the technical capabilities (notice, consent, DSR support) that make deployer compliance feasible.

### 5.8 Indicator 8 — Adherence to Standards & Best Practices: ✅ Largely met

**Domain standards [A, spot-consistent with docs]:**

- Methodology seeds explicitly cite **GHG Protocol** as the regulation; category explanations reference **ISO 14064-1:2018**; emission factors cite **IPCC** sources (40+ references); GWP handling supports **AR5/AR6** with per-gas factors; `tCO₂e` units throughout.
- **ISO 3166-1 alpha-2** country codes anchor the country-agnostic data model [V — country-onboarding.md].

**Technical standards [V/A]:** OpenAPI 3.0, OAuth2/OIDC + JWT/JWKS (RFC 7517/7519), OOXML exports, PostgreSQL, REST, semantic versioning policy, Conventional Commits.

**Engineering best practices [V/A]:** CI on every PR with five parallel gates (lint with zero-warning policy, type-check, format check, test with coverage artifact, build) [V — `.github/workflows/ci.yml`]; 148 API test files using Vitest + Testcontainers against real PostgreSQL/Azurite [A]; strict TypeScript; shared ESLint config including `eslint-plugin-jsx-a11y` (recommended ruleset, enforced in CI) [A]; documented branch protection, mandatory review, squash merges [V]; automated review via CodeRabbit [V].

**Gaps:** no git tags or releases yet (version 0.0.0; SemVer documented but unexercised) [V]; no CHANGELOG [V]; frontend tests "not implemented yet" [A — web package.json]; no dependency-vulnerability scanning (no Dependabot/Renovate config, no CodeQL, no audit step in CI) [V/A]; accessibility practice exists at lint level but no WCAG target or audit is documented, and `apps/web/index.html` declares `lang="en"` for a Spanish-only UI [V]; UI is Spanish-only with i18n explicitly "not implemented" (plan exists: `docs/development/i18n-plan.md`) [V].

### 5.9 Indicator 9 — Do No Harm by Design: 🟡 Partially met (one critical blocker)

#### 9a. Data privacy & security — 🟡 Partially met

**Designed-in protections [V/A]:**

- Two-dimension RBAC (system roles USER/ADMIN/SUPERADMIN; organization roles VIEWER/CONTRIBUTOR/ADMIN) enforced via dedicated Fastify authorization plugins.
- Encryption at rest (AES-256, Azure-managed keys) and in transit (TLS 1.2+ on every hop, `sslmode=require` to PostgreSQL) [V — sensitive-data.md, mirrored in Bicep].
- File access exclusively via **15-minute, HTTPS-only, user-delegation SAS URLs**; storage account keys never exposed [A — `blobService.ts`, `SAS_URL_EXPIRY_MINUTES`].
- Anonymous inventory access tokens are PostgreSQL `gen_random_uuid()` v4 UUIDs (not enumerable) [A].
- Log redaction of `authorization` and `cookie` headers and password fields; request-scoped UUIDs [A — `app.ts`].
- Audit models: `UserRoleAudit` (role changes) and `UserAccessLog` (access events) [A]; `createdById`/`updatedById` on records [V].
- Upload constraints: MIME whitelist and 5 MB limit for badges; 20 MB/5-file multipart limits [A].
- Secrets via Azure Key Vault + managed identities in infra; no hardcoded credentials found in source [A]; GitHub→Azure deployment via OIDC federation (no long-lived cloud secrets) [V — sensitive-data.md].
- The public transparency endpoint exposes an explicit allowlist of non-PII fields, with documented redaction rationale [V — transparency.md].

**Findings against (ordered by severity):**

| Sev.         | Finding                                                                                                                                        | Evidence                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Critical** | **Every newly created user is auto-assigned `SUPERADMIN`** — a demo-era default that grants full system control to anyone who can authenticate | `apps/api/src/plugins/app/userResolvePlugin.ts:52-53` (`// TODO: remove when finishing the demo`) **[V]** |
| **High**     | Hardcoded JWT secret fallback `"super-secret-key"` if env unset                                                                                | `apps/api/src/config/environment.ts:4` **[V]**                                                            |
| **High**     | No dependency/security scanning anywhere (no Dependabot, CodeQL, audit step, secret scanning config)                                           | `.github/` **[V/A]**                                                                                      |
| **High**     | Hard-delete of users; no anonymization/soft-delete; cascading reference impact                                                                 | `features/users/deleteUser/service.ts` **[A]**                                                            |
| Medium       | No HTTP security headers (no helmet/CSP/HSTS/X-Frame-Options)                                                                                  | `apps/api/src/plugins/external/` **[A]**                                                                  |
| Medium       | CORS defaults to `origin: true` (allow-all) unless `ALLOWED_ORIGIN` is set                                                                     | `plugins/external/cors.ts` **[A]**                                                                        |
| Medium       | MSAL tokens cached in `localStorage` (XSS exposure surface)                                                                                    | `apps/web/src/config/msalConfig.ts` **[A]**                                                               |
| Medium       | Rate limiting is in-memory, 100 req/min/IP — ineffective across multiple instances (acknowledged in docs)                                      | `plugins/external/rate-limit.ts`; `docs/integrations.md` **[V/A]**                                        |
| Medium       | No field-level encryption for PII (acknowledged, with recommendation, in sensitive-data.md)                                                    | **[V]**                                                                                                   |
| Low          | Uploaded original filenames not sanitized; action-level audit trail incomplete; logs may carry PII by reference (acknowledged)                 | **[A/V]**                                                                                                 |

#### 9b. Inappropriate & illegal content — 🟡 Undocumented (likely low exposure)

The platform hosts no public user-generated content: uploads are organization-scoped evidence documents behind authentication and SAS URLs [V], and the only public surface is the transparency registry's allowlisted fields [V]. Exposure is therefore structurally low **[I]**. However, the platform _does_ store and distribute user-uploaded files within organizations, and **no content policy, moderation process, or takedown mechanism is documented** [V — no such document exists]. DPGA will ask; a short policy (admin removal process, prohibited-content clause in the T&C) closes this.

#### 9c. Protection from harassment — ⚪ Likely N/A, justification not documented

No user-to-user messaging, comments-between-users, or social features were found [A/I]; interaction is workflow-based (organization ↔ admin review). The DPGA questionnaire accepts "not applicable" with justification — that justification needs to be written down.

---

## 6. Strengths

1. **DPG-aware by design:** country-agnosticism via seed data and system parameters is the project's core architectural principle (CLAUDE.md, governance.md, country-onboarding.md) — exactly the reusability DPGA looks for.
2. **Documentation depth far above typical applicants**, including honest self-assessments that already enumerate most compliance gaps (`governance.md` even contains a table of missing root files and names DPGA acceptance as the reason to add them).
3. **Open standards at the domain level** — GHG Protocol, ISO 14064-1:2018, IPCC factors, AR5/AR6 GWP — give the carbon data genuine cross-deployment meaning.
4. **Interoperability surface:** Zod-derived OpenAPI 3.0 spec, JSON API, OOXML exports, bulk ZIP download, public transparency endpoint.
5. **Pluggable backend authentication** (interface-based providers; generic JWKS supporting Keycloak/Auth0/Okta/Google) — most of the auth lock-in problem is already solved server-side.
6. **Deliberate avoidance of commercial licenses** (MUI X community edition only, documented as a decision).
7. **Strong engineering hygiene:** 5-gate CI with zero-warning lint, 148 integration-test files against real containers, strict TypeScript, a11y linting, conventional commits, documented review rules.
8. **Security architecture fundamentals are right:** short-lived user-delegation SAS URLs, OIDC federation for CI→cloud, Key Vault + managed identities, log redaction, RBAC plugins, audit tables, allowlisted public endpoint.

---

## 7. Gap Register (by severity)

**Blocker — DPG eligibility (cannot submit at all):**

| ID  | Gap                                              | Indicator |
| --- | ------------------------------------------------ | --------- |
| B1  | Repository is private; no public source access   | 2, 5      |
| B2  | No `LICENSE` file (MIT declared but not applied) | 2         |
| B3  | Copyright holder undefined; no ownership notice  | 3         |
| B4  | No SDG relevance statement                       | 1         |

**Critical — would fail do-no-harm review / unsafe to publish:**

| ID  | Gap                                                                              | Indicator |
| --- | -------------------------------------------------------------------------------- | --------- |
| C1  | Auto-`SUPERADMIN` on first login (demo backdoor)                                 | 9a        |
| C2  | Hardcoded JWT secret fallback                                                    | 9a        |
| C3  | No privacy policy artifact + no data-subject-rights mechanism (hard-delete only) | 7, 9a     |

**High:**

| ID  | Gap                                                                                                                                          | Indicator |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| H1  | Azure Blob Storage mandatory, no storage abstraction or documented open alternative                                                          | 4         |
| H2  | Frontend hard-wired to MSAL (no generic OIDC path for the SPA)                                                                               | 4         |
| H3  | No dependency/vulnerability scanning, no secret scanning, no security CI                                                                     | 8, 9a     |
| H4  | Missing community/governance root files: `SECURITY.md`, `CODE_OF_CONDUCT.md`, root `CONTRIBUTING.md`, `CODEOWNERS` (already self-identified) | 3, 8      |
| H5  | No HTTP security headers; permissive CORS default                                                                                            | 9a        |

**Medium:**

| ID  | Gap                                                                                  | Indicator         |
| --- | ------------------------------------------------------------------------------------ | ----------------- |
| M1  | Spanish-only UI; i18n unimplemented (plan exists); `lang="en"` mismatch              | 5, 8, inclusivity |
| M2  | No WCAG target, audit, or accessibility statement (lint-level a11y only)             | 8, 9              |
| M3  | No releases/tags/CHANGELOG (SemVer documented but unexercised)                       | 8                 |
| M4  | No CSV/whole-dataset portability export; client-side-only export generation          | 6                 |
| M5  | In-memory rate limiting; MSAL tokens in localStorage; PII unencrypted at field level | 9a                |
| M6  | Content policy (9b) and harassment N/A justification (9c) not documented             | 9b, 9c            |

**Low:** README drift (broken doc paths, placeholder URLs, stale architecture description); no frontend tests; filename sanitization on upload; incomplete action-level audit trail; no PWA/offline story (not required by the Standard).

---

## 8. Prioritized Remediation Roadmap

### Phase 0 — Eligibility blockers (≈ 1 week, mostly decisions + small diffs)

1. **Fix C1 and C2 first** (they gate publication): default new users to `SystemRole.USER` and provide the existing `db:promote-superadmin` script as the bootstrap path; remove the `JWT_SECRET` fallback (fail fast if unset when the secret is actually used). _(C1 is a two-line change already marked TODO.)_
2. **Add `LICENSE`** (MIT text) naming the resolved copyright holder, plus a copyright line in README. Resolve the UNDP-vs-delivery-org IP question (B3) — this is a legal/contractual decision, not code.
3. **Add an SDG relevance section** to README and `docs/overview/project-overview.md` (primary SDG 13, with 13.2/13.3 targets; secondary SDG 12/17) with links to the relevant national commitments (e.g., NDC programs) the platform supports.
4. **Pre-publication hygiene sweep, then make the repository public** (or stand up a public mirror with synchronized releases): run secret scanning over full history, scrub PDFs/annexes for internal data, fix README drift. B1 is an organizational decision for UNDP — schedule it explicitly.

### Phase 1 — Credible DPGA submission (≈ 2–3 weeks)

5. **Root community files** (all already recommended by `governance.md`): `SECURITY.md` (private vulnerability reporting), `CODE_OF_CONDUCT.md` (Contributor Covenant), root `CONTRIBUTING.md` linking to `docs/development/contributing.md`, `CODEOWNERS`, `CHANGELOG.md`, and a first tagged release (`v0.1.0`).
6. **Privacy minimum viable compliance** (C3): privacy-notice page served like the existing T&C flow; soft-delete + anonymization for `User`/`OrganizationData`; a documented data-subject-request runbook for deployers; state the per-country legal mapping (already written in `sensitive-data.md`) in the DPG application.
7. **Platform-independence statement + cheapest concrete fixes** (H1/H2): add Azurite as a docker-compose service so the self-host stack is complete; document the generic-OIDC backend path as supported; either implement a thin storage interface with a filesystem/MinIO driver or formally document Azurite self-hosting as the open alternative; document Keycloak (or any OIDC CIAM) as the frontend alternative and what it would take.
8. **Security CI** (H3/H5): enable Dependabot + CodeQL + GitHub secret scanning; add `@fastify/helmet`; make CORS deny-by-default in production.
9. **Write the do-no-harm statements** (M6): content policy for uploaded documents (9b) and the 9c N/A justification.

### Phase 2 — Strong DPG citizenship (≈ 1–3 months, parallelizable)

10. **Accessibility:** fix `lang="es"`, run a WCAG 2.1 AA self-audit on the main flows, publish an accessibility statement, add automated checks (axe) to CI.
11. **i18n execution** per the existing `i18n-plan.md` (es/pt/en) — significantly widens the DPG's addressable region (Brazil).
12. **Data portability:** server-side full-inventory export (CSV + JSON), organization-level data export endpoint (also closes the privacy portability gap).
13. **Operational hardening:** Redis-backed rate limiting (already in the scaling playbook), action-level audit logging, field-level encryption option for high-sensitivity deployments.
14. **Governance formalization:** `GOVERNANCE.md` with the steering model `governance.md` sketches (UNDP + country implementation leads), public issue templates, and a public roadmap.

---

## 9. Final Assessment

| Question                                               | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Does the project qualify as a DPG today?**           | **No.** Indicator 2 fails outright (private repository, license not applied), Indicators 1 and 3 fail on missing documentation that takes hours to write, and Indicator 9a carries a critical demo-era access-control defect that must be fixed before the code is published at all.                                                                                                                                                                                         |
| **Is the gap structural or administrative?**           | **Predominantly administrative.** The architecture, documentation, standards adoption, and configuration-over-fork design are genuinely DPG-grade. The two real engineering gaps are storage abstraction (Indicator 4) and the privacy/DSR feature set (Indicator 7).                                                                                                                                                                                                        |
| **Estimated effort to submit credibly**                | Phases 0–1: **~2–4 weeks** of focused work plus two organizational decisions (repository publication; copyright holder).                                                                                                                                                                                                                                                                                                                                                     |
| **Most likely DPGA review friction after remediation** | Indicator 4 (Azure-centricity of the reference deployment) and Indicator 7 (privacy tooling depth) — both manageable with the documented-alternative + deployer-responsibility framing if the Phase 1 items land.                                                                                                                                                                                                                                                            |
| **Confidence**                                         | **High** on all repository-level findings (key claims verified by direct file inspection and GitHub API). **Medium** on the exact current DPG Standard questionnaire wording (official site unreachable during assessment; structure cross-checked via DPGA's GitHub and 2024–2025 public reporting). **Unknowns:** production runtime configuration; UNDP's publication timeline and IP arrangements; whether a public mirror or parallel DPGA conversation already exists. |

**Bottom line:** Huella Latam is a strong DPG _candidate_ held back by a private repository, an unapplied license, and one critical leftover demo default. The project's own governance documentation already prescribes most of the cure; executing Phase 0–1 of the roadmap would move it from "not eligible" to "competitive applicant."

---

## 10. References

- DPG Standard (official): <https://www.digitalpublicgoods.net/standard> _(HTTP 403 to automated access on 2026-06-10; version 1.1.6 per public reporting)_
- DPG Standard GitHub mirror: <https://github.com/DPGAlliance/DPG-Standard>
- DPGA 2025 Ecosystem Report (standard updates: AI systems; privacy & data security annex): <https://www.digitalpublicgoods.net/2025-DPG-Ecosystem-Report>
- DPGA privacy & data security framework announcement: <https://www.digitalpublicgoods.net/blog/privacy-and-data-security-framework-for-dpg-standard>
- Internal evidence: file paths cited inline throughout this document; repository metadata via GitHub API on 2026-06-10.

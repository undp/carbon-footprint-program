# DPG Standard Compliance Assessment — Huella Latam

**Assessment date:** 2026-06-09
**Standard assessed against:** Digital Public Goods Alliance (DPGA) DPG Standard — 9 indicators (current published version, including the 2025 update; see [digitalpublicgoods.net/standard](https://www.digitalpublicgoods.net/standard))
**Scope:** Full repository review — source code, licensing, documentation, governance, security, privacy, accessibility, interoperability, data protection, and deployment model.
**Method:** Static review of the repository contents and git metadata, plus an unauthenticated check of the public GitHub URL. No runtime testing, dependency license audit, or review of production environments was performed. Findings are labeled **[Verified]** (directly observed in the repo), **[Inferred]** (reasonable conclusion from observed evidence), or **[Unknown]** (could not be determined from available evidence).

---

## 1. Executive Summary

Huella Latam is a country-agnostic carbon footprint measurement and recognition platform explicitly designed and documented as a digital public good. The engineering substance of the project is strong: documentation is unusually thorough (architecture, data model, security, country onboarding, operations), the API exposes an OpenAPI 3.0 specification, the methodology aligns with the GHG Protocol and IPCC sources, data is stored in standard PostgreSQL, and a Docker Compose path plus a provider-agnostic JWKS auth mode give a credible (if partial) non-Azure deployment story.

**However, the project does not currently qualify as a DPG.** Three foundational requirements are unmet:

1. **No open-source license artifact.** The README and `package.json` declare MIT, but there is no `LICENSE` file, and no copyright holder is named anywhere. A declared-but-unattached license does not satisfy DPG Indicator 2.
2. **The repository appears to be private.** An unauthenticated request to `github.com/undp/carbon-footprint-program` returns HTTP 404, which is GitHub's behavior for private repositories. A DPG's source code must be publicly accessible.
3. **Ownership is not clearly asserted.** No copyright statement, trademark declaration, or named legal owner exists (the README says only "UNDP Huella Latam Team"), so DPG Indicator 3 cannot be evidenced.

These are administrative rather than architectural failures. The project's own `docs/governance.md` already acknowledges most of them. The remaining gaps — privacy policy and data-subject rights, vulnerability disclosure process, code of conduct, security header hardening, dependency scanning — are typical of a pre-launch project and are individually small.

**Verdict: NOT YET DPG-COMPLIANT — but a strong candidate.** With roughly 2–4 weeks of mostly non-engineering work (license, ownership, public release, community/security files, privacy policy) plus a handful of small engineering tasks, the project could plausibly pass DPGA review. Confidence in this assessment: **high** for repository-internal findings, **medium** overall due to unknowns listed in §7.

---

## 2. Compliance Matrix

| #   | DPG Standard Indicator                  | Status                | Key Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Relevance to the SDGs                   | ⚠️ Partially met      | [Verified] Direct SDG 13 (Climate Action) relevance: organizational GHG measurement, reduction planning, public recognition (`docs/overview/project-overview.md`). [Verified] No explicit SDG mapping document or stated targets exists — the DPGA application requires an articulated, evidenced SDG link.                                                                                                                                                                                                                                                                                                                                                 |
| 2   | Use of approved open license            | ❌ Not met            | [Verified] No `LICENSE` file at root. MIT declared in `README.md` ("License: MIT") and in root/app `package.json` files. [Verified] `docs/governance.md` itself flags the missing file. MIT is DPGA-approved, so remediation is trivial — but today the codebase carries no effective license grant.                                                                                                                                                                                                                                                                                                                                                        |
| 3   | Clear ownership                         | ❌ Not met            | [Verified] No copyright notice, no named legal owner, no trademark statement anywhere in the repo. `docs/governance.md` recommends naming a holder ("e.g., UNDP or the delivery organization") — i.e., ownership is explicitly undecided. Git history shows individual contributors with no CLA/DCO.                                                                                                                                                                                                                                                                                                                                                        |
| 4   | Platform independence                   | ⚠️ Partially met      | [Verified] Open core: standard PostgreSQL (runs in Docker, `postgres:18-alpine`), generic OIDC/JWKS auth mode (`AUTH_PROVIDER=jwks` with `JWKS_URI/ISSUER/AUDIENCE` env vars), full-stack `docker-compose.yml`. [Verified] Closed/proprietary dependencies without open alternatives: file storage hard-coded to Azure Blob SDK (`apps/api/src/plugins/app/blobStoragePlugin.ts`), IaC is Azure Bicep only, email planned on Azure Communication Services. `docs/overview/project-overview.md` states other clouds "would require rewriting the IaC layer." DPG requires documented, functional open alternatives for mandatory closed components.          |
| 5   | Documentation                           | ✅ Met                | [Verified] Exceptional: indexed `docs/` tree covering overview, architecture, data model (ER diagram), security (9 documents), infrastructure, operations runbooks, release process, and an 11-step `docs/development/country-onboarding.md`. A technically capable deployer can install and operate from docs alone (with Azure expertise).                                                                                                                                                                                                                                                                                                                |
| 6   | Mechanism for extracting data           | ✅ Met (minor gaps)   | [Verified] Full REST/JSON API with OpenAPI spec (`/api/docs/json`); Excel (XLSX) exports for inventories, reduction projects, and plans (`docs/development/data-export.md`); standard PostgreSQL enables `pg_dump`; public transparency endpoint with PII redaction (`docs/overview/transparency.md`). Gaps: no CSV/bulk export, no per-user PII export endpoint (relevant to Indicator 7 more than 6).                                                                                                                                                                                                                                                     |
| 7   | Adherence to privacy & applicable laws  | ⚠️ Partially met      | [Verified] Strong groundwork: PII inventory and six LatAm data-protection laws mapped in `docs/security/sensitive-data.md`; terms-acceptance flow with `termsAccepted/termsAcceptedAt` on the User model and a served T&C PDF. [Verified] Missing: user-facing privacy policy, data-subject request workflow (access/erasure/portability), automated deletion/anonymization, lawful-basis documentation. The docs explicitly delegate these to deployers, but the DPG applicant must state how the project itself complies.                                                                                                                                 |
| 8   | Adherence to standards & best practices | ⚠️ Partially met      | [Verified] Met in substance: GHG Protocol scopes & IPCC factor sources (`docs/architecture/methodology-taxonomy.md`), OpenAPI 3.0, Zod-validated contracts, SemVer + Conventional Commits + PR-gated CI (lint/type-check/format/test/build, zero-warning policy), `eslint-plugin-jsx-a11y` enabled. [Verified] Gaps: `@fastify/helmet` declared but never registered (no security headers — acknowledged in `docs/security/hardening.md`); no dependency/CVE scanning or SAST in CI; no a11y runtime testing (web `test` script is a stub); no tagged releases exist (0 git tags) despite a documented release process; no MIME-type validation on uploads. |
| 9   | Do no harm by design                    | ⚠️ Partially met      | See sub-indicators below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 9a  | — Data privacy & security               | ⚠️ Partially met      | [Verified] Strong: JWKS token validation, two-dimension RBAC with audit tables (`UserRoleAudit`, `UserAccessLog`), Azure Key Vault + managed identities + OIDC-federated CI (no stored cloud secrets), TLS 1.2+ everywhere, AES-256 at rest, Pino log redaction, rate limiting, no third-party trackers/analytics in the frontend. [Verified] Gaps: no `SECURITY.md`/vulnerability disclosure channel; helmet headers absent; dev-only hardcoded `JWT_SECRET` fallback (`"super-secret-key"` in `apps/api/src/config/environment.ts`); no erasure mechanism for PII.                                                                                        |
| 9b  | — Inappropriate & illegal content       | ✅ Met (low exposure) | [Verified] No public user-generated content surface: the only public output is the transparency endpoint, which exposes a curated, admin-approved, PII-redacted organization list. Uploaded documents are private with time-limited SAS access. Platform targets organizations, not minors — child-safety provisions not applicable. No content policy exists, but the attack surface is minimal.                                                                                                                                                                                                                                                           |
| 9c  | — Protection from harassment            | ✅ Met (low exposure) | [Verified] No user-to-user messaging; notifications (planned) are system-to-user only. [Verified] Missing community-level protections: no `CODE_OF_CONDUCT.md`, no issue/PR templates, no documented reporting channel — needed once the repo is public and community-facing.                                                                                                                                                                                                                                                                                                                                                                               |

**Pre-condition (all indicators): publicly accessible source code — ❌ Not met.** [Verified] Unauthenticated access to `https://github.com/undp/carbon-footprint-program` returns HTTP 404, the GitHub response for private repositories. (Caveat: this check was performed from a proxied environment; see Unknowns.)

---

## 3. Strengths

- **DPG-native design intent.** Country-agnosticism is a stated, enforced architectural principle (seed data + system parameters, never code forks), documented in `.claude/CLAUDE.md`, `docs/governance.md`, and the onboarding guide. This is exactly the replicability story DPGA reviewers look for.
- **Documentation depth.** Few projects at this stage have a complete docs tree spanning architecture, data model with ER diagrams, nine security documents, operations runbooks, scaling playbooks, and a step-by-step country onboarding guide.
- **Open standards in substance.** GHG Protocol scope taxonomy, IPCC/IEA factor sourcing, OpenAPI 3.0 auto-generated from typed schemas, plain JSON, standard PostgreSQL.
- **Serious security architecture.** Multi-provider auth abstraction, layered RBAC with database audit trails, managed identities, federated CI credentials, secrets out of code (with one dev-only exception), TLS enforced on all channels.
- **Privacy-aware data design.** PII inventory exists, the transparency portal deliberately redacts sensitive fields, no passwords are stored (delegated to IdP), and no client-side analytics/tracking SDKs are present at all.
- **Honest self-assessment.** `docs/governance.md` and `docs/security/hardening.md` already enumerate most compliance gaps, including the missing root-level files and the unregistered helmet plugin. This transparency materially raises confidence in the rest of the documentation.
- **Engineering hygiene.** PR-gated CI with zero-warning linting, Conventional Commits, integration tests against real PostgreSQL via Testcontainers, 80% coverage threshold on the API.

---

## 4. Identified Gaps and Severity

### Critical — DPG blockers (application cannot succeed)

| Gap                                            | Evidence                                               | Indicator     |
| ---------------------------------------------- | ------------------------------------------------------ | ------------- |
| Repository not publicly accessible             | HTTP 404 unauthenticated [Verified, with proxy caveat] | Pre-condition |
| No `LICENSE` file / no effective license grant | Root listing; `docs/governance.md`                     | 2             |
| No named copyright holder / legal owner        | Repo-wide search; governance doc defers the decision   | 3             |

### High — required for a credible application

| Gap                                                                                                                                    | Evidence                                                                                | Indicator      |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------- |
| No user-facing privacy policy; no data-subject request workflow (access/erasure/portability); no PII deletion/anonymization capability | `docs/security/sensitive-data.md` "what the platform does NOT provide"                  | 7, 9a          |
| No `SECURITY.md` / vulnerability disclosure process                                                                                    | Root and `.github/` listing                                                             | 9a             |
| No `CODE_OF_CONDUCT.md`, no root `CONTRIBUTING.md`, no `CODEOWNERS`, no issue/PR templates                                             | `.github/` contains only `workflows/ci.yml`                                             | 9c, governance |
| Security headers absent — `@fastify/helmet` installed but never registered                                                             | `docs/security/hardening.md`; no helmet plugin file in `apps/api/src/plugins/external/` | 9a             |
| Dependency license audit never run — possible copyleft conflicts unverified                                                            | `pnpm licenses list` suggested in governance doc but no recorded output                 | 2 [Unknown]    |
| No SDG mapping / DPG alignment documentation                                                                                           | Absent from `docs/`                                                                     | 1              |

### Medium — weakens specific indicators

| Gap                                                                                                       | Evidence                                                   | Indicator                   |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------- |
| File storage hard-coded to Azure Blob SDK; no open-source storage alternative (e.g., S3-compatible/MinIO) | `apps/api/src/plugins/app/blobStoragePlugin.ts`            | 4                           |
| IaC is Azure Bicep only; non-Azure production path undocumented beyond Docker Compose                     | `infra/`, `docs/overview/project-overview.md`              | 4                           |
| No dependency/CVE scanning or SAST in CI                                                                  | `.github/workflows/ci.yml`                                 | 9a                          |
| Spanish-only UI; i18n planned but not implemented                                                         | `docs/development/i18n-plan.md` (status: not implemented)  | Inclusivity (cross-cutting) |
| No releases exist: 0 git tags, no `CHANGELOG.md`, version is `0.0.0`                                      | `git tag` output; root `package.json`                      | 8                           |
| No MIME-type validation on file uploads                                                                   | `docs/security/hardening.md`                               | 9a                          |
| Dev-only hardcoded `JWT_SECRET` fallback in code                                                          | `apps/api/src/config/environment.ts`                       | 9a                          |
| Consent is a single non-revocable checkbox; no granular consent or lawful-basis record                    | `apps/web/src/screens/User/UserFormScreen.tsx`; User model | 7                           |

### Low — maturity improvements

| Gap                                                                                          | Evidence                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------- |
| No accessibility testing (jest-axe/axe-core) or a11y documentation; web test suite is a stub | `apps/web/package.json`                |
| No CSV/bulk/server-side export formats                                                       | `docs/development/data-export.md`      |
| Governance is informal — no steering body, no `GOVERNANCE.md` at root                        | `docs/governance.md` §Project Steering |
| In-memory rate limiting only (not multi-instance safe)                                       | `docs/security/hardening.md`           |
| No low-bandwidth/mobile performance targets documented                                       | docs absence                           |

---

## 5. Prioritized Remediation Roadmap

### Phase 0 — DPG blockers (≈1 week, mostly decisions, not code)

1. **Decide and name the legal owner** (e.g., UNDP). Add copyright line to `LICENSE` and `README.md`; confirm all contributors' work is licensable under it.
2. **Add `LICENSE`** (MIT, per existing declarations) at the repository root.
3. **Make the repository public** (or publish a public mirror/release repo). Before doing so: run secret scanning over the full git history and complete Phase 1 items 4–5, since publication exposes the gaps.

### Phase 1 — application readiness (≈1–2 weeks)

4. **Add root community/security files:** `SECURITY.md` (private reporting channel, response SLA, coordinated disclosure), `CODE_OF_CONDUCT.md` (e.g., Contributor Covenant), root `CONTRIBUTING.md` (linking to `docs/development/contributing.md`), `CODEOWNERS`, issue/PR templates.
5. **Register the helmet plugin** (`apps/api/src/plugins/external/helmet.ts`) to emit CSP/HSTS/X-Frame-Options etc. — small, high-impact fix already prescribed by `docs/security/hardening.md`.
6. **Run and record a dependency license audit** (`pnpm licenses list`); commit the report or a summary to `docs/`.
7. **Publish a privacy policy** (served like the existing T&C PDF) and document the data-subject request procedure — even if initially a manual, admin-executed runbook for access/erasure requests.
8. **Write `docs/dpg-alignment.md`:** explicit SDG 13 (targets 13.2/13.3) mapping plus a self-assessment against the 9 indicators, ready to paste into the DPGA application.
9. **Cut a first tagged release** (`v0.1.0`) with a `CHANGELOG.md`, exercising the documented release process.

### Phase 2 — strengthen weak indicators (≈3–6 weeks, engineering)

10. **Storage abstraction:** introduce a storage interface with an S3-compatible (MinIO) or filesystem implementation alongside Azure Blob, and document the non-Azure deployment path end-to-end (Docker Compose / Kubernetes + any OIDC provider + any PostgreSQL).
11. **CI security gates:** add `pnpm audit` (or Dependabot/Renovate) and a SAST step (e.g., CodeQL).
12. **PII lifecycle:** implement user data export and deletion/anonymization endpoints; add MIME-type validation on uploads; remove the hardcoded `JWT_SECRET` fallback (fail fast instead).
13. **Implement i18n Phase 1–3** per `docs/development/i18n-plan.md` (Spanish + at least one additional language) to support the regional inclusivity claim.
14. **Accessibility baseline:** add axe-based automated checks and a short `docs/accessibility.md` with WCAG 2.1 AA targets.

### Phase 3 — post-acceptance maturity

15. Formalize governance (`GOVERNANCE.md`, steering committee with country representation).
16. Bulk/CSV export, server-side reports; distributed rate limiting; optional CMK encryption and private endpoints for high-compliance deployments.

---

## 6. Final Assessment

**Current status: does not qualify as a DPG.** Indicators 2 (open license) and 3 (clear ownership) are failed outright, and the source code does not appear to be publicly accessible — any one of these alone disqualifies a DPGA application. Indicators 1, 4, 7, 8, and 9a are partially met; indicators 5, 6, 9b, and 9c are met or effectively met.

**DPG readiness: high.** The failures are concentrated in legal/administrative artifacts, not in the design of the system. The platform's substance — open standards, replicable country-agnostic architecture, strong documentation, privacy-aware data handling — is well above the bar typically seen in DPG registry applicants. Executing Phases 0–1 of the roadmap (roughly 2–4 weeks, mostly decisions and documents plus two small code changes) would make an application defensible; Phase 2 would make it strong.

**Confidence level: medium-high (≈75%).**

- **High confidence** in all repository-internal findings (file presence/absence, code behavior, documentation content) — directly verified.
- **Medium confidence** in the repository-visibility finding: the 404 was observed through this environment's network proxy; it should be re-verified from an unrestricted network. If the repo (or a public mirror) is in fact public, the pre-condition concern drops away, though Indicators 2 and 3 still fail.
- **Unknowns that could move the verdict** are listed below.

## 7. Unknowns and Limitations

| Unknown                                                                              | Why it matters                                                                           | How to resolve                                                 |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| True public visibility of the GitHub repository (404 observed via proxy)             | Pre-condition for all indicators                                                         | Check the URL from an unrestricted network; check org settings |
| Intended legal owner and any trademark on "Huella Latam"                             | Indicator 3                                                                              | Decision by UNDP/delivery organization                         |
| Transitive dependency licenses (no audit run in this assessment)                     | Indicator 2 (license compatibility)                                                      | `pnpm licenses list` after install                             |
| Production configuration (e.g., `ALLOWED_ORIGIN`, `AUTH_PROVIDER`, HTTPS-only flags) | 9a — docs prescribe values but deployments weren't inspected                             | Review live environment configs                                |
| Whether any country deployment is already operating with real user data              | Raises urgency of privacy-policy and erasure gaps from "pre-launch" to "live obligation" | Confirm with the delivery team                                 |
| DPGA application status, if any                                                      | Determines whether this is gap-closing or pre-application work                           | Confirm with project owners                                    |

---

_This assessment was generated from a point-in-time review of the repository. File paths cited are relative to the repository root and were verified to exist (or verified absent) on the assessment date._

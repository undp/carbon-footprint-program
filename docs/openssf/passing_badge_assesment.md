# OpenSSF Best Practices — Passing Level Assessment

> Self-assessment of this project against the [OpenSSF Best Practices **Passing** criteria](https://www.bestpractices.dev/en/criteria/0).
> Assessment date: **2026-07-09** (re-assessment; supersedes the 2026-07-02 review). Badges are incremental: **Passing → Silver → Gold**. See [`silver_badge_assesment.md`](./silver_badge_assesment.md) and [`gold_badge_assesment.md`](./gold_badge_assesment.md) for the higher levels.

**Legend:** ✅ Met · ⚠️ Partial / needs verification · ❌ Missing · ➖ Not applicable

**Summary:** The Passing level is now **effectively met**. Since the previous assessment the repository was **made public**, **GitHub Releases** with human-readable notes were published, **`SECURITY.md`** and **GitHub private vulnerability reporting** were added/enabled, and the whole DPG-readiness artifact set (`CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `CONTRIBUTING.md`, `SUPPORT.md`, issue/PR templates, CODEOWNERS) merged (PR #407). Branch protection, secret scanning + push protection, and a CodeQL SAST workflow are live. The former hard blockers — LICENSE, release notes, vulnerability-reporting policy, and repo-public — are all resolved. What remains are a couple of maintainer **self-assertions/verifications** and small hardening touches; then the project can **register the badge** at bestpractices.dev.

## Basics

| Criterion                   | Level     | Status | Evidence / Gap                                                                                               |
| --------------------------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `description_good`          | MUST      | ✅     | `README.md` overview describes the platform and the problem it solves.                                       |
| `interact`                  | MUST      | ✅     | README (Quick Start) + `CONTRIBUTING.md` + `.github/SUPPORT.md` cover obtaining, feedback, and contribution. |
| `contribution`              | MUST      | ✅     | `CONTRIBUTING.md` + `docs/development/contributing.md`: GitHub Flow, PRs, Conventional Commits.              |
| `contribution_requirements` | SHOULD    | ✅     | `CONTRIBUTING.md` "Contribution acceptance criteria" + branch/commit conventions and a "definition of done". |
| `floss_license`             | MUST      | ✅     | AGPL-3.0-only declared in every `package.json` and root `LICENSE` — an OSI/FLOSS license.                    |
| `floss_license_osi`         | SUGGESTED | ✅     | AGPL-3.0 is OSI-approved (and DPGA-approved).                                                                |
| `license_location`          | MUST      | ✅     | Root `LICENSE` file with full AGPL-3.0 text; GitHub detects the license as `AGPL-3.0`.                       |
| `documentation_basics`      | MUST      | ✅     | Extensive `docs/` (architecture, development, operations, security, data-model, infrastructure).             |
| `documentation_interface`   | MUST      | ✅     | API documented via `@fastify/swagger` (OpenAPI) + `docs/development/api-conventions.md`.                     |
| `sites_https`               | MUST      | ✅     | Repo/homepage on GitHub (HTTPS); deployments HTTPS (Azure, TLS 1.2+).                                        |
| `discussion`                | MUST      | ✅     | Repo is **public**; GitHub Issues are enabled and URL-addressable/searchable (31 open issues).               |
| `english`                   | SHOULD    | ✅     | Documentation is in English (product UI is Spanish by design).                                               |
| `maintained`                | MUST      | ✅     | Actively maintained (frequent recent commits, releases up to 1.5.0).                                         |

## Change Control

| Criterion             | Level     | Status | Evidence / Gap                                                                                                                                                                                        |
| --------------------- | --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo_public`         | MUST      | ✅     | `undp/carbon-footprint-program` is now **public** (`visibility: public`) — the key blocker from the prior review.                                                                                     |
| `repo_track`          | MUST      | ✅     | Git tracks author + timestamp for every change.                                                                                                                                                       |
| `repo_interim`        | MUST      | ✅     | Interim commits/PRs are public, not only releases.                                                                                                                                                    |
| `repo_distributed`    | SUGGESTED | ✅     | Git.                                                                                                                                                                                                  |
| `version_unique`      | MUST      | ✅     | Unique release identifiers via git tags + GitHub Releases (`1.1.1` … `1.5.0`).                                                                                                                        |
| `version_semver`      | SUGGESTED | ✅     | SemVer used and documented (`docs/release/versioning.md`).                                                                                                                                            |
| `version_tags`        | SUGGESTED | ✅     | Releases identified by git tags.                                                                                                                                                                      |
| `release_notes`       | MUST      | ✅     | **GitHub Releases** publish a human-readable "What's Changed" summary per version (`1.1.1`–`1.5.0`).                                                                                                  |
| `release_notes_vulns` | MUST      | ⚠️     | Release notes list merged PRs (incl. dependency upgrades) but don't call out fixed CVEs. Add a "Security fixes" line when a release patches a known vulnerability. No unfixed public vulns are known. |

## Reporting

| Criterion                       | Level  | Status | Evidence / Gap                                                                                                                                                                                                      |
| ------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report_process`                | MUST   | ✅     | `CONTRIBUTING.md` "Reporting bugs & requesting features" + `.github/SUPPORT.md` + Issues enabled.                                                                                                                   |
| `report_tracker`                | SHOULD | ✅     | GitHub Issues (with issue templates under `.github/ISSUE_TEMPLATE/`).                                                                                                                                               |
| `report_responses`              | MUST   | ⚠️     | Activity-dependent — verify a majority of recent bug reports are acknowledged (2–12 mo window).                                                                                                                     |
| `enhancement_responses`         | SHOULD | ⚠️     | Activity-dependent.                                                                                                                                                                                                 |
| `report_archive`                | MUST   | ✅     | Public Issues archive (repo is public).                                                                                                                                                                             |
| `vulnerability_report_process`  | MUST   | ✅     | `SECURITY.md` "Reporting a vulnerability" publishes the process.                                                                                                                                                    |
| `vulnerability_report_private`  | MUST   | ✅     | **GitHub Private Vulnerability Reporting is enabled** + `SECURITY.md` documents it. Caveat: the email contact in `SECURITY.md` is still a `TODO` placeholder — fill it or rely solely on GitHub private advisories. |
| `vulnerability_report_response` | MUST   | ✅     | `SECURITY.md` commits to a **3-business-day** acknowledgement (well within the ≤14-day requirement).                                                                                                                |

## Quality

| Criterion                     | Level     | Status | Evidence / Gap                                                                                                                           |
| ----------------------------- | --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                       | MUST      | ✅     | `pnpm build` via Turborepo rebuilds from source.                                                                                         |
| `build_common_tools`          | SUGGESTED | ✅     | pnpm, Turbo, tsc, Vite.                                                                                                                  |
| `build_floss_tools`           | SHOULD    | ✅     | Buildable with FLOSS tools (Node, pnpm, …).                                                                                              |
| `test`                        | MUST      | ✅     | Vitest + Testcontainers suite (**151** API test files, 145 integration), documented in `docs/development/testing.md`.                    |
| `test_invocation`             | SHOULD    | ✅     | `pnpm test` (standard).                                                                                                                  |
| `test_most`                   | SUGGESTED | ⚠️     | API has broad integration coverage, but **CI coverage thresholds are forced to 0** (`vitest.config.ts`) and **`apps/web` has no tests**. |
| `test_continuous_integration` | SUGGESTED | ✅     | CI runs the suite on every PR (`.github/workflows/ci.yml`); the `Test` jobs are **required** status checks.                              |
| `test_policy`                 | MUST      | ✅     | "Definition of done" in `CONTRIBUTING.md` requires tests for new functionality.                                                          |
| `tests_are_added`             | MUST      | ✅     | Test files accompany feature work throughout history.                                                                                    |
| `tests_documented_added`      | SUGGESTED | ✅     | Policy documented in the contributing guide.                                                                                             |
| `warnings`                    | MUST      | ✅     | ESLint + TypeScript `strict` enabled.                                                                                                    |
| `warnings_fixed`              | MUST      | ✅     | CI enforces `--max-warnings=0` (required "Lint" check).                                                                                  |
| `warnings_strict`             | SUGGESTED | ✅     | TS `strict: true`, typed-lint (`recommendedTypeChecked`).                                                                                |

## Security

| Criterion                        | Level  | Status | Evidence / Gap                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `know_secure_design`             | MUST   | ⚠️     | Strong evidence (`docs/security/*`: hardening, RBAC, auth, secrets, sensitive-data; `SECURITY.md`; `PRIVACY.md`). Remaining step is an explicit maintainer self-assertion in the badge form.                                                                                                                                                                                           |
| `know_common_errors`             | MUST   | ⚠️     | Zod input validation + RBAC + parameterized ORM (Prisma) + fail-closed auth guards indicate awareness; self-assert with this evidence.                                                                                                                                                                                                                                                 |
| `crypto_published`               | MUST   | ✅     | Standard TLS + OIDC/JWKS; no custom crypto.                                                                                                                                                                                                                                                                                                                                            |
| `crypto_call`                    | SHOULD | ✅     | `@fastify/jwt`, `jwks-rsa` (vetted libs).                                                                                                                                                                                                                                                                                                                                              |
| `crypto_floss`                   | MUST   | ✅     | Crypto stack is FLOSS.                                                                                                                                                                                                                                                                                                                                                                 |
| `crypto_keylength`               | MUST   | ⚠️     | RSA keys come from the OIDC provider (JWKS) — confirm ≥2048-bit at the IdP.                                                                                                                                                                                                                                                                                                            |
| `crypto_working`                 | MUST   | ✅     | No broken default algorithms.                                                                                                                                                                                                                                                                                                                                                          |
| `crypto_weaknesses`              | SHOULD | ✅     | No SHA-1/MD5 defaults.                                                                                                                                                                                                                                                                                                                                                                 |
| `crypto_pfs`                     | SHOULD | ⚠️     | Depends on TLS termination (Azure Front Door / edge) — typically PFS-capable; verify.                                                                                                                                                                                                                                                                                                  |
| `crypto_password_storage`        | MUST   | ➖     | No local passwords — auth is delegated to an OIDC IdP.                                                                                                                                                                                                                                                                                                                                 |
| `crypto_random`                  | MUST   | ✅     | CSPRNG via platform/libraries (`node:crypto`).                                                                                                                                                                                                                                                                                                                                         |
| `delivery_mitm`                  | MUST   | ✅     | Source over HTTPS (GitHub); images over HTTPS registry with digest pinning.                                                                                                                                                                                                                                                                                                            |
| `delivery_unsigned`              | MUST   | ✅     | No unsigned hashes fetched over HTTP.                                                                                                                                                                                                                                                                                                                                                  |
| `vulnerabilities_fixed_60_days`  | MUST   | ✅     | `pnpm audit --prod --audit-level moderate` is a **required CI gate**; Dependabot security updates enabled.                                                                                                                                                                                                                                                                             |
| `vulnerabilities_critical_fixed` | SHOULD | ✅     | Dependabot + audit gate drive rapid fixes.                                                                                                                                                                                                                                                                                                                                             |
| `no_leaked_credentials`          | MUST   | ⚠️     | Secret scanning + push protection + a betterleaks CI gate report **0 findings**; `.env*` gitignored. **Caveat:** `JWT_SECRET` still falls back to a hardcoded `"super-secret-key"` dev default in `environment.ts` — production now **fails closed** (refuses to boot without `JWKS_URI`/`JWKS_ISSUER`/`JWKS_AUDIENCE`), but the fallback line should be removed for defense-in-depth. |

## Analysis

| Criterion                                | Level     | Status | Evidence / Gap                                                                      |
| ---------------------------------------- | --------- | ------ | ----------------------------------------------------------------------------------- |
| `static_analysis`                        | MUST      | ✅     | ESLint (typed) + `tsc --strict` + **CodeQL** on every PR.                           |
| `static_analysis_common_vulnerabilities` | SUGGESTED | ✅     | **CodeQL** (`security-and-quality` queries) now runs on push/PR/weekly — was a gap. |
| `static_analysis_fixed`                  | MUST      | ✅     | CI fails on any lint warning; CodeQL uploads to code scanning.                      |
| `static_analysis_often`                  | SUGGESTED | ✅     | Runs on every PR + push to `main` + weekly schedule.                                |
| `dynamic_analysis`                       | SUGGESTED | ⚠️     | Integration tests (Testcontainers) exercise runtime, but no dedicated DAST/fuzzing. |
| `dynamic_analysis_unsafe`                | SUGGESTED | ➖     | Memory-safe language (TS/JS).                                                       |
| `dynamic_analysis_enable_assertions`     | SUGGESTED | ⚠️     | Zod runtime validation acts as assertions; not a formal analysis config.            |
| `dynamic_analysis_fixed`                 | MUST      | ➖     | No dynamic-analysis findings outstanding.                                           |

## Remaining items for the Passing badge

No MUST criterion is outright **Missing** anymore. To register a clean Passing badge, close these small items:

1. **Self-assert secure-development knowledge** for a primary developer (`know_secure_design`, `know_common_errors`) — evidence already exists in `docs/security/`, `SECURITY.md`, `PRIVACY.md`.
2. **Note security fixes in release notes** when a release patches a known vulnerability (`release_notes_vulns`).
3. **Verify report responsiveness** — confirm a majority of recent bug reports are acknowledged (`report_responses`).
4. **Confirm crypto details** — RSA keylength ≥2048 at the IdP (`crypto_keylength`) and PFS at TLS termination (`crypto_pfs`).
5. **Defense-in-depth cleanup** — remove the hardcoded `JWT_SECRET` dev fallback (`no_leaked_credentials`); fill the `SECURITY.md` email contact (`vulnerability_report_private`).

Everything else at the Passing level is satisfied. The main outstanding action is to **register the project at bestpractices.dev** and record the self-assertions there.

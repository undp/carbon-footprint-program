# OpenSSF Best Practices — Silver Level Assessment

> Self-assessment against the [OpenSSF Best Practices **Silver** criteria](https://www.bestpractices.dev/en/criteria/1).
> Assessment date: **2026-07-02**. Silver **requires the [Passing badge](./passing_badge_assesment.md) first**; this file lists only the criteria **added at the Silver level**.

**Legend:** ✅ Met · ⚠️ Partial / needs verification · ❌ Missing · ➖ Not applicable

**Summary:** A meaningful subset is already met thanks to the docs and this PR's supply-chain work (`governance`, `coding_standards*`, `dependency_monitoring`, `input_validation`). The main new work for Silver is **governance/community artifacts** (Code of Conduct, DCO, roadmap), **release signing**, an **assurance case / threat model**, a **security-focused static-analysis tool**, and **enforced ≥80% test coverage** (incl. the currently-untested `apps/web`).

## Basics

| Criterion                      | Level  | Status | Evidence / Gap                                                                        |
| ------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------- |
| `contribution_requirements`    | MUST   | ✅     | Contributing doc specifies coding/commit standards + definition of done.              |
| `dco`                          | SHOULD | ❌     | No DCO/CLA sign-off mechanism. Add `Signed-off-by` (DCO) enforcement.                 |
| `governance`                   | MUST   | ✅     | `docs/governance.md` documents the governance model.                                  |
| `code_of_conduct`              | MUST   | ❌     | No `CODE_OF_CONDUCT.md` (e.g. Contributor Covenant). Add one.                         |
| `roles_responsibilities`       | MUST   | ⚠️     | Verify `docs/governance.md` names key roles + responsibilities; expand if not.        |
| `access_continuity`            | MUST   | ⚠️     | Org-level (UNDP) — confirm no single-person lock-in (repo/deploy access shared).      |
| `bus_factor`                   | SHOULD | ⚠️     | Confirm ≥2 people can maintain/release.                                               |
| `documentation_roadmap`        | MUST   | ❌     | No forward roadmap (≥1 year). An i18n plan exists but not a full roadmap.             |
| `documentation_architecture`   | MUST   | ✅     | `docs/architecture/` high-level design.                                               |
| `documentation_security`       | MUST   | ✅     | `docs/security/` documents expectations/limitations.                                  |
| `documentation_quick_start`    | MUST   | ✅     | README "Getting Started" quick-start.                                                 |
| `documentation_current`        | MUST   | ⚠️     | Largely current; establish a habit of updating docs per change.                       |
| `documentation_achievements`   | MUST   | ⚠️     | Link the OpenSSF badge (once earned) within 48h of achieving it.                      |
| `accessibility_best_practices` | SHOULD | ⚠️     | Web app — verify a11y practices (MUI helps; not audited).                             |
| `internationalization`         | SHOULD | ⚠️     | UI is Spanish-only today; i18n is planned (`docs/.../i18n plan`) but not implemented. |
| `sites_password_security`      | MUST   | ➖     | No local passwords — auth delegated to OIDC IdP.                                      |

## Change Control

| Criterion               | Level | Status | Evidence / Gap                                                       |
| ----------------------- | ----- | ------ | -------------------------------------------------------------------- |
| `maintenance_or_update` | MUST  | ⚠️     | Document an upgrade path / supported-version policy for deployments. |

## Reporting

| Criterion                        | Level | Status | Evidence / Gap                                                                   |
| -------------------------------- | ----- | ------ | -------------------------------------------------------------------------------- |
| `report_tracker`                 | MUST  | ✅     | GitHub Issues.                                                                   |
| `vulnerability_report_credit`    | MUST  | ❌     | Add a reporter-credit practice to `SECURITY.md`.                                 |
| `vulnerability_response_process` | MUST  | ❌     | Document the internal vulnerability-response workflow (triage → fix → disclose). |

## Quality

| Criterion                         | Level  | Status | Evidence / Gap                                                                                            |
| --------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------- |
| `coding_standards`                | MUST   | ✅     | ESLint config + Prettier + `docs/development` conventions.                                                |
| `coding_standards_enforced`       | MUST   | ✅     | ESLint (`--max-warnings=0`) + `format:check` in CI.                                                       |
| `build_standard_variables`        | MUST   | ➖     | No native compiler/linker (JS/TS).                                                                        |
| `build_preserve_debug`            | SHOULD | ⚠️     | Source maps available; confirm they're produced/retained where useful.                                    |
| `build_non_recursive`             | MUST   | ✅     | Turborepo orchestrates by dependency graph (not recursive make).                                          |
| `build_repeatable`                | MUST   | ⚠️     | Lockfile + pinned Docker digests aid repeatability; bit-for-bit not verified.                             |
| `installation_common`             | MUST   | ⚠️     | App (not a package): `pnpm install` + Docker/compose — document uninstall/teardown.                       |
| `installation_standard_variables` | MUST   | ➖     | Not an OS-installed artifact (no `DESTDIR`).                                                              |
| `installation_development_quick`  | MUST   | ✅     | README + docker-compose spin up dev env + tests quickly.                                                  |
| `external_dependencies`           | MUST   | ✅     | `package.json` + `pnpm-lock.yaml` (machine-processable).                                                  |
| `dependency_monitoring`           | MUST   | ✅     | Dependabot (npm/docker/actions) + `pnpm audit` CI gate + `minimumReleaseAge`.                             |
| `updateable_reused_components`    | MUST   | ✅     | pnpm workspace + Dependabot make updates straightforward.                                                 |
| `interfaces_current`              | SHOULD | ⚠️     | Deps kept current (this PR); no systematic deprecation scan.                                              |
| `automated_integration_testing`   | MUST   | ✅     | CI runs the suite on each PR and reports results.                                                         |
| `regression_tests_added50`        | MUST   | ⚠️     | Likely in practice but not measured; track "test-per-bug" going forward.                                  |
| `test_statement_coverage80`       | MUST   | ❌     | API can hit 80% locally, but **CI thresholds are 0** and **`apps/web` has no tests**. Enforce ≥80% in CI. |
| `test_policy_mandated`            | MUST   | ⚠️     | Contributing doc requires tests; make it a formal, mandated policy.                                       |
| `tests_documented_added`          | MUST   | ✅     | Documented in contributing guide.                                                                         |
| `warnings_strict`                 | MUST   | ✅     | TS `strict` + typed ESLint, zero-warnings CI.                                                             |

## Security

| Criterion                         | Level     | Status | Evidence / Gap                                                                                                                 |
| --------------------------------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `implement_secure_design`         | MUST      | ⚠️     | RBAC, OIDC, Zod validation present — but `@fastify/helmet` is **declared, not registered** (no security headers). Register it. |
| `crypto_weaknesses`               | MUST      | ✅     | No weak default algorithms.                                                                                                    |
| `crypto_algorithm_agility`        | SHOULD    | ⚠️     | JWKS supports key rotation; document algorithm flexibility.                                                                    |
| `crypto_credential_agility`       | MUST      | ⚠️     | Secrets via env/JWKS (replaceable) — but remove the hardcoded `JWT_SECRET` fallback.                                           |
| `crypto_used_network`             | SHOULD    | ✅     | HTTPS/TLS; DB `sslmode=require`.                                                                                               |
| `crypto_tls12`                    | SHOULD    | ✅     | TLS 1.2+ (Azure).                                                                                                              |
| `crypto_certificate_verification` | MUST      | ✅     | Standard TLS clients verify certs by default.                                                                                  |
| `crypto_verification_private`     | MUST      | ✅     | Private data only over verified HTTPS.                                                                                         |
| `signed_releases`                 | MUST      | ❌     | Releases/images are not cryptographically signed. Add signing (e.g. cosign for images, signed tags) + document verification.   |
| `version_tags_signed`             | SUGGESTED | ❌     | Tags are unsigned.                                                                                                             |
| `input_validation`                | MUST      | ✅     | Zod schemas validate untrusted input (allowlist style).                                                                        |
| `hardening`                       | SHOULD    | ⚠️     | Web nginx sets some CSP/security headers; API helmet not registered — close the gap.                                           |
| `assurance_case`                  | MUST      | ❌     | No documented assurance case / threat model. Author one (e.g. in `docs/security/`).                                            |

## Analysis

| Criterion                                | Level | Status | Evidence / Gap                                                                        |
| ---------------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------- |
| `static_analysis_common_vulnerabilities` | MUST  | ❌     | ESLint/tsc aren't vulnerability scanners. Add a FLOSS SAST (CodeQL or Semgrep) in CI. |
| `dynamic_analysis_unsafe`                | MUST  | ➖     | Memory-safe language (TS/JS).                                                         |

## Gaps to close for the Silver badge (MUST items)

1. **Community/governance artifacts:** `CODE_OF_CONDUCT.md` (`code_of_conduct`), a forward **roadmap** (`documentation_roadmap`), and explicit **roles/responsibilities** (`roles_responsibilities`).
2. **Vulnerability handling:** document the **response process** and **reporter credit** in `SECURITY.md` (`vulnerability_response_process`, `vulnerability_report_credit`).
3. **Test coverage:** enforce **≥80% statement coverage** in CI and add **`apps/web` tests** (`test_statement_coverage80`); formalize the test-mandate policy.
4. **Security engineering:** register **`@fastify/helmet`** (`implement_secure_design`, `hardening`) and author an **assurance case / threat model** (`assurance_case`).
5. **Release integrity:** **sign release artifacts** and document verification (`signed_releases`).
6. **SAST:** add a **CodeQL/Semgrep** workflow (`static_analysis_common_vulnerabilities`).
7. Confirm continuity/access items (`access_continuity`) and document a supported-version/upgrade policy (`maintenance_or_update`).

`SHOULD`-level extras worth doing: DCO sign-off, i18n, accessibility audit, algorithm agility.

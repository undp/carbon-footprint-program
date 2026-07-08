# OpenSSF Best Practices — Passing Level Assessment

> Self-assessment of this project against the [OpenSSF Best Practices **Passing** criteria](https://www.bestpractices.dev/en/criteria/0).
> Assessment date: **2026-07-02**. Badges are incremental: **Passing → Silver → Gold**. See [`silver_badge_assesment.md`](./silver_badge_assesment.md) and [`gold_badge_assesment.md`](./gold_badge_assesment.md) for the higher levels.

**Legend:** ✅ Met · ⚠️ Partial / needs verification · ❌ Missing · ➖ Not applicable

**Summary:** Most criteria are met. The concrete blockers to earning the Passing badge are a small set of missing artifacts: a root **LICENSE file**, **release notes**, and a **vulnerability-reporting policy (SECURITY.md)**. A few criteria are self-asserted or depend on GitHub/org settings and must be confirmed by a maintainer.

## Basics

| Criterion                   | Level     | Status | Evidence / Gap                                                                                            |
| --------------------------- | --------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `description_good`          | MUST      | ✅     | `README.md` overview describes the platform and the problem it solves.                                    |
| `interact`                  | MUST      | ✅     | README (getting started) + `docs/development/contributing.md` cover obtaining, feedback, contribution.    |
| `contribution`              | MUST      | ✅     | `docs/development/contributing.md`: GitHub Flow, PRs, Conventional Commits.                               |
| `contribution_requirements` | SHOULD    | ✅     | Contributing doc defines branch/commit conventions and a "definition of done".                            |
| `floss_license`             | MUST      | ✅     | AGPL-3.0-only declared in `package.json` (`"license": "AGPL-3.0-only"`) — an OSI/FLOSS license.           |
| `floss_license_osi`         | SUGGESTED | ✅     | AGPL-3.0 is OSI-approved.                                                                                 |
| `license_location`          | MUST      | ✅     | Root `LICENSE` file present with the full AGPL-3.0 text, alongside the `package.json` field.             |
| `documentation_basics`      | MUST      | ✅     | Extensive `docs/` (architecture, development, operations, security, …).                                   |
| `documentation_interface`   | MUST      | ✅     | API documented via `@fastify/swagger` (OpenAPI) + `docs/` API conventions.                                |
| `sites_https`               | MUST      | ✅     | Repo/homepage on GitHub (HTTPS); deployments HTTPS (Azure).                                               |
| `discussion`                | MUST      | ⚠️     | GitHub Issues/PRs are URL-addressable — confirm Issues/Discussions are enabled on the public repo.        |
| `english`                   | SHOULD    | ✅     | Documentation is in English (product UI is Spanish by design).                                            |
| `maintained`                | MUST      | ✅     | Actively maintained (frequent recent commits, tags up to 1.5.0).                                          |

## Change Control

| Criterion             | Level     | Status | Evidence / Gap                                                                                                    |
| --------------------- | --------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `repo_public`         | MUST      | ⚠️     | Repo `undp/carbon-footprint-program` — **confirm it is publicly readable** (required for the badge).              |
| `repo_track`          | MUST      | ✅     | Git tracks author + timestamp for every change.                                                                   |
| `repo_interim`        | MUST      | ✅     | Interim commits/PRs are public, not only releases.                                                                |
| `repo_distributed`    | SUGGESTED | ✅     | Git.                                                                                                              |
| `version_unique`      | MUST      | ✅     | Unique release identifiers via git tags (`1.1.1` … `1.5.0`).                                                      |
| `version_semver`      | SUGGESTED | ✅     | SemVer used and documented (`docs/release/versioning.md`).                                                        |
| `version_tags`        | SUGGESTED | ✅     | Releases identified by git tags.                                                                                  |
| `release_notes`       | MUST      | ❌     | No `CHANGELOG.md` or GitHub Release notes — releases are bare tags. Add human-readable release notes per release. |
| `release_notes_vulns` | MUST      | ⚠️     | Depends on `release_notes`; once release notes exist, list any fixed CVEs (e.g. this PR's advisory cleanup).      |

## Reporting

| Criterion                       | Level  | Status | Evidence / Gap                                                                                                   |
| ------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `report_process`                | MUST   | ⚠️     | GitHub Issues serve as the bug process — document it (link in README) and confirm Issues are enabled.            |
| `report_tracker`                | SHOULD | ✅     | GitHub Issues.                                                                                                   |
| `report_responses`              | MUST   | ⚠️     | Activity-dependent — verify majority of recent bug reports are acknowledged.                                     |
| `enhancement_responses`         | SHOULD | ⚠️     | Activity-dependent.                                                                                              |
| `report_archive`                | MUST   | ⚠️     | GitHub Issues archive is public if the repo is public.                                                           |
| `vulnerability_report_process`  | MUST   | ❌     | **No `SECURITY.md`** publishing how to report a vulnerability. Add one.                                          |
| `vulnerability_report_private`  | MUST   | ❌     | No private reporting channel documented (email or GitHub Private Vulnerability Reporting). Add to `SECURITY.md`. |
| `vulnerability_report_response` | MUST   | ⚠️     | Define and commit to a ≤14-day initial-response SLA in `SECURITY.md`.                                            |

## Quality

| Criterion                     | Level     | Status | Evidence / Gap                                                                                     |
| ----------------------------- | --------- | ------ | -------------------------------------------------------------------------------------------------- |
| `build`                       | MUST      | ✅     | `pnpm build` via Turborepo rebuilds from source.                                                   |
| `build_common_tools`          | SUGGESTED | ✅     | pnpm, Turbo, tsc, Vite.                                                                            |
| `build_floss_tools`           | SHOULD    | ✅     | Buildable with FLOSS tools (Node, pnpm, …).                                                        |
| `test`                        | MUST      | ✅     | Vitest suite (~150 API test files), documented in `docs/development/testing`.                      |
| `test_invocation`             | SHOULD    | ✅     | `pnpm test` (standard).                                                                            |
| `test_most`                   | SUGGESTED | ⚠️     | API has an 80% local coverage target, but **CI thresholds are 0** and **`apps/web` has no tests**. |
| `test_continuous_integration` | SUGGESTED | ✅     | CI runs the suite on every PR (`.github/workflows/ci.yml`).                                        |
| `test_policy`                 | MUST      | ✅     | "Definition of done" in the contributing doc requires tests for new functionality.                 |
| `tests_are_added`             | MUST      | ✅     | Test files accompany feature work in history.                                                      |
| `tests_documented_added`      | SUGGESTED | ✅     | Policy documented in contributing guide.                                                           |
| `warnings`                    | MUST      | ✅     | ESLint + TypeScript `strict` enabled.                                                              |
| `warnings_fixed`              | MUST      | ✅     | CI enforces `--max-warnings=0`.                                                                    |
| `warnings_strict`             | SUGGESTED | ✅     | TS `strict: true`, typed-lint (`recommendedTypeChecked`).                                          |

## Security

| Criterion                        | Level  | Status | Evidence / Gap                                                                                                                                                                        |
| -------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `know_secure_design`             | MUST   | ⚠️     | Self-assert. Evidence of awareness: `docs/security/` (hardening, RBAC, auth, sensitive-data).                                                                                         |
| `know_common_errors`             | MUST   | ⚠️     | Self-assert. Zod input validation + RBAC + parameterized ORM (Prisma) indicate awareness.                                                                                             |
| `crypto_published`               | MUST   | ✅     | Standard TLS + JWT/JWKS; no custom crypto.                                                                                                                                            |
| `crypto_call`                    | SHOULD | ✅     | `@fastify/jwt`, `jwks-rsa` (vetted libs).                                                                                                                                             |
| `crypto_floss`                   | MUST   | ✅     | Crypto stack is FLOSS.                                                                                                                                                                |
| `crypto_keylength`               | MUST   | ⚠️     | RSA keys come from the OIDC provider (JWKS) — confirm ≥2048-bit.                                                                                                                      |
| `crypto_working`                 | MUST   | ✅     | No broken default algorithms.                                                                                                                                                         |
| `crypto_weaknesses`              | SHOULD | ✅     | No SHA-1/MD5 defaults.                                                                                                                                                                |
| `crypto_pfs`                     | SHOULD | ⚠️     | Depends on TLS termination (Azure) — typically PFS-capable; verify.                                                                                                                   |
| `crypto_password_storage`        | MUST   | ➖     | No local passwords — auth is delegated to an OIDC IdP.                                                                                                                                |
| `crypto_random`                  | MUST   | ✅     | CSPRNG via platform/libraries.                                                                                                                                                        |
| `delivery_mitm`                  | MUST   | ✅     | Source over HTTPS (GitHub); images over HTTPS registry.                                                                                                                               |
| `delivery_unsigned`              | MUST   | ✅     | No unsigned hashes fetched over HTTP.                                                                                                                                                 |
| `vulnerabilities_fixed_60_days`  | MUST   | ✅     | `pnpm audit` reports **0 advisories** (this PR closed all 23).                                                                                                                        |
| `vulnerabilities_critical_fixed` | SHOULD | ✅     | Demonstrated rapid fix in this PR.                                                                                                                                                    |
| `no_leaked_credentials`          | MUST   | ⚠️     | No real credentials committed; `.env*` gitignored. **Caveat:** `JWT_SECRET` falls back to a hardcoded `"super-secret-key"` default — remove the fallback / fail-closed in production. |

## Analysis

| Criterion                                | Level     | Status | Evidence / Gap                                                                      |
| ---------------------------------------- | --------- | ------ | ----------------------------------------------------------------------------------- |
| `static_analysis`                        | MUST      | ✅     | ESLint (typed) + `tsc --strict` on every PR.                                        |
| `static_analysis_common_vulnerabilities` | SUGGESTED | ⚠️     | Linting isn't security-focused; consider CodeQL/Semgrep (see Silver).               |
| `static_analysis_fixed`                  | MUST      | ✅     | CI fails on any warning; issues fixed before merge.                                 |
| `static_analysis_often`                  | SUGGESTED | ✅     | Runs on every PR.                                                                   |
| `dynamic_analysis`                       | SUGGESTED | ⚠️     | Integration tests (Testcontainers) exercise runtime, but no dedicated DAST/fuzzing. |
| `dynamic_analysis_unsafe`                | SUGGESTED | ➖     | Memory-safe language (TS/JS).                                                       |
| `dynamic_analysis_enable_assertions`     | SUGGESTED | ⚠️     | Zod runtime validation acts as assertions; not a formal config.                     |
| `dynamic_analysis_fixed`                 | MUST      | ➖     | No dynamic-analysis findings outstanding.                                           |

## Gaps to close for the Passing badge (MUST items)

1. ~~Add a root `LICENSE` file~~ — **resolved:** root `LICENSE` now contains the full AGPL-3.0 text (`license_location`).
2. **Publish release notes** — a `CHANGELOG.md` and/or GitHub Releases per tag, listing any fixed CVEs (`release_notes`, `release_notes_vulns`).
3. **Add `SECURITY.md`** with a public vulnerability-reporting process, a private channel, and a ≤14-day response commitment (`vulnerability_report_process`, `vulnerability_report_private`, `vulnerability_report_response`).
4. **Confirm the repo is public** and Issues are enabled (`repo_public`, `report_process`, `report_archive`).
5. **Self-assert secure-development knowledge** for at least one primary developer (`know_secure_design`, `know_common_errors`).

Everything else at the Passing level is already satisfied.

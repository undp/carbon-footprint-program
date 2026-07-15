# OpenSSF Best Practices — Gold Level Assessment

> Self-assessment against the [OpenSSF Best Practices **Gold** criteria](https://www.bestpractices.dev/en/criteria/2).
> Assessment date: **2026-07-09** (re-assessment; supersedes the 2026-07-02 review). Gold **requires the [Silver badge](./silver_badge_assesment.md) first** (which requires [Passing](./passing_badge_assesment.md)); this file lists only the criteria **added at the Gold level**.

**Legend:** ✅ Met · ⚠️ Partial / needs verification · ❌ Missing · ➖ Not applicable

**Summary:** Gold is the most demanding tier and remains the furthest away, but it moved closer: **branch protection now requires an approving review** on `main` (groundwork for `two_person_review`), and the **web site ships a strong hardening-header set**. The hard requirements still open are largely **process/community maturity** (two unaffiliated contributors, unconditional two-person review, org-wide 2FA), **per-file copyright/license headers**, **very high test coverage (90% statement / 80% branch)**, **reproducible builds**, a **dated security review**, a **dynamic-analysis step**, and **hardened headers on the API** (helmet). Several depend on organizational reality (contributor diversity, GitHub org settings) that a maintainer must confirm.

## Prerequisite

| Criterion        | Level | Status | Evidence / Gap                                                                          |
| ---------------- | ----- | ------ | --------------------------------------------------------------------------------------- |
| `achieve_silver` | MUST  | ❌     | Silver not yet earned — see [`silver_badge_assesment.md`](./silver_badge_assesment.md). |

## Basics — Project Oversight

| Criterion                   | Level | Status | Evidence / Gap                                                                                                                                    |
| --------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bus_factor`                | MUST  | ⚠️     | Multiple committers appear in the release history; must **demonstrate** a bus factor ≥2 (Gold requires it; Silver only suggests it).              |
| `contributors_unassociated` | MUST  | ⚠️     | Requires ≥2 significant contributors from **different** organizations — current contributors appear to be a single delivery team; confirm/expand. |

## Basics — Other

| Criterion            | Level | Status | Evidence / Gap                                                                           |
| -------------------- | ----- | ------ | ---------------------------------------------------------------------------------------- |
| `copyright_per_file` | MUST  | ❌     | Source files lack per-file copyright statements (e.g. `apps/api/src/app.ts` has none).   |
| `license_per_file`   | MUST  | ❌     | Source files lack `SPDX-License-Identifier` headers. (Consider a codemod + a lint rule.) |

## Change Control

| Criterion          | Level  | Status | Evidence / Gap                                                                                           |
| ------------------ | ------ | ------ | -------------------------------------------------------------------------------------------------------- |
| `repo_distributed` | MUST   | ✅     | Git.                                                                                                     |
| `small_tasks`      | MUST   | ❌     | No `good first issue` / beginner-friendly labels on the issue tracker.                                   |
| `require_2FA`      | MUST   | ⚠️     | Confirm the UNDP GitHub org **enforces 2FA** for repo contributors (org setting not readable from here). |
| `secure_2FA`       | SHOULD | ⚠️     | Prefer cryptographic 2FA (WebAuthn/TOTP) over SMS; confirm at the org.                                   |

## Quality — Coding Standards & Review

| Criterion               | Level | Status | Evidence / Gap                                                                                                                                                                                                                                                                                            |
| ----------------------- | ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code_review_standards` | MUST  | ⚠️     | Strong groundwork — `CONTRIBUTING.md` PR process + acceptance criteria, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`. Formalize an explicit, dedicated review procedure + acceptance checklist.                                                                                               |
| `two_person_review`     | MUST  | ⚠️     | Branch protection on `main` now **requires 1 approving review** (non-author) with `dismiss_stale_reviews`. Caveat: `enforce_admins` is **off** (admins can bypass) and `require_code_owner_reviews` is off — enable "Include administrators" to make it unconditional. Big step up from the prior review. |

## Quality — Build & Tests

| Criterion                     | Level | Status | Evidence / Gap                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build_reproducible`          | MUST  | ⚠️     | Lockfile + pinned Docker digests help; demonstrate/verify reproducible build output (the web bundle _is_ built).                                                                                                                                                                                                                                                    |
| `test_invocation`             | MUST  | ✅     | `pnpm test` (standard).                                                                                                                                                                                                                                                                                                                                             |
| `test_continuous_integration` | MUST  | ✅     | CI runs tests on every PR (required checks).                                                                                                                                                                                                                                                                                                                        |
| `test_statement_coverage90`   | MUST  | ❌     | `apps/api` now enforces **90%** statement coverage in CI (the `coverage` job merges the test legs via `scripts/check-coverage.mjs`); `apps/web` is now unit-tested across its logic layers behind an enforced floor but sits at only ~8% overall statement coverage (its render-heavy `screens/`/`components/` are untested), so the project-wide 90% bar is unmet. |
| `test_branch_coverage80`      | MUST  | ❌     | `apps/api` now enforces **90%** branch coverage in CI (exceeds the 80% bar); `apps/web` has tests (logic layers ~100%, ~7% branches overall), so the project-wide 80% bar is unmet until its UI is covered.                                                                                                                                                         |

## Security

| Criterion             | Level | Status | Evidence / Gap                                                                                                                                                                                                                                                                                                |
| --------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crypto_used_network` | MUST  | ✅     | HTTPS/TLS; DB TLS required.                                                                                                                                                                                                                                                                                   |
| `crypto_tls12`        | MUST  | ✅     | TLS 1.2+ (Azure).                                                                                                                                                                                                                                                                                             |
| `hardened_site`       | MUST  | ⚠️     | The **web** SPA sends a full hardening-header set (`apps/web/security-headers.conf`: CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP; HSTS at the edge), and the repo/download site is GitHub. The **API** still needs `@fastify/helmet` registered to fully qualify. |
| `security_review`     | MUST  | ⚠️     | `docs/security/` documents the model, controls, and CI hardening (incl. `github-actions-security.md`), but there is no **dated, explicit security review / threat model** within the last 5 years. Formalize one.                                                                                             |
| `hardening`           | MUST  | ⚠️     | Gold _requires_ hardening (Silver only _suggests_) — same helmet/API-headers work as above.                                                                                                                                                                                                                   |

## Analysis

| Criterion                            | Level  | Status | Evidence / Gap                                                                                                       |
| ------------------------------------ | ------ | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `dynamic_analysis`                   | MUST   | ❌     | Apply a dynamic-analysis tool before major releases (e.g. OWASP ZAP DAST against staging, or fuzzing of API inputs). |
| `dynamic_analysis_enable_assertions` | SHOULD | ⚠️     | Zod runtime validation acts as assertions; formalize extensive run-time assertions verified during analysis.         |

## Gaps to close for the Gold badge (MUST items)

1. **Earn Silver first** (`achieve_silver`) — prerequisite.
2. **Contributor maturity:** ≥2 **unaffiliated** significant contributors (`contributors_unassociated`) and a demonstrated bus factor ≥2 (`bus_factor`).
3. **Per-file headers:** add copyright + `SPDX-License-Identifier` to every source file (`copyright_per_file`, `license_per_file`).
4. **Review & 2FA:** make two-person review **unconditional** (enable "Include administrators" in branch protection) (`two_person_review`), document explicit review standards (`code_review_standards`), and confirm **org-wide 2FA** (`require_2FA`).
5. **Coverage:** reach **90% statement / 80% branch** coverage, enforced in CI, including `apps/web`'s render-heavy UI (its logic layers are already covered) (`test_statement_coverage90`, `test_branch_coverage80`).
6. **Reproducible builds:** demonstrate/verify (`build_reproducible`).
7. **Security engineering:** ship API hardening headers (`hardened_site`, `hardening`), a documented **security review / threat model** (`security_review`), and a **dynamic-analysis** step (`dynamic_analysis`).
8. **Onboarding:** label beginner-friendly tasks (`small_tasks`).

## Suggested sequencing

Given the incremental model and the current state:

1. **Passing** — effectively met; **register the badge** at bestpractices.dev, record the secure-development self-assertions, note security fixes in release notes.
2. **Silver** — roadmap, register helmet, enforce ≥80% coverage (extend `apps/web` past its logic-layer tests to its UI), assurance case/threat model, signed releases, refresh stale README.
3. **Gold** — process maturity: unconditional two-person review + org 2FA, per-file SPDX/copyright, 90/80 coverage, reproducible builds, DAST, a dated security review, and contributor diversity.

Much of the supply-chain and CI-hardening groundwork is already in place (public repo, branch protection, Dependabot + `pnpm audit` gate, `minimumReleaseAge`, SHA-pinned Actions, least-privilege tokens, pinned Docker digests, CodeQL SAST, secret scanning + push protection, betterleaks secret-scan gate, zizmor). The Gold-specific work is concentrated in **coverage**, **per-file licensing**, **contributor/process maturity**, and **runtime security analysis**.

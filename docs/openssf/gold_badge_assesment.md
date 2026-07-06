# OpenSSF Best Practices — Gold Level Assessment

> Self-assessment against the [OpenSSF Best Practices **Gold** criteria](https://www.bestpractices.dev/en/criteria/2).
> Assessment date: **2026-07-02**. Gold **requires the [Silver badge](./silver_badge_assesment.md) first** (which requires [Passing](./passing_badge_assesment.md)); this file lists only the criteria **added at the Gold level**.

**Legend:** ✅ Met · ⚠️ Partial / needs verification · ❌ Missing · ➖ Not applicable

**Summary:** Gold is the most demanding tier and is currently the furthest away. The hard requirements are largely **process/community maturity** (two unaffiliated contributors, mandatory two-person review, enforced 2FA), **per-file copyright/license headers**, **very high test coverage (90% statement / 80% branch)**, **reproducible builds**, a **recent security review**, and **hardened site headers**. Several depend on organizational reality (contributor diversity, GitHub org settings) that a maintainer must confirm.

## Prerequisite

| Criterion        | Level | Status | Evidence / Gap                                                                          |
| ---------------- | ----- | ------ | --------------------------------------------------------------------------------------- |
| `achieve_silver` | MUST  | ❌     | Silver not yet earned — see [`silver_badge_assesment.md`](./silver_badge_assesment.md). |

## Basics — Project Oversight

| Criterion                   | Level | Status | Evidence / Gap                                                                                            |
| --------------------------- | ----- | ------ | --------------------------------------------------------------------------------------------------------- |
| `bus_factor`                | MUST  | ⚠️     | Must demonstrate a bus factor ≥2 (Silver only _suggests_ this; Gold _requires_ it).                       |
| `contributors_unassociated` | MUST  | ⚠️     | Requires ≥2 significant contributors from **different** organizations — likely single-org today; confirm. |

## Basics — Other

| Criterion            | Level | Status | Evidence / Gap                                                                         |
| -------------------- | ----- | ------ | -------------------------------------------------------------------------------------- |
| `copyright_per_file` | MUST  | ❌     | Source files lack per-file copyright statements.                                       |
| `license_per_file`   | MUST  | ❌     | Source files lack `SPDX-License-Identifier` headers. (Consider a codemod + lint rule.) |

## Change Control

| Criterion          | Level  | Status | Evidence / Gap                                                          |
| ------------------ | ------ | ------ | ----------------------------------------------------------------------- |
| `repo_distributed` | MUST   | ✅     | Git.                                                                    |
| `small_tasks`      | MUST   | ❌     | No labeled beginner-friendly / "good first issue" tasks.                |
| `require_2FA`      | MUST   | ⚠️     | Enforce 2FA for repo changes at the GitHub org level — confirm it's on. |
| `secure_2FA`       | SHOULD | ⚠️     | Prefer cryptographic 2FA (WebAuthn/TOTP) over SMS.                      |

## Quality — Coding Standards & Review

| Criterion               | Level | Status | Evidence / Gap                                                                                       |
| ----------------------- | ----- | ------ | ---------------------------------------------------------------------------------------------------- |
| `code_review_standards` | MUST  | ⚠️     | Contributing doc has review expectations; formalize explicit review procedure + acceptance criteria. |
| `two_person_review`     | MUST  | ⚠️     | Require ≥50% of changes reviewed by a non-author (enforce via branch-protection required reviews).   |

## Quality — Build & Tests

| Criterion                     | Level | Status | Evidence / Gap                                                                                                                                    |
| ----------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build_reproducible`          | MUST  | ⚠️     | Lockfile + pinned Docker digests help; demonstrate/verify reproducible build output (N/A only if truly non-compiled — the web bundle _is_ built). |
| `test_invocation`             | MUST  | ✅     | `pnpm test` (standard).                                                                                                                           |
| `test_continuous_integration` | MUST  | ✅     | CI runs tests on every PR.                                                                                                                        |
| `test_statement_coverage90`   | MUST  | ❌     | Requires **90%** statement coverage; CI currently enforces 0 and `apps/web` is untested.                                                          |
| `test_branch_coverage80`      | MUST  | ❌     | Requires **80%** branch coverage; not enforced.                                                                                                   |

## Security

| Criterion             | Level | Status | Evidence / Gap                                                                                                                                               |
| --------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `crypto_used_network` | MUST  | ✅     | HTTPS/TLS; DB TLS required.                                                                                                                                  |
| `crypto_tls12`        | MUST  | ✅     | TLS 1.2+ (Azure).                                                                                                                                            |
| `hardened_site`       | MUST  | ⚠️     | Site/API must send key hardening headers — **register `@fastify/helmet`** (HSTS, CSP, X-Content-Type-Options, …); web nginx headers partially cover the SPA. |
| `security_review`     | MUST  | ⚠️     | Conduct + document a security review within the last 5 years (a threat model + review of boundaries). `docs/security/` is a start; formalize it.             |
| `hardening`           | MUST  | ⚠️     | Gold _requires_ hardening (Silver only _suggests_) — same helmet/headers work.                                                                               |

## Analysis

| Criterion                            | Level  | Status | Evidence / Gap                                                                                                                |
| ------------------------------------ | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `dynamic_analysis`                   | MUST   | ❌     | Apply a dynamic-analysis tool before major releases (e.g. OWASP ZAP DAST against a staging deploy, or fuzzing of API inputs). |
| `dynamic_analysis_enable_assertions` | SHOULD | ⚠️     | Zod runtime validation acts as assertions; formalize extensive run-time assertions verified during analysis.                  |

## Gaps to close for the Gold badge (MUST items)

1. **Earn Silver first** (`achieve_silver`) — prerequisite.
2. **Contributor maturity:** ≥2 **unaffiliated** significant contributors (`contributors_unassociated`) and a demonstrated bus factor ≥2 (`bus_factor`).
3. **Per-file headers:** add copyright + `SPDX-License-Identifier` to every source file (`copyright_per_file`, `license_per_file`).
4. **Review & 2FA:** enforce **two-person review** for ≥50% of changes (`two_person_review`) via branch protection, document review standards (`code_review_standards`), and require **2FA** org-wide (`require_2FA`).
5. **Coverage:** reach **90% statement / 80% branch** coverage, enforced in CI, including `apps/web` (`test_statement_coverage90`, `test_branch_coverage80`).
6. **Reproducible builds:** demonstrate/verify (`build_reproducible`).
7. **Security engineering:** ship hardening headers (`hardened_site`, `hardening`), a documented **security review** (`security_review`), and a **dynamic-analysis** step (`dynamic_analysis`).
8. **Onboarding:** label beginner-friendly tasks (`small_tasks`).

## Suggested sequencing

Given the incremental model, the pragmatic path is:

1. **Passing** — quick artifact wins: `LICENSE`, release notes, `SECURITY.md`.
2. **Silver** — Code of Conduct, roadmap, register helmet, SAST (CodeQL), enforce ≥80% coverage + web tests, assurance case, signed releases.
3. **Gold** — process maturity (two-person review, 2FA, per-file SPDX, 90/80 coverage, DAST, security review, contributor diversity).

Much of the Silver/Gold **dependency, supply-chain, and CI hardening** groundwork is already in place from the dependency-vulnerability PR (Dependabot, `pnpm audit` gate, `minimumReleaseAge`, `allowBuilds`, pinned Docker digests, `engineStrict`).

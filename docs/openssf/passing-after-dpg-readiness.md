# OpenSSF Passing Gaps — Closure by `chore/dpg-readiness`

> Maps the changes on branch **`chore/dpg-readiness`** (diffed against `main`) onto the **Passing-level gaps** identified in [`passing_badge_assesment.md`](./passing_badge_assesment.md).
> Generated: **2026-07-02**. Diff base: `main...origin/chore/dpg-readiness` (19 files, +1604/−32).

**Legend:** ✅ Closed by this PR · 🟡 Partially closed (TODO remains) · ❌ Still open after merge · ⚠️ Not fixable by files (settings/process)

## TL;DR

Merging `chore/dpg-readiness` closes **3 of the 5 Passing gap groups** — the LICENSE, the vulnerability-reporting policy, and the documented bug-reporting process. **Two blockers remain**:

1. **`repo_public` (MUST)** — the PR's own `dpg-assessment.json` describes "this **private** repo". If the repository is private, the Passing badge is unattainable regardless of these files. _This is now the single most important item to confirm/resolve._
2. **`release_notes` / `release_notes_vulns` (MUST)** — no `CHANGELOG.md` or GitHub Releases content is added by this PR.

## Passing gap → closure mapping

| Passing gap (criterion)                | Was | This PR | Evidence on branch                                                                    | Remaining action                                                                                                  |
| -------------------------------------- | --- | ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `license_location` (MUST)              | ❌  | ✅      | `LICENSE` added (**AGPL-3.0-only**, 661 lines) at root                                | — see relicensing note below                                                                                      |
| `floss_license` (MUST)                 | ✅  | ✅      | AGPL-3.0 is FLOSS                                                                     | —                                                                                                                 |
| `floss_license_osi` (SUGGESTED)        | ✅  | ✅      | AGPL-3.0 is OSI-approved (and DPGA-approved)                                          | —                                                                                                                 |
| `vulnerability_report_process` (MUST)  | ❌  | ✅      | `SECURITY.md` "Reporting a vulnerability"                                             | —                                                                                                                 |
| `vulnerability_report_private` (MUST)  | ❌  | 🟡      | `SECURITY.md` lists GitHub private reporting + email                                  | Fill the **`TODO: security contact email`**; **enable** GitHub "Private vulnerability reporting" in repo settings |
| `vulnerability_report_response` (MUST) | ⚠️  | ✅      | `SECURITY.md` commits to **3-business-day** acknowledgement (≤14 d)                   | Confirm the SLA with UNDP (a `TODO` note flags this)                                                              |
| `report_process` (MUST)                | ⚠️  | ✅      | `CONTRIBUTING.md` "Reporting bugs & requesting features"                              | — (also enable Issues on the repo)                                                                                |
| `release_notes` (MUST)                 | ❌  | ❌      | _No `CHANGELOG.md` / Releases added_                                                  | Add release notes per tag                                                                                         |
| `release_notes_vulns` (MUST)           | ❌  | ❌      | depends on `release_notes`                                                            | List fixed CVEs in release notes                                                                                  |
| `repo_public` (MUST)                   | ⚠️  | ⚠️      | `dpg-assessment.json` refers to "this **private** repo"                               | **Make the repo public** (a hard prerequisite for any badge)                                                      |
| `report_archive` (MUST)                | ⚠️  | ⚠️      | —                                                                                     | Follows once the repo is public + Issues enabled                                                                  |
| `discussion` (MUST)                    | ⚠️  | ⚠️      | —                                                                                     | Follows once the repo is public (Issues/Discussions)                                                              |
| `know_secure_design` (MUST)            | ⚠️  | 🟡      | `SECURITY.md` + `docs/security/*` + `dpg-assessment.json` now provide strong evidence | Still a maintainer self-assertion — now well-supported                                                            |
| `know_common_errors` (MUST)            | ⚠️  | 🟡      | same as above (RBAC, OIDC, Zod validation, secrets in vault)                          | Self-assert with the above as evidence                                                                            |

### Net effect on the Passing badge

- **Newly closed:** `license_location`, `vulnerability_report_process`, `vulnerability_report_response`, `report_process`.
- **Newly closable (TODO to finish):** `vulnerability_report_private` (email + enable GH private reporting), `know_secure_design` / `know_common_errors` (self-assert, now evidenced).
- **Still blocking after merge:** `repo_public` (make repo public) and `release_notes` / `release_notes_vulns` (add a CHANGELOG/Releases).

So after merging this PR, the Passing badge is blocked by **two things**: making the repository **public**, and adding **release notes**.

## Caveats introduced by this PR (worth a reviewer's attention)

- **Relicensing MIT → AGPL-3.0-only.** `LICENSE`, all `package.json` `license` fields, README, and `CONTRIBUTING.md` are now AGPL-3.0 (strong _network_ copyleft). This is a deliberate, substantive licensing change — fine for the badge (FLOSS + OSI-approved), but it changes obligations for anyone running a modified network service. Ensure this is an intentional decision by UNDP.
- **`SECURITY.md` placeholders.** Contains `TODO` for the security contact email and a note that GitHub "Private vulnerability reporting" must be enabled in settings. Until filled, `vulnerability_report_private` is documented but not operational.

## Beyond Passing (bonus advances, not Passing criteria)

This PR also advances **Silver/Gold** and the **DPG Standard**, though these are not Passing requirements:

- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) → Silver `code_of_conduct`
- `GOVERNANCE.md` + updated `docs/governance.md` → Silver `governance`, `roles_responsibilities`
- `.github/workflows/codeql.yml` → Silver `static_analysis_common_vulnerabilities` (SAST)
- `.gitleaksignore` (+ gitleaks in CI) → secret scanning
- `.github/CODEOWNERS` → Gold `code_review_standards` / `two_person_review` groundwork
- SHA-pinned GitHub Actions + least-privilege workflow tokens → supply-chain hardening
- `PRIVACY.md`, `CONTENT_MODERATION.md`, `dpg-assessment.json` → DPG Standard indicators (7, 9B, 8)

> Note: `dpg-assessment.json` states OpenSSF Scorecard rose 2.8 → 6.6 and that Indicator 8 (security) is the sole remaining DPG blocker, gated on GitHub Advanced Security (CodeQL/secret-scanning), Docker digest pinning, clearing `pnpm audit`, and branch protection — several of which overlap with the Silver/Gold work in [`silver_badge_assesment.md`](./silver_badge_assesment.md) / [`gold_badge_assesment.md`](./gold_badge_assesment.md) and the dependency PR already on `fix/dependency-vulnerabilities`.

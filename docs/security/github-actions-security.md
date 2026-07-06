# GitHub Actions Security (zizmor)

The GitHub Actions configuration (everything under `.github/workflows/` **and**
`.github/dependabot.yml`) is statically analysed on every pull request by
[`zizmor`](https://docs.zizmor.sh) — a security linter for GitHub Actions. This
document records why the check exists, the baseline findings it surfaced on
introduction, and how each was remediated.

---

## How it runs in CI

A `zizmor` job runs alongside the other CI gates (lint, type-check, format,
test, build, audit) and is gated by the same `check-draft` job. It uses the
official [`zizmorcore/zizmor-action`](https://github.com/zizmorcore/zizmor-action),
pinned by commit SHA:

```yaml
zizmor:
  needs: check-draft
  name: Zizmor (GitHub Actions security)
  runs-on: ubuntu-latest
  permissions:
    contents: read # required to check out the (private) repository
    actions: read # required by zizmor's online audits on a private repository
  steps:
    - uses: actions/checkout@... # v4.3.1
      with:
        persist-credentials: false
    - name: Run zizmor 🌈
      uses: zizmorcore/zizmor-action@... # v0.5.7
      with:
        advanced-security: false
```

| Setting             | Value            | Rationale                                                                                                                                                                                         |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `advanced-security` | `false`          | The repository is private and does not depend on GitHub Advanced Security. Findings print to the log and **fail the job**, matching the other CI gates.                                           |
| Persona             | `regular`        | Action default — minimises false positives. The workflow is also clean under the stricter `auditor` persona.                                                                                      |
| Audits              | online + offline | The action enables online audits by default (a token is always available in CI), catching audits such as `known-vulnerable-actions`.                                                              |
| Inputs              | `.` (default)    | The action audits the **entire checkout** — every file under `.github/workflows/` _and_ `.github/dependabot.yml` — not just `ci.yml`. Local runs must use the same scope (see below) to match CI. |

Because the job fails on any finding, new workflow changes that reintroduce an
insecure pattern (an unpinned action, a missing `permissions:` block, etc.) will
block the pull request.

---

## Baseline findings (at introduction)

`zizmor` audits the whole `.github/` configuration. On introduction it produced
**34 findings** on `ci.yml` (33 reported + 1 informational suppressed under the
default persona), plus **3 more** on `.github/dependabot.yml`:

| Audit                                                                           | Count | Severity      | Confidence | What it means                                                                                     |
| ------------------------------------------------------------------------------- | ----- | ------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| [`unpinned-uses`](https://docs.zizmor.sh/audits/#unpinned-uses)                 | 19    | High          | High       | `uses:` references pinned to a mutable tag (`@v4`) instead of an immutable commit SHA.            |
| [`excessive-permissions`](https://docs.zizmor.sh/audits/#excessive-permissions) | 8     | Medium        | Medium     | No `permissions:` block, so jobs ran with the default (overly broad) `GITHUB_TOKEN` scope.        |
| [`artipacked`](https://docs.zizmor.sh/audits/#artipacked)                       | 6     | Medium        | Low        | `actions/checkout` persisted credentials into the workspace (`persist-credentials` not disabled). |
| [`anonymous-definition`](https://docs.zizmor.sh/audits/#anonymous-definition)   | 1     | Informational | High       | The `check-draft` job had no `name:` (suppressed under the `regular` persona).                    |

### `unpinned-uses` (19 × High)

Every action was pinned to a moving major tag (`actions/checkout@v4`,
`pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`).
A moving tag can be repointed by the action owner (or an attacker who
compromises the repo) to malicious code without any change on our side — a
supply-chain risk.

### `excessive-permissions` (8 × Medium)

The workflow declared no `permissions:` block. Without one, jobs receive the
repository's default `GITHUB_TOKEN` permissions, which are broader than any of
these read-only CI jobs need.

### `artipacked` (6 × Medium)

`actions/checkout` writes the `GITHUB_TOKEN` into the local git config by
default (`persist-credentials: true`). If a later step uploads the workspace as
an artifact, that token can leak. None of these jobs need the persisted
credential after checkout.

### `dependabot-cooldown` (3, on `.github/dependabot.yml`)

zizmor audits the Dependabot config too, not just the workflows. It flagged that
Dependabot could propose a dependency update the moment a new version is
published — before a compromised or broken release has had time to be caught and
yanked (1 low + 2 medium). The `npm` updater used only a 1-day cooldown; the
`docker` and `github-actions` updaters had none.

---

## Remediation applied

All findings were fixed in the same change that introduced the check, so the
pipeline is green from day one:

| Fix                                                                                                                                                              | Resolves                | Notes                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned every action to a commit SHA with a `# vX.Y.Z` comment (latest `v4.x`, no major bumps).                                                                   | `unpinned-uses`         | Dependabot keeps the SHA and version comment up to date (see `.github/dependabot.yml`, `github-actions` ecosystem).                                     |
| Added a minimal top-level `permissions: contents: read`; `check-draft` (which needs nothing) is set to `permissions: {}`; the `zizmor` job adds `actions: read`. | `excessive-permissions` | Read access is all the build/test jobs require.                                                                                                         |
| Added `persist-credentials: false` to every `actions/checkout` step.                                                                                             | `artipacked`            | No job re-uses the git credential after checkout.                                                                                                       |
| Added `name: Check Draft` to the `check-draft` job.                                                                                                              | `anonymous-definition`  | Makes the workflow clean even under the `auditor` persona.                                                                                              |
| Set a 7-day `cooldown` on every Dependabot ecosystem (`npm`, `docker`, `github-actions`).                                                                        | `dependabot-cooldown`   | Delays adoption of freshly published versions so a compromised release can be yanked first; still well beyond the 12h `minimumReleaseAge` install gate. |

After remediation `zizmor` reports **no findings** across the whole repository —
under the default `regular` persona as well as the stricter `pedantic` and
`auditor` personas.

---

## Running zizmor locally

`zizmor` can be run without installing it permanently via `uvx`:

```bash
# Scan the whole repository — the same input scope the CI action uses (`.`).
# Passing only `.github/workflows/` misses `.github/dependabot.yml`.

# Offline (fast, no GitHub token needed)
uvx zizmor --offline .

# Online audits (matches CI; needs a token for the GitHub API)
GH_TOKEN="$(gh auth token)" uvx zizmor .

# Stricter review
uvx zizmor --offline --persona auditor .
```

See the [zizmor documentation](https://docs.zizmor.sh) for the full audit
catalogue and configuration options.

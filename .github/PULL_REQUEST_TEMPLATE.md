<!--
Thank you for contributing to Huella Latam.

Please follow the project's commit conventions:
- Branch prefix: feat/ | fix/ | refactor/ | docs/ | chore/ | infra/ | claude/
- Commit messages: https://www.conventionalcommits.org/

Read CONTRIBUTING.md and docs/development/contributing.md before
opening this pull request.
-->

## Summary

<!-- 1–3 bullets describing what this PR does and why. Focus on the
"why" rather than restating the "what" already visible in the diff. -->

-
-

## Linked issues

<!-- Reference any related issues. Use "Closes #123" to auto-close on
merge. -->

Closes #

## Type of change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — internal change with no behavioural impact
- [ ] docs — documentation only
- [ ] chore — repository or tooling change
- [ ] infra — infrastructure-as-code change
- [ ] security — security-relevant change (also fill in the security
      checklist below)
- [ ] breaking — backward-incompatible change for country deployers
      (must include a deprecation path or migration note)

## Country-agnosticism checklist

- [ ] No country-specific logic was hard-coded in the codebase.
- [ ] Country variation is expressed through configuration, seed data
      or system parameters.
- [ ] The change is backward-compatible with existing country
      deployments, or a deprecation path and migration note are
      documented in this PR.

## DPG checklist

- [ ] Documentation under `docs/` was updated where relevant.
- [ ] No new platform-specific dependency was added without an
      open-source alternative path documented.
- [ ] No new PII handling pattern was introduced without review
      against `docs/security/sensitive-data.md` and `PRIVACY.md`.
- [ ] If this PR adds user-facing strings, they are in Spanish (the
      project's user-facing language).

## Security checklist

<!-- Required for any change touching authentication, authorization,
file upload, secrets, or database queries. Tick "N/A" otherwise. -->

- [ ] N/A — this PR does not touch security-sensitive code.
- [ ] Authentication / authorisation paths reviewed.
- [ ] File-upload paths reviewed (size, MIME, source).
- [ ] Secrets handling reviewed (no secrets in logs, no fallback
      defaults).
- [ ] Audit-log entries added for new sensitive actions.

## Mandatory local checks

```sh
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
```

- [ ] All of the above pass locally on my machine.

## Screenshots / evidence

<!-- For UI changes, include before/after screenshots or screen
recordings. For backend changes, include relevant request/response
samples or test output. -->

## Reviewer notes

<!-- Anything specific you want reviewers to focus on, known
trade-offs, follow-ups planned in a separate PR. -->

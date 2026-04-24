<branch-name>:
<spec-name>:

### Preconditions:

- The GitHub MCP is configured, authenticated, and available.
- A PR already exists for branch <branch-name>.
- Docker is running (required by Testcontainers for integration tests).

### Instructions:

1. **Protected-branch gate**: verify that `<branch-name>` is not a protected branch (`main`, `master`, `release`, `prod`, `staging`). If it matches, abort immediately with a clear error — do not checkout, push, or modify the branch. After validation passes, checkout to branch `<branch-name>` and pull latest from origin.
2. Run session setup: `pnpm install` and `.claude/setup.sh`.
3. Read the OpenSpec named <spec-name>.
4. Implement the feature using the skill "opsx:apply <spec-name>".
   Follow all guidelines in ".claude/CLAUDE.md" — especially modular commits.
5. Record the current UTC timestamp as the **review-cycle cutoff** (this marks the start of this review run).
6. Comment "@coderabbitai review" on the PR to trigger an incremental review. Poll PR comments every 60 seconds until CodeRabbit's review summary comment appears (this signals the review is complete). If no review summary appears after 1 hour, proceed without CodeRabbit review and note this in a PR comment.
7. Read all PR review comments created **after the review-cycle cutoff** that are unresolved and have no fix commit — ignore any comments from earlier review cycles. For each:
   - If valid and aligned with the spec: make the fix → run format/lint/type-check → commit → push. Then reply with the commit SHA and a summary of the solution.
   - If it contradicts the spec or your reasoning: reply explaining your decision, citing the spec or technical rationale.
8. After addressing all comments, do a final pass: re-read the spec, run tests, confirm everything is consistent. If tests fail, fix the failures, run format/lint/type-check, commit, and push before proceeding.
9. Poll the PR for new review comments every 3 minutes (still filtering to comments created after the review-cycle cutoff). On each poll, first check the PR state — stop polling immediately if the PR is approved, merged, closed, or no longer open (e.g., converted to draft). If the PR is still open, process any new comments using the same rules from step 7, then repeat the final pass from step 8. After 30 minutes with no new comments, reduce polling frequency to every 30 minutes.

### Tips:

- If the spec is ambiguous, make reasonable assumptions and document them in a PR comment after implementation.
- If the spec requires DB schema changes, run migrations before implementing endpoints.
- If the branch has conflicts with main, rebase and resolve before starting.
- Group closely related review comments into a single fix commit when they touch the same code.

<branch-name>:
<spec-name>:

### Preconditions:

- The Github MCP is configured, authenticated, and available.
- A PR already exists for branch <branch-name>.

### Instructions:

1. Checkout to branch <branch-name> and pull latest from origin.
2. Run session setup: `pnpm install` and `.claude/setup.sh`.
3. Read the OpenSpec named <spec-name>.
4. Implement the feature using the skill "opsx:apply <spec-name>".
   Follow all guidelines in ".claude/CLAUDE.md" — especially modular commits.
5. Comment "@coderabbitai review" on the PR to trigger an incremental review.
6. Poll the PR comments every 60 seconds until CodeRabbit's review summary comment appears (this signals the review is complete). If no review summary appears after 1 hour, proceed without CodeRabbit review and note this in a PR comment.
7. Read all review comments from this review cycle (unresolved and without a fix commit). For each:
   - If valid and aligned with the spec: make the fix → run format/lint/type-check → commit → push. Then reply with the commit SHA and a summary of the solution.
   - If it contradicts the spec or your reasoning: reply explaining your decision, citing the spec or technical rationale.
8. After addressing all comments, do a final pass: re-read the spec, run tests, confirm everything is consistent. If tests fail, fix the failures, run format/lint/type-check, commit, and push before proceeding.
9. Poll the PR for new review comments every 3 minutes. Process any new comments using the same rules from step 7, then repeat the final pass from step 8. After 30 minutes with no new comments, reduce polling frequency to every 30 minutes. Stop polling when the PR is approved.

### Tips:

- If the spec is ambiguous, make reasonable assumptions and document them in a PR comment after implementation.
- If the spec requires DB schema changes, run migrations before implementing endpoints.
- If the branch has conflicts with main, rebase and resolve before starting.
- Group closely related review comments into a single fix commit when they touch the same code.

#!/usr/bin/env bash
# worktree-teardown.sh — lifecycle hook for DESTROYING a git worktree.
#
# Point your ADE's "on destroy / teardown" hook at this script; it runs from
# inside the worktree being removed. It drops this worktree's private database so
# per-worktree databases don't accumulate. The API port needs no cleanup —
# worktree-env.mjs prunes deleted worktrees from its registry automatically.
#
# Safe: `pnpm db:drop:worktree` only ever drops a localhost per-worktree database
# (never the shared base DB or a remote server). See docs/development/local-setup.md.
set -euo pipefail

TARGET="$(git rev-parse --show-toplevel)"
MAIN="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -1)"

if [[ "$TARGET" == "$MAIN" ]]; then
  echo "This is the primary clone — nothing to tear down."
  exit 0
fi

cd "$TARGET"

# Drop with the worktree's env loaded so DATABASE_URL is the per-worktree one.
# Non-fatal: it may already be gone, or the DB may not be running.
if command -v direnv >/dev/null 2>&1 && [[ -f "$TARGET/.envrc" ]]; then
  direnv exec "$TARGET" pnpm db:drop:worktree ||
    echo "  ⚠ db:drop:worktree failed (already dropped, or the database isn't running)."
else
  pnpm db:drop:worktree ||
    echo "  ⚠ db:drop:worktree failed (direnv/env not available, already dropped, or DB down)."
fi

echo "Done — per-worktree database dropped."

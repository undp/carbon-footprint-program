#!/usr/bin/env bash
# worktree-setup.sh — lifecycle hook for CREATING a git worktree.
#
# Point your ADE's "on create / setup" hook at this script (Emdash, Superset, …);
# it runs from inside the freshly-created worktree. A worktree already has all the
# versioned code — this seeds the *gitignored* bits and brings it up:
#   1. copy the env files from the primary clone,
#   2. direnv allow them,
#   3. pnpm install + build,
#   4. provision this worktree's database (pnpm db:provision).
#
# Per-worktree isolation (own API port + DB + OIDC) is opt-in via the
# `eval "$(node scripts/dev/worktree-env.mjs)"` line in .envrc — see
# docs/development/local-setup.md. Uncomment it in your PRIMARY clone's .envrc and
# every worktree seeded here inherits it; this script does not edit .envrc.
#
# Idempotent and safe to re-run.
set -euo pipefail

# Gitignored files to seed into a new worktree (they hold local env config).
ENV_FILES=(".envrc" "infra/.envrc")

TARGET="$(git rev-parse --show-toplevel)"
MAIN="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -1)"
echo "worktree: $TARGET"
echo "primary:  $MAIN"

if [[ "$TARGET" == "$MAIN" ]]; then
  echo "This is the primary clone — no per-worktree setup needed."
  exit 0
fi

# 1. Seed gitignored env files from the primary clone (including whatever
#    per-worktree isolation state you've set there).
for f in "${ENV_FILES[@]}"; do
  if [[ -f "$MAIN/$f" ]]; then
    mkdir -p "$(dirname "$TARGET/$f")"
    cp "$MAIN/$f" "$TARGET/$f"
    echo "  ✓ seeded $f"
  else
    echo "  ⚠ $f not found in the primary clone; skipped"
  fi
done

# 2. Approve the seeded .envrc files (they come from a trusted source).
if command -v direnv >/dev/null 2>&1; then
  for f in "${ENV_FILES[@]}"; do
    [[ -f "$TARGET/$f" ]] && (cd "$(dirname "$TARGET/$f")" && direnv allow .)
  done
fi

cd "$TARGET"

# Run env-dependent steps with the worktree's env loaded (via direnv when
# available) so the build and DB commands see the per-worktree values.
run() {
  if command -v direnv >/dev/null 2>&1 && [[ -f "$TARGET/.envrc" ]]; then
    direnv exec "$TARGET" "$@"
  else
    "$@"
  fi
}

# 3. Install + build.
pnpm install
run pnpm build

# 4. Provision this worktree's database. Non-fatal: Postgres/MinIO may not be up
#    yet — the developer can run `pnpm db:provision` later.
run pnpm db:provision ||
  echo "  ⚠ db:provision failed (are Postgres and MinIO running?) — run 'pnpm db:provision' when they are."

echo "Done — worktree ready."

# Pinned betterleaks image for the CI "Secret Scan" job (.github/workflows/ci.yml).
#
# Why this Dockerfile exists instead of `docker run ghcr.io/...@sha256:` inline in
# the workflow: Dependabot's `docker` ecosystem automatically opens PRs to bump a
# `FROM ...@sha256:` digest, but it does NOT see an image referenced in a workflow
# `run:` step. Keeping the pin here (a single source of truth that the workflow
# builds and runs) is what gives us automatic update tracking — see the matching
# `docker` entry in .github/dependabot.yml. Do not also hard-code the digest in
# ci.yml, or the two would drift.
#
# betterleaks is the actively maintained, drop-in successor to gitleaks (same
# original author; gitleaks is now feature-frozen / security-patches only). It
# reads the repo's .gitleaks.toml allowlist unchanged.
FROM ghcr.io/betterleaks/betterleaks:v1.6.1@sha256:7a43a20d40be02a9c13801a6485f7bea9d9cdba512263440eae972103c5291f1

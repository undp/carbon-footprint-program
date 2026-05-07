# Maintainers

This file records the active maintainer team of Huella Latam and the
areas of the codebase for which each maintainer has primary review
responsibility. The list is intentionally short and is updated as the
project evolves; for the formal owner of the project assets, see
`AUTHORS` and the project ToR (UNDP Project 01000983).

Routing for pull requests is enforced automatically through
`.github/CODEOWNERS`. This file documents the social structure behind
those rules.

## Project Owner

- **United Nations Development Programme (UNDP)** — Climate Promise.
  Holder of copyright and final decision-maker on roadmap, releases,
  and country onboarding.

## Active Maintainer Team

The active maintainer team is the delivery organisation contracted by
UNDP under the project ToR. The team's GitHub handles are listed in
`.github/CODEOWNERS` so that pull requests are automatically assigned
for review.

| Area                                     | Primary reviewers                 |
| ---------------------------------------- | --------------------------------- |
| API (`apps/api`)                         | Backend maintainers               |
| Web (`apps/web`)                         | Frontend maintainers              |
| Database (`packages/database`)           | Backend maintainers               |
| Infrastructure (`infra/`)                | Platform / DevOps maintainers     |
| Methodology data (`load_methodologies/`) | Climate / methodology specialists |
| Documentation (`docs/`)                  | Any maintainer                    |
| Security-sensitive code                  | Security reviewers (mandatory)    |

Security-sensitive code includes — at minimum — anything under
`apps/api/src/plugins/` related to authentication or authorization,
file-upload paths, secret management, the Prisma schema, and the
infrastructure-as-code modules.

## How to become a maintainer

Maintainership is granted by the existing maintainer team based on
sustained, high-quality contributions and demonstrated alignment with
the project's country-agnosticism principle. Country implementation
teams that contribute back upstream are particularly encouraged to
nominate a maintainer.

The process is:

1. Open an issue titled `Maintainer nomination: <name>`.
2. The current maintainer team reviews the contribution history.
3. A simple majority of active maintainers approves the nomination.
4. The new maintainer is added to `.github/CODEOWNERS` and to this
   file in the same pull request.

## How to step down

Maintainers may step down at any time by opening a pull request that
removes their handle from `.github/CODEOWNERS` and from this file.
Long-inactive maintainers (>12 months without review activity) may be
moved to an "emeritus" section by the active team.

## Steering Committee

Per the project ToR, project steering — roadmap priorities, acceptance
of new country deployments, major architectural decisions — is the
responsibility of UNDP and the Climate Promise team. As the project
matures into a multi-country deployment, a formal steering committee
including country implementation leads is expected to be documented
here.

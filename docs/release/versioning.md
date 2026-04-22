# Versioning Strategy and Release Process

---

## Versioning

The project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

| Component | Increment when                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------- |
| **MAJOR** | Breaking changes to the API contract, major data model changes, or fundamental architecture changes |
| **MINOR** | New features added in a backward-compatible manner                                                  |
| **PATCH** | Bug fixes, security patches, or minor improvements                                                  |

**Version is set in:**

- `package.json` (root) — the canonical version source
- Docker image tag — set via `IMAGE_TAG` during deployment (defaults to Git short SHA)
- `APP_VERSION` environment variable — displayed in API health endpoint

---

## Git Branching Model

The project follows **GitHub Flow**: a lightweight, trunk-based workflow.

```
main (production-ready)
  │
  ├── feature/description       ← feature branches (short-lived)
  ├── fix/description           ← bug fix branches
  ├── claude/description        ← automated/AI-assisted changes
  └── release/v1.2.0            ← release branches (optional)
```

**Rules:**

- `main` is always deployable
- All changes go through pull requests with at least one review
- Direct commits to `main` are not allowed
- CI must pass before merging (lint, type-check, format, tests, build)
- Feature branches are deleted after merging

---

## Commit Convention

The project uses **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type       | Description                            |
| ---------- | -------------------------------------- |
| `feat`     | New feature                            |
| `fix`      | Bug fix                                |
| `docs`     | Documentation changes                  |
| `style`    | Formatting, no logic change            |
| `refactor` | Code refactor without behavior change  |
| `test`     | Adding or updating tests               |
| `chore`    | Build, tooling, dependency updates     |
| `perf`     | Performance improvements               |
| `ci`       | CI/CD changes                          |
| `infra`    | Infrastructure (Bicep/scripts) changes |

**Examples:**

```
feat(organizations): add bulk accreditation endpoint
fix(carbonInventory): correct emission factor lookup for nested dimensions
infra(bicep): add auto-scaling rule to App Service
chore(deps): upgrade MUI to v7.3.5
```

---

## Continuous Integration (CI)

The CI pipeline runs automatically on every pull request targeting `main`.

**GitHub Actions workflow (`.github/workflows/ci.yml`):**

| Job           | What it checks                                       |
| ------------- | ---------------------------------------------------- |
| `check-draft` | Skips CI for draft PRs                               |
| `lint`        | ESLint with zero warnings                            |
| `type-check`  | TypeScript compilation without errors                |
| `format`      | Prettier format check                                |
| `test`        | Vitest integration tests (uploads coverage artifact) |
| `build`       | Production build of all apps                         |

All jobs must pass before a PR can be merged.

---

## Release Process

### Standard Release

1. **Prepare the release branch** (optional for MAJOR/MINOR):

   ```bash
   git checkout -b release/v1.2.0
   # Bump version in root package.json
   # Update CHANGELOG if maintained
   git commit -m "chore: bump version to 1.2.0"
   git push origin release/v1.2.0
   ```

2. **Merge to `main`** via pull request:
   - All CI checks must pass
   - At least one code review approval

3. **Tag the release:**

   ```bash
   git checkout main && git pull
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

4. **Deploy to staging** (test the tagged version):

   ```bash
   cd infra
   export ENVIRONMENT="staging"
   export IMAGE_TAG="v1.2.0"
   ./deploy-api.sh
   ./deploy-web.sh
   ```

5. **Validate staging:**
   - [ ] Health check passes
   - [ ] Swagger UI accessible
   - [ ] Run smoke tests for critical flows
   - [ ] Verify DB migrations applied correctly

6. **Deploy to production:**

   ```bash
   export ENVIRONMENT="production"
   export IMAGE_TAG="v1.2.0"
   ./deploy-api.sh
   ./deploy-web.sh
   ```

7. **Post-deployment:**
   - [ ] Health check passes
   - [ ] Monitor error rate for 30 minutes
   - [ ] Announce release internally

### Hotfix Process

For urgent production fixes:

```bash
git checkout main
git pull
git checkout -b fix/critical-bug-description

# Make the fix
git commit -m "fix: resolve critical issue description"
git push origin fix/critical-bug-description

# Open PR → review → merge to main
# Then tag and deploy immediately:
git tag -a v1.2.1 -m "Hotfix: description"
git push origin v1.2.1
```

Deploy using `IMAGE_TAG=v1.2.1` directly to production if the severity justifies skipping staging.

---

## Deployment Modes

### Infrastructure (Bicep) Deployment

Run when infrastructure changes are needed (new resources, config changes, SKU updates).

```bash
cd infra
./deploy.sh       # Creates/updates Azure resources
```

**Triggers:**

- Adding new Azure services
- Changing SKUs (e.g., scaling up PostgreSQL)
- Modifying Bicep modules
- First deployment of a new environment

### API Deployment

Run on every release that includes backend changes.

```bash
cd infra
export IMAGE_TAG="v1.2.0"   # or git short SHA
./deploy-api.sh              # Builds Docker image, pushes to ACR, updates App Service
```

### Frontend Deployment

Run on every release that includes frontend changes.

```bash
cd infra
./deploy-web.sh   # Builds React SPA, deploys to Azure Static Web App
```

### Database Migrations

Run separately, **before** deploying a new API version that requires schema changes.

```bash
cd infra
./run-migrations.sh   # Applies pending Prisma migrations to Azure PostgreSQL
```

**Migration deployment order:**

1. Run `run-migrations.sh` (applies schema changes to DB)
2. Deploy new API version (`deploy-api.sh`)
3. Deploy new frontend version if needed (`deploy-web.sh`)

---

## Environment Promotion Flow

```
Developer workstation (local)
    │  feature/ branch
    │  pnpm dev + pnpm test
    ▼
Pull Request → CI (lint, type-check, format, test, build)
    │  merge to main
    ▼
Staging deployment
    │  IMAGE_TAG=<commit-sha>
    │  Manual validation
    ▼
Production deployment
    │  IMAGE_TAG=<semver-tag>
    │  Post-deployment monitoring
```

---

## Keeping Dependencies Up To Date

- Review dependency updates monthly
- Use `pnpm outdated` to identify packages needing updates
- Test in a feature branch before merging
- Pay attention to **major version upgrades** (breaking changes)
- Security patches (`pnpm audit`) should be addressed promptly

---

## Changelog Maintenance (Optional)

If a public changelog is maintained, follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [1.2.0] - 2026-04-21

### Added

- Bulk accreditation endpoint for organizations

### Fixed

- Emission factor lookup for nested dimension values

### Changed

- Upgraded MUI to v7.3.5
```

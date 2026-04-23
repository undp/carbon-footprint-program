## Why

Today, managing platform recognition badges (the images shown on approved carbon inventories, accreditations, and project verifications) requires direct database and blob-storage manipulation: to replace a badge image or roll back to a previous one, an operator has to manually upload to Azure Blob and flip `Badge.status` rows. There is no self-service path for the `SUPERADMIN` role to curate these assets, and the implicit requirement that exactly one badge per type be `ACTIVE` is enforced only by a DB partial index — with no UI to make the trade-off visible when replacing an existing active badge.

This change delivers a dedicated Badge Maintainer screen in the admin area so `SUPERADMIN` users can upload new badges, switch the active badge per type, and reactivate previously uploaded ones — without leaving the product.

## What Changes

- Add a new **Badge Maintainer** screen under the existing Maintainer admin area (`/admin/...`), visible only to `SUPERADMIN`.
- Screen lists all badge types (from the `BadgeType` enum) and, for each type, shows:
  - the currently **ACTIVE** badge (preview + metadata),
  - the most recent **INACTIVE** badges for that type (capped — see below).
- Add an **upload action** per badge type that reuses the existing `request-upload` / `confirm-upload` flow. **Upload no longer activates**: confirming an upload creates a new Badge row with `status = INACTIVE` and returns the created Badge (including its `previewUrl`) in the response. It does not touch the currently-`ACTIVE` badge. Activation is always an explicit second step via `POST /badges/:id/activate`. This is a **BREAKING** change to the existing `confirm-upload` behaviour, which previously atomically swapped to the new badge.
- Add an **activate action** on any `INACTIVE` badge (freshly uploaded or historical) that promotes it to `ACTIVE`, demoting the currently active badge of the same type to `INACTIVE`.
- Add a **deactivate action** on the currently `ACTIVE` badge that sets it to `INACTIVE` without a replacement, leaving that badge type with no active badge until an operator activates another one. Permitted by the existing DB partial unique index (zero actives is allowed; only two-actives is forbidden).
- Add a **confirmation dialog** that warns the user before any action that replaces — or removes — the currently `ACTIVE` badge of a type (activate or deactivate). Upload no longer needs a warning because it never touches the active badge.
- Add a new backend endpoint to **list all badges grouped by type** (including inactive ones, with signed read SAS preview URLs). `history` is capped at the 20 most recent `INACTIVE` badges per type by `createdAt` desc.
- Add new backend endpoints to **activate** (`POST /badges/:id/activate`) and **deactivate** (`POST /badges/:id/deactivate`) an existing badge by id, enforcing the "at most one ACTIVE per type" invariant atomically in a transaction.
- **BREAKING**: Tighten the existing upload endpoints `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload` from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]`. Callers relying on the `ADMIN` role will now receive `403`.
- **Lock in current behaviour** that submission approval (both manual `approveRequest` and automatic `selfDeclareCarbonInventory`) SHALL proceed when no `ACTIVE` badge exists for the submission's type. In that case the submission is approved with `badgeId = null`. This is already how the code works (`activeBadge?.id` on nullable `Submission.badgeId`); promoted to a named requirement so a standalone deactivate can never silently break approvals.
- Add **server-side file validation** to `confirm-upload`: reject files whose mime type is not in the badge allow-list **or** whose size exceeds the configured maximum.
- Restrict all new endpoints and the new screen to `SUPERADMIN`.

Non-goals:

- No change to the `Badge` or `File` Prisma models; the `BadgeStatus` enum and the partial unique index that enforces one `ACTIVE` per type already exist.
- No change to the blob-path convention (`badges/{badgeType}/{uuid}/{originalName}`).
- No change to how badges are rendered on public/organization-facing pages — those already resolve badges per submission (via each submission's `badge` relation), not by looking up the currently-active badge.
- No audit trail ("who activated what, when"); deferred to a future change.
- No bulk operations or CSV import.

## Capabilities

### New Capabilities

- `badge-maintainer`: SUPERADMIN-facing capability for managing the lifecycle (upload, activate, reactivate, deactivate) of recognition badges per `BadgeType`, including listing active and capped historical badges with signed preview URLs, server-side file validation on upload, and enforcing the at-most-one-ACTIVE-per-type invariant with user-visible warnings on replace and remove.

### Modified Capabilities

- `files-badge-upload`: existing `/files/badges/:badgeType/request-upload` and `/files/badges/:badgeType/confirm-upload` are modified:
  - access restricted from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]`
  - `confirm-upload` now creates `INACTIVE` badges (no automatic active swap)
  - `confirm-upload` adds server-side mime/size validation and returns `{ badge: BadgeDTO }`

The existing `get-organization-badges` spec describes a different endpoint (earned-badges-per-org) and is not changed.

## Impact

- **Backend (`apps/api`)**: new feature folders under `src/features/badges/` (or extend `src/features/files/badges/`) for `listBadges`, `activateBadge`, and `deactivateBadge`. Tightens auth on existing `files/badges/requestBadgeUpload` and `confirmBadgeUpload` to `[SUPERADMIN]`, changes `confirmBadgeUpload` to create the Badge as `INACTIVE` (no more atomic swap) and return the new Badge DTO, and extends `confirmBadgeUpload` with mime/size validation. Reuses existing `generateReadSasUrl` and the `requireRoles(...)` middleware. No schema migration required.
- **Frontend (`apps/web`)**: new screen under `src/screens/Maintainer/screens/Badges/`, new route under `src/routes/admin/`, new React Query hooks under `src/api/query/badges/`. Adds a sidebar entry in `MaintainerLayout` gated by `SUPERADMIN`.
- **Auth**: relies on the existing `SystemRole.SUPERADMIN` check; no new role or permission is introduced.
- **Storage**: no new blob container or path convention; reuses `badges/{badgeType}/{uuid}/{originalName}`.
- **Ops**: once shipped, operators should stop editing `Badge.status` directly in the database; the UI becomes the supported path.

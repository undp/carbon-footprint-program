## Context

The Huella Latam platform already has a `Badge` domain:

- `Badge(id, type, status, fileId, createdAt)` with `BadgeStatus = ACTIVE | INACTIVE` and a partial unique index enforcing _one `ACTIVE` row per `type`_.
- Badge files live in Azure Blob under `badges/{badgeType}/{uuid}/{originalName}` and are retrieved via expiring read SAS URLs (`generateReadSasUrl`).
- A request/confirm upload flow exists at `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload`. The confirm step already deactivates the previously active badge and inserts a new `ACTIVE` one inside a single transaction.
- `GET /organizations/:id/badges` exists but returns _earned_ badges for an org, not the maintainer catalog.
- Admin screens live under `apps/web/src/screens/Maintainer/`, gated by `SystemRole.ADMIN | SUPERADMIN` via `requireRole`. The existing layout already supports per-item `requiredRoles` for sidebar entries.

Backend stack: Fastify + Zod routes, Prisma, feature-folder convention `apps/api/src/features/<feature>/<action>/{route,handler,service}.ts`. Frontend stack: Vite + React 19 + TanStack Router + React Query + MUI + Tailwind + RHF/Zod.

The new Badge Maintainer screen is a thin admin UI over this existing domain, plus three new backend endpoints (list / activate / deactivate) and two small edits to the existing upload flow (tighten auth, add file validation).

## Goals / Non-Goals

**Goals:**

- Give `SUPERADMIN` users a single screen to see, upload, activate, reactivate, and deactivate the badge for each `BadgeType`.
- Preserve full history: every uploaded badge remains in the database as `INACTIVE` and can be reactivated later without re-uploading the file.
- Preserve the "at most one `ACTIVE` per type" invariant transactionally (zero is allowed; two is forbidden); never rely on the UI alone to enforce it.
- Warn the user before any action that replaces or removes the currently-`ACTIVE` badge, showing which badge is outgoing and, where applicable, which is incoming.
- Reuse the existing upload infrastructure (request/confirm SAS flow, blob path convention), extending `confirmBadgeUpload` with server-side mime and size validation.
- Restrict badge management (list, activate, deactivate, upload) to `SUPERADMIN` only, tightening the existing upload endpoints from `[SUPERADMIN, ADMIN]`.

**Non-Goals:**

- No changes to `Badge` / `File` Prisma models or to the `BadgeStatus` / `BadgeType` enums.
- No new roles or permissions. `SUPERADMIN` only — `ADMIN` loses access to the upload endpoints.
- No badge editing beyond activation state (no renaming types, no metadata fields, no cropping, no per-locale variants).
- No change to how consumer-facing screens render badges — they already read each submission's attached `badge` rather than looking up the currently-active one.
- No audit trail ("who activated what, when"); deferred.
- No bulk upload or CSV import.
- No migration of existing badge files; the screen operates on whatever is already in `Badge` + `File`.

## Decisions

### D1. Keep the existing `Badge` schema; no new tables

**Decision:** Model this purely as status transitions on the existing `Badge` rows. No `BadgeVersion`, no soft-delete column, no `activeFrom`/`activeTo` timestamps.

**Why:** The schema already encodes versioning through append-only rows (`createdAt` + status) and enforces the "single ACTIVE per type" invariant via a partial unique index. Adding new tables would duplicate that information and force a data migration for a screen that is purely operational.

**Alternatives considered:**

- _Add `Badge.activatedAt` / `deactivatedAt` columns_ — useful for audit, but out of scope; `createdAt` + status transitions are enough for v1. A follow-up change can add an `AuditLog` table that covers badges and other admin actions uniformly.
- _Introduce a `BadgeVersion` child table_ — over-engineered; `Badge` already _is_ the version.

### D2. New endpoint `GET /badges` (list all) lives next to existing badge endpoints

**Decision:** Add `GET /badges` returning `{ type, active: BadgeDTO | null, history: BadgeDTO[] }[]` — one object per `BadgeType`, with the active badge (if any) and an ordered list of inactive badges (newest first). Each `BadgeDTO` contains `id`, `type`, `status`, `createdAt`, `previewUrl` (read SAS), `fileName`, `mimeType`.

Path: `apps/api/src/features/badges/listBadges/{route,handler,service}.ts`. Auth: `requireRoles([SUPERADMIN])`.

**Why:** The existing `GET /organizations/:id/badges` is scoped to earned badges per organization and hits a different join path. A dedicated admin endpoint is clearer than overloading that one with query flags, and its response shape maps directly to the UI layout (one card per type).

**Alternatives considered:**

- _Paginated flat list of all badges_ — more generic, but the UI wants per-type grouping; grouping client-side would require every request to fetch all history just to pick the active one. Server-side grouping is cheaper and simpler.
- _Separate `GET /badges/active` and `GET /badges/history?type=`_ — two round trips for a screen that needs both at once.

### D3. Two explicit state-transition endpoints: `activate` and `deactivate`

**Decision:** Add two single-purpose endpoints rather than a generic `PATCH`:

- `POST /badges/:id/activate` — inside a single Prisma transaction:
  1. Load the target badge; 404 if missing.
  2. If it is already `ACTIVE`, return 200 with the current state (idempotent).
  3. Otherwise, set `status = INACTIVE` on the currently `ACTIVE` row of the same type (if one exists), then set `status = ACTIVE` on the target.
  4. Return the updated catalog entry for that type.

- `POST /badges/:id/deactivate` — inside a single Prisma transaction:
  1. Load the target badge; 404 if missing.
  2. If it is already `INACTIVE`, return 200 with the current state (idempotent no-op).
  3. Otherwise, set `status = INACTIVE` on the target. No replacement is activated; the type may legitimately end with zero active badges.
  4. Return the updated catalog entry for that type.

Paths: `apps/api/src/features/badges/activateBadge/{route,handler,service}.ts` and `apps/api/src/features/badges/deactivateBadge/{route,handler,service}.ts`. Auth: `requireRoles([SUPERADMIN])` on both.

**Why:** Both endpoints are tiny, single-purpose, transactional. Using verb endpoints rather than `PATCH /:id { status }` makes the state machine explicit on the wire and lets each endpoint enforce its own guardrail (activate must demote the incumbent; deactivate must not activate anyone else). Standalone deactivation is now a product requirement (user req #3) and the DB partial unique index permits it — the index only forbids _two_ actives, not zero.

**Alternatives considered:**

- _`PATCH /badges/:id` with `{ status }`_ — one endpoint, two behaviors, harder to audit. Rejected.
- _Force deactivate to require a replacement badge id_ — matches the previous design but contradicts the user's explicit requirement to allow "remove the active badge" as a standalone operation.
- _Enforce "at most one ACTIVE per type" only via the DB partial unique index_ — we rely on that index as a safety net, but each transaction still demotes the incumbent explicitly so operators don't see generic DB unique-constraint errors on the activate path.

### D4. Upload creates an INACTIVE badge; activation is explicit

**Decision:** The Upload button in the UI calls the existing `request-upload` / `confirm-upload` pair. No new upload endpoint is introduced. Three edits to the existing endpoints:

1. **Tighten auth** from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]` on both `request-upload` and `confirm-upload`. This is a **breaking change** for any `ADMIN` caller. There is no known `ADMIN`-only caller today (badge management was not a documented `ADMIN` capability), but we confirm that at rollout.
2. **Decouple upload from activation.** `confirmBadgeUpload` now creates the new `Badge` row with `status = INACTIVE` and **does not** demote the currently-`ACTIVE` badge of the same type. It returns the created `Badge` DTO (including `previewUrl`) in the response body. Activation, if desired, is a separate `POST /badges/:id/activate` call. This is a **breaking behaviour change** to `confirm-upload`, which previously performed an atomic activate-new/deactivate-old swap. Acceptable because the only caller is now the maintainer screen we control.
3. **Add server-side file validation** inside `confirmBadgeUpload`: mime type must be in an allow-list (e.g. `image/png`, `image/svg+xml`, `image/jpeg`, `image/webp` — exact list confirmed against the current code), and file size must be ≤ a configurable maximum (default 5 MB). Validation rejects with `400` and no `File` or `Badge` row is created.

**Why decouple upload from activation:** operators want to upload and _review_ a badge before making it live — the old "upload = go live" behaviour made every upload a destructive operation with an incumbent to demote. Separating the two steps makes the happy path safer (upload is free of side effects on the active badge), removes the need for a confirmation dialog on upload, and lets a reviewer eyeball the new file before flipping the switch. The DB partial unique index is unaffected because the new row is created as `INACTIVE`.

**Why one endpoint, not two:** we could have added a maintainer-only upload alias and kept the old swap semantics for some other caller, but there is no other caller — auth is now SUPERADMIN-only and the maintainer screen is the sole consumer. One code path is simpler.

**Why validate on confirm, not on request:** the write SAS URL lets clients upload arbitrary bytes before `confirm-upload` runs, so the blob content is not yet known at `request-upload`. The server can only enforce mime/size at confirm.

**Response shape change:** `confirm-upload` now returns `{ badge: BadgeDTO }` instead of whatever it returned before (likely `{}` or the created File id). The maintainer screen uses this to add the new badge into the type's `history` immediately, without waiting for a catalog refetch.

**Alternatives considered:**

- _Keep the atomic swap and rely on the warning dialog to gate destructive uploads._ Rejected by the user — the explicit goal is to make upload non-destructive and allow previewing.
- _Add an `activateImmediately: true` flag to `confirm-upload` to preserve old behaviour._ Not needed; the two-step flow (upload → activate) is simple and the UI can chain them if a one-click experience is later requested.

### D5. Warning is a frontend-only confirmation dialog

**Decision:** The "warn before replacing — or removing — the ACTIVE badge" requirement is implemented as a client-side confirm dialog. Only the **activate** and **deactivate** flows trigger the dialog, because only those flows affect the currently-`ACTIVE` badge. Upload is now non-destructive (D4) and proceeds with no dialog. Deactivate uses a distinct dialog copy ("This type will have no active badge until you activate another") because it is not a replacement. The backend does not implement a "dry-run" or `?confirm=true` flag.

**Why:** The UI already has the authoritative view of what is active (it just rendered it). A server-side confirmation token would be defense against a different class of problem (concurrent admin edits), which is out of scope for a single-operator admin tool. Keeping the warning in the client keeps the API simple and the dialog responsive.

**Trade-off acknowledged:** two admins acting simultaneously could each confirm a replace and race. The DB partial unique index means the second write still produces a consistent state (one `ACTIVE`, last-writer-wins), and both transactions succeed because the first one demotes the incumbent before activating. This is acceptable; the screen is rarely used and by a tiny set of people.

### D6. Sidebar entry gated by `SUPERADMIN` only

**Decision:** Add a "Badges" item to `MaintainerLayout.tsx` with `requiredRoles: [SUPERADMIN]`. Route lives at `/admin/badges`. The route component uses the existing `requireRole([SUPERADMIN])` guard.

**Why:** Requirement (1) is explicit that `ADMIN` users must not see the screen. The existing layout already supports per-item role gates, so no new mechanism is needed.

### D7. Preview URLs are short-lived read SAS, fetched with the list

**Decision:** `GET /badges` calls `generateReadSasUrl` for every badge it returns (active and inactive). No lazy loading.

**Why:** The screen is admin-only, low-traffic, and showing historical previews is part of the point — without them, operators cannot choose which badge to reactivate. Generating N SAS URLs is cheap (they are signed locally, no blob round-trip).

### D8. Zero-active is a valid state; approvals proceed without a badge

**Decision:** The system permits a `BadgeType` to have zero `ACTIVE` badges. This occurs after a standalone deactivate (D3) or for a type that has never had a badge uploaded. Two downstream surfaces were audited:

- **Consumer-facing rendering** (organization pages, `getCarbonInventoryBadges`) — unaffected. These read the badge already attached to each approved submission rather than looking up the currently-active badge by type.
- **Approval workflow** — already tolerates the zero-active case. Both the manual path (`apps/api/src/features/requests/admin/approveRequest/service.ts:39-55`) and the automatic path (`apps/api/src/features/carbonInventories/selfDeclareCarbonInventory/service.ts:141-158`) call `tx.badge.findFirst({ where: { type, status: ACTIVE } })` and then set `badgeId: activeBadge?.id`. The FK `Submission.badgeId BigInt?` is nullable (`packages/database/src/prisma/schema.prisma:989`), so a `null` lookup flows through to an approved submission with `badgeId = null`. No code change is required to support standalone deactivation — only a spec requirement + regression test to lock it in.

**Why:** User requirement #3 explicitly asks for a "mark INACTIVE" action. Forcing a replacement would either invent an extra step (pick a replacement before deactivating) or block a legitimate operational use case (temporarily pulling a badge that is legally disputed). And the current code already supports the zero-active case cleanly — promoting it to a guaranteed contract prevents a future refactor from silently regressing it.

**Known limitation:** a submission approved during a zero-active window has `badgeId = null` permanently. Reactivating a badge later does _not_ retroactively attach it to those submissions. Acceptable for v1: the operator chose to remove the badge knowing that approvals during the window would go out without one. A backfill capability (if ever needed) would be a separate change.

### D9. Server-side file validation in `confirm-upload`

**Decision:** Enforce mime-type allow-list and size cap in `confirmBadgeUpload`. Reject with `400` and a structured error body. No `Badge` row is created on rejection. Limits are configurable via env (`BADGE_UPLOAD_MAX_BYTES`, default 5 MB) with a static mime allow-list in code for clarity.

**Why:** The write SAS URL lets the client upload arbitrary bytes before `confirm-upload` runs, so the server is the only enforcement point. Without this, a misconfigured client could persist a non-image file as a "badge". Validation is cheap (HEAD on the blob metadata already happens during confirm) and uses the existing `File.mimeType` field.

**Alternatives considered:**

- _Validate on the client before upload_ — insufficient; trivially bypassable.
- _Use Azure blob policies to restrict mime_ — blob storage does not enforce content types; it stores whatever header the upload provides.

### D10. History capped at 20 per type

**Decision:** `GET /badges` returns the 20 most recent `INACTIVE` badges per type, ordered by `createdAt` desc. No pagination cursor in v1. Older badges exist in the DB but are not surfaced in the UI.

**Why:** In production, each badge type has had fewer than 10 uploads over the platform's lifetime, so a cap of 20 is generous and forward-looking without requiring a cursor protocol. If a future use case needs access to older history, we add `?historyLimit` and `?historyCursor` then — the client behaviour for that is non-trivial and premature for v1.

## Risks / Trade-offs

- **[Risk] Operators bypass the UI and flip `Badge.status` directly in the DB** → Mitigation: the DB partial unique index will still reject any state that has two `ACTIVE` rows of the same type. The UI is an ergonomic layer, not a security boundary. We note in the proposal that direct DB edits should stop, and pair that with ops-team communication at rollout.
- **[Risk] Two `SUPERADMIN`s race on the same badge type** → Mitigation: each reactivate/confirm is a single Prisma transaction that demotes the incumbent and activates the target. The second transaction may demote the target of the first and activate a different badge; the final state is still consistent (one `ACTIVE`). The warning dialog is the only thing that could be "wrong" in this race, and it is benign.
- **[Risk] Reactivating a badge whose underlying blob has been manually deleted** → Mitigation: the read SAS generation will succeed (it does not check existence); the preview in the UI will 404 on the client. We surface that as a broken-image placeholder with a retry affordance; if the operator proceeds to activate, the badge row is valid but public pages will also 404. This edge case is accepted for v1 and logged. A follow-up change can add a blob-existence check on activation.
- **[Risk] Upload succeeds at blob but `confirm-upload` fails** → Already handled by the existing flow (orphan blobs are cleaned up by the confirm handler / a TTL on the write SAS). No new code path.
- **[Risk] Tightening `/files/badges/*` auth from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]` breaks an unknown ADMIN caller** → Mitigation: grep the codebase and logs for `ADMIN` callers to these endpoints before rollout; surface in release notes; if an `ADMIN` user hits 403, the error body explains the new requirement. Rollback is the inverse edit on the middleware only.
- **[Risk] A type has no `ACTIVE` badge when a new submission is approved** → Resolved: the approval paths already call `findFirst` for the active badge and pass `activeBadge?.id` into a nullable FK (`Submission.badgeId BigInt?`), so the submission is approved with `badgeId = null` rather than failing. A spec requirement + regression test in this change lock that behaviour in. Submissions approved during a zero-active window keep `badgeId = null` permanently; no retroactive attach.
- **[Risk] Server-side validation rejects a previously-accepted file** → Mitigation: the allow-list matches today's in-repo badge files; test fixtures include each type. Any outlier surfaces at rollout before any user-facing flow is affected.
- **[Trade-off] SAS URLs embedded in the list response expire** → the UI should refetch on focus or treat 403 on preview as a cue to refetch. React Query's default refetch-on-focus covers this.
- **[Trade-off] No audit trail in v1** → who-changed-what is not recorded beyond `Badge.createdAt`. Acceptable given low frequency; a future `AuditLog` capability is the right home for it, not this change.
- **[Trade-off] History is capped at 20, not paginated** → older entries are invisible in the UI. Acceptable given current volume (<10 per type); bounded-forever is a conscious choice for v1.

## Migration Plan

- **Deploy order:** backend first (new endpoints are additive; no schema migration), then frontend. Rolling back the frontend is safe at any time; rolling back the backend while the frontend is live only disables the Badges screen (list returns 404, existing badge display elsewhere is unaffected).
- **Rollout:** feature is gated by the `SUPERADMIN` role check, so it's effectively dark-launched for everyone except that small group. No feature flag needed.
- **Data:** no migration. Existing `Badge` rows are the initial state of the catalog.
- **Rollback:** revert the two commits. No forward-incompatible changes.

## Open Questions

- _Exact mime allow-list and size cap._ To be confirmed against the current `confirmBadgeUpload` code and against the badge assets in the repo. Starting assumption: `{image/png, image/svg+xml, image/jpeg, image/webp}` and 5 MB max.
- _Do we want a "preview before activate" step distinct from the warning dialog?_ The current design folds them together (the dialog shows the incoming badge next to the outgoing one). If UX feedback says this is confusing, we split them in a follow-up.
- _Are there any current `ADMIN` (non-SUPERADMIN) callers of `/files/badges/*`?_ Confirm via logs and codebase grep before rollout; document the finding in the release notes.

## 1. Backend: `listBadges` endpoint

- [x] 1.1 Create feature folder `apps/api/src/features/badges/listBadges/` with `route.ts`, `handler.ts`, `service.ts` following the existing feature-folder convention.
- [x] 1.2 Define the Zod response schema: an array of `{ type: BadgeType, active: BadgeDTO | null, history: BadgeDTO[] }`, where `BadgeDTO = { id, type, status, createdAt, fileName, mimeType, previewUrl }`.
- [x] 1.3 Implement `service.ts`: query all `Badge` rows with their related `File`, group by `type`, pick the `ACTIVE` one into `active`, sort the rest by `createdAt` desc into `history`. Fill in `null`/`[]` for types with no rows.
- [x] 1.4 Cap each type's `history` at the 20 most recent `INACTIVE` badges (`take: 20` at the Prisma layer or `.slice(0, 20)` after sort). No pagination cursor in v1.
- [x] 1.5 In the service, call `generateReadSasUrl` for every returned badge (active and inactive) to populate `previewUrl`.
- [x] 1.6 Register the route as `GET /badges` and gate it with `requireRoles([SystemRole.SUPERADMIN])`.
- [x] 1.7 Add an integration test `listBadges/integration.test.ts` covering: catalog with mixed active/inactive per type, types with no badges (present in response as empty groups), history cap (seed 25 inactive, assert 20 returned), 403 for non-SUPERADMIN, preview URLs present and signed.
- [ ] 1.8 Run `pnpm test --filter=api -- /listBadges/integration.test.ts --coverage=false` and ensure it passes.

## 2. Backend: badge state endpoints (activate + deactivate)

### 2a. `activateBadge`

- [x] 2a.1 Create feature folder `apps/api/src/features/badges/activateBadge/` with `route.ts`, `handler.ts`, `service.ts`.
- [x] 2a.2 Define the Zod params schema (`{ id }`) and response schema (the updated group for that badge's type, matching the shape from `listBadges`).
- [x] 2a.3 Implement `service.ts` inside a single `prisma.$transaction`: load the target badge (404 if missing); short-circuit if already ACTIVE; otherwise set `status = INACTIVE` on the current ACTIVE row of the same type (if any), then set `status = ACTIVE` on the target.
- [x] 2a.4 After the transaction, re-read the group for the affected type (active + history with preview URLs) and return it.
- [x] 2a.5 Register the route as `POST /badges/:id/activate` and gate it with `requireRoles([SystemRole.SUPERADMIN])`.
- [x] 2a.6 Add an integration test `activateBadge/integration.test.ts` covering: activate when another is active (incumbent demoted atomically), activate when none is active, idempotent activate of an already-active badge, 404 for unknown id, 403 for non-SUPERADMIN, and verify the DB partial unique index remains satisfied after each case.
- [ ] 2a.7 Run `pnpm test --filter=api -- /activateBadge/integration.test.ts --coverage=false` and ensure it passes.

### 2b. `deactivateBadge`

- [x] 2b.1 Create feature folder `apps/api/src/features/badges/deactivateBadge/` with `route.ts`, `handler.ts`, `service.ts`.
- [x] 2b.2 Define the Zod params schema (`{ id }`) and response schema (the updated group for that badge's type).
- [x] 2b.3 Implement `service.ts` inside a single `prisma.$transaction`: load the target badge (404 if missing); short-circuit if already INACTIVE; otherwise set `status = INACTIVE` on the target. Do not activate any replacement — the type may end with zero actives.
- [x] 2b.4 After the transaction, re-read the group for the affected type and return it (with `active: null` when the just-deactivated badge was the only active one).
- [x] 2b.5 Register the route as `POST /badges/:id/deactivate` and gate it with `requireRoles([SystemRole.SUPERADMIN])`.
- [x] 2b.6 Add an integration test `deactivateBadge/integration.test.ts` covering: deactivate the active badge (type ends with zero actives), deactivate when already inactive (no-op), 404 for unknown id, 403 for non-SUPERADMIN.
- [ ] 2b.7 Run `pnpm test --filter=api -- /deactivateBadge/integration.test.ts --coverage=false` and ensure it passes.

## 3. Backend: tighten auth, add file validation, wiring

- [x] 3.1 Tighten auth for `request-upload` and `confirm-upload` to `requireRoles([SystemRole.SUPERADMIN])` in `apps/api/src/features/files/badges/index.ts`.
  - The current shared `preHandler` there applies to `badgeRequestUploadRoute`, `badgeConfirmUploadRoute`, **and** `badgeGetFilesRoute`. Simply tightening the shared hook will also lock down `getBadgeFiles`.
  - Split the registration so `request-upload` and `confirm-upload` get a per-route `preHandler` enforcing `requireRoles([SystemRole.SUPERADMIN])`, while `badgeGetFilesRoute` keeps a separate `preHandler` that still allows `[SUPERADMIN, ADMIN]` (its existing policy).
  - Update the existing integration tests per endpoint: `request-upload` and `confirm-upload` — `ADMIN` expects 403, `SUPERADMIN` expects 2xx; `getBadgeFiles` — behaviour unchanged for both roles.
- [x] 3.2 In `confirmBadgeUpload/service.ts`, add server-side validation: reject with 400 when **either** the uploaded file's `mimeType` is not in a static allow-list (start with `image/png`, `image/svg+xml`, `image/jpeg`, `image/webp` — confirm exact list against current code and fixtures) **or** its size exceeds `BADGE_UPLOAD_MAX_BYTES` (default 5 MB, sourced from env). No `File` or `Badge` row is created on rejection.
- [x] 3.3 Add integration tests for the validation, one case per failure condition:
  - valid file accepted,
  - disallowed mime rejected with 400 and no `File`/`Badge` rows created,
  - oversize file rejected with 400 and no `File`/`Badge` rows created,
  - an existing `ACTIVE` badge of the same type remains unchanged after each rejection.
- [x] 3.4 **Decouple upload from activation** in `apps/api/src/features/files/badges/confirmBadgeUpload/service.ts`:
  - Remove the logic that demotes the prior `ACTIVE` badge and the logic that inserts the new badge as `ACTIVE`. The new behaviour: insert the new `Badge` row with `status = INACTIVE` and leave any existing `ACTIVE` badge of the same type untouched.
  - Change the response body of `confirm-upload` to `{ badge: BadgeDTO }` where `BadgeDTO` matches the shape returned by `listBadges` (id, type, status, createdAt, fileName, mimeType, previewUrl with a short-lived read SAS).
  - Update the Zod response schema and OpenAPI types accordingly.
  - Update the existing integration tests for `confirmBadgeUpload` to match the new contract: after confirm, assert (a) a new `Badge` with `status = INACTIVE` exists, (b) any previously `ACTIVE` badge is unchanged, (c) the response body contains the created `BadgeDTO`. Remove any test that asserted the swap.
- [x] 3.5 Register the three new routes (`listBadges`, `activateBadge`, `deactivateBadge`) in the main Fastify route tree.
- [x] 3.6 Lock in "approval proceeds without a badge" behaviour:
  - Audit `apps/api/src/features/requests/admin/approveRequest/service.ts:39-55` and `apps/api/src/features/carbonInventories/selfDeclareCarbonInventory/service.ts:141-158` to confirm they already pass `activeBadge?.id` into the nullable `Submission.badgeId`. No code change expected.
  - Add (or extend) integration tests for **both** approval paths that seed zero `ACTIVE` badges for the submission's type and assert: the approval succeeds, the submission's `status` is `APPROVED` / `APPROVED_AUTOMATICALLY`, and `badgeId` is `null`. These serve as regression tests against a future refactor that forgets the `?.id`.
  - Add an integration test asserting a later `POST /badges/:id/activate` does **not** backfill the prior null-badge submission (its `badgeId` stays `null`).
- [x] 3.7 Run `pnpm type-check` and `pnpm lint` for the api package and fix any issues.

## 4. Frontend: route, data hooks, and shared types

- [ ] 4.1 Add a new route file under `apps/web/src/routes/admin/badges.tsx` using TanStack Router, guarded with `requireRole([SystemRole.SUPERADMIN])`.
- [ ] 4.2 Add React Query hooks under `apps/web/src/api/query/badges/`: `useBadgeCatalog` (GET /badges), `useActivateBadge` (POST /badges/:id/activate), `useDeactivateBadge` (POST /badges/:id/deactivate), and surface the existing `useRequestBadgeUpload` / `useConfirmBadgeUpload` hooks or create them if missing.
- [ ] 4.3 Define shared TS types for `BadgeDTO` and `BadgeCatalogEntry` colocated with the hooks; infer from the Zod schemas if a shared contract package is used.
- [ ] 4.4 Ensure queries invalidate on success so the catalog refetches after every upload, activation, or deactivation.

## 5. Frontend: Badge Maintainer screen

- [ ] 5.1 Create `apps/web/src/screens/Maintainer/screens/Badges/BadgesScreen.tsx` rendering one card per `BadgeType` with an "Active" section (preview + fileName + createdAt + "Upload new" and "Deactivate" buttons) and a "History" section (list of inactive badges with "Activate" buttons).
- [ ] 5.2 Implement an empty-state for types with no ACTIVE badge: placeholder image, a note that there is no active badge, and the "Upload new" button. The "Deactivate" button is not rendered in this state.
- [ ] 5.3 Implement the upload flow (non-destructive): open a file picker scoped to the badge's type, call `useRequestBadgeUpload` to get a write SAS, PUT the file to blob, then call `useConfirmBadgeUpload`. No confirmation dialog — upload never touches the active badge. On success, the new `INACTIVE` badge appears at the top of that type's `history`. Use the `BadgeDTO` returned in the `confirm-upload` response to update the React Query cache optimistically (or invalidate and refetch). Show inline error states on failure — including specific copy for 400 responses (unsupported type, oversize).
- [ ] 5.4 After a successful upload, surface an inline prompt on the new history entry — e.g. "Uploaded. Activate this badge?" with an "Activate" link — so the operator can take the second step without hunting for the button.
- [ ] 5.5 Implement a `BadgeStateChangeDialog` MUI dialog covering the two confirmation flows with distinct copy: (a) **replace-via-activate** — shows outgoing + incoming badges side by side; (b) **deactivate** — shows outgoing badge and explicit note "This type will have no active badge until you activate another". The dialog is the only path that sends `activate` or `deactivate` when an incumbent exists.
- [ ] 5.6 Wire the "Activate" button on inactive badges to `useActivateBadge`. If the type has an incumbent (`active !== null`), open the dialog first; if not, activate directly with no dialog.
- [ ] 5.7 Wire the "Deactivate" button on the active card to `useDeactivateBadge`, always showing the dialog (deactivate always has an incumbent by definition).
- [ ] 5.8 Render a broken-image fallback and a "retry" affordance when a preview URL fails to load (covers the manually-deleted-blob edge case from the design).

## 6. Frontend: navigation and role gating

- [ ] 6.1 Add a "Badges" item to `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` pointing at `/admin/badges`, with `requiredRoles: [SystemRole.SUPERADMIN]`.
- [ ] 6.2 Verify that users with only `ADMIN` do not see the sidebar entry and cannot reach the route (route guard redirects them).

## 7. Frontend: verification

- [ ] 7.1 Run `pnpm type-check` and `pnpm lint` for the web package and fix any issues.
- [ ] 7.2 Start the dev server, sign in as a `SUPERADMIN` user, and exercise: upload new badge (no incumbent — new badge appears in history as INACTIVE, no dialog), upload new badge (with incumbent — new badge appears in history as INACTIVE, active badge untouched, no dialog), activate inactive badge (no incumbent — no dialog, activates directly), activate inactive badge (with incumbent — confirm dialog appears, cancel and confirm paths), deactivate the active badge (confirm dialog appears, type shows empty-state after success, the badge now appears in history), refresh page and confirm state matches backend.
- [ ] 7.3 Sign in as an `ADMIN` (non-SUPERADMIN) user and confirm the sidebar entry is hidden, `/admin/badges` is not accessible, and direct calls to `POST /files/badges/:badgeType/request-upload` receive 403.
- [ ] 7.4 Exercise file validation: attempt to upload a non-image file and an oversize file; confirm each is rejected with a clear error and no badge row is created.

## 8. Docs and rollout

- [ ] 8.1 Update any internal runbook / README for admin tooling to note that badge changes should now go through the Badge Maintainer screen instead of direct DB edits.
- [ ] 8.2 Release notes: call out the breaking auth change on `POST /files/badges/:badgeType/*` (from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]`). Before rollout, grep the codebase and check production logs for any `ADMIN` caller of these endpoints and notify affected users.
- [ ] 8.3 Deploy backend first, then frontend, per the migration plan in `design.md`.

## Why

Admins currently have no way to view the user base or manage who else has administrative privileges. There is also no UI flow today to promote a regular user to ADMIN or SUPERADMIN — these role assignments can only be made by direct database edits. A maintainer-side screen is needed so SUPERADMINs can manage admin membership safely (with last-superadmin protection and self-edit guards), and so ADMINs can audit the user base read-only.

## What Changes

- Add a new admin screen at `/admin/users` listing all users, split visually by a tab group: **Usuarios** (`role = USER`) and **Administradores** (`role ∈ {ADMIN, SUPERADMIN}`).
- Add a KPI section with two cards mirroring the tabs (total Usuarios, total Administradores with SUPERADMIN breakdown in subtitle).
- Add a "Promover a admin" header action (screen-level, rendered above the tab group and visible on both tabs) and per-row actions ("Cambiar rol", "Revocar admin") on the Administradores tab. All write actions are visible to **SUPERADMIN only**; ADMINs see the screen read-only.
- Add a sidebar entry for the new screen in the maintainer layout, visible to ADMIN+SUPERADMIN.
- **BREAKING (internal contract)**: replace the legacy `PATCH /users/:id` (with a single `UpdateUserBodySchema`) with two split routes, each with its own schema, auth model, and service:
  - `PATCH /users/me` — handled by `updateMyProfile/{route,handler,service}.ts`. Body is `UpdateMyProfileBodySchema` (subset of profile fields: `email`, `countryJobPositionId`, `firstName`, `lastName`, `idpUserId`, `idpName`, `termsAccepted`; `role` is not part of the schema). Route auth is `requireAuth` only — any authenticated user can update their own profile. This also fixes the latent bug where USERs could not complete their own profile via `UserFormScreen`.
  - `PATCH /users/:id/role` — handled by `updateUserRole/{route,handler,service}.ts`. Body is `UpdateUserRoleBodySchema` (exactly `{ role: SystemRole }`). Route auth is `preHandler: requireRoles([SUPERADMIN])` so only SUPERADMINs can reach the handler; INV-1 (self) and INV-2 (last SUPERADMIN) are still enforced inside the service transaction.
  - Splitting the routes removes the need for in-service body-shape branching (no `"role" in body` dispatch); each service does one thing. The two schemas live in `packages/types/src/users/updateMyProfile/` and `packages/types/src/users/updateUserRole/` respectively.
- Enforce three invariants in the service:
  - **INV-1**: a user cannot change their own role.
  - **INV-2**: the last SUPERADMIN cannot be demoted (TX-scoped count).
  - **INV-3**: country-agnostic — labels and error copy live in constants/vocab files, not inline strings.
- Add error classes `SelfRoleChangeError` (403), `LastSuperadminError` (409), `InsufficientPermissionsError` (403), `InvalidRoleTransitionError` (409). Wire these into the `PATCH /users/:id/role` route contract in `apps/api/src/features/users/updateUserRole/route.ts` so the `response` map covers `200`/`400`/`403`/`404`/`409`/`422` and the typed schema, Swagger docs, and runtime serialization match the new error shapes. Wire the same error codes into `getApiErrorMessage` in `apps/web/src/utils/getApiErrorMessage.ts` with Spanish copy so client-side runtime responses translate consistently.
- Add a role-transition audit log: a new `UserRoleAudit` Prisma model that records `(userId, previousRole, newRole, changedById, createdAt)` for every successful non-noop role change, written atomically inside the same transaction as the role update. Expose a read endpoint `GET /users/:id/role-history` (gated to ADMIN+SUPERADMIN) and a "Ver historial" row action on the admin screen that opens a timeline dialog. No reason field and no backfill of existing admins in v1. FK `onDelete: Restrict` on both relations; audit response embeds the actor's display fields (firstName, lastName, email) so the client does not need to resolve actor identities.
- Extend `GET /users` (`getAllUsers`) to include the user's `countryJobPosition` so the admin screen can display the job-position name. The response schema gains a `jobPositionName: string | null` field: the backend SHALL return the related `CountryJobPosition.name` when the user has a `countryJobPosition` relation, and SHALL return `null` whenever `countryJobPositionId` is `null` or the relation is otherwise absent. The change is additive and non-breaking — existing consumers that don't read `jobPositionName` are unaffected.
- Run the role-update `prisma.$transaction` at `Serializable` isolation with a bounded retry on PostgreSQL serialization failures (`SQLSTATE 40001` / Prisma `P2034`) to make INV-2 race-safe under concurrent demotions. The retry strategy is bounded and deliberately simple: **maximum 2 attempts** (the original call plus a single retry), **no backoff delay** between attempts, and **no separate timeout/abort threshold** beyond the per-attempt transaction timeout — a second `40001` surfaces to the caller as a transient error rather than triggering further retries. This is intentional given that role changes are operator-driven and low-throughput (see `design.md` Decision 3 for the rationale on why exponential backoff and higher attempt counts were rejected). Concrete implementation details (e.g., the `withSerializableRetry` helper) live in `tasks.md` (task 3.11).
- A no-op role update (target.role === body.role) on `PATCH /users/:id/role` returns 200 without performing any write — neither an audit row, nor an `updatedAt`/`updatedById` bump.

## Capabilities

### New Capabilities

- `admin-users-screen`: maintainer-facing UI for viewing all users and managing admin role assignments, including KPIs, tab-based separation, promote/demote/revoke flows, and viewer-role-aware action visibility.
- `user-role-management`: backend authorization, validation, and transition rules for changing a user's `SystemRole` via `PATCH /users/:id/role` (SUPERADMIN-only), including INV-1, INV-2, the actor/target matrix, and the role-transition audit log (write side + read endpoint). Self-profile updates are handled separately via `PATCH /users/me` (any authenticated user) and do not touch `role`.

### Modified Capabilities

<!-- None — no existing spec covers user updates or admin maintainer screens today. -->

## Impact

- **Frontend** (`apps/web`):
  - New screen tree under `screens/Maintainer/screens/Users/` (screen, tab toolbar, table, columns hook, dialogs, constants).
  - New route `routes/admin/users.tsx`; new constant `Routes.ADMIN_USERS`.
  - New sidebar entry in `MaintainerLayout.tsx`.
  - New query hooks under `api/query/users/` (`useUsers`, `useUserRoleHistory`, `useUpdateUserRole` for `PATCH /users/:id/role`, and `useUpdateMyProfile` for `PATCH /users/me`).
  - New "Ver historial" dialog component to render the role-history timeline.
  - Update `getApiErrorMessage` with the new error codes' Spanish copy.
- **Types package** (`packages/types/src/users/`): two split endpoint folders — `updateMyProfile/` (with `UpdateMyProfileBodySchema` exposing the profile fields) and `updateUserRole/` (with `UpdateUserRoleBodySchema` containing exactly `{ role: SystemRole }`); each with its own `schemas.ts` and `types.ts`. New `users/getUserRoleHistory/{schemas,types}.ts` for the audit read endpoint, plus a `UserRoleAuditBaseSchema` in `baseSchemas/`.
- **API** (`apps/api`):
  - New feature directory `users/updateMyProfile/` with `route.ts` / `handler.ts` / `service.ts` for `PATCH /users/me`. Route auth is `requireAuth` only (inherited from the `usersRoutes` `onRequest` hook); service handles the profile-only fields.
  - New feature directory `users/updateUserRole/` with `route.ts` / `handler.ts` / `service.ts` for `PATCH /users/:id/role`. Route auth is `preHandler: [fastify.requireRoles([SystemRole.SUPERADMIN])]`; service enforces INV-1 and INV-2 inside a `Serializable` `prisma.$transaction` with retry on `40001`, writes a `UserRoleAudit` row when the role actually changes, and skips the update entirely on no-op transitions.
  - `users/getAllUsers/service.ts`: extend `findMany` with `include: { countryJobPosition: true }`; mapper outputs `jobPositionName`.
  - New feature directory `users/getUserRoleHistory/` with `route.ts` / `handler.ts` / `service.ts` for `GET /users/:id/role-history`.
  - `users/errors.ts` (or shared `errors/`): new error classes.
  - Integration tests under `test/features/users/updateMyProfile/`, `test/features/users/updateUserRole/`, and `test/features/users/getUserRoleHistory/`.
  - Verify (or amend) `user-resolve-plugin` so `request.currentUser.role` is populated.
- **Database** (`packages/database`): new Prisma model `UserRoleAudit` mapped to `user_role_audit`, plus a migration. No backfill — history starts empty for existing admins.
- **Out of scope**: `POST /users`, `DELETE /users/:id`, `getUserById`, `getMe`, profile editing on the admin screen, invite-by-email flow, hard delete, free-text reason on audit rows, retroactive synthesis of audit history for pre-existing admins.

## Why

Admins currently have no way to view the user base or manage who else has administrative privileges. There is also no UI flow today to promote a regular user to ADMIN or SUPERADMIN — these role assignments can only be made by direct database edits. A maintainer-side screen is needed so SUPERADMINs can manage admin membership safely (with last-superadmin protection and self-edit guards), and so ADMINs can audit the user base read-only.

## What Changes

- Add a new admin screen at `/admin/users` listing all users, split visually by a tab group: **Usuarios** (`role = USER`) and **Administradores** (`role ∈ {ADMIN, SUPERADMIN}`).
- Add a KPI section with two cards mirroring the tabs (total Usuarios, total Administradores with SUPERADMIN breakdown in subtitle).
- Add a "Promover a admin" header action (screen-level, rendered above the tab group and visible on both tabs) and per-row actions ("Cambiar rol", "Revocar admin") on the Administradores tab. All write actions are visible to **SUPERADMIN only**; ADMINs see the screen read-only.
- Add a sidebar entry for the new screen in the maintainer layout, visible to ADMIN+SUPERADMIN.
- **BREAKING (internal contract)**: extend `UpdateUserBodySchema` into a discriminated union of `SelfProfileUpdate` (existing fields, no `role`) and `AdminRoleUpdate` (`role` only). Existing callers using the old shape continue to work because their bodies match the `SelfProfileUpdate` branch.
- Relax the route guard on `PATCH /users/:id` from `requireRoles([ADMIN, SUPERADMIN])` to `requireAuth`. Field-level and row-level authorization moves into the service layer. This also fixes a latent bug where USERs could not complete their own profile via `UserFormScreen`.
- Enforce three invariants in the service:
  - **INV-1**: a user cannot change their own role.
  - **INV-2**: the last SUPERADMIN cannot be demoted (TX-scoped count).
  - **INV-3**: country-agnostic — labels and error copy live in constants/vocab files, not inline strings.
- Add error classes `SelfRoleChangeError` (403), `LastSuperadminError` (409), `InsufficientPermissionsError` (403), `InvalidRoleTransitionError` (409); wire them into `getApiErrorMessage` on the web side.
- Add a role-transition audit log: a new `UserRoleAudit` Prisma model that records `(userId, previousRole, newRole, changedById, createdAt)` for every successful non-noop role change, written atomically inside the same transaction as the role update. Expose a read endpoint `GET /users/:id/role-history` (gated to ADMIN+SUPERADMIN) and a "Ver historial" row action on the admin screen that opens a timeline dialog. No reason field and no backfill of existing admins in v1. FK `onDelete: Restrict` on both relations; audit response embeds the actor's display fields (firstName, lastName, email) so the client does not need to resolve actor identities.
- Extend `GET /users` (`getAllUsers`) to include the user's `countryJobPosition` so the admin screen can display the job-position name. Response gains a `jobPositionName: string | null` field. Backend-additive, not breaking for existing consumers.
- Run the role-update `prisma.$transaction` at `Serializable` isolation with a retry on PostgreSQL serialization failures (`40001`) to make INV-2 race-safe under concurrent demotions.
- A no-op `AdminRoleUpdate` (target.role === body.role) returns 200 without performing any write — neither an audit row, nor an `updatedAt`/`updatedById` bump.

## Capabilities

### New Capabilities

- `admin-users-screen`: maintainer-facing UI for viewing all users and managing admin role assignments, including KPIs, tab-based separation, promote/demote/revoke flows, and viewer-role-aware action visibility.
- `user-role-management`: backend authorization, validation, and transition rules for changing a user's `SystemRole` via `PATCH /users/:id`, including the discriminated update body, INV-1, INV-2, the actor/target matrix, and the role-transition audit log (write side + read endpoint).

### Modified Capabilities

<!-- None — no existing spec covers user updates or admin maintainer screens today. -->

## Impact

- **Frontend** (`apps/web`):
  - New screen tree under `screens/Maintainer/screens/Users/` (screen, tab toolbar, table, columns hook, dialogs, constants).
  - New route `routes/admin/users.tsx`; new constant `Routes.ADMIN_USERS`.
  - New sidebar entry in `MaintainerLayout.tsx`.
  - New query hooks under `api/query/users/` (`useUsers`, `useUserRoleHistory`, and reuse of `useUpdateUser` with the new body shape — or an ergonomic `useUpdateUserRole` wrapper).
  - New "Ver historial" dialog component to render the role-history timeline.
  - Update `getApiErrorMessage` with the new error codes' Spanish copy.
- **Types package** (`packages/types/src/users/updateUser/schemas.ts`): discriminated `UpdateUserBodySchema`; type exports updated. New `users/getUserRoleHistory/{schemas,types}.ts` for the audit read endpoint, plus a `UserRoleAuditBaseSchema` in `baseSchemas/`.
- **API** (`apps/api`):
  - `users/updateUser/route.ts`: relax preHandler to `requireAuth`.
  - `users/updateUser/service.ts`: branch by body shape; enforce actor/target matrix and invariants inside a `Serializable` `prisma.$transaction` with retry on `40001`; write a `UserRoleAudit` row when the role actually changes; skip the update entirely on no-op transitions.
  - `users/getAllUsers/service.ts`: extend `findMany` with `include: { countryJobPosition: true }`; mapper outputs `jobPositionName`.
  - New feature directory `users/getUserRoleHistory/` with `route.ts` / `handler.ts` / `service.ts` for `GET /users/:id/role-history`.
  - `users/errors.ts` (or shared `errors/`): new error classes.
  - Integration tests under `test/features/users/updateUser/` and `test/features/users/getUserRoleHistory/`.
  - Verify (or amend) `user-resolve-plugin` so `request.currentUser.role` is populated.
- **Database** (`packages/database`): new Prisma model `UserRoleAudit` mapped to `user_role_audit`, plus a migration. No backfill — history starts empty for existing admins.
- **Out of scope**: `POST /users`, `DELETE /users/:id`, `getUserById`, `getMe`, profile editing on the admin screen, invite-by-email flow, hard delete, free-text reason on audit rows, retroactive synthesis of audit history for pre-existing admins.

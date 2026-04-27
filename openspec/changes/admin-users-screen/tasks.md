## 0. Database — audit log model

- [ ] 0.1 Add `UserRoleAudit` model to `packages/database/src/prisma/schema.prisma` with fields `id`, `userId`, `previousRole`, `newRole`, `changedById`, `createdAt`, mapped to `user_role_audit` with index `@@index([userId, createdAt])`
- [ ] 0.2 Add the two `User` relations (`user_role_audit_target`, `user_role_audit_actor`) on the `User` model with `onDelete: Restrict` on both
- [ ] 0.3 Generate the migration via `pnpm prisma migrate dev --name add_user_role_audit` (or the project's equivalent command); verify no data backfill statements are emitted
- [ ] 0.4 Run `pnpm prisma generate` to refresh the generated client; confirm `Prisma.UserRoleAuditCreateInput` and friends are available

## 1. Types package — discriminated update body

- [ ] 1.1 Refactor `packages/types/src/users/updateUser/schemas.ts` to define `SelfProfileUpdateSchema` (existing partial profile fields, no `role`, with the at-least-one-field refinement) and `AdminRoleUpdateSchema` (`{ role: SystemRoleSchema }`, strict)
- [ ] 1.2 Replace `UpdateUserBodySchema` with `z.union([SelfProfileUpdateSchema, AdminRoleUpdateSchema])`
- [ ] 1.3 Update `packages/types/src/users/updateUser/types.ts` so `UpdateUserBody` is `z.infer<typeof UpdateUserBodySchema>`; export `SelfProfileUpdate` and `AdminRoleUpdate` inferred types alongside
- [ ] 1.4 Verify exports from `packages/types/src/users/index.ts` still expose all needed names; update if necessary
- [ ] 1.5 Run `pnpm type-check` and confirm `apps/web/src/screens/User/UserFormScreen.tsx` and `apps/web/src/api/query/users/useUpdateUser.ts` still type-check (no changes needed if `SelfProfileUpdate` matches the call site)
- [ ] 1.6 Add `UserRoleAuditBaseSchema` in `packages/types/src/baseSchemas/userRoleAudit.ts` covering `id`, `userId`, `previousRole`, `newRole`, `changedById`, `createdAt`, plus a `changedBy` sub-object with the actor's display fields (firstName, lastName, email)
- [ ] 1.7 Add `packages/types/src/users/getUserRoleHistory/{schemas,types}.ts`: params (`{ id }`), response (`z.array(UserRoleAuditBaseSchema)`); export inferred types and re-export from the users index
- [ ] 1.8 Extend the `getAllUsers` response schema only (in `packages/types/src/users/getAllUsers/schemas.ts`) so each item is `UserBaseSchema.extend({ jobPositionName: z.string().nullable() })`. Do NOT modify `UserBaseSchema` itself — base schemas mirror database columns and remain untouched; derived fields like `jobPositionName` live on response schemas only.

## 2. API — error classes

- [ ] 2.1 Add `SelfRoleChangeError` (403), `LastSuperadminError` (409), `InsufficientPermissionsError` (403), `InvalidRoleTransitionError` (409) to `apps/api/src/features/users/errors.ts` (or shared `apps/api/src/errors/` if a similar pattern exists)
- [ ] 2.2 Wire each new error into the global Fastify error handler so it maps to its status and matches `ApiErrorResponseSchema`

## 2b. API — verify `request.currentUser.role`

- [ ] 2b.1 Read `apps/api/src/plugins/app/userResolvePlugin.ts` (or equivalent) and confirm it hydrates `request.currentUser` with both `id` and `role`
- [ ] 2b.2 If `role` is missing, amend the plugin's `findUnique`/`findFirst` to include the column; add a unit test asserting `currentUser.role` is populated for an authenticated request

## 3. API — service authorization

- [ ] 3.1 Relax the route guard on `apps/api/src/features/users/updateUser/route.ts` from `requireRoles([ADMIN, SUPERADMIN])` to `fastify.requireAuth`
- [ ] 3.2 Refactor `updateUserService` in `apps/api/src/features/users/updateUser/service.ts` to accept the discriminated body and branch on its shape
- [ ] 3.3 Implement the self-profile branch: `actor.id === target.id` required; otherwise throw `InsufficientPermissionsError`
- [ ] 3.4 Implement the admin-role branch: `actor.role === SUPERADMIN`; otherwise throw `InsufficientPermissionsError`
- [ ] 3.5 Enforce INV-1: if `target.id === actor.id`, throw `SelfRoleChangeError`
- [ ] 3.6 Enforce role transition validation per the matrix in `specs/user-role-management/spec.md`; otherwise throw `InvalidRoleTransitionError`
- [ ] 3.7 Enforce INV-2 inside the same `prisma.$transaction` interactive transaction (read target, count SUPERADMINs only when demoting one, then update)
- [ ] 3.8 Ensure `updatedById` is set to the actor's id on every successful non-noop update
- [ ] 3.9 Move the existing `email` / `idpUserId` unique-constraint and `countryJobPositionId` FK error handling into the self-profile branch unchanged
- [ ] 3.10 Inside the same transaction, when `previousRole !== newRole`, insert a `UserRoleAudit` row with `(userId, previousRole, newRole, changedById, createdAt)`. Skip the insert for no-op transitions.
- [ ] 3.11 Run the role-update transaction at `Prisma.TransactionIsolationLevel.Serializable` and add a single retry on `P2034` / SQLSTATE `40001` at the call site (e.g., a small `withSerializableRetry(tx)` helper)
- [ ] 3.12 No-op role change: when `target.role === body.role`, short-circuit the service to return the existing user record without performing any write (no audit row, no `updatedAt` bump)

## 3a. API — getAllUsers extension

- [ ] 3a.1 Update `apps/api/src/features/users/getAllUsers/service.ts` to `findMany({ include: { countryJobPosition: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } })`
- [ ] 3a.2 Update `apps/api/src/features/users/mappers.ts` (or the local mapper) to flatten the relation into `jobPositionName: countryJobPosition?.name ?? null`
- [ ] 3a.3 Update the `getAllUsers` response schema in `packages/types/src/users/getAllUsers/schemas.ts` to include the new `jobPositionName` field

## 3b. API — getUserRoleHistory feature

- [ ] 3b.1 Create `apps/api/src/features/users/getUserRoleHistory/route.ts` with `GET /users/:id/role-history`, gated `requireRoles([ADMIN, SUPERADMIN])`, schema sourced from `packages/types`
- [ ] 3b.2 Create `apps/api/src/features/users/getUserRoleHistory/handler.ts` and `service.ts`; service queries `UserRoleAudit` for the given user id, ordered `createdAt DESC`, with `changedBy` user join (select only display fields)
- [ ] 3b.3 Service throws `UserNotFoundError` if the target user does not exist
- [ ] 3b.4 Register the new route in the users feature index alongside the existing user routes

## 4. API — integration tests

- [ ] 4.1 Add test file `apps/api/test/features/users/updateUser/integration.test.ts` (extend if it already exists)
- [ ] 4.2 Test self-profile branch: USER edits own profile → 200
- [ ] 4.3 Test self-profile branch: ADMIN edits another user's profile → 403 `InsufficientPermissionsError`
- [ ] 4.4 Test self-profile branch: SUPERADMIN edits another user's profile → 403 `InsufficientPermissionsError`
- [ ] 4.5 Test admin-role branch: USER tries role change → 403 `InsufficientPermissionsError`
- [ ] 4.6 Test admin-role branch: ADMIN tries role change → 403 `InsufficientPermissionsError`
- [ ] 4.7 Test admin-role branch: SUPERADMIN changes own role → 403 `SelfRoleChangeError`
- [ ] 4.8 Test admin-role branch: SUPERADMIN promotes USER → ADMIN → 200
- [ ] 4.9 Test admin-role branch: SUPERADMIN promotes USER → SUPERADMIN → 200
- [ ] 4.10 Test admin-role branch: SUPERADMIN demotes ADMIN → USER → 200
- [ ] 4.11 Test admin-role branch: SUPERADMIN demotes another SUPERADMIN when 2+ exist → 200
- [ ] 4.12 Test admin-role branch: SUPERADMIN attempts to demote the last SUPERADMIN → 409 `LastSuperadminError`
- [ ] 4.13 Test schema rejection: body mixing profile fields and `role` → 400
- [ ] 4.14 Test schema rejection: body with unknown fields → 400
- [ ] 4.15 Test no-op transition (target.role === body.role) returns 200 and performs no write (assert `updatedAt`/`updatedById` are unchanged and no `UserRoleAudit` row is inserted)
- [ ] 4.16 Verify `updatedById` is populated correctly in a successful update
- [ ] 4.17 Test audit row written: a successful role change creates exactly one `UserRoleAudit` row with the correct `(previousRole, newRole, userId, changedById)`
- [ ] 4.18 Test no audit row on no-op: a same-role update creates no `UserRoleAudit` row
- [ ] 4.19 Test audit/update atomicity: simulate audit insert failure (e.g., FK violation by stubbing) and assert the role update did not persist
- [ ] 4.20 Test serializable race: drive two concurrent demotions of two distinct SUPERADMINs (out of two total) via `Promise.all` and assert exactly one succeeds, the other returns `LastSuperadminError` (409), and the SUPERADMIN count never falls below one
- [ ] 4.21 Test `getAllUsers` returns `jobPositionName` populated for users with a job position and `null` otherwise

## 4b. API — getUserRoleHistory tests

- [ ] 4b.1 Add `apps/api/test/features/users/getUserRoleHistory/integration.test.ts`
- [ ] 4b.2 Test ADMIN can read history (200, ordered DESC, includes actor display fields)
- [ ] 4b.3 Test SUPERADMIN can read history (200)
- [ ] 4b.4 Test USER receives 403
- [ ] 4b.5 Test unauthenticated request receives 401
- [ ] 4b.6 Test 404 when target user id does not exist
- [ ] 4b.7 Test empty array when target user has no recorded transitions

## 5. Web — query hooks and routing constants

- [ ] 5.1 Add `ADMIN_USERS: "/admin/users"` to `apps/web/src/interfaces/routes/routes.const.ts`
- [ ] 5.2 Add a query hook `apps/web/src/api/query/users/useUsers.ts` that calls `GET /users` and returns `GetAllUsersResponse`
- [ ] 5.3 Add a query keys file `apps/web/src/api/query/users/keys.ts` if missing (or extend existing) with `userKeys.all` and any needed sub-keys
- [ ] 5.4 Confirm `useUpdateUser` works for both branches (self-profile and admin-role); if a separate ergonomic hook is desired, add `useUpdateUserRole` that wraps it for the admin-role branch
- [ ] 5.5 Wire mutation `onSuccess` to invalidate `userKeys.all` so the screen and KPIs re-derive
- [ ] 5.6 Add `apps/web/src/api/query/users/useUserRoleHistory.ts` calling `GET /users/:id/role-history` with key `userKeys.roleHistory(userId)`; invalidate this key on every successful role mutation

## 6. Web — error message mapping

- [ ] 6.1 Update `apps/web/src/utils/getApiErrorMessage.ts` to map the new error codes to Spanish copy: `SelfRoleChangeError`, `LastSuperadminError`, `InsufficientPermissionsError`, `InvalidRoleTransitionError`

## 7. Web — screen scaffold and route

- [ ] 7.1 Create `apps/web/src/routes/admin/users.tsx` using TanStack Router file-based routing; gate via `requireRole([SystemRole.ADMIN, SystemRole.SUPERADMIN], { redirectTo: Routes.HOME })`
- [ ] 7.2 Create `apps/web/src/screens/Maintainer/screens/Users/UsersScreen.tsx` mirroring `AdminOrganizationsScreen` (header card + KPI section + tab group + table)
- [ ] 7.3 Create `apps/web/src/screens/Maintainer/screens/Users/constants.ts` for all reusable Spanish strings (sidebar label, tab labels, KPI titles, button labels, dialog copy, tooltip copy)
- [ ] 7.4 Re-export `UsersScreen` from the appropriate `screens/index.ts` if the project follows that pattern

## 8. Web — sidebar entry

- [ ] 8.1 Add a `SidebarDef` entry in `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx` linking to `Routes.ADMIN_USERS`, label "Usuarios", suitable icon (e.g., `PeopleOutlined` from `@mui/icons-material`)
- [ ] 8.2 Confirm visibility for `[ADMIN, SUPERADMIN]` (no `requiredRoles` since both should see it)

## 9. Web — KPI section

- [ ] 9.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/UsersScreenKpiSection.tsx` rendering exactly two cards
- [ ] 9.2 Card "Usuarios": count of `users.filter(u => u.role === USER).length`
- [ ] 9.3 Card "Administradores": count of `users.filter(u => u.role !== USER).length` with subtitle showing the SUPERADMIN sub-count
- [ ] 9.4 Show skeleton state while the user list is loading

## 10. Web — tab group, table, columns

- [ ] 10.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/UsersScreenTabs.tsx` rendering two tabs ("Usuarios" / "Administradores"); persist active tab in URL via TanStack Router search params
- [ ] 10.2 Create `apps/web/src/screens/Maintainer/screens/Users/components/UsersScreenTable.tsx` wrapping `StylizedDataGrid` with the same visual conventions as `OrganizationScreenTable`
- [ ] 10.3 Create `apps/web/src/screens/Maintainer/screens/Users/hooks/useUsersColumns.tsx` with columns: name (firstName + lastName), email, jobPosition (sourced from `jobPositionName`), role (rendered via `UserRoleChip`), createdAt
- [ ] 10.4 Add a conditional actions column: "Ver historial" is rendered for both ADMIN and SUPERADMIN viewers on both tabs; "Cambiar rol" is rendered only when `activeTab === "Administradores"` AND viewer is SUPERADMIN
- [ ] 10.5 Implement client-side filtering by tab so the table receives only rows matching the active tab

## 10b. Web — `UserRoleChip` component

- [ ] 10b.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/UserRoleChip.tsx` mirroring the conventions of `OrganizationStatusChip` (chip + theme-sourced color + Spanish label)
- [ ] 10b.2 Map roles → labels in `screens/Users/constants.ts`: USER → "Usuario", ADMIN → "Administrador", SUPERADMIN → "Super Administrador"
- [ ] 10b.3 Map roles → palette colors; if a needed color is not in `apps/web/src/theme/palette.ts`, add it there (and to `undp-huella-latam.theme.d.ts`) — never inline hex
- [ ] 10b.4 Reuse `UserRoleChip` in the role-history dialog for previous-role and new-role rendering

## 11. Web — promote dialog

- [ ] 11.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/PromoteUserDialog.tsx`
- [ ] 11.2 Autocomplete restricted to users with `role === USER`
- [ ] 11.3 Role selector with options ADMIN / SUPERADMIN
- [ ] 11.4 Submit calls `useUpdateUser` (admin-role branch) and shows a Spanish success snackbar via notistack on resolve
- [ ] 11.5 Render the "Promover a admin" header button only when viewer is SUPERADMIN

## 12. Web — unified "Cambiar rol" dialog

- [ ] 12.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/ChangeRoleDialog.tsx`
- [ ] 12.2 Pre-select the row's current role; offer all three options (`USER`, `ADMIN`, `SUPERADMIN`)
- [ ] 12.3 INV-1 mirror: if the row is the current viewer, the dialog is not openable (action hidden upstream); defensive guard inside the dialog disables submit if `row.id === me.id`
- [ ] 12.4 INV-2 mirror: if the row is the last SUPERADMIN, disable the `USER` and `ADMIN` options with a Spanish tooltip explaining the restriction
- [ ] 12.5 When the user selects `USER`, render an inline Spanish confirmation message (e.g., "Esta acción revocará el rol de administrador.") above the submit button
- [ ] 12.6 Submit calls `useUpdateUser` (admin-role branch) with the selected role; show a Spanish success snackbar via notistack on resolve and translate API errors via `getApiErrorMessage` on reject

## 13b. Web — role history dialog

- [ ] 13b.1 Create `apps/web/src/screens/Maintainer/screens/Users/components/UserRoleHistoryDialog.tsx`
- [ ] 13b.2 Render a timeline list using `useUserRoleHistory(userId)`; each entry shows date (formatted with `date-fns` Spanish locale), actor display name, and a formatted transition (e.g., `ADMIN → SUPERADMIN`)
- [ ] 13b.3 Empty state in Spanish (e.g., "Sin cambios de rol registrados.")
- [ ] 13b.4 Wire the dialog to the "Ver historial" row action on both tabs

## 14. Web — viewer-role and self-row gating

- [ ] 14.1 Read `me` via `useMe` and pass `me.role` and `me.id` into the columns hook and dialogs
- [ ] 14.2 Hide role-mutating actions when viewer is ADMIN; "Ver historial" stays visible for ADMIN
- [ ] 14.3 Hide the "Cambiar rol" action when `row.id === me.id` (INV-1 mirror)
- [ ] 14.4 Compute `superAdminCount` client-side from the loaded list and gate INV-2 controls accordingly inside `ChangeRoleDialog`

## 15. Verification

- [ ] 15.1 Run `pnpm format && pnpm lint && pnpm type-check`
- [ ] 15.2 Run `pnpm test --filter=api -- /updateUser/integration.test.ts --coverage=false` and confirm green
- [ ] 15.3 Manual smoke test: log in as USER and complete profile via `UserFormScreen` (regression check for the latent self-edit bug)
- [ ] 15.4 Manual smoke test: log in as ADMIN, open `/admin/users`, verify read-only state (no header button, no row actions)
- [ ] 15.5 Manual smoke test: log in as SUPERADMIN, exercise promote and unified change-role flows (including demote-to-USER via the inline confirmation); verify INV-1 (own row) and INV-2 (last SUPERADMIN) UI gates
- [ ] 15.6 Verify the new screen contains no country-coded literals (INV-3): all strings sourced from `screens/Users/constants.ts` or `getApiErrorMessage`
- [ ] 15.7 Manual smoke test: after a role change, "Ver historial" on that user shows the new transition as the most recent entry; pre-existing admins (no transitions) show the empty state

## 16. Documentation

- [ ] 16.1 Update relevant docs in `docs/` (likely `docs/architecture/` or a new `docs/admin/users.md`) describing the screen, the auth matrix, and the invariants
- [ ] 16.2 Document the `UserRoleAudit` model and `GET /users/:id/role-history` endpoint in `docs/data-model/` and/or `docs/architecture/` (whichever location matches the existing style)

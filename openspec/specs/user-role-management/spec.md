# user-role-management Specification

## Purpose

Defines backend authorization, validation, and audit rules for changing a user's `SystemRole`. Role changes go through `PATCH /users/:id/role`, which is gated to SUPERADMIN at the route level, while self-profile updates use a separate `PATCH /users/me` endpoint that never touches `role`. Every real role change is recorded atomically in a `UserRoleAudit` row and exposed for reading through `GET /users/:id/role-history`.

## Requirements

### Requirement: Self-profile update endpoint `PATCH /users/me`

The system SHALL expose `PATCH /users/me` (feature `updateMyProfile`) that updates the profile of the currently authenticated user. The body SHALL be a partial subset of `email`, `countryJobPositionId`, `firstName`, `lastName`, `idpUserId`, `idpName`, `termsAccepted`, validated with a strict Zod schema (`UpdateMyProfileBodySchema`) that requires at least one field and rejects unknown fields — including `role` — with HTTP 400. The route SHALL require authentication only (`access: { mode: "private" }`) and SHALL always target the caller's own record: there is no path parameter and therefore no cross-user profile edit.

#### Scenario: Authenticated user updates own profile

- **WHEN** an authenticated user sends `PATCH /users/me` with one or more allowed profile fields
- **THEN** the response is 200 and the fields are updated on the caller's own record

#### Scenario: Empty body is rejected

- **WHEN** the body contains no fields
- **THEN** the system responds with HTTP 400

#### Scenario: Unknown or role field is rejected

- **WHEN** the body contains `role` or any key outside the allowed profile fields
- **THEN** the system responds with HTTP 400

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated request hits `PATCH /users/me`
- **THEN** the system responds with HTTP 401

### Requirement: Role update endpoint `PATCH /users/:id/role` (SUPERADMIN only)

The system SHALL expose `PATCH /users/:id/role` (feature `updateUserRole`) that changes the `role` of the user identified by `:id`. The body SHALL be exactly `{ role: SystemRole }` validated by a strict Zod schema (`UpdateUserRoleBodySchema`); unknown fields SHALL be rejected with HTTP 400. The route SHALL be gated at the route level to SUPERADMIN (`access: { mode: "private", systemRoles: { kind: "roles", roles: [SUPERADMIN] } }`). Unauthenticated callers SHALL receive 401, and authenticated non-SUPERADMIN callers (USER or ADMIN) SHALL receive 403 from the route guard before the handler runs.

#### Scenario: SUPERADMIN reaches the handler

- **WHEN** a SUPERADMIN submits `{ role }` to `PATCH /users/:id/role`
- **THEN** the request reaches the service, which evaluates the invariants below

#### Scenario: USER or ADMIN is blocked by the route guard

- **WHEN** an authenticated USER or ADMIN calls `PATCH /users/:id/role`
- **THEN** the system responds with HTTP 403 without invoking the service

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated request hits `PATCH /users/:id/role`
- **THEN** the system responds with HTTP 401

#### Scenario: Unknown field is rejected

- **WHEN** the body contains any key other than `role`
- **THEN** the system responds with HTTP 400

### Requirement: INV-1 — no self role change

The service SHALL reject any role change whose target `:id` equals the actor's id with `SelfRoleChangeError` (403), before opening the update transaction.

#### Scenario: SUPERADMIN attempts to change own role

- **WHEN** a SUPERADMIN submits `{ role }` (any value) to their own id
- **THEN** the service rejects with `SelfRoleChangeError` (403)

### Requirement: Role transition validation

The service SHALL validate the requested transition against an allow-map (`ALLOWED_ROLE_TRANSITIONS`). Currently every role (`USER`, `ADMIN`, `SUPERADMIN`) MAY transition to any of the three roles, subject to INV-1, INV-2, and no-op handling. A transition not present in the allow-map SHALL be rejected with `InvalidRoleTransitionError` (409).

#### Scenario: Promote USER to ADMIN

- **WHEN** a SUPERADMIN sets `role = "ADMIN"` on a target whose current role is `USER`
- **THEN** the transition is permitted and proceeds to the update

#### Scenario: Demote ADMIN to USER

- **WHEN** a SUPERADMIN sets `role = "USER"` on a target whose current role is `ADMIN`
- **THEN** the transition is permitted and proceeds to the update

#### Scenario: Transition absent from the allow-map

- **WHEN** the requested transition is not present in `ALLOWED_ROLE_TRANSITIONS`
- **THEN** the service rejects with `InvalidRoleTransitionError` (409)

### Requirement: No-op role change performs no write

When the target's current role equals the requested role, the service SHALL return the existing user record without performing any write — no `User` update, no `updatedAt`/`updatedById` change, and no `UserRoleAudit` row.

#### Scenario: Same-role request

- **WHEN** the requested role equals the target's current role
- **THEN** the response is 200 with the existing record and no database write is performed

### Requirement: INV-2 — last SUPERADMIN preservation

When a role change would demote a target whose current role is `SUPERADMIN` to a non-SUPERADMIN role, the service SHALL count SUPERADMIN users inside the same `prisma.$transaction` as the update and SHALL reject with `LastSuperadminError` (409) when the count is less than or equal to one.

#### Scenario: Demoting the last SUPERADMIN

- **WHEN** exactly one SUPERADMIN exists and a request would demote that user
- **THEN** the service rejects with `LastSuperadminError` (409)

#### Scenario: Demoting one of several SUPERADMINs

- **WHEN** two or more SUPERADMINs exist and a request demotes one of them
- **THEN** the service applies the update successfully

### Requirement: Role change and audit row are written atomically

On a real role change (`previousRole !== newRole`), the service SHALL, inside a single `prisma.$transaction`, update the target's `role` and set `updatedById` to the actor, and insert a `UserRoleAudit` row recording `{ userId: target.id, previousRole, newRole, changedById: actor.id }` (with `createdAt` set by the database default). If the audit insert fails, the entire transaction SHALL roll back so the role update does not persist.

#### Scenario: Successful role change writes audit row

- **WHEN** a SUPERADMIN promotes a USER to ADMIN
- **THEN** the target's role is `ADMIN`, `updatedById` equals the actor's id, and a `UserRoleAudit` row exists with `previousRole = USER`, `newRole = ADMIN`, `changedById = actor.id`, and `userId = target.id`

#### Scenario: Audit insert rollback

- **WHEN** the audit insert fails for any reason inside the transaction
- **THEN** the role update is rolled back and the target's role remains unchanged

### Requirement: Error response shape and codes

Errors raised by `PATCH /users/:id/role` SHALL conform to `ApiErrorResponseSchema` and SHALL use the following codes. Authorization for the endpoint is enforced by the route-level SUPERADMIN guard, so a non-SUPERADMIN actor receives the guard's 403 rather than a service-thrown error.

| Error class                  | code                      | HTTP status | Used when                        |
| ---------------------------- | ------------------------- | ----------- | -------------------------------- |
| `SelfRoleChangeError`        | `SELF_ROLE_CHANGE`        | 403         | INV-1 violation                  |
| `LastSuperadminError`        | `LAST_SUPERADMIN`         | 409         | INV-2 violation                  |
| `InvalidRoleTransitionError` | `INVALID_ROLE_TRANSITION` | 409         | requested transition not allowed |
| `UserNotFoundError`          | `USER_NOT_FOUND`          | 404         | target id does not exist         |

#### Scenario: Self role change attempt

- **WHEN** the service rejects an update due to INV-1
- **THEN** the response status is 403 with code `SELF_ROLE_CHANGE`

#### Scenario: Last SUPERADMIN demotion

- **WHEN** the service rejects an update due to INV-2
- **THEN** the response status is 409 with code `LAST_SUPERADMIN`

#### Scenario: Missing target user

- **WHEN** the target id does not exist
- **THEN** the response status is 404 with code `USER_NOT_FOUND`

### Requirement: Country-agnostic role management

The role management implementation SHALL NOT contain country-specific branches, identifiers, or constants. Roles are global enums defined in the database schema and apply uniformly across deployments.

#### Scenario: Country deployment

- **WHEN** the platform is deployed for any country
- **THEN** the role management endpoints behave identically without code changes

### Requirement: `GET /users/:id/role-history` endpoint

The system SHALL expose `GET /users/:id/role-history` (feature `getUserRoleHistory`) returning the `UserRoleAudit` rows for the given user, ordered by `createdAt` descending. Each entry SHALL embed the actor's display fields under a `changedBy` sub-object containing `{ id, firstName, lastName, email }`, sourced from a Prisma relation `select`. The route SHALL be gated to `[ADMIN, SUPERADMIN]`. The endpoint does NOT verify target existence: a user id with no audit rows — including a non-existent id — SHALL return an empty array with HTTP 200.

#### Scenario: Response embeds actor display fields

- **WHEN** a SUPERADMIN requests history for a user with prior transitions
- **THEN** every entry in the response includes a `changedBy` object with `id`, `firstName`, `lastName`, and `email`

#### Scenario: ADMIN reads another user's history

- **WHEN** an ADMIN requests `GET /users/:id/role-history` for a user with transitions
- **THEN** the response status is 200 and the body is an array of audit rows ordered `createdAt` descending

#### Scenario: SUPERADMIN reads another user's history

- **WHEN** a SUPERADMIN requests `GET /users/:id/role-history`
- **THEN** the response status is 200

#### Scenario: USER attempts to read history

- **WHEN** a USER requests `GET /users/:id/role-history`
- **THEN** the response status is 403

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated request is made
- **THEN** the response status is 401

#### Scenario: User with no transitions or unknown id

- **WHEN** the target user has no recorded role transitions, or the id does not correspond to any user
- **THEN** the response is an empty array with HTTP 200

### Requirement: No backfill of pre-existing admins

The migration introducing `UserRoleAudit` SHALL NOT synthesize audit rows for users whose roles predate the table. The audit history of pre-existing admins SHALL start empty.

#### Scenario: Pre-existing admin history is empty post-migration

- **WHEN** an admin existed before the migration ran
- **AND** no role change has occurred since
- **THEN** `GET /users/:id/role-history` for that user returns an empty array

### Requirement: Audit FK referential integrity

The `UserRoleAudit` model SHALL declare both `user` (target) and `changedBy` (actor) relations to `User` with `onDelete: Restrict`.

#### Scenario: Hard-delete attempt against an audited user

- **WHEN** any future code path attempts to hard-delete a `User` row referenced by a `UserRoleAudit` row (as either target or actor)
- **THEN** the database SHALL reject the delete with a foreign-key constraint error

### Requirement: `request.currentUser` hydrated with id and role

The `user-resolve-plugin` SHALL hydrate `request.currentUser` with at least `id` and `role` before any handler runs, so the role route guard and the `updateUserRole` / `getUserRoleHistory` handlers can rely on the current user's id and role without an additional database lookup.

#### Scenario: Authenticated request reaches the service

- **WHEN** an authenticated request reaches a user-management handler
- **THEN** `request.currentUser.id` and `request.currentUser.role` are defined and reflect the current user

### Requirement: `GET /users` includes user's job position name

The `getAllUsers` service SHALL include the user's `countryJobPosition` relation and the response SHALL expose a `jobPositionName: string | null` field per user, in addition to the existing `countryJobPositionId`. The change is additive — existing fields are preserved.

#### Scenario: User with a job position

- **WHEN** a user has a non-null `countryJobPositionId`
- **THEN** the `jobPositionName` field on that user's response equals the related `CountryJobPosition.name`

#### Scenario: User without a job position

- **WHEN** a user's `countryJobPositionId` is null
- **THEN** the `jobPositionName` field on that user's response is null

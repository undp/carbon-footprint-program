## ADDED Requirements

### Requirement: Discriminated update body for `PATCH /users/:id`

The system SHALL accept `PATCH /users/:id` with a body matching one of two disjoint shapes: a `SelfProfileUpdate` containing any subset of `email`, `countryJobPositionId`, `firstName`, `lastName`, `idpUserId`, `idpName`, `termsAccepted` (and no `role`), or an `AdminRoleUpdate` containing exactly `{ role: SystemRole }`. Bodies that mix profile fields with `role`, or that contain unknown fields, SHALL be rejected at the schema layer with a 400 Bad Request.

#### Scenario: Valid self-profile body

- **WHEN** a body containing only profile fields is submitted
- **THEN** the schema accepts it as `SelfProfileUpdate`

#### Scenario: Valid admin-role body

- **WHEN** a body of `{ role: "ADMIN" }` is submitted
- **THEN** the schema accepts it as `AdminRoleUpdate`

#### Scenario: Mixed body is rejected

- **WHEN** a body contains both `firstName` and `role`
- **THEN** the schema rejects it with 400

#### Scenario: Unknown field is rejected

- **WHEN** a body contains a key not present in either branch
- **THEN** the schema rejects it with 400

### Requirement: Route guard relaxation

The route guard on `PATCH /users/:id` SHALL be `requireAuth` only. Field-level and row-level authorization for both branches SHALL be performed in the service layer.

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated request hits `PATCH /users/:id`
- **THEN** the system rejects it with 401

#### Scenario: Authenticated request reaches the service

- **WHEN** any authenticated user submits a request
- **THEN** the request reaches the service layer for authorization decisions

### Requirement: Self-profile authorization

For an `AdminRoleUpdate` not being applied (i.e., the request body matches `SelfProfileUpdate`), the service SHALL allow the request only when the actor's `id` equals the target's `id`. Any other actor MUST be rejected with `InsufficientPermissionsError` (403).

#### Scenario: USER edits own profile

- **WHEN** a USER submits a `SelfProfileUpdate` to their own `id`
- **THEN** the update is applied successfully

#### Scenario: ADMIN attempts to edit another user's profile

- **WHEN** an ADMIN submits a `SelfProfileUpdate` to another user's `id`
- **THEN** the service rejects with `InsufficientPermissionsError` (403)

#### Scenario: SUPERADMIN attempts to edit another user's profile

- **WHEN** a SUPERADMIN submits a `SelfProfileUpdate` to another user's `id`
- **THEN** the service rejects with `InsufficientPermissionsError` (403)

### Requirement: Admin-role authorization — actor must be SUPERADMIN

For an `AdminRoleUpdate`, the service SHALL allow the mutation only when the actor's `role` is `SUPERADMIN`. Any other actor (USER or ADMIN) MUST be rejected with `InsufficientPermissionsError` (403).

#### Scenario: USER attempts a role change

- **WHEN** a USER submits an `AdminRoleUpdate`
- **THEN** the service rejects with `InsufficientPermissionsError` (403)

#### Scenario: ADMIN attempts a role change

- **WHEN** an ADMIN submits an `AdminRoleUpdate`
- **THEN** the service rejects with `InsufficientPermissionsError` (403)

#### Scenario: SUPERADMIN attempts a role change

- **WHEN** a SUPERADMIN submits an `AdminRoleUpdate`
- **THEN** the service proceeds to evaluate the remaining invariants

### Requirement: INV-1 — no self role change

For an `AdminRoleUpdate`, the service SHALL reject the mutation with `SelfRoleChangeError` (403) when the target's `id` equals the actor's `id`.

#### Scenario: SUPERADMIN attempts to change own role

- **WHEN** a SUPERADMIN submits `{ role: "ADMIN" }` (or any role) to their own `id`
- **THEN** the service rejects with `SelfRoleChangeError` (403)

### Requirement: Role transition validation

For an `AdminRoleUpdate`, the service SHALL validate the target's current role transitions to the requested role per the following rules. Any disallowed transition MUST be rejected with `InvalidRoleTransitionError` (409).

- target.role = `USER` → only `ADMIN` and `SUPERADMIN` are allowed (promotion).
- target.role = `ADMIN` → `USER`, `ADMIN`, `SUPERADMIN` are allowed.
- target.role = `SUPERADMIN` → `USER`, `ADMIN`, `SUPERADMIN` are allowed (subject to INV-2).

A no-op transition (target.role equals body.role) SHALL be a true no-op: the service returns 200 with the existing user record without performing any database write — no audit row, no `updatedAt` bump, no `updatedById` change.

#### Scenario: Promote USER to ADMIN

- **WHEN** a SUPERADMIN sets `role = "ADMIN"` on a target whose current role is `USER`
- **THEN** the transition succeeds

#### Scenario: Demote ADMIN to USER

- **WHEN** a SUPERADMIN sets `role = "USER"` on a target whose current role is `ADMIN`
- **THEN** the transition succeeds

#### Scenario: Demote a SUPERADMIN (more than one exists)

- **WHEN** a SUPERADMIN sets `role = "USER"` on another SUPERADMIN
- **AND** more than one SUPERADMIN exists
- **THEN** the transition succeeds

### Requirement: INV-2 — last SUPERADMIN preservation

When an `AdminRoleUpdate` would change a target whose current role is `SUPERADMIN` to a non-SUPERADMIN role, the service SHALL count SUPERADMIN users within the same database transaction as the update and reject with `LastSuperadminError` (409) if the count is less than or equal to one.

#### Scenario: Demoting the last SUPERADMIN

- **WHEN** the database contains exactly one SUPERADMIN
- **AND** a request would demote that user
- **THEN** the service rejects with `LastSuperadminError` (409)

#### Scenario: Demoting one of several SUPERADMINs

- **WHEN** the database contains two or more SUPERADMINs
- **AND** a request demotes one of them
- **THEN** the service applies the update successfully

#### Scenario: Concurrent demotions of two distinct SUPERADMINs

- **WHEN** two demotion requests for two distinct SUPERADMINs are submitted concurrently with exactly two SUPERADMINs in the database
- **THEN** at most one request SHALL succeed and any subsequent request SHALL fail with `LastSuperadminError` (409) — that is, the system SHALL never reduce the SUPERADMIN count below one

### Requirement: Serializable transaction with retry

The service SHALL perform the target lookup, the SUPERADMIN count (when applicable), the role update, and the audit row insert inside a single `prisma.$transaction` interactive transaction running at `Serializable` isolation level. The call site SHALL retry the transaction once on PostgreSQL serialization failure (`SQLSTATE 40001` / Prisma `P2034`); a second failure SHALL surface to the caller as a transient error.

#### Scenario: Service implementation uses Serializable isolation

- **WHEN** the service handles an `AdminRoleUpdate`
- **THEN** the target read, count check, role update, and audit insert are all issued through the same `tx` client inside one `prisma.$transaction(async (tx) => …, { isolationLevel: 'Serializable' })` call

#### Scenario: Concurrent demotions retry safely

- **WHEN** two SUPERADMIN demotion requests against two distinct SUPERADMINs are submitted concurrently with exactly two SUPERADMINs in the database
- **THEN** the database aborts one of the two transactions with a serialization failure
- **AND** the call site retries that transaction once
- **AND** on retry, the SUPERADMIN count is now 1 and INV-2 fires, returning `LastSuperadminError` (409)

### Requirement: Audit fields on update

Every successful update SHALL set `updatedById` to the actor's id and SHALL update `updatedAt` per the existing Prisma `@updatedAt` mechanism.

#### Scenario: Successful update sets updatedById

- **WHEN** an update succeeds
- **THEN** `updatedById` on the target row equals the actor's id

### Requirement: Error response shape and codes

Errors raised by this endpoint SHALL conform to `ApiErrorResponseSchema` and SHALL use the following codes:

| Error class                    | HTTP status | Used when                                       |
| ------------------------------ | ----------- | ----------------------------------------------- |
| `SelfRoleChangeError`          | 403         | INV-1 violation                                 |
| `LastSuperadminError`          | 409         | INV-2 violation                                 |
| `InsufficientPermissionsError` | 403         | actor lacks permission for the requested branch |
| `InvalidRoleTransitionError`   | 409         | requested transition is not allowed             |
| `UserNotFoundError`            | 404         | target id does not exist                        |

#### Scenario: Self role change attempt

- **WHEN** the service rejects an update due to INV-1
- **THEN** the response status is 403 with code `SelfRoleChangeError`

#### Scenario: Last SUPERADMIN demotion

- **WHEN** the service rejects an update due to INV-2
- **THEN** the response status is 409 with code `LastSuperadminError`

#### Scenario: Invalid transition

- **WHEN** the service rejects an update because the requested transition is disallowed
- **THEN** the response status is 409 with code `InvalidRoleTransitionError`

#### Scenario: Forbidden actor

- **WHEN** the service rejects because the actor lacks permission for the requested branch
- **THEN** the response status is 403 with code `InsufficientPermissionsError`

### Requirement: Country-agnostic role management

The role management implementation SHALL NOT contain country-specific branches, identifiers, or constants. Roles are global enums defined in the database schema and apply uniformly across deployments.

#### Scenario: Country deployment

- **WHEN** the platform is deployed for any country
- **THEN** the role management endpoint behaves identically without code changes

### Requirement: Role-transition audit row written atomically

Whenever an `AdminRoleUpdate` results in a real role change (`previousRole !== newRole`), the service SHALL insert a `UserRoleAudit` row recording `{ userId: target.id, previousRole, newRole, changedById: actor.id, createdAt: now() }` inside the same `prisma.$transaction` as the update. If the audit insert fails, the entire transaction SHALL roll back so the role update does not persist.

#### Scenario: Successful role change writes audit row

- **WHEN** a SUPERADMIN promotes a USER to ADMIN
- **THEN** a `UserRoleAudit` row exists with `previousRole = USER`, `newRole = ADMIN`, `changedById = actor.id`, `userId = target.id`
- **AND** the audit row's `createdAt` is set by the database default

#### Scenario: No-op role change writes no audit row and no update

- **WHEN** the requested role equals the target's current role
- **THEN** no `UserRoleAudit` row is inserted
- **AND** no `User` write is performed (`updatedAt` and `updatedById` are not bumped)

#### Scenario: Audit insert rollback

- **WHEN** the audit insert fails for any reason inside the transaction
- **THEN** the role update is rolled back as well and the target's role remains unchanged

### Requirement: `GET /users/:id/role-history` endpoint

The system SHALL expose `GET /users/:id/role-history` returning the `UserRoleAudit` rows for the given user, ordered by `createdAt` descending. Each entry SHALL embed the actor's display fields directly under a `changedBy` sub-object containing `{ id, firstName, lastName, email }`, sourced from a Prisma relation `select` so the client renders the timeline without a follow-up lookup. The endpoint SHALL be gated to `[ADMIN, SUPERADMIN]` and SHALL return 404 when the user id does not exist.

#### Scenario: Response embeds actor display fields

- **WHEN** a SUPERADMIN requests history for a user with prior transitions
- **THEN** every entry in the response includes a `changedBy` object with `id`, `firstName`, `lastName`, and `email`

#### Scenario: ADMIN reads another user's history

- **WHEN** an ADMIN requests `GET /users/:id/role-history` for an existing user
- **THEN** the response status is 200
- **AND** the body is an array of audit rows ordered `createdAt DESC`

#### Scenario: SUPERADMIN reads another user's history

- **WHEN** a SUPERADMIN requests `GET /users/:id/role-history` for an existing user
- **THEN** the response status is 200

#### Scenario: USER attempts to read history

- **WHEN** a USER requests `GET /users/:id/role-history`
- **THEN** the response status is 403

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated request is made
- **THEN** the response status is 401

#### Scenario: Missing target user

- **WHEN** the requested user id does not exist
- **THEN** the response status is 404 with code `UserNotFoundError`

#### Scenario: User with no transitions

- **WHEN** the target user has never had a role change recorded
- **THEN** the response is an empty array

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

### Requirement: `request.currentUser.role` available in service

The `user-resolve-plugin` SHALL hydrate `request.currentUser` with at least `id` and `role` before any handler runs. The service-layer authorization in `updateUserService` and `getUserRoleHistoryService` SHALL be permitted to read `request.currentUser.role` directly without an additional database lookup.

#### Scenario: Authenticated request reaches the service

- **WHEN** an authenticated request reaches a user-management handler
- **THEN** `request.currentUser.role` is defined and equals the user's current `SystemRole`

### Requirement: `GET /users` includes user's job position name

The `getAllUsers` service SHALL include the user's `countryJobPosition` relation and the response SHALL expose a `jobPositionName: string | null` field per user, in addition to the existing `countryJobPositionId`. The change is additive — existing fields are preserved.

#### Scenario: User with a job position

- **WHEN** a user has a non-null `countryJobPositionId`
- **THEN** the `jobPositionName` field on that user's response equals the related `CountryJobPosition.name`

#### Scenario: User without a job position

- **WHEN** a user's `countryJobPositionId` is null
- **THEN** the `jobPositionName` field on that user's response is null

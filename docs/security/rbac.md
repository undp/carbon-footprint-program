# RBAC and Authorization

This document covers the role-based access control (RBAC) model and the authorization plugin chain used to protect API routes.

For how user identity is established before authorization runs, see [Authentication](./authentication.md).

---

## Role Model

The system uses two independent role dimensions:

| Dimension             | Scope            | Values                           |
| --------------------- | ---------------- | -------------------------------- |
| **System role**       | Platform-wide    | `USER`, `ADMIN`, `SUPERADMIN`    |
| **Organization role** | Per-organization | `VIEWER`, `CONTRIBUTOR`, `ADMIN` |

A user always has exactly one system role. A user may have zero or more organization memberships, each with its own organization role.

### System Roles

Defined in `packages/database/src/prisma/schema.prisma` as the `SystemRole` enum.

| Role         | Description                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `USER`       | Default role assigned to all new users. Can access resources they own or belong to.                      |
| `ADMIN`      | Platform administrator. Can bypass organization membership checks on routes that opt in to admin bypass. |
| `SUPERADMIN` | Full access. Same bypass as ADMIN.                                                                       |

**Role assignment:**

- New users are always created with `USER` role.
- Role changes are performed via the admin users screen (`/admin/users`), backed by `PATCH /users/:id` with a discriminated body. Only `SUPERADMIN`s can change roles, and they cannot change their own (INV-1). The system enforces "at least one `SUPERADMIN` must exist" (INV-2) inside the role-update transaction.
- Every successful role change is recorded in the `UserRoleAudit` table and is queryable via `GET /users/:id/role-history` (visible to `ADMIN` and `SUPERADMIN`).

**Role transition matrix** (enforced by `apps/api/src/features/users/updateUserRole/service.ts`):

| Current role | Allowed next roles    |
| ------------ | --------------------- |
| `USER`       | `ADMIN`, `SUPERADMIN` |
| `ADMIN`      | `USER`, `SUPERADMIN`  |
| `SUPERADMIN` | `USER`, `ADMIN`       |

Same-role updates are no-ops: the service short-circuits without touching `updatedAt`/`updatedById` and does not insert an audit row.

**Invariants:**

- **INV-1 — No self role changes.** A `SUPERADMIN` cannot change their own role. Returns 403 `SelfRoleChangeError`.
- **INV-2 — At least one `SUPERADMIN`.** Demoting the last `SUPERADMIN` is rejected. Returns 409 `LastSuperadminError`. The check runs inside the role-update interactive transaction.
- **INV-3 — Country-agnostic.** No role labels or thresholds are hard-coded; role labels live in the web `screens/Users/constants.ts`.

### Organization Roles

Defined as the `OrganizationRole` enum.

| Role          | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `VIEWER`      | Read-only access to organization resources.                             |
| `CONTRIBUTOR` | Can create and edit resources (carbon inventories, reduction projects). |
| `ADMIN`       | Full control over the organization: manage members, update settings.    |

**Membership lifecycle** (`MembershipStatus` enum):

| Status     | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| `ACTIVE`   | User is a current member of the organization.                        |
| `OUTDATED` | Membership record is no longer current (superseded by a new record). |
| `DELETED`  | User was removed from the organization.                              |

Only `ACTIVE` memberships are checked during authorization.

---

## Authorization Plugin Chain

The API uses five Fastify plugins that provide authorization decorators. These decorators are used as `onRequest` or `preHandler` hooks on individual routes.

```
authenticationPlugin       → sets request.authUser         (onRequest)
userResolvePlugin          → sets request.currentUser      (preValidation)
authorizationPlugin        → fastify.requireRoles()        (onRequest)
organizationAuthorizationPlugin  → fastify.requireOrganizationRole()  (preHandler)
carbonInventoryAuthorizationPlugin → fastify.requireCarbonInventoryAccess()  (preHandler)
reductionProjectAuthorizationPlugin → fastify.requireReductionProjectAccess() (preHandler)
```

> **Hook phase matters.** System role checks (`requireRoles`) run in `onRequest` before the request body is parsed. Organization and resource checks run in `preHandler` because they need `request.currentUser` to be set by `userResolvePlugin`.

---

## Decorator Reference

### `fastify.requireAuth`

Provided by `authenticationPlugin`. Returns 401 if `request.authUser` is null.

```typescript
fastify.get(
  "/protected",
  {
    onRequest: [fastify.requireAuth],
  },
  handler
);
```

---

### `fastify.requireRoles(roles: SystemRole[])`

Provided by `authorizationPlugin`. Returns 403 if the user's system role is not in `roles`.

```typescript
fastify.get(
  "/admin-only",
  {
    onRequest: [
      fastify.requireAuth,
      fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
    ],
  },
  handler
);
```

---

### `fastify.requireOrganizationRole(extractor, options)`

Provided by `organizationAuthorizationPlugin`. Checks the user's role within a specific organization.

```typescript
fastify.post(
  "/organizations/:organizationId/members",
  {
    onRequest: [fastify.requireAuth],
    preHandler: [
      fastify.requireOrganizationRole((req) => req.params.organizationId, {
        allowedRoles: [OrganizationRole.ADMIN],
        canAdminsBypass: true,
      }),
    ],
  },
  handler
);
```

**Options:**

| Option            | Type                 | Description                                                                      |
| ----------------- | -------------------- | -------------------------------------------------------------------------------- |
| `allowedRoles`    | `OrganizationRole[]` | User must have at least one of these roles.                                      |
| `canAdminsBypass` | `boolean`            | When `true`, users with `ADMIN` or `SUPERADMIN` system roles skip the org check. |

---

### `fastify.requireCarbonInventoryAccess(extractor, options?)`

Provided by `carbonInventoryAuthorizationPlugin`. Three-tiered access check:

**Access rules (evaluated in order):**

1. **Anonymous access via UUID header:** If the request includes `x-carbon-inventory-uuid` matching the inventory's UUID, access is granted regardless of authentication. Used for sharing inventory links without login.
2. **Standalone inventory (no organization):** Only the user who created the inventory has access.
3. **Organizational inventory:** Only active members of the inventory's organization have access. If `requiredOrganizationRoles` is specified, the member's role must be in that list.

```typescript
// Read: any org member can access
fastify.get(
  "/:id",
  {
    onRequest: [fastify.requireAuth],
    preHandler: [fastify.requireCarbonInventoryAccess(idExtractor)],
  },
  handler
);

// Write: only org admins
fastify.put(
  "/:id",
  {
    onRequest: [fastify.requireAuth],
    preHandler: [
      fastify.requireCarbonInventoryAccess(idExtractor, {
        requiredOrganizationRoles: [OrganizationRole.ADMIN],
      }),
    ],
  },
  handler
);
```

**Options:**

| Option                      | Type                 | Description                                                       |
| --------------------------- | -------------------- | ----------------------------------------------------------------- |
| `requiredOrganizationRoles` | `OrganizationRole[]` | Restricts org-based access to specified roles.                    |
| `canAdminsBypass`           | `boolean`            | When `true`, `ADMIN`/`SUPERADMIN` system roles bypass all checks. |

---

### `fastify.requireReductionProjectAccess(extractor, options?)`

Provided by `reductionProjectAuthorizationPlugin`. Same structure as `requireCarbonInventoryAccess` but for reduction projects.

---

## Multi-Level Access Control Flow

```
Request arrives
    │
    ▼
[onRequest] requireAuth
    ├── request.authUser null? → 401 Unauthorized
    └── OK → continue
    │
    ▼
[preValidation] userResolvePlugin
    ├── Upserts user in DB (creates on first login)
    └── request.currentUser = { id, email, role: SystemRole, ... }
    │
    ▼
[onRequest] requireRoles([SystemRole.ADMIN])    ← if route requires it
    ├── currentUser.role not in allowedRoles? → 403 Forbidden
    └── OK → continue
    │
    ▼
[preHandler] requireOrganizationRole(extractor, options)  ← if route requires it
    ├── canAdminsBypass && ADMIN/SUPERADMIN? → bypass, continue
    ├── No active membership in org? → 403 Forbidden
    ├── Role not in allowedRoles? → 403 Forbidden
    └── OK → continue
    │
    ▼
[preHandler] requireCarbonInventoryAccess(extractor, options)  ← if route requires it
    ├── Anonymous + UUID header matches? → allow
    ├── canAdminsBypass && ADMIN/SUPERADMIN? → bypass, continue
    ├── No org + not creator? → 403 Forbidden
    ├── Has org + not active member? → 403 Forbidden
    ├── Has org + member role not in requiredOrganizationRoles? → 403 Forbidden
    └── OK → continue
    │
    ▼
Route handler executes
```

---

## Permission Matrix

### System-Level Operations

| Operation                       | USER | ADMIN                    | SUPERADMIN               |
| ------------------------------- | ---- | ------------------------ | ------------------------ |
| Read own profile                | ✓    | ✓                        | ✓                        |
| List organizations (own)        | ✓    | ✓                        | ✓                        |
| Access platform admin endpoints | ✗    | ✓                        | ✓                        |
| Bypass org membership checks    | ✗    | ✓ (if `canAdminsBypass`) | ✓ (if `canAdminsBypass`) |

### Organization-Level Operations

| Operation                    | VIEWER | CONTRIBUTOR | ADMIN |
| ---------------------------- | ------ | ----------- | ----- |
| View organization details    | ✓      | ✓           | ✓     |
| Create carbon inventory      | ✗      | ✓           | ✓     |
| Edit carbon inventory        | ✗      | ✓           | ✓     |
| Delete carbon inventory      | ✗      | ✗           | ✓     |
| Manage organization members  | ✗      | ✗           | ✓     |
| Update organization settings | ✗      | ✗           | ✓     |

### Carbon Inventory Access (Anonymous / Unauthenticated)

| Condition                                               | Access                         |
| ------------------------------------------------------- | ------------------------------ |
| `x-carbon-inventory-uuid` header matches inventory UUID | Read-only (specific endpoints) |
| No header, no auth                                      | 403 Forbidden                  |

---

## Anonymous Access

Certain carbon inventory endpoints support access without authentication via the `x-carbon-inventory-uuid` header. This enables public sharing of a carbon inventory by URL — the UUID acts as a capability token.

**How it works:**

1. The inventory has a `uuid` field (a random UUID generated at creation, separate from the numeric `id`).
2. The sharing URL encodes this UUID.
3. The frontend sends `x-carbon-inventory-uuid: <uuid>` in requests to these endpoints.
4. The `requireCarbonInventoryAccess` decorator checks the header before checking authentication.

This design allows unauthenticated read access to a specific inventory without exposing all inventories.

---

## User Provisioning

Users are provisioned on first authenticated request — no pre-registration is required.

**Flow:**

1. User authenticates via the identity provider (Azure Entra ID).
2. On the first API request, `userResolvePlugin` detects no DB record for the `idpUserId`.
3. A new `User` row is created with `role = USER`.
4. On subsequent requests, the existing record is found and updated if the email changed.

To promote the first `SUPERADMIN` of a fresh deployment (when no `SUPERADMIN` exists yet), update the `systemRole` column directly in the database after the first login. From that point on, role management is performed through the admin users screen.

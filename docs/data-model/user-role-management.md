# User Role Management

This document describes how system roles (`USER`, `ADMIN`, `SUPERADMIN`) are managed at runtime: the data model, the API contract, the invariants the service enforces, and the admin UI that exposes the workflow.

For the broader RBAC model (system roles vs. organization roles, decorator chain, permission matrix), see [`../security/rbac.md`](../security/rbac.md). For how role transitions are audited, see [`../security/audit-logging.md#user-role-transitions-userroleaudit`](../security/audit-logging.md#user-role-transitions-userroleaudit).

---

## Data Model

### `User.role`

Every user carries a single `SystemRole` enum value (`USER` / `ADMIN` / `SUPERADMIN`). New users are always provisioned with `USER` on first login.

### `UserRoleAudit`

Defined in `packages/database/src/prisma/schema.prisma`, mapped to the `user_role_audit` table:

| Field          | Type               | Purpose                          |
| -------------- | ------------------ | -------------------------------- |
| `id`           | BigInt PK          | Audit row id                     |
| `userId`       | BigInt FK → `User` | User whose role changed (target) |
| `previousRole` | `SystemRole`       | Role before the change           |
| `newRole`      | `SystemRole`       | Role after the change            |
| `changedById`  | BigInt FK → `User` | Actor who performed the change   |
| `createdAt`    | DateTime           | When the change happened         |

Both foreign keys use `onDelete: Restrict`, so audit history survives even if related users are removed at the database level. The composite index `@@index([userId, createdAt])` keeps the per-user history query (DESC by `createdAt`) cheap as the table grows.

Audit rows are inserted in the same Serializable transaction as the `User.role` update, so they cannot drift out of sync with the user's persisted role.

---

## API Contract

### `PATCH /users/:id`

The body is a discriminated union (defined in `packages/types/src/users/updateUser/schemas.ts`):

```ts
UpdateUserBodySchema = z.union([
  SelfProfileUpdateSchema, // partial profile fields (firstName, lastName, ...)
  AdminRoleUpdateSchema, // { role: SystemRole }
]);
```

Both branches use `.strict()`, so a body that mixes profile fields and `role` is rejected with 400.

**Auth model:**

- The route guard is `requireAuth` (no role gate). All authorization happens in the service so the same endpoint can serve self-profile edits and admin-only role changes.
- **Self-profile branch:** `actor.id === target.id` is required; otherwise the service throws `InsufficientPermissionsError` (403).
- **Admin-role branch:** `actor.role === SUPERADMIN` is required; otherwise the service throws `InsufficientPermissionsError` (403).

**Errors specific to role changes:**

| Error                          | Status | Trigger                                                                                             |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| `SelfRoleChangeError`          | 403    | Actor and target are the same user (INV-1).                                                         |
| `InvalidRoleTransitionError`   | 409    | Requested transition is not allowed by the matrix below.                                            |
| `LastSuperadminError`          | 409    | Demoting this user would leave the system without any `SUPERADMIN` (INV-2).                         |
| `InsufficientPermissionsError` | 403    | Self-profile branch but `actor.id !== target.id`, or admin-role branch but actor is not SUPERADMIN. |

### `GET /users/:id/role-history`

Returns every `UserRoleAudit` row for the target user, ordered `createdAt DESC`. Each entry includes the actor's display fields (`firstName`, `lastName`, `email`). Restricted to `ADMIN` and `SUPERADMIN`.

### `GET /users` extension

The list response now includes a `jobPositionName` (string | null) for each user, derived from the `countryJobPosition` relation. The base `UserBaseSchema` is unchanged — `jobPositionName` is a derived field that lives only on the response schema.

---

## Service Invariants

Implemented in `apps/api/src/features/users/updateUser/service.ts`. The role-change branch runs inside a Serializable interactive transaction wrapped by `withSerializableRetry` (`apps/api/src/utils/prismaRetry.ts`), which retries exactly once on a Prisma `P2034` (PostgreSQL `SQLSTATE 40001`).

### INV-1 — No self role changes

A `SUPERADMIN` cannot change their own role. Enforced before the transaction opens (no DB read needed).

### INV-2 — At least one `SUPERADMIN`

When the request demotes a `SUPERADMIN` (i.e. `previousRole === SUPERADMIN && newRole !== SUPERADMIN`), the service counts active `SUPERADMIN`s inside the same transaction. If the count is 1, the transaction throws `LastSuperadminError` (409). The Serializable isolation level guarantees that two concurrent demotions cannot both observe `count > 1` and both commit.

### INV-3 — Country-agnostic

The screen has no country-coded literals. Spanish copy is centralized in `apps/web/src/screens/Maintainer/screens/Users/constants.ts` and `apps/web/src/utils/getApiErrorMessage.ts`, and role colors come from the theme (`apps/web/src/theme/palette.ts`).

### Role transition matrix

| From `previousRole` | Allowed `newRole`     |
| ------------------- | --------------------- |
| `USER`              | `ADMIN`, `SUPERADMIN` |
| `ADMIN`             | `USER`, `SUPERADMIN`  |
| `SUPERADMIN`        | `USER`, `ADMIN`       |

Same-role updates are no-ops: the service short-circuits before touching the database, so `updatedAt`/`updatedById` stay unchanged and no `UserRoleAudit` row is inserted.

### `updatedById`

Every successful non-noop update sets `User.updatedById` to the actor's id, matching the existing audit-field convention used across the schema.

---

## Admin Users Screen (`/admin/users`)

Implemented under `apps/web/src/screens/Maintainer/screens/Users/`. Visible to `ADMIN` and `SUPERADMIN` from the maintainer sidebar.

### Layout

- Header card with screen title and a "Promover a admin" button (only for `SUPERADMIN`).
- KPI section: two cards — `Usuarios` (count of `USER`) and `Administradores` (count of non-`USER`, with the `SUPERADMIN` sub-count as subtitle).
- Tabs `Usuarios` / `Administradores`. Active tab persists to the URL via the TanStack Router `tab` search param.
- Stylized DataGrid with columns: name, email, job position (from `jobPositionName`), role (chip), createdAt, actions.

### Action gating

| Viewer       | "Ver historial" | "Cambiar rol"                                                  | "Promover a admin" header button |
| ------------ | --------------- | -------------------------------------------------------------- | -------------------------------- |
| `ADMIN`      | Visible         | Hidden                                                         | Hidden                           |
| `SUPERADMIN` | Visible         | Visible on the Administradores tab, except on the viewer's row | Visible                          |

`ChangeRoleDialog` mirrors INV-1 (disables submit when `row.id === me.id`) and INV-2 (disables `USER`/`ADMIN` options with a Spanish tooltip when the row is the last `SUPERADMIN`). Selecting `USER` shows an inline confirmation message before submit.

### Cache invalidation

`useUpdateUserRole` invalidates `userKeys.users` and `userKeys.roleHistory(id)` on success, so KPIs, the table, and any open history dialog all refresh consistently after a role change.

# User and Organization Membership

This document describes how users are created on the platform, how they join organizations, and how organization-level roles are managed.

---

## Concepts

The platform has two independent role systems:

| Layer                 | Roles                            | Scope                                                                  |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| **System role**       | `USER`, `ADMIN`, `SUPERADMIN`    | Platform-wide; controls access to `/admin/` routes                     |
| **Organization role** | `VIEWER`, `CONTRIBUTOR`, `ADMIN` | Per-organization; controls what a user can do within that organization |

A user can have different organization roles in different organizations. System role and organization role are independent — a `USER` system role can be an organization `ADMIN`.

---

## Data Model

### `User`

Created automatically on first login. Not created manually by admins.

```prisma
model User {
  id          BigInt      @id @default(autoincrement())
  email       String?     @unique
  idpUserId   String?     @unique @map("idp_user_id")  // subject claim from the identity token
  idpName     String?     @map("idp_name")
  systemRole  SystemRole  @default(USER)                @map("role")
  firstName   String?     @map("first_name")
  lastName    String?     @map("last_name")
  termsAccepted   Boolean @default(false) @map("terms_accepted")
  termsAcceptedAt DateTime? @map("terms_accepted_at")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime?   @updatedAt @map("updated_at")

  @@map("user")
}
```

```prisma
enum SystemRole {
  USER
  ADMIN
  SUPERADMIN
}
```

### `UserOrganizationMembership`

The membership record linking a `User` to an `Organization`. Each membership change (role update, removal) produces a new record rather than overwriting the old one, providing a full audit trail.

```prisma
model UserOrganizationMembership {
  id             BigInt           @id @default(autoincrement())
  userId         BigInt           @map("user_id")
  organizationId BigInt           @map("organization_id")
  role           OrganizationRole
  status         MembershipStatus @default(ACTIVE)
  createdById    BigInt?          @map("created_by_id")
  updatedById    BigInt?          @map("updated_by_id")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime?        @updatedAt @map("updated_at")

  @@map("user_organization_membership")
}
```

```prisma
enum OrganizationRole {
  VIEWER
  CONTRIBUTOR
  ADMIN
}

enum MembershipStatus {
  ACTIVE    // the current membership row for this user+org pair
  OUTDATED  // superseded by a role change (kept for history)
  DELETED   // soft-deleted when a user is removed
}
```

At any given time, at most one `ACTIVE` row exists per `(userId, organizationId)` pair. `OUTDATED` rows capture role-change history; `DELETED` rows capture removals.

---

## User Creation

Users are **not created by platform administrators**. A `User` record is created automatically by the authentication middleware the **first time a person logs in** with their Azure Entra ID credentials. The middleware extracts the `email` and `idpUserId` (the token's `sub` claim) and upserts the record.

**Consequence:** An organization admin cannot pre-add a user to their organization before that person has logged in at least once. The workflow is:

```
1. New team member opens the platform URL and logs in with their corporate account.
2. The platform creates their User record (systemRole = USER by default).
3. An organization ADMIN navigates to the organization settings (Users tab).
4. The admin adds the team member by their registered email address.
5. The team member now has access to the organization.
```

There is **no invitation link, no email notification, and no approval required** from the person being added.

---

## Organization Role Permissions

| Action                                         | VIEWER | CONTRIBUTOR | ADMIN |
| ---------------------------------------------- | ------ | ----------- | ----- |
| View organization data                         | ✓      | ✓           | ✓     |
| View carbon inventories and reduction projects | ✓      | ✓           | ✓     |
| View organization user list                    | ✓      | ✓           | ✓     |
| Create and edit carbon inventories             | —      | ✓           | ✓     |
| Create and edit reduction projects             | —      | ✓           | ✓     |
| Submit requests for review                     | —      | ✓           | ✓     |
| Add and remove organization members            | —      | —           | ✓     |
| Change member roles                            | —      | —           | ✓     |
| Edit organization profile                      | —      | —           | ✓     |

---

## API Endpoints

All endpoints require authentication. The `:organizationId` path parameter is the organization ID.

| Method   | Path                                           | Required org role                   | Description            |
| -------- | ---------------------------------------------- | ----------------------------------- | ---------------------- |
| `GET`    | `/organizations/:organizationId/users`         | `VIEWER`, `CONTRIBUTOR`, or `ADMIN` | List active members    |
| `POST`   | `/organizations/:organizationId/users`         | `ADMIN`                             | Add a user by email    |
| `DELETE` | `/organizations/:organizationId/users/:userId` | `ADMIN`                             | Remove a member        |
| `PATCH`  | `/organizations/:organizationId/users/:userId` | `ADMIN`                             | Change a member's role |

### Add a user — `POST /organizations/:organizationId/users`

```json
{
  "email": "jane.doe@company.com",
  "role": "CONTRIBUTOR"
}
```

**Response:**

```json
{
  "membershipId": "17",
  "userId": "42",
  "role": "CONTRIBUTOR"
}
```

**Behaviour:**

- Looks up the `User` by email. Returns `404` if not found (the user has not logged in yet).
- Returns `409` if an `ACTIVE` membership already exists for this user+org pair.
- Creates a new `UserOrganizationMembership` row with `status = ACTIVE`.
- Records `createdById` (the admin who added the user).

### List members — `GET /organizations/:organizationId/users`

```json
[
  {
    "userId": "42",
    "name": "Jane Doe",
    "email": "jane.doe@company.com",
    "organizationRole": "CONTRIBUTOR",
    "isCurrentUser": false
  }
]
```

Only `ACTIVE` membership rows are returned. Results are sorted by role priority (ADMINs first, then CONTRIBUTORs, then VIEWERs) and then alphabetically by name within each role group. The `isCurrentUser` flag marks the requesting user's own row.

### Remove a member — `DELETE /organizations/:organizationId/users/:userId`

Soft-deletes the `ACTIVE` membership row by setting `status = DELETED`. The `User` record is never deleted. Guards enforced:

- **Cannot remove yourself** — returns `403`.
- **Cannot remove the last ADMIN** — returns `409`. The operation uses a database transaction to prevent race conditions (two admins simultaneously removing each other).

### Change a member's role — `PATCH /organizations/:organizationId/users/:userId`

```json
{
  "role": "ADMIN"
}
```

**Response:**

```json
{
  "membershipId": "23",
  "role": "ADMIN"
}
```

Rather than updating the existing row, this operation runs inside a transaction that:

1. Sets the current `ACTIVE` row to `OUTDATED`.
2. Creates a new `ACTIVE` row with the new role.

This preserves the full role-change history in the `UserOrganizationMembership` table.

Guards enforced:

- **Cannot change your own role** — returns `403`.
- **Cannot demote the last ADMIN** — returns `409` if the target user is the only ADMIN and the new role is not `ADMIN`.

---

## Error Reference

| Code                        | HTTP | Trigger                                                   |
| --------------------------- | ---- | --------------------------------------------------------- |
| `USER_NOT_FOUND_BY_EMAIL`   | 404  | No `User` with the given email                            |
| `MEMBERSHIP_ALREADY_EXISTS` | 409  | Target user already has an `ACTIVE` membership            |
| `MEMBERSHIP_NOT_FOUND`      | 404  | Target user has no `ACTIVE` membership                    |
| `CANNOT_MODIFY_SELF`        | 403  | Admin attempting to change or remove their own membership |
| `CANNOT_REMOVE_LAST_ADMIN`  | 409  | Operation would leave the organization with zero ADMINs   |

---

## Frontend

User management lives in the **My Organization** screen (`apps/web/src/screens/MyOrganization/MyOrganizationScreen.tsx`), under the **Users** tab.

The tab displays:

- A table of current active members sorted by role then name.
- A role selector per row (organization ADMINs only) to change a member's role.
- A remove button per row (organization ADMINs only), disabled for the current user and the last admin.
- An "Add user" form requiring an email address and role selection.

Hooks used:
| Hook | Purpose |
|---|---|
| `useMyOrganizationUsers` | Orchestrates dialog state and mutation side-effects |
| `useUserMutations` | Wraps add, update-role, and remove mutations; shows toast notifications |

---

## Audit Trail

Because role changes produce a new `ACTIVE` row rather than updating the existing one, the full membership history for any user+organization pair is always available in the `user_organization_membership` table by querying all rows regardless of status:

```sql
SELECT role, status, created_at, created_by_id
FROM user_organization_membership
WHERE user_id = $1 AND organization_id = $2
ORDER BY created_at;
```

This will show the sequence of roles the user held: each `OUTDATED` row represents a past role, and the `ACTIVE` row represents the current one.

---

## Operational Notes

**No membership limit** — organizations can have unlimited members. There is no server-side cap.

**System role elevation** — changing a user's `systemRole` (to `ADMIN` or `SUPERADMIN`) is done directly in the database or via seed scripts. There is no UI for system role management.

**Re-adding a removed user** — if a user was removed (`DELETED` status), they can be re-added: a new `ACTIVE` row is created normally. The old `DELETED` row is retained for history.

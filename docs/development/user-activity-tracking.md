# User Activity Tracking

This document describes how user access is tracked, how the active/inactive classification works, and how the data surfaces in the admin UI.

---

## Overview

Every time a user starts a new session (i.e., the frontend calls `GET /users/me`), the system:

1. **Inserts a row** into the `UserAccessLog` table with the user's ID and the current timestamp.
2. **Updates** the `User.lastAccessAt` denormalized field with the same timestamp.

Both writes happen atomically inside a Prisma `$transaction`. This provides:

- A **complete history** of session starts per user (the log table), useful for dashboards, KPIs, and future analytics.
- A **fast lookup** of the most recent access per user (the denormalized field), used to display "Ultimo acceso" in the admin users table without aggregating the log.

---

## Data Model

### `UserAccessLog` table

| Field       | Type      | Description              |
| ----------- | --------- | ------------------------ |
| `id`        | BigInt PK | Auto-incrementing row ID |
| `userId`    | BigInt FK | References `User.id`     |
| `createdAt` | DateTime  | Timestamp of the access  |

**Indexes:**

- `(userId, createdAt)` — efficient per-user history queries, ordered by date.
- `(createdAt)` — efficient time-range aggregations across all users.

**Design decisions:**

- **Immutable**: no `updatedAt` field. Rows are append-only.
- **`onDelete: Restrict`** on the `userId` FK to prevent accidental deletion of users with access history.
- **Minimal schema**: only tracks user ID and timestamp. Additional fields (IP address, user-agent, etc.) can be added later as needed.

### `User.lastAccessAt` field

| Field          | Type      | Description                                        |
| -------------- | --------- | -------------------------------------------------- |
| `lastAccessAt` | DateTime? | Denormalized: the most recent `UserAccessLog` date |

Nullable — `null` means the user has never called `getMe` (e.g., created before this feature, or never logged in). Treated as inactive.

---

## Configuration

The active/inactive classification threshold is controlled by a system parameter:

| Key                            | Type   | Default | Description                                                  |
| ------------------------------ | ------ | ------- | ------------------------------------------------------------ |
| `USER_INACTIVE_THRESHOLD_DAYS` | number | `90`    | Days of inactivity after which a user is considered inactive |

The value accepts any positive integer. It is read by the `getAllUsers` service to compute the `active` boolean per user. The admin UI also fetches it to display the threshold in a tooltip.

To change the threshold, update the `system_parameter` row directly in the database:

```sql
UPDATE system_parameter SET value = '60' WHERE key = 'USER_INACTIVE_THRESHOLD_DAYS';
```

See also: [System Parameters Reference](./system-parameters.md).

---

## Implementation

### Recording access

**Trigger**: `GET /users/me` — called once per session by the `useMe` React Query hook in `AuthContext`.

**File**: `apps/api/src/features/users/getMe/service.ts`

```
1. Find user by idpUserId
2. If not found, return null
3. In a $transaction:
   a. Update User.lastAccessAt = now
   b. Insert UserAccessLog row (userId, now)
4. Return the updated user
```

### Computing active/inactive

**File**: `apps/api/src/features/users/getAllUsers/service.ts`

1. Fetch all users and `USER_INACTIVE_THRESHOLD_DAYS` in parallel (`Promise.all`).
2. Compute cutoff date: `now - thresholdDays`.
3. For each user: `active = lastAccessAt != null && lastAccessAt >= cutoff`.
4. Return the `active` boolean alongside each user in the response.

---

## Admin UI

### KPI card: "Actividad"

Located in the admin Users screen ("Usuarios" tab). Displays:

- **Activos**: count of users with `role = USER` and `active = true`.
- **Inactivos**: count of users with `role = USER` and `active = false`.
- **Tooltip**: explains the threshold, e.g., "Usuarios activos: accedieron en los ultimos 90 dias".

**File**: `apps/web/src/screens/Maintainer/screens/Users/components/UsersScreenKpiSection.tsx`

### Table column: "Ultimo acceso"

Visible only on the "Usuarios" tab. Displays the formatted `lastAccessAt` date per user, or "Nunca" if null.

**File**: `apps/web/src/screens/Maintainer/screens/Users/hooks/useUsersColumns.tsx`

---

## Future Extensions

- **Additional fields**: IP address, user-agent, geolocation — can be added to `UserAccessLog` without breaking existing data.
- **Retention policy**: for long-running deployments, consider archiving or purging old log rows (e.g., older than 2 years). The `@@index([createdAt])` supports efficient range-based deletion.
- **Richer dashboards**: the log table enables time-series analysis (daily/weekly/monthly active users, access frequency distributions, session patterns).
- **Admin activity tracking**: `lastAccessAt` is updated for all roles, but the current KPI only counts `USER` role. A similar card could be added for the "Administradores" tab.

---

## Related Docs

- [System Parameters Reference](./system-parameters.md)
- [Audit and Logging](../security/audit-logging.md)
- [User Role Management](../data-model/user-role-management.md)

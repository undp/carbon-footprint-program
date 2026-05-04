## Context

Today the only mutation path for `User.role` is direct database access. The repo has a `PATCH /users/:id` endpoint, but it (a) does not accept `role` in its body schema and (b) is gated to `[ADMIN, SUPERADMIN]`, which incidentally blocks the self-onboarding form (`UserFormScreen`) from working for regular USERs. The maintainer module already has a consistent screen pattern (`AdminOrganizationsScreen` → KPI section → DataGrid), a sidebar registry (`MaintainerLayout.tsx`), and a route conventions (`apps/web/src/routes/admin/<screen>.tsx`).

The new screen needs to do two things at once: surface the user base read-only for ADMINs, and let SUPERADMINs manage admin membership with strong safeguards against lockout. The work spans the types package, API service-level authorization, and a new frontend screen — so a design doc is warranted.

## Goals / Non-Goals

**Goals:**

- A single endpoint (`PATCH /users/:id`) cleanly serves both self-profile updates and admin-role changes via a discriminated union body.
- All authorization for role changes is enforced server-side, with the UI mirroring the same rules to avoid 403s.
- The last-SUPERADMIN guard is race-safe (TX-scoped count).
- No country-coded literals: labels, error copy, and tab/sidebar strings live in constants/vocab files.
- The screen reuses the established maintainer screen layout and components — no new primitives.

**Non-Goals:**

- `POST /users`, `DELETE /users/:id`, `getUserById`, `getMe` are untouched. The only new endpoint is `GET /users/:id/role-history` (audit read).
- No invite-by-email flow. "Create admin" = promote an existing USER.
- No hard delete. Revoking admin = `PATCH` with `role: USER`.
- No profile editing on the admin screen — role-only.
- No free-text reason field on audit rows (v1 keeps it minimal).
- No backfill of audit history for existing admins — history starts empty after migration.
- No bulk operations (multi-select promote/demote).

## Decisions

### Decision 1: Discriminated-union body for `PATCH /users/:id`

`UpdateUserBodySchema` becomes:

```ts
const SelfProfileUpdateSchema = UserBaseSchema.pick({
  email,
  countryJobPositionId,
  firstName,
  lastName,
  idpUserId,
  idpName,
  termsAccepted,
})
  .partial()
  .strict()
  .refine(hasAtLeastOneDefinedField);

const AdminRoleUpdateSchema = z
  .object({
    role: SystemRoleSchema,
  })
  .strict();

const UpdateUserBodySchema = z.union([
  SelfProfileUpdateSchema,
  AdminRoleUpdateSchema,
]);
```

**Why:** The two flows have _disjoint_ field sets and _different_ authorization rules. Encoding that disjointness in the schema lets Zod do half the auth work (an admin cannot smuggle profile fields into a role-change call, and vice versa) and makes the contract self-documenting.

**Alternative considered:** A single optional `role` on the existing schema. Rejected because it leaves "valid bodies that mix role and profile fields" undefined and forces the service to invent ad-hoc rejection rules.

### Decision 2: Move authorization from route to service

The route guard relaxes from `requireRoles([ADMIN, SUPERADMIN])` to `requireAuth`. The service decides what to allow based on the body shape, the actor, and the target.

**Why:** No single role guard expresses "USERs can edit themselves; SUPERADMINs can change others' roles; no one else can write." Route-level role guards are coarse; the actor-vs-target matrix is fine-grained and depends on body content. Service-layer enforcement is the only place that sees all three (actor, target, body).

**Alternative considered:** Two separate endpoints (`PATCH /users/me` for self, `PATCH /users/:id/role` for admin role changes). Cleaner separation, but the user explicitly chose Option A (extend the existing endpoint). Honoring that.

**Side-effect:** This fixes the latent bug where USERs could not complete `UserFormScreen` because the route guard rejected them. We should add a regression test for self-edit by a USER.

### Decision 3: Serializable TX-scoped invariant checks with retry

INV-1 (no self role change) and INV-2 (last SUPERADMIN preserved) are checked _inside_ the same `prisma.$transaction` as the update, run at **Serializable** isolation with a single-pass retry on PostgreSQL serialization failures (`40001`).

```ts
async function runRoleUpdateTx() {
  return prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUniqueOrThrow({
        where: { id },
        select: { id: true, role: true },
      });
      // INV-1, transition validation, branch on body shape
      if (demotingASuperadmin) {
        const superCount = await tx.user.count({ where: { role: SUPERADMIN } });
        if (superCount <= 1) throw new LastSuperadminError();
      }
      // ... role update + audit insert
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

// Call site: retry once on `P2034` / SQLSTATE 40001.
```

**Why Serializable + retry:** PostgreSQL's default `READ COMMITTED` does not prevent two concurrent demotions of two distinct SUPERADMINs from both reading `count = 2` and both succeeding — the count-then-update pair is atomic only with respect to single-row writes, not cross-row predicates. Serializable detects the conflict and aborts one of the two transactions with `40001`; we retry it once, at which point the other has committed, the count is now 1, and INV-2 fires correctly.

**Why a single retry is enough:** Role changes are operator-driven, not high-throughput; collisions are rare. A single retry resolves any 2-way race; a third concurrent operator is vanishingly unlikely and would surface as a transient error rather than a correctness violation.

**Alternative considered:** `SELECT … FOR UPDATE` on the SUPERADMIN row(s). Works, but requires raw SQL (Prisma has no first-class predicate-locking API), and Serializable expresses the intent more clearly.

### Decision 4: UI mirrors invariants but does not own them

The frontend hides/disables actions to prevent obvious 403s, but every check is duplicated server-side:

- Hide row actions on Usuarios tab → server: rejects mutations on USER targets except role-promotion.
- Hide actions when row is the current user → server: INV-1.
- Disable demote when `superAdminCount === 1` → server: INV-2.
- Hide all write UI for ADMIN viewer → server: actor must be SUPERADMIN for role mutations.

**Why:** Two-layer defense. UI prevents accidents; server prevents intent. The `superAdminCount` for INV-2's UI check is derived client-side from the existing `GET /users` response — no new endpoint.

### Decision 5: KPI cards mirror the tabs (two cards, not four)

Two cards: total `Usuarios` (role=USER) and total `Administradores` (ADMIN+SUPERADMIN, with SUPERADMIN breakdown in the subtitle). Counts are derived client-side from `GET /users` since the list is already loaded for the table.

**Why:** Cards mirror the tabs for visual symmetry, and we avoid an extra aggregation endpoint. If the user list ever grows beyond comfortable client-side filtering, we can switch to a `count`/`groupBy` endpoint without changing the UI shape.

**Alternative considered:** Four cards (Usuarios, Administradores, Super Admins, Nuevos en 30 días). Rejected for simplicity per user preference.

### Decision 6: "Revocar admin" = demote to USER (soft delete)

Admins are not deleted — they are demoted to USER. Hard delete is not offered because:

- USERs can self-register via the IdP, so deleting a row that re-creates itself on next login is not useful.
- `User.id` is referenced by `createdById`/`updatedById` across many tables; hard delete would either cascade destructively or fail.

**Why:** Demotion preserves history, is idempotent, and matches the "manage admin membership" mental model.

### Decision 7: New error classes, mapped in `getApiErrorMessage`

| Error class                    | HTTP | Front-end copy (Spanish)                        |
| ------------------------------ | ---- | ----------------------------------------------- |
| `SelfRoleChangeError`          | 403  | "No puedes cambiar tu propio rol."              |
| `LastSuperadminError`          | 409  | "Debe existir al menos un Super Administrador." |
| `InsufficientPermissionsError` | 403  | "No tienes permisos para realizar esta acción." |
| `InvalidRoleTransitionError`   | 409  | "La transición de rol solicitada no es válida." |

**Why:** Reuse the existing error-handler-plugin pipeline. Spanish copy is centralized in `getApiErrorMessage`, country-overridable.

### Decision 8: Role-transition audit log

A new Prisma model `UserRoleAudit` records every successful non-noop role change. Shape:

```prisma
model UserRoleAudit {
  id           BigInt     @id @default(autoincrement())
  userId       BigInt     @map("user_id")
  previousRole SystemRole @map("previous_role")
  newRole      SystemRole @map("new_role")
  changedById  BigInt     @map("changed_by_id")
  createdAt    DateTime   @default(now()) @map("created_at")

  user      User @relation("user_role_audit_target", fields: [userId],      references: [id], onDelete: Restrict)
  changedBy User @relation("user_role_audit_actor",  fields: [changedById], references: [id], onDelete: Restrict)

  @@index([userId, createdAt])
  @@map("user_role_audit")
}
```

**FK behavior.** Both relations use `onDelete: Restrict`. Users are not hard-deleted in this codebase (Decision 6), so the constraint never fires in normal operation — but pinning Restrict explicitly protects audit integrity against any future hard-delete attempt: it would fail loudly rather than silently orphan history.

**Write side.** The audit row is inserted inside the same `prisma.$transaction` as the role update, conditional on `previousRole !== newRole`. Atomic — there is no path that updates the role without an audit row, and no path that writes an audit row without a corresponding update.

**Read side.** New endpoint `GET /users/:id/role-history` (gated `[ADMIN, SUPERADMIN]`) returns rows ordered `createdAt DESC`. Each row's response shape **embeds the actor's display fields** (`changedBy: { id, firstName, lastName, email }`) so the client renders the timeline without a follow-up lookup. Pagination is not introduced in v1 — the list per user is expected to be small.

**Backfill.** None. Existing admins do not get synthetic rows. Synthetic rows would lie about both the actor and the timestamp; better an honest empty history than a fabricated one.

**No reason field.** Skipped in v1. Adding it later is additive (nullable column, no schema break).

**Why this design:**

- Single new table, single new endpoint, no behavioral coupling with anything outside `updateUserService`.
- Atomic write inside the existing transaction means INV-2 and the audit row share the same isolation guarantee — no partial state on rollback.
- The "Ver historial" UI lives on both tabs because read access is harmless and demoted ex-admins still have meaningful history.

**Alternative considered:** A generic event/audit table covering many entity kinds. Rejected — premature abstraction. If/when other domains need audit trails, the pattern can be generalized.

### Decision 9: "Ver historial" action on both tabs

The "Ver historial" row action is rendered for **both** ADMIN and SUPERADMIN viewers, on **both** the Usuarios and Administradores tabs. It opens a dialog with a timeline of `UserRoleAudit` rows for that user.

**Why:** Reads are role-gated at the endpoint level (`[ADMIN, SUPERADMIN]`), have no authorization nuance per row, and a USER who used to be an admin still has a history worth viewing.

### Decision 10: No-op `AdminRoleUpdate` is a true no-op

If a SUPERADMIN sends `{ role: X }` and the target's current role is already `X`, the service SHALL short-circuit and return the existing user record without performing any write — no audit row, no `updatedAt` bump, no `updatedById` change.

**Why:** A no-op should not pollute audit semantics. Bumping `updatedAt` for a non-change makes the field misleading ("last edited" should mean a real edit). The role-history dialog should reflect actual transitions, not API calls. Idempotency-on-retry also benefits: a retried no-op doesn't create a row each time.

**Alternative considered:** Always perform an `update` to bump `updatedAt`/`updatedById` even for no-ops. Rejected for the reasons above.

### Decision 11: Extend `getAllUsers` to include `countryJobPosition`

The admin screen displays a "Cargo" column. Today's `getAllUsers/service.ts` returns only the `User` row with no relations. The service is extended:

```ts
prisma.user.findMany({
  include: { countryJobPosition: { select: { id: true, name: true } } },
  orderBy: { createdAt: "desc" },
});
```

The mapper outputs a flat `jobPositionName: string | null` field on the response (in addition to the existing `countryJobPositionId`).

**Why:** Smallest backend touch that yields a usable column. Avoids per-row resolution on the client. Additive to the response — existing consumers that don't read `jobPositionName` are unaffected.

**Alternative considered:** Resolve names client-side via the existing `useJobPositions` hook. Rejected because it requires a join in the component layer and risks drift if the lists fall out of sync.

### Decision 12: Unified "Cambiar rol" dialog

The Administradores tab exposes a single row action — "Cambiar rol" — that opens **one dialog** offering all three role choices (`USER`, `ADMIN`, `SUPERADMIN`). The dialog is responsible for:

- Pre-selecting the row's current role.
- Disabling options that would violate INV-1 / INV-2 (with Spanish tooltips).
- Surfacing an inline confirmation message when the user picks `USER` ("Esta acción revocará el rol de administrador.") before submission.

The previously-planned separate "Revocar admin" dialog is removed; demotion to USER is a choice within the unified dialog.

**Why:** Fewer components, fewer mutation paths, single place for the disable logic. The destructive action is still distinct visually (inline confirm + appropriate styling).

**Alternative considered:** Two separate row actions ("Cambiar rol" for ADMIN↔SUPERADMIN, "Revocar admin" for → USER). Rejected — duplicated logic for INV-1/INV-2 disabling and an extra dialog for the same backend mutation.

### Decision 13: `UserRoleChip` component for visual consistency

The `role` column on the table uses a small `UserRoleChip` component that mirrors the conventions of `OrganizationStatusChip` — colored chip, Spanish label (`Usuario` / `Administrador` / `Super Administrador`), color sourced from the theme palette (no inline hex). The same chip is reused inside the role-history timeline rendering ("ADMIN → SUPERADMIN").

**Why:** Consistency with the Organizations screen's chip pattern. Centralizes color/label mapping in one component instead of scattering ternaries through the table and history dialog.

### Decision 14: `request.currentUser.role` must be available

Service-layer authorization reads `request.currentUser.role`. The `user-resolve-plugin` (per CLAUDE.md) is already responsible for hydrating `currentUser`. Before relaxing the route guard, verify the plugin populates `role`. If only `id` is loaded, amend the plugin to include `role` (one extra column, negligible cost). If the plugin already loads role, this is just a verification step.

**Why:** A missing `role` would silently fail closed (every actor would be treated as non-SUPERADMIN), which would _look_ like a working endpoint until someone notices SUPERADMINs can't change roles.

### Decision 15: No server-side pagination for `GET /users`

The admin screen fetches the entire user list in one shot and filters/sorts client-side, matching the existing `AdminOrganizationsScreen` pattern. KPI counts and INV-2's UI guard derive from this list.

**Why:** Consistent with the existing maintainer screens, simplest client logic, no new pagination contract. Acceptable until a deployment hits a user count that strains the response payload — then we revisit.

## Risks / Trade-offs

- **[Risk] Relaxing the route guard expands attack surface.** → Mitigation: every code path in `updateUserService` MUST start with an authorization branch; integration tests cover all matrix cells (self-USER, ADMIN-as-actor on others, SUPERADMIN on USER/ADMIN/SUPER, etc.).
- **[Risk] Discriminated-union body breaks existing `useUpdateUser` callers.** → Mitigation: `UserFormScreen` already passes only profile fields, which match `SelfProfileUpdate` exactly. No call-site changes needed; verify with a focused test.
- **[Risk] Client-side `superAdminCount` becomes stale after a mutation.** → Mitigation: invalidate `userKeys.all` on every successful update; the count re-derives from the refreshed list. INV-2 is still server-enforced regardless.
- **[Risk] Audit row insert fails silently inside the TX.** → Mitigation: insert is unconditional once the role change is decided; if it errors, the whole transaction rolls back and the role update does not apply. No silent dropping.
- **[Risk] Foreign-key references to deleted users in audit history.** → Not a concern in this codebase: users are never hard-deleted (per Decision 6). The `changedById` and `userId` FKs always resolve.
- **[Risk] Audit table grows unboundedly.** → Acceptable: role changes are rare events (humans operating a maintainer screen, not automated traffic). Index on `(userId, createdAt)` keeps per-user reads cheap. Revisit retention only if volume becomes an issue.
- **[Trade-off] Service-level branching makes the update service more complex.** → Acceptable: the alternative (two endpoints) was explicitly rejected by the user.

## Migration Plan

1. **Database** first — add the `UserRoleAudit` Prisma model and run `prisma migrate dev` to generate the migration. No data backfill.
2. **Types package** — extend `UpdateUserBodySchema` and add `UserRoleAuditBaseSchema` + `getUserRoleHistory` types.
3. **API**: update `updateUserService` (branch + audit write inside TX), relax route guard, add error classes, add the new `getUserRoleHistory` feature. Then tests.
4. **Frontend**: add hooks (`useUsers`, `useUserRoleHistory`), then dialogs (promote / change-role / revoke / history), then screen, then route + sidebar entry.
5. **Smoke test** the latent self-edit bug fix: log in as a USER, complete profile via `UserFormScreen`, verify success.
6. **Deploy** behind no flag — the new screen is only reachable via direct URL or sidebar (which is role-gated). No backwards-compatibility concerns at the data layer.

**Rollback:** revert the route guard relaxation, the schema union, and the audit-write inside the transaction. The new screen, route, sidebar entry, and `user_role_audit` table can be left in place; the table simply stops receiving rows.

## Open Questions

- Should the "Promover a admin" autocomplete cap to N results or paginate? (Defer until we see a deployment with thousands of USER rows.)
- Should the audit history dialog support pagination? (Defer until we see a user with many transitions.)

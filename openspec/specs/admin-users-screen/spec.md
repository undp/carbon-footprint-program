## ADDED Requirements

### Requirement: Admin users screen route and access

The system SHALL expose an admin route at `/admin/users` that renders a `UsersScreen` component, accessible only to authenticated users whose system role is `ADMIN` or `SUPERADMIN`. Unauthenticated or insufficiently-privileged users SHALL be redirected to the application home route.

#### Scenario: SUPERADMIN navigates to the screen

- **WHEN** a user with `role = SUPERADMIN` opens `/admin/users`
- **THEN** the system renders the `UsersScreen` with full write capabilities visible

#### Scenario: ADMIN navigates to the screen

- **WHEN** a user with `role = ADMIN` opens `/admin/users`
- **THEN** the system renders the `UsersScreen` in read-only mode (no header action button, no row action buttons)

#### Scenario: USER navigates to the screen

- **WHEN** a user with `role = USER` opens `/admin/users`
- **THEN** the system redirects the user to the home route

#### Scenario: Unauthenticated visitor opens the route

- **WHEN** an unauthenticated visitor opens `/admin/users`
- **THEN** the system redirects to the home/login route per the existing `requireRole` guard

### Requirement: Sidebar entry in maintainer layout

The system SHALL render a sidebar entry labeled "Usuarios" in the maintainer module sidebar that links to `/admin/users`. The entry SHALL be visible to users with `role = ADMIN` or `role = SUPERADMIN` and hidden from all other roles.

#### Scenario: ADMIN opens the maintainer module

- **WHEN** an ADMIN user opens any maintainer screen
- **THEN** the sidebar SHALL display the "Usuarios" entry

#### Scenario: SUPERADMIN opens the maintainer module

- **WHEN** a SUPERADMIN user opens any maintainer screen
- **THEN** the sidebar SHALL display the "Usuarios" entry

### Requirement: KPI section with two cards

The screen SHALL render a KPI section above the table with exactly two cards: one labeled "Usuarios" showing the count of users with `role = USER`, and one labeled "Administradores" showing the count of users with `role ∈ {ADMIN, SUPERADMIN}`. The "Administradores" card SHALL display the SUPERADMIN sub-count in its subtitle. Counts are derived from the loaded user list — no separate aggregate endpoint is required.

#### Scenario: KPIs reflect the loaded user list

- **WHEN** the user list finishes loading
- **THEN** the "Usuarios" card displays the count of users where `role = USER`
- **AND** the "Administradores" card displays the count of users where `role ∈ {ADMIN, SUPERADMIN}` with the SUPERADMIN count in the subtitle

#### Scenario: KPIs update after a role mutation

- **WHEN** any role-changing mutation completes successfully
- **THEN** the user list cache is invalidated and the KPI cards re-render with the updated counts

### Requirement: Tab group separating Usuarios and Administradores

The screen SHALL provide a tab group with two tabs — "Usuarios" (filters to `role = USER`) and "Administradores" (filters to `role ∈ {ADMIN, SUPERADMIN}`). The active tab SHALL be persisted in the URL via a query parameter so the selection is shareable, bookmarkable, and survives navigation.

#### Scenario: Switching tabs updates the URL

- **WHEN** the user clicks the "Administradores" tab
- **THEN** the URL query string updates to reflect the active tab
- **AND** the table re-filters to show only users with `role ∈ {ADMIN, SUPERADMIN}`

#### Scenario: Direct navigation with query param

- **WHEN** a user opens `/admin/users` with a query param selecting the "Administradores" tab
- **THEN** the screen renders with that tab active

### Requirement: Users tab is read-only

On the "Usuarios" tab, the table SHALL render rows for users with `role = USER` and SHALL NOT display any role-mutating row-level action controls. The "Ver historial" row action remains available per the audit requirement below. The header "Promover a admin" button SHALL still be visible to SUPERADMIN viewers, since the promote dialog targets users selected from the USER set.

#### Scenario: SUPERADMIN views the Usuarios tab

- **WHEN** a SUPERADMIN viewer is on the "Usuarios" tab
- **THEN** rows display user information without per-row action buttons
- **AND** the "Promover a admin" header button is visible

#### Scenario: ADMIN views the Usuarios tab

- **WHEN** an ADMIN viewer is on the "Usuarios" tab
- **THEN** rows display user information without per-row action buttons
- **AND** the "Promover a admin" header button is hidden

### Requirement: Unified "Cambiar rol" dialog on the Administradores tab

On the "Administradores" tab, when the viewer's role is SUPERADMIN, each row SHALL display a single role-mutating action — "Cambiar rol" — that opens **one unified dialog**. The dialog SHALL:

- Pre-select the row's current role.
- Offer all three role options (`USER`, `ADMIN`, `SUPERADMIN`).
- Disable any option whose selection would violate INV-1 (self) or INV-2 (last SUPERADMIN), with a Spanish tooltip explaining the restriction.
- When the user selects `USER`, surface an inline confirmation message in Spanish (e.g., "Esta acción revocará el rol de administrador.") before the submit button is enabled.
- On submit, call `PATCH /users/:id` with `{ role: <selected> }`.

The "Cambiar rol" action SHALL be hidden when the viewer's role is ADMIN.

#### Scenario: SUPERADMIN sees the Cambiar rol action

- **WHEN** a SUPERADMIN viewer is on the "Administradores" tab
- **THEN** every row displays a single "Cambiar rol" action subject to self-row (INV-1) and last-SUPERADMIN (INV-2) restrictions

#### Scenario: ADMIN sees no role-mutating action

- **WHEN** an ADMIN viewer is on the "Administradores" tab
- **THEN** rows display only the read-only "Ver historial" action

#### Scenario: Demoting to USER requires inline confirmation

- **WHEN** the SUPERADMIN selects `USER` in the unified dialog
- **THEN** the dialog displays a Spanish confirmation message
- **AND** the submit button submits `PATCH /users/:id` with `{ role: "USER" }`

### Requirement: Promote dialog (SUPERADMIN only)

The screen SHALL render a "Promover a admin" header action visible only to SUPERADMIN viewers. Clicking it SHALL open a dialog containing an autocomplete restricted to users with `role = USER` and a role selector with options ADMIN and SUPERADMIN. Submitting the dialog SHALL call `PATCH /users/:id` with `{ role: <selected> }` and, on success, close the dialog, invalidate the user list cache, and show a success snackbar in Spanish.

#### Scenario: SUPERADMIN promotes a USER to ADMIN

- **WHEN** a SUPERADMIN selects a USER and chooses "Administrador" in the dialog
- **AND** confirms the promotion
- **THEN** the system sends `PATCH /users/:id` with `{ role: "ADMIN" }`
- **AND** on success the dialog closes, the list refreshes, and a Spanish success snackbar appears

#### Scenario: ADMIN cannot open the promote dialog

- **WHEN** the viewer is an ADMIN
- **THEN** the "Promover a admin" header button is not rendered

### Requirement: Self-row protection in UI (INV-1)

The screen SHALL hide or disable any role-changing action targeting the current viewer's own row. This includes the "Cambiar rol" action on the viewer's own row in the Administradores tab.

#### Scenario: SUPERADMIN viewing their own row

- **WHEN** the row's `id` equals the current user's `id`
- **THEN** the "Cambiar rol" action is hidden or disabled for that row

### Requirement: Last-SUPERADMIN protection in UI (INV-2)

When the loaded user list contains exactly one user with `role = SUPERADMIN`, the screen SHALL disable, within the unified "Cambiar rol" dialog for that row, any option whose selection would demote the last SUPERADMIN (i.e., the `ADMIN` and `USER` options). A tooltip in Spanish SHALL explain why the option is disabled.

#### Scenario: Only one SUPERADMIN exists

- **WHEN** the loaded user list contains exactly one SUPERADMIN
- **THEN** the `ADMIN` and `USER` options inside the "Cambiar rol" dialog for that SUPERADMIN's row are disabled
- **AND** a tooltip explains the restriction

#### Scenario: Multiple SUPERADMINs exist

- **WHEN** more than one SUPERADMIN exists
- **THEN** demote actions are enabled (subject to other invariants like INV-1)

### Requirement: Role rendered via `UserRoleChip`

The role column on the table and any role display inside the role-history dialog SHALL render via a shared `UserRoleChip` component, mirroring the visual conventions of `OrganizationStatusChip`. The chip SHALL use Spanish labels ("Usuario" / "Administrador" / "Super Administrador") and source colors from the theme palette — no inline hex/rgb values. If a needed color is not yet present in the palette, it SHALL be added to `apps/web/src/theme/palette.ts` rather than hardcoded.

#### Scenario: Role column renders chip

- **WHEN** the table renders a row
- **THEN** the role cell renders a `UserRoleChip` whose label and color reflect the user's `SystemRole`

#### Scenario: History dialog renders chips for each transition

- **WHEN** the role-history dialog renders an entry
- **THEN** the previous-role and new-role labels render via `UserRoleChip`

### Requirement: Country-agnostic strings (INV-3)

All user-facing copy on the screen — sidebar label, tab labels, KPI titles, table headers, action button labels, dialog text, and error messages — SHALL be sourced from constants/vocab files (e.g., a `screens/Users/constants.ts` co-located with the screen, plus `getApiErrorMessage` for backend errors). The screen SHALL NOT contain country-specific identifiers, currencies, or regulatory references.

#### Scenario: Country override

- **WHEN** a country deployment overrides the constants/vocab files
- **THEN** the screen renders with the overridden labels without any code change to the screen itself

### Requirement: Spanish UI copy by default

All default user-facing strings on the screen SHALL be in Spanish, consistent with the rest of the application. Date formatting SHALL use the Spanish locale via `date-fns`.

#### Scenario: Default language

- **WHEN** no overrides are applied
- **THEN** all labels, buttons, snackbars, and tooltips render in Spanish

### Requirement: "Ver historial" row action and dialog

Each row on both tabs SHALL render a "Ver historial" action visible to ADMIN and SUPERADMIN viewers. Clicking it SHALL open a dialog that displays the user's role-transition history sourced from `GET /users/:id/role-history`, ordered most-recent first. Each entry SHALL show the date, the actor's display name, and the transition (e.g., "ADMIN → SUPERADMIN"). When the user has no recorded transitions, the dialog SHALL render an empty-state message in Spanish.

#### Scenario: ADMIN opens history for a user

- **WHEN** an ADMIN clicks "Ver historial" on any row
- **THEN** the dialog opens and renders the timeline returned by `GET /users/:id/role-history`

#### Scenario: SUPERADMIN opens history for a user

- **WHEN** a SUPERADMIN clicks "Ver historial" on any row
- **THEN** the dialog opens and renders the timeline returned by `GET /users/:id/role-history`

#### Scenario: User with no transitions

- **WHEN** the target user has no recorded role transitions
- **THEN** the dialog renders an empty-state message in Spanish (e.g., "Sin cambios de rol registrados.")

#### Scenario: History updates after a mutation

- **WHEN** a SUPERADMIN performs a role change for a user
- **AND** the dialog is reopened for that user
- **THEN** the new transition appears at the top of the timeline

### Requirement: Cache invalidation after mutations

After any successful role-changing mutation invoked from the screen, the user list query cache SHALL be invalidated so that the table, KPI cards, and the last-SUPERADMIN UI guard re-derive from fresh data.

#### Scenario: Successful demotion

- **WHEN** a SUPERADMIN successfully revokes another admin
- **THEN** the user list cache is invalidated
- **AND** the table, KPIs, and disable-state of remaining demote actions reflect the new state

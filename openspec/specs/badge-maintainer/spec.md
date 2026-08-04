# badge-maintainer Specification

## Purpose

This capability gives `SUPERADMIN` users a self-service screen and supporting API to curate platform recognition seals (badges) per `BadgeType`, replacing direct database and blob-storage edits. It covers listing the active badge and capped history per type with signed preview URLs, uploading new badges (created `INACTIVE`), explicitly activating or deactivating a badge, server-side validation of uploaded files, and enforcing the "at most one `ACTIVE` badge per type" invariant transactionally with user-visible warnings before any replace or remove.

## Requirements

### Requirement: Access restricted to SUPERADMIN

The system SHALL expose a Badge Maintainer screen and supporting API endpoints that are accessible only to users with `SystemRole.SUPERADMIN`. Users without that role SHALL NOT be able to load the screen or call any maintainer endpoint, regardless of whether they hold `ADMIN` or any other role. The existing badge upload endpoints `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload` SHALL be tightened from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]` as part of this change.

#### Scenario: SUPERADMIN opens the screen

- **WHEN** a user authenticated as `SUPERADMIN` navigates to `/admin/badges`
- **THEN** the screen loads and renders the badge catalog

#### Scenario: ADMIN attempts to open the screen

- **WHEN** a user authenticated as `ADMIN` (but not `SUPERADMIN`) navigates to `/admin/badges`
- **THEN** the client route guard redirects them to the admin dashboard and the "Sellos" sidebar entry is not shown

#### Scenario: Non-SUPERADMIN calls a new maintainer endpoint

- **WHEN** a user without `SUPERADMIN` sends a request to any of `GET /badges`, `POST /badges/:id/activate`, or `POST /badges/:id/deactivate`
- **THEN** the API responds with `403 Forbidden` and no state is changed

#### Scenario: ADMIN calls the now-tightened upload endpoints

- **WHEN** a user authenticated as `ADMIN` (but not `SUPERADMIN`) sends a request to `POST /files/badges/:badgeType/request-upload` or `POST /files/badges/:badgeType/confirm-upload`
- **THEN** the API responds with `403 Forbidden` (previously `2xx`) and no state is changed

### Requirement: Badge Maintainer screen layout and Spanish labels

The Badge Maintainer screen SHALL present a page header titled **"Sellos"** with the Spanish subtitle **"Gestión de sellos por tipo de reconocimiento"**, a **"Sellos"** entry in the Maintainer sidebar shown only to `SUPERADMIN` (highlighted while the screen is mounted), and a responsive grid of cards with one card per surfaced `BadgeType`. Cards SHALL be rendered in a fixed order (medición, verificación, reducción, then organization accreditation); the neutralization type is not currently surfaced on the screen.

Each card SHALL show the badge-type display name (in Spanish) as its title, an activation status chip indicating whether the type currently has an active badge, the active badge preview (or an empty-state placeholder when there is none), the active badge's file name and creation date, and a footer action row.

#### Scenario: Header and sidebar entry

- **WHEN** a `SUPERADMIN` loads the Badge Maintainer screen
- **THEN** the header shows "Sellos" with the subtitle "Gestión de sellos por tipo de reconocimiento", and the highlighted "Sellos" sidebar entry is visible

#### Scenario: Card grid ordering is deterministic

- **WHEN** the catalog is rendered
- **THEN** one card appears per surfaced badge type in the fixed order, so the visual ordering is deterministic

#### Scenario: Catalog fails to load

- **WHEN** the `GET /badges` request fails
- **THEN** the screen shows the Spanish error message "Error al cargar los sellos. Intenta recargar la página."

### Requirement: List all badges grouped by type

The system SHALL expose `GET /badges` that returns, for every value of the `BadgeType` enum, one group containing:

- `type`: the `BadgeType` value
- `active`: the currently `ACTIVE` badge for that type, or `null` if none exists
- `history`: an array of `INACTIVE` badges for that type, ordered by `createdAt` descending

Each badge item (whether in `active` or `history`) SHALL include:

- `id`: the badge id
- `type`: the badge type
- `status`: `ACTIVE` or `INACTIVE`
- `createdAt`: ISO datetime string
- `fileName`: original file name
- `mimeType`: the file mime type
- `previewUrl`: a short-lived read SAS URL generated via the same mechanism used by `getCarbonInventoryBadges`

The `history` array for each type SHALL be capped at the 20 most recent `INACTIVE` badges (by `createdAt` desc). Older entries SHALL be omitted from the response.

The response SHALL include an entry for every `BadgeType` value, even if no badges of that type exist (in which case `active` is `null` and `history` is empty).

#### Scenario: Catalog with badges present

- **WHEN** `GET /badges` is called and the database contains badges of several types
- **THEN** the response is `200` with one group per `BadgeType`, each populated with its `active` badge and `history` of inactive badges

#### Scenario: Catalog with no badges for some types

- **WHEN** `GET /badges` is called and no badges exist for a given `BadgeType`
- **THEN** that type still appears in the response with `active: null` and `history: []`

#### Scenario: Preview URLs are short-lived read SAS

- **WHEN** a badge appears in the response
- **THEN** its `previewUrl` is a signed SAS URL generated by the same helper used for other badge previews, with a bounded expiry

#### Scenario: History is capped at 20 per type

- **WHEN** a badge type has 25 `INACTIVE` badges
- **THEN** the response's `history` for that type contains the 20 most recent by `createdAt` desc, and the remaining 5 are omitted

### Requirement: Upload a new badge for a type creates an INACTIVE badge

The system SHALL allow a `SUPERADMIN` to upload a new badge file for a specific `BadgeType` by reusing the existing `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload` flow. A successful `confirm-upload` SHALL result in a new `Badge` row with `status = INACTIVE`. The currently-`ACTIVE` badge of the same type (if any) SHALL NOT be modified by the upload. Activation, if the operator wants the new badge to go live, SHALL be a separate call to `POST /badges/:id/activate`.

The `confirm-upload` endpoint SHALL return the created badge in the response body as `{ badge: BadgeDTO }`, where `BadgeDTO` has the same shape used by `GET /badges` (including `id`, `type`, `status = "INACTIVE"`, `createdAt`, `fileName`, `mimeType`, `previewUrl`).

#### Scenario: Upload when no active badge exists for the type

- **WHEN** a `SUPERADMIN` completes the request/confirm upload flow for `badgeType = X` and no `ACTIVE` badge of type `X` currently exists
- **THEN** a new `Badge` row is created with `type = X`, `status = INACTIVE`, and the uploaded `File` attached, and the response body includes the created `BadgeDTO`

#### Scenario: Upload when an active badge already exists for the type

- **WHEN** a `SUPERADMIN` completes the request/confirm upload flow for `badgeType = X` and an `ACTIVE` badge `B` of type `X` already exists
- **THEN** a new `Badge` row is created with `type = X`, `status = INACTIVE`, and `B.status` is unchanged (still `ACTIVE`), so the type has exactly one `ACTIVE` badge (`B`) plus the newly-uploaded `INACTIVE` one

#### Scenario: Response includes the created badge

- **WHEN** `confirm-upload` succeeds
- **THEN** the response body contains `{ badge: BadgeDTO }` with `status = "INACTIVE"` and a short-lived `previewUrl`, so the UI can display the new badge without refetching the catalog

#### Scenario: No state change on failure

- **WHEN** the confirm-upload transaction fails for any reason (validation error, blob missing, DB error)
- **THEN** no `Badge` row is created and the previously active badge (if any) remains `ACTIVE`

### Requirement: Server-side validation of uploaded badge files

The `POST /files/badges/:badgeType/confirm-upload` endpoint SHALL validate, server-side, that the uploaded file's mime type is in the badge allow-list (`image/png`, `image/svg+xml`, `image/jpeg`, `image/webp`) and that its size does not exceed a server-configured maximum (default 5 MB). If either check fails the endpoint SHALL respond with `400` and SHALL NOT create a `File` or `Badge` row. Client-side validation MAY also run, but server-side validation is authoritative.

#### Scenario: Valid file is accepted

- **WHEN** a `SUPERADMIN` completes `confirm-upload` with a file whose mime type is in the allow-list and whose size is within the maximum
- **THEN** the endpoint responds `2xx` and a new `Badge` row is created

#### Scenario: Disallowed mime type is rejected

- **WHEN** a `SUPERADMIN` completes `confirm-upload` with a file whose mime type is not in the allow-list
- **THEN** the endpoint responds `400`, no `Badge` row is created, and the previously `ACTIVE` badge of that type (if any) is unchanged

#### Scenario: Oversize file is rejected

- **WHEN** a `SUPERADMIN` completes `confirm-upload` with a file exceeding the configured maximum size
- **THEN** the endpoint responds `400`, no `Badge` row is created, and the previously `ACTIVE` badge of that type (if any) is unchanged

### Requirement: Change a badge's active state

The system SHALL expose two endpoints for changing the active state of a badge:

- `POST /badges/:id/activate` — promotes the badge to `ACTIVE`. The operation SHALL run as a single transaction that:
  1. Loads the target badge; returns `404` if not found.
  2. If the target is already `ACTIVE`, returns `200` with the current catalog entry for its type (idempotent no-op).
  3. Otherwise, sets `status = INACTIVE` on the currently `ACTIVE` row of the same type (if one exists), then sets `status = ACTIVE` on the target.

- `POST /badges/:id/deactivate` — demotes the badge to `INACTIVE` without activating any replacement. The operation SHALL run as a single transaction that:
  1. Loads the target badge; returns `404` if not found.
  2. If the target is already `INACTIVE`, returns `200` with the current catalog entry for its type (idempotent no-op).
  3. Otherwise, sets `status = INACTIVE` on the target. The type MAY be left with zero `ACTIVE` badges.

Both endpoints SHALL return the updated catalog entry for the affected type on success.

#### Scenario: Activate an inactive badge when a different one is active

- **WHEN** `POST /badges/:id/activate` is called for an `INACTIVE` badge `T` of type `X`, and a different badge `A` of type `X` is currently `ACTIVE`
- **THEN** the response is `200`, `A.status` becomes `INACTIVE`, `T.status` becomes `ACTIVE`, and both changes are applied atomically

#### Scenario: Activate when no other badge of that type is active

- **WHEN** `POST /badges/:id/activate` is called for an `INACTIVE` badge `T` of type `X` and no other badge of type `X` is currently `ACTIVE`
- **THEN** `T.status` becomes `ACTIVE` and the response is `200`

#### Scenario: Activating an already-active badge is a no-op

- **WHEN** `POST /badges/:id/activate` is called for a badge whose `status` is already `ACTIVE`
- **THEN** the response is `200` with no state change

#### Scenario: Activating a missing badge

- **WHEN** `POST /badges/:id/activate` is called with an unknown `id`
- **THEN** the response is `404`

#### Scenario: Deactivate the currently-active badge

- **WHEN** `POST /badges/:id/deactivate` is called for the currently `ACTIVE` badge `A` of type `X`
- **THEN** `A.status` becomes `INACTIVE`, no other badge is activated, the type is left with zero `ACTIVE` badges, and the response is `200`

#### Scenario: Deactivating an already-inactive badge is a no-op

- **WHEN** `POST /badges/:id/deactivate` is called for a badge whose `status` is already `INACTIVE`
- **THEN** the response is `200` with no state change

#### Scenario: Deactivating a missing badge

- **WHEN** `POST /badges/:id/deactivate` is called with an unknown `id`
- **THEN** the response is `404`

#### Scenario: Zero-active state is permitted

- **WHEN** the last `ACTIVE` badge of a type is deactivated
- **THEN** no database constraint is violated, the type remains in the catalog with `active: null`, and the just-deactivated badge appears in that type's `history`

### Requirement: Approval proceeds without a badge when no ACTIVE badge exists

When a submission is approved (via either the manual approval path or the automatic self-declaration path) and no `ACTIVE` badge exists for the submission's type, the system SHALL still approve the submission. The approved submission SHALL have `badgeId = null`. The system SHALL NOT raise an error or leave the submission in `PENDING` because of the missing badge.

The approval path SHALL NOT retroactively attach a badge to submissions that were approved with `badgeId = null`; a later activation of a badge of the same type applies only to subsequent approvals.

#### Scenario: Manual approval with no active badge

- **WHEN** a `SUPERADMIN` or reviewer manually approves a pending submission of type `X` and no `ACTIVE` badge of type `X` exists
- **THEN** the submission's `status` becomes `APPROVED` and its `badgeId` is `null`

#### Scenario: Automatic approval with no active badge

- **WHEN** the self-declaration flow auto-approves a submission of type `X` and no `ACTIVE` badge of type `X` exists
- **THEN** the submission's `status` becomes `APPROVED_AUTOMATICALLY` and its `badgeId` is `null`

#### Scenario: Later activation does not backfill

- **WHEN** a submission of type `X` was approved with `badgeId = null` and later a badge of type `X` is activated
- **THEN** the previously approved submission's `badgeId` remains `null`; only submissions approved after the activation receive the new badge

### Requirement: Enforce at most one ACTIVE badge per type

The system SHALL ensure that at any point in time there is at most one `Badge` row with `status = ACTIVE` for any given `BadgeType`. Zero `ACTIVE` badges for a type is a valid state. This invariant SHALL be enforced at the database layer by the existing partial unique index on `(type)` where `status = 'ACTIVE'`, and SHALL be preserved by every write path (upload confirm, activate, deactivate).

#### Scenario: Concurrent writes cannot produce two active badges for the same type

- **WHEN** two write operations attempt to leave two `Badge` rows with `status = ACTIVE` and the same `type`
- **THEN** the database rejects the second write via the partial unique index, and the final state contains at most one `ACTIVE` badge for that type

#### Scenario: Every activate path deactivates the incumbent before activating a new one

- **WHEN** a write operation activates a badge of type `X`
- **THEN** within the same transaction, any previously `ACTIVE` badge of type `X` is first set to `INACTIVE`

#### Scenario: Zero actives does not violate the invariant

- **WHEN** a write operation leaves a type with no `ACTIVE` badge (e.g. after deactivate, or when no badge has ever been uploaded for that type)
- **THEN** no database constraint is violated and the state is considered valid

### Requirement: Warn before replacing or removing the active badge

The Badge Maintainer screen SHALL display a confirmation dialog before performing any action that would replace — or remove — the currently `ACTIVE` badge of a given type. This covers two flows: activating a different badge for a type that already has an active one, and deactivating the currently active badge. Upload does NOT trigger the dialog, because upload no longer affects the active badge (it creates an `INACTIVE` badge). For the activate flow the dialog SHALL identify both the outgoing (currently active) and incoming (to-be-activated) badge with the title "Reemplazar sello activo". For the deactivate flow the dialog SHALL identify the outgoing badge under the title "Desactivar sello" and explicitly note that the type will have no active badge until the operator activates another. The destructive action SHALL NOT proceed until the operator explicitly confirms.

#### Scenario: Activate replaces an existing active badge

- **WHEN** a `SUPERADMIN` clicks "Activar" on an `INACTIVE` badge of type `X` and a different badge of type `X` is currently `ACTIVE`
- **THEN** before the `POST /badges/:id/activate` request is sent, a confirmation dialog titled "Reemplazar sello activo" is shown identifying both badges, and the activation only proceeds if the user confirms

#### Scenario: Deactivate the currently active badge shows a warning

- **WHEN** a `SUPERADMIN` clicks "Desactivar" on the currently `ACTIVE` badge of type `X`
- **THEN** before the `POST /badges/:id/deactivate` request is sent, a confirmation dialog titled "Desactivar sello" is shown identifying the badge being removed and stating that the type will have no active badge until one is activated, and the deactivation only proceeds if the user confirms

#### Scenario: Upload proceeds without a dialog

- **WHEN** a `SUPERADMIN` initiates an upload for `badgeType = X`, regardless of whether an `ACTIVE` badge of type `X` already exists
- **THEN** no confirmation dialog is shown; the upload creates an `INACTIVE` badge and the currently `ACTIVE` badge (if any) is unaffected

#### Scenario: No warning when activating a badge for a type with no incumbent

- **WHEN** a `SUPERADMIN` activates a badge for a type that has no currently `ACTIVE` badge
- **THEN** no confirmation dialog is shown and the activation proceeds directly

#### Scenario: User cancels the warning

- **WHEN** the confirmation dialog is shown and the user cancels
- **THEN** no request is sent and the catalog state is unchanged

### Requirement: Active badge and history are displayed on the maintainer screen

The Badge Maintainer screen SHALL render, for every surfaced `BadgeType`, one card containing the badge-type display name (in Spanish) as its title, an activation status chip, the active-badge preview area, and a footer action row with a "Ver historial (N)" button, a "Subir sello" button, and — when an active badge exists — a "Desactivar" button.

When a type has an `ACTIVE` badge, the preview area SHALL show that badge's preview centered, accompanied by its `fileName` and `createdAt`. When a type has no `ACTIVE` badge, the preview area SHALL instead show a dashed-border empty-state placeholder with the text "No hay sello activo", and the "Desactivar" button SHALL NOT be rendered.

The type's `INACTIVE` badges SHALL be presented in a "Historial de sellos" dialog opened from the "Ver historial (N)" button (disabled when history is empty). Each history entry SHALL show the badge thumbnail, `fileName`, `createdAt`, and an "Activar" button; a just-uploaded badge SHALL be highlighted with a "Recién subido · ¿Activar este sello?" prompt. A broken preview thumbnail SHALL render a retry affordance so the operator can reload it.

#### Scenario: Rendering a type that has an active badge

- **WHEN** `GET /badges` returns a group with `active` set for a type
- **THEN** the card shows the active badge's preview centered with its `fileName` and `createdAt`, and a "Desactivar" button is present in the footer

#### Scenario: Rendering a type with no active badge

- **WHEN** `GET /badges` returns a group with `active = null`
- **THEN** the card shows a dashed-border empty-state placeholder with the text "No hay sello activo" and no "Desactivar" button

#### Scenario: Viewing and activating from history

- **WHEN** a `SUPERADMIN` opens the "Ver historial (N)" dialog for a type that has inactive badges
- **THEN** the "Historial de sellos" dialog lists each inactive badge with its thumbnail, `fileName`, `createdAt`, and an "Activar" button

#### Scenario: Newly uploaded badge is highlighted in history

- **WHEN** a `SUPERADMIN` uploads a new badge for a type
- **THEN** the history dialog opens with the new `INACTIVE` badge highlighted and a "Recién subido · ¿Activar este sello?" prompt inviting activation

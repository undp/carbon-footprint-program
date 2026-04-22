## ADDED Requirements

### Requirement: Visual reference for the Badge Maintainer screen

The Badge Maintainer screen SHALL follow the layout and visual language captured in `openspec/files/admin-badges-page.png`, which is the authoritative mockup for this change. Subsequent UI requirements in this spec are grounded in that reference, and any deviation introduced during implementation SHOULD be justified in the PR description.

The reference establishes the following screen-level elements:

- A page header titled **"Gestión de Badges"** with a short Spanish subtitle describing the screen's purpose (e.g. "Administra los badges de reconocimiento por tipo. Sube nuevos badges, activa o desactiva los existentes.").
- A **"Badges"** entry in the Maintainer sidebar, shown only to `SUPERADMIN` users, that is highlighted as active while the screen is mounted.
- A responsive **grid of cards** under the header, with one card per `BadgeType`, rendered in the order defined by the `BadgeType` enum.
- Per-card content: badge-type name, an upload (cloud-up) affordance in the card's top-right corner, an "Badge activo" status line, the active badge preview area (or empty-state placeholder), the active badge's file name and `createdAt`, the primary state-change button (**DESACTIVAR** when active), and a collapsible/visible **"Historial"** section listing inactive badges with their own **ACTIVAR** buttons.

#### Scenario: Implementation matches the reference mockup

- **WHEN** the Badge Maintainer screen is implemented
- **THEN** the page header, sidebar entry, card grid, per-card layout, and Spanish labels match `openspec/files/admin-badges-page.png`, with any intentional deviation called out in the PR description

### Requirement: Access restricted to SUPERADMIN

The system SHALL expose a Badge Maintainer screen and supporting API endpoints that are accessible only to users with `SystemRole.SUPERADMIN`. Users without that role SHALL NOT be able to load the screen or call any maintainer endpoint, regardless of whether they hold `ADMIN` or any other role. The existing badge upload endpoints `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload` SHALL be tightened from `[SUPERADMIN, ADMIN]` to `[SUPERADMIN]` as part of this change.

#### Scenario: SUPERADMIN opens the screen

- **WHEN** a user authenticated as `SUPERADMIN` navigates to the Badge Maintainer route
- **THEN** the screen loads and renders the badge catalog

#### Scenario: ADMIN attempts to open the screen

- **WHEN** a user authenticated as `ADMIN` (but not `SUPERADMIN`) navigates to the Badge Maintainer route
- **THEN** the client route guard redirects them away from the screen and the "Badges" sidebar entry is not shown

#### Scenario: Non-SUPERADMIN calls a new maintainer endpoint

- **WHEN** a user without `SUPERADMIN` sends a request to any of `GET /badges`, `POST /badges/:id/activate`, or `POST /badges/:id/deactivate`
- **THEN** the API responds with `403 Forbidden` and no state is changed

#### Scenario: ADMIN calls the now-tightened upload endpoints

- **WHEN** a user authenticated as `ADMIN` (but not `SUPERADMIN`) sends a request to `POST /files/badges/:badgeType/request-upload` or `POST /files/badges/:badgeType/confirm-upload`
- **THEN** the API responds with `403 Forbidden` (previously `2xx`) and no state is changed

### Requirement: List all badges grouped by type

The system SHALL expose `GET /badges` that returns, for every value of the `BadgeType` enum, one group containing:

- `type`: the `BadgeType` value
- `active`: the currently `ACTIVE` badge for that type, or `null` if none exists
- `history`: an array of all `INACTIVE` badges for that type, ordered by `createdAt` descending

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

### Requirement: Upload a new badge for a type (creates INACTIVE)

The system SHALL allow a `SUPERADMIN` to upload a new badge file for a specific `BadgeType` by reusing the existing `POST /files/badges/:badgeType/request-upload` and `POST /files/badges/:badgeType/confirm-upload` flow. A successful `confirm-upload` SHALL result in a new `Badge` row with `status = INACTIVE`. The currently-`ACTIVE` badge of the same type (if any) SHALL NOT be modified by the upload. Activation, if the operator wants the new badge to go live, SHALL be a separate call to `POST /badges/:id/activate`.

The `confirm-upload` endpoint SHALL return the created badge in the response body as `{ badge: BadgeDTO }`, where `BadgeDTO` has the same shape used by `GET /badges` (including `id`, `type`, `status = "INACTIVE"`, `createdAt`, `fileName`, `mimeType`, `previewUrl`).

#### Scenario: Upload when no active badge exists for the type

- **WHEN** a `SUPERADMIN` completes the request/confirm upload flow for `badgeType = X` and no `ACTIVE` badge of type `X` currently exists
- **THEN** a new `Badge` row is created with `type = X`, `status = INACTIVE`, and the uploaded `File` attached, and the response body includes the created `BadgeDTO`

#### Scenario: Upload when an active badge already exists for the type

- **WHEN** a `SUPERADMIN` completes the request/confirm upload flow for `badgeType = X` and an `ACTIVE` badge `B` of type `X` already exists
- **THEN** a new `Badge` row is created with `type = X`, `status = INACTIVE`, and `B.status` is unchanged (still `ACTIVE`). The type continues to have exactly one `ACTIVE` badge (`B`) plus the newly-uploaded `INACTIVE` one.

#### Scenario: Response includes the created badge

- **WHEN** `confirm-upload` succeeds
- **THEN** the response body contains `{ badge: BadgeDTO }` with `status = "INACTIVE"` and a short-lived `previewUrl`, so the UI can display the new badge without refetching the catalog

#### Scenario: No state change on failure

- **WHEN** the confirm-upload transaction fails for any reason (validation error, blob missing, DB error)
- **THEN** no `Badge` row is created and the previously active badge (if any) remains `ACTIVE`

### Requirement: Server-side validation of uploaded badge files

The `POST /files/badges/:badgeType/confirm-upload` endpoint SHALL validate, server-side, that the uploaded file's mime type is in the badge allow-list (e.g. `image/png`, `image/svg+xml`, `image/jpeg`, `image/webp` — exact list confirmed against the current code) and that its size does not exceed a server-configured maximum (default 5 MB). If either check fails the endpoint SHALL respond with `400` and SHALL NOT create a `File` or `Badge` row. Client-side validation MAY also run, but server-side validation is authoritative.

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

The Badge Maintainer screen SHALL display a confirmation dialog before performing any action that would replace — or remove — the currently `ACTIVE` badge of a given type. This covers two flows: activating a different badge for a type that already has an active one, and deactivating the currently active badge. Upload does NOT trigger the dialog, because upload no longer affects the active badge (it creates an `INACTIVE` badge). The dialog SHALL identify the outgoing (currently active) badge and, for the activate flow, the incoming (to-be-activated) badge. For the deactivate flow, the dialog SHALL explicitly note that the type will have no active badge until the operator activates another. The destructive action SHALL NOT proceed until the operator explicitly confirms.

#### Scenario: Activate replaces an existing active badge

- **WHEN** a `SUPERADMIN` clicks "Activate" on an `INACTIVE` badge of type `X` and a different badge of type `X` is currently `ACTIVE`
- **THEN** before the `POST /badges/:id/activate` request is sent, a confirmation dialog is shown identifying both badges, and the activation only proceeds if the user confirms

#### Scenario: Deactivate the currently active badge shows a warning

- **WHEN** a `SUPERADMIN` clicks "Deactivate" on the currently `ACTIVE` badge of type `X`
- **THEN** before the `POST /badges/:id/deactivate` request is sent, a confirmation dialog is shown identifying the badge being removed and stating that the type will have no active badge until one is activated, and the deactivation only proceeds if the user confirms

#### Scenario: Upload proceeds without a dialog

- **WHEN** a `SUPERADMIN` initiates an upload for `badgeType = X`, regardless of whether an `ACTIVE` badge of type `X` already exists
- **THEN** no confirmation dialog is shown; the upload creates an `INACTIVE` badge and the currently `ACTIVE` badge (if any) is unaffected

#### Scenario: No warning when activating a badge for a type with no incumbent

- **WHEN** a `SUPERADMIN` activates a badge for a type that has no currently `ACTIVE` badge
- **THEN** no confirmation dialog is shown and the activation proceeds directly

#### Scenario: User cancels the warning

- **WHEN** the confirmation dialog is shown and the user cancels
- **THEN** no request is sent and the catalog state is unchanged

### Requirement: Active badge is displayed on the maintainer screen

The Badge Maintainer screen SHALL render, for every `BadgeType`, one card (per the layout in `openspec/files/admin-badges-page.png`) containing:

- the badge-type display name (in Spanish) as the card title,
- an upload affordance in the card's top-right corner (cloud-up icon) that opens the file picker for that type,
- a "Badge activo" status line with a small indicator,
- the currently `ACTIVE` badge's preview (rendered from its `previewUrl`) centered in the card, accompanied by the badge's `fileName` and `createdAt`,
- a **DESACTIVAR** button when an active badge exists, positioned at the bottom-right of the active-badge block,
- a **"Historial"** section listing the type's inactive badges, each row showing the thumbnail, `fileName`, `createdAt`, and an **ACTIVAR** button.

When a type has no `ACTIVE` badge, the preview area SHALL instead show an empty-state placeholder with the text "No hay badge activo" and a **SUBIR BADGE** call-to-action that opens the same upload flow as the top-right icon; the **DESACTIVAR** button SHALL not be rendered in that case. The "Historial" section SHALL still be shown (with an **ACTIVAR** button on each entry) when history exists, regardless of whether an active badge is present.

Inactive badges SHALL be visually distinguished from the active one (e.g., smaller thumbnails, separator line labeled "Historial") so operators can tell at a glance which badge is live.

#### Scenario: Rendering a type that has an active badge

- **WHEN** `GET /badges` returns a group with `active` set for a type
- **THEN** the card shows the active badge's preview centered, with `fileName`, `createdAt`, and a **DESACTIVAR** button; the "Historial" section lists any inactive badges below with an **ACTIVAR** button on each row

#### Scenario: Rendering a type with no active badge

- **WHEN** `GET /badges` returns a group with `active = null`
- **THEN** the card shows a dashed-border empty-state placeholder containing the text "No hay badge activo" and a **SUBIR BADGE** button, no **DESACTIVAR** button is rendered, and any `history` entries are still listed under "Historial" with an **ACTIVAR** action

#### Scenario: Upload affordance is always reachable from the card

- **WHEN** a `SUPERADMIN` views any card on the Badge Maintainer screen
- **THEN** the card exposes an upload entry point in the top-right corner (cloud-up icon); for empty-state cards, the central **SUBIR BADGE** button opens the same flow

#### Scenario: Card ordering follows the `BadgeType` enum

- **WHEN** the catalog is rendered
- **THEN** cards appear in the grid in the order defined by the `BadgeType` enum, so the visual ordering is deterministic and matches `openspec/files/admin-badges-page.png`

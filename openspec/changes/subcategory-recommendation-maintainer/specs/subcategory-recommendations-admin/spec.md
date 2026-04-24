## ADDED Requirements

### Requirement: Soft-delete and audit trail on SubcategoryRecommendation

The `SubcategoryRecommendation` model SHALL include a `status` field typed as `SubcategoryRecommendationStatus` (values: `ACTIVE`, `DELETED`) with default `ACTIVE`, together with nullable `createdById` and `updatedById` references to `User`. At most one `ACTIVE` row SHALL exist per `(sectorId, subsectorId, subcategoryId)` tuple; this invariant SHALL be enforced at the database layer by a partial unique index covering only rows where `status = 'ACTIVE'` (declared via raw SQL in the migration, since Prisma's schema DSL does not support partial unique indexes natively). DELETED rows SHALL be excluded from the index and MAY accumulate freely for historical audit.

#### Scenario: New rows default to ACTIVE

- **WHEN** a new `SubcategoryRecommendation` is inserted without specifying a status
- **THEN** the row is persisted with `status = ACTIVE`

#### Scenario: Soft-deleted rows remain in the table

- **WHEN** the admin update service removes a subcategory from a group
- **THEN** the corresponding row's `status` is set to `DELETED` and the row is retained in the database with a populated `updatedById`

#### Scenario: Re-adding a previously soft-deleted tuple is allowed

- **WHEN** a `(sectorId, subsectorId, subcategoryId)` tuple already exists with `status = DELETED`
- **AND** the admin create or update service inserts a new row for the same tuple
- **THEN** the insert succeeds, producing a fresh `ACTIVE` row and leaving the historical `DELETED` row untouched

### Requirement: Admin list endpoint groups ACTIVE recommendations

The API SHALL expose `GET /subcategory-recommendations`, restricted to users with `SystemRole.ADMIN` or `SystemRole.SUPERADMIN`, returning all `ACTIVE` recommendations grouped by `(sectorId, subsectorId)` and including the resolved `sectorName`, `subsectorName` (nullable), and the array of selected `subcategoryIds`.

#### Scenario: Admin fetches the grouped list

- **WHEN** an authenticated `ADMIN` or `SUPERADMIN` user calls `GET /subcategory-recommendations`
- **THEN** the response is `200` with an array of groups, each of shape `{ sectorId, subsectorId: number | null, sectorName, subsectorName: string | null, subcategoryIds: number[] }`, and groups contain only `ACTIVE` rows

#### Scenario: Non-admin users are forbidden

- **WHEN** an authenticated user without `ADMIN`/`SUPERADMIN` calls `GET /subcategory-recommendations`
- **THEN** the response is `403`

#### Scenario: Soft-deleted rows are excluded from groups

- **WHEN** one or more rows for a given `(sectorId, subsectorId)` group have `status = DELETED`
- **THEN** those rows are not included in any group returned by the list endpoint

### Requirement: Admin create endpoint rejects conflicting groups with 409

The API SHALL expose `POST /subcategory-recommendations` with body `{ sectorId: number, subsectorId: number | null, subcategoryIds: number[] }`, restricted to `SystemRole.ADMIN` and `SystemRole.SUPERADMIN`. The `subcategoryIds` array MUST contain at least one id. The service SHALL run inside a single `prisma.$transaction`: it first checks whether any `ACTIVE` row exists for `(sectorId, subsectorId)` and, if so, rejects the request with a `409 Conflict`. Otherwise, it inserts one `ACTIVE` row per submitted `subcategoryId` with `createdById = currentUser.id` and returns the refreshed group. If a concurrent writer commits first and the partial unique ACTIVE index rejects the insert with a Prisma `P2002` unique-constraint violation, the service SHALL translate that violation into the same `409 Conflict` response so the race path and the pre-check path share a single deterministic error surface.

#### Scenario: Successful creation

- **WHEN** an admin calls `POST /subcategory-recommendations` with `{ sectorId: 1, subsectorId: 2, subcategoryIds: [10, 20] }`
- **AND** no `ACTIVE` rows exist for `(sectorId=1, subsectorId=2)`
- **THEN** two new `ACTIVE` rows are created with `createdById` set to the current user and the response is `201` with the group `{ sectorId: 1, subsectorId: 2, sectorName, subsectorName, subcategoryIds: [10, 20] }`

#### Scenario: Conflict when an ACTIVE group already exists

- **WHEN** at least one `ACTIVE` row exists for `(sectorId=1, subsectorId=2)`
- **AND** an admin calls `POST` with the same `(sectorId, subsectorId)` tuple
- **THEN** the response is `409` with an error code indicating the group already exists, and no rows are inserted

#### Scenario: Concurrent POSTs for the same tuple are serialized by the partial unique index

- **WHEN** two admins call `POST` with the same `(sectorId, subsectorId)` tuple simultaneously and both pass the in-service pre-check before either commits
- **THEN** the partial unique ACTIVE index accepts exactly one insert; the other insert fails with a Prisma `P2002` unique-constraint violation, which the service translates to a `409 Conflict` response identical to the pre-check path, and the database retains only the winning admin's ACTIVE rows

#### Scenario: Creation after a full soft-delete succeeds

- **WHEN** every row for `(sectorId=1, subsectorId=2)` has `status = DELETED`
- **AND** an admin calls `POST` with `{ sectorId: 1, subsectorId: 2, subcategoryIds: [10] }`
- **THEN** a fresh `ACTIVE` row is created for `(1, 2, 10)` and the historical `DELETED` rows are left untouched

#### Scenario: Empty subcategoryIds is rejected

- **WHEN** an admin calls `POST` with `{ subcategoryIds: [] }`
- **THEN** the response is `400` (schema validation) and no rows are inserted

#### Scenario: Non-admin users are forbidden

- **WHEN** an authenticated user without `ADMIN`/`SUPERADMIN` calls the create endpoint
- **THEN** the response is `403` and no database state changes

### Requirement: Admin update endpoint idempotently bulk-replaces a group

The API SHALL expose `PUT /subcategory-recommendations?sectorId=<number>&subsectorId=<number|null>` with body `{ subcategoryIds: number[] }`, restricted to `SystemRole.ADMIN` and `SystemRole.SUPERADMIN`. The `subsectorId` query parameter encodes `null` by **omitting the parameter** or sending it with an **empty value** (`subsectorId=`); both forms MUST be accepted and treated as equivalent. Any non-integer, non-empty value (including the literal string `"null"`) MUST be rejected with `400 Bad Request`. Clients MUST omit `subsectorId` from the URL when the target tuple has a `null` subsector; the empty-value form is accepted only for tolerance. The service SHALL run inside a single `prisma.$transaction` and diff the submitted `subcategoryIds` against the existing `ACTIVE` rows for the given `(sectorId, subsectorId)` tuple: rows present only in the existing set are transitioned to `status = DELETED` with `updatedById = currentUser.id`; rows present only in the submitted set are created with `status = ACTIVE` and `createdById = currentUser.id`. The endpoint SHALL be idempotent — calling it on a tuple with no `ACTIVE` rows SHALL NOT error. No DELETE endpoint is exposed; an empty `subcategoryIds` array is the deletion path.

#### Scenario: Remove-only diff

- **WHEN** the existing `ACTIVE` set for `(sectorId=1, subsectorId=2)` is `[10, 20]`
- **AND** the admin calls `PUT` with `{ subcategoryIds: [10] }`
- **THEN** the row for subcategory `20` is soft-deleted with `updatedById` set to the current user, and the response's group has `subcategoryIds: [10]`

#### Scenario: Add-only diff

- **WHEN** the existing `ACTIVE` set for `(sectorId=1, subsectorId=2)` is `[10]`
- **AND** the admin calls `PUT` with `{ subcategoryIds: [10, 30] }`
- **THEN** a new `ACTIVE` row is created for `30` with `createdById` set to the current user, the row for `10` is untouched, and the response's group has `subcategoryIds: [10, 30]`

#### Scenario: Mixed diff

- **WHEN** the existing `ACTIVE` set is `[10, 20]`
- **AND** the admin calls `PUT` with `{ subcategoryIds: [10, 30] }`
- **THEN** the row for `20` is soft-deleted, a new `ACTIVE` row is created for `30`, the row for `10` is untouched, and the response's group has `subcategoryIds: [10, 30]`

#### Scenario: Empty array soft-deletes the entire group

- **WHEN** an admin calls `PUT` with `{ subcategoryIds: [] }`
- **THEN** every existing `ACTIVE` row in the group is transitioned to `DELETED`, the response is `200` with `subcategoryIds: []`, and subsequent `GET /subcategory-recommendations` calls do not return the group

#### Scenario: Idempotent empty-body on an already-empty group

- **WHEN** an admin calls `PUT` with `{ subcategoryIds: [] }` on a tuple that has no `ACTIVE` rows
- **THEN** the response is `200` with `subcategoryIds: []` and no database state changes

#### Scenario: Transactional atomicity

- **WHEN** any operation inside the update transaction fails
- **THEN** no row-level changes are persisted and the client receives an error

#### Scenario: Non-admin users are forbidden

- **WHEN** an authenticated user without `ADMIN`/`SUPERADMIN` calls the update endpoint
- **THEN** the response is `403` and no database state changes

#### Scenario: Audit fields are populated on create and soft-delete

- **WHEN** a row is created or soft-deleted via the update endpoint
- **THEN** the appropriate audit field (`createdById` on creation, `updatedById` on soft-delete) is set to the authenticated user's id

### Requirement: Consumer endpoint excludes soft-deleted recommendations

The endpoint `GET /carbon-inventories/:id/subcategory-recommendations` SHALL filter to rows with `status = SubcategoryRecommendationStatus.ACTIVE` in both `UNION` and `SPECIFIC` branches of its service implementation.

#### Scenario: Soft-deleted rows are excluded in SPECIFIC mode

- **WHEN** `SUBCATEGORY_RECOMMENDATION_MODE = SPECIFIC`
- **AND** the inventory's organization matches a `(sectorId, subsectorId)` group whose rows are all `DELETED`
- **THEN** the endpoint returns no subcategories for that group

#### Scenario: Soft-deleted rows are excluded in UNION mode

- **WHEN** `SUBCATEGORY_RECOMMENDATION_MODE = UNION`
- **AND** a subset of the matched rows has `status = DELETED`
- **THEN** only `ACTIVE` rows contribute to the returned subcategory list

### Requirement: Admin maintainer screen for subcategory recommendations

The web app SHALL render an admin-only screen at `/admin/subcategory-recommendations`, gated by `SystemRole.ADMIN` and `SystemRole.SUPERADMIN`, that lists recommendation groups in a `MaintainerDataGrid` with columns for Sector, Subsector, and Subcategorías. The screen SHALL register a new top-level entry in `SIDEBAR_DEFS` labeled "Recomendaciones de Subcategorías". The Subcategorías column SHALL display a chip preview and an "Editar" button opening a transfer-list dialog for multi-select editing. An "Agregar" button SHALL insert a temp row at the top of the grid for creating a new group. The screen SHALL NOT include a dedicated row-delete action; the only deletion path is emptying the transfer list and saving.

#### Scenario: Admin opens the maintainer screen

- **WHEN** an `ADMIN` or `SUPERADMIN` user navigates to `/admin/subcategory-recommendations`
- **THEN** the screen renders the grid populated from `GET /subcategory-recommendations`

#### Scenario: Non-admin users are redirected by the route guard

- **WHEN** a user without `ADMIN`/`SUPERADMIN` navigates to `/admin/subcategory-recommendations`
- **THEN** the route guard redirects per the existing `requireRole` pattern

#### Scenario: Temp rows save via POST

- **WHEN** the admin clicks "Agregar", fills `(sector, subsector)` on the temp row, opens the transfer list, selects at least one subcategory, and saves
- **THEN** the screen fires the create mutation (`POST /subcategory-recommendations`) and, on success, the temp row is replaced by the refreshed group returned by the server

#### Scenario: POST conflict surfaces a Spanish error and keeps the temp row

- **WHEN** the admin saves a temp row whose `(sector, subsector)` matches an existing `ACTIVE` group
- **THEN** the server returns `409`, the frontend displays a Spanish error message prompting the admin to edit the existing group, and the temp row remains in the grid so the admin can change the tuple or dismiss it

#### Scenario: Existing rows save via PUT

- **WHEN** the admin clicks "Editar" on a persisted row's Subcategorías column, modifies the selection, and saves
- **THEN** the screen fires the update mutation (`PUT /subcategory-recommendations?sectorId=&subsectorId=`) with the new `subcategoryIds`

#### Scenario: Empty save on an existing row triggers a confirmation dialog

- **WHEN** the admin saves an existing row whose `subcategoryIds` array is empty
- **THEN** a confirmation dialog titled "¿Eliminar todas las recomendaciones de este grupo?" is shown, and the update mutation fires only upon confirmation

#### Scenario: Temp rows cannot be saved empty

- **WHEN** the transfer list is opened from a temp row and the admin attempts to save with no subcategory selected
- **THEN** the Save button is disabled and no mutation fires

### Requirement: Null-subsector label reflects the active mode

The maintainer screen SHALL read the `SUBCATEGORY_RECOMMENDATION_MODE` system parameter and label a `null` subsector as "Todos los subsectores" when the mode is `UNION` and as "Sin subsector especificado" when the mode is `SPECIFIC`. The screen SHALL NOT attempt to migrate rows if the mode changes; existing rows retain their original semantic.

#### Scenario: UNION mode renders the wildcard label

- **WHEN** `SUBCATEGORY_RECOMMENDATION_MODE = UNION`
- **THEN** rows with `subsectorId = null` display the label "Todos los subsectores" and the subsector selector offers the same option

#### Scenario: SPECIFIC mode renders the explicit-null label

- **WHEN** `SUBCATEGORY_RECOMMENDATION_MODE = SPECIFIC`
- **THEN** rows with `subsectorId = null` display the label "Sin subsector especificado" and the subsector selector offers the same option

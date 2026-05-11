## ADDED Requirements

### Requirement: Per-line attachment dialog on Emission Capture screen

The system SHALL open a multi-file attachment dialog when the user activates the folder icon on an emission line in the Emission Capture screen. The dialog SHALL allow uploading new files, listing existing and pending files, previewing each file, and deleting each file.

#### Scenario: Open dialog on a line with no attachments
- **WHEN** the user clicks the folder icon on an emission line that has no files
- **THEN** the dialog opens with an empty list and a file picker

#### Scenario: Open dialog on a line with existing linked files
- **WHEN** the user clicks the folder icon on a line whose server response included one or more `files[]`
- **THEN** the dialog lists each file with its name, size, preview action, and delete action

#### Scenario: Open dialog on a temporary (unsaved) line
- **WHEN** the user adds a new emission line ("Agregar Fuente") and clicks the folder icon before saving
- **THEN** the dialog opens and uploads are allowed; uploaded files are tagged "Pendiente de guardar"

### Requirement: Real-time file upload to inventory-scoped blob path

The system SHALL upload selected files immediately upon selection by calling the inventory-scoped upload endpoints. Each uploaded file SHALL be stored at blob path `CARBON_INVENTORY/{inventoryId}/LINES/{uuid}-{originalName}` and SHALL produce a `File` row with status ACTIVE.

#### Scenario: Successful upload
- **WHEN** the user picks a valid file in the dialog
- **THEN** the client calls `POST /carbon-inventories/:id/files/request-upload`, PUTs the file to the returned SAS URL, then calls `POST /carbon-inventories/:id/files/confirm-upload`
- **AND** a `File` row is created with `blobPath` starting with `CARBON_INVENTORY/{inventoryId}/LINES/`
- **AND** the file appears in the dialog list with the "Pendiente de guardar" tag

#### Scenario: Upload by parallel selection
- **WHEN** the user selects multiple files at once
- **THEN** the client uploads them in parallel and each appears in the list as it confirms

### Requirement: Server-side mime and size validation

The confirm-upload endpoint SHALL reject files whose real (blob-storage-reported) `mimeType` is not in `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` or whose `sizeBytes` exceeds `MAX_FILE_SIZE_BYTES`.

#### Scenario: Disallowed mime type
- **WHEN** the client confirms an upload whose real mime type is outside the allowlist
- **THEN** the API responds with 422 and the `File` row is not created

#### Scenario: Oversized file
- **WHEN** the client confirms an upload whose real size exceeds `MAX_FILE_SIZE_BYTES`
- **THEN** the API responds with 422 and the `File` row is not created

### Requirement: Authorization on inventory-scoped upload endpoints

The two new endpoints (`POST /carbon-inventories/:id/files/request-upload` and `POST /carbon-inventories/:id/files/confirm-upload`) SHALL be gated by `requireCarbonInventoryAccess` requiring the `CONTRIBUTOR` or `ADMIN` organization role.

#### Scenario: User without access
- **WHEN** an authenticated user without CONTRIBUTOR or ADMIN access on the inventory calls either endpoint
- **THEN** the API responds with 403

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated request hits either endpoint
- **THEN** the API responds with 401

### Requirement: Real-time preview and delete of pending files

The dialog SHALL allow previewing any uploaded file via the existing `GET /files/:uuid/preview` endpoint and deleting a pending (not-yet-linked) file via the existing `DELETE /files/:uuid` endpoint.

#### Scenario: Preview a pending file
- **WHEN** the user clicks the preview action on a pending file
- **THEN** the SAS URL returned by `/files/:uuid/preview` is opened in a new tab

#### Scenario: Delete a pending file
- **WHEN** the user clicks the delete action on a pending file
- **THEN** `DELETE /files/:uuid` soft-deletes the `File` and the row is removed from the dialog list

### Requirement: Deferred unlink of already-linked files

When the user deletes a file that is already linked to a saved line, the dialog SHALL move the file's id from `files` to `removedFileIds` in form state and visually filter it out. The actual unlink and soft-delete SHALL fire only when the user saves the form.

#### Scenario: Mark linked file for deletion
- **WHEN** the user clicks delete on a linked file
- **THEN** the file's id is appended to the line's `removedFileIds`
- **AND** the file disappears from the visible list
- **AND** no API call is made until form save

#### Scenario: Cancel dialog after marking for deletion
- **WHEN** the user cancels the dialog after marking a linked file for deletion
- **THEN** the snapshot taken on dialog open is restored, returning the id to `files` and clearing it from `removedFileIds`

### Requirement: Atomic line + file linking on form save

The `syncCarbonInventoryLines` request SHALL accept `addFileUuids` (on create and update items) and `removeFileIds` (on update items). The handler SHALL, within the existing `prisma.$transaction`, create or delete `CarbonInventoryLineFile` rows alongside the line operations. Unlink SHALL also soft-delete the corresponding `File` rows.

#### Scenario: Save a new line with pending uploads
- **WHEN** the user saves a new (temp) line whose dialog had pending uploads
- **THEN** within a single transaction the line is created and a `CarbonInventoryLineFile` row is created for each `addFileUuid`

#### Scenario: Save an updated line with new uploads and deletions
- **WHEN** the user saves an existing line that has both new pending uploads and linked files marked for deletion
- **THEN** within a single transaction the new junction rows are created, the removed junction rows are deleted, and the corresponding `File` rows are soft-deleted

#### Scenario: Idempotent unlink
- **WHEN** the same `removeFileIds` list is sent twice (e.g., retry)
- **THEN** the second call is a no-op (missing junction or already-DELETED `File` rows are silently skipped)

### Requirement: Cross-inventory file linking is rejected

The sync handler SHALL reject any `addFileUuids` whose corresponding `File.blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/`. The rejection SHALL happen before any line is mutated within the transaction.

#### Scenario: Attempt to link a file from another inventory
- **WHEN** a user with access to inventory A submits `addFileUuids` referencing a file uploaded to inventory B
- **THEN** the API responds with 422
- **AND** no line or junction is created or modified

### Requirement: `getCarbonInventoryById` returns files per ACTIVE line

The `GET /carbon-inventories/:id` response SHALL expose `files: LineFileSummary[]` on each ACTIVE line. The summary SHALL contain `id, uuid, originalName, mimeType, sizeBytes, createdAt`. Files of soft-deleted lines SHALL NOT be returned.

#### Scenario: Inventory with mixed line states
- **WHEN** the inventory has both ACTIVE and soft-deleted lines, each with files
- **THEN** the response returns `files` only for the ACTIVE lines

#### Scenario: ACTIVE line with deleted files
- **WHEN** an ACTIVE line has a junction row pointing to a `File` whose status is DELETED
- **THEN** the deleted file is excluded from the line's `files` array

### Requirement: Sync response carries refreshed files per line

The `syncCarbonInventoryLines` response SHALL include the refreshed `files: LineFileSummary[]` on each returned line so the client can replace its form state in one beat (pending → existing) and clear `removedFileIds`.

#### Scenario: Successful sync of a line with new uploads
- **WHEN** the user saves a line with pending uploads
- **THEN** the response's line entry contains `files[]` reflecting the now-linked files
- **AND** the client clears the line's `removedFileIds` and pending tags

### Requirement: Badge dot indicates attachment state on the actions cell

The line's actions cell SHALL render a colored badge dot on the folder icon based on attachment state:

- `theme.palette.warning.main` if any pending (unsaved) files exist on the line.
- `theme.palette.primary.main` if only linked files exist.
- No badge if both `files.length === 0` and `removedFileIds.length === 0`.

#### Scenario: Line with pending uploads
- **WHEN** the line has at least one file with `isPending: true`
- **THEN** the badge is rendered with `theme.palette.warning.main`

#### Scenario: Line with only linked files
- **WHEN** the line has files but none are pending
- **THEN** the badge is rendered with `theme.palette.primary.main`

#### Scenario: Line with no attachments
- **WHEN** the line has no files and no removed file ids
- **THEN** no badge is rendered

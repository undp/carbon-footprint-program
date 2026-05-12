## Why

The folder icon on each row of the Emission Capture screen has no behavior — `onUploadFiles` is currently a TODO. Users measuring their carbon footprint need to attach evidentiary documents (invoices, meter readings, calculation sheets) to each emission line so that submissions can be substantiated during verification. Without per-line file attachments, supporting documentation has to live outside the inventory, breaking the audit trail.

## What Changes

- Add a multi-file attachment dialog opened from the folder icon on each emission line in the Emission Capture screen. The dialog allows uploading, listing, previewing, and deleting files **per emission line**.
- Persist files in real time (so users can preview/delete immediately) but defer the **line ↔ file link** to the existing `syncCarbonInventoryLines` form-submit transaction.
- Introduce a new junction model `CarbonInventoryLineFile (lineId, fileId)` mirroring `SubmissionFile`.
- Add a new `FileType` enum value `CARBON_INVENTORY` with blob path `CARBON_INVENTORY/{inventoryId}/LINES/{uuid}-{name}` (inventory-scoped, line-agnostic — no two-phase copy).
- Add two new auth-scoped API endpoints under the inventory feature:
  - `POST /carbon-inventories/:id/files/request-upload`
  - `POST /carbon-inventories/:id/files/confirm-upload`
- Extend `syncCarbonInventoryLines` request schema with `addFileUuids` (create + update) and `removeFileIds` (update); response now returns `files[]` per line.
- Extend `getCarbonInventoryById` to return `files[]` for each ACTIVE line.
- Show a badge dot on the line's actions cell with distinct color for **pending** uploads vs. **already-linked** files.
- Reject cross-inventory file linking: server validates `addFileUuids` resolve to files whose `blobPath` starts with `CARBON_INVENTORY/{inventoryId}/LINES/`.
- Validate uploads server-side against a shared mime allowlist + max size (new `packages/constants/src/file.ts`), reused by the web `FileUpload` component.
- Soft-deleted lines keep their junction rows and blobs; `getCarbonInventoryById` only returns ACTIVE lines, so attachments of deleted lines are not surfaced. No active cleanup.
- Temp client-side lines (`temp-` IDs) accept uploads in the dialog; linking happens atomically when the form is saved (line + junction created in one transaction).
- Read-only / locked-state file viewing is **out of scope** for this change.
- Orphan-file cleanup (uploaded then never linked) is **deferred** to a future sweep job.

## Capabilities

### New Capabilities

- `emission-capture-line-files`: Per-emission-line file attachments in the Carbon Inventory Emission Capture screen — covers the upload/preview/delete dialog, the line↔file link persisted by the sync flow, the inventory-scoped upload endpoints, and the cross-inventory-linking and mime/size validation rules.

### Modified Capabilities

(none — no existing spec covers carbon inventory emission capture)

## Impact

- **Database**: new table `carbon_inventory_line_file`; new reverse relations on `CarbonInventoryLine`, `File`, `User`. Requires a Prisma migration (run manually).
- **API**: two new endpoints under `apps/api/src/features/carbonInventories/`; extension of `syncCarbonInventoryLines` and `getCarbonInventoryById` services + mappers; new helper functions for link/unlink within the existing sync transaction.
- **Shared types** (`packages/types`): `RouteFileTypeSchema` extended with `CARBON_INVENTORY`; new request/response schemas for the two new endpoints; `addFileUuids` / `removeFileIds` and per-line `files[]` added to sync schemas; `files[]` per line added to the inventory-by-id response.
- **Shared constants** (`packages/constants`): new `file.ts` with `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES`.
- **Frontend**: new `EmissionEditorFilesDialog` component, new upload hook, new badge state on the actions cell, extended form-line shape (`files`, `removedFileIds`), extended submit payload builder. Reuses existing `FileUpload`, `formatFileSize`, file preview/delete endpoints.
- **No country-specific logic**: all new constants are deployment-shared; matches the country-agnosticism principle.
- **Backwards compatibility**: schema extensions use defaults (`addFileUuids: []`, `removeFileIds: []`, `files: []`) — existing API consumers are unaffected.

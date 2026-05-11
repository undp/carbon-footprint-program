# Carbon Inventory Line Files

Per-emission-line file attachments for the Emission Capture screen. Lets users upload, preview, and delete evidentiary documents (invoices, meter readings, calculation sheets) on each line so submissions can be substantiated during verification without breaking the audit trail.

## Junction model

The `CarbonInventoryLineFile` table is a junction between `CarbonInventoryLine` and `File`. One file is attached to exactly one line; one line can have many files.

| Column          | Type        | Notes                                                                                                                                                                                  |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line_id`       | `bigint`    | FK → `carbon_inventory_line.id`. `ON DELETE CASCADE` to prevent orphan rows on hard delete.                                                                                            |
| `file_id`       | `bigint`    | FK → `file.id`. `ON DELETE RESTRICT` — the junction is the source of truth for attached state. Has a **unique** constraint to enforce the one-file-per-line invariant at the DB level. |
| `created_at`    | `timestamp` | Defaults to `now()`. Audit only.                                                                                                                                                       |
| `created_by_id` | `bigint?`   | FK → `user.id`. Nullable for backfills / system-created links.                                                                                                                         |

- **Primary key**: composite `(line_id, file_id)` — idempotency for `createMany({ skipDuplicates: true })`.
- **Unique index**: `(file_id)` — guarantees a `File` can only be linked to one line. The application checks this before insert and raises `FileAlreadyLinkedError` (422); the unique constraint makes the invariant non-bypassable at the DB level.

## File-type and blob path

A new `FileType` enum value `CARBON_INVENTORY` is added to `RouteFileTypeSchema` (`packages/types/src/baseSchemas/file.ts`). Files for this domain are written to:

```
CARBON_INVENTORY/{inventoryId}/LINES/{uuid}-{sanitized-original-name}
```

The path is built via the existing `buildBlobPath` helper with `fileType: "CARBON_INVENTORY"`, `groupKey: inventoryId`, `subPath: "LINES"`. It is inventory-scoped and line-agnostic — at upload time the `lineId` may not yet exist (temp client-side lines), so the inventory id is the only stable anchor.

## Endpoints

Both endpoints are auth-gated by `requireCarbonInventoryAccess` requiring `CONTRIBUTOR` or `ADMIN` organization role.

- `POST /carbon-inventories/:id/files/request-upload`
  - Body: `{ originalName }`
  - Returns `{ uuid, uploadUrl, expiresAt }` for a direct PUT to Azure Blob.
- `POST /carbon-inventories/:id/files/confirm-upload`
  - Body: `{ uuid, originalName }`
  - Reads the real `mimeType` and `sizeBytes` from blob metadata, validates against `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES` (both in `@repo/constants`).
  - On validation failure: deletes the blob and responds with **422**.
  - On success: creates the `File` row with `status = ACTIVE`, returns `{ uuid }`.

## Link / unlink semantics

Junction rows are only mutated inside the existing `syncCarbonInventoryLines` transaction:

- `addFileUuids` (on create and update items): the helper dedupes the input, then validates in three steps inside the transaction:
  1. Resolve each unique UUID against `File` rows with `status = ACTIVE`. A UUID that does not resolve raises `MissingFilesError` (HTTP **404**, code `MISSING_FILES`).
  2. Check each resolved file's `blobPath` starts with `CARBON_INVENTORY/{inventoryId}/LINES/`. This **prefix invariant** is what blocks cross-inventory linking — a user with access to inventory A cannot link a uuid uploaded against inventory B. A failed prefix check raises `CrossInventoryFileLinkingError` (HTTP **422**, code `CROSS_INVENTORY_FILE_LINKING`).
  3. Check that none of the resolved files are already linked to a different line. If any are, raise `FileAlreadyLinkedError` (HTTP **422**, code `FILE_ALREADY_LINKED`). The DB-level unique constraint on `file_id` is the authoritative guarantee; this check just produces a meaningful error instead of a raw P2002.
     In all three cases the transaction is rolled back before any line or junction is mutated.
- `removeFileIds` (on update items): scoped to the target `lineId` — the helper first finds the intersection of `removeFileIds` with junction rows that actually point at this line, then deletes those junction rows and soft-deletes the corresponding `File` rows. A crafted payload referencing files attached to other lines (or no line) is a silent no-op for those ids. Idempotent — re-applying the same `removeFileIds` is a no-op.
- Soft-deleted lines keep their junction rows and `File` rows untouched. `getCarbonInventoryById` filters lines to `status = ACTIVE` and `file.status = ACTIVE`, so deleted lines / deleted files are not surfaced.

Orphan blobs (uploads that never get linked, e.g. user closed the tab) are not actively cleaned up. A future sweep job will reclaim them by walking the `CARBON_INVENTORY/{inventoryId}/LINES/` prefix and filtering out files with junction rows.

## Read path

`getCarbonInventoryById` and `syncCarbonInventoryLines` both return `files: LineFileSummary[]` per ACTIVE line, where `LineFileSummary = { id, uuid, originalName, mimeType, sizeBytes, createdAt }`. The frontend uses this canonical shape to replace its form state after a successful sync (clearing the `isPending` markers).

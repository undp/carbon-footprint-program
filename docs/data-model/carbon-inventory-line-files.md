# Carbon Inventory Line Files

Per-emission-line file attachments for the Emission Capture screen. Lets users upload, preview, and delete evidentiary documents (invoices, meter readings, calculation sheets) on each line so submissions can be substantiated during verification without breaking the audit trail.

## Junction model

The `CarbonInventoryLineFile` table is a junction between `CarbonInventoryLine` and `File`. One file is attached to exactly one line; one line can have many files.

| Column          | Type        | Notes                                                                                          |
| --------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `line_id`       | `bigint`    | FK → `carbon_inventory_line.id`. `ON DELETE CASCADE` to prevent orphan rows on hard delete.    |
| `file_id`       | `bigint`    | FK → `file.id`. `ON DELETE RESTRICT` — the junction is the source of truth for attached state. |
| `created_at`    | `timestamp` | Defaults to `now()`. Audit only.                                                               |
| `created_by_id` | `bigint?`   | FK → `user.id`. Nullable for backfills / system-created links.                                 |

- **Primary key**: composite `(line_id, file_id)` — idempotency for `createMany({ skipDuplicates: true })`.
- **Secondary index**: `(file_id)` — supports reverse lookups (e.g. "where is this file attached?").

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

- `addFileUuids` (on create and update items): resolved to `File.id` via `findMany` filtered by `status = ACTIVE` **and** `blobPath` starts with `CARBON_INVENTORY/{inventoryId}/LINES/`. This **prefix invariant** is what blocks cross-inventory linking — a user with access to inventory A cannot link a uuid uploaded against inventory B. If any uuid fails to resolve, the transaction is rolled back with `MissingFilesError` (404).
- `removeFileIds` (on update items): deletes matching junction rows and soft-deletes the `File` (`status = DELETED, deletedAt = now`). Idempotent — re-applying the same `removeFileIds` is a no-op.
- Soft-deleted lines keep their junction rows and `File` rows untouched. `getCarbonInventoryById` filters lines to `status = ACTIVE` and `file.status = ACTIVE`, so deleted lines / deleted files are not surfaced.

Orphan blobs (uploads that never get linked, e.g. user closed the tab) are not actively cleaned up. A future sweep job will reclaim them by walking the `CARBON_INVENTORY/{inventoryId}/LINES/` prefix and filtering out files with junction rows.

## Read path

`getCarbonInventoryById` and `syncCarbonInventoryLines` both return `files: LineFileSummary[]` per ACTIVE line, where `LineFileSummary = { id, uuid, originalName, mimeType, sizeBytes, createdAt }`. The frontend uses this canonical shape to replace its form state after a successful sync (clearing the `isPending` markers).

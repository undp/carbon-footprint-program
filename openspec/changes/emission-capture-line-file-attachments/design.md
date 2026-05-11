## Context

The Emission Capture screen lets users record measured emissions per subcategory. Each emission line currently exposes a folder icon (`SourceOutlined`) wired to a no-op `onUploadFiles` callback at `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditor.tsx:71-73`. The platform already has well-established file infrastructure: an `apps/api/src/features/files/*` domain with `request-upload`/`confirm-upload`/`preview`/`download`/`delete` endpoints, a `buildBlobPath` helper, an Azure Blob `blobService` exposing SAS URLs, and a reusable web `FileUpload` component used by submissions and reduction projects. Submissions already use a `SubmissionFile` junction model.

Constraints:
- Country-agnostic: no country-specific code paths; all configurable values (mime allowlist, max size) live in `packages/constants` so each deployment shares the same defaults but can override via seed/system parameters in the future.
- Tests are out of scope per user feedback.
- Migrations are run manually by the user (no auto `prisma migrate`).
- The existing `syncCarbonInventoryLines` endpoint already wraps line CRUD in a `prisma.$transaction`; new logic must extend that transaction rather than introduce new write paths.

## Goals / Non-Goals

**Goals:**

- Wire the per-line folder icon to a multi-file upload/preview/delete dialog.
- Real-time CRUD on `File` rows (upload, preview, delete) so the user gets immediate visual feedback.
- Defer only the `CarbonInventoryLineFile` junction creation/deletion to the existing form-submit transaction, keeping the line↔file link consistent with line creation/update/deletion.
- Support uploads on temp (client-side `temp-` ID) lines: the file is uploaded immediately, the link is created atomically when the line is saved.
- Reuse all existing file endpoints (`/files/:uuid/preview`, `/files/:uuid`, `DELETE /files/:uuid`) without modification.
- Reject cross-inventory file linking by enforcing a blob-path prefix invariant.
- Validate uploads against a shared mime allowlist + max size on the server (final check) and on the client (UX hint).
- Keep schema changes backwards-compatible (defaults on all new fields).

**Non-Goals:**

- Read-only / locked-state file viewing (separate PR).
- Orphan-file cleanup job for never-linked uploads (deferred sweep).
- Active blob deletion on line/file removal — files are only soft-deleted.
- Reusing `File` rows across different inventories.
- Tests (per project memory).

## Decisions

### 1. Real-time `File` CRUD; deferred junction link

**Decision**: Files are created/deleted immediately via existing `/files/*` endpoints. Only the `CarbonInventoryLineFile` row is created/deleted as part of the form-submit transaction in `syncCarbonInventoryLines`.

**Rationale**: Users need to preview/delete uploads without waiting for form submit (matches the UX of submissions). Tying the link to the sync transaction keeps line + link consistent — if line creation fails, the junction is rolled back; if the user abandons the form, files exist as orphans (cleaned up by a future sweep job).

**Alternatives considered**:
- *Two-phase upload* (temp blob path → copy to final on submit): rejected — `inventoryId` is known at upload time (route param), so we can write directly to the final path. Avoids a copy step and dual-blob lifecycle.
- *Eager link with self-cleanup on cancel*: rejected — would require a separate "discard" endpoint and complicates client state.

### 2. Inventory-scoped, line-agnostic blob path

**Decision**: `CARBON_INVENTORY/{inventoryId}/LINES/{uuid}-{originalName}`. Built via the existing `buildBlobPath` with `fileType=CARBON_INVENTORY`, `groupKey=inventoryId`, `subPath=LINES`.

**Rationale**: `lineId` is unknown for temp lines at upload time; using inventory scope avoids two-phase upload. The `LINES/` subPath prefix scopes ownership to the inventory and makes cross-inventory linking detectable via path prefix check.

**Trade-off**: Files exist outside any specific line until the link is created. Acceptable because the prefix check (decision 5) blocks cross-inventory linking, and the orphan-sweep job will reclaim never-linked uploads.

### 3. New `FileType.CARBON_INVENTORY` enum value

**Decision**: Extend `RouteFileTypeSchema` in `packages/types/src/baseSchemas/file.ts` from `["SUBMISSION", "BADGE", "LEGAL"]` to `["SUBMISSION", "BADGE", "LEGAL", "CARBON_INVENTORY"]`.

**Rationale**: `buildBlobPath` is keyed on file type; reusing an existing type would conflate ownership domains and break the prefix invariant.

### 4. New auth-scoped upload endpoints under the inventory feature

**Decision**: Add `POST /carbon-inventories/:id/files/request-upload` and `POST /carbon-inventories/:id/files/confirm-upload`, gated by `requireCarbonInventoryAccess(idRequestExtractor, { requiredOrganizationRoles: [CONTRIBUTOR, ADMIN] })`.

**Rationale**: Mirrors the existing per-domain pattern (`files/badge/{badgeType}/...`). Co-locating with the inventory feature lets us inject `:id` into the auth check and the blob path in one place. Keeps the generic `/files/*` endpoints free of inventory-specific concerns.

**Alternatives considered**:
- *Generic `/files/request-upload?type=CARBON_INVENTORY&groupKey=:id`*: rejected — auth would have to dispatch on body shape, and the inventory check requires a route-param extractor.

### 5. Cross-inventory linking guard

**Decision**: When `addFileUuids` are processed in `syncCarbonInventoryLines`, validate that each file's `blobPath` starts with `CARBON_INVENTORY/{inventoryId}/LINES/`. Reject otherwise.

**Rationale**: A user with access to inventory A could otherwise pass a uuid from inventory B and link it. The path prefix is set at upload time and is tamper-resistant. Cheaper than a separate ownership column.

### 6. Junction model + soft-delete semantics

**Decision**: New `CarbonInventoryLineFile (lineId, fileId, createdAt, createdById)` with `@@id([lineId, fileId])` and `onDelete: Cascade` from `CarbonInventoryLine`. Unlinking a file in the form unlinks the junction row **and** soft-deletes the `File` (`status=DELETED, deletedAt=now`) atomically inside the sync transaction. Idempotent (`updateMany` with `status: ACTIVE` filter).

**Rationale**: Mirrors `SubmissionFile`. Cascade is defensive — `CarbonInventoryLine` is soft-deleted, so cascade should never fire in practice, but having it guarantees no orphan junction rows if a hard delete ever happens. Coupling unlink + soft-delete prevents the file from being relinked by another inventory while preserving an audit trail.

### 7. Soft-deleted line keeps its junction + blobs

**Decision**: When a line is soft-deleted (`isDeleted: true` in the sync payload), the junction rows and `File` rows are **not** modified. `getCarbonInventoryById` already filters to ACTIVE lines, so attachments of soft-deleted lines are not surfaced.

**Rationale**: Matches the audit-only treatment of soft-deleted lines elsewhere. Reactivating a line (if ever supported) restores the attachments for free.

### 8. Server-side validation on confirm-upload

**Decision**: After `checkFileRecordExists` returns the real `mimeType`/`sizeBytes` from blob metadata, validate against shared constants `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES` (new file `packages/constants/src/file.ts`). Reject with 422.

**Rationale**: Client-side `accept` and `maxSizeMB` on `FileUpload` are UX hints; the server is the source of truth. Reusing `checkFileRecordExists` means we read the real blob metadata, not the client-claimed values.

### 9. Frontend form state shape

**Decision**: Extend `EmissionCaptureFormLine` with `files: LineFileSummary[]` (existing + pending) and `removedFileIds: string[]`. Pending files have `isPending: true`. Linked files moved to `removedFileIds` are filtered out of the visible list. On dialog cancel, restore from a snapshot taken on open.

**Rationale**: Keeps all unsaved edits in one form-state shape (reused by the submit hook). The snapshot/restore pattern matches the existing comment dialog. After successful submit, the API response carries the canonical `files[]` per line, replacing form state in one beat.

### 10. Badge dot color states

**Decision**: Action-cell badge:
- `theme.palette.warning.main` if any pending (unsaved) files.
- `theme.palette.primary.main` if only linked files.
- No badge if no files and no removals.

**Rationale**: Distinct color makes "you have unsaved uploads" visually loud, consistent with form-dirty cues elsewhere. Theme palette keeps it country-agnostic.

### 11. Shared mime/size constants in `packages/constants`

**Decision**: New `packages/constants/src/file.ts` exporting `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES`. Re-exported from `packages/constants/src/index.ts`. Used by API confirm-upload validator and web `FileUpload`'s `accept`/`maxSizeMB` props.

**Rationale**: No global file allowlist exists yet; this mirrors the per-domain `legal.ts` pattern. Single source of truth across the stack.

## Risks / Trade-offs

- **Orphan blobs from never-linked uploads** → Mitigation: deferred sweep job; documented as out-of-scope here. Path prefix and `createdById` are sufficient to identify orphans later.
- **User uploads to inventory A, then loses access mid-flow** → Mitigation: the file remains in storage but linking will fail at sync time (auth gate on `syncCarbonInventoryLines`). No data loss; a future cleanup will reclaim it.
- **Race condition: same uuid linked twice** → Mitigation: `createMany({ skipDuplicates: true })` plus `@@id([lineId, fileId])` make the link operation idempotent.
- **Mime/size validated only at confirm time** → Mitigation: blob metadata is fetched from Azure (`checkFileRecordExists`), so we validate the real upload, not the client's claim. Client is a UX hint only.
- **Cascade on `CarbonInventoryLine` could in theory hard-delete junction rows** → Mitigation: lines are only soft-deleted in normal flows; cascade is defensive against future code paths that might hard-delete.
- **Form-state divergence between dialog and rest of form** → Mitigation: snapshot on dialog open, restore on cancel. All state lives in `useFormContext`, so the submit hook always sees the canonical shape.

## Migration Plan

1. Apply Prisma migration (run manually): adds `carbon_inventory_line_file` table and reverse relations.
2. Deploy API + web together; new schema fields default to empty arrays, so old web clients hitting a new API are unaffected, and a new web client hitting an old API would simply not see `files[]` (degrades gracefully — the dialog wouldn't be present yet).
3. No data backfill needed.
4. Rollback: drop the new table; revert API/web. No destructive changes to existing tables.

## Open Questions

None — all locked with the user in the source plan.

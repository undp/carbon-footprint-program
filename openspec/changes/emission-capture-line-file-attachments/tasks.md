## 1. Database & shared types

- [x] 1.1 Add `CarbonInventoryLineFile` model to `packages/database/src/prisma/schema.prisma` with composite PK `[lineId, fileId]`, `createdAt`, `createdById`, `@@index([fileId])`, and relations to `CarbonInventoryLine` (onDelete: Cascade), `File`, and `User` (named relation `carbon_inventory_line_file_created_by`).
- [x] 1.2 Add reverse relation `files CarbonInventoryLineFile[]` on `CarbonInventoryLine`.
- [x] 1.3 Add reverse relation `carbonInventoryLineFiles CarbonInventoryLineFile[]` on `File`.
- [x] 1.4 Add reverse relation entry on `User` for `carbon_inventory_line_file_created_by`.
- [x] 1.5 Notify the user to run `pnpm --filter @repo/database prisma migrate dev` manually.
- [x] 1.6 Extend `RouteFileTypeSchema` at `packages/types/src/baseSchemas/file.ts:4` from `["SUBMISSION", "BADGE", "LEGAL"]` to include `"CARBON_INVENTORY"`.

## 2. Shared constants

- [x] 2.1 Create `packages/constants/src/file.ts` exporting `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` (image + PDF + common spreadsheet/doc mime types) and `MAX_FILE_SIZE_BYTES`.
- [x] 2.2 Re-export from `packages/constants/src/index.ts`.

## 3. New upload endpoints (API)

- [x] 3.1 Create types folder `packages/types/src/carbonInventories/requestLineFileUpload/` with `schemas.ts` (params: `{ id }`, body: `{ originalName }`, response: `{ uuid, uploadUrl, expiresAt }`), `types.ts`, `index.ts`.
- [x] 3.2 Create types folder `packages/types/src/carbonInventories/confirmLineFileUpload/` with `schemas.ts` (params: `{ id }`, body: `{ uuid, originalName }`, response: `{ uuid }`), `types.ts`, `index.ts`.
- [x] 3.3 Re-export both from `packages/types/src/carbonInventories/index.ts`.
- [x] 3.4 Create `apps/api/src/features/carbonInventories/requestLineFileUpload/` with `route.ts`, `handler.ts`, `service.ts`. Route: `POST /carbon-inventories/:id/files/request-upload`. preHandler: `requireCarbonInventoryAccess(idRequestExtractor, { requiredOrganizationRoles: [CONTRIBUTOR, ADMIN] })`. Service builds blob path with `fileType: "CARBON_INVENTORY"`, `groupKey: id`, `subPath: "LINES"` and reuses `generateWriteSasUrl`.
- [x] 3.5 Create `apps/api/src/features/carbonInventories/confirmLineFileUpload/` with `route.ts`, `handler.ts`, `service.ts`. Route: `POST /carbon-inventories/:id/files/confirm-upload`. Same auth. Service reuses `checkFileRecordExists`, validates real `mimeType` against `CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES` and real `sizeBytes` against `MAX_FILE_SIZE_BYTES`, then `prisma.file.create` (status ACTIVE, type CARBON_INVENTORY, createdById = current user). Throw 422 on validation failure (reuse existing `apps/api/src/errors/` class or `DataIntegrityError` with a clear message).
- [x] 3.6 Register both routes in the `apps/api/src/features/carbonInventories/` router file.

## 4. Extend `syncCarbonInventoryLines`

- [x] 4.1 In `packages/types/src/carbonInventories/syncCarbonInventoryLines/schemas.ts`: add `addFileUuids: z.array(z.uuid()).default([])` to `SyncCreateLineItemSchema`.
- [x] 4.2 Add `addFileUuids: z.array(z.uuid()).default([])` and `removeFileIds: z.array(IdSchema).default([])` to `SyncUpdateLineItemSchema`.
- [x] 4.3 Define `LineFileSummarySchema` (`{ id, uuid, originalName, mimeType, sizeBytes, createdAt }`) and add `files: z.array(LineFileSummarySchema).default([])` to the response's `LineItemSchema`.
- [x] 4.4 In `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts`, add `linkFilesToCarbonInventoryLine(tx, lineId, fileUuids, userId, inventoryId)` that `findMany`s files by uuid (status ACTIVE) AND `blobPath` startsWith `CARBON_INVENTORY/{inventoryId}/LINES/`. Throw `MissingFilesError` if any uuid is unresolved or path-prefix-rejected. Then `tx.carbonInventoryLineFile.createMany({ data, skipDuplicates: true })`.
- [x] 4.5 In the same helper file, add `unlinkFilesFromCarbonInventoryLine(tx, lineId, fileIds)` that `deleteMany`s junction rows (idempotent) and `updateMany`s `File` rows where `id IN fileIds AND status = ACTIVE` to `status: DELETED, deletedAt: now`.
- [x] 4.6 In `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/service.ts` inside the existing `prismaClient.$transaction`: for each create item, after the line is created, call `linkFilesToCarbonInventoryLine` if `addFileUuids.length > 0`.
- [x] 4.7 For each update item: call `linkFilesToCarbonInventoryLine` if `addFileUuids.length > 0`, and `unlinkFilesFromCarbonInventoryLine` if `removeFileIds.length > 0`.
- [x] 4.8 Extend the response query/include to fetch each line's `files` (joined through the junction, filtered to `file.status: ACTIVE`).
- [x] 4.9 Update the mapper that builds the response so each `LineItem` carries the flattened `LineFileSummary[]`.

## 5. Extend `getCarbonInventoryById`

- [x] 5.1 In `apps/api/src/features/carbonInventories/getCarbonInventoryById/service.ts` extend the line `include` with `files: { where: { file: { status: ACTIVE } }, include: { file: { select: { id, uuid, originalName, mimeType, sizeBytes, createdAt, status } } } }`.
- [x] 5.2 Update `apps/api/src/features/carbonInventories/mappers.ts` to flatten each line's `files` to `LineFileSummary[]`.
- [x] 5.3 Update `GetCarbonInventoryByIdResponseSchema` in `packages/types/src/carbonInventories/getCarbonInventoryById/schemas.ts` to include `files: z.array(LineFileSummarySchema).default([])` per line.

## 6. Frontend — types and API hooks

- [x] 6.1 In `apps/web/src/screens/CarbonInventory/types/EmissionCaptureTypes.ts` extend `EmissionCaptureFormLine` with `files: LineFileSummary[]` and `removedFileIds: string[]`. Define `LineFileSummary` (derived from the API response type via indexed access) plus a client-only `isPending?: boolean`.
- [x] 6.2 Verify if `apps/web/src/api/query/files/useDeleteFile.ts` exists; create if missing.
- [x] 6.3 Verify if `apps/web/src/api/query/files/usePreviewFile.ts` exists; create if missing.
- [x] 6.4 Create `apps/web/src/api/query/carbonInventories/useUploadCarbonInventoryLineFiles.ts` analogous to `usePreUploadSubmissionFiles`. Takes `inventoryId` arg. Per file: `request-upload` → PUT to SAS URL → `confirm-upload`. Uploads in parallel via `Promise.all`. Returns `{ uuid, originalName, mimeType, sizeBytes, createdAt }[]`.

## 7. Frontend — form initializer

- [x] 7.1 In the form initializer (likely `useEmissionCaptureForm` or `useEmissionEditorData`), populate each line's `files` from the server response and `removedFileIds: []`.

## 8. Frontend — dialog component

- [x] 8.1 Create `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditorFilesDialog.tsx`. Props: `open, onClose, lineId, subcategoryId, inventoryId, disabled`.
- [x] 8.2 Read/write `subcategories.{subcategoryId}.lines.{lineId}.files` and `.removedFileIds` via `useFormContext`.
- [x] 8.3 On dialog open, snapshot `files` and `removedFileIds`. On cancel, restore from snapshot.
- [x] 8.4 Render a list row per file: icon, name, formatted size (via `formatFileSize`), preview action, delete action. Pending files get a `<Chip>` "Pendiente de guardar".
- [x] 8.5 Filter out files whose ids are in `removedFileIds` from the visible list.
- [x] 8.6 Below the list, render `<FileUpload value={[]} onChange={onFilesPicked} multiple accept={CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES} maxSizeMB={MAX_FILE_SIZE_BYTES / (1024 * 1024)} />`. On pick, call `useUploadCarbonInventoryLineFiles.preUploadFiles(picked)` then append results to form state with `isPending: true`.
- [x] 8.7 Preview action: open the SAS URL from `usePreviewFile` in a new tab.
- [x] 8.8 Delete action — branch by state:
  - Pending (`isPending: true`): call `DELETE /files/:uuid` and remove from `files` in real time.
  - Linked (not pending): move id from `files` to `removedFileIds` (no API call until form save).
- [x] 8.9 Cancel button restores snapshot. Save button just closes the dialog (changes already in form state).

## 9. Frontend — wire the icon and badge

- [x] 9.1 In `apps/web/src/screens/CarbonInventory/components/EmissionEditor/EmissionEditor.tsx:71-73` replace the TODO with `useState<{ lineId: string } | null>(null)` and set it from `onUploadFiles: (lineId) => setFilesDialog({ lineId })`.
- [x] 9.2 Mount `<EmissionEditorFilesDialog ... />` next to `EmissionEditorCommentDialog` near line 162.
- [x] 9.3 In `apps/web/src/screens/CarbonInventory/components/EmissionEditor/cells/EmissionEditorActionsCell.tsx`, accept `hasPendingFiles` and `hasLinkedFiles` props and render a `Badge` overlay on the folder icon (similar to the comment badge at lines 58-79):
  - `theme.palette.warning.main` if `hasPendingFiles`.
  - `theme.palette.primary.main` if only `hasLinkedFiles`.
  - No badge if neither.
- [x] 9.4 Pass `hasPendingFiles = files.some(f => f.isPending)` and `hasLinkedFiles = files.some(f => !f.isPending)` from the row's parent.

## 10. Frontend — submit flow

- [x] 10.1 Extend `apps/web/src/screens/CarbonInventory/hooks/useEmissionCaptureSubmit.ts` create-payload builder with `addFileUuids: pendingFiles.map(f => f.uuid)`.
- [x] 10.2 Extend the update-payload builder with `addFileUuids: pendingFiles.map(f => f.uuid)` and `removeFileIds: line.removedFileIds`.
- [x] 10.3 After successful sync, replace each line's `files` array with the response's canonical `files` (clears `isPending`) and reset `removedFileIds: []`.

## 11. Verification

- [x] 11.1 Run `pnpm install`.
- [x] 11.2 After the user runs the migration, run `pnpm type-check` — fix any errors until clean.
- [x] 11.3 Run `pnpm lint` — fix any warnings until clean (CI enforces zero warnings).
- [x] 11.4 Run `pnpm format` to normalize formatting.
- [x] 11.5 Manual UI walk-through:
  - Existing line: upload 2 files → both marked pending → preview each → delete one pending (real-time) → save → linked file persists with correct blob path.
  - Reload screen → linked file appears without "pendiente". Delete it from dialog → save → junction removed and `File.status = DELETED`.
  - Temp line: open dialog before saving → upload allowed → save form → line + junction created atomically.
  - Cross-inventory protection: craft a sync request linking a uuid from another inventory → API responds 422.
  - Badge dot color matches state (warning for pending, primary for only-linked, none for empty).

## 12. Documentation

- [x] 12.1 Update `docs/` (place under the appropriate existing folder, e.g., `docs/data-model/` for the new junction table and `docs/architecture/` or feature docs for the upload flow). Document the new `FileType.CARBON_INVENTORY` value, the new endpoints, the new junction table, the link/unlink semantics, and the cross-inventory invariant.

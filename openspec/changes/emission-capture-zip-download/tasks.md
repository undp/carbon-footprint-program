## 1. Shared types — `packages/types`

- [ ] 1.1 Create `packages/types/src/carbonInventories/getCarbonInventoryFilesManifest/schemas.ts` with `GetCarbonInventoryFilesManifestParamsSchema`, `FilesManifestEntrySchema` (fileUuid, lineId string, categoryName, subcategoryName, originalName, sasUrl, expiresAt, sizeBytes, mimeType), and `GetCarbonInventoryFilesManifestResponseSchema` (`{ files, expiresAt }`).
- [ ] 1.2 Create `packages/types/src/carbonInventories/getCarbonInventoryFilesManifest/types.ts` with `z.infer` exports and an `index.ts` barrel.
- [ ] 1.3 Create `packages/types/src/carbonInventories/getCarbonInventoryMethodologyExport/schemas.ts` with `GetCarbonInventoryMethodologyExportParamsSchema` (`{ id }`) and `GetCarbonInventoryMethodologyExportResponseSchema = GetMethodologyExportResponseSchema` (literal re-export — must not redefine).
- [ ] 1.4 Create `packages/types/src/carbonInventories/getCarbonInventoryMethodologyExport/types.ts` with `z.infer` exports and an `index.ts` barrel.
- [ ] 1.5 Register both new modules in `packages/types/src/carbonInventories/index.ts`.

## 2. Shared utils — `packages/utils`

- [ ] 2.1 Create `packages/utils/src/sanitize.ts` exporting `sanitizeForFilename(name: string, fallback = "untitled"): string` — NFD normalize → strip diacritics → non-alphanumeric → `-` → trim → fallback when empty.
- [ ] 2.2 Export `sanitizeForFilename` from `packages/utils/src/index.ts`.
- [ ] 2.3 Leave the existing `apps/web/src/services/excel.ts::sanitizeFilenamePart` untouched (different semantics).

## 3. API — methodology helper extraction

- [ ] 3.1 Create `apps/api/src/features/methodologies/helpers.ts` exporting `methodologyExportSelect` (Prisma `MethodologyVersionSelect`, full select tree copied verbatim from `getMethodologyExport/service.ts:18-98`) and `findMethodologyExportByVersionId(prisma, where)`.
- [ ] 3.2 Refactor `apps/api/src/features/methodologies/getMethodologyExport/service.ts` to use the helper (`where: { id: BigInt(id), status: { in: [PUBLISHED, UNPUBLISHED] } }`); behavior unchanged.
- [ ] 3.3 Run the admin export integration test (`/getMethodologyExport/integration.test.ts`) and confirm it still passes — this is the byte-parity regression gate.

## 4. API — files manifest endpoint

- [ ] 4.1 Add `CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES = 15` to `apps/api/src/config/constants.ts`.
- [ ] 4.2 Create `apps/api/src/features/carbonInventories/getCarbonInventoryFilesManifest/service.ts`: one Prisma `carbonInventoryLine.findMany` scoped to `{ carbonInventoryId, status: CarbonInventoryLineStatus.ACTIVE }`, selecting line id + subcategory.name + subcategory.category.name + `files.where({ file: { status: FileStatus.ACTIVE, deletedAt: null } })` with file uuid, originalName, mimeType, sizeBytes, blobPath. Sign all SAS URLs with a single `createReadSasUrlSigner` call (one user-delegation key). Skip rows whose `blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/` (log warning). Serialize BigInt `lineId` to string. Return `{ files, expiresAt }`.
- [ ] 4.3 Create `apps/api/src/features/carbonInventories/getCarbonInventoryFilesManifest/handler.ts`: validate `blobServiceClient` + `storageContainerName` from `request.server` (throw `StorageNotConfiguredError` if missing), delegate to service.
- [ ] 4.4 Create `apps/api/src/features/carbonInventories/getCarbonInventoryFilesManifest/route.ts`: `fastify.get("/:id/files-manifest", { schema, preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)] }, handler)`.
- [ ] 4.5 Register the route in `apps/api/src/routes/api/carbon-inventories/index.ts` next to `previewLineFileRoute`, with `public: true`.

## 5. API — methodology export endpoint (user-scoped)

- [ ] 5.1 Create `apps/api/src/features/carbonInventories/getCarbonInventoryMethodologyExport/service.ts`: `findUniqueOrThrow` the inventory selecting only `methodologyVersionId`; call `findMethodologyExportByVersionId(prisma, { id: methodologyVersionId, status: { in: [PUBLISHED, UNPUBLISHED] } })`; throw `MethodologyNotFoundError` on null; return `mapMethodologyExportToResponse(methodology)`.
- [ ] 5.2 Create `getCarbonInventoryMethodologyExport/handler.ts` (thin — delegate to service).
- [ ] 5.3 Create `getCarbonInventoryMethodologyExport/route.ts`: GET `/:id/methodology-export`, params + 200/404 schemas, `preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)]`.
- [ ] 5.4 Register the route in `apps/api/src/routes/api/carbon-inventories/index.ts` next to `getCarbonInventoryMethodologyRoute`, with `public: true`.

## 6. API — integration tests

- [ ] 6.1 Create `apps/api/test/features/carbonInventories/getCarbonInventoryFilesManifest/integration.test.ts` covering: success with files, empty inventory, **excludes files attached to OUTDATED/DELETED lines**, excludes DELETED / soft-deleted files, unauthenticated denied (403), cross-org user denied (403), admin-from-other-org allowed (200), anonymous via `x-carbon-inventory-uuid` allowed (200), inventory-not-found (404), stray-`blobPath` row skipped.
- [ ] 6.2 Create `apps/api/test/features/carbonInventories/getCarbonInventoryMethodologyExport/integration.test.ts` covering: PUBLISHED → 200 + full hierarchy, UNPUBLISHED → 200, DELETED → 404, unauthenticated → 403, anonymous via UUID header → 200, cross-org user → 403, admin from other org → 200, inventory-not-found → 404, parity with admin endpoint response body.
- [ ] 6.3 Run both new test files green: `pnpm test --filter=api -- /getCarbonInventoryFilesManifest/integration.test.ts --coverage=false` and `pnpm test --filter=api -- /getCarbonInventoryMethodologyExport/integration.test.ts --coverage=false`.

## 7. Web — query hooks

- [ ] 7.1 Create `apps/web/src/api/query/carbonInventories/useCarbonInventoryFilesManifest.ts`: imperative `fetchCarbonInventoryFilesManifest(inventoryId, headers)` (mirrors `usePreviewCarbonInventoryLineFile` pattern) returning typed response; hook wrapper that bakes in `useAuthorizationHeader(inventoryId)`.
- [ ] 7.2 Create `apps/web/src/api/query/carbonInventories/useCarbonInventoryMethodologyExport.ts`: imperative `fetchCarbonInventoryMethodologyExport(inventoryId, headers)` returning typed response; hook wrapper baking in `useAuthorizationHeader(inventoryId)`.

## 8. Web — Excel builders split + Line ID column

- [ ] 8.1 Refactor `apps/web/src/utils/exportCarbonInventoryToExcel.ts`: extract `buildCarbonInventoryWorkbook(...) → Promise<ArrayBuffer>` (pure builder), keep `exportCarbonInventoryToExcel(...)` as a thin wrapper that calls `downloadWorkbook(...)`. Verify all current callers via `grep -r exportCarbonInventoryToExcel apps/web/src`.
- [ ] 8.2 In `buildDetailTableSheet`, prepend a `Line ID` column at index 0 (worksheet `columns[0]` width ~12; `addTable.columns` prepend `{ name: "Line ID", filterButton: true }`); push `line.id` (string) as the first cell of every line row; subcategory-only rows get `"-"`.
- [ ] 8.3 Shift all subsequent `getColumn(N)` number-format calls by +1 to account for the new leftmost column.
- [ ] 8.4 Refactor `apps/web/src/utils/exportMethodologyToExcel.ts`: extract `buildMethodologyWorkbook(methodology): Promise<ArrayBuffer>` (all worksheet construction); keep `exportMethodologyToExcel(methodology)` as a thin wrapper that calls the builder + `downloadWorkbook` / `downloadBuffer`. `useDownloadMethodology` must keep importing `exportMethodologyToExcel` unchanged.

## 9. Web — config constants

- [ ] 9.1 Add to `apps/web/src/config/constants.ts`: `CARBON_INVENTORY_ZIP_FILES_DIR = "archivos"`, `CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME = "resumen-emisiones.xlsx"`, `CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME = "metodologia.xlsx"`.

## 10. Web — dependency and zip orchestration

- [ ] 10.1 Add `client-zip` to `apps/web/package.json` and `pnpm install`.
- [ ] 10.2 Rewrite `apps/web/src/hooks/useDownloadCarbonInventory.ts` keeping the existing `download(id, name, year)` signature: fetch summary + factors + files manifest + methodology export in `Promise.all` under a shared `AbortController`; build resumen + metodologia buffers in parallel; build per-line dedup map for filename collisions (`-2`, `-3` before extension); construct `client-zip` `downloadZip` entries (`resumen-emisiones.xlsx`, `metodologia.xlsx`, then one `archivos/{sanitize(cat)}_{sanitize(sub)}_line-{lineId}_{sanitize(stem(name))}{ext}` per manifest entry, each `input: fetch(sasUrl, { signal })`); `.blob()`; trigger download `${sanitizeForFilename(name) || "huella"}-${year}.zip` (anchor + object URL + revoke).
- [ ] 10.3 Surface a Spanish error snackbar on any of: summary/factors/manifest/methodology fetch failures or any individual SAS file fetch failure — fail-whole, no partial zip. Use a specific message for file-fetch failure ("No se pudo descargar uno o más archivos. Intenta de nuevo.") and a generic one for the other fetches.
- [ ] 10.4 Add a code comment documenting the practical browser memory ceiling (~hundreds of MB) and the migration target (`streams-saver`) if real reports exceed it.

## 11. Verification

- [ ] 11.1 Smoke-test methodology endpoint: `curl /carbon-inventories/:id/methodology-export` as org member → 200; same id unauthenticated → 403; with matching `x-carbon-inventory-uuid` → 200; DELETED methodology version → 404.
- [ ] 11.2 End-to-end test with an inventory that has file attachments: trigger Step 4 "Descargar", confirm `<inventoryName>-<year>.zip` downloads, unzip, verify `resumen-emisiones.xlsx` + `metodologia.xlsx` at root and `archivos/Category_Subcategory_line-<id>_<original>` files. Open the Excel → Detalle emisiones → confirm Line ID is leftmost. Cross-reference one Line ID with an `archivos/` filename.
- [ ] 11.3 Repeat 11.2 from `DraftsTab` and `InventoriesTab` row-level "Descargar" entries — same archive shape.
- [ ] 11.4 Zero-attachment inventory: ZIP contains only `resumen-emisiones.xlsx` and `metodologia.xlsx`.
- [ ] 11.5 Anonymous calculator flow (no auth, UUID header): full ZIP downloads successfully.
- [ ] 11.6 Failure-mode check: throttle/mock 500 on the methodology endpoint → no ZIP, Spanish snackbar. Repeat for the manifest endpoint and a single SAS file fetch.
- [ ] 11.7 Maintainer regression: `MaintainerScreen` methodology list → "Descargar" standalone → identical `.xlsx` (filename + contents) to pre-change baseline.
- [ ] 11.8 Re-run admin export test for helper-extraction regression: `pnpm test --filter=api -- /getMethodologyExport/integration.test.ts --coverage=false`.
- [ ] 11.9 `pnpm format && pnpm lint && pnpm type-check` — zero warnings (CI enforces).

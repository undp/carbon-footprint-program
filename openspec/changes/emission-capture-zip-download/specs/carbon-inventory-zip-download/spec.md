## ADDED Requirements

### Requirement: "Descargar" actions produce a ZIP bundle

Every existing "Descargar" action for a carbon inventory — the Step 4 button on `EmissionSummaryScreen`, the row-level entry in `DraftsTab/DraftActionsCell`, and the row-level entry in `InventoriesTab/InventoryActionsCell` — SHALL produce a single `.zip` archive instead of a bare `.xlsx`. All three callers SHALL share `useDownloadCarbonInventory` and gain the new behavior simultaneously; no new buttons SHALL be introduced.

The ZIP filename SHALL be `{sanitize(inventoryName) || "huella"}-{year}.zip`, mirroring the existing Excel-filename convention. The inventory name SHALL be used (not the organization name) because organization name is null/junk for standalone and anonymous flows.

#### Scenario: Download from Step 4 EmissionSummaryScreen

- **WHEN** the user clicks "Descargar" on the Step 4 emissions summary screen
- **THEN** the browser downloads a `.zip` file named `{sanitize(inventoryName)}-{year}.zip`
- **AND** the existing spinner / disabled-button UX is shown until the archive resolves

#### Scenario: Download from DraftsTab row

- **WHEN** the user clicks "Descargar" on a draft row in `DraftsTab`
- **THEN** the same `.zip` archive is produced as from Step 4 for the same inventory

#### Scenario: Download from InventoriesTab row

- **WHEN** the user clicks "Descargar" on a submitted inventory row in `InventoriesTab`
- **THEN** the same `.zip` archive is produced as from Step 4 for the same inventory

#### Scenario: Sanitized filename fallback

- **WHEN** the inventory name is empty or contains only characters that sanitize away
- **THEN** the ZIP filename starts with `huella-{year}`

### Requirement: ZIP archive layout

The ZIP SHALL contain at minimum two files at root: `resumen-emisiones.xlsx` (the emissions summary workbook) and `metodologia.xlsx` (the methodology export workbook). It SHALL additionally contain one entry per active line file under `archivos/{sanitize(categoryName)}_{sanitize(subcategoryName)}_line-{lineId}_{sanitize(stem(originalName))}{ext}`, in a single flat `archivos/` folder.

Within the same line, same-filename collisions SHALL be disambiguated by appending `-2`, `-3`, … before the extension. Across-line collisions are impossible because `line-{lineId}` partitions the namespace.

#### Scenario: Inventory with attached files

- **WHEN** the user downloads an inventory whose lines have ACTIVE file attachments
- **THEN** the unzipped archive contains `resumen-emisiones.xlsx`, `metodologia.xlsx`, and one file per attachment under `archivos/`
- **AND** each archived filename embeds the owning line's `lineId`

#### Scenario: Inventory with zero attachments

- **WHEN** the user downloads an inventory with no file attachments
- **THEN** the unzipped archive still contains both `resumen-emisiones.xlsx` and `metodologia.xlsx` at root and an empty `archivos/` directory (or no `archivos/` entry — implementation choice)

#### Scenario: Duplicate filenames within a single line

- **WHEN** a single line has two files with the same `originalName`
- **THEN** the second entry in `archivos/` is suffixed `-2` before its extension (e.g., `factura.pdf` and `factura-2.pdf`)

### Requirement: Emissions detail sheet includes Line ID column

The `Detalle emisiones` sheet inside `resumen-emisiones.xlsx` SHALL include a `Line ID` column as the leftmost column. Each emission-line row SHALL place the line's database id (BigInt serialized to string) in that cell. Subcategory-only rows that have no associated line SHALL place `"-"` in that cell. The column SHALL participate in the sheet's filter (`filterButton: true`).

The Line ID rendered in the Excel SHALL be identical to the `line-{lineId}` segment used in the `archivos/` filenames, so users can cross-reference one with the other without an additional manifest file.

#### Scenario: Emission line with attached file

- **WHEN** the user opens `resumen-emisiones.xlsx` → `Detalle emisiones`
- **THEN** the first column is `Line ID` and shows the line's id as a string
- **AND** the same id appears as the `line-{lineId}` segment in at least one `archivos/` entry

#### Scenario: Subcategory-only row

- **WHEN** a row in `Detalle emisiones` is a subcategory header with no underlying line
- **THEN** its `Line ID` cell shows `"-"`

### Requirement: Methodology workbook bundled

The `metodologia.xlsx` entry in the ZIP SHALL be byte-equivalent in shape to the workbook produced by the maintainer screen's standalone methodology download for the methodology version applied to the same inventory. It SHALL be produced by the same builder function — no parallel implementation.

#### Scenario: Inventory whose methodology is also downloadable by maintainer

- **WHEN** the user opens `metodologia.xlsx` from the ZIP
- **AND** an admin opens the maintainer's standalone download for the same methodology version
- **THEN** both files have the same worksheet structure and content

### Requirement: ZIP generation is client-side and streaming

The ZIP archive SHALL be assembled in the browser by streaming each file from its Azure SAS URL directly into the archive via `client-zip`. The API SHALL NOT proxy file bytes. The API SHALL only return signed SAS URLs and pre-built workbook data shapes.

#### Scenario: File bytes flow browser → Azure → ZIP

- **WHEN** the ZIP is being assembled
- **THEN** each line-file blob is fetched by the browser directly from its Azure SAS URL
- **AND** no part of the file's byte stream passes through the Huella API

### Requirement: Fail-whole on any fetch failure

If any of the four primary fetches — emissions summary, emission factors, files manifest, methodology export — fails, OR if any individual SAS file fetch fails during ZIP streaming, the download SHALL abort entirely. No partial archive SHALL be delivered to the user. A Spanish-language snackbar SHALL surface the failure.

#### Scenario: Methodology endpoint returns 500

- **WHEN** the methodology export endpoint returns an error
- **THEN** no `.zip` file is downloaded
- **AND** a Spanish error snackbar is shown

#### Scenario: Files manifest endpoint returns 404 / 500

- **WHEN** the files manifest endpoint fails
- **THEN** no `.zip` file is downloaded
- **AND** a Spanish error snackbar is shown

#### Scenario: One SAS file fetch fails mid-stream

- **WHEN** any individual line-file blob fetch fails (network error, 403 on SAS, etc.)
- **THEN** the entire ZIP download is aborted
- **AND** a Spanish error snackbar specific to "could not download one or more files" is shown
- **AND** no partial archive reaches the user's filesystem

#### Scenario: User navigates away mid-download

- **WHEN** the user unmounts the component while the ZIP is still building
- **THEN** the shared `AbortController` cancels all in-flight fetches

### Requirement: Files manifest endpoint

The system SHALL expose `GET /carbon-inventories/:id/files-manifest`. The endpoint SHALL be gated by `requireCarbonInventoryAccess(idRequestExtractor)` and SHALL be registered `public: true` so the anonymous calculator flow (using the `x-carbon-inventory-uuid` header) can call it.

The response SHALL include one entry per attached file belonging to an ACTIVE line of the inventory whose `File.status = ACTIVE` and `File.deletedAt IS NULL`. Files attached to OUTDATED or DELETED lines SHALL NOT appear. Each entry SHALL include `fileUuid`, `lineId` (BigInt serialized to string), `categoryName`, `subcategoryName`, `originalName`, `sasUrl`, `expiresAt`, `sizeBytes`, and `mimeType`. The response SHALL also include a top-level `expiresAt`.

All SAS URLs in a single response SHALL be signed using a single user-delegation key (one Azure call per request, regardless of file count). Rows whose `File.blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/` SHALL be logged and skipped (the existing safety pattern from `previewLineFile`).

#### Scenario: Successful manifest for an inventory with active files

- **WHEN** an authenticated inventory member calls `GET /carbon-inventories/:id/files-manifest`
- **THEN** the API responds 200 with one entry per ACTIVE-line ACTIVE-file attachment
- **AND** each entry carries a signed SAS URL valid for `CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES`

#### Scenario: Files attached to OUTDATED or DELETED lines are excluded

- **WHEN** the inventory has files attached to lines whose status is OUTDATED or DELETED
- **THEN** those files are NOT present in the manifest

#### Scenario: Soft-deleted files are excluded

- **WHEN** any attached file has `status = DELETED` or `deletedAt IS NOT NULL`
- **THEN** that file is NOT present in the manifest

#### Scenario: Unauthenticated request without UUID header

- **WHEN** an unauthenticated request hits the endpoint without `x-carbon-inventory-uuid`
- **THEN** the API responds 403

#### Scenario: Anonymous flow with matching UUID header

- **WHEN** an unauthenticated request includes `x-carbon-inventory-uuid` matching the inventory's UUID
- **THEN** the API responds 200

#### Scenario: Cross-organization user

- **WHEN** an authenticated user without inventory access calls the endpoint
- **THEN** the API responds 403

#### Scenario: Admin from another organization

- **WHEN** a SystemRole.ADMIN user from a different organization calls the endpoint
- **THEN** the API responds 200 (admin bypass)

#### Scenario: Inventory not found

- **WHEN** the inventory id does not exist
- **THEN** the API responds 404

#### Scenario: Stray blob path (cross-inventory leak guard)

- **WHEN** an attached file's `blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/`
- **THEN** the manifest service logs a warning and skips that row
- **AND** the response does not include the stray file

#### Scenario: Single user-delegation-key call

- **WHEN** the manifest contains N entries
- **THEN** exactly one user-delegation-key roundtrip is made to Azure during the request

### Requirement: Methodology export endpoint (user-scoped)

The system SHALL expose `GET /carbon-inventories/:id/methodology-export`. The endpoint SHALL be gated by `requireCarbonInventoryAccess(idRequestExtractor)` and SHALL be registered `public: true` to support the anonymous calculator flow.

The response shape SHALL be byte-identical to the admin endpoint `GET /methodologies/:id/export`. The response schema SHALL be defined by re-exporting `GetMethodologyExportResponseSchema` from `packages/types/src/methodologies/getMethodologyExport/schemas.ts` — drift between admin and user-scoped versions SHALL be structurally impossible.

The status filter SHALL match the admin endpoint: only methodology versions whose `status` is `PUBLISHED` or `UNPUBLISHED` SHALL be exportable. A methodology version with `status = DELETED` SHALL produce a 404.

The Prisma query (select tree + finder) SHALL be extracted to `apps/api/src/features/methodologies/helpers.ts` and reused by both the admin and the user-scoped service. The existing `mapMethodologyExportToResponse` mapper SHALL be reused unchanged.

#### Scenario: PUBLISHED methodology, authenticated org member

- **WHEN** an inventory member calls `GET /carbon-inventories/:id/methodology-export` and the inventory's methodology version is PUBLISHED
- **THEN** the API responds 200 with the full methodology hierarchy

#### Scenario: UNPUBLISHED methodology version

- **WHEN** the inventory's methodology version is UNPUBLISHED
- **THEN** the API still responds 200 with the full hierarchy

#### Scenario: DELETED methodology version

- **WHEN** the inventory's methodology version is DELETED
- **THEN** the API responds 404 with `MethodologyNotFoundError`

#### Scenario: Anonymous flow with matching UUID header

- **WHEN** an unauthenticated request includes `x-carbon-inventory-uuid` matching the inventory
- **THEN** the API responds 200

#### Scenario: Unauthenticated without UUID

- **WHEN** an unauthenticated request hits the endpoint without `x-carbon-inventory-uuid`
- **THEN** the API responds 403

#### Scenario: Cross-organization user

- **WHEN** an authenticated user without inventory access calls the endpoint
- **THEN** the API responds 403

#### Scenario: Admin from another organization

- **WHEN** a SystemRole.ADMIN from another organization calls the endpoint
- **THEN** the API responds 200 (default admin bypass)

#### Scenario: Inventory not found

- **WHEN** the inventory id does not exist
- **THEN** the API responds 404

#### Scenario: Response parity with admin endpoint

- **WHEN** the user-scoped endpoint and the admin endpoint are called for the same methodology version
- **THEN** their response bodies are byte-identical

### Requirement: Maintainer methodology download behavior is preserved

The existing `useDownloadMethodology` hook and the maintainer screen's standalone "Descargar" action SHALL continue to produce the same standalone `.xlsx` they produce today. Splitting `exportMethodologyToExcel` into a pure `buildMethodologyWorkbook(...) → ArrayBuffer` builder plus a thin downloader wrapper SHALL NOT change the user-facing behavior, the filename, or the workbook contents.

#### Scenario: Maintainer downloads methodology

- **WHEN** an admin clicks "Descargar" on a methodology in the maintainer screen
- **THEN** the standalone `.xlsx` produced is identical (filename and contents) to the one produced before this change

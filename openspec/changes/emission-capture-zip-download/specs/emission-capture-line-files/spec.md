## ADDED Requirements

### Requirement: Files manifest endpoint exposes per-inventory bulk access to line files

The system SHALL expose `GET /carbon-inventories/:id/files-manifest` returning the set of line-file attachments of an inventory together with a signed read SAS URL for each. The endpoint complements the existing single-file `previewLineFile` route by enabling bulk download in one request.

The endpoint SHALL be gated by `requireCarbonInventoryAccess(idRequestExtractor)` and SHALL be registered `public: true`. It SHALL include only files attached to ACTIVE lines whose `File.status = ACTIVE` and `File.deletedAt IS NULL`. Files attached to OUTDATED or DELETED lines SHALL be excluded. Each entry SHALL carry `fileUuid`, `lineId` (BigInt serialized to string), `categoryName`, `subcategoryName`, `originalName`, `sasUrl`, `expiresAt`, `sizeBytes`, and `mimeType`.

All SAS URLs in a single response SHALL be signed with a single user-delegation-key roundtrip to Azure. Files whose `blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/` SHALL be logged and skipped (same cross-inventory leak guard as `previewLineFile`).

#### Scenario: Bulk listing for an authorized inventory member

- **WHEN** an authenticated inventory member calls `GET /carbon-inventories/:id/files-manifest`
- **THEN** the API responds 200 with one entry per ACTIVE-line ACTIVE-file attachment, each carrying a signed SAS URL

#### Scenario: Anonymous calculator flow

- **WHEN** an unauthenticated request includes `x-carbon-inventory-uuid` matching the inventory's UUID
- **THEN** the API responds 200

#### Scenario: Files attached to OUTDATED or DELETED lines are excluded

- **WHEN** the inventory has files on lines whose status is OUTDATED or DELETED
- **THEN** those files do NOT appear in the manifest

#### Scenario: Cross-inventory blob path is skipped

- **WHEN** a `CarbonInventoryLineFile` row points at a `File` whose `blobPath` does not start with `CARBON_INVENTORY/{inventoryId}/LINES/`
- **THEN** the manifest service logs a warning and omits that entry from the response

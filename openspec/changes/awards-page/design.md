## Context

Organizations earn recognition seals (badges) when their carbon inventory submissions are approved. These badges are currently only visible inside the individual carbon inventory detail view via `CarbonInventoryBadgesCard`. There is no cross-inventory, cross-year consolidated view.

The existing `GET /:id/badges` endpoint on `carbonInventories` fetches badges for a single inventory. The new page requires three new endpoints:

1. An organization-scoped endpoint that aggregates badge data across all approved inventories, enriched with earning date, measurement year, and total emissions from `CarbonInventorySubtotalsView`.
2. A global (not org-scoped) endpoint returning signed SAS URLs for each active badge type's seal image, so summary cards can display the seal preview.
3. A submission-scoped endpoint returning the signed SAS URL for the recognition diploma (`SubmissionFile` with type `RECOGNITION`) attached during approval, for the row detail preview modal.

## Goals / Non-Goals

**Goals:**

- New `GET /organizations/:id/badges?year=` API endpoint returning all earned seals for an organization, with optional year filtering
- New `GET /badges/previews` API endpoint returning signed SAS URLs for each active badge type's seal image (global, not org-scoped)
- New `GET /submissions/:id/recognition-file` API endpoint returning the signed SAS URL for the recognition diploma file
- `/app/awards` frontend screen with year + org filters, badge summary cards with seal image previews, and a sortable table
- Recognition diploma preview modal using an expiring signed URL
- Reuse `StylizedDatagrid` with sorting enabled

**Non-Goals:**

- Pagination (badge counts per org are expected to be small)
- Downloading / exporting the badge seal image (preview only on summary cards)
- Recognition diploma download is supported (download button in the modal)
- Creating, revoking, or managing badges
- Supporting non-APPROVED submissions

## Decisions

### D1: New endpoints under `organizations` feature folder (not `carbonInventories`)

The badge listing and preview data are organization-scoped, not inventory-scoped. Placing them under `organizations` matches the existing feature-folder convention and avoids bloating `carbonInventories` with cross-cutting queries.

_Alternative considered:_ Add a query param to the existing endpoint — rejected because it changes the contract of an existing endpoint and mixes two distinct response shapes.

### D2: Recognition file endpoint under `submissions` feature folder

The recognition diploma is a `SubmissionFile` with type `RECOGNITION`, scoped to a specific submission. Placing this endpoint under `submissions` matches the data ownership. The endpoint returns a signed SAS URL by looking up the `SubmissionFile` where `type = RECOGNITION` for the given submission, then generating a SAS URL for the associated `File.blobPath`.

### D3: Aggregate total emissions via `CarbonInventorySubtotalsView` in a single Prisma query

`CarbonInventorySubtotalsView` rows aggregate all category/subcategory values per `carbonInventoryId`. Total emissions = sum of all `value` fields for that inventory. This can be computed with a Prisma `findMany` on the view filtered by `carbonInventoryId`, then summed in service code — consistent with how the view is already used in the codebase.

_Alternative considered:_ A raw SQL `SUM` via `$queryRaw` — rejected to stay consistent with the Prisma-first pattern used elsewhere.

### D4: Signed preview URLs generated using same pattern as `getCarbonInventoryBadges`

Badge seal files are stored in Azure Blob Storage. The existing service already generates SAS URLs. The new endpoints reuse `blobServiceClient` + `storageContainerName` from server config and the same `generateReadSasUrl` utility. The badge previews endpoint generates URLs for `Badge.file.blobPath`, while the recognition file endpoint generates a URL for the `SubmissionFile.file.blobPath`.

### D5: Year filtering is server-side on `getOrganizationBadges`, org filtering triggers a new API call

The `getOrganizationBadges` endpoint accepts an optional `year` query parameter to filter by measurement year. When the user changes the year selector, the frontend refetches with the new year param. When the organization selector changes, the frontend refetches with a different `organizationId` path param. This keeps response payloads small and avoids sending unnecessary data.

### D6: Global endpoint for badge type previews (`GET /badges/previews`)

The summary cards need to display the seal image for each badge type. These seal images come from the global `Badge` model (one active badge per type), not from any organization-specific data. Rather than nesting this under `/organizations/:id`, a top-level `GET /badges/previews` endpoint returns one SAS URL per active badge type. This avoids an unnecessary org dependency and keeps the main listing response lean by not embedding duplicate SAS URLs in every row.

### D7: StylizedDatagrid with `disableColumnSorting` removed for this table

`StylizedDatagrid` disables sorting globally. For the awards table, we pass `disableColumnSorting={false}` and configure `sortModel` defaulting to `[{ field: 'measurementYear', sort: 'desc' }, { field: 'badgeType', sort: 'asc' }]`. The badge type sort order follows the existing priority map in the service layer.

## Risks / Trade-offs

- **SAS URL expiry**: Signed URLs expire (typically 1 hour). If the user leaves the modal open for a long time, the preview may fail. Mitigation: keep expiry generous (e.g., 2 hours) and show a reload prompt on image error.
- **`CarbonInventorySubtotalsView` without `@@id`**: `findMany` must be used (no `findUnique`). This is already established practice in the codebase.
- **BigInt serialization**: All `BigInt` IDs must be `.toString()`'d before mapping to response schemas — existing pattern, must be followed consistently.
- **Missing recognition file**: Not all approved submissions may have a `RECOGNITION` type `SubmissionFile` attached (the admin may not have uploaded one). The endpoint should return 404 in this case, and the frontend should handle it gracefully (e.g., show a "no diploma available" message in the modal).

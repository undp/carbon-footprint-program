## Context

The carbon inventory download today is a single `.xlsx` produced fully on the web client by `useDownloadCarbonInventory` → `exportCarbonInventoryToExcel`. Three call-sites trigger it: the Step 4 `EmissionSummaryScreen` button, and the row-level "Descargar" entries in `DraftActionsCell` and `InventoryActionsCell`. After the recent `feat/mati/emission-capture-line-file-attachments` work, lines can carry file attachments stored under `CARBON_INVENTORY/{inventoryId}/LINES/{uuid}-{originalName}`, fetched one-at-a-time via `previewLineFile`. Methodology export is admin-only via `GET /methodologies/:id/export`. Users have no path to bulk-download attachments and no path to a methodology snapshot frozen at their inventory's reference version.

Constraints:

- Anonymous calculator flow (no auth, `x-carbon-inventory-uuid` header) must keep working — routes must be `public: true` and use `requireCarbonInventoryAccess(idRequestExtractor)`.
- API must not proxy file bytes (egress + memory cost; pattern set by `previewLineFile`).
- No drift between admin and user-scoped methodology export response shapes.
- The methodology stays exportable for the version applied to a given inventory even if a newer version has been published; only `DELETED` is treated as gone.

## Goals / Non-Goals

**Goals:**

- One ZIP bundling `resumen-emisiones.xlsx`, `metodologia.xlsx`, and `archivos/{cat}_{sub}_item-{lineId}_{originalName}` for every active line file, triggered by every existing "Descargar" action — no new buttons.
- Discoverability: each file's owning line is identifiable from its filename and cross-referenced via a new leftmost `Item ID` column on the emissions detail sheet — no separate manifest CSV.
- Single Azure user-delegation-key roundtrip per manifest, regardless of file count.
- Methodology export schema reuse between admin and user-scoped endpoints (literal re-export of the response schema).
- Fail-loud behavior: any failure in summary / factors / manifest / methodology / individual SAS file → whole zip aborts with a Spanish snackbar; no partial archives.
- Maintainer methodology download (existing `useDownloadMethodology`) keeps the exact same UX and output bytes.

**Non-Goals:**

- No new authorization rules. Reuse `requireCarbonInventoryAccess`.
- No DB schema changes.
- No changes to the admin `/methodologies/:id/export` route signature or response.
- No changes to `getCarbonInventoryMethodology` (different shape; serves calculator UI).
- No partial-zip fallback, no retry-with-skip mode, no server-side zip assembly, no email-delivery mode.
- No new emission summary endpoint — `getEmissionsDetailedSummary` already serializes `lineId` as a string in its service; the Excel builder consumes it.
- No country-specific labels or layouts — sanitization is locale-agnostic (strip diacritics; non-alphanumeric → `-`).

## Decisions

### Generation: client-side streaming zip via `client-zip`

- **Why**: keeps the API stateless and cheap (one Prisma query + one delegation-key signature). API egress doesn't multiply by file count. `client-zip` streams entries through a `ReadableStream` during build; only the final `.blob()` materializes the archive.
- **Alternatives**: server-side `archiver` proxy (rejected — doubles egress, ties API memory to inventory size); pre-signed manifest with a custom CDN concat (rejected — overengineered).
- **Trade-off**: practical browser ceiling around hundreds of MB; if real reports exceed this, migrate to `streams-saver` later. Documented as a code comment in `useDownloadCarbonInventory`.

### Manifest endpoint signs all SAS URLs with one user-delegation key

- **Why**: `previewLineFile` calls the user-delegation-key endpoint once per request — fine for a single file but linear in `N` for a manifest. The signer `createReadSasUrlSigner` already exists at `apps/api/src/services/blobService.ts:37` and yields a one-fetch signer; using it gives O(1) Azure calls regardless of file count.
- **Trade-off**: SAS expiry is uniform (15 min). For very large inventories the tail downloads might 403; mitigated by client-side `expiresAt - now` warning before starting. Accepted for v1.

### Methodology export: new user-scoped endpoint + shared helper, NOT delegating to admin route

- **Why over reusing admin endpoint**: admin route is gated by SystemRole.ADMIN; we need anonymous-calculator-flow access. Calling it server-to-server would force us to mint admin tokens — strictly worse.
- **Why over duplicating the service**: byte-identical response shape between admin and user scope is mandatory (zero drift). Extracting `methodologyExportSelect` + `findMethodologyExportByVersionId` into `apps/api/src/features/methodologies/helpers.ts` and reusing the existing `mapMethodologyExportToResponse` mapper guarantees parity. Admin service refactored to call the helper — its integration test acts as the regression gate.
- **Why feature-local helper** (under `features/methodologies/`) and not `apps/api/src/helpers/`: CLAUDE.md says promote to shared only when reuse is _observed_. Two callers (admin + user-scoped) are the second use; a third caller would justify promotion.
- **Schema reuse**: `GetCarbonInventoryMethodologyExportResponseSchema = GetMethodologyExportResponseSchema` (literal re-export). Cannot drift.
- **Status filter**: `PUBLISHED` or `UNPUBLISHED` only (mirrors admin). `DELETED` → 404. If product later wants graceful degradation on `DELETED`, revisit this filter — calling that out explicitly here so it surfaces in code review.

### Files manifest scoped to ACTIVE lines and ACTIVE/non-soft-deleted files

- **Why**: OUTDATED / DELETED lines are not part of the inventory's current truth. Bundling their files would confuse cross-reference with the Excel (which only lists ACTIVE lines). Soft-deleted `File` rows are explicitly removed by the user — bundling them would resurrect deletions.
- **Trade-off**: a user who deletes a file mid-flight then re-downloads gets a smaller archive — expected.

### Discoverability: Item ID column in Excel + Item ID in archive filenames, no separate manifest

- **Why**: a separate `manifest.csv` is dead weight when the Excel already enumerates every line. Embedding the same string ID in the filename and the leftmost column lets a user cross-reference with Ctrl-F.
- **Excel impact**: prepend `{ name: "Item ID", filterButton: true }` at column 0 on the detail emissions sheet; shift downstream `getColumn(N)` calls by +1. Subcategory-only rows get `"-"`.
- **Source of Item ID**: `CarbonInventoryLine.id` (BigInt) serialized to string. Already exposed by `getEmissionsDetailedSummary` (`service.ts:135`); no endpoint change.

### ZIP layout and naming

- Top-level entries `resumen-emisiones.xlsx` and `metodologia.xlsx` at root. Files under `archivos/{sanitize(category)}_{sanitize(subcategory)}_item-{lineId}_{sanitize(stem(name))}{ext}`.
- ZIP filename: `${sanitize(inventoryName) || "huella"}-{year}.zip`. Mirrors the existing Excel-filename convention (`exportCarbonInventoryToExcel.ts:221-223`). Uses inventory name, not organization name — organization name is null/junk for standalone and anonymous flows.
- Sanitization: NFD normalize → strip diacritics → non-alphanumeric → `-` → trim `-`. Fallback when empty. New shared util `sanitizeForFilename` in `packages/utils/src/sanitize.ts`. The existing `apps/web/src/services/excel.ts::sanitizeFilenamePart` has different semantics — kept untouched.
- Within-line same-filename collisions: append `-2`, `-3` before the extension. Across-line collisions can't exist because the `item-{lineId}` segment partitions the namespace.

### Excel builder split, shared with maintainer flow

- `exportCarbonInventoryToExcel` and `exportMethodologyToExcel` each split into a pure `buildXWorkbook(...) → ArrayBuffer` plus a thin wrapper that calls `downloadWorkbook`. `useDownloadMethodology` keeps importing the wrapper — zero caller-side change.

### Failure mode: fail-whole

- **Why**: partial zips silently dropping files would be worse than a clear error. The user can retry. Snackbar surfaces a generic Spanish message; the specific failure is in the network tab.

### Web hook signature unchanged

- `useDownloadCarbonInventory.download(id, name, year)` keeps its signature; all three callers benefit from the new behavior without edits.

## Risks / Trade-offs

- **SAS expiry mid-download** → 15-min window; mitigation = client-side `expiresAt - now` warning before starting.
- **Single-file fetch failure** → fail-whole snackbar in Spanish. Documented behavior. No silent skips.
- **Browser memory ceiling** (~hundreds of MB) → documented in code comment; revisit only if reports exceed it. Migration target: `streams-saver`.
- **Helper extraction regression on admin export** → mitigated by re-running the admin integration test (`/getMethodologyExport/integration.test.ts`) as part of verification.
- **MethodologyVersion mid-flight DELETED** (PUBLISHED at page load, DELETED at click) → 404 → fail-whole snackbar. Acceptable; user retries. Documented edge case.
- **Cross-inventory leak via stray `blobPath`** → the manifest service runs the same prefix guard as `previewLineFile` (compare `file.blobPath` to `buildCarbonInventoryLineBlobPathPrefix(inventoryId)` → `CARBON_INVENTORY/{inventoryId}/LINES/`). Mismatches are logged at WARN and the offending row is filtered out — never thrown. This guard fires regardless of `canAdminsBypass`, so admin access cannot escape its own inventory's prefix.
- **Anonymous flow attack surface for methodology** → same shape as existing `getCarbonInventoryMethodology` (already `public: true`). No new exposure.
- **Excel column-index drift** → adding Item ID at column 0 shifts all subsequent `getColumn(N)` calls by +1. Caught by visual review during verification step 5; no automated test covers cell formatting directly.

## Migration Plan

- No data migration. Code is additive **except** for one format-breaking change: the `Detalle emisiones` sheet gains a `Item ID` column at position 1, shifting every existing column by +1. Consumers that parse the workbook by column header are unaffected; consumers that parse by column index need to update — surfaced explicitly in the proposal's _Breaking Changes_ section.
- Rollback: revert the feature commits. No persisted state to undo.
- Deploy order: API first (so the manifest + methodology-export endpoints exist when the web client looks for them); web second.

## Why

Users on the emission capture flow can today download a carbon inventory only as a single `.xlsx`. Lines can now carry file attachments (recently added per-line file UI), but there is no way to download those attachments in bulk and no way to know which line a file belongs to. The methodology applied to an inventory is also only reachable via admin tooling, so users have no way to keep a frozen snapshot of the methodology that produced their numbers.

## What Changes

- Every existing "Descargar" action for a carbon inventory (Step 4 `EmissionSummaryScreen` button, row-level entries in `DraftActionsCell` and `InventoryActionsCell`) now produces a `.zip` instead of a bare `.xlsx`. All three callers share `useDownloadCarbonInventory` and gain the new behavior together. No new buttons.
- ZIP layout: `resumen-emisiones.xlsx` (root) + `metodologia.xlsx` (root) + `archivos/{category}_{subcategory}_line-{lineId}_{originalName}` (flat folder, one entry per active line file).
- ZIP filename: `{sanitize(inventoryName) || "huella"}-{year}.zip`. Mirrors the existing Excel-filename convention.
- Excel detail sheet (`Detalle emisiones`) gains a leftmost **Line ID** column. Same Line ID is baked into every filename in `archivos/`, so the Excel acts as the manifest — no separate CSV.
- New API endpoint `GET /carbon-inventories/:id/files-manifest` returns signed SAS URLs + line context (one user-delegation-key call, all rows signed at once). ZIP generation happens client-side via `client-zip` streaming; the API never proxies file bytes.
- New API endpoint `GET /carbon-inventories/:id/methodology-export` mirrors the admin `GET /methodologies/:id/export` response shape but is scoped by inventory id and gated by `requireCarbonInventoryAccess` (anonymous calculator flow supported). Status filter matches admin: `PUBLISHED` or `UNPUBLISHED` only; `DELETED` → 404.
- Methodology Prisma query (select tree + finder) extracted to `apps/api/src/features/methodologies/helpers.ts` and reused by both the admin and the new user-scoped service. Admin behavior unchanged.
- Excel builders for inventory summary and methodology split into pure `buildXWorkbook(...) → ArrayBuffer` builders + thin download wrappers, so the zip orchestrator and the existing maintainer flow share workbook construction with zero drift.
- New shared util `sanitizeForFilename` in `packages/utils` (strip diacritics, non-alphanumeric → `-`).
- Failure mode: any of the four fetches (summary, factors, manifest, methodology) or any individual file blob fetch failing fails the whole zip with a Spanish snackbar error. No partial zips, no silent skips.

## Capabilities

### New Capabilities

- `carbon-inventory-zip-download`: Bulk ZIP download of a carbon inventory bundling the emissions summary Excel, the methodology Excel, and all active line file attachments — driven by user-scoped API endpoints (files manifest + methodology export) and client-side streaming zip generation.

### Modified Capabilities

- `emission-capture-line-files`: Existing line-file capability gains the manifest endpoint that exposes signed SAS URLs + per-line context for bulk download; previously line files were only reachable one-at-a-time via `previewLineFile`.

## Impact

- **API**: two new routes under `/carbon-inventories/:id` (`files-manifest`, `methodology-export`), both registered `public: true` to support the anonymous calculator flow; new feature-local helper in `features/methodologies/helpers.ts`; admin `getMethodologyExport/service.ts` refactored to use the helper (byte-identical response); new SAS-expiry constant in `apps/api/src/config/constants.ts`.
- **Shared types** (`packages/types`): two new endpoint modules under `carbonInventories/` (files-manifest, methodology-export). Methodology-export response schema re-exports the admin schema directly — no drift.
- **Shared utils** (`packages/utils`): `sanitizeForFilename` added.
- **Web**: new query hooks (imperative fetchers), `useDownloadCarbonInventory` rewritten as a zip orchestrator (signature unchanged), Excel builders split, `client-zip` added to `apps/web/package.json`, four new zip-naming constants in `apps/web/src/config/constants.ts`.
- **Excel format**: detail emissions sheet gains a Line ID column at position 1 — downstream consumers that key by column index will need to shift +1.
- **Performance / cost**: API stays cheap (one Prisma query + one user-delegation-key call per manifest); Azure egress now flows browser→blob directly instead of going through the API.
- **CORS**: Azure Blob CORS already permits browser SAS GETs (used by `previewLineFile`); no infra change required.
- **No DB migrations.**

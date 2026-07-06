# Emission Capture — Download Files + Excel + Methodology as ZIP

## Context

Users on the EmissionSummaryScreen (Step 4 of the carbon inventory flow) today can download the inventory as a single `.xlsx`. Lines can now have file attachments (recent commits added per-line file UI in `EmissionEditorActionsCell` + `EmissionEditorFilesDialog`), but there is no way to download those attachments in bulk, and no robust way to know which line a file belongs to. Additionally, the methodology Excel that powers the maintainer screen is only accessible through admin tooling — users have no way to keep a snapshot of the methodology that was applied to a given inventory.

This change makes all existing "Descargar" actions for a carbon inventory — the Step 4 `EmissionSummaryScreen` button and the row-level "Descargar" entries in `DraftsTab/DraftActionsCell` and `InventoriesTab/InventoryActionsCell` — produce a `.zip` containing:

- `resumen-emisiones.xlsx` at root — same workbook generated today, plus a new **Line ID** column (leftmost) on the detailed emissions sheet for cross-reference.
- `metodologia.xlsx` at root — the same workbook the maintainer screen generates today via `exportMethodologyToExcel`, scoped to the methodology version applied to this inventory.
- `archivos/{categoryName}_{subcategoryName}_line-{lineId}_{originalFilename}` for every attached, active line file.

To avoid saturating the API by proxying file bytes, ZIP generation happens **client-side** using `client-zip` (streaming via `ReadableStream`). The API only signs SAS URLs in a new manifest endpoint; the browser fetches each blob directly from Azure Storage and streams it into the zip.

Discoverability of which line owns which file is solved by two things working together: (a) the Line ID appears as the first column of the Excel `Detalle emisiones` sheet, and (b) every file in `archivos/` has the same Line ID baked into its filename. No separate manifest CSV — the Excel is the manifest.

The methodology Excel is built from a new user-scoped endpoint `GET /carbon-inventories/:id/methodology-export` that mirrors the existing admin endpoint `GET /methodologies/:id/export`, but is gated by `requireCarbonInventoryAccess` (anonymous calculator flow supported) and indexed by inventory id. The user-scoped endpoint exists so users can keep accessing the methodology that was available for their inventory at the moment it was produced, without granting them admin role.

## Locked decisions

- **Trigger**: every existing "Descargar" action for a carbon inventory — Step 4 button on `EmissionSummaryScreen` plus the row-level entries in `DraftActionsCell` and `InventoryActionsCell`. No new buttons; all three callers share `useDownloadCarbonInventory` and gain the zip behavior together.
- **Scope**: whole inventory.
- **Generation**: client-side via `client-zip` lib (streaming). API never proxies bytes.
- **Files-manifest endpoint**: `GET /carbon-inventories/:id/files-manifest` returns SAS URLs + line context. Auth: `requireCarbonInventoryAccess` (mirrors `previewLineFile`). Registered `public: true` to support the anonymous calculator flow.
- **Methodology-export endpoint**: `GET /carbon-inventories/:id/methodology-export` — mirrors admin `GET /methodologies/:id/export` response shape, scoped by inventory id. Auth: `requireCarbonInventoryAccess(idRequestExtractor)`. Registered `public: true`. Status filter mirrors admin: `MethodologyVersionStatus IN (PUBLISHED, UNPUBLISHED)` (DELETED → 404).
- **Response schema for methodology-export**: identical to `GetMethodologyExportResponseSchema`. New schemas folder re-exports it under inventory-scoped params (zero drift).
- **ZIP layout**: `resumen-emisiones.xlsx` (root) + `metodologia.xlsx` (root) + `archivos/{cat}_{sub}_line-{lineId}_{originalName}` (flat folder).
- **ZIP filename**: `{sanitize(inventoryName) || "huella"}-{year}.zip`. Mirrors the existing Excel-filename convention in `exportCarbonInventoryToExcel.ts:221-223` — uses the inventory name (always populated), not the organization name (may be null/junk for standalone/anonymous flows).
- **Excel change (emissions)**: add Line ID as the leftmost column on the detailed emissions sheet.
- **Excel reuse (methodology)**: split `exportMethodologyToExcel` → `buildMethodologyWorkbook(methodology) → ArrayBuffer` + thin downloader wrapper. Mirrors the split applied to `exportCarbonInventoryToExcel`.
- **`useDownloadMethodology` untouched**: still calls `exportMethodologyToExcel(methodology)` which now internally delegates to the new builder + `downloadWorkbook`. Zero behavior change for the maintainer flow.
- **Line ID**: real DB `CarbonInventoryLine.id` (BigInt serialized to string).
- **Line filter**: `CarbonInventoryLine.status = CarbonInventoryLineStatus.ACTIVE`. OUTDATED and DELETED lines are skipped entirely (their files are not bundled, and they do not appear in the manifest).
- **File filter**: `File.status = FileStatus.ACTIVE` AND `File.deletedAt IS NULL`.
- **Within-line same-filename collisions**: append `-2`, `-3` before extension.
- **Sanitization**: strip diacritics + replace non-alphanumeric with `-` (e.g., `Energía Eléctrica` → `Energia-Electrica`).
- **Zero files**: still produce zip containing `resumen-emisiones.xlsx` + `metodologia.xlsx`.
- **Failure mode**: any of the four fetches failing (summary, factors, manifest, methodology) or any file-blob fetch failing → fail the whole zip with snackbar error. No partial zips, no silent skips.
- **Loading UX**: existing spinner + disabled button.

## Implementation

### A. Database / Prisma

No changes. Models `CarbonInventoryLine`, `CarbonInventoryLineFile`, `File`, `MethodologyVersion` already cover everything.

### B. Shared types — `packages/types`

**B.1 — Files manifest**

Create `packages/types/src/carbonInventories/getCarbonInventoryFilesManifest/`:

- `schemas.ts`: `GetCarbonInventoryFilesManifestParamsSchema` (`{ id }`), `FilesManifestEntrySchema` (`fileUuid`, `lineId` string, `categoryName`, `subcategoryName`, `originalName`, `sasUrl`, `expiresAt`, `sizeBytes`, `mimeType`), `GetCarbonInventoryFilesManifestResponseSchema` (`{ files, expiresAt }`).
- `types.ts`: `z.infer` exports.
- Register in `packages/types/src/carbonInventories/index.ts`.

**B.2 — Methodology export (user-scoped)**

Create `packages/types/src/carbonInventories/getCarbonInventoryMethodologyExport/`:

- `schemas.ts`:

  ```ts
  import { z } from "zod";
  import { IdSchema } from "../../zod.js";
  import { GetMethodologyExportResponseSchema } from "../../methodologies/getMethodologyExport/schemas.js";

  export const GetCarbonInventoryMethodologyExportParamsSchema = z
    .object({ id: IdSchema.describe("The carbon inventory ID") })
    .strict();

  export const GetCarbonInventoryMethodologyExportResponseSchema =
    GetMethodologyExportResponseSchema;
  ```

- `types.ts`: `z.infer` exports for params + response.
- Register in `packages/types/src/carbonInventories/index.ts`.

Rationale: response shape is identical to admin export → reuse the schema directly. Drift is impossible.

### C. Shared API helper — extract methodology export query

Per CLAUDE.md "promote on second use" rule: reuse is now observed.

New file `apps/api/src/features/methodologies/helpers.ts` (feature-local first; promote to `apps/api/src/helpers/` only if a third caller appears):

```ts
import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  SubcategoryStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";

export const methodologyExportSelect = {
  id: true,
  name: true,
  description: true,
  regulation: true,
  version: true,
  status: true,
  categories: {
    where: { status: CategoryStatus.ACTIVE },
    orderBy: { position: "asc" },
    select: {/* ...exact tree from getMethodologyExport/service.ts:38-95... */},
  },
} satisfies Prisma.MethodologyVersionSelect;

export async function findMethodologyExportByVersionId(
  prismaClient: PrismaClient,
  where: Prisma.MethodologyVersionWhereInput
) {
  return prismaClient.methodologyVersion.findFirst({
    where,
    select: methodologyExportSelect,
  });
}
```

Refactor `apps/api/src/features/methodologies/getMethodologyExport/service.ts` to use the helper (passes `where: { id: BigInt(id), status: { in: [PUBLISHED, UNPUBLISHED] } }`). Throws `MethodologyNotFoundError` on null. Behavior unchanged.

### D. API endpoints — `apps/api/src/features/carbonInventories/`

**D.1 — getCarbonInventoryFilesManifest**

Mirror `previewLineFile/` structure.

- **`route.ts`**: `fastify.get("/:id/files-manifest", { schema, preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)] }, handler)`.
- **`handler.ts`**: validate `blobServiceClient` + `storageContainerName` from `request.server` (throw `StorageNotConfiguredError` if missing). Delegate to service.
- **`service.ts`**: single Prisma query — `prisma.carbonInventoryLine.findMany` scoped to inventory, `where: { carbonInventoryId, status: CarbonInventoryLineStatus.ACTIVE }`, `select` line `id`, `subcategory.name`, `subcategory.category.name`, and `files.where({ file: { status: FileStatus.ACTIVE, deletedAt: null } }).select({ file: { uuid, originalName, mimeType, sizeBytes, blobPath, status } })`. **Sign all SAS URLs from a single user-delegation key** (one Azure call) — `createReadSasUrlSigner` already exists at `apps/api/src/services/blobService.ts:37`; reuse it (no helper to add). Mirror the `blobPath` prefix safety check from `previewLineFile/service.ts` (log + skip mismatched rows). Serialize BigInt `lineId` to string. Return `{ files, expiresAt }`.
- **Register route** in `apps/api/src/routes/api/carbon-inventories/index.ts`: `getCarbonInventoryFilesManifestRoute(fastify, { public: true })` next to `previewLineFileRoute`.
- **Constants** (`apps/api/src/config/constants.ts`): add `CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES = 15`.

**D.2 — getCarbonInventoryMethodologyExport**

Mirror `previewLineFile/` structure.

- **`route.ts`**:
  ```ts
  fastify.get(
    "/:id/methodology-export",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Export the methodology associated with a carbon inventory",
        params: GetCarbonInventoryMethodologyExportParamsSchema,
        response: {
          200: GetCarbonInventoryMethodologyExportResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
    },
    handler
  );
  ```
- **`handler.ts`**: thin — delegate to service.
- **`service.ts`**:

  ```ts
  const inventory = await prisma.carbonInventory.findUniqueOrThrow({
    where: { id: BigInt(id) },
    select: { methodologyVersionId: true },
  });

  const methodology = await findMethodologyExportByVersionId(prisma, {
    id: inventory.methodologyVersionId,
    status: {
      in: [
        MethodologyVersionStatus.PUBLISHED,
        MethodologyVersionStatus.UNPUBLISHED,
      ],
    },
  });

  if (!methodology) throw new MethodologyNotFoundError();

  return mapMethodologyExportToResponse(methodology);
  ```

  Inventory existence is already guaranteed by `requireCarbonInventoryAccess`; the lookup just retrieves `methodologyVersionId`. Reuses the existing `mapMethodologyExportToResponse` mapper at `apps/api/src/features/methodologies/mappers.ts`.

- **Register route** in `apps/api/src/routes/api/carbon-inventories/index.ts` next to `getCarbonInventoryMethodologyRoute`: `getCarbonInventoryMethodologyExportRoute(fastify, { public: true })`.

### E. API integration tests

**E.1** — `apps/api/test/features/carbonInventories/getCarbonInventoryFilesManifest/integration.test.ts` covering: success with files, empty inventory, **excludes files attached to OUTDATED/DELETED lines**, excludes `DELETED`/soft-deleted files, unauthenticated denied, cross-org user denied, admin-from-other-org allowed (verify project default), inventory-not-found 404. Use existing seeders + the blob client mock (check `appFactory`).

**E.2** — `apps/api/test/features/carbonInventories/getCarbonInventoryMethodologyExport/integration.test.ts` covering:

- Success: PUBLISHED methodology → 200 + full hierarchy.
- UNPUBLISHED methodology version on inventory → still exportable (200).
- DELETED methodology version → 404 `MethodologyNotFoundError`.
- Unauthenticated request without UUID header → 403.
- Anonymous via `x-carbon-inventory-uuid` matching → 200.
- Cross-org user without access → 403.
- Admin from other org → 200 (default bypass).
- Inventory not found → 404.

Use existing `appFactory` + organization/user/inventory factories. No blob client needed.

**E.3** — Re-run the existing admin test (`apps/api/test/features/methodologies/getMethodologyExport/integration.test.ts`) as part of verification to catch any helper-extraction regression.

### F. Shared utils — `packages/utils`

New file `packages/utils/src/sanitize.ts`:

```
sanitizeForFilename(name: string, fallback = "untitled"): string
```

Implementation: `.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")`, fallback when empty.
Register export in `packages/utils/src/index.ts`. **Do not modify** the existing `sanitizeFilenamePart` in `apps/web/src/services/excel.ts` — different semantics, keep both.

### G. Web — query hooks

**G.1** — `apps/web/src/api/query/carbonInventories/useCarbonInventoryFilesManifest.ts`:

- Imperative `fetchCarbonInventoryFilesManifest(inventoryId, headers)` returning typed response — pattern matches `usePreviewCarbonInventoryLineFile` (on-demand, no `useQuery`).
- Optional hook wrapper exposing the fetcher with `useAuthorizationHeader(inventoryId)` baked in.

**G.2** — `apps/web/src/api/query/carbonInventories/useCarbonInventoryMethodologyExport.ts`:

- Imperative `fetchCarbonInventoryMethodologyExport(inventoryId, headers)` returning typed response.
- Mirrors `usePreviewCarbonInventoryLineFile` pattern (on-demand fetcher; no `useQuery`).
- Hook wrapper bakes in `useAuthorizationHeader(inventoryId)`.

### H. Web — Excel builders (split + Line ID column)

**H.1 — Inventory summary builder**

Refactor `apps/web/src/utils/exportCarbonInventoryToExcel.ts`:

- Split into `buildCarbonInventoryWorkbook(...)` returning `ArrayBuffer` and a thin `exportCarbonInventoryToExcel(...)` wrapper that calls `downloadWorkbook(...)` (preserves any existing direct-download callers — verify with `grep -r exportCarbonInventoryToExcel apps/web/src`).
- In `buildDetailTableSheet`:
  - Prepend a Line ID column (worksheet `columns[0]` width ~12; `addTable.columns` prepend `{ name: "Line ID", filterButton: true }`).
  - Push `line.id` (string) as the first cell of every line row. Subcategory-only rows (no lines) get `"-"`.
  - Shift all subsequent `getColumn(N)` number-format calls by +1.
- `GetEmissionsDetailedSummaryResponse` **already exposes** `lineId` per line (`packages/types/src/carbonInventories/getEmissionsDetailedSummary/schemas.ts:20`) and the service already serializes it as a string (`service.ts:135`). No changes to that endpoint or its schema are required.

**H.2 — Methodology builder**

Refactor `apps/web/src/utils/exportMethodologyToExcel.ts`:

- Extract `buildMethodologyWorkbook(methodology): Promise<ArrayBuffer>` — all worksheet construction logic.
- Keep `exportMethodologyToExcel(methodology)` as a thin wrapper:
  ```ts
  export async function exportMethodologyToExcel(methodology) {
    const buffer = await buildMethodologyWorkbook(methodology);
    const filename = `${sanitizeFilenamePart(methodology.name)}-${dateForFileName()}.xlsx`;
    await downloadBuffer(buffer, filename); // or downloadWorkbook if kept
  }
  ```
- `useDownloadMethodology` keeps importing `exportMethodologyToExcel` — no caller-side change.

### I. Web — `useDownloadCarbonInventory` zip orchestration

Add `client-zip` to `apps/web/package.json`.

Modify `apps/web/src/hooks/useDownloadCarbonInventory.ts`:

- Keep the existing signature `download(id, name, year)` — no new parameters. All three current callers (`EmissionSummaryScreen`, `DraftsTab/DraftActionsCell`, `InventoriesTab/InventoryActionsCell`) keep working unchanged and all benefit from the new zip behavior.
- Inside the download action:
  1. `Promise.all` — fetch **four** things: emissions summary + emission factors + files manifest + methodology export. One shared `AbortController`.
  2. Build both xlsx buffers in parallel: `buildCarbonInventoryWorkbook(...)` → resumen buffer; `buildMethodologyWorkbook(...)` → metodologia buffer.
  3. Build per-line dedup map; for each manifest entry compute `archivos/${sanitize(cat)}_${sanitize(sub)}_line-${lineId}_${sanitize(stem(name))}${ext}`, appending `-2`, `-3` on collision.
  4. `downloadZip` entries:
     ```ts
     [
       { name: CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME, input: resumenBuffer },
       {
         name: CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME,
         input: metodologiaBuffer,
       },
       ...manifest.files.map((f) => ({
         name: zipPath(f),
         input: fetch(f.sasUrl, { signal }),
       })),
     ];
     ```
     Then `.blob()`.
  5. Trigger download with filename `${sanitize(name) || "huella"}-${year}.zip` (anchor + object URL + revoke). Mirrors current Excel-filename logic.
- Use one `AbortController` for all fetches so unmount cancels cleanly.
- Existing snackbar success/error UX remains. Add a specific error message if any fetch (summary / factors / manifest / methodology / individual file blob) fails (fail-whole, do not silently skip).

### J. Sanitization usage

- ZIP top-level filename: `${sanitize(inventoryName) || "huella"}-${year}.zip` (mirrors existing Excel-filename convention; inventory name is always populated, organization name is not — standalone/anonymous flows can yield null/junk org names).
- ZIP entry path components: `categoryName`, `subcategoryName`, and the **stem** of `originalName` (split on last `.`, sanitize stem, rejoin with extension untouched).
- Excel entries stay literal: `resumen-emisiones.xlsx`, `metodologia.xlsx`.

### K. Constants summary

| Constant                                                           | Location                           | Purpose                       |
| ------------------------------------------------------------------ | ---------------------------------- | ----------------------------- |
| `CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES = 15`          | `apps/api/src/config/constants.ts` | SAS validity for manifest     |
| `CARBON_INVENTORY_ZIP_FILES_DIR = "archivos"`                      | `apps/web/src/config/constants.ts` | Internal folder               |
| `CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME = "resumen-emisiones.xlsx"` | `apps/web/src/config/constants.ts` | Inventory summary entry path  |
| `CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME = "metodologia.xlsx"` | `apps/web/src/config/constants.ts` | Methodology export entry path |

No `packages/constants` additions.

## Critical files

**New**

- `packages/types/src/carbonInventories/getCarbonInventoryFilesManifest/{schemas,types,index}.ts`
- `packages/types/src/carbonInventories/getCarbonInventoryMethodologyExport/{schemas,types,index}.ts`
- `apps/api/src/features/methodologies/helpers.ts` (extracted methodology export query + select)
- `apps/api/src/features/carbonInventories/getCarbonInventoryFilesManifest/{route,handler,service}.ts`
- `apps/api/src/features/carbonInventories/getCarbonInventoryMethodologyExport/{route,handler,service}.ts`
- `apps/api/test/features/carbonInventories/getCarbonInventoryFilesManifest/integration.test.ts`
- `apps/api/test/features/carbonInventories/getCarbonInventoryMethodologyExport/integration.test.ts`
- `packages/utils/src/sanitize.ts`
- `apps/web/src/api/query/carbonInventories/useCarbonInventoryFilesManifest.ts`
- `apps/web/src/api/query/carbonInventories/useCarbonInventoryMethodologyExport.ts`

**Modified**

- `packages/types/src/carbonInventories/index.ts` (export new modules)
- `packages/utils/src/index.ts` (export sanitize)
- `apps/api/src/features/methodologies/getMethodologyExport/service.ts` (use new helper)
- `apps/api/src/routes/api/carbon-inventories/index.ts` (register both new routes as `public: true`)
- `apps/api/src/config/constants.ts` (SAS expiry constant)
- `apps/web/package.json` (add `client-zip`)
- `apps/web/src/config/constants.ts` (zip naming constants)
- `apps/web/src/utils/exportCarbonInventoryToExcel.ts` (split builder + add Line ID column)
- `apps/web/src/utils/exportMethodologyToExcel.ts` (split builder + downloader)
- `apps/web/src/hooks/useDownloadCarbonInventory.ts` (zip orchestration — signature unchanged, all three callers benefit)

## Reused existing functions / utilities

- `apps/api/src/services/blobService.ts::createReadSasUrlSigner` (line 37) — already exposes a one-fetch user-delegation-key signer. Use it directly from the new service to sign all entries with a single Azure call. Do not call `generateReadSasUrl` in a loop.
- `apps/api/src/features/carbonInventories/previewLineFile/` — pattern for route + handler + service + auth + blob-path safety check.
- `apps/api/src/plugins/app/carbonInventoryAuthorizationPlugin.ts::requireCarbonInventoryAccess` + `idRequestExtractor` — auth preHandler (already used by `previewLineFile` and `getCarbonInventoryMethodology`).
- `apps/api/src/features/methodologies/getMethodologyExport/service.ts:18-98` — Prisma `select` tree, extracted verbatim into the new helper.
- `apps/api/src/features/methodologies/mappers.ts::mapMethodologyExportToResponse` — used as-is by the new user-scoped service.
- `apps/api/src/features/methodologies/errors.ts::MethodologyNotFoundError` — thrown by the new user-scoped service on missing/DELETED version.
- `packages/types/src/methodologies/getMethodologyExport/schemas.ts::GetMethodologyExportResponseSchema` — re-exported as the user-scoped response schema (zero drift).
- `apps/web/src/hooks/useDownloadCarbonInventory.ts` — existing download orchestration (refactor in place).
- `apps/web/src/utils/exportCarbonInventoryToExcel.ts` + `buildDetailTableSheet` — existing workbook builder; split into pure builder + downloader.
- `apps/web/src/utils/exportMethodologyToExcel.ts` — split, not duplicated; existing maintainer flow continues using `exportMethodologyToExcel`.
- `apps/web/src/api/query/carbonInventories/usePreviewCarbonInventoryLineFile.ts` — imperative-fetch pattern with `useAuthorizationHeader`.
- `apps/web/src/services/excel.ts::downloadWorkbook`, `sanitizeFilenamePart`, `dateForFileName` — keep using for the standalone maintainer download.
- `apps/web/src/utils/files.ts` — colocate any new `downloadBlob` helper here if it fits.

## Verification

1. `pnpm install` (picks up `client-zip`).
2. `pnpm --filter @repo/types build` (if needed for downstream consumers).
3. `pnpm --filter api dev` + `pnpm --filter web dev`.
4. New methodology endpoint smoke test:
   - `curl /carbon-inventories/:id/methodology-export` for an org-member user → 200 + full hierarchy.
   - Same `:id` without auth → 403; with matching `x-carbon-inventory-uuid` header → 200.
   - For an inventory whose `methodologyVersion.status = DELETED` → 404.
5. With an inventory that has file attachments:
   - Navigate to Step 4 (EmissionSummaryScreen). Click **Descargar**.
   - Confirm spinner, then a `.zip` downloads named `<inventoryName>-<year>.zip` (sanitized inventory name; falls back to `huella` if blank).
   - Unzip: confirm `resumen-emisiones.xlsx` + `metodologia.xlsx` at root + `archivos/` folder with one file per attachment, naming pattern `Category_Subcategory_line-<id>_<original>`.
   - Open `resumen-emisiones.xlsx` → **Detalle emisiones** sheet: first column is Line ID. Cross-reference one ID with a file in `archivos/` to confirm match.
   - Open `metodologia.xlsx` → verify worksheets identical in shape to the admin maintainer download for the same methodology.
   - Repeat from `DraftsTab` and `InventoriesTab` row-level **Descargar** entries — must produce the same zip.
6. Inventory with zero file attachments: zip contains only `resumen-emisiones.xlsx` + `metodologia.xlsx`.
7. Anonymous calculator flow (no auth, UUID header): repeat (5). Must work.
8. Failure-mode check: temporarily mock the methodology endpoint to 500 in DevTools network throttling → zip is NOT produced and snackbar surfaces an error (no partial zip download). Repeat for the manifest endpoint and for a single SAS file fetch.
9. Maintainer flow regression: open `MaintainerScreen` methodology list, click standalone **Descargar**. Must still produce the same standalone xlsx as before (proves the builder/downloader split is non-breaking).
10. Run new integration tests:
    - `pnpm test --filter=api -- /getCarbonInventoryFilesManifest/integration.test.ts --coverage=false`
    - `pnpm test --filter=api -- /getCarbonInventoryMethodologyExport/integration.test.ts --coverage=false`
11. Re-run admin export test for regression (helper extraction): `pnpm test --filter=api -- /getMethodologyExport/integration.test.ts --coverage=false`.
12. `pnpm format && pnpm lint && pnpm type-check` (no warnings — CI enforces zero).

## Edge cases & risks

- **SAS expiry mid-download**: 15-min window per request. For huge inventories the tail might 403. Mitigation: client-side check `expiresAt - now` before starting; warn user. Acceptable trade-off for v1.
- **Abort/cancel**: wire an `AbortController` to all `fetch` calls and to the manifest + methodology fetches (`ky` supports `signal`) so unmounting cancels.
- **Single-file fetch failure**: fail the whole zip (snackbar: "No se pudo descargar uno o más archivos. Intenta de nuevo."). Do NOT silently skip.
- **Methodology fetch failure**: same fail-whole policy. Snackbar surfaces a generic "No se pudo descargar la huella" — no partial zip.
- **Browser memory**: `client-zip` streams during build; `.blob()` materializes the full zip at the end. Practical ceiling ~hundreds of MB. Document in a code comment. Migrate to `streams-saver` only if real-world reports require it.
- **CORS on Azure**: `previewLineFile` already uses SAS GETs from the browser → CORS is configured. Confirm by clicking before assuming.
- **BigInt `lineId`**: serialize to string in the manifest response (project pattern). `getEmissionsDetailedSummary` already does this at `service.ts:135` (`lineId: line.id.toString()`); no additive fix required.
- **Cross-inventory leak**: keep the existing `blobPath` prefix safety check (log + skip) so a stray row doesn't poison the archive.
- **DELETED methodology version**: 404 by design (matches admin behavior). For historical inventories pointing at a methodology version later marked DELETED, the zip will fail with a clear error. If product wants graceful degradation here, revisit the status filter decision.
- **MethodologyVersion mid-flight status change**: PUBLISHED → DELETED between page load and download click → 404 → fail-whole zip snackbar. Acceptable; user retries.
- **Helper extraction regression risk**: admin endpoint behavior must remain byte-identical. Mitigation: keep `mapMethodologyExportToResponse` mapper untouched + run the admin integration test as part of verification (step 11).
- **Schema drift between admin and user-scoped methodology**: avoided by re-exporting the response schema from `packages/types` rather than redefining it.
- **Anonymous flow attack surface for methodology**: same shape as `getCarbonInventoryMethodology` which is already `public: true`. No new exposure.

## Out of scope

- No changes to `useDownloadMethodology` or `MaintainerScreen` UX.
- No changes to the admin `/methodologies/:id/export` route signature or response.
- No changes to the existing `getCarbonInventoryMethodology` endpoint (different shape, serves the calculator UI).
- No new authorization rules beyond reusing `requireCarbonInventoryAccess`.

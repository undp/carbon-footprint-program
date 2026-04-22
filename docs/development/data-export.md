# Data Export and Reporting

This document describes how organizations export their data from the platform. All export generation currently runs **client-side in the browser** — the API exposes the raw data, and the frontend assembles the downloadable file.

---

## Supported Formats

| Format          | Used for                                                             | Library                 |
| --------------- | -------------------------------------------------------------------- | ----------------------- |
| Excel (`.xlsx`) | Inventory exports, reduction project exports, reduction plan exports | `exceljs` (client-side) |
| Raw files (any) | Documents and badges uploaded by organizations                       | SAS URLs from the API   |

PDF generation is **not currently implemented**. No `pdfkit`, `jsPDF`, or server-side PDF library is included in the dependency tree.

---

## Excel Exports

Three export utilities live under `apps/web/src/utils/`:

### 1. Carbon inventory export — `exportCarbonInventoryToExcel.ts`

Produces a three-sheet workbook for a single carbon inventory:

| Sheet                | Contents                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Summary**          | Organization metadata, year, organization size, branch count, main activity, total emissions                            |
| **Detail emissions** | Per-line breakdown: category, subcategory, dimension selections, quantity, unit, applied factor, source, computed tCO₂e |
| **Factors**          | Every emission factor used in the inventory, with rate unit and source citation                                         |

Triggered from the inventory screen via the `useDownloadCarbonInventory` hook (`apps/web/src/screens/CarbonInventories/hooks/`). The hook:

1. Fetches `GET /carbon-inventories/:id/emissions-summary` — aggregated totals per category/subcategory.
2. Fetches `GET /carbon-inventories/:id/emission-factors` — the factor list actually applied.
3. Passes both payloads to `exportCarbonInventoryToExcel()`, which builds the workbook and triggers a browser download.

### 2. Reduction project export — `exportReductionProjectToExcel.ts`

Single-sheet workbook for one reduction project. Fields:

- Name, description
- Implementation date, year
- Baseline scenario (tCO₂e)
- Project scenario (tCO₂e)
- Calculated reduction (tCO₂e)
- GWP version used (`AR5`, `AR6`, …)
- Gases considered (`CO₂`, `CH₄`, `N₂O`, …)
- Status
- Reported-elsewhere flag

Triggered via `useDownloadReductionProject` hook (`apps/web/src/screens/ReductionProjects/hooks/`).

### 3. Reduction plan export — `exportReductionPlanToExcel.ts`

Multi-sheet workbook listing suggested initiatives. **One sheet per category**; each sheet lists the subcategories in that category along with the available `ReductionPlanInitiative` records (title and description).

Triggered from `ReductionPlanScreen.tsx`.

---

## Excel Generation Service

All three exporters delegate file writing to `apps/web/src/services/excel.ts`, which:

1. Generates a workbook buffer via `exceljs`.
2. Creates a `Blob` with MIME type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
3. Creates an anchor element pointing at an object URL.
4. Programmatically clicks the anchor to trigger the download.
5. Revokes the object URL.

**Filename and sheet-name sanitization** is built into this service:

| Sanitization              | Rule                                           |
| ------------------------- | ---------------------------------------------- |
| Illegal characters        | Strips `\ / ? * [ ]` from sheet names          |
| Maximum sheet name length | 31 characters (Excel limit)                    |
| Filename sanitization     | Removes path separators and control characters |

---

## Document Download (API)

For files uploaded via the `/files` endpoints (evidence attachments, badges, recognition files), the API exposes:

```
GET /api/files/:uuid/download
```

Requires authentication (`USER`, `ADMIN`, or `SUPERADMIN` system role). Returns a **temporary SAS URL** — a time-limited, scope-restricted URL for Azure Blob Storage. The client follows the redirect (or reads the URL from the response) to fetch the actual file.

The SAS URL is generated per request using the API's managed identity and the storage account's user-delegation key. The storage account key itself is never exposed.

See [File Storage](../infrastructure/FileStorage.md) for the full upload/download architecture.

---

## What Cannot Be Exported Today

| Capability                           | Status                                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side PDF report               | **Not implemented**                                                                                                                            |
| Batch export of multiple inventories | **Not implemented**                                                                                                                            |
| CSV export                           | **Not implemented**                                                                                                                            |
| Cross-organization aggregate exports | **Not implemented** (admin UI only shows them onscreen)                                                                                        |
| Scheduled / automated exports        | **Not implemented**                                                                                                                            |
| JSON export of raw inventory data    | The API responses are JSON but not explicitly an export format — the data can be fetched via the normal `GET /carbon-inventories/:id` endpoint |

These gaps are tracked in [Refactoring Opportunities](../REFACTORING_OPPORTUNITIES.md).

---

## Adding a New Export

To add a new Excel export:

1. **Create the generator** under `apps/web/src/utils/exportXxxToExcel.ts`:

   ```typescript
   import { Workbook } from "exceljs";

   export async function exportXxxToExcel(data: XxxData): Promise<void> {
     const workbook = new Workbook();
     const sheet = workbook.addWorksheet("Sheet Name");
     // ... fill cells ...
     await downloadWorkbook(workbook, "xxx-export.xlsx");
   }
   ```

2. **Add a data-fetch hook** under `apps/web/src/screens/<feature>/hooks/useDownloadXxx.ts`:

   ```typescript
   export function useDownloadXxx(xxxId: string) {
     return useMutation({
       mutationFn: async () => {
         const data = await apiClient.get(`xxx/${xxxId}/export`).json();
         await exportXxxToExcel(data);
       },
     });
   }
   ```

3. **Expose the trigger** in the relevant screen component (download button, menu item).

4. **Ensure the API returns the needed data** — add dedicated endpoints or response fields if the existing endpoints don't expose what the export needs.

---

## Considerations for Server-Side Export (Future)

If client-side generation becomes unsatisfactory (e.g., for very large inventories or scheduled reports), the move to server-side export should consider:

| Concern           | Guidance                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Where to generate | A dedicated feature under `apps/api/src/features/<resource>/export<Format>/`                    |
| Delivery          | Write the file to Blob Storage, return a SAS URL                                                |
| Authorization     | Apply the same per-resource authorization rules as the `GET` endpoint                           |
| Memory            | Stream rows rather than buffering in memory — inventories with thousands of lines are plausible |
| File lifecycle    | Expire generated exports after a short TTL (24 h) to avoid blob bloat                           |

A background task (Azure Functions, not currently implemented) would be a natural home for scheduled exports.

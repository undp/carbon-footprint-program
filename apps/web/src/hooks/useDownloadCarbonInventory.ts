import { useState, useCallback, useRef } from "react";
import type {
  FilesManifestEntry,
  GetCarbonInventoryFilesManifestResponse,
  GetCarbonInventoryMethodologyExportResponse,
  GetEmissionFactorsResponse,
  GetEmissionsDetailedSummaryResponse,
} from "@repo/types";
import { sanitizeForFilename } from "@repo/utils";
import { downloadZip } from "client-zip";
import { enqueueSnackbar } from "notistack";
import { apiClient } from "@/api/http";
import { getInventoryUuidFromLocalStorage } from "@/api/query/carbonInventories/authHeaders";
import {
  CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME,
  CARBON_INVENTORY_ZIP_FILES_DIR,
  CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME,
  CARBON_INVENTORY_ZIP_README_ENTRY_NAME,
} from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { downloadBuffer } from "@/services/excel";
import { buildCarbonInventoryZipReadme } from "@/utils/buildCarbonInventoryZipReadme";
import { buildCarbonInventoryWorkbook } from "@/utils/exportCarbonInventoryToExcel";
import { buildMethodologyWorkbook } from "@/utils/exportMethodologyToExcel";

const GENERIC_DOWNLOAD_ERROR = "No se pudo descargar la huella";
const FILE_FETCH_ERROR =
  "No se pudo descargar uno o más archivos. Intenta de nuevo.";

// `client-zip` materializes the ZIP entirely in browser memory before the
// `.blob()` resolves; the practical ceiling is in the low hundreds of MB.
// If real reports exceed that, migrate the orchestrator to `streams-saver`
// so the archive streams straight to disk instead.

function splitExtension(name: string): { stem: string; ext: string } {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return { stem: name, ext: "" };
  return { stem: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

function buildArchiveFilename(
  entry: FilesManifestEntry,
  collisionIndex: number
): string {
  const { stem, ext } = splitExtension(entry.originalName);
  const suffix = collisionIndex > 1 ? `-${collisionIndex}` : "";
  return [
    CARBON_INVENTORY_ZIP_FILES_DIR,
    "/",
    sanitizeForFilename(entry.categoryName),
    "_",
    sanitizeForFilename(entry.subcategoryName),
    "_item-",
    entry.lineId,
    "_",
    sanitizeForFilename(stem, "archivo"),
    suffix,
    ext,
  ].join("");
}

export function useDownloadCarbonInventory() {
  const [isDownloading, setIsDownloading] = useState(false);
  const isDownloadingRef = useRef(false);
  const { isAuthenticated } = useAuth();

  const download = useCallback(
    async (id: string, name: string | null, year: number | null) => {
      if (isDownloadingRef.current) return;
      isDownloadingRef.current = true;
      setIsDownloading(true);

      const controller = new AbortController();
      const { signal } = controller;

      try {
        // Match `useAuthorizationHeader`: when authenticated the auth token is
        // injected by the apiClient hook; otherwise we forward the inventory's
        // UUID from localStorage to support the anonymous calculator flow.
        const headers: Record<string, string> = {};
        if (!isAuthenticated) {
          const uuid = getInventoryUuidFromLocalStorage(id);
          if (uuid) {
            headers["x-carbon-inventory-uuid"] = uuid;
          }
        }

        const [summaryData, factorsData, manifest, methodology] =
          await Promise.all([
            apiClient
              .get(`carbon-inventories/${id}/emissions-summary`, {
                headers,
                signal,
              })
              .json<GetEmissionsDetailedSummaryResponse>(),
            apiClient
              .get(`carbon-inventories/${id}/emission-factors`, {
                headers,
                signal,
              })
              .json<GetEmissionFactorsResponse>(),
            apiClient
              .get(`carbon-inventories/${id}/files-manifest`, {
                headers,
                signal,
              })
              .json<GetCarbonInventoryFilesManifestResponse>(),
            apiClient
              .get(`carbon-inventories/${id}/methodology-export`, {
                headers,
                signal,
              })
              .json<GetCarbonInventoryMethodologyExportResponse>(),
          ]);

        const [summaryBuffer, methodologyBuffer] = await Promise.all([
          buildCarbonInventoryWorkbook(
            year,
            summaryData,
            factorsData,
            manifest.files.length
          ),
          buildMethodologyWorkbook(methodology),
        ]);

        // Disambiguate ZIP-entry collisions within a single line by suffixing
        // `-2`, `-3`, ... before the extension. Sanitization can collapse
        // different `originalName` values (e.g. `Año.pdf` and `Ano.pdf`) into
        // the same archive entry, so the dedup key is the sanitized archive
        // path — not the raw original name. Across-line collisions cannot
        // exist because `item-{lineId}` partitions the namespace.
        const perEntryCount = new Map<string, number>();
        const readme = buildCarbonInventoryZipReadme({
          inventoryName: name,
          year,
          generatedAt: new Date(),
        });
        const entries: {
          name: string;
          input: Response | ArrayBuffer | string;
        }[] = [
          {
            name: CARBON_INVENTORY_ZIP_README_ENTRY_NAME,
            input: readme,
          },
          {
            name: CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME,
            input: summaryBuffer,
          },
          {
            name: CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME,
            input: methodologyBuffer,
          },
        ];

        for (const file of manifest.files) {
          const baseArchiveName = buildArchiveFilename(file, 1);
          const next = (perEntryCount.get(baseArchiveName) ?? 0) + 1;
          perEntryCount.set(baseArchiveName, next);

          let response: Response;
          try {
            response = await fetch(file.sasUrl, { signal });
            if (!response.ok) {
              throw new Error(
                `Blob fetch failed: ${response.status} ${response.statusText}`
              );
            }
          } catch (cause) {
            throw new FileFetchError(file.originalName, { cause });
          }
          entries.push({
            name: buildArchiveFilename(file, next),
            input: response,
          });
        }

        const zipBlob = await downloadZip(entries).blob();
        const safeName = sanitizeForFilename(name ?? "", "huella");
        const filename = `${safeName}-${year ?? "sin-anio"}.zip`;
        downloadBuffer(await zipBlob.arrayBuffer(), filename);

        enqueueSnackbar("Huella descargada", { variant: "success" });
      } catch (error) {
        controller.abort();
        if (error instanceof FileFetchError) {
          enqueueSnackbar(FILE_FETCH_ERROR, { variant: "error" });
        } else {
          enqueueSnackbar(GENERIC_DOWNLOAD_ERROR, { variant: "error" });
        }
      } finally {
        isDownloadingRef.current = false;
        setIsDownloading(false);
      }
    },
    [isAuthenticated]
  );

  return { download, isDownloading };
}

class FileFetchError extends Error {
  constructor(originalName: string, options?: ErrorOptions) {
    super(`Failed to download file: ${originalName}`, options);
    this.name = "FileFetchError";
  }
}

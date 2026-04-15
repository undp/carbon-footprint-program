import { useState, useCallback, useRef } from "react";
import type {
  GetEmissionsDetailedSummaryResponse,
  GetEmissionFactorsResponse,
} from "@repo/types";
import { enqueueSnackbar } from "notistack";
import { apiClient } from "@/api/http";
import { exportCarbonInventoryToExcel } from "@/utils/exportCarbonInventoryToExcel";

export function useDownloadCarbonInventory() {
  const [isDownloading, setIsDownloading] = useState(false);
  const isDownloadingRef = useRef(false);

  const download = useCallback(
    async (id: string, name: string | null, year: number | null) => {
      if (isDownloadingRef.current) return;
      isDownloadingRef.current = true;
      setIsDownloading(true);
      try {
        const [summaryData, factorsData] = await Promise.all([
          apiClient
            .get(`carbon-inventories/${id}/emissions-summary`)
            .json<GetEmissionsDetailedSummaryResponse>(),
          apiClient
            .get(`carbon-inventories/${id}/emission-factors`)
            .json<GetEmissionFactorsResponse>(),
        ]);
        await exportCarbonInventoryToExcel(
          name,
          year,
          summaryData,
          factorsData
        );
        enqueueSnackbar("Huella descargada", { variant: "success" });
      } catch {
        enqueueSnackbar("No se pudo descargar la huella", { variant: "error" });
      } finally {
        isDownloadingRef.current = false;
        setIsDownloading(false);
      }
    },
    []
  );

  return { download, isDownloading };
}

import { useState, useCallback, useRef } from "react";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { enqueueSnackbar } from "notistack";
import { apiClient } from "@/api/http";
import { exportReductionProjectToExcel } from "@/utils/exportReductionProjectToExcel";

export function useDownloadReductionProject() {
  const [isDownloading, setIsDownloading] = useState(false);
  const isDownloadingRef = useRef(false);

  const download = useCallback(async (id: string, organizationName: string) => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    try {
      const project = await apiClient
        .get(`reduction-projects/${id}`)
        .json<GetReductionProjectByIdResponse>();
      await exportReductionProjectToExcel(project, organizationName);
      enqueueSnackbar("Proyecto descargado", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo descargar el proyecto", {
        variant: "error",
      });
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}

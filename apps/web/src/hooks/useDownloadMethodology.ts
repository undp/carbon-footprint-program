import { useState, useCallback, useRef } from "react";
import { useSnackbar } from "notistack";
import type { GetMethodologyExportResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { exportMethodologyToExcel } from "@/utils/exportMethodologyToExcel";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

export function useDownloadMethodology() {
  const { enqueueSnackbar } = useSnackbar();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const isDownloadingRef = useRef(false);

  const download = useCallback(
    async (id: string) => {
      if (isDownloadingRef.current) return;
      isDownloadingRef.current = true;
      setDownloadingId(id);
      try {
        const data = await apiClient
          .get(`methodologies/${id}/export`)
          .json<GetMethodologyExportResponse>();
        await exportMethodologyToExcel(data);
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(
            error,
            "Error al generar el archivo Excel de la metodología"
          ),
          variant: "error",
        });
      } finally {
        isDownloadingRef.current = false;
        setDownloadingId(null);
      }
    },
    [enqueueSnackbar]
  );

  return { download, downloadingId };
}

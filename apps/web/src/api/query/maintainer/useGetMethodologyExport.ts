import { useQuery } from "@tanstack/react-query";
import type { GetMethodologyExportResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const methodologyExportKey = (id: string | undefined) =>
  ["methodologies", id ?? "none", "export"] as const;

export const useGetMethodologyExport = (id: string | undefined) =>
  useQuery<GetMethodologyExportResponse>({
    queryKey: methodologyExportKey(id),
    queryFn: () =>
      apiClient
        .get(`methodologies/${id}/export`)
        .json<GetMethodologyExportResponse>(),
    staleTime: STALE_TIME_MS,
    enabled: false,
  });

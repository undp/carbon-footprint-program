import { useCallback } from "react";
import type { GetCarbonInventoryMethodologyExportResponse } from "@repo/types";
import { apiClient } from "@/api/http/client";
import { useAuthorizationHeader } from "./authHeaders";

/**
 * Imperative fetcher for the user-scoped methodology export, mirroring
 * `useCarbonInventoryFilesManifest`. Invoked on the "Descargar" click; the
 * methodology snapshot is per-download so caching it would be wasted.
 */
export async function fetchCarbonInventoryMethodologyExport(
  inventoryId: string,
  headers: Record<string, string>,
  options?: { signal?: AbortSignal }
): Promise<GetCarbonInventoryMethodologyExportResponse> {
  return apiClient
    .get(`carbon-inventories/${inventoryId}/methodology-export`, {
      headers,
      signal: options?.signal,
    })
    .json<GetCarbonInventoryMethodologyExportResponse>();
}

export const useCarbonInventoryMethodologyExport = (inventoryId: string) => {
  const { headers } = useAuthorizationHeader(inventoryId);

  const getMethodologyExport = useCallback(
    (options?: { signal?: AbortSignal }) =>
      fetchCarbonInventoryMethodologyExport(inventoryId, headers, options),
    [inventoryId, headers]
  );

  return { getMethodologyExport };
};

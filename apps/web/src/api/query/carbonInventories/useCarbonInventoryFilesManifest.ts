import { useCallback } from "react";
import type { GetCarbonInventoryFilesManifestResponse } from "@repo/types";
import { apiClient } from "@/api/http/client";
import { useAuthorizationHeader } from "./authHeaders";

/**
 * Imperative fetcher for the carbon-inventory files manifest. Kept imperative
 * (like `usePreviewCarbonInventoryLineFile`) because it's invoked on a
 * button click — there is no need for TanStack Query caching here.
 */
export async function fetchCarbonInventoryFilesManifest(
  inventoryId: string,
  headers: Record<string, string>,
  options?: { signal?: AbortSignal }
): Promise<GetCarbonInventoryFilesManifestResponse> {
  return apiClient
    .get(`carbon-inventories/${inventoryId}/files-manifest`, {
      headers,
      signal: options?.signal,
    })
    .json<GetCarbonInventoryFilesManifestResponse>();
}

export const useCarbonInventoryFilesManifest = (inventoryId: string) => {
  const { headers } = useAuthorizationHeader(inventoryId);

  const getFilesManifest = useCallback(
    (options?: { signal?: AbortSignal }) =>
      fetchCarbonInventoryFilesManifest(inventoryId, headers, options),
    [inventoryId, headers]
  );

  return { getFilesManifest };
};

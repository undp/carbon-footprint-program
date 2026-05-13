import { useCallback } from "react";
import type { PreviewLineFileResponse } from "@repo/types";
import { apiClient } from "@/api/http/client";
import { useAuthorizationHeader } from "./authHeaders";

export const usePreviewCarbonInventoryLineFile = (inventoryId: string) => {
  const { headers } = useAuthorizationHeader(inventoryId);

  const getPreviewUrl = useCallback(
    async (uuid: string): Promise<string> => {
      const { url } = await apiClient
        .get(`carbon-inventories/${inventoryId}/files/${uuid}/preview`, {
          headers,
        })
        .json<PreviewLineFileResponse>();
      return url;
    },
    [inventoryId, headers]
  );

  return { getPreviewUrl };
};

import { useCallback } from "react";
import { apiClient } from "@/api/http/client";
import type { PreviewFileResponse } from "@repo/types";

export const usePreviewFile = () => {
  const getPreviewUrl = useCallback(async (uuid: string): Promise<string> => {
    const { url } = await apiClient
      .get(`files/${uuid}/preview`)
      .json<PreviewFileResponse>();
    return url;
  }, []);

  return { getPreviewUrl };
};

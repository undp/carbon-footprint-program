import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type {
  BadgeType,
  RequestBadgeUploadResponse,
  ConfirmBadgeUploadResponse,
} from "@repo/types";
import { badgeKeys } from "./keys";

interface UseBadgeUploadResult {
  upload: (
    file: File,
    badgeType: BadgeType
  ) => Promise<ConfirmBadgeUploadResponse>;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

export const useBadgeUpload = (): UseBadgeUploadResult => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const upload = useCallback(
    async (
      file: File,
      badgeType: BadgeType
    ): Promise<ConfirmBadgeUploadResponse> => {
      setIsUploading(true);
      setError(null);
      try {
        const { uuid, uploadUrl } = await apiClient
          .post(`files/badge/${badgeType}/request-upload`, {
            json: { originalName: file.name },
          })
          .json<RequestBadgeUploadResponse>();

        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!putResponse.ok) {
          throw new Error(
            `Upload to blob storage failed (${putResponse.status})`
          );
        }

        const result = await apiClient
          .post(`files/badge/${badgeType}/confirm-upload`, {
            json: { uuid, originalName: file.name },
          })
          .json<ConfirmBadgeUploadResponse>();

        await queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });

        return result;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error(String(err));
        setError(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [queryClient]
  );

  return { upload, isUploading, error, reset };
};

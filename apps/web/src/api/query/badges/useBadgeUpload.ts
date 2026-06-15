import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { uploadFile } from "@/api/lib/uploadFile";
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
        const presignedUpload = await apiClient
          .post(`files/badge/${badgeType}/request-upload`, {
            json: { originalName: file.name },
          })
          .json<RequestBadgeUploadResponse>();

        await uploadFile(presignedUpload, file);

        const result = await apiClient
          .post(`files/badge/${badgeType}/confirm-upload`, {
            json: { uuid: presignedUpload.uuid, originalName: file.name },
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

import { useCallback, useRef, useState } from "react";
import { apiClient } from "@/api/http/client";
import { uploadFile } from "@/api/lib/uploadFile";
import type {
  ConfirmLineFileUploadResponse,
  RequestLineFileUploadResponse,
} from "@repo/types";
import { useAuthorizationHeader } from "./authHeaders";

export type UploadedLineFile = ConfirmLineFileUploadResponse;

const uploadOneFile = async (
  inventoryId: string,
  file: File,
  headers: Record<string, string>
): Promise<UploadedLineFile> => {
  const presignedUpload = await apiClient
    .post(`carbon-inventories/${inventoryId}/files/request-upload`, {
      json: { originalName: file.name },
      headers,
    })
    .json<RequestLineFileUploadResponse>();

  await uploadFile(presignedUpload, file);

  return apiClient
    .post(`carbon-inventories/${inventoryId}/files/confirm-upload`, {
      json: { uuid: presignedUpload.uuid, originalName: file.name },
      headers,
    })
    .json<ConfirmLineFileUploadResponse>();
};

export const useUploadCarbonInventoryLineFiles = (inventoryId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Tracks concurrent invocations so a fast-finishing call doesn't flip
  // `isUploading` to false while a slower sibling call is still in flight.
  const inFlightCountRef = useRef(0);
  const { headers } = useAuthorizationHeader(inventoryId);

  const preUploadFiles = useCallback(
    async (files: File[]): Promise<UploadedLineFile[]> => {
      inFlightCountRef.current += 1;
      setIsUploading(true);
      setHasError(false);
      try {
        return await Promise.all(
          files.map((file) => uploadOneFile(inventoryId, file, headers))
        );
      } catch (error) {
        setHasError(true);
        throw error;
      } finally {
        inFlightCountRef.current -= 1;
        if (inFlightCountRef.current === 0) setIsUploading(false);
      }
    },
    [inventoryId, headers]
  );

  return { preUploadFiles, isUploading, hasError };
};

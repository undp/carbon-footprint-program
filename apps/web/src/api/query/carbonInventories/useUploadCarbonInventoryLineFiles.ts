import { useCallback, useRef, useState } from "react";
import { apiClient } from "@/api/http/client";
import type {
  ConfirmLineFileUploadResponse,
  RequestLineFileUploadResponse,
} from "@repo/types";

export type UploadedLineFile = ConfirmLineFileUploadResponse;

const uploadOneFile = async (
  inventoryId: string,
  file: File
): Promise<UploadedLineFile> => {
  const { uuid, uploadUrl } = await apiClient
    .post(`carbon-inventories/${inventoryId}/files/request-upload`, {
      json: { originalName: file.name },
    })
    .json<RequestLineFileUploadResponse>();

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
      `File upload failed (${putResponse.status}): ${await putResponse.text()}`
    );
  }

  return apiClient
    .post(`carbon-inventories/${inventoryId}/files/confirm-upload`, {
      json: { uuid, originalName: file.name },
    })
    .json<ConfirmLineFileUploadResponse>();
};

export const useUploadCarbonInventoryLineFiles = (inventoryId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Tracks concurrent invocations so a fast-finishing call doesn't flip
  // `isUploading` to false while a slower sibling call is still in flight.
  const inFlightCountRef = useRef(0);

  const preUploadFiles = useCallback(
    async (files: File[]): Promise<UploadedLineFile[]> => {
      inFlightCountRef.current += 1;
      setIsUploading(true);
      setHasError(false);
      try {
        return await Promise.all(
          files.map((file) => uploadOneFile(inventoryId, file))
        );
      } catch (error) {
        setHasError(true);
        throw error;
      } finally {
        inFlightCountRef.current -= 1;
        if (inFlightCountRef.current === 0) setIsUploading(false);
      }
    },
    [inventoryId]
  );

  return { preUploadFiles, isUploading, hasError };
};

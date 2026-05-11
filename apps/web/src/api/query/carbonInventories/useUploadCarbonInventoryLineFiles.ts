import { useCallback, useState } from "react";
import { apiClient } from "@/api/http/client";
import type {
  RequestLineFileUploadResponse,
  ConfirmLineFileUploadResponse,
} from "@repo/types";

export interface UploadedLineFile {
  uuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

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

  await apiClient
    .post(`carbon-inventories/${inventoryId}/files/confirm-upload`, {
      json: { uuid, originalName: file.name },
    })
    .json<ConfirmLineFileUploadResponse>();

  return {
    uuid,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
};

export const useUploadCarbonInventoryLineFiles = (inventoryId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const preUploadFiles = useCallback(
    async (files: File[]): Promise<UploadedLineFile[]> => {
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
        setIsUploading(false);
      }
    },
    [inventoryId]
  );

  return { preUploadFiles, isUploading, hasError };
};

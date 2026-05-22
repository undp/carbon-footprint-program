import { useCallback, useState } from "react";
import { apiClient } from "@/api/http/client";
import { FileType } from "@repo/types";

const preUploadOneFile = async (file: File): Promise<string> => {
  const mimeType = file.type || "application/octet-stream";
  const { uuid, uploadUrl } = await apiClient
    .post("files/request-upload", {
      json: {
        originalName: file.name,
        fileType: FileType.SUBMISSION,
        sizeBytes: file.size,
        mimeType,
      },
    })
    .json<{ uuid: string; uploadUrl: string }>();

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": mimeType,
    },
  });

  if (!response.ok) {
    throw new Error(
      `File upload failed (${response.status}): ${await response.text()}`
    );
  }

  await apiClient
    .post("files/confirm-upload", {
      json: { uuid, originalName: file.name, fileType: FileType.SUBMISSION },
    })
    .json();

  return uuid;
};

export const usePreUploadSubmissionFiles = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const preUploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      setIsUploading(true);
      setHasError(false);
      try {
        const results = await Promise.all(files.map(preUploadOneFile));
        return results;
      } catch (error) {
        setHasError(true);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );
  return {
    preUploadFiles,
    isUploading,
    hasError,
  };
};

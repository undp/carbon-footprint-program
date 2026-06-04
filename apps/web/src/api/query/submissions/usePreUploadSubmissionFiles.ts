import { useCallback, useState } from "react";
import { apiClient } from "@/api/http/client";
import { uploadFile } from "@/api/lib/uploadFile";
import { FileType, type RequestUploadResponse } from "@repo/types";

const preUploadOneFile = async (file: File): Promise<string> => {
  const { uuid, uploadUrl, uploadMethod, uploadHeaders } = await apiClient
    .post("files/request-upload", {
      json: { originalName: file.name, fileType: FileType.SUBMISSION },
    })
    .json<RequestUploadResponse>();

  await uploadFile({
    url: uploadUrl,
    method: uploadMethod,
    headers: uploadHeaders,
    body: file,
  });

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

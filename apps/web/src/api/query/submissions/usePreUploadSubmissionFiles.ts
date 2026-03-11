import { useCallback } from "react";
import { apiClient } from "@/api/http/client";
import { FileType } from "@repo/types";

const preUploadOneFile = async (file: File): Promise<string> => {
  const { uuid, uploadUrl } = await apiClient
    .post("files/request-upload", {
      json: { originalName: file.name, fileType: FileType.SUBMISSION },
    })
    .json<{ uuid: string; uploadUrl: string }>();

  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  await apiClient
    .post("files/confirm-upload", {
      json: { uuid, originalName: file.name, fileType: FileType.SUBMISSION },
    })
    .json();

  return uuid;
};

export const usePreUploadSubmissionFiles = (): ((
  files: File[]
) => Promise<string[]>) =>
  useCallback(
    async (files: File[]): Promise<string[]> =>
      Promise.all(files.map(preUploadOneFile)),
    []
  );

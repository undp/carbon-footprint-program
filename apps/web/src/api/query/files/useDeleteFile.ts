import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import type { DeleteFileResponse } from "@repo/types";

export const useDeleteFile = () => {
  return useMutation<DeleteFileResponse, Error, { uuid: string }>({
    mutationFn: async ({ uuid }) =>
      apiClient.delete(`files/${uuid}`).json<DeleteFileResponse>(),
  });
};

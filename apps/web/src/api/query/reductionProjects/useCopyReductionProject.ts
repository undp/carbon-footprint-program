import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CopyReductionProjectResponse } from "@repo/types";
import { invalidateReductionProjects } from "./keys";
import { apiClient } from "@/api/http";

export const useCopyReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<CopyReductionProjectResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`reduction-projects/${id}/copy`).json(),
    onSuccess: () => invalidateReductionProjects(queryClient),
  });
};

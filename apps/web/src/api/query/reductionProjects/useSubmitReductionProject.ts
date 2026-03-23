import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitReductionProjectResponse } from "@repo/types";
import {
  invalidateReductionProjects,
  invalidateReductionProjectDetail,
  invalidateSealApplications,
} from "./keys";
import { apiClient } from "@/api/http";

export const useSubmitReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<SubmitReductionProjectResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`reduction-projects/${id}/submit`).json(),
    onSuccess: async (_data, id) => {
      await Promise.all([
        invalidateReductionProjects(queryClient),
        invalidateReductionProjectDetail(queryClient, id),
        invalidateSealApplications(queryClient),
      ]);
    },
  });
};

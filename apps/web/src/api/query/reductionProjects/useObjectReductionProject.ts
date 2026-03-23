import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ObjectReductionProjectResponse } from "@repo/types";
import {
  invalidateReductionProjects,
  invalidateSealApplications,
} from "./keys";
import { apiClient } from "@/api/http";

export const useObjectReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<ObjectReductionProjectResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`reduction-projects/${id}/object`).json(),
    onSuccess: () =>
      Promise.all([
        invalidateReductionProjects(queryClient),
        invalidateSealApplications(queryClient),
      ]),
  });
};

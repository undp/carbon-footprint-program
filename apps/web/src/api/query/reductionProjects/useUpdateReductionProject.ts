import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateReductionProjectRequest,
  UpdateReductionProjectResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";

export const useUpdateReductionProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateReductionProjectResponse,
    Error,
    UpdateReductionProjectRequest
  >({
    mutationFn: (data) =>
      apiClient.patch(`reduction-projects/${projectId}`, { json: data }).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(projectId) &&
            query.queryKey.includes(
              ReductionProjectQueryKey.AttributesUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(ReductionProjectQueryKey.ListDependency),
        }),
      ]);
    },
  });
};

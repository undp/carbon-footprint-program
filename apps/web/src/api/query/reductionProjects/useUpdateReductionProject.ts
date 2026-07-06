import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateReductionProjectRequest } from "@repo/types";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";

export const useUpdateReductionProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateReductionProjectRequest>({
    // The endpoint returns an empty body (`z.null()`); calling `.json()` on it
    // would throw, so we await the request without parsing.
    mutationFn: async (data) => {
      await apiClient.patch(`reduction-projects/${projectId}`, { json: data });
    },
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

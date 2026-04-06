import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteReductionProjectResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";

export const useDeleteReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteReductionProjectResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`reduction-projects/${id}`).json(),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
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

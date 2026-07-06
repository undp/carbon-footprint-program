import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";

export const useDeleteReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    // The endpoint returns an empty body (`z.null()`); calling `.json()` on it
    // would throw, so we await the request without parsing.
    mutationFn: async (id) => {
      await apiClient.delete(`reduction-projects/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(ReductionProjectQueryKey.ListDependency),
      });
    },
  });
};

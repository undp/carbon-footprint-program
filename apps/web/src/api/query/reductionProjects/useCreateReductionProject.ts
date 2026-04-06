import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateReductionProjectRequest,
  CreateReductionProjectResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";

export const useCreateReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateReductionProjectResponse,
    Error,
    CreateReductionProjectRequest
  >({
    mutationFn: (data) =>
      apiClient.post("reduction-projects", { json: data }).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(ReductionProjectQueryKey.ListDependency),
      });
    },
  });
};

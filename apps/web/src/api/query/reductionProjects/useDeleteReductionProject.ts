import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateReductionProjects } from "./keys";
import { apiClient } from "@/api/http";

export const useDeleteReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`reduction-projects/${id}`).json(),
    onSuccess: () => invalidateReductionProjects(queryClient),
  });
};

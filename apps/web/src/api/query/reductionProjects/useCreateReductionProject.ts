import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateReductionProjectBody,
  CreateReductionProjectResponse,
} from "@repo/types";
import { invalidateReductionProjects } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateReductionProjectResponse,
    Error,
    CreateReductionProjectBody
  >({
    mutationFn: (data) =>
      apiClient.post("reduction-projects", { json: data }).json(),
    onSuccess: () => invalidateReductionProjects(queryClient),
  });
};

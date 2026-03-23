import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateReductionProjectBody,
  UpdateReductionProjectResponse,
} from "@repo/types";
import {
  invalidateReductionProjects,
  invalidateReductionProjectDetail,
} from "./keys";
import { apiClient } from "@/api/http";

type Variables = {
  id: string;
  data: UpdateReductionProjectBody;
};

export const useUpdateReductionProject = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateReductionProjectResponse, Error, Variables>({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`reduction-projects/${id}`, { json: data }).json(),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        invalidateReductionProjects(queryClient),
        invalidateReductionProjectDetail(queryClient, variables.id),
      ]);
    },
  });
};

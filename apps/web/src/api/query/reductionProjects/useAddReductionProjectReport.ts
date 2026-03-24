import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AddReductionProjectReportBody,
  AddReductionProjectReportResponse,
} from "@repo/types";
import { invalidateReductionProjectDetail, invalidateReductionProjects } from "./keys";
import { apiClient } from "@/api/http";

type Variables = {
  id: string;
  data: AddReductionProjectReportBody;
};

export const useAddReductionProjectReport = () => {
  const queryClient = useQueryClient();

  return useMutation<AddReductionProjectReportResponse, Error, Variables>({
    mutationFn: ({ id, data }) =>
      apiClient
        .post(`reduction-projects/${id}/reports`, { json: data })
        .json(),
    onSuccess: async (_data, variables) => {
      await invalidateReductionProjectDetail(queryClient, variables.id);
      await invalidateReductionProjects(queryClient);
    },
  });
};

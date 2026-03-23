import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AddReductionProjectReportBody,
  AddReductionProjectReportResponse,
} from "@repo/types";
import { invalidateReductionProjectDetail } from "./keys";
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
    onSuccess: (_data, variables) =>
      invalidateReductionProjectDetail(queryClient, variables.id),
  });
};

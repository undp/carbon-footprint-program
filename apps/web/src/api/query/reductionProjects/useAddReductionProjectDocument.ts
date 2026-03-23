import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AddReductionProjectDocumentBody,
  AddReductionProjectDocumentResponse,
} from "@repo/types";
import { invalidateReductionProjectDetail } from "./keys";
import { apiClient } from "@/api/http";

type Variables = {
  id: string;
  data: AddReductionProjectDocumentBody;
};

export const useAddReductionProjectDocument = () => {
  const queryClient = useQueryClient();

  return useMutation<AddReductionProjectDocumentResponse, Error, Variables>({
    mutationFn: ({ id, data }) =>
      apiClient
        .post(`reduction-projects/${id}/documents`, { json: data })
        .json(),
    onSuccess: (_data, variables) =>
      invalidateReductionProjectDetail(queryClient, variables.id),
  });
};

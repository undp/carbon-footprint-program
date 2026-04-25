import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllExplanationsResponse,
  UpdateExplanationRequest,
  UpdateExplanationResponse,
} from "@repo/types";

export const useExplanations = () =>
  useQuery<GetAllExplanationsResponse>({
    queryKey: maintainerKeys.explanations.all(),
    queryFn: () => apiClient.get("admin/explanations").json(),
    staleTime: STALE_TIME_MS,
  });

interface UpdateExplanationVariables {
  slug: string;
  content: UpdateExplanationRequest["content"];
}

export const useUpdateExplanation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateExplanationResponse,
    Error,
    UpdateExplanationVariables
  >({
    mutationFn: ({ slug, content }) =>
      apiClient
        .patch(`admin/explanations/${encodeURIComponent(slug)}`, {
          json: { content },
        })
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.explanations.all(),
        exact: true,
      });
    },
  });
};

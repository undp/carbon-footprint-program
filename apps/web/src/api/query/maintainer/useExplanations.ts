import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllExplanationsResponse,
  UpdateExplanationRequest,
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
  return useMutation<void, Error, UpdateExplanationVariables>({
    mutationFn: async ({ slug, content }) => {
      await apiClient.patch(`admin/explanations/${encodeURIComponent(slug)}`, {
        json: { content },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.ExplanationsUpdateDependency
          ),
      });
    },
  });
};

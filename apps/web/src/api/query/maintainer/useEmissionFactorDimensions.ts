import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetEmissionFactorDimensionsResponse,
  UpsertEmissionFactorDimensionsRequest,
  UpsertEmissionFactorDimensionsResponse,
} from "@repo/types";

export const useEmissionFactorDimensions = (methodologyVersionId?: string) =>
  useQuery<GetEmissionFactorDimensionsResponse>({
    queryKey: maintainerKeys.emissionFactorDimensions.all(
      methodologyVersionId ?? ""
    ),
    queryFn: () =>
      apiClient
        .get("emission-factor-dimensions", {
          searchParams: { methodologyVersionId },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!methodologyVersionId,
  });

export const useUpsertEmissionFactorDimensions = (
  methodologyVersionId?: string
) => {
  const queryClient = useQueryClient();
  return useMutation<
    UpsertEmissionFactorDimensionsResponse,
    Error,
    UpsertEmissionFactorDimensionsRequest
  >({
    mutationFn: (data) =>
      apiClient.put("emission-factor-dimensions", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey:
            maintainerKeys.emissionFactorDimensions.all(methodologyVersionId),
        });
        // Also invalidate emission factors since dimensions affect how they display
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
        });
      }
    },
  });
};

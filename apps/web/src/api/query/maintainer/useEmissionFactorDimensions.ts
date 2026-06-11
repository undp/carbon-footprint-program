import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetEmissionFactorDimensionsResponse,
  CreateEmissionFactorDimensionRequest,
  CreateEmissionFactorDimensionResponse,
  UpdateEmissionFactorDimensionRequest,
  UpdateEmissionFactorDimensionResponse,
  DeleteEmissionFactorDimensionParams,
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

export const useAddEmissionFactorDimension = (
  methodologyVersionId?: string
) => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateEmissionFactorDimensionResponse,
    Error,
    CreateEmissionFactorDimensionRequest
  >({
    mutationFn: (data) =>
      apiClient.post("emission-factor-dimensions", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey:
            maintainerKeys.emissionFactorDimensions.all(methodologyVersionId),
          exact: true,
        });
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

export const useUpdateEmissionFactorDimension = (
  methodologyVersionId?: string
) => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateEmissionFactorDimensionResponse,
    Error,
    { id: string; data: UpdateEmissionFactorDimensionRequest }
  >({
    mutationFn: ({ id, data }) =>
      apiClient
        .patch(`emission-factor-dimensions/${id}`, { json: data })
        .json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey:
            maintainerKeys.emissionFactorDimensions.all(methodologyVersionId),
        });
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
        });
      }
    },
  });
};

export const useDeleteEmissionFactorDimension = (
  methodologyVersionId?: string
) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteEmissionFactorDimensionParams>({
    mutationFn: async ({ id }) => {
      await apiClient.delete(`emission-factor-dimensions/${id}`);
    },
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey:
            maintainerKeys.emissionFactorDimensions.all(methodologyVersionId),
        });
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
        });
      }
    },
  });
};

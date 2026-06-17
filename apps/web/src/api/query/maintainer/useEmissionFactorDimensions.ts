import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
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

// Invalidating by `DimensionsUpdateDependency` also refreshes emission factors,
// whose key declares that token (the EF grid renders dimension values, and the
// dimensions grid renders `subcategoryHasEmissionFactors`).
const invalidateDimensions = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey.includes(MaintainerQueryKey.DimensionsUpdateDependency),
  });

export const useAddEmissionFactorDimension = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateEmissionFactorDimensionResponse,
    Error,
    CreateEmissionFactorDimensionRequest
  >({
    mutationFn: (data) =>
      apiClient.post("emission-factor-dimensions", { json: data }).json(),
    onSuccess: () => {
      void invalidateDimensions(queryClient);
    },
  });
};

export const useUpdateEmissionFactorDimension = () => {
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
      void invalidateDimensions(queryClient);
    },
  });
};

export const useDeleteEmissionFactorDimension = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteEmissionFactorDimensionParams>({
    mutationFn: async ({ id }) => {
      await apiClient.delete(`emission-factor-dimensions/${id}`);
    },
    onSuccess: () => {
      void invalidateDimensions(queryClient);
    },
  });
};

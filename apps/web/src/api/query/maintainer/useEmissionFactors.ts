import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllEmissionFactorsResponse,
  CreateEmissionFactorRequest,
  CreateEmissionFactorResponse,
  UpdateEmissionFactorRequest,
  UpdateEmissionFactorResponse,
} from "@repo/types";

export const useEmissionFactors = (methodologyVersionId?: string) =>
  useQuery<GetAllEmissionFactorsResponse>({
    queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId ?? ""),
    queryFn: () =>
      apiClient
        .get("emission-factors", {
          searchParams: { methodologyVersionId },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!methodologyVersionId,
  });

export const useAddEmissionFactor = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateEmissionFactorResponse,
    Error,
    CreateEmissionFactorRequest
  >({
    mutationFn: (data) =>
      apiClient.post("emission-factors", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

interface UpdateEmissionFactorVariables {
  emissionFactorId: string;
  data: UpdateEmissionFactorRequest;
}

export const useUpdateEmissionFactor = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateEmissionFactorResponse,
    Error,
    UpdateEmissionFactorVariables
  >({
    mutationFn: ({ emissionFactorId, data }) =>
      apiClient
        .patch(`emission-factors/${emissionFactorId}`, { json: data })
        .json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

export const useDeleteEmissionFactor = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (emissionFactorId) => {
      await apiClient.delete(`emission-factors/${emissionFactorId}`);
    },
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.emissionFactors.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

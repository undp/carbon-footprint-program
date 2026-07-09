import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
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

export const useAddEmissionFactor = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateEmissionFactorResponse,
    Error,
    CreateEmissionFactorRequest
  >({
    mutationFn: (data) =>
      apiClient.post("emission-factors", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.EmissionFactorsUpdateDependency
          ),
      });
    },
  });
};

interface UpdateEmissionFactorVariables {
  emissionFactorId: string;
  data: UpdateEmissionFactorRequest;
}

export const useUpdateEmissionFactor = () => {
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
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.EmissionFactorsUpdateDependency
          ),
      });
    },
  });
};

export const useDeleteEmissionFactor = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (emissionFactorId) => {
      await apiClient.delete(`emission-factors/${emissionFactorId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.EmissionFactorsUpdateDependency
          ),
      });
    },
  });
};

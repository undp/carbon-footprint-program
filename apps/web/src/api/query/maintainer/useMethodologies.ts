import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllMethodologiesResponse,
  CreateMethodologyRequest,
  CreateMethodologyResponse,
  UpdateMethodologyRequest,
  UpdateMethodologyResponse,
  DeleteMethodologyResponse,
  DuplicateMethodologyResponse,
} from "@repo/types";

export const useMethodologies = () =>
  useQuery<GetAllMethodologiesResponse>({
    queryKey: maintainerKeys.methodologies.all,
    queryFn: () => apiClient.get("methodologies").json(),
    staleTime: STALE_TIME_MS,
  });

export const useAddMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateMethodologyResponse,
    Error,
    CreateMethodologyRequest
  >({
    mutationFn: (data) =>
      apiClient.post("methodologies", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
        exact: true,
      });
    },
  });
};

interface UpdateMethodologyVariables {
  id: string;
  data: UpdateMethodologyRequest;
}

export const useUpdateMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateMethodologyResponse,
    Error,
    UpdateMethodologyVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`methodologies/${id}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
        exact: true,
      });
    },
  });
};

export const useDeleteMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteMethodologyResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`methodologies/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
        exact: true,
      });
    },
  });
};

export const useDuplicateMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<DuplicateMethodologyResponse, Error, string>({
    mutationFn: (id) => apiClient.post(`methodologies/${id}/duplicate`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.methodologies.all,
        exact: true,
      });
    },
  });
};

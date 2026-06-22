import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
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
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.MethodologiesUpdateDependency
          ),
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
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.MethodologiesUpdateDependency
          ),
      });
    },
  });
};

export const useDeleteMethodology = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteMethodologyResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`methodologies/${id}`).json(),
    // The deleted `id` is the methodologyVersionId, so clear every maintainer
    // query scoped to that version (its categories/subcategories/emission
    // factors/dimensions/initiatives) along with the methodologies list. Scoped
    // to the maintainer namespace (queryKey[0] === Root) so a numeric version id
    // can't collide with same-id queries in other namespaces.
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === MaintainerQueryKey.Root &&
          (query.queryKey.includes(id) ||
            query.queryKey.includes(
              MaintainerQueryKey.MethodologiesUpdateDependency
            )),
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
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.MethodologiesUpdateDependency
          ),
      });
    },
  });
};

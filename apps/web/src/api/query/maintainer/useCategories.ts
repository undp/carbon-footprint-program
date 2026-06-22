import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllCategoriesResponse,
  CreateCategoryRequest,
  CreateCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
  SwapCategoryPositionsRequest,
  SwapCategoryPositionsResponse,
} from "@repo/types";

export const useCategories = (methodologyVersionId?: string) =>
  useQuery<GetAllCategoriesResponse>({
    queryKey: maintainerKeys.categories.all(methodologyVersionId ?? ""),
    queryFn: () =>
      apiClient
        .get("categories", {
          searchParams: { methodologyVersionId },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!methodologyVersionId,
  });

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<CreateCategoryResponse, Error, CreateCategoryRequest>({
    mutationFn: (data) => apiClient.post("categories", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.CategoriesUpdateDependency
          ),
      });
    },
  });
};

interface UpdateCategoryVariables {
  id: string;
  data: UpdateCategoryRequest;
}

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateCategoryResponse, Error, UpdateCategoryVariables>({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`categories/${id}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.CategoriesUpdateDependency
          ),
      });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`categories/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.CategoriesUpdateDependency
          ),
      });
    },
  });
};

export const useSwapCategoryPositions = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SwapCategoryPositionsResponse,
    Error,
    SwapCategoryPositionsRequest
  >({
    mutationFn: (data) =>
      apiClient.post("categories/swap-positions", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.CategoriesUpdateDependency
          ),
      });
    },
  });
};

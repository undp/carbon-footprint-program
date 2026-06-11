import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
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

export const useAddCategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<CreateCategoryResponse, Error, CreateCategoryRequest>({
    mutationFn: (data) => apiClient.post("categories", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

interface UpdateCategoryVariables {
  id: string;
  data: UpdateCategoryRequest;
}

export const useUpdateCategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<UpdateCategoryResponse, Error, UpdateCategoryVariables>({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`categories/${id}`, { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

export const useDeleteCategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`categories/${id}`);
    },
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

export const useSwapCategoryPositions = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    SwapCategoryPositionsResponse,
    Error,
    SwapCategoryPositionsRequest
  >({
    mutationFn: (data) =>
      apiClient.post("categories/swap-positions", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
          exact: true,
        });
      }
    },
  });
};

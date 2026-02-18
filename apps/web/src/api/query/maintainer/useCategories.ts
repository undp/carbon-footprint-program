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
  DeleteCategoryResponse,
} from "@repo/types";

export const useCategories = (methodologyVersionId: string | undefined) =>
  useQuery<GetAllCategoriesResponse>({
    queryKey: maintainerKeys.categories.all(methodologyVersionId ?? ""),
    queryFn: () =>
      apiClient
        .get("categories", {
          searchParams: { methodologyVersionId: methodologyVersionId! },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!methodologyVersionId,
  });

export const useAddCategory = (methodologyVersionId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCategoryResponse,
    Error,
    CreateCategoryRequest
  >({
    mutationFn: (data) =>
      apiClient.post("categories", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
        });
      }
    },
  });
};

interface UpdateCategoryVariables {
  id: string;
  data: UpdateCategoryRequest;
}

export const useUpdateCategory = (
  methodologyVersionId: string | undefined
) => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCategoryResponse,
    Error,
    UpdateCategoryVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`categories/${id}`, { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
        });
      }
    },
  });
};

export const useDeleteCategory = (
  methodologyVersionId: string | undefined
) => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCategoryResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`categories/${id}`).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.categories.all(methodologyVersionId),
        });
      }
    },
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllSubcategoriesResponse,
  CreateSubcategoryRequest,
  CreateSubcategoryResponse,
  UpdateSubcategoryRequest,
  UpdateSubcategoryResponse,
} from "@repo/types";

export const useSubcategories = (methodologyVersionId?: string) =>
  useQuery<GetAllSubcategoriesResponse>({
    queryKey: maintainerKeys.subcategories.all(methodologyVersionId ?? ""),
    queryFn: () =>
      apiClient
        .get("subcategories", {
          searchParams: { methodologyVersionId },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!methodologyVersionId,
  });

export const useAddSubcategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateSubcategoryResponse,
    Error,
    CreateSubcategoryRequest
  >({
    mutationFn: (data) =>
      apiClient.post("subcategories", { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.subcategories.all(methodologyVersionId),
        });
      }
    },
  });
};

interface UpdateSubcategoryVariables {
  subcategoryId: string;
  data: UpdateSubcategoryRequest;
}

export const useUpdateSubcategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateSubcategoryResponse,
    Error,
    UpdateSubcategoryVariables
  >({
    mutationFn: ({ subcategoryId, data }) =>
      apiClient.patch(`subcategories/${subcategoryId}`, { json: data }).json(),
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.subcategories.all(methodologyVersionId),
        });
      }
    },
  });
};

export const useDeleteSubcategory = (methodologyVersionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (subcategoryId) => {
      await apiClient.delete(`subcategories/${subcategoryId}`);
    },
    onSuccess: () => {
      if (methodologyVersionId) {
        void queryClient.invalidateQueries({
          queryKey: maintainerKeys.subcategories.all(methodologyVersionId),
        });
      }
    },
  });
};

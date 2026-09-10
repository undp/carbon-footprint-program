import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllSubcategoriesResponse,
  CreateSubcategoryRequest,
  CreateSubcategoryResponse,
  UpdateSubcategoryRequest,
  UpdateSubcategoryResponse,
  SwapSubcategoryPositionsRequest,
  SwapSubcategoryPositionsResponse,
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

export const useAddSubcategory = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateSubcategoryResponse,
    Error,
    CreateSubcategoryRequest
  >({
    mutationFn: (data) =>
      apiClient.post("subcategories", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.SubcategoriesUpdateDependency
          ),
      });
    },
  });
};

interface UpdateSubcategoryVariables {
  subcategoryId: string;
  data: UpdateSubcategoryRequest;
}

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateSubcategoryResponse,
    Error,
    UpdateSubcategoryVariables
  >({
    mutationFn: ({ subcategoryId, data }) =>
      apiClient.patch(`subcategories/${subcategoryId}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.SubcategoriesUpdateDependency
          ),
      });
    },
  });
};

export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (subcategoryId) => {
      await apiClient.delete(`subcategories/${subcategoryId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.SubcategoriesUpdateDependency
          ),
      });
    },
  });
};

export const useSwapSubcategoryPositions = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SwapSubcategoryPositionsResponse,
    Error,
    SwapSubcategoryPositionsRequest
  >({
    mutationFn: (data) =>
      apiClient.post("subcategories/swap-positions", { json: data }).json(),
    // Returned, not fire-and-forget: the swap's own refetch is what repaints
    // the new order, so `mutateAsync` has to stay pending until it lands.
    // useMaintainerRowReorder disables the arrows for exactly that long, and a
    // move decided from the pre-swap positions would send the same pair again
    // and swap it straight back.
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.SubcategoriesUpdateDependency
          ),
      }),
  });
};

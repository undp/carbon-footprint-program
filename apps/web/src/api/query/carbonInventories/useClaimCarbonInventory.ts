import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClaimCarbonInventoryResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "./keys";

export const useClaimCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ClaimCarbonInventoryResponse,
    Error,
    { inventoryId: string; uuid: string }
  >({
    mutationFn: ({ inventoryId, uuid }) =>
      apiClient
        .post(`carbon-inventories/${inventoryId}/claim`, {
          headers: { "x-carbon-inventory-uuid": uuid },
        })
        .json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
      });
    },
  });
};

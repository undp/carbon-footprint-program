import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type { DuplicateCarbonInventoryResponse } from "@repo/types";
import { CarbonInventoryQueryKey } from "./keys";

export const useDuplicateCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<DuplicateCarbonInventoryResponse, Error, string>({
    mutationFn: (carbonInventoryId: string) =>
      apiClient
        .post(`carbon-inventories/${carbonInventoryId}/duplicate`)
        .json<DuplicateCarbonInventoryResponse>(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        }),
      ]);
    },
  });
};

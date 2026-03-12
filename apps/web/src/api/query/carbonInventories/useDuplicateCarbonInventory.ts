import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import type { DuplicateCarbonInventoryResponse } from "@repo/types";

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
          queryKey: carbonInventoryKeys.all,
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.minimal,
          exact: false,
        }),
      ]);
    },
  });
};

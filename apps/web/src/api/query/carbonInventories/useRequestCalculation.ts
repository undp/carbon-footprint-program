import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http/client";

export const useRequestCalculation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (carbonInventoryId: string) =>
      apiClient
        .post(`carbon-inventories/${carbonInventoryId}/request-calculation`)
        .json(),
    onSuccess: async (_data, carbonInventoryId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.detail(carbonInventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.all,
          exact: true,
        }),
      ]);
    },
  });
};

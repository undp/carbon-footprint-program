import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http/client";
import { requestsKeys } from "../requests/keys";

export const useRequestVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (carbonInventoryId: string) =>
      apiClient
        .post(`carbon-inventories/${carbonInventoryId}/request-verification`)
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
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.metadata(carbonInventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminAll,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminKpis,
          exact: true,
        }),
      ]);
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";

type SyncCarbonInventoryLinesVariables = {
  data: SyncCarbonInventoryLinesRequest;
};

export const useSyncCarbonInventoryLines = (inventoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    SyncCarbonInventoryLinesResponse,
    Error,
    SyncCarbonInventoryLinesVariables
  >({
    mutationFn: ({ data }) =>
      apiClient
        .post(`carbon-inventories/${inventoryId}/lines/sync`, { json: data })
        .json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(inventoryId) &&
            query.queryKey.includes("carbonInventoryEmissionsUpdateDependency"),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("carbonInventoriesListDependency"),
        }),
      ]);
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesResponse,
} from "@repo/types";
import { carbonInventoryKeys } from "../keys";
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
          queryKey: carbonInventoryKeys.all,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.detail(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.emissionsSummaryCategories(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.subcategoriesRanking(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.sectorRanking(inventoryId),
          exact: true,
        }),
      ]);
    },
  });
};

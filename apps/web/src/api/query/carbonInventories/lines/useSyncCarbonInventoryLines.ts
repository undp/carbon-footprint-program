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
    onSuccess: () => {
      // Invalidate all related queries to ensure UI is in sync
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(inventoryId),
      });
    },
  });
};

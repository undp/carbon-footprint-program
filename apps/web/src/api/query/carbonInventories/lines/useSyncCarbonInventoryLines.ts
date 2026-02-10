import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesResponse,
} from "@repo/types";
import { invalidateCarbonInventoryEmissions } from "../keys";
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
    onSuccess: () =>
      invalidateCarbonInventoryEmissions(queryClient, inventoryId),
  });
};

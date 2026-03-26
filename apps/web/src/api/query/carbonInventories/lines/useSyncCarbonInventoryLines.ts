import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "../keys";
import { useAuthorizationHeader } from "../authHeaders";

type SyncCarbonInventoryLinesVariables = {
  data: SyncCarbonInventoryLinesRequest;
};

export const useSyncCarbonInventoryLines = (inventoryId: string) => {
  const queryClient = useQueryClient();
  const { headers } = useAuthorizationHeader(inventoryId);

  return useMutation<
    SyncCarbonInventoryLinesResponse,
    Error,
    SyncCarbonInventoryLinesVariables
  >({
    mutationFn: ({ data }) =>
      apiClient
        .post(`carbon-inventories/${inventoryId}/lines/sync`, {
          json: data,
          headers,
        })
        .json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(inventoryId) &&
            query.queryKey.includes(
              CarbonInventoryQueryKey.EmissionsUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        }),
      ]);
    },
  });
};

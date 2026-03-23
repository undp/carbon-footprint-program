import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "./keys";
import { saveInventoryUuid } from "./inventoryUuid";

export const useCreateCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateCarbonInventoryResponse,
    Error,
    CreateCarbonInventoryRequest
  >({
    mutationFn: (data) =>
      apiClient.post("carbon-inventories", { json: data }).json(),
    onSuccess: async (data) => {
      saveInventoryUuid(data.id, data.uuid);
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
      });
    },
  });
};

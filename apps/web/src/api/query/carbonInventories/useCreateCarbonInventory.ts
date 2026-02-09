import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse,
} from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateCarbonInventoryResponse,
    Error,
    CreateCarbonInventoryRequest
  >({
    mutationFn: (data) =>
      apiClient.post("carbon-inventories", { json: data }).json(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.all,
        exact: true,
      });
    },
  });
};

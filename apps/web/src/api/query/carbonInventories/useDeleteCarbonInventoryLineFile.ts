import { useMutation } from "@tanstack/react-query";
import type { DeleteLineFileResponse } from "@repo/types";
import { apiClient } from "@/api/http/client";
import { useAuthorizationHeader } from "./authHeaders";

interface Variables {
  uuid: string;
}

export const useDeleteCarbonInventoryLineFile = (inventoryId: string) => {
  const { headers } = useAuthorizationHeader(inventoryId);

  return useMutation<DeleteLineFileResponse, Error, Variables>({
    mutationFn: ({ uuid }) =>
      apiClient
        .delete(`carbon-inventories/${inventoryId}/files/${uuid}`, { headers })
        .json<DeleteLineFileResponse>(),
  });
};

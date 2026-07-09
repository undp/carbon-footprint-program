import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type { AssignOrganizationToCarbonInventoryResponse } from "@repo/types";
import { CarbonInventoryQueryKey } from "./keys";

type Variables = {
  inventoryId: string;
  organizationId: string;
};

export const useAssignOrganizationToCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AssignOrganizationToCarbonInventoryResponse,
    Error,
    Variables
  >({
    mutationFn: ({ inventoryId, organizationId }) =>
      apiClient
        .post(
          `carbon-inventories/${inventoryId}/assign-organization/${organizationId}`
        )
        .json<AssignOrganizationToCarbonInventoryResponse>(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
      });
    },
  });
};

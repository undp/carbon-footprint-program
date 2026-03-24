import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import { requestsKeys } from "../requests/keys";

export const useSelfDeclareCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`carbon-inventories/${id}/self-declare`).json(),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
            query.queryKey.includes(
              "carbonInventoryAttributesUpdateDependency"
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("carbonInventoriesListDependency"),
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

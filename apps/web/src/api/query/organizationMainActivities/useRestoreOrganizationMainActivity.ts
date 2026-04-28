import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreOrganizationMainActivityResponse } from "@repo/types";
import { OrganizationMainActivityQueryKey } from "./keys";
import { apiClient } from "@/api/http";

export const useRestoreOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreOrganizationMainActivityResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/organization-main-activities/${id}/restore`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              OrganizationMainActivityQueryKey.CatalogUpdateDependency
            ),
        }),
      ]);
    },
  });
};

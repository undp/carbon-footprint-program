import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateOrganizationMainActivityRequest,
  UpdateOrganizationMainActivityResponse,
} from "@repo/types";
import { OrganizationMainActivityQueryKey } from "./keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useUpdateOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateOrganizationMainActivityResponse,
    Error,
    { id: string; body: UpdateOrganizationMainActivityRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .patch(`admin/organization-main-activities/${id}`, { json: body })
        .json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              OrganizationMainActivityQueryKey.CatalogUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminAll(),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis(),
          exact: true,
        }),
      ]);
    },
  });
};

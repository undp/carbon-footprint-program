import { useQuery } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { GetOrganizationUsersResponse } from "@repo/types";

export const useOrganizationUsers = (organizationId: string | undefined) => {
  return useQuery<GetOrganizationUsersResponse>({
    queryKey: organizationKeys.users(organizationId ?? ""),
    queryFn: () =>
      apiClient
        .get(`app/organizations/${organizationId}/users`)
        .json<GetOrganizationUsersResponse>(),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

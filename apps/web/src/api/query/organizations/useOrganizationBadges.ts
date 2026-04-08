import { useQuery } from "@tanstack/react-query";
import { GetOrganizationBadgesResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { organizationKeys } from "./keys";

export const useOrganizationBadges = (
  organizationId: string | undefined,
  year?: string
) =>
  useQuery<GetOrganizationBadgesResponse>({
    queryKey: organizationKeys.badges(organizationId ?? "", year),
    queryFn: async () =>
      apiClient
        .get(`app/organizations/${organizationId}/badges`, {
          searchParams: year ? { year } : {},
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!organizationId,
  });

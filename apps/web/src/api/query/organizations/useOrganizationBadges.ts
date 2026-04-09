import { useQuery } from "@tanstack/react-query";
import { BadgeType, GetOrganizationBadgesResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { organizationKeys } from "./keys";

export const useOrganizationBadges = (
  organizationId: string | undefined,
  year?: string,
  badgeTypes?: BadgeType[]
) =>
  useQuery<GetOrganizationBadgesResponse>({
    queryKey: organizationKeys.badges(organizationId ?? "", year, badgeTypes),
    queryFn: async () =>
      apiClient
        .get(`app/organizations/${organizationId}/badges`, {
          searchParams: [
            ...(year ? [["year", year]] : []),
            ...(badgeTypes?.map((t) => ["badgeTypes", t]) ?? []),
          ],
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!organizationId,
  });

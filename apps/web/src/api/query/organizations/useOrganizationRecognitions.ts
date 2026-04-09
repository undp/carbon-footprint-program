import { useQuery } from "@tanstack/react-query";
import { BadgeType, GetOrganizationRecognitionsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { organizationKeys } from "./keys";

export const useOrganizationRecognitions = (
  organizationId: string | undefined,
  year?: string,
  badgeTypes?: BadgeType[]
) =>
  useQuery<GetOrganizationRecognitionsResponse>({
    queryKey: organizationKeys.recognitions(
      organizationId ?? "",
      year,
      badgeTypes
    ),
    queryFn: async () =>
      apiClient
        .get(`app/organizations/${organizationId}/recognitions`, {
          searchParams: [
            ...(year ? [["year", year]] : []),
            ...(badgeTypes?.map((t) => ["badgeTypes", t]) ?? []),
          ],
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!organizationId,
  });

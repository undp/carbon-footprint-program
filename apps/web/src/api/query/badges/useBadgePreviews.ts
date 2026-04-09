import { useQuery } from "@tanstack/react-query";
import { BadgeType, GetBadgePreviewsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { badgeKeys } from "./keys";

export const useBadgePreviews = (badgeTypes?: BadgeType[]) =>
  useQuery<GetBadgePreviewsResponse>({
    queryKey: badgeKeys.previews(badgeTypes),
    queryFn: async () =>
      apiClient
        .get("badges/previews", {
          searchParams: badgeTypes?.map((t) => ["badgeTypes", t]),
        })
        .json(),
    staleTime: STALE_TIME_MS,
  });

import { useQuery } from "@tanstack/react-query";
import type { ListBadgesResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { badgeKeys } from "./keys";

export const useBadgeCatalog = () =>
  useQuery<ListBadgesResponse>({
    queryKey: badgeKeys.catalog(),
    queryFn: () => apiClient.get("badges").json<ListBadgesResponse>(),
    staleTime: STALE_TIME_MS,
  });

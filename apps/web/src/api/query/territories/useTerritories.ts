import { useQuery } from "@tanstack/react-query";
import type { GetAllTerritoriesResponse } from "@repo/types";
import { territoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

type Options = {
  /** Set to false while the parent selector is still unanswered. */
  enabled?: boolean;
};

/**
 * Children of one node of the territorial hierarchy — the roots when `parentId`
 * is null. One query per level, so a dependent selector only ever loads the
 * siblings under the node the previous selector produced.
 *
 * Territories are seed-managed reference data with no maintainer, so the cache
 * needs no invalidation token: nothing in the app can change them.
 */
export const useTerritories = (
  parentId: string | null,
  { enabled = true }: Options = {}
) => {
  return useQuery<GetAllTerritoriesResponse>({
    queryKey: territoryKeys.children(parentId),
    queryFn: () =>
      apiClient
        .get("territories", {
          ...(parentId ? { searchParams: { parentId } } : {}),
        })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled,
  });
};

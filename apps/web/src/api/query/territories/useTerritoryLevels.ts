import { useQuery } from "@tanstack/react-query";
import type { GetTerritoryLevelsResponse } from "@repo/types";
import { territoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

/**
 * The levels of the territorial hierarchy the catalog holds rows for, outermost
 * first.
 *
 * The form renders one selector per level returned, so a level loaded later
 * shows up on its own. Asking the catalog beats a hardcoded list: the levels the
 * official source has not been obtained for would otherwise render as controls
 * the registrant can never fill.
 */
export const useTerritoryLevels = () => {
  return useQuery<GetTerritoryLevelsResponse>({
    queryKey: territoryKeys.levels(),
    queryFn: () => apiClient.get("territories/levels").json(),
    staleTime: STALE_TIME_MS,
  });
};
